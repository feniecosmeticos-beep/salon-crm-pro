import type { ClientStatus } from "@/types/database";

export function getOpportunityMessage({
  clientName,
  reason,
  status,
}: {
  clientName: string;
  reason: string;
  status: ClientStatus | null;
}): string {
  const firstName = clientName.split(" ").filter(Boolean)[0] || clientName;
  const normalizedReason = normalizeText(reason);

  if (normalizedReason.includes("anivers")) {
    return `Parabéns, ${firstName}! 🎉 Desejamos muitas felicidades neste novo ciclo. Gostaria de receber uma condição especial para cuidar ainda mais da sua beleza?`;
  }

  if (
    normalizedReason.includes("home care") ||
    normalizedReason.includes("produto")
  ) {
    return `Oi, ${firstName}! Para manter o resultado do seu atendimento por mais tempo, posso te indicar um home care ideal para você?`;
  }

  if (normalizedReason.includes("vip")) {
    return `Oi, ${firstName}! Você é uma cliente muito especial para nós. Sentimos sua falta e separei algumas sugestões exclusivas para o seu próximo atendimento. Posso te enviar?`;
  }

  if (normalizedReason.includes("inativ") || status === "Inativo") {
    return `Oi, ${firstName}! Sentimos sua falta por aqui. Temos algumas novidades e cuidados especiais que podem ser perfeitos para você. Posso te contar?`;
  }

  if (normalizedReason.includes("risco") || status === "Em risco") {
    return `Oi, ${firstName}! Tudo bem? Faz um tempinho desde sua última visita ao salão e queria saber como está seu cabelo. Posso verificar um horário para você?`;
  }

  return `Oi, ${firstName}! Tudo bem? Passando para saber como está seu cabelo e se posso ajudar a planejar seu próximo cuidado no salão.`;
}

export function getOpportunityFollowUpHref({
  clientId,
  clientName,
  reason,
  status,
}: {
  clientId: string;
  clientName: string;
  reason: string;
  status: ClientStatus | null;
}): string {
  const content = getFollowUpContent(reason, status);
  const params = new URLSearchParams({
    clientId,
    message: getOpportunityMessage({ clientName, reason, status }),
    title: content.title,
    type: content.type,
  });

  return `/followups?${params.toString()}#novo-followup`;
}

function getFollowUpContent(
  reason: string,
  status: ClientStatus | null
): { title: string; type: string } {
  const normalizedReason = normalizeText(reason);

  if (normalizedReason.includes("anivers")) {
    return { title: "Contato de aniversário", type: "aniversario" };
  }

  if (
    normalizedReason.includes("home care") ||
    normalizedReason.includes("produto")
  ) {
    return { title: "Oportunidade de home care", type: "home_care" };
  }

  if (normalizedReason.includes("vip")) {
    return { title: "Relacionamento com cliente VIP", type: "vip" };
  }

  if (normalizedReason.includes("inativ") || status === "Inativo") {
    return { title: "Reativação de cliente", type: "reativacao" };
  }

  return { title: "Contato preventivo", type: "relacionamento" };
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
