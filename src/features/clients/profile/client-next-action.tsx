import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Client, ClientMetrics } from "@/types/database";
import { CopyMessageButton } from "./client-profile-actions";

type NextAction = {
  description: string;
  message: string;
  title: string;
  tone: "info" | "success" | "vip" | "warning";
};

export function ClientNextAction({
  client,
  metrics,
}: {
  client: Client;
  metrics: ClientMetrics | null;
}) {
  const action = getNextBestAction(client, metrics);
  const toneClass = {
    info: "border-info/20 bg-info-soft",
    success: "border-success/20 bg-success-soft",
    vip: "border-vip/20 bg-vip-soft",
    warning: "border-warning/25 bg-warning-soft",
  }[action.tone];

  return (
    <section className={cn("rounded-lg border p-5 sm:p-6", toneClass)}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-card/80 text-foreground shadow-sm">
            <Sparkles className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Próxima melhor ação
            </p>
            <h2 className="mt-1 text-lg font-bold">{action.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {action.description}
            </p>
            <blockquote className="mt-4 border-l-2 border-foreground/15 pl-4 text-sm leading-6">
              “{action.message}”
            </blockquote>
          </div>
        </div>
        <div className="shrink-0 pl-14 lg:pl-0">
          <CopyMessageButton message={action.message} />
        </div>
      </div>
    </section>
  );
}

function getNextBestAction(
  client: Client,
  metrics: ClientMetrics | null
): NextAction {
  const firstName = client.name.split(" ").filter(Boolean)[0] || client.name;

  if (
    !metrics ||
    metrics.total_visits <= 0 ||
    metrics.client_status === "Sem histórico"
  ) {
    return {
      description:
        "Este cliente ainda não possui histórico. Um contato inicial pode abrir a primeira oportunidade.",
      message: `Oi, ${firstName}! Tudo bem? Queria conhecer um pouco mais sobre os cuidados que você procura para o seu cabelo. Posso te ajudar a encontrar o atendimento ideal?`,
      title: "Fazer o primeiro contato",
      tone: "info",
    };
  }

  if (metrics.client_status === "Inativo") {
    return {
      description:
        "O tempo sem visita indica uma oportunidade clara de reativação da carteira.",
      message: `Oi, ${firstName}! Sentimos sua falta por aqui. Estamos com algumas opções de cuidados para deixar seu cabelo ainda mais bonito. Posso te enviar algumas sugestões?`,
      title: "Iniciar uma conversa de reativação",
      tone: "warning",
    };
  }

  if (metrics.client_status === "Em risco") {
    return {
      description:
        "Um contato de retorno agora pode evitar que este cliente se torne inativo.",
      message: `Oi, ${firstName}! Tudo bem? Vi que já faz um tempinho desde sua última visita ao salão e queria saber como está seu cabelo. Quer que eu veja um horário para você essa semana?`,
      title: "Fazer contato de retorno",
      tone: "warning",
    };
  }

  if (["Diamante", "Ouro"].includes(metrics.client_level)) {
    return {
      description:
        "Cliente de alto valor. Reforce a experiência premium com uma indicação personalizada.",
      message: `Oi, ${firstName}! Você é uma cliente muito especial para nós. Separei uma sugestão de cuidado personalizada para o seu próximo atendimento. Posso te mandar?`,
      title: "Fortalecer o relacionamento VIP",
      tone: "vip",
    };
  }

  if (!metrics.buys_products) {
    return {
      description:
        "O histórico não mostra compra de produtos. Há espaço para uma indicação de manutenção em casa.",
      message: `Oi, ${firstName}! Para manter melhor o resultado do seu atendimento em casa, posso te indicar um home care ideal para o seu cabelo?`,
      title: "Oferecer uma rotina de home care",
      tone: "info",
    };
  }

  return {
    description:
      "O relacionamento está ativo. Mantenha a proximidade e antecipe a próxima visita.",
    message: `Oi, ${firstName}! Tudo bem? Passando para saber como está seu cabelo e se você já quer reservar seu próximo cuidado no salão.`,
    title: "Manter o relacionamento ativo",
    tone: "success",
  };
}
