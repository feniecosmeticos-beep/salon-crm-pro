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
  ClientLevel,
  ClientMetrics,
  ClientStatus,
  ProductSale,
  Service,
} from "@/types/database";

export type DashboardSummary = {
  totalClients: number;
  activeClients: number;
  riskClients: number;
  inactiveClients: number;
  vipClients: number;
  totalRevenue: number;
  averageTicket: number;
  productsSold: number;
  servicesPerformed: number;
  clientsToCallToday: number;
  recoveryPotential: number;
};

export type ClientsByStatus = {
  status: ClientStatus;
  total: number;
};

export type ClientsByLevel = {
  level: ClientLevel;
  total: number;
};

export type MonthlyRevenue = {
  month: string;
  revenue: number;
};

export type TopService = {
  name: string;
  total: number;
};

export type CommercialPriority = {
  key: "risk" | "inactive" | "no_products" | "vip_overdue";
  label: string;
  description: string;
  total: number;
};

export type DashboardData = {
  clientsByLevel: ClientsByLevel[];
  clientsByStatus: ClientsByStatus[];
  hasWarning: boolean;
  monthlyRevenue: MonthlyRevenue[];
  summary: DashboardSummary;
  priorities: CommercialPriority[];
  topServices: TopService[];
  warningMessage: string | null;
};

const CLIENT_STATUSES: ClientStatus[] = [
  "Novo",
  "Ativo",
  "Em risco",
  "Inativo",
  "Sem histórico",
];

const CLIENT_LEVELS: ClientLevel[] = ["Diamante", "Ouro", "Prata", "Bronze"];

const EMPTY_SUMMARY: DashboardSummary = {
  activeClients: 0,
  averageTicket: 0,
  inactiveClients: 0,
  productsSold: 0,
  riskClients: 0,
  servicesPerformed: 0,
  totalClients: 0,
  totalRevenue: 0,
  vipClients: 0,
  clientsToCallToday: 0,
  recoveryPotential: 0,
};

const EMPTY_DASHBOARD_DATA: DashboardData = {
  clientsByLevel: CLIENT_LEVELS.map((level) => ({ level, total: 0 })),
  clientsByStatus: CLIENT_STATUSES.map((status) => ({ status, total: 0 })),
  hasWarning: false,
  monthlyRevenue: [],
  summary: EMPTY_SUMMARY,
  priorities: [],
  topServices: [],
  warningMessage: null,
};

const MONTH_LABELS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

export async function getDashboardData(): Promise<DashboardData> {
  if (!hasSupabaseServerConfig()) {
    return withWarning(
      EMPTY_DASHBOARD_DATA,
      "Supabase não configurado. Exibindo indicadores zerados."
    );
  }

  const salonId = await getCurrentSalonId();

  if (!salonId) {
    return withWarning(EMPTY_DASHBOARD_DATA, SALON_LINK_REQUIRED_MESSAGE);
  }

  const supabase = createSupabaseServerClient();
  const [
    clientsResult,
    metricsResult,
    appointmentsResult,
    productSalesResult,
    servicesResult,
  ] = await Promise.all([
    supabase.from("clients").select("*").eq("salon_id", salonId),
    supabase.from("client_metrics").select("*").eq("salon_id", salonId),
    supabase.from("appointments").select("*").eq("salon_id", salonId),
    supabase.from("product_sales").select("*").eq("salon_id", salonId),
    supabase.from("services").select("*").eq("salon_id", salonId),
  ]);

  const hasWarning = [
    logQueryError("clients", clientsResult.error),
    logQueryError("client_metrics", metricsResult.error),
    logQueryError("appointments", appointmentsResult.error),
    logQueryError("product_sales", productSalesResult.error),
    logQueryError("services", servicesResult.error),
  ].some(Boolean);

  const clients = clientsResult.data ?? [];
  const metrics = (metricsResult.data ?? []).map(refreshClientMetrics);
  const appointments = appointmentsResult.data ?? [];
  const productSales = productSalesResult.data ?? [];
  const services = servicesResult.data ?? [];

  return {
    clientsByLevel: buildClientsByLevel(metrics),
    clientsByStatus: buildClientsByStatus(metrics),
    hasWarning,
    monthlyRevenue: buildMonthlyRevenue(appointments, productSales),
    priorities: buildCommercialPriorities(metrics),
    summary: buildDashboardSummary(clients, metrics, appointments, productSales),
    topServices: buildTopServices(appointments, services),
    warningMessage: hasWarning
      ? "Não foi possível carregar todos os dados do Supabase. Alguns valores podem aparecer zerados."
      : null,
  };
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const data = await getDashboardData();

  return data.summary;
}

export async function getClientsByStatus(): Promise<ClientsByStatus[]> {
  const data = await getDashboardData();

  return data.clientsByStatus;
}

export async function getClientsByLevel(): Promise<ClientsByLevel[]> {
  const data = await getDashboardData();

  return data.clientsByLevel;
}

