import Link from "next/link";
import { AlertTriangle, ArrowLeft, UserRound } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import type { ClientProfileData } from "@/services/client-profile.service";
import { ClientFollowUps } from "./client-followups";
import { ClientHistory } from "./client-history";
import { ClientNextAction } from "./client-next-action";
import { ClientProducts } from "./client-products";
import { ClientProfileHeader } from "./client-profile-header";
import { ClientProfileMetrics } from "./client-profile-metrics";

export function ClientProfilePage({
  canManageFollowUps,
  profile,
}: {
  canManageFollowUps: boolean;
  profile: ClientProfileData;
}) {
  const { client } = profile;

  if (!client) {
    return (
      <PageShell
        actions={<BackToClientsButton />}
        description="Não foi possível localizar o cadastro solicitado."
        eyebrow="Carteira comercial"
        title="Cliente não encontrado"
      >
        {profile.warningMessage ? (
          <WarningMessage message={profile.warningMessage} />
        ) : null}
        <section className="surface-card flex min-h-64 flex-col items-center justify-center px-5 py-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <UserRound className="size-5" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-base font-semibold">
            Cliente não encontrado.
          </h2>
          <Button asChild className="mt-5">
            <Link href="/clientes">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Voltar para Clientes
            </Link>
          </Button>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell
      actions={<BackToClientsButton />}
      description="Histórico, valor da carteira e oportunidades de relacionamento."
      eyebrow="Visão 360"
      title="Perfil do cliente"
    >
      {profile.warningMessage ? (
        <WarningMessage message={profile.warningMessage} />
      ) : null}

      <ClientProfileHeader client={client} metrics={profile.metrics} />
      <ClientProfileMetrics metrics={profile.metrics} />
      <ClientNextAction client={client} metrics={profile.metrics} />

      <div className="grid items-start gap-6 2xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <ClientHistory appointments={profile.appointments} />
          <ClientProducts productSales={profile.productSales} />
        </div>
        <ClientFollowUps
          canManageFollowUps={canManageFollowUps}
          clientId={client.id}
          clientName={client.name}
          followUps={profile.followUps}
        />
      </div>
    </PageShell>
  );
}

function BackToClientsButton() {
  return (
    <Button asChild size="sm" variant="outline">
      <Link href="/clientes">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Voltar para Clientes
      </Link>
    </Button>
  );
}

function WarningMessage({ message }: { message: string }) {
  return (
    <div
      className="flex items-start gap-3 rounded-lg border border-info/20 bg-info-soft px-4 py-3 text-sm text-info"
      role="status"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}
