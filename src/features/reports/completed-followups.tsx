import Link from "next/link";
import { ArrowRight, CircleCheckBig } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProductivityFollowUp } from "@/services/productivity.service";
import { formatDateTime, formatType } from "./productivity-formatters";

export function CompletedFollowUps({
  followUps,
}: {
  followUps: ProductivityFollowUp[];
}) {
  return (
    <section className="surface-card overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <CircleCheckBig
              className="size-4 text-success"
              aria-hidden="true"
            />
            <h2 className="text-base font-bold">Concluídos recentemente</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Últimas ações finalizadas pela rotina comercial.
          </p>
        </div>
        <span className="rounded-md bg-success-soft px-2 py-1 text-xs font-semibold text-success">
          {followUps.length}
        </span>
      </div>

      {followUps.length === 0 ? (
        <div className="flex min-h-52 items-center justify-center px-5 py-8 text-center">
          <p className="max-w-sm text-sm text-muted-foreground">
            Nenhum follow-up foi concluído ainda.
          </p>
        </div>
      ) : (
        <div className="divide-y">
          {followUps.map((followUp) => (
            <article className="flex items-center gap-4 p-4 sm:p-5" key={followUp.id}>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-success-soft text-success">
                <CircleCheckBig className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {followUp.clientName ?? "Cliente não informado"}
                </p>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {followUp.title} · {formatType(followUp.type)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDateTime(followUp.updated_at)}
                </p>
              </div>
              {followUp.client_id ? (
                <Button
                  asChild
                  aria-label={`Ver ${followUp.clientName ?? "cliente"}`}
                  size="icon"
                  variant="ghost"
                >
                  <Link href={`/clientes/${followUp.client_id}`}>
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
