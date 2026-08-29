import type { ReactNode } from "react";

const BANNER = `
 ██████╗ ██╗   ██╗███╗   ███╗
██╔════╝ ╚██╗ ██╔╝████╗ ████║
██║  ███╗ ╚████╔╝ ██╔████╔██║
██║   ██║  ╚██╔╝  ██║╚██╔╝██║
╚██████╔╝   ██║   ██║ ╚═╝ ██║
 ╚═════╝    ╚═╝   ╚═╝     ╚═╝
`.trim();

export function Banner() {
  return (
    <pre
      aria-hidden="true"
      className="glow overflow-x-auto text-[9px] leading-[1.05] text-term-green sm:text-xs"
    >
      {BANNER}
    </pre>
  );
}

export function Terminal({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="w-full overflow-hidden rounded-md border border-term-border bg-term-panel shadow-[0_0_80px_-30px_var(--color-term-green)]">
      <header className="flex items-center gap-2 border-b border-term-border bg-black/40 px-3 py-2">
        <span aria-hidden="true" className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-term-red/70" />
          <span className="size-2.5 rounded-full bg-term-amber/70" />
          <span className="size-2.5 rounded-full bg-term-green/70" />
        </span>
        <span className="truncate text-[11px] text-term-dim">{title}</span>
      </header>
      <div className="p-5 sm:p-7">{children}</div>
    </section>
  );
}

export function Prompt({
  user = "guest",
  children,
  caret = false,
}: {
  user?: string;
  children?: ReactNode;
  caret?: boolean;
}) {
  return (
    <p className="text-xs sm:text-sm">
      <span className="text-term-dim">
        {user}@gym<span className="text-term-border">:</span>~
      </span>
      <span className="text-term-green">$ </span>
      <span className="text-term-text">{children}</span>
      {caret && (
        <span
          aria-hidden="true"
          className="ml-0.5 inline-block animate-caret text-term-green"
        >
          █
        </span>
      )}
    </p>
  );
}

export function Line({
  tag,
  tone = "dim",
  children,
}: {
  tag?: string;
  tone?: "dim" | "green" | "amber" | "red";
  children: ReactNode;
}) {
  const tones = {
    dim: "text-term-dim",
    green: "text-term-green",
    amber: "text-term-amber",
    red: "text-term-red",
  } as const;

  return (
    <p className="text-xs leading-6 sm:text-sm">
      {tag && <span className={tones[tone]}>[{tag}] </span>}
      <span className="text-term-text">{children}</span>
    </p>
  );
}

export function Action({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "ghost";
}) {
  const styles =
    variant === "primary"
      ? "border-term-green/60 bg-term-green/10 text-term-green hover:bg-term-green/20"
      : "border-term-border text-term-dim hover:border-term-dim hover:text-term-text";

  return (
    <a
      href={href}
      className={`flex items-center justify-center gap-2 rounded-sm border px-4 py-2.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-term-green sm:text-sm ${styles}`}
    >
      {children}
    </a>
  );
}
