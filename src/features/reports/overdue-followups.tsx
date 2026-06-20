import Link from "next/link";
import { ArrowRight, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OverdueFollowUp } from "@/services/productivity.service";

export function OverdueFollowUps({
  followUps,
}: {
  followUps: OverdueFollowUp[];
}) {
  return (
    <section className="surface-card overflow-hidden border-destructive/20">
      <div className="flex items-start justify-between gap-4 border-b border-destructive/15 bg-destructive/[0.035] px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <TriangleAlert
              className="size-4 text-destructive"
              aria-hidden="true"
            />
            <h2 className="text-base font-bold">Follow-ups atrasados</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Priorize estes contatos para recuperar o ritmo comercial.
          </p>
        </div>
        <span className="rounded-md bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive">
          {followUps.length}
        </span>
      </div>

      {followUps.length === 0 ? (
        <div className="flex min-h-44 items-center justify-center px-5 py-8 text-center">
          <p className="max-w-sm text-sm text-muted-foreground">
            Nenhum follow-up atrasado. A rotina está em dia.
          </p>
        </div>
      ) : (
        <div className="divide-y">
          {followUps.map((followUp) => (
            <article className="p-4 sm:p-5" key={followUp.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {followUp.clientName ?? "Cliente não informado"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {followUp.title}
                  </p>
                </div>
                <span className="shrink-0 rounded-md bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive">
                  {formatDelay(followUp.daysOverdue)}
                </span>
              </div>
              {followUp.client_id ? (
                <div className="mt-4 flex justify-end border-t pt-3">
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/clientes/${followUp.client_id}`}>
                      Ver cliente
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function formatDelay(days: number): string {
  return days === 1 ? "1 dia de atraso" : `${days} dias de atraso`;
}
