import { PageShell } from "@/components/layout/page-shell";

export default function Loading() {
  return (
    <PageShell
      description="Gerencie os dados principais do seu salão."
      eyebrow="Administração"
      title="Configurações"
    >
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="h-[34rem] animate-pulse rounded-lg border bg-muted/40" />
        <div className="h-56 animate-pulse rounded-lg border bg-muted/40" />
      </div>
      <div className="space-y-4">
        <div className="h-16 w-80 max-w-full animate-pulse rounded-lg bg-muted/40" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              className="h-24 animate-pulse rounded-lg border bg-muted/40"
              key={index}
            />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-lg border bg-muted/40" />
      </div>
      <div className="space-y-4">
        <div className="h-16 w-72 max-w-full animate-pulse rounded-lg bg-muted/40" />
        <div className="h-96 animate-pulse rounded-lg border bg-muted/40" />
      </div>
    </PageShell>
  );
}
