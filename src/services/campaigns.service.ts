import "server-only";

import { refreshClientMetrics } from "@/lib/client-metrics";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getCurrentSalonId,
  SALON_LINK_REQUIRED_MESSAGE,
} from "@/services/salon-context";
import { hasSupabaseServerConfig } from "@/services/supabase-config";
import type {
  Appointment,
  Client,
  ClientMetrics,
  Service,
} from "@/types/database";

type CampaignDataState = "error" | "ready" | "unconfigured";
export type CampaignSegmentKey =
  | "birthday"
  | "color"
  | "inactive"
  | "no_products"
  | "progressive"
  | "risk"
  | "vip";

export type CampaignClient = {
  client: Client;
  metrics: ClientMetrics | null;
};

export type CampaignSegment = {
  clients: CampaignClient[];
  description: string;
  key: CampaignSegmentKey;
  label: string;
  message: string;
};

export type CampaignSegmentsData = {
  segments: CampaignSegment[];
  state: CampaignDataState;
  warningMessage: string | null;
};

type CampaignSnapshot = {
  appointments: Appointment[];
  clients: Client[];
  hasError: boolean;
  metrics: ClientMetrics[];
  services: Service[];
};

const SEGMENT_CONTENT: Record<
  CampaignSegmentKey,
  Omit<CampaignSegment, "clients" | "key">
> = {
  risk: {
    description: "Contato preventivo antes que o cliente fique inativo.",
    label: "Clientes em risco",
    message:
      "Oi, [Nome]! Tudo bem? Faz um tempinho desde sua última visita ao salão e queria saber como está seu cabelo. Posso verificar um horário para você?",
  },
  inactive: {
    description: "Oportunidades de reativação da carteira.",
    label: "Clientes inativos",
    message:
      "Oi, [Nome]! Sentimos sua falta por aqui. Temos algumas novidades e cuidados especiais que podem ser perfeitos para você. Posso te contar?",
  },
  vip: {
    description: "Relacionamento especial com clientes de alto valor.",
    label: "Clientes VIP",
    message:
      "Oi, [Nome]! Você é uma cliente muito especial para nós. Separei algumas sugestões exclusivas para o seu próximo atendimento. Posso te enviar?",
  },
  no_products: {
    description: "Potencial para indicação de manutenção e home care.",
    label: "Sem compra de produto",
    message:
      "Oi, [Nome]! Para manter o resultado do seu atendimento por mais tempo, posso te indicar um home care ideal para você?",
  },
  birthday: {
    description: "Clientes que fazem aniversário no mês atual.",
    label: "Aniversariantes do mês",
    message:
      "Parabéns pelo seu mês! 🎉 Desejamos muitas felicidades. Gostaria de receber uma condição especial para cuidar ainda mais da sua beleza?",
  },
  color: {
    description: "Histórico de coloração, tonalização ou mechas.",
    label: "Clientes de coloração",
    message:
      "Oi, [Nome]! Temos novidades e cuidados especiais para manter sua cor bonita por muito mais tempo. Posso te mostrar?",
  },
  progressive: {
    description: "Histórico de progressiva ou alisamento.",
    label: "Clientes de progressiva",
    message:
      "Oi, [Nome]! Como está o resultado da sua progressiva? Posso te indicar os melhores cuidados para prolongar o efeito?",
  },
};

const SEGMENT_ORDER: CampaignSegmentKey[] = [
  "risk",
  "inactive",
  "vip",
  "no_products",
  "birthday",
  "color",
  "progressive",
];

export async function getCampaignSegments(): Promise<CampaignSegmentsData> {
  if (!hasSupabaseServerConfig()) {
    return {
      segments: createSegments(createEmptyAudiences()),
      state: "unconfigured",
      warningMessage:
        "Supabase não configurado. Não foi possível carregar os segmentos.",
    };
  }

  try {
    const salonId = await getCurrentSalonId();

    if (!salonId) {
      return {
        segments: createSegments(createEmptyAudiences()),
        state: "error",
        warningMessage: SALON_LINK_REQUIRED_MESSAGE,
      };
    }

    const snapshot = await fetchCampaignSnapshot(salonId);
    const audiences = buildAudiences(snapshot);

    return {
      segments: createSegments(audiences),
      state: snapshot.hasError ? "error" : "ready",
      warningMessage: snapshot.hasError
        ? "Não foi possível carregar todos os dados das campanhas. Alguns segmentos podem estar incompletos."
        : null,
    };
  } catch (error) {
    console.error("Failed to fetch campaign segments.", error);

    return {
      segments: createSegments(createEmptyAudiences()),
      state: "error",
      warningMessage:
        "Não foi possível carregar os segmentos de campanhas agora.",
    };
  }
}

export async function getClientsInRisk(): Promise<CampaignClient[]> {
  return getClientsForSegment("risk");
}

export async function getInactiveClients(): Promise<CampaignClient[]> {
  return getClientsForSegment("inactive");
}

export async function getVipClients(): Promise<CampaignClient[]> {
  return getClientsForSegment("vip");
}

export async function getClientsWithoutProducts(): Promise<CampaignClient[]> {
  return getClientsForSegment("no_products");
}

