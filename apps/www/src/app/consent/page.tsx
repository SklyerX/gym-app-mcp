import type { Metadata } from "next";
import { Action, Banner, Line, Prompt, Terminal } from "@/components/terminal";
import { consentDecisionUrl, fetchConsentRequest } from "@/lib/api";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "authorize · gym",
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const SCOPE_GRANTS: Record<string, string[]> = {
  mcp: [
    "read your routines, workouts and logged sets",
    "log new workouts, sets, food and water on your behalf",
    "read and change your macro targets and timezone",
    "delete routines, workouts and food entries you ask it to remove",
  ],
};

const ERRORS: Record<string, string> = {
  expired:
    "request expired or already used. start the connection again from your client.",
  mismatched_account:
    "request belongs to a different account. sign in as that account and retry.",
  access_denied: "request denied. the client was told no.",
};

export default async function ConsentPage(props: PageProps<"/consent">) {
  const params = await props.searchParams;
  const requestId = first(params.request_id);
  const error = first(params.error);

  if (error || !requestId) {
    return (
      <Shell>
        <Prompt>oauth --consent</Prompt>
        <Line tag="err" tone="red">
          {(error && ERRORS[error]) ?? "no authorization request to review."}
        </Line>
        <div className="mt-6">
          <Action href="/" variant="ghost">
            [ home ]
          </Action>
        </div>
      </Shell>
    );
  }

  const [request, user] = await Promise.all([
    fetchConsentRequest(requestId),
    getSession(),
  ]);

  if (!request) {
    return (
      <Shell>
        <Prompt>oauth --consent</Prompt>
        <Line tag="err" tone="red">
          {ERRORS.expired}
        </Line>
        <div className="mt-6">
          <Action href="/" variant="ghost">
            [ home ]
          </Action>
        </div>
      </Shell>
    );
  }

  const grants = SCOPE_GRANTS[request.scope] ?? [
    `access your account with the "${request.scope}" scope`,
  ];

  const wrongAccount = Boolean(user && user.email !== request.user.email);

  return (
    <Shell>
      <div className="flex flex-col gap-1">
        <Prompt user={request.user.username}>
          oauth --grant {request.client_name}
        </Prompt>
        <Line tag="??" tone="amber">
          <span className="text-term-green">{request.client_name}</span> wants
          into your gym account. if you did not start this, deny it.
        </Line>
      </div>

      <ul className="mt-5 flex flex-col gap-1.5">
        {grants.map((grant) => (
          <li key={grant} className="text-xs leading-6 sm:text-sm">
            <span className="text-term-green">+ </span>
            <span className="text-term-text">{grant}</span>
          </li>
        ))}
      </ul>

      <dl className="mt-6 flex flex-col gap-3 rounded-sm border border-term-border bg-black/50 p-3.5 text-xs">
        <div className="flex flex-col gap-0.5">
          <dt className="text-term-dim">account</dt>
          <dd className="break-all text-term-text">
            {request.user.username}{" "}
            <span className="text-term-dim">&lt;{request.user.email}&gt;</span>
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          {/* Shown because a lookalike client is only detectable by where it
              asks the code to be sent. */}
          <dt className="text-term-dim">codes go to</dt>
          <dd className="break-all text-term-green">{request.redirect_uri}</dd>
        </div>
      </dl>

      {wrongAccount && (
        <div className="mt-4">
          <Line tag="!!" tone="red">
            this browser is signed in as {user?.email}. approving will be
            rejected.
          </Line>
        </div>
      )}

      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row">
        <div className="flex-1">
          <Action href={consentDecisionUrl(requestId, "deny")} variant="ghost">
            [ deny ]
          </Action>
        </div>
        <div className="flex-1">
          <Action href={consentDecisionUrl(requestId, "approve")}>
            [ approve ]
          </Action>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
      <main className="flex w-full max-w-md flex-col gap-6">
        <Banner />
        <Terminal title="/etc/oauth/consent">{children}</Terminal>
      </main>
    </div>
  );
}
