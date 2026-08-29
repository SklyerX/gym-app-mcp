import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { db } from "../db/index.js";
import { createHash, timingSafeEqual } from "node:crypto";
import { sessions } from "../db/schema.js";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { SESSION_COOKIE } from "../utils/cookies.js";
import { loginUrl } from "../utils/urls.js";

const unauthorized = (c: Context) =>
  c.req.header("Accept")?.includes("text/html")
    ? c.redirect(loginUrl(c.req.url))
    : c.json({ error: "Unauthorized" }, 401);

export const isAuthenticated = createMiddleware(async (c, next) => {
  const cookie = getCookie(c, SESSION_COOKIE);

  if (!cookie) return unauthorized(c);

  const key = cookie.split("sess_").at(1);

  if (!key) return unauthorized(c);

  const lu = key.slice(0, 8);

  const session = await db.query.sessions.findFirst({
    where: {
      luHash: lu,
    },
    with: {
      user: true,
    },
  });

  if (!session) return unauthorized(c);

  const now = Date.now();

  if (now > session.expiresAt.getTime()) {
    await db.delete(sessions).where(eq(sessions.luHash, lu));

    return unauthorized(c);
  }

  const hash = createHash("sha256").update(key).digest("hex");

  const isValid = timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(session.token),
  );

  if (!isValid) return unauthorized(c);

  c.set("user", session.user);

  await next();
});
