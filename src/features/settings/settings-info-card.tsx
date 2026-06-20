import { ShieldCheck } from "lucide-react";

export function SettingsInfoCard() {
  return (
    <aside className="surface-card overflow-hidden">
      <div className="p-5 sm:p-6">
        <span className="flex size-10 items-center justify-center rounded-lg bg-success-soft text-success">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </span>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-success">
          Segurança do acesso
        </p>
        <h2 className="mt-1 text-base font-bold">Isolamento por salão</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Seu acesso está vinculado a este salão. Usuários só visualizam dados
          do salão ao qual estão associados.
        </p>
      </div>
    </aside>
  );
}
