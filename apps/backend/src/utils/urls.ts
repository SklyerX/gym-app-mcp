import { env } from "./env.js";

const ALLOWED_ORIGINS = [
  new URL(env.FRONTEND_URL).origin,
  new URL(env.HOSTED_API_URL).origin,
];

export function safeReturnTo(target: string | undefined | null) {
  if (!target) return undefined;

  try {
    const url = new URL(target, env.HOSTED_API_URL);

    return ALLOWED_ORIGINS.includes(url.origin) ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function loginUrl(returnTo?: string) {
  const url = new URL("/login", env.FRONTEND_URL);
  const safe = safeReturnTo(returnTo);

  if (safe) url.searchParams.set("return_to", safe);

  return url.toString();
}

export function consentUrl(requestId: string) {
  const url = new URL("/consent", env.FRONTEND_URL);

  url.searchParams.set("request_id", requestId);

  return url.toString();
}

export function clientRedirect(
  redirectUri: string,
  params: Record<string, string | undefined>,
) {
  const url = new URL(redirectUri);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, value);
  }

  return url.toString();
}
