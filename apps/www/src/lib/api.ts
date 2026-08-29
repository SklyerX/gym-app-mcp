export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8888";

export function providerLoginUrl(provider: "discord", returnTo?: string) {
  const url = new URL(`/auth/oauth2/${provider}`, API_URL);

  if (returnTo) url.searchParams.set("return_to", returnTo);

  return url.toString();
}

export function safeReturnTo(target: string | undefined) {
  if (!target) return undefined;

  if (target.startsWith("/") && !target.startsWith("//")) return target;

  try {
    return new URL(target).origin === new URL(API_URL).origin
      ? target
      : undefined;
  } catch {
    return undefined;
  }
}

export const MCP_URL = `${API_URL}/mcp`;

export type ConsentRequest = {
  client_name: string;
  scope: string;
  redirect_uri: string;
  user: { username: string; email: string; avatar_url: string | null };
};

export async function fetchConsentRequest(
  requestId: string,
): Promise<ConsentRequest | null> {
  try {
    const res = await fetch(
      `${API_URL}/oauth/consent/${encodeURIComponent(requestId)}`,
      { cache: "no-store" },
    );

    return res.ok ? ((await res.json()) as ConsentRequest) : null;
  } catch {
    return null;
  }
}

export function consentDecisionUrl(
  requestId: string,
  decision: "approve" | "deny",
) {
  return `${API_URL}/oauth/consent/${encodeURIComponent(requestId)}/${decision}`;
}
