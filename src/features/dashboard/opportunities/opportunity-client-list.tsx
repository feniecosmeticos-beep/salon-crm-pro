import Link from "next/link";
import {
  ArrowRight,
  CalendarPlus,
  CircleCheckBig,
  UsersRound,
} from "lucide-react";
import {
  ClientLevelBadge,
  ClientStatusBadge,
} from "@/components/crm/client-badges";
import { Button } from "@/components/ui/button";
import type { ClientLevel, ClientStatus } from "@/types/database";
import { OpportunityMessageActions } from "./opportunity-message-actions";
import { getOpportunityFollowUpHref } from "./opportunity-message";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

export type OpportunityClient = {
  averageTicket: number;
  daysWithoutVisit: number;
  id: string;
  level: ClientLevel | null;
  mobile: string | null;
  name: string;
  reason: OpportunityReason;
  status: ClientStatus | null;
  totalSpent: number;
};

export type OpportunityReason =
  | "Alto risco"
  | "Aniversariante"
  | "Em risco"
  | "Inativo"
  | "Sem home care"
  | "VIP sumindo"
  | string;

export function OpportunityClientList({
  canManageFollowUps,
  clients,
}: {
  canManageFollowUps: boolean;
  clients: OpportunityClient[];
}) {
  return (
    <section className="surface-card overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b px-4 py-4 sm:px-5">
        <div>
          <div className="flex items-center gap-2">
            <UsersRound className="size-4 text-primary" aria-hidden="true" />
            <h3 className="text-sm font-bold">Quem chamar primeiro</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {clients.length}{" "}
            {clients.length === 1
              ? "cliente priorizado"
              : "clientes priorizados"}
          </p>
        </div>
      </div>

      {clients.length === 0 ? (
        <OpportunityEmptyState />
      ) : (
        <>
          <div className="hidden overflow-x-auto xl:block">
            <table className="w-full min-w-[1100px] border-collapse text-sm">
              <thead className="bg-muted/55 text-left text-xs font-semibold text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Nível</th>
                  <th className="px-4 py-3">Motivo</th>
                  <th className="px-4 py-3">Dias sem visita</th>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => {
                  const financialValue = getFinancialValue(client);

                  return (
                    <tr
                      className="border-t transition-colors hover:bg-muted/35"
                      key={client.id}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <ClientAvatar name={client.name} />
                          <div className="min-w-0">
                            <p className="max-w-48 truncate font-semibold">
                              {client.name}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {client.mobile ?? "Celular não informado"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <ClientStatusBadge status={client.status} />
                      </td>
                      <td className="px-4 py-4">
                        <ClientLevelBadge level={client.level} />
                      </td>
                      <td className="px-4 py-4">
                        <ReasonBadge reason={client.reason} />
                      </td>
                      <td className="px-4 py-4">
                        {client.daysWithoutVisit} dias
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold">
                          {currencyFormatter.format(financialValue.value)}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {financialValue.label}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          <OpportunityMessageActions
                            clientName={client.name}
                            mobile={client.mobile}
                            reason={client.reason}
                            status={client.status}
                          />
                          {canManageFollowUps ? (
                            <Button
                              asChild
                              aria-label={`Criar follow-up para ${client.name}`}
                              size="icon"
                              variant="ghost"
                            >
                              <Link
                                href={getOpportunityFollowUpHref({
                                  clientId: client.id,
                                  clientName: client.name,
                                  reason: client.reason,
                                  status: client.status,
                                })}
                                title="Criar Follow-up"
                              >
                                <CalendarPlus
                                  className="size-4"
                                  aria-hidden="true"
                                />
                                <span className="sr-only">
                                  Criar Follow-up
                                </span>
                              </Link>
                            </Button>
                          ) : null}
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/clientes/${client.id}`}>
                              Ver perfil
                              <ArrowRight
                                className="size-4"
                                aria-hidden="true"
                              />
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="divide-y xl:hidden">
            {clients.map((client) => {
              const financialValue = getFinancialValue(client);

              return (
                <article className="p-4" key={client.id}>
                  <div className="flex items-start gap-3">
                    <ClientAvatar name={client.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {client.name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {client.daysWithoutVisit} dias sem visita
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold">
                        {currencyFormatter.format(financialValue.value)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {financialValue.label}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <ClientStatusBadge status={client.status} />
                    <ClientLevelBadge level={client.level} />
                    <ReasonBadge reason={client.reason} />
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 border-t pt-3">
                    <div className="flex flex-wrap items-center gap-1">
                      <OpportunityMessageActions
                        clientName={client.name}
                        mobile={client.mobile}
                        reason={client.reason}
                        status={client.status}
                      />
                      {canManageFollowUps ? (
                        <Button asChild size="sm" variant="outline">
                          <Link
                            href={getOpportunityFollowUpHref({
                              clientId: client.id,
                              clientName: client.name,
                              reason: client.reason,
                              status: client.status,
                            })}
                          >
                            <CalendarPlus
                              className="size-4"
                              aria-hidden="true"
                            />
                            Follow-up
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/clientes/${client.id}`}>
                        Ver perfil
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </Link>
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

function OpportunityEmptyState() {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center px-5 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-lg bg-success-soft text-success">
        <CircleCheckBig className="size-5" aria-hidden="true" />
      </span>
      <h4 className="mt-4 text-base font-semibold">Tudo em dia por aqui</h4>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        Tudo em dia por aqui. Assim que clientes entrarem em risco, aparecerão
        nesta central.
      </p>
    </div>
  );
}

function ClientAvatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-xs font-bold text-accent-foreground"
    >
      {getInitials(name)}
    </span>
  );
}

function ReasonBadge({ reason }: { reason: OpportunityReason }) {
  return (
    <span className="inline-flex min-h-6 items-center rounded-md border bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
      {reason}
    </span>
  );
}

function getFinancialValue(client: OpportunityClient): {
  label: "Ticket médio" | "Total gasto";
  value: number;
} {
  if (client.averageTicket > 0) {
    return {
      label: "Ticket médio",
      value: client.averageTicket,
    };
  }

  return {
    label: "Total gasto",
    value: client.totalSpent,
  };
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
