"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const fieldClassName =
  "h-11 w-full rounded-md border bg-background pl-10 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-60";

export function LoginForm({
  configured,
  redirectTo,
}: {
  configured: boolean;
  redirectTo: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!configured || isLoading) {
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage("E-mail ou senha inválidos.");
        return;
      }

      router.replace(redirectTo);
      router.refresh();
    } catch {
      setErrorMessage("Não foi possível entrar agora. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">
        E-mail
        <span className="relative">
          <Mail
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            autoComplete="email"
            className={fieldClassName}
            disabled={!configured || isLoading}
            inputMode="email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="voce@salao.com.br"
            required
            type="email"
            value={email}
          />
        </span>
      </label>

      <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">
        Senha
        <span className="relative">
          <LockKeyhole
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            autoComplete="current-password"
            className={fieldClassName}
            disabled={!configured || isLoading}
            minLength={6}
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Digite sua senha"
            required
            type="password"
            value={password}
          />
        </span>
      </label>

      {errorMessage ? (
        <div
          className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>{errorMessage}</p>
        </div>
      ) : null}

      {!configured ? (
        <div
          className="rounded-md border border-info/20 bg-info-soft px-3 py-2.5 text-sm text-info"
          role="status"
        >
          Supabase ainda não está configurado neste ambiente.
        </div>
      ) : null}

      <Button
        className="h-11 w-full"
        disabled={!configured || isLoading}
        type="submit"
      >
        {isLoading ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <LockKeyhole className="size-4" aria-hidden="true" />
        )}
        {isLoading ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
