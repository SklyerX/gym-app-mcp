import { Action, Banner, Line, Prompt, Terminal } from "@/components/terminal";
import { MCP_URL } from "@/lib/api";
import { getSession } from "@/lib/session";

const MODULES = [
  ["routines", "split templates, sessions, ordered exercises"],
  ["workouts", "live sessions, set-by-set logging, history"],
  ["macros", "food + water, targets, timezone-correct days"],
  ["mcp", "all of it, exposed as tools to your chat client"],
] as const;

export default async function Home() {
  const user = await getSession();

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
      <main className="flex w-full max-w-2xl flex-col gap-6">
        <div className="flex flex-col gap-3">
          <Banner />
          <h1 className="sr-only">Gym</h1>
          <p className="text-xs text-term-dim sm:text-sm">
            {"// a barbell log your chat client can actually use"}
          </p>
        </div>

        <Terminal title="~/gym — bash">
          <div className="flex flex-col gap-1">
            <Prompt user={user?.slug ?? "guest"}>whoami</Prompt>
            {user ? (
              <Line tag="ok" tone="green">
                {user.username} &lt;{user.email}&gt; · tz={user.timezone}
              </Line>
            ) : (
              <Line tag="!!" tone="amber">
                no session. sign in to get an account.
              </Line>
            )}

            <div className="h-4" />

            <Prompt user={user?.slug ?? "guest"}>gym --modules</Prompt>
            <ul className="mt-1 flex flex-col gap-1">
              {MODULES.map(([name, blurb]) => (
                <li key={name} className="text-xs leading-6 sm:text-sm">
                  <span className="text-term-green">
                    {name.padEnd(10, ".")}
                  </span>
                  <span className="text-term-text"> {blurb}</span>
                </li>
              ))}
            </ul>

            <div className="h-4" />

            <Prompt user={user?.slug ?? "guest"} caret>
              {user ? "gym --endpoint" : "./login"}
            </Prompt>
          </div>

          {user ? (
            <div className="mt-5 flex flex-col gap-3">
              <Line>
                Point an MCP client at this URL. It walks you back here to
                approve the connection.
              </Line>
              <code className="block overflow-x-auto rounded-sm border border-term-border bg-black/50 px-3 py-2.5 text-xs text-term-green sm:text-sm">
                {MCP_URL}
              </code>
            </div>
          ) : (
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Action href="/login">[ sign in ]</Action>
            </div>
          )}
        </Terminal>

        <p className="text-center text-[11px] text-term-dim">
          oauth 2.0 + pkce · sessions expire · you approve every client
        </p>
      </main>
    </div>
  );
}
