import { Suspense } from "react";
import Link from "next/link";
import { Upload } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { getClientsWithMetrics } from "@/services/clients.service";
import { ClientsTable } from "./clients-table";

export function ClientsPage() {
  return (
    <PageShell
      actions={
        <Button asChild size="sm" variant="outline">
          <Link href="/importacao">
            <Upload className="size-4" aria-hidden="true" />
            Importar clientes
          </Link>
        </Button>
      }
      description="Encontre rapidamente quem precisa de atenção e onde existem oportunidades de relacionamento."
      eyebrow="Carteira comercial"
      title="Clientes"
    >
      <Suspense fallback={<ClientsLoading />}>
        <ClientsContent />
      </Suspense>
    </PageShell>
  );
}

async function ClientsContent() {
  const data = await getClientsWithMetrics();

  return (
    <ClientsTable
      clients={data.clients}
      warningMessage={data.warningMessage}
    />
  );
}

function ClientsLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-24 animate-pulse rounded-lg border bg-muted/40" />
      <div className="h-96 animate-pulse rounded-lg border bg-muted/40" />
    </div>
  );
}
