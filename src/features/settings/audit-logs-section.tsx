import { Activity, AlertTriangle, DatabaseZap } from "lucide-react";
import type {
  AuditLogsResult,
} from "@/services/audit.service";
import type { AuditLog } from "@/types/database";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const actionLabels: Record<string, string> = {
  followup_completed: "Follow-up concluído",
  followup_created: "Follow-up criado",
  followup_reopened: "Follow-up reaberto",
  import_avec_completed: "Importação AVEC concluída",
  permission_denied: "Tentativa bloqueada",
  salon_settings_updated: "Configurações alteradas",
  team_user_role_updated: "Função de usuário alterada",
};

const entityLabels: Record<string, string> = {
  follow_up: "Follow-up",
  import: "Importação",
  salon: "Salão",
  user: "Usuário interno",
};

export function AuditLogsSection({ data }: { data: AuditLogsResult }) {
  return (
    <section aria-labelledby="audit-logs-title" className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase text-primary">
          Segurança
        </p>
        <h2 className="mt-1 text-xl font-bold" id="audit-logs-title">
          Últimas atividades
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Ações recentes registradas para rastreabilidade operacional.
        </p>
      </div>

      {data.warningMessage ? (
        <AuditWarning message={data.warningMessage} state={data.state} />
      ) : null}

      {data.state === "ready" ? (
        data.logs.length > 0 ? (
          <AuditLogList logs={data.logs} />
        ) : (
          <AuditEmptyState />
        )
      ) : null}
    </section>
  );
}

function AuditLogList({ logs }: { logs: AuditLog[] }) {
  return (
    <div className="surface-card overflow-hidden">
      <div className="hidden grid-cols-[160px_minmax(180px,1fr)_minmax(200px,1fr)_180px] gap-4 border-b bg-muted/55 px-5 py-3 text-xs font-semibold text-muted-foreground md:grid">
        <span>Data</span>
        <span>Usuário</span>
        <span>Ação</span>
        <span>Entidade</span>
      </div>
      <div className="divide-y">
        {logs.map((log) => (
          <article
            className="grid gap-3 px-4 py-4 md:grid-cols-[160px_minmax(180px,1fr)_minmax(200px,1fr)_180px] md:items-center md:gap-4 md:px-5"
            key={log.id}
          >
            <AuditField label="Data" value={formatDate(log.created_at)} />
            <AuditField
              label="Usuário"
              value={log.user_email ?? "Usuário não identificado"}
            />
            <AuditField
              label="Ação"
              value={actionLabels[log.action] ?? log.action}
            />
            <AuditField
              label="Entidade"
              value={
                log.entity_type
                  ? (entityLabels[log.entity_type] ?? log.entity_type)
                  : "—"
              }
            />
          </article>
        ))}
      </div>
    </div>
  );
}

function AuditField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase text-muted-foreground md:hidden">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm md:mt-0">{value}</p>
    </div>
  );
}

function AuditWarning({
  message,
  state,
}: {
  message: string;
  state: AuditLogsResult["state"];
}) {
  const Icon = state === "unconfigured" ? DatabaseZap : AlertTriangle;

  return (
    <div
      className="flex items-start gap-3 rounded-lg border border-info/20 bg-info-soft px-4 py-3 text-sm text-info"
      role={state === "error" || state === "unlinked" ? "alert" : "status"}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-semibold">Atividades indisponíveis</p>
        <p className="mt-1">{message}</p>
      </div>
    </div>
  );
}

function AuditEmptyState() {
  return (
    <div className="surface-card flex min-h-48 flex-col items-center justify-center px-5 py-8 text-center">
      <span className="flex size-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Activity className="size-5" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-sm font-semibold">
        Nenhuma atividade registrada
      </h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        As próximas ações importantes do salão aparecerão aqui.
      </p>
    </div>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}
