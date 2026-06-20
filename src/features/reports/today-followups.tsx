import Link from "next/link";
import { ArrowRight, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FollowUpStatusBadge } from "@/features/followups/followup-status-badge";
import type { ProductivityFollowUp } from "@/services/productivity.service";
import { formatDate, formatType } from "./productivity-formatters";

export function TodayFollowUps({
  followUps,
}: {
  followUps: ProductivityFollowUp[];
}) {
  return (
    <section className="surface-card overflow-hidden">
      <SectionHeader
        count={followUps.length}
        description="Ações que merecem atenção antes do fim do dia."
        title="Tarefas para hoje"
      />
      {followUps.length === 0 ? (
        <SectionEmptyState message="Nenhuma tarefa programada para hoje." />
      ) : (
        <>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead className="bg-muted/55 text-left text-xs font-semibold text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Título</th>
                  <th className="px-4 py-3">Data sugerida</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {followUps.map((followUp) => (
                  <tr className="border-t" key={followUp.id}>
                    <td className="px-5 py-4 font-semibold">
                      {followUp.clientName ?? "Cliente não informado"}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {formatType(followUp.type)}
                    </td>
                    <td className="max-w-60 px-4 py-4">
                      <p className="truncate">{followUp.title}</p>
                    </td>
                    <td className="px-4 py-4">
                      {formatDate(followUp.suggested_date)}
                    </td>
                    <td className="px-4 py-4">
                      <FollowUpStatusBadge status={followUp.status} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <ClientButton clientId={followUp.client_id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y lg:hidden">
            {followUps.map((followUp) => (
              <article className="p-4" key={followUp.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {followUp.clientName ?? "Cliente não informado"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatType(followUp.type)} ·{" "}
                      {formatDate(followUp.suggested_date)}
                    </p>
                  </div>
                  <FollowUpStatusBadge status={followUp.status} />
                </div>
                <p className="mt-3 text-sm">{followUp.title}</p>
                <div className="mt-4 flex justify-end border-t pt-3">
                  <ClientButton clientId={followUp.client_id} />
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function SectionHeader({
  count,
  description,
  title,
}: {
  count: number;
  description: string;
  title: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
      <div>
        <div className="flex items-center gap-2">
          <CalendarClock className="size-4 text-primary" aria-hidden="true" />
          <h2 className="text-base font-bold">{title}</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
        {count}
      </span>
    </div>
  );
}

function SectionEmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-44 items-center justify-center px-5 py-8 text-center">
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function ClientButton({ clientId }: { clientId: string | null }) {
  if (!clientId) {
    return null;
  }

  return (
    <Button asChild size="sm" variant="ghost">
      <Link href={`/clientes/${clientId}`}>
        Ver cliente
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </Button>
  );
}
