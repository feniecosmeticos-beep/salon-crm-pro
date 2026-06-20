"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarClock,
  Check,
  LoaderCircle,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FollowUpListItem } from "@/services/followups.service";
import { FollowUpStatusBadge } from "./followup-status-badge";
import { updateFollowUpStatusAction } from "./followups.actions";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function FollowUpList({
  followUps,
}: {
  followUps: FollowUpListItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function changeStatus(
    followUpId: string,
    status: "done" | "pending"
  ) {
    setErrorMessage(null);
    setUpdatingId(followUpId);

    startTransition(async () => {
      const result = await updateFollowUpStatusAction({
        followUpId,
        status,
      });

      if (!result.success) {
        setErrorMessage(result.message);
      } else {
        router.refresh();
      }

      setUpdatingId(null);
    });
  }

  return (
    <section className="surface-card overflow-hidden">
      <div className="border-b px-4 py-4 sm:px-5">
        <div className="flex items-center gap-2">
          <CalendarClock className="size-4 text-primary" aria-hidden="true" />
          <h2 className="text-base font-bold">Agenda de follow-ups</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Atrasados primeiro, seguidos pelos contatos de hoje e futuros.
        </p>
        {errorMessage ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </div>

      {followUps.length === 0 ? (
        <FollowUpEmptyState />
      ) : (
        <>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[920px] border-collapse text-sm">
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
                {followUps.map((followUp) => {
                  const overdue = isOverdue(followUp);

                  return (
                    <tr
                      className="border-t transition-colors hover:bg-muted/35"
                      key={followUp.id}
                    >
                      <td className="px-5 py-4">
                        <ClientLink followUp={followUp} />
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {formatType(followUp.type)}
                      </td>
                      <td className="max-w-64 px-4 py-4">
                        <p className="truncate font-semibold">
                          {followUp.title}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className={overdue ? "font-semibold text-destructive" : ""}>
                          {formatDate(followUp.suggested_date)}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <FollowUpStatusBadge
                          isOverdue={overdue}
                          status={followUp.status}
                        />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end">
                          <StatusButton
                            disabled={isPending}
                            followUp={followUp}
                            isUpdating={updatingId === followUp.id}
                            onChange={changeStatus}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="divide-y lg:hidden">
            {followUps.map((followUp) => {
              const overdue = isOverdue(followUp);

              return (
                <article className="p-4" key={followUp.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <ClientLink followUp={followUp} />
                      <p className="mt-2 text-xs font-semibold uppercase text-muted-foreground">
                        {formatType(followUp.type)}
                      </p>
                      <h3 className="mt-1 text-sm font-semibold">
                        {followUp.title}
                      </h3>
                    </div>
                    <FollowUpStatusBadge
                      isOverdue={overdue}
                      status={followUp.status}
                    />
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-4 border-t pt-3">
                    <p
                      className={
                        overdue
                          ? "text-xs font-semibold text-destructive"
                          : "text-xs text-muted-foreground"
                      }
                    >
                      {formatDate(followUp.suggested_date)}
                    </p>
                    <StatusButton
                      disabled={isPending}
                      followUp={followUp}
                      isUpdating={updatingId === followUp.id}
                      onChange={changeStatus}
                    />
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

function ClientLink({ followUp }: { followUp: FollowUpListItem }) {
  const name = followUp.clientName ?? "Cliente não informado";

  if (!followUp.client_id) {
    return <p className="font-semibold">{name}</p>;
  }

  return (
    <Link
      className="inline-flex items-center gap-1 font-semibold hover:text-primary"
      href={`/clientes/${followUp.client_id}`}
    >
      <span className="max-w-44 truncate">{name}</span>
      <ArrowRight className="size-3.5" aria-hidden="true" />
    </Link>
  );
}

function StatusButton({
  disabled,
  followUp,
  isUpdating,
  onChange,
}: {
  disabled: boolean;
  followUp: FollowUpListItem;
  isUpdating: boolean;
  onChange: (followUpId: string, status: "done" | "pending") => void;
}) {
  const isDone = followUp.status === "done";
  const label = isDone ? "Reabrir" : "Concluir";

  return (
    <Button
      disabled={disabled}
      onClick={() =>
        onChange(followUp.id, isDone ? "pending" : "done")
      }
      size="sm"
      variant={isDone ? "outline" : "default"}
    >
      {isUpdating ? (
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
      ) : isDone ? (
        <RotateCcw className="size-4" aria-hidden="true" />
      ) : (
        <Check className="size-4" aria-hidden="true" />
      )}
      {label}
    </Button>
  );
}

function FollowUpEmptyState() {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center px-5 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        <CalendarClock className="size-5" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-base font-semibold">
        Nenhum follow-up cadastrado
      </h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        Crie uma tarefa comercial para organizar o próximo contato com um
        cliente.
      </p>
    </div>
  );
}

function formatDate(value: string | null): string {
  if (!value) {
    return "Sem data sugerida";
  }

  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? "Data inválida" : dateFormatter.format(date);
}

function formatType(value: string | null): string {
  if (!value) {
    return "Relacionamento";
  }

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isOverdue(followUp: FollowUpListItem): boolean {
  return (
    followUp.status === "pending" &&
    Boolean(followUp.suggested_date) &&
    (followUp.suggested_date as string) < getTodayInSaoPaulo()
  );
}

function getTodayInSaoPaulo(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}
