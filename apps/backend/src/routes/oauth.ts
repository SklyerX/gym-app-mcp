import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import z from "zod";
import { db } from "../db/index.js";
import { oauthClients, oauthTokens, users } from "../db/schema.js";
import { isAuthenticated } from "../middleware/is-authenticated.js";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { redis } from "../utils/redis.js";
import { eq, and } from "drizzle-orm";
import { clientRedirect, consentUrl } from "../utils/urls.js";
import { env } from "../utils/env.js";

const oauthRoutes = new Hono();

const ACCESS_TOKEN_TTL_SEC = 60 * 60;

oauthRoutes.post(
  "/register",
  zValidator(
    "json",
    z.object({
      client_name: z.string(),
      redirect_uris: z.array(z.url()),
      grant_types: z
        .array(z.enum(["authorization_code", "refresh_token"]))
        .optional(),
      response_types: z.array(z.literal("code")).optional(),
      token_endpoint_auth_method: z.literal("none"),
    }),
  ),
  async (c) => {
    const {
      client_name,
      redirect_uris,
      grant_types = ["authorization_code"],
      response_types = ["code"],
      token_endpoint_auth_method,
    } = c.req.valid("json");

    const [client] = await db
      .insert(oauthClients)
      .values({
        name: client_name,
        redirectUris: redirect_uris,
        tokenEndpointAuthMethod: token_endpoint_auth_method,
        grantTypes: grant_types,
      })
      .returning();

    return c.json(
      {
        client_id: client.id,
        client_name: client.name,
        redirect_uris: client.redirectUris,
        grant_types,
        response_types,
        token_endpoint_auth_method,
      },
      201,
    );
  },
);

oauthRoutes.get(
  "/authorize",
  isAuthenticated,
  zValidator(
    "query",
    z.object({
      client_id: z.string(),
      redirect_uri: z.url(),
      response_type: z.literal("code"),
      code_challenge: z.string(),
      code_challenge_method: z.literal("S256"),
      state: z.string().optional(),
      scope: z.literal("mcp").optional(),
    }),
  ),
  async (c) => {
    const user = c.get("user" as never) as typeof users.$inferSelect;

    const {
      client_id,
      code_challenge,
      code_challenge_method,
      redirect_uri,
      response_type,
      scope,
      state,
    } = c.req.valid("query");

    const client = await db.query.oauthClients.findFirst({
      where: {
        id: client_id,
      },
    });

    if (!client)
      return c.json(
        { success: false, error: "No client with this id found" },
        400,
      );

    if (!client.redirectUris.includes(redirect_uri))
      return c.json({ success: false, error: "Invalid redirect uri" }, 400);

    const requestId = randomBytes(24).toString("hex");

    await redis.set(
      `oauth:request:${requestId}`,
      JSON.stringify({
        user_id: user.id,
        client_id,
        redirect_uri,
        code_challenge,
        code_challenge_method,
        scope: scope ?? "mcp",
        client_state: state ?? null,
      } satisfies PendingRequest),
      "EX",
      600,
    );

    return c.redirect(consentUrl(requestId));
  },
);

type PendingRequest = {
  user_id: string;
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: string;
  scope: string;
  client_state: string | null;
};

const takePending = async (requestId: string, consume: boolean) => {
  const raw = await redis.get(`oauth:request:${requestId}`);

  if (!raw) return undefined;
  if (consume) await redis.del(`oauth:request:${requestId}`);

  return JSON.parse(raw) as PendingRequest;
};

oauthRoutes.get("/consent/:request_id", async (c) => {
  const pending = await takePending(c.req.param("request_id"), false);

  if (!pending)
    return c.json(
      {
        success: false,
        error: "This request has expired or already been used",
      },
      404,
    );

  const [client, user] = await Promise.all([
    db.query.oauthClients.findFirst({ where: { id: pending.client_id } }),
    db.query.users.findFirst({
      where: { id: pending.user_id },
      columns: { username: true, email: true, avatarUrl: true },
    }),
  ]);

  if (!client || !user)
    return c.json({ success: false, error: "Unknown client" }, 404);

  return c.json({
    client_name: client.name,
    scope: pending.scope,
    redirect_uri: pending.redirect_uri,
    user: {
      username: user.username,
      email: user.email,
      avatar_url: user.avatarUrl,
    },
  });
});

oauthRoutes.get("/consent/:request_id/approve", isAuthenticated, async (c) => {
  const user = c.get("user" as never) as typeof users.$inferSelect;
  const pending = await takePending(c.req.param("request_id"), true);

  if (!pending) return c.redirect(`${env.FRONTEND_URL}/consent?error=expired`);

  if (pending.user_id !== user.id)
    return c.redirect(`${env.FRONTEND_URL}/consent?error=mismatched_account`);

  const code = randomBytes(12).toString("hex");

  await redis.set(
    `oauth:code:${code}`,
    JSON.stringify({
      user_id: pending.user_id,
      client_id: pending.client_id,
      redirect_uri: pending.redirect_uri,
      code_challenge: pending.code_challenge,
      code_challenge_method: pending.code_challenge_method,
      scope: pending.scope,
    }),
    "EX",
    600,
  );

  return c.redirect(
    clientRedirect(pending.redirect_uri, {
      code,
      state: pending.client_state ?? undefined,
    }),
  );
});

