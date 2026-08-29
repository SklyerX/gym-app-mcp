import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DiscordIcon } from "@/components/brand-icons";
import { Action, Banner, Line, Prompt, Terminal } from "@/components/terminal";
import { providerLoginUrl, safeReturnTo } from "@/lib/api";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "login · gym",
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage(props: PageProps<"/login">) {
  const returnTo = safeReturnTo(first((await props.searchParams).return_to));

  const user = await getSession();

  if (user) redirect(returnTo ?? "/");

  const isResuming = Boolean(returnTo);

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
      <main className="flex w-full max-w-md flex-col gap-6">
        <Banner />

        <Terminal title="/usr/bin/login">
          <div className="flex flex-col gap-1">
            <Prompt>auth --login</Prompt>
            {isResuming ? (
              <Line tag="..." tone="amber">
                a client is waiting on you. sign in to finish connecting it.
              </Line>
            ) : (
              <Line tag="..." tone="dim">
                sign in with discord. an account is created on first use.
              </Line>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <Action href={providerLoginUrl("discord", returnTo)}>
              <DiscordIcon className="size-4" />[ discord ]
            </Action>
          </div>

          <div className="mt-6">
            <Prompt caret />
          </div>
        </Terminal>

        <p className="text-center text-[11px] text-term-dim">
          we store your email, display name and avatar. nothing else.
        </p>
      </main>
    </div>
  );
}
