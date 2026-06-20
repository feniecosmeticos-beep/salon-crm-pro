import type {
  ClientLevel,
  ClientMetrics,
  ClientStatus,
} from "@/types/database";

export function calculateClientStatus(
  lastVisit: string | null,
  totalVisits: number,
  today = new Date()
): ClientStatus {
  if (!lastVisit || totalVisits <= 0) {
    return "Sem histórico";
  }

  const daysWithoutVisit = calculateDaysWithoutVisit(lastVisit, today);

  if (totalVisits === 1 && daysWithoutVisit <= 30) {
    return "Novo";
  }

  if (daysWithoutVisit <= 45) {
    return "Ativo";
  }

  if (daysWithoutVisit <= 89) {
    return "Em risco";
  }

  return "Inativo";
}

export function calculateClientLevel(
  totalSpent: number,
  totalVisits: number
): ClientLevel {
  const normalizedSpent = Math.max(0, totalSpent);
  const normalizedVisits = Math.max(0, totalVisits);

  if (normalizedSpent >= 3000 || normalizedVisits > 15) {
    return "Diamante";
  }

  if (normalizedSpent >= 1500 || normalizedVisits > 10) {
    return "Ouro";
  }

  if (normalizedSpent >= 700 || normalizedVisits > 5) {
    return "Prata";
  }

  return "Bronze";
}

export function calculateDaysWithoutVisit(
  lastVisit: string | null,
  today = new Date()
): number {
  if (!lastVisit) {
    return 0;
  }

  const visitDate = new Date(`${lastVisit}T00:00:00.000Z`);

  if (Number.isNaN(visitDate.getTime())) {
    return 0;
  }

  const todayUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate()
  );

  return Math.max(
    0,
    Math.floor((todayUtc - visitDate.getTime()) / 86400000)
  );
}

export function refreshClientMetrics<T extends ClientMetrics>(metrics: T): T {
  return {
    ...metrics,
    client_level: calculateClientLevel(
      metrics.total_spent,
      metrics.total_visits
    ),
    client_status: calculateClientStatus(
      metrics.last_visit,
      metrics.total_visits
    ),
    days_without_visit: calculateDaysWithoutVisit(metrics.last_visit),
  };
}
