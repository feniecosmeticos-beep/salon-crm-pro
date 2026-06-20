import { AlertTriangle, Building2, DatabaseZap } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import type { AuditLogsResult } from "@/services/audit.service";
import type { SalonSettingsResult } from "@/services/settings.service";
import type {
  TeamUsersResult,
  TeamUsersSummary,
} from "@/services/team-users.service";
import { SalonSettingsForm } from "./salon-settings-form";
import { AuditLogsSection } from "./audit-logs-section";
import { SettingsInfoCard } from "./settings-info-card";
import { TeamUsersSection } from "./team-users-section";

export function SettingsPage({
  auditData,
  data,
  teamData,
  teamSummary,
}: {
  auditData: AuditLogsResult;
  data: SalonSettingsResult;
  teamData: TeamUsersResult;
  teamSummary: TeamUsersSummary;
}) {
  return (
    <PageShell
      description="Gerencie os dados principais do seu salão."
      eyebrow="Administração"
      title="Configurações"
    >
      {data.warningMessage ? (
        <SettingsWarning message={data.warningMessage} state={data.state} />
      ) : null}

      {data.settings ? (
        <>
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <SalonSettingsForm settings={data.settings} />
            <div className="xl:sticky xl:top-24">
              <SettingsInfoCard />
            </div>
          </div>
          <TeamUsersSection data={teamData} summary={teamSummary} />
          <AuditLogsSection data={auditData} />
        </>
      ) : (
        <SettingsEmptyState state={data.state} />
      )}
    </PageShell>
  );
}

function SettingsWarning({
  message,
  state,
}: {
  message: string;
  state: SalonSettingsResult["state"];
}) {
  const Icon = state === "unconfigured" ? DatabaseZap : AlertTriangle;

  return (
    <div
      className="flex items-start gap-3 rounded-lg border border-info/20 bg-info-soft px-4 py-3 text-sm text-info"
      role={state === "error" || state === "unlinked" ? "alert" : "status"}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-semibold">
          {state === "unconfigured"
            ? "Dados ainda não conectados"
            : "Configurações indisponíveis"}
        </p>
        <p className="mt-1">{message}</p>
      </div>
    </div>
  );
}

function SettingsEmptyState({
  state,
}: {
  state: SalonSettingsResult["state"];
}) {
  const isUnconfigured = state === "unconfigured";
  const isUnlinked = state === "unlinked";
  const Icon = isUnconfigured
    ? DatabaseZap
    : isUnlinked
      ? Building2
      : AlertTriangle;

  return (
    <section className="surface-card flex min-h-72 flex-col items-center justify-center px-5 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-base font-semibold">
        {isUnconfigured
          ? "Supabase não configurado"
          : "Dados do salão indisponíveis"}
      </h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {isUnconfigured
          ? "Supabase ainda não está configurado neste ambiente."
          : isUnlinked
            ? "Usuário sem salão vinculado. Verifique o cadastro interno."
            : "Não foi possível carregar os dados do salão agora."}
      </p>
    </section>
  );
}
