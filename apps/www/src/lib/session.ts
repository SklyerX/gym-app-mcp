import { cookies } from "next/headers";
import { cache } from "react";
import { API_URL } from "./api";

export const SESSION_COOKIE = "ga_session";

export type SessionUser = {
  id: string;
  email: string;
  username: string;
  slug: string;
  avatarUrl: string | null;
  createdAt: string | null;
  isEmailVerified: boolean;
  timezone: string;
};

export const getSession = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;

  if (!token) return null;

  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: {
        cookie: `${SESSION_COOKIE}=${token}`,
        accept: "application/json",
      },
      cache: "no-store",
    });

    return res.ok ? ((await res.json()) as SessionUser) : null;
  } catch {
    return null;
  }
});
