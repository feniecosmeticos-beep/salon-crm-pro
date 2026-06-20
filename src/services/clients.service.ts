import "server-only";

import type { ClientListItem } from "@/features/clients/client-list.types";
import { refreshClientMetrics } from "@/lib/client-metrics";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getCurrentSalonId,
  SALON_LINK_REQUIRED_MESSAGE,
} from "@/services/salon-context";
import { hasSupabaseServerConfig } from "@/services/supabase-config";
import type { Client, ClientMetrics } from "@/types/database";

export type ClientsDataResult = {
  clients: ClientListItem[];
  hasWarning: boolean;
  warningMessage: string | null;
};

export async function getClients(): Promise<Client[]> {
  if (!hasSupabaseServerConfig()) {
    return [];
  }

  try {
    const supabase = createSupabaseServerClient();
    const salonId = await getCurrentSalonId();

    if (!salonId) {
      return [];
    }

    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("salon_id", salonId)
      .order("name", { ascending: true });

    if (error) {
      console.error("Failed to fetch clients.", error);
      return [];
    }

    return data ?? [];
  } catch (error) {
    console.error("Failed to fetch clients.", error);
    return [];
  }
}

export async function getClientById(id: string): Promise<Client | null> {
  if (!hasSupabaseServerConfig()) {
    return null;
  }

  try {
    const supabase = createSupabaseServerClient();
    const salonId = await getCurrentSalonId();

    if (!salonId) {
      return null;
    }

    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("id", id)
      .eq("salon_id", salonId)
      .maybeSingle();

    if (error) {
      console.error("Failed to fetch client by id.", error);
      return null;
    }

    return data ?? null;
  } catch (error) {
    console.error("Failed to fetch client by id.", error);
    return null;
  }
}

export async function getClientMetrics(
  clientId: string
): Promise<ClientMetrics | null> {
  if (!hasSupabaseServerConfig()) {
    return null;
  }

  try {
    const supabase = createSupabaseServerClient();
    const salonId = await getCurrentSalonId();

    if (!salonId) {
      return null;
    }

    const { data, error } = await supabase
      .from("client_metrics")
      .select("*")
      .eq("client_id", clientId)
      .eq("salon_id", salonId)
      .maybeSingle();

    if (error) {
      console.error("Failed to fetch client metrics.", error);
      return null;
    }

    return data ? refreshClientMetrics(data) : null;
  } catch (error) {
    console.error("Failed to fetch client metrics.", error);
    return null;
  }
}

export async function getClientsWithMetrics(): Promise<ClientsDataResult> {
  if (!hasSupabaseServerConfig()) {
    return {
      clients: [],
      hasWarning: true,
      warningMessage:
        "Supabase não configurado. Não foi possível carregar os clientes.",
    };
  }

  const salonId = await getCurrentSalonId();

  if (!salonId) {
    return {
      clients: [],
      hasWarning: true,
      warningMessage: SALON_LINK_REQUIRED_MESSAGE,
    };
  }

  const supabase = createSupabaseServerClient();
  const [clientsResult, metricsResult] = await Promise.all([
    supabase
      .from("clients")
      .select("*")
      .eq("salon_id", salonId)
      .order("name", { ascending: true }),
    supabase.from("client_metrics").select("*").eq("salon_id", salonId),
  ]);

  const clientsError = logQueryError("clients", clientsResult.error);
  const metricsError = logQueryError("client_metrics", metricsResult.error);
  const metricsByClientId = new Map(
    (metricsResult.data ?? [])
      .map(refreshClientMetrics)
      .filter((metrics) => metrics.client_id)
      .map((metrics) => [metrics.client_id as string, metrics])
  );
  const clients = (clientsResult.data ?? []).map((client) => ({
    client,
    metrics: metricsByClientId.get(client.id) ?? null,
  }));
  const hasWarning = clientsError || metricsError;

  return {
    clients,
    hasWarning,
    warningMessage: hasWarning
      ? "Não foi possível carregar todos os dados do Supabase. Alguns clientes podem aparecer sem métricas."
      : null,
  };
}

function logQueryError(label: string, error: unknown): boolean {
  if (!error) {
    return false;
  }

  console.error(`Failed to fetch ${label}.`, error);
  return true;
}
