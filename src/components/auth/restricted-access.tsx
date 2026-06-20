import Link from "next/link";
import { ArrowLeft, ShieldX } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";

export function RestrictedAccess() {
  return (
    <PageShell
      description="Seu perfil não possui permissão para acessar esta área."
      eyebrow="Permissões"
      title="Acesso restrito"
    >
      <section className="surface-card flex min-h-72 flex-col items-center justify-center px-5 py-10 text-center">
        <span className="flex size-12 items-center justify-center rounded-lg bg-warning-soft text-warning">
          <ShieldX className="size-5" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-base font-semibold">Acesso restrito</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Seu perfil não possui permissão para acessar esta área.
        </p>
        <Button asChild className="mt-5">
          <Link href="/">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Voltar ao Dashboard
          </Link>
        </Button>
      </section>
    </PageShell>
  );
}
