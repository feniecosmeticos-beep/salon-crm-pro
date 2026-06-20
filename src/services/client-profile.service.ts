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
  FollowUp,
  ProductSale,
  Professional,
  Service,
} from "@/types/database";

type SupabaseServerClient = ReturnType<typeof createSupabaseServerClient>;

export type ClientAppointmentItem = Appointment & {
  professionalName: string | null;
  serviceCategory: string | null;
  serviceName: string | null;
};

export type ClientProfileData = {
  appointments: ClientAppointmentItem[];
  client: Client | null;
  followUps: FollowUp[];
  hasWarning: boolean;
  metrics: ClientMetrics | null;
  productSales: ProductSale[];
  warningMessage: string | null;
};

export async function getClientProfile(
  clientId: string
): Promise<ClientProfileData> {
  if (!hasSupabaseServerConfig()) {
    return createEmptyProfile(
      "Supabase não configurado. Não foi possível carregar o perfil."
    );
  }

  try {
    const supabase = createSupabaseServerClient();
    const salonId = await getCurrentSalonId();

    if (!salonId) {
      return createEmptyProfile(SALON_LINK_REQUIRED_MESSAGE);
    }

    const clientResult = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .eq("salon_id", salonId)
      .maybeSingle();

    if (clientResult.error) {
      logQueryError("client", clientResult.error);
      return createEmptyProfile(
        "Não foi possível carregar os dados deste cliente."
      );
    }

    if (!clientResult.data) {
      return createEmptyProfile();
    }

    const [metricsResult, appointments, productSales, followUps] =
      await Promise.all([
        fetchClientMetrics(supabase, salonId, clientId),
        fetchClientAppointments(supabase, salonId, clientId),
        fetchClientProductSales(supabase, salonId, clientId),
        fetchClientFollowUps(supabase, salonId, clientId),
      ]);
    const hasWarning =
      metricsResult.error ||
      appointments.error ||
      productSales.error ||
      followUps.error;

    return {
      appointments: appointments.data,
      client: clientResult.data,
      followUps: followUps.data,
      hasWarning,
      metrics: metricsResult.data
        ? refreshClientMetrics(metricsResult.data)
        : null,
      productSales: productSales.data,
      warningMessage: hasWarning
        ? "Não foi possível carregar todos os dados deste cliente."
        : null,
    };
  } catch (error) {
    console.error("Failed to fetch client profile.", error);
    return createEmptyProfile(
      "Não foi possível carregar os dados deste cliente."
    );
  }
}

export async function getClientAppointments(
  clientId: string
): Promise<ClientAppointmentItem[]> {
  if (!hasSupabaseServerConfig()) {
    return [];
  }

  try {
    const salonId = await getCurrentSalonId();

    if (!salonId) {
      return [];
    }

    const result = await fetchClientAppointments(
      createSupabaseServerClient(),
      salonId,
      clientId
    );

    return result.data;
  } catch (error) {
    console.error("Failed to fetch client appointments.", error);
    return [];
  }
}

export async function getClientProductSales(
  clientId: string
): Promise<ProductSale[]> {
  if (!hasSupabaseServerConfig()) {
    return [];
  }

  try {
    const salonId = await getCurrentSalonId();

    if (!salonId) {
      return [];
    }

    const result = await fetchClientProductSales(
      createSupabaseServerClient(),
      salonId,
      clientId
    );

    return result.data;
  } catch (error) {
    console.error("Failed to fetch client product sales.", error);
    return [];
  }
}

export async function getClientFollowUps(
  clientId: string
): Promise<FollowUp[]> {
  if (!hasSupabaseServerConfig()) {
    return [];
  }

  try {
    const salonId = await getCurrentSalonId();

    if (!salonId) {
      return [];
    }

    const result = await fetchClientFollowUps(
      createSupabaseServerClient(),
      salonId,
      clientId
    );

    return result.data;
  } catch (error) {
    console.error("Failed to fetch client follow-ups.", error);
    return [];
  }
}

function createEmptyProfile(
  warningMessage: string | null = null
): ClientProfileData {
  return {
    appointments: [],
    client: null,
    followUps: [],
    hasWarning: Boolean(warningMessage),
    metrics: null,
    productSales: [],
    warningMessage,
  };
}

