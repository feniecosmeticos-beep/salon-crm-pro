import "server-only";

import { refreshClientMetrics } from "@/lib/client-metrics";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentSalonId } from "@/services/salon-context";
import { hasSupabaseServerConfig } from "@/services/supabase-config";
import type {
  Client,
  ClientLevel,
  ClientMetrics,
  ClientStatus,
} from "@/types/database";

export type OpportunityClient = {
  averageTicket: number;
  daysWithoutVisit: number;
  id: string;
  lastVisit: string | null;
  level: ClientLevel | null;
  mobile: string | null;
  name: string;
  priority: number;
  reason: string;
  status: ClientStatus | null;
  totalSpent: number;
};

export type DashboardOpportunities = {
  clientsToContactToday: OpportunityClient[];
  clientsWithoutProductOpportunity: OpportunityClient[];
  highRiskClients: OpportunityClient[];
  recoveryPotential: number;
  vipClientsAtRisk: OpportunityClient[];
};

type ClientWithMetrics = {
  client: Client;
  metrics: ClientMetrics | null;
};

const EMPTY_DASHBOARD_OPPORTUNITIES: DashboardOpportunities = {
  clientsToContactToday: [],
  clientsWithoutProductOpportunity: [],
  highRiskClients: [],
  recoveryPotential: 0,
  vipClientsAtRisk: [],
};

export async function getDashboardOpportunities(): Promise<DashboardOpportunities> {
  const audience = await getOpportunityAudience();

  if (audience.length === 0) {
    return EMPTY_DASHBOARD_OPPORTUNITIES;
  }

  const highRiskClients = buildHighRiskClients(audience);
  const vipClientsAtRisk = buildVipClientsAtRisk(audience);
  const clientsWithoutProductOpportunity =
    buildClientsWithoutProductOpportunity(audience);

  return {
    clientsToContactToday: buildClientsToContactToday(
      audience,
      highRiskClients,
      vipClientsAtRisk,
      clientsWithoutProductOpportunity
    ),
    clientsWithoutProductOpportunity,
    highRiskClients,
    recoveryPotential: calculateRecoveryPotential(highRiskClients),
    vipClientsAtRisk,
  };
}

export async function getClientsToContactToday(): Promise<
  OpportunityClient[]
> {
  const data = await getDashboardOpportunities();
  return data.clientsToContactToday;
}

export async function getHighRiskClients(): Promise<OpportunityClient[]> {
  const audience = await getOpportunityAudience();
  return buildHighRiskClients(audience);
}

export async function getVipClientsAtRisk(): Promise<OpportunityClient[]> {
  const audience = await getOpportunityAudience();
  return buildVipClientsAtRisk(audience);
}

export async function getClientsWithoutProductOpportunity(): Promise<
  OpportunityClient[]
> {
  const audience = await getOpportunityAudience();
  return buildClientsWithoutProductOpportunity(audience);
}

export async function getRecoveryPotential(): Promise<number> {
  const clients = await getHighRiskClients();
  return calculateRecoveryPotential(clients);
}

async function getOpportunityAudience(): Promise<ClientWithMetrics[]> {
  if (!hasSupabaseServerConfig()) {
    return [];
  }

  try {
    const supabase = createSupabaseServerClient();
    const salonId = await getCurrentSalonId();

    if (!salonId) {
      return [];
    }

    const [clientsResult, metricsResult] = await Promise.all([
      supabase
        .from("clients")
        .select("*")
        .eq("salon_id", salonId)
        .order("name", { ascending: true }),
      supabase.from("client_metrics").select("*").eq("salon_id", salonId),
    ]);

    if (clientsResult.error || metricsResult.error) {
      logQueryError("clients", clientsResult.error);
      logQueryError("client metrics", metricsResult.error);
      return [];
    }

    const metricsByClientId = new Map(
      (metricsResult.data ?? [])
        .map(refreshClientMetrics)
        .filter((metrics) => metrics.client_id)
        .map((metrics) => [metrics.client_id as string, metrics])
    );

    return (clientsResult.data ?? []).map((client) => ({
      client,
      metrics: metricsByClientId.get(client.id) ?? null,
    }));
  } catch (error) {
    console.error("Failed to fetch dashboard opportunities.", error);
    return [];
  }
}

