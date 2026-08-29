import { Hono } from "hono";
import { AuthClient, AuthError } from "../services/auth.js";
import { redis } from "../utils/redis.js";
import { db } from "../db/index.js";
import { zValidator } from "@hono/zod-validator";
import z from "zod";
import { setCookie } from "hono/cookie";
import { SESSION_COOKIE, sessionCookie } from "../utils/cookies.js";
import { env } from "../utils/env.js";
import { isAuthenticated } from "../middleware/is-authenticated.js";
import { safeReturnTo } from "../utils/urls.js";

const authRoutes = new Hono();

const auth = new AuthClient({ redis, db });

const startAuthQuery = zValidator(
  "query",
  z.object({ return_to: z.string().optional() }),
);

authRoutes.get("/oauth2/discord", startAuthQuery, async (c) => {
  const { return_to } = c.req.valid("query");
  const url = await auth.generateDiscordAuthLink(safeReturnTo(return_to));

  return c.redirect(url);
});

authRoutes.get(
  "/discord/callback",
  zValidator(
    "query",
    z.object({
      code: z.string(),
      state: z.string(),
    }),
  ),
  async (c) => {
    const { code, state } = c.req.valid("query");
    try {
      const { display_key, expiry, returnTo } =
        await auth.handleDiscordCallback(code, state);

      setCookie(
        c,
        SESSION_COOKIE,
        display_key as string,
        sessionCookie(expiry as Date),
      );

      return c.redirect(safeReturnTo(returnTo) ?? env.FRONTEND_URL);
    } catch (err) {
      console.error(err);
      if (err instanceof AuthError)
        return c.json({ error: err.message }, err.RETURNING_STATUS_CODE);
      return c.json(
        {
          error: "Something went wrong during the authentication process",
        },
        500,
      );
    }
  },
);

authRoutes.get("/me", isAuthenticated, async (c) => {
  const user = c.get("user" as never);
  return c.json(user);
});

export default authRoutes;