async function fetchClientMetrics(
  supabase: SupabaseServerClient,
  salonId: string,
  clientId: string
): Promise<{ data: ClientMetrics | null; error: boolean }> {
  const { data, error } = await supabase
    .from("client_metrics")
    .select("*")
    .eq("salon_id", salonId)
    .eq("client_id", clientId)
    .maybeSingle();

  if (error) {
    logQueryError("client metrics", error);
    return { data: null, error: true };
  }

  return { data: data ?? null, error: false };
}

async function fetchClientAppointments(
  supabase: SupabaseServerClient,
  salonId: string,
  clientId: string
): Promise<{ data: ClientAppointmentItem[]; error: boolean }> {
  const { data: appointments, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("salon_id", salonId)
    .eq("client_id", clientId)
    .order("appointment_date", { ascending: false });

  if (error) {
    logQueryError("client appointments", error);
    return { data: [], error: true };
  }

  const appointmentRows = appointments ?? [];
  const serviceIds = uniqueIds(
    appointmentRows.map((appointment) => appointment.service_id)
  );
  const professionalIds = uniqueIds(
    appointmentRows.map((appointment) => appointment.professional_id)
  );
  const [servicesResult, professionalsResult] = await Promise.all([
    fetchServices(supabase, salonId, serviceIds),
    fetchProfessionals(supabase, salonId, professionalIds),
  ]);
  const servicesById = new Map(
    servicesResult.data.map((service) => [service.id, service])
  );
  const professionalsById = new Map(
    professionalsResult.data.map((professional) => [
      professional.id,
      professional,
    ])
  );

  return {
    data: appointmentRows.map((appointment) => {
      const service = appointment.service_id
        ? servicesById.get(appointment.service_id)
        : null;
      const professional = appointment.professional_id
        ? professionalsById.get(appointment.professional_id)
        : null;

      return {
        ...appointment,
        professionalName: professional?.name ?? null,
        serviceCategory: service?.category ?? null,
        serviceName: service?.name ?? null,
      };
    }),
    error: servicesResult.error || professionalsResult.error,
  };
}

async function fetchClientProductSales(
  supabase: SupabaseServerClient,
  salonId: string,
  clientId: string
): Promise<{ data: ProductSale[]; error: boolean }> {
  const { data, error } = await supabase
    .from("product_sales")
    .select("*")
    .eq("salon_id", salonId)
    .eq("client_id", clientId)
    .order("sale_date", { ascending: false });

  if (error) {
    logQueryError("client product sales", error);
    return { data: [], error: true };
  }

  return { data: data ?? [], error: false };
}

async function fetchClientFollowUps(
  supabase: SupabaseServerClient,
  salonId: string,
  clientId: string
): Promise<{ data: FollowUp[]; error: boolean }> {
  const { data, error } = await supabase
    .from("follow_ups")
    .select("*")
    .eq("salon_id", salonId)
    .eq("client_id", clientId)
    .order("suggested_date", { ascending: false });

  if (error) {
    logQueryError("client follow-ups", error);
    return { data: [], error: true };
  }

  return { data: data ?? [], error: false };
}

async function fetchServices(
  supabase: SupabaseServerClient,
  salonId: string,
  ids: string[]
): Promise<{ data: Service[]; error: boolean }> {
  if (ids.length === 0) {
    return { data: [], error: false };
  }

  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("salon_id", salonId)
    .in("id", ids);

  if (error) {
    logQueryError("appointment services", error);
    return { data: [], error: true };
  }

  return { data: data ?? [], error: false };
}

async function fetchProfessionals(
  supabase: SupabaseServerClient,
  salonId: string,
  ids: string[]
): Promise<{ data: Professional[]; error: boolean }> {
  if (ids.length === 0) {
    return { data: [], error: false };
  }

  const { data, error } = await supabase
    .from("professionals")
    .select("*")
    .eq("salon_id", salonId)
    .in("id", ids);

  if (error) {
    logQueryError("appointment professionals", error);
    return { data: [], error: true };
  }

  return { data: data ?? [], error: false };
}

function uniqueIds(ids: Array<string | null>): string[] {
  return Array.from(new Set(ids.filter((id): id is string => Boolean(id))));
}

function logQueryError(label: string, error: unknown): void {
  console.error(`Failed to fetch ${label}.`, error);
}
