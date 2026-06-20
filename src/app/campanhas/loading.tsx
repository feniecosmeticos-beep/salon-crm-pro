import { PageShell } from "@/components/layout/page-shell";

export default function CampaignsLoading() {
  return (
    <PageShell
      description="Encontre oportunidades de faturamento na sua carteira."
      eyebrow="Inteligência comercial"
      title="Campanhas Inteligentes"
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 7 }, (_, index) => (
          <div
            className="h-36 animate-pulse rounded-lg border bg-muted/40"
            key={index}
          />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="h-96 animate-pulse rounded-lg border bg-muted/40" />
        <div className="h-72 animate-pulse rounded-lg border bg-muted/40" />
      </div>
    </PageShell>
  );
}