export async function getBirthdayClients(): Promise<CampaignClient[]> {
  return getClientsForSegment("birthday");
}

export async function getColorClients(): Promise<CampaignClient[]> {
  return getClientsForSegment("color");
}

export async function getProgressiveClients(): Promise<CampaignClient[]> {
  return getClientsForSegment("progressive");
}

async function getClientsForSegment(
  key: CampaignSegmentKey
): Promise<CampaignClient[]> {
  if (!hasSupabaseServerConfig()) {
    return [];
  }

  try {
    const salonId = await getCurrentSalonId();

    if (!salonId) {
      return [];
    }

    const snapshot = await fetchCampaignSnapshot(salonId);
    return buildAudiences(snapshot)[key];
  } catch (error) {
    console.error(`Failed to fetch campaign segment ${key}.`, error);
    return [];
  }
}

async function fetchCampaignSnapshot(
  salonId: string
): Promise<CampaignSnapshot> {
  const supabase = createSupabaseServerClient();
  const [clientsResult, metricsResult, servicesResult, appointmentsResult] =
    await Promise.all([
      supabase
        .from("clients")
        .select("*")
        .eq("salon_id", salonId)
        .order("name", { ascending: true }),
      supabase.from("client_metrics").select("*").eq("salon_id", salonId),
      supabase.from("services").select("*").eq("salon_id", salonId),
      supabase.from("appointments").select("*").eq("salon_id", salonId),
    ]);

  const hasError = [
    logQueryError("campaign clients", clientsResult.error),
    logQueryError("campaign client metrics", metricsResult.error),
    logQueryError("campaign services", servicesResult.error),
    logQueryError("campaign appointments", appointmentsResult.error),
  ].some(Boolean);

  return {
    appointments: appointmentsResult.data ?? [],
    clients: clientsResult.data ?? [],
    hasError,
    metrics: (metricsResult.data ?? []).map(refreshClientMetrics),
    services: servicesResult.data ?? [],
  };
}

function buildAudiences(
  snapshot: CampaignSnapshot
): Record<CampaignSegmentKey, CampaignClient[]> {
  const metricsByClientId = new Map(
    snapshot.metrics
      .filter((metrics) => metrics.client_id)
      .map((metrics) => [metrics.client_id as string, metrics])
  );
  const audience = snapshot.clients.map((client) => ({
    client,
    metrics: metricsByClientId.get(client.id) ?? null,
  }));
  const colorClientIds = getServiceClientIds(
    snapshot.services,
    snapshot.appointments,
    ["coloracao", "tonalizacao", "mechas"]
  );
  const progressiveClientIds = getServiceClientIds(
    snapshot.services,
    snapshot.appointments,
    ["progressiva", "alisamento"]
  );
  const currentMonth = getCurrentMonth();

  return {
    birthday: audience.filter(
      ({ client }) => getIsoDateMonth(client.birth_date) === currentMonth
    ),
    color: audience.filter(({ client }) => colorClientIds.has(client.id)),
    inactive: audience.filter(
      ({ metrics }) => metrics?.client_status === "Inativo"
    ),
    no_products: audience.filter(
      ({ metrics }) => metrics?.buys_products === false
    ),
    progressive: audience.filter(({ client }) =>
      progressiveClientIds.has(client.id)
    ),
    risk: audience.filter(
      ({ metrics }) => metrics?.client_status === "Em risco"
    ),
    vip: audience.filter(({ metrics }) =>
      metrics
        ? ["Diamante", "Ouro"].includes(metrics.client_level)
        : false
    ),
  };
}

function getServiceClientIds(
  services: Service[],
  appointments: Appointment[],
  terms: string[]
): Set<string> {
  const matchingServiceIds = new Set(
    services
      .filter((service) => {
        const searchableText = normalizeSearch(
          `${service.name} ${service.category ?? ""}`
        );

        return terms.some((term) => searchableText.includes(term));
      })
      .map((service) => service.id)
  );

  return new Set(
    appointments
      .filter(
        (appointment) =>
          appointment.client_id &&
          appointment.service_id &&
          matchingServiceIds.has(appointment.service_id)
      )
      .map((appointment) => appointment.client_id as string)
  );
}

function createSegments(
  audiences: Record<CampaignSegmentKey, CampaignClient[]>
): CampaignSegment[] {
  return SEGMENT_ORDER.map((key) => ({
    ...SEGMENT_CONTENT[key],
    clients: audiences[key],
    key,
  }));
}

function createEmptyAudiences(): Record<
  CampaignSegmentKey,
  CampaignClient[]
> {
  return {
    birthday: [],
    color: [],
    inactive: [],
    no_products: [],
    progressive: [],
    risk: [],
    vip: [],
  };
}

function getCurrentMonth(): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}

function getIsoDateMonth(value: string | null): string | null {
  const match = value?.match(/^\d{4}-(\d{2})-\d{2}$/);
  return match?.[1] ?? null;
}

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function logQueryError(label: string, error: unknown): boolean {
  if (!error) {
    return false;
  }

  console.error(`Failed to fetch ${label}.`, error);
  return true;
}
