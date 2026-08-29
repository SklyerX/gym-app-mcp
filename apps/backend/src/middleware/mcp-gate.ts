import { createMiddleware } from "hono/factory";
import { createHash, timingSafeEqual } from "node:crypto";
import { db } from "../db/index.js";
import { env } from "../utils/env.js";

export const mcpGate = createMiddleware(async (c, next) => {
  const token = c.req.header("Authorization")?.split("Bearer ").at(1);

  if (!token) {
    c.header(
      "WWW-Authenticate",
      `Bearer resource_metadata="${env.HOSTED_API_URL}/.well-known/oauth-protected-resource"`,
    );
    return c.json({ success: false, error: "unauthorized" }, 401);
  }

  const rawToken = token.slice(3);
  const lu = rawToken.slice(0, 8);

  const existingToken = await db.query.oauthTokens.findFirst({
    where: {
      luKey: lu,
    },
    with: {
      user: true,
    },
  });

  if (!existingToken)
    return c.json({ success: false, error: "unauthorized" }, 401);

  const computedHash = createHash("sha256").update(rawToken).digest();
  const storedHash = Buffer.from(existingToken.accessToken, "hex");

  const isValid = timingSafeEqual(storedHash, computedHash);

  if (!isValid) return c.json({ success: false, error: "unauthorized" }, 401);

  const now = Date.now();

  if (now > existingToken.accessTokenExpiresAt.getTime())
    return c.json({ success: false, error: "Session expired" }, 401);

  c.set("user", existingToken.user);

  await next();
});
