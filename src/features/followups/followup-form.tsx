"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Client } from "@/types/database";
import {
  createFollowUpAction,
  type FollowUpActionState,
} from "./followups.actions";

export type FollowUpPrefill = {
  clientId: string;
  suggestedDate: string;
  suggestedMessage: string;
  title: string;
  type: string;
};

const initialState: FollowUpActionState = {
  message: "",
  status: "idle",
  submissionId: "",
};

const fieldClassName =
  "h-10 w-full rounded-md border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-60";

export function FollowUpForm({
  clients,
  disabled,
  prefill,
}: {
  clients: Client[];
  disabled: boolean;
  prefill: FollowUpPrefill;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(
    createFollowUpAction,
    initialState
  );
  const formDisabled = disabled || clients.length === 0 || isPending;

  useEffect(() => {
    if (state.status !== "success" || !state.submissionId) {
      return;
    }

    formRef.current?.reset();
    router.refresh();
  }, [router, state.status, state.submissionId]);

  return (
    <section className="surface-card overflow-hidden" id="novo-followup">
      <div className="border-b px-5 py-4">
        <div className="flex items-center gap-2">
          <CalendarPlus className="size-4 text-primary" aria-hidden="true" />
          <h2 className="text-base font-bold">Criar Follow-up</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Registre uma ação comercial para acompanhar depois.
        </p>
      </div>

      <form action={formAction} className="space-y-4 p-4 sm:p-5" ref={formRef}>
        <FormField label="Cliente">
          <select
            className={fieldClassName}
            defaultValue={prefill.clientId}
            disabled={formDisabled}
            name="clientId"
            required
          >
            <option value="">Selecione um cliente</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <FormField label="Tipo">
            <input
              className={fieldClassName}
              defaultValue={prefill.type}
              disabled={formDisabled}
              maxLength={60}
              name="type"
              placeholder="Ex.: reativação"
              required
            />
          </FormField>

          <FormField label="Data sugerida">
            <input
              className={fieldClassName}
              defaultValue={prefill.suggestedDate}
              disabled={formDisabled}
              name="suggestedDate"
              required
              type="date"
            />
          </FormField>
        </div>

        <FormField label="Título">
          <input
            className={fieldClassName}
            defaultValue={prefill.title}
            disabled={formDisabled}
            maxLength={140}
            name="title"
            placeholder="Qual ação precisa ser realizada?"
            required
          />
        </FormField>

        <FormField label="Mensagem sugerida">
          <textarea
            className={`${fieldClassName} min-h-28 resize-y py-3`}
            defaultValue={prefill.suggestedMessage}
            disabled={formDisabled}
            maxLength={1200}
            name="suggestedMessage"
            placeholder="Mensagem opcional para orientar o contato."
          />
        </FormField>

        {state.message ? (
          <p
            aria-live="polite"
            className={
              state.status === "success"
                ? "text-sm text-success"
                : "text-sm text-destructive"
            }
            role={state.status === "error" ? "alert" : "status"}
          >
            {state.message}
          </p>
        ) : null}

        {clients.length === 0 && !disabled ? (
          <p className="text-sm text-muted-foreground">
            Nenhum cliente disponível para criar um follow-up.
          </p>
        ) : null}

        <Button className="w-full" disabled={formDisabled} type="submit">
          {isPending ? (
            <LoaderCircle
              className="size-4 animate-spin"
              aria-hidden="true"
            />
          ) : (
            <CalendarPlus className="size-4" aria-hidden="true" />
          )}
          {isPending ? "Salvando..." : "Criar Follow-up"}
        </Button>
      </form>
    </section>
  );
}

function FormField({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">
      {label}
      {children}
    </label>
  );
}
