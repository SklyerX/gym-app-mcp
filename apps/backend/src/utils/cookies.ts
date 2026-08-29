import type { CookieOptions } from "hono/utils/cookie";
import { env } from "./env.js";

export const SESSION_COOKIE = "ga_session";

export function sessionCookie(expires: Date): CookieOptions {
  return {
    httpOnly: true,
    secure: new URL(env.HOSTED_API_URL).protocol === "https:",
    sameSite: "Lax",
    path: "/",
    domain: env.COOKIE_DOMAIN,
    expires,
  };
}
