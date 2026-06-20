import Link from "next/link";
import { CalendarClock, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FollowUp, FollowUpStatus } from "@/types/database";
import { formatDate } from "./client-profile-formatters";
import { ClientProfileEmptyState } from "./client-profile-section";

const statusLabels: Record<FollowUpStatus, string> = {
  cancelled: "Cancelado",
  done: "Concluído",
  pending: "Pendente",
};

export function ClientFollowUps({
  canManageFollowUps,
  clientId,
  clientName,
  followUps,
}: {
  canManageFollowUps: boolean;
  clientId: string;
  clientName: string;
  followUps: FollowUp[];
}) {
  return (
    <section className="surface-card overflow-hidden">
      <div className="flex flex-col gap-4 border-b px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold">Follow-ups</h2>
            <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
              {followUps.length}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Lembretes e contatos comerciais ligados ao cliente.
          </p>
        </div>
        {canManageFollowUps ? (
          <Button asChild size="sm" variant="outline">
            <Link href={getNewFollowUpHref(clientId, clientName)}>
              <CalendarPlus className="size-4" aria-hidden="true" />
              Novo Follow-up
            </Link>
          </Button>
        ) : null}
      </div>
      {followUps.length === 0 ? (
        <ClientProfileEmptyState
          description="Nenhum follow-up relacionado a este cliente."
          icon={CalendarClock}
          title="Sem follow-ups"
        />
      ) : (
        <div className="divide-y">
          {followUps.map((followUp) => (
            <article className="p-4 sm:p-5" key={followUp.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    {followUp.type ?? "Relacionamento"}
                  </p>
                  <h3 className="mt-1 text-sm font-semibold">
                    {followUp.title}
                  </h3>
                </div>
                <FollowUpStatusBadge status={followUp.status} />
              </div>
              <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarClock className="size-3.5" aria-hidden="true" />
                Data sugerida: {formatDate(followUp.suggested_date)}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function getNewFollowUpHref(clientId: string, clientName: string): string {
  const firstName = clientName.split(" ").filter(Boolean)[0] || clientName;
  const params = new URLSearchParams({
    clientId,
    title: `Acompanhamento de ${firstName}`,
    type: "relacionamento",
  });

  return `/followups?${params.toString()}#novo-followup`;
}

function FollowUpStatusBadge({ status }: { status: FollowUpStatus }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center rounded-md border px-2 text-xs font-semibold",
        status === "pending" &&
          "border-warning/25 bg-warning-soft text-warning",
        status === "done" &&
          "border-success/20 bg-success-soft text-success",
        status === "cancelled" &&
          "border-border bg-muted text-muted-foreground"
      )}
    >
      {statusLabels[status]}
    </span>
  );
}
