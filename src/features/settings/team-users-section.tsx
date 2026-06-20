import { AlertTriangle, DatabaseZap, UserRound } from "lucide-react";
import type {
  TeamUsersResult,
  TeamUsersSummary,
} from "@/services/team-users.service";
import { TeamUsersSummaryCards } from "./team-users-summary";
import { TeamUsersTable } from "./team-users-table";

export function TeamUsersSection({
  data,
  summary,
}: {
  data: TeamUsersResult;
  summary: TeamUsersSummary;
}) {
  const canEdit = data.currentUser?.role === "admin";

  return (
    <section aria-labelledby="team-users-title" className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase text-primary">Equipe</p>
        <h2 className="mt-1 text-xl font-bold" id="team-users-title">
          Usuários internos
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Visualize a equipe vinculada e organize as funções de acesso.
        </p>
      </div>

      {data.warningMessage ? (
        <TeamUsersWarning message={data.warningMessage} state={data.state} />
      ) : null}

      {data.state === "ready" ? (
        <>
          <TeamUsersSummaryCards summary={summary} />
          {data.users.length > 0 ? (
            <TeamUsersTable
              canEdit={canEdit}
              currentUserId={data.currentUser?.id ?? null}
              users={data.users}
            />
          ) : (
            <TeamUsersEmptyState />
          )}
        </>
      ) : null}
    </section>
  );
}

function TeamUsersWarning({
  message,
  state,
}: {
  message: string;
  state: TeamUsersResult["state"];
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
            ? "Usuários ainda não conectados"
            : "Usuários internos indisponíveis"}
        </p>
        <p className="mt-1">{message}</p>
      </div>
    </div>
  );
}

function TeamUsersEmptyState() {
  return (
    <div className="surface-card flex min-h-56 flex-col items-center justify-center px-5 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        <UserRound className="size-5" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-base font-semibold">
        Nenhum usuário interno encontrado
      </h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        Os usuários vinculados a este salão aparecerão aqui.
      </p>
    </div>
  );
}