oauthRoutes.get("/consent/:request_id/deny", isAuthenticated, async (c) => {
  const user = c.get("user" as never) as typeof users.$inferSelect;
  const pending = await takePending(c.req.param("request_id"), true);

  if (!pending || pending.user_id !== user.id)
    return c.redirect(`${env.FRONTEND_URL}/consent?error=expired`);

  return c.redirect(
    clientRedirect(pending.redirect_uri, {
      error: "access_denied",
      error_description: "The user declined the request",
      state: pending.client_state ?? undefined,
    }),
  );
});

oauthRoutes.post(
  "/token",
  zValidator(
    "form",
    z.discriminatedUnion("grant_type", [
      z.object({
        grant_type: z.literal("authorization_code"),
        code: z.string(),
        redirect_uri: z.url(),
        client_id: z.string(),
        code_verifier: z.string(),
      }),

      z.object({
        grant_type: z.literal("refresh_token"),
        client_id: z.string(),
        refresh_token: z.string(),
      }),
    ]),
  ),
  async (c) => {
    const body = c.req.valid("form");

    if (body.grant_type === "authorization_code") {
      const { code, redirect_uri, client_id, code_verifier } = body;

      const data = await redis.get(`oauth:code:${code}`);
      if (!data) return c.json({ success: false, error: "invalid_grant" }, 400);
      await redis.del(`oauth:code:${code}`);

      const parsedData = JSON.parse(data) as {
        user_id: string;
        client_id: string;
        redirect_uri: string;
        code_challenge: string;
        code_challenge_method: string;
        scope: string;
      };

      if (parsedData.client_id !== client_id)
        return c.json({ success: false, error: "invalid_client" }, 400);
      if (parsedData.redirect_uri !== redirect_uri)
        return c.json({ success: false, error: "invalid_client" }, 400);

      const computedChallenge = createHash("sha256")
        .update(code_verifier)
        .digest("base64url");

      if (computedChallenge !== parsedData.code_challenge) {
        return c.json({ success: false, error: "invalid_grant" }, 400);
      }

      const existingClient = await db.query.oauthClients.findFirst({
        where: {
          id: client_id,
        },
      });

      if (!existingClient)
        return c.json({ success: false, error: "missing_client" }, 404);

      const accessToken = generateSecretKey("at", undefined, true);
      const refreshToken = generateSecretKey("rt", undefined, true);

      const ACCESS_TOKEN_EXPIRY = new Date(
        Date.now() + ACCESS_TOKEN_TTL_SEC * 1000,
      );
      const REFRESH_TOKEN_EXPIRY = new Date(
        Date.now() + 1000 * 60 * 60 * 24 * 7,
      );

      await db.insert(oauthTokens).values({
        accessToken: accessToken.completeHash,
        refreshToken: refreshToken.completeHash,
        accessTokenExpiresAt: ACCESS_TOKEN_EXPIRY,
        refreshTokenExpiresAt: REFRESH_TOKEN_EXPIRY,
        clientId: existingClient.id,
        luKey: accessToken.lu_hash!,
        refreshLuKey: refreshToken.lu_hash!,
        userId: parsedData.user_id,
      });

      return c.json({
        access_token: accessToken.display_key,
        refresh_token: refreshToken.display_key,
        token_type: "Bearer",
        expires_in: ACCESS_TOKEN_TTL_SEC,
      });
    }

    if (body.grant_type === "refresh_token") {
      const { refresh_token, client_id } = body;

      const rawToken = refresh_token.slice(3);
      const lu = rawToken.slice(0, 8);

      const hashedIncoming = createHash("sha256")
        .update(refresh_token)
        .digest();

      const existingToken = await db.query.oauthTokens.findFirst({
        where: {
          refreshLuKey: lu,
          clientId: client_id,
        },
      });

      if (!existingToken)
        return c.json({ success: false, error: "invalid_grant" }, 400);

      const isValid = timingSafeEqual(
        Buffer.from(existingToken.refreshToken, "hex"),
        hashedIncoming,
      );

      if (!isValid)
        return c.json({ success: false, error: "invalid_grant" }, 400);

      const now = Date.now();

      if (now > existingToken.refreshTokenExpiresAt.getTime())
        return c.json({ success: false, error: "invalid_grant" }, 400);

      const accessToken = generateSecretKey("at", undefined, true);
      const refreshToken = generateSecretKey("rt", undefined, true);

      const REFRESH_TOKEN_EXPIRY = new Date(
        Date.now() + 1000 * 60 * 60 * 24 * 7,
      );

      await db
        .update(oauthTokens)
        .set({
          luKey: accessToken.lu_hash!,
          refreshLuKey: refreshToken.lu_hash!,

          accessToken: accessToken.completeHash,
          refreshToken: refreshToken.completeHash,

          refreshTokenExpiresAt: REFRESH_TOKEN_EXPIRY,
        })
        .where(
          and(eq(oauthTokens.luKey, lu), eq(oauthTokens.clientId, client_id)),
        );

      return c.json({
        access_token: accessToken.display_key,
        refresh_token: refreshToken.display_key,
        token_type: "Bearer",
        expires_in: ACCESS_TOKEN_TTL_SEC,
      });
    }
  },
);

function generateSecretKey(prefix: string, length = 32, luIncluded = false) {
  const raw = randomBytes(length).toString("hex");
  const lu_hash = luIncluded ? raw.slice(0, 8) : null;
  const completeHash = createHash("sha256").update(raw).digest("hex");
  const display_key = `${prefix}_${raw}`;

  return { lu_hash, completeHash, display_key };
}

export default oauthRoutes;
