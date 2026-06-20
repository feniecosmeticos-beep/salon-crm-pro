import { ShieldCheck, Sparkles } from "lucide-react";
import { LoginForm } from "./login-form";

export function LoginPage({
  configured,
  redirectTo,
}: {
  configured: boolean;
  redirectTo: string;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--primary)_10%,transparent),transparent_38%),radial-gradient(circle_at_bottom_right,color-mix(in_oklab,var(--info)_8%,transparent),transparent_34%)]"
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-lg font-bold">Salon CRM Pro</p>
            <p className="text-xs text-muted-foreground">
              Inteligência comercial para salões
            </p>
          </div>
        </div>

        <section className="surface-card overflow-hidden">
          <div className="border-b px-5 py-5 sm:px-6">
            <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </span>
            <h1 className="mt-4 text-2xl font-bold">Salon CRM Pro</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Acesse sua conta
            </p>
          </div>
          <div className="p-5 sm:p-6">
            <LoginForm configured={configured} redirectTo={redirectTo} />
          </div>
        </section>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Acesso exclusivo para a equipe do salão.
        </p>
      </div>
    </main>
  );
}