function buildDashboardSummary(
  clients: Client[],
  metrics: ClientMetrics[],
  appointments: Appointment[],
  productSales: ProductSale[]
): DashboardSummary {
  const metricsRevenue = sumBy(metrics, (item) => item.total_spent);
  const appointmentRevenue = sumBy(appointments, (item) => item.total_value);
  const productRevenue = sumBy(productSales, (item) => item.total_value);
  const totalRevenue =
    metricsRevenue > 0 ? metricsRevenue : appointmentRevenue + productRevenue;
  const totalVisits = sumBy(metrics, (item) => item.total_visits);
  const recoveryMetrics = metrics.filter((item) =>
    ["Em risco", "Inativo"].includes(item.client_status)
  );

  return {
    activeClients: metrics.filter((item) => item.client_status === "Ativo")
      .length,
    averageTicket: totalVisits > 0 ? totalRevenue / totalVisits : 0,
    inactiveClients: metrics.filter((item) => item.client_status === "Inativo")
      .length,
    productsSold: productSales.reduce(
      (total, sale) => total + (sale.quantity || 0),
      0
    ),
    riskClients: metrics.filter((item) => item.client_status === "Em risco")
      .length,
    servicesPerformed: appointments.length,
    totalClients: clients.length,
    totalRevenue,
    vipClients: metrics.filter((item) =>
      ["Diamante", "Ouro"].includes(item.client_level)
    ).length,
    clientsToCallToday: recoveryMetrics.length,
    recoveryPotential: sumBy(recoveryMetrics, (item) => item.average_ticket),
  };
}

function buildCommercialPriorities(
  metrics: ClientMetrics[]
): CommercialPriority[] {
  return [
    {
      key: "risk",
      label: "Clientes em risco",
      description: "Contato preventivo antes que deixem de frequentar.",
      total: metrics.filter((item) => item.client_status === "Em risco").length,
    },
    {
      key: "inactive",
      label: "Clientes inativos",
      description: "Carteira com oportunidade de reativação.",
      total: metrics.filter((item) => item.client_status === "Inativo").length,
    },
    {
      key: "no_products",
      label: "Sem compra de produto",
      description: "Oportunidade de indicar manutenção e home care.",
      total: metrics.filter((item) => !item.buys_products).length,
    },
    {
      key: "vip_overdue",
      label: "VIP sem visita recente",
      description: "Clientes de alto valor sem visita há mais de 45 dias.",
      total: metrics.filter(
        (item) =>
          ["Diamante", "Ouro"].includes(item.client_level) &&
          item.days_without_visit > 45
      ).length,
    },
  ];
}

function buildClientsByStatus(metrics: ClientMetrics[]): ClientsByStatus[] {
  return CLIENT_STATUSES.map((status) => ({
    status,
    total: metrics.filter((item) => item.client_status === status).length,
  }));
}

function buildClientsByLevel(metrics: ClientMetrics[]): ClientsByLevel[] {
  return CLIENT_LEVELS.map((level) => ({
    level,
    total: metrics.filter((item) => item.client_level === level).length,
  }));
}

function buildMonthlyRevenue(
  appointments: Appointment[],
  productSales: ProductSale[]
): MonthlyRevenue[] {
  const revenueByMonth = new Map<string, number>();

  for (const appointment of appointments) {
    addMonthlyRevenue(
      revenueByMonth,
      appointment.appointment_date,
      appointment.total_value
    );
  }

  for (const sale of productSales) {
    addMonthlyRevenue(revenueByMonth, sale.sale_date, sale.total_value);
  }

  return Array.from(revenueByMonth.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([month, revenue]) => ({
      month: formatMonthLabel(month),
      revenue,
    }));
}

function buildTopServices(
  appointments: Appointment[],
  services: Service[]
): TopService[] {
  const serviceNames = new Map(
    services.map((service) => [service.id, service.name])
  );
  const totals = new Map<string, number>();

  for (const appointment of appointments) {
    const name = appointment.service_id
      ? serviceNames.get(appointment.service_id) ?? "Serviço sem cadastro"
      : "Serviço sem cadastro";

    totals.set(name, (totals.get(name) ?? 0) + 1);
  }

  return Array.from(totals.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((left, right) => right.total - left.total)
    .slice(0, 5);
}

function addMonthlyRevenue(
  revenueByMonth: Map<string, number>,
  date: string | null,
  value: number
) {
  if (!date) {
    return;
  }

  const monthKey = date.slice(0, 7);
  revenueByMonth.set(monthKey, (revenueByMonth.get(monthKey) ?? 0) + value);
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const monthIndex = Number(month) - 1;
  const label = MONTH_LABELS[monthIndex] ?? month;

  return `${label}/${year.slice(2)}`;
}

function sumBy<T>(items: T[], getValue: (item: T) => number) {
  return items.reduce((total, item) => {
    const value = getValue(item);

    return total + (Number.isFinite(value) ? value : 0);
  }, 0);
}

function logQueryError(label: string, error: unknown): boolean {
  if (!error) {
    return false;
  }

  console.error(`Failed to fetch dashboard ${label}.`, error);
  return true;
}

function withWarning(data: DashboardData, warningMessage: string): DashboardData {
  return {
    ...data,
    hasWarning: true,
    warningMessage,
  };
}