function buildHighRiskClients(
  audience: ClientWithMetrics[]
): OpportunityClient[] {
  return audience
    .filter(({ metrics }) =>
      metrics
        ? ["Em risco", "Inativo"].includes(metrics.client_status)
        : false
    )
    .map(({ client, metrics }) =>
      toOpportunityClient(
        client,
        metrics,
        metrics?.client_status === "Inativo" ? "Inativo" : "Alto risco",
        metrics?.client_status === "Inativo" ? 100 : 90
      )
    )
    .sort(compareOpportunities);
}

function buildVipClientsAtRisk(
  audience: ClientWithMetrics[]
): OpportunityClient[] {
  return audience
    .filter(
      ({ metrics }) =>
        Boolean(metrics) &&
        ["Diamante", "Ouro"].includes(metrics?.client_level ?? "") &&
        (metrics?.days_without_visit ?? 0) > 45
    )
    .map(({ client, metrics }) =>
      toOpportunityClient(client, metrics, "VIP sumindo", 80)
    )
    .sort(compareOpportunities);
}

function buildClientsWithoutProductOpportunity(
  audience: ClientWithMetrics[]
): OpportunityClient[] {
  return audience
    .filter(
      ({ metrics }) =>
        Boolean(metrics) &&
        (metrics?.total_visits ?? 0) > 0 &&
        metrics?.buys_products === false
    )
    .map(({ client, metrics }) =>
      toOpportunityClient(client, metrics, "Sem home care", 60)
    )
    .sort(compareOpportunities);
}

function buildClientsToContactToday(
  audience: ClientWithMetrics[],
  highRiskClients: OpportunityClient[],
  vipClientsAtRisk: OpportunityClient[],
  clientsWithoutProductOpportunity: OpportunityClient[]
): OpportunityClient[] {
  const prioritizedClients = new Map<string, OpportunityClient>();
  const birthdayClients = audience
    .filter(({ client }) => isBirthdayThisMonth(client.birth_date))
    .map(({ client, metrics }) =>
      toOpportunityClient(client, metrics, "Aniversariante", 70)
    );

  for (const client of [
    ...highRiskClients,
    ...vipClientsAtRisk,
    ...birthdayClients,
    ...clientsWithoutProductOpportunity,
  ]) {
    const current = prioritizedClients.get(client.id);

    if (!current || client.priority > current.priority) {
      prioritizedClients.set(client.id, client);
    }
  }

  return Array.from(prioritizedClients.values()).sort(compareOpportunities);
}

function toOpportunityClient(
  client: Client,
  metrics: ClientMetrics | null,
  reason: string,
  priority: number
): OpportunityClient {
  return {
    averageTicket: metrics?.average_ticket ?? 0,
    daysWithoutVisit: metrics?.days_without_visit ?? 0,
    id: client.id,
    lastVisit: metrics?.last_visit ?? null,
    level: metrics?.client_level ?? null,
    mobile: client.mobile ?? client.phone,
    name: client.name,
    priority,
    reason,
    status: metrics?.client_status ?? null,
    totalSpent: metrics?.total_spent ?? 0,
  };
}

function calculateRecoveryPotential(clients: OpportunityClient[]): number {
  return clients.reduce((total, client) => {
    const recoverableValue = client.averageTicket;

    return total + (Number.isFinite(recoverableValue) ? recoverableValue : 0);
  }, 0);
}

function compareOpportunities(
  left: OpportunityClient,
  right: OpportunityClient
): number {
  return (
    right.priority - left.priority ||
    right.daysWithoutVisit - left.daysWithoutVisit ||
    right.averageTicket - left.averageTicket ||
    left.name.localeCompare(right.name, "pt-BR")
  );
}

function isBirthdayThisMonth(birthDate: string | null): boolean {
  const match = birthDate?.match(/^\d{4}-(\d{2})-\d{2}$/);

  if (!match) {
    return false;
  }

  return match[1] === getCurrentMonth();
}

function getCurrentMonth(): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}

function logQueryError(label: string, error: unknown): void {
  if (error) {
    console.error(`Failed to fetch opportunities ${label}.`, error);
  }
}
