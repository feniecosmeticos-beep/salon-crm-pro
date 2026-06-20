import type { ReactNode } from "react";

type PageShellProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  children?: ReactNode;
};

export function PageShell({
  actions,
  children,
  description,
  eyebrow,
  title,
}: PageShellProps) {
  return (
    <section className="flex min-h-[calc(100vh-8rem)] flex-col gap-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="mb-1 text-xs font-semibold uppercase text-primary">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}
