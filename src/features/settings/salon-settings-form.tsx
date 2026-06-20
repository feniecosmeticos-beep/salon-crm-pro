"use client";

import { useActionState } from "react";
import {
  Building2,
  CheckCircle2,
  LoaderCircle,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SalonSettings } from "@/services/settings.service";
import {
  type SettingsActionState,
  updateSalonSettingsAction,
} from "./settings.actions";

const initialState: SettingsActionState = {
  message: "",
  status: "idle",
};

const fieldClassName =
  "h-11 w-full rounded-md border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-60";

const readOnlyFieldClassName =
  "min-h-11 w-full rounded-md border bg-muted/45 px-3 py-2.5 text-sm text-foreground";

export function SalonSettingsForm({
  settings,
}: {
  settings: SalonSettings;
}) {
  const [state, formAction, isPending] = useActionState(
    updateSalonSettingsAction,
    initialState
  );

  return (
    <section className="surface-card overflow-hidden">
      <div className="border-b px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Building2 className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-bold">Dados do salão</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Mantenha as informações principais sempre atualizadas.
            </p>
          </div>
        </div>
      </div>

      <form action={formAction} className="space-y-6 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Nome do salão">
            <input
              autoComplete="organization"
              className={fieldClassName}
              defaultValue={settings.name}
              disabled={isPending}
              maxLength={120}
              name="name"
              placeholder="Nome do salão"
              required
            />
          </FormField>

          <FormField label="Telefone">
            <input
              autoComplete="tel"
              className={fieldClassName}
              defaultValue={settings.phone ?? ""}
              disabled={isPending}
              inputMode="tel"
              maxLength={40}
              name="phone"
              placeholder="(00) 00000-0000"
              type="tel"
            />
          </FormField>

          <FormField label="Cidade">
            <input
              autoComplete="address-level2"
              className={fieldClassName}
              defaultValue={settings.city ?? ""}
              disabled={isPending}
              maxLength={100}
              name="city"
              placeholder="Cidade"
            />
          </FormField>

          <ReadOnlyField label="Plano" value={formatPlan(settings.plan)} />
        </div>

        <div className="grid gap-4 border-t pt-5 sm:grid-cols-2">
          <ReadOnlyField
            label="Identificador do salão"
            monospaced
            value={settings.id}
          />
          <ReadOnlyField
            label="Criado em"
            value={formatCreatedAt(settings.created_at)}
          />
        </div>

        {state.message ? (
          <div
            aria-live="polite"
            className={
              state.status === "success"
                ? "flex items-start gap-2 rounded-md border border-success/20 bg-success-soft px-3 py-2.5 text-sm text-success"
                : "rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
            }
            role={state.status === "error" ? "alert" : "status"}
          >
            {state.status === "success" ? (
              <CheckCircle2
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
            ) : null}
            <p>{state.message}</p>
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button disabled={isPending} type="submit">
            {isPending ? (
              <LoaderCircle
                className="size-4 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Save className="size-4" aria-hidden="true" />
            )}
            {isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
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

function ReadOnlyField({
  label,
  monospaced = false,
  value,
}: {
  label: string;
  monospaced?: boolean;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p
        className={`${readOnlyFieldClassName} ${
          monospaced ? "break-all font-mono text-xs" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function formatPlan(plan: string | null): string {
  if (!plan) {
    return "Não informado";
  }

  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

function formatCreatedAt(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Data indisponível";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}
