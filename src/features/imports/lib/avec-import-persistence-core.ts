import "server-only";

import {
  calculateClientLevel,
  calculateClientStatus,
  calculateDaysWithoutVisit,
} from "@/lib/client-metrics";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  Client,
  ClientMetrics,
  Professional,
  Service,
} from "@/types/database";
import type {
  AvecImportType,
  ParsedExcelRow,
} from "@/features/imports/types/avec-import.types";
import type {
  PersistAvecImportParams,
  PersistAvecImportResult,
  PersistImportError,
  PersistImportStatus,
} from "./avec-import-persister";

type SupabaseServerClient = ReturnType<typeof createSupabaseServerClient>;
type ClientRow = Client;
type ProfessionalRow = Professional;
type ServiceRow = Service;
type ClientMetricsRow = ClientMetrics;
type ClientMetricsPayload = Omit<
  ClientMetricsRow,
  "client_id" | "id" | "salon_id"
> & {
  client_id: string;
  salon_id: string;
};
type PersistAvecImportOnServerParams = PersistAvecImportParams & {
  salonId: string;
};

type ImportRowHandler = (
  supabase: SupabaseServerClient,
  salonId: string,
  row: ParsedExcelRow
) => Promise<void>;

const IMPORT_HANDLERS: Record<AvecImportType, ImportRowHandler> = {
  clients: persistClientRow,
  attended_clients: persistAttendedClientRow,
  appointments: persistAppointmentRow,
  services: persistServiceRow,
  product_sales: persistProductSaleRow,
};

export async function persistAvecImportOnServer(
  params: PersistAvecImportOnServerParams
): Promise<PersistAvecImportResult> {
  const supabase = createSupabaseServerClient();
  const rows = params.rows.filter((row) => row.errors.length === 0);
  const handler = IMPORT_HANDLERS[params.type];
  const errors: PersistImportError[] = [];
  let importedRows = 0;

  for (const row of rows) {
    try {
      await handler(supabase, params.salonId, row);
      importedRows += 1;
    } catch (error) {
      errors.push({
        rowIndex: row.index,
        message: getErrorMessage(error),
      });
    }
  }

  if (
    ["clients", "attended_clients", "appointments", "product_sales"].includes(
      params.type
    )
  ) {
    try {
      await recalculateClientMetrics(params.salonId);
    } catch (error) {
      errors.push({
        message: `Falha ao recalcular métricas: ${getErrorMessage(error)}`,
      });
    }
  }

  const failedRows = rows.length - importedRows;
  const status = getImportStatus(rows.length, importedRows, failedRows, errors);

  try {
    await insertImportLog(supabase, {
      failedRows,
      fileName: params.fileName,
      importedRows,
      salonId: params.salonId,
      status,
      totalRows: rows.length,
      type: params.type,
    });
  } catch (error) {
    errors.push({
      message: `Falha ao registrar log da importação: ${getErrorMessage(error)}`,
    });
  }

  return {
    totalRows: rows.length,
    importedRows,
    failedRows,
    errors,
    status: errors.length > 0 && status === "completed"
      ? "completed_with_errors"
      : status,
  };
}

export async function recalculateClientMetrics(salonId: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { data: clients, error: clientsError } = await supabase
    .from("clients")
    .select("*")
    .eq("salon_id", salonId);

  if (clientsError) {
    throw clientsError;
  }

  for (const client of clients ?? []) {
    await recalculateSingleClientMetrics(supabase, salonId, client);
  }
}

async function persistClientRow(
  supabase: SupabaseServerClient,
  salonId: string,
  row: ParsedExcelRow
): Promise<void> {
  const normalized = row.normalized;
  const name = readRequiredString(normalized, "name");
  const clientFields = {
    address: readString(normalized, "address"),
    avec_code: readString(normalized, "avec_code"),
    birth_date: readString(normalized, "birth_date"),
    city: readString(normalized, "city"),
    district: readString(normalized, "district"),
    email: readString(normalized, "email"),
    gender: readString(normalized, "gender"),
    mobile: readString(normalized, "mobile"),
    name,
    notes: readString(normalized, "notes"),
    phone: readString(normalized, "phone"),
    registration_date: readString(normalized, "registration_date"),
  };
  const existingClient = await findClientByPriority(supabase, salonId, {
    avecCode: readString(normalized, "avec_code"),
    email: readString(normalized, "email"),
    mobile: readString(normalized, "mobile"),
    name,
  });

  if (existingClient) {
    const { error } = await supabase
      .from("clients")
      .update(removeEmptyValues(clientFields))
      .eq("id", existingClient.id)
      .eq("salon_id", salonId);

    if (error) {
      throw error;
    }

    return;
  }

  const { error } = await supabase.from("clients").insert({
    ...clientFields,
    salon_id: salonId,
  });

  if (error) {
    throw error;
  }
}

async function persistAttendedClientRow(
  supabase: SupabaseServerClient,
  salonId: string,
  row: ParsedExcelRow
): Promise<void> {
  const normalized = row.normalized;
  const client = await ensureClient(supabase, salonId, {
    email: readString(normalized, "email"),
    mobile: readString(normalized, "mobile"),
    name: readRequiredString(normalized, "client_name"),
  });
  const { data: existingMetrics, error: metricsError } = await supabase
    .from("client_metrics")
    .select("*")
    .eq("salon_id", salonId)
    .eq("client_id", client.id)
    .maybeSingle();

  if (metricsError) {
    throw metricsError;
  }

  const totalVisits =
    readNumber(normalized, "total_visits") ??
    existingMetrics?.total_visits ??
    0;
  const totalServiceSpent =
    readNumber(normalized, "total_spent") ??
    existingMetrics?.total_service_spent ??
    0;
  const totalProductSpent = existingMetrics?.total_product_spent ?? 0;
  const totalSpent = totalServiceSpent + totalProductSpent;
  const lastVisit =
    readString(normalized, "last_visit") ?? existingMetrics?.last_visit ?? null;

  await upsertClientMetrics(supabase, {
    average_ticket: totalVisits > 0 ? totalSpent / totalVisits : 0,
    buys_products:
      existingMetrics?.buys_products ?? (totalProductSpent > 0),
    client_id: client.id,
    client_level: calculateClientLevel(totalSpent, totalVisits),
    client_status: calculateClientStatus(lastVisit, totalVisits),
    days_without_visit: calculateDaysWithoutVisit(lastVisit),
    last_visit: lastVisit,
    salon_id: salonId,
    total_product_spent: totalProductSpent,
    total_service_spent: totalServiceSpent,
    total_spent: totalSpent,
    total_visits: totalVisits,
    updated_at: new Date().toISOString(),
  });
}

async function persistServiceRow(
  supabase: SupabaseServerClient,
  salonId: string,
  row: ParsedExcelRow
): Promise<void> {
  await ensureService(supabase, salonId, {
    category: readString(row.normalized, "category"),
    name: readRequiredString(row.normalized, "name"),
    standardPrice: readNumber(row.normalized, "standard_price"),
  });
}

async function persistAppointmentRow(
  supabase: SupabaseServerClient,
  salonId: string,
  row: ParsedExcelRow
): Promise<void> {
  const normalized = row.normalized;
  const client = await ensureClient(supabase, salonId, {
    mobile: readString(normalized, "mobile"),
    name: readRequiredString(normalized, "client_name"),
  });
  const professionalName = readString(normalized, "professional_name");
  const professional = professionalName
    ? await ensureProfessional(supabase, salonId, professionalName)
    : null;
  const service = await ensureService(supabase, salonId, {
    category: readString(normalized, "category"),
    name: readRequiredString(normalized, "service_name"),
    standardPrice: readNumber(normalized, "gross_value"),
  });
  const appointmentDate = readRequiredString(normalized, "appointment_date");
  const grossValue = readNumber(normalized, "gross_value");
  const discountValue = readNumber(normalized, "discount_value");
  const importedTotalValue = readNumber(normalized, "total_value");
  const calculatedTotalValue =
    importedTotalValue ??
    (grossValue !== null ? grossValue - (discountValue ?? 0) : null);
  const totalValue = calculatedTotalValue ?? 0;
  const existingAppointment = await findExistingAppointment(supabase, {
    appointmentDate,
    clientId: client.id,
    professionalId: professional?.id ?? null,
    salonId,
    serviceId: service.id,
    totalValue,
  });
  const insertPayload = {
    appointment_date: appointmentDate,
    client_id: client.id,
    discount_value: discountValue ?? 0,
    gross_value: grossValue ?? 0,
    import_source: "avec",
    professional_id: professional?.id ?? null,
    salon_id: salonId,
    service_id: service.id,
    total_value: totalValue,
  };
  const updatePayload = removeEmptyValues({
    appointment_date: appointmentDate,
    client_id: client.id,
    discount_value: discountValue ?? undefined,
    gross_value: grossValue ?? undefined,
    import_source: "avec",
    professional_id: professional?.id,
    service_id: service.id,
    total_value: calculatedTotalValue ?? undefined,
  });

  if (existingAppointment) {
    const { error } = await supabase
      .from("appointments")
      .update(updatePayload)
      .eq("id", existingAppointment.id)
      .eq("salon_id", salonId);

    if (error) {
      throw error;
    }

    return;
  }

  const { error } = await supabase.from("appointments").insert(insertPayload);

  if (error) {
    throw error;
  }
}

async function persistProductSaleRow(
  supabase: SupabaseServerClient,
  salonId: string,
  row: ParsedExcelRow
): Promise<void> {
  const normalized = row.normalized;
  const client = await ensureClient(supabase, salonId, {
    name: readRequiredString(normalized, "client_name"),
  });
  const productName = readRequiredString(normalized, "product_name");
  const quantity = readNumber(normalized, "quantity") ?? 1;
  const hasImportedQuantity = hasRawColumnValue(row.raw, [
    "Quantidade",
    "Qtd.",
    "Qtd",
  ]);
  const unitValue = readNumber(normalized, "unit_value");
  const importedTotalValue = readNumber(normalized, "total_value");
  const calculatedTotalValue =
    importedTotalValue ?? (unitValue !== null ? unitValue * quantity : null);
  const totalValue = calculatedTotalValue ?? 0;
  const saleDate = readString(normalized, "sale_date");
  const existingSale = await findExistingProductSale(supabase, {
    clientId: client.id,
    productName,
    saleDate,
    salonId,
    totalValue,
  });
  const insertPayload = {
    brand: readString(normalized, "brand"),
    category: readString(normalized, "category"),
    client_id: client.id,
    product_name: productName,
    quantity,
    sale_date: saleDate,
    salon_id: salonId,
    total_value: totalValue,
    unit_value: unitValue ?? 0,
  };
  const updatePayload = removeEmptyValues({
    brand: readString(normalized, "brand") ?? undefined,
    category: readString(normalized, "category") ?? undefined,
    client_id: client.id,
    product_name: productName,
    quantity: hasImportedQuantity ? quantity : undefined,
    sale_date: saleDate ?? undefined,
    total_value: calculatedTotalValue ?? undefined,
    unit_value: unitValue ?? undefined,
  });

  if (existingSale) {
    const { error } = await supabase
      .from("product_sales")
      .update(updatePayload)
      .eq("id", existingSale.id)
      .eq("salon_id", salonId);

    if (error) {
      throw error;
    }

    return;
  }

  const { error } = await supabase.from("product_sales").insert(insertPayload);

  if (error) {
    throw error;
  }
}

async function findClientByPriority(
  supabase: SupabaseServerClient,
  salonId: string,
  lookup: {
    avecCode?: string | null;
    email?: string | null;
    mobile?: string | null;
    name?: string | null;
  }
): Promise<ClientRow | null> {
  const lookupOrder = [
    ["avec_code", lookup.avecCode],
    ["mobile", lookup.mobile],
    ["email", lookup.email],
    ["name", lookup.name],
  ] as const;

  for (const [field, value] of lookupOrder) {
    if (!value) {
      continue;
    }

    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("salon_id", salonId)
      .eq(field, value)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      return data;
    }
  }

  return null;
}

async function ensureClient(
  supabase: SupabaseServerClient,
  salonId: string,
  client: {
    email?: string | null;
    mobile?: string | null;
    name: string;
  }
): Promise<ClientRow> {
  const existingClient = await findClientByPriority(supabase, salonId, client);
  const updatePayload = removeEmptyValues({
    email: client.email,
    mobile: client.mobile,
    name: client.name,
  });

  if (existingClient) {
    const { data, error } = await supabase
      .from("clients")
      .update(updatePayload)
      .eq("id", existingClient.id)
      .eq("salon_id", salonId)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({
      email: client.email ?? null,
      mobile: client.mobile ?? null,
      name: client.name,
      salon_id: salonId,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function ensureProfessional(
  supabase: SupabaseServerClient,
  salonId: string,
  name: string
): Promise<ProfessionalRow> {
  const { data: existingProfessional, error: lookupError } = await supabase
    .from("professionals")
    .select("*")
    .eq("salon_id", salonId)
    .eq("name", name)
    .maybeSingle();

  if (lookupError) {
    throw lookupError;
  }

  if (existingProfessional) {
    return existingProfessional;
  }

  const { data, error } = await supabase
    .from("professionals")
    .insert({ active: true, name, salon_id: salonId })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function ensureService(
  supabase: SupabaseServerClient,
  salonId: string,
  service: {
    category?: string | null;
    name: string;
    standardPrice?: number | null;
  }
): Promise<ServiceRow> {
  const { data: existingService, error: lookupError } = await supabase
    .from("services")
    .select("*")
    .eq("salon_id", salonId)
    .eq("name", service.name)
    .maybeSingle();

  if (lookupError) {
    throw lookupError;
  }

  const insertPayload = {
    active: true,
    category: service.category ?? null,
    name: service.name,
    salon_id: salonId,
    standard_price: service.standardPrice ?? 0,
  };
  const updatePayload = removeEmptyValues({
    active: true,
    category: service.category ?? undefined,
    name: service.name,
    standard_price: service.standardPrice ?? undefined,
  });

  if (existingService) {
    const { data, error } = await supabase
      .from("services")
      .update(updatePayload)
      .eq("id", existingService.id)
      .eq("salon_id", salonId)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  const { data, error } = await supabase
    .from("services")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function findExistingAppointment(
  supabase: SupabaseServerClient,
  lookup: {
    appointmentDate: string;
    clientId: string;
    professionalId: string | null;
    salonId: string;
    serviceId: string;
    totalValue: number;
  }
): Promise<{ id: string } | null> {
  let query = supabase
    .from("appointments")
    .select("id")
    .eq("salon_id", lookup.salonId)
    .eq("client_id", lookup.clientId)
    .eq("service_id", lookup.serviceId)
    .eq("appointment_date", lookup.appointmentDate)
    .eq("total_value", lookup.totalValue);

  query = lookup.professionalId
    ? query.eq("professional_id", lookup.professionalId)
    : query.is("professional_id", null);

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function findExistingProductSale(
  supabase: SupabaseServerClient,
  lookup: {
    clientId: string;
    productName: string;
    saleDate: string | null;
    salonId: string;
    totalValue: number;
  }
): Promise<{ id: string } | null> {
  let query = supabase
    .from("product_sales")
    .select("id")
    .eq("salon_id", lookup.salonId)
    .eq("client_id", lookup.clientId)
    .eq("product_name", lookup.productName)
    .eq("total_value", lookup.totalValue);

  query = lookup.saleDate
    ? query.eq("sale_date", lookup.saleDate)
    : query.is("sale_date", null);

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function recalculateSingleClientMetrics(
  supabase: SupabaseServerClient,
  salonId: string,
  client: ClientRow
): Promise<void> {
  const [
    { data: appointments, error: appointmentsError },
    { data: productSales, error: productSalesError },
    { data: existingMetrics, error: metricsError },
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select("*")
      .eq("salon_id", salonId)
      .eq("client_id", client.id),
    supabase
      .from("product_sales")
      .select("*")
      .eq("salon_id", salonId)
      .eq("client_id", client.id),
    supabase
      .from("client_metrics")
      .select("*")
      .eq("salon_id", salonId)
      .eq("client_id", client.id)
      .maybeSingle(),
  ]);

  if (appointmentsError) {
    throw appointmentsError;
  }

  if (productSalesError) {
    throw productSalesError;
  }

  if (metricsError) {
    throw metricsError;
  }

  const visitCount = appointments?.length ?? 0;
  const totalProductSpent = sum(productSales ?? [], "total_value");
  const fallbackMetrics = existingMetrics as ClientMetricsRow | null;
  const totalVisits = Math.max(
    visitCount,
    fallbackMetrics?.total_visits ?? 0
  );
  const totalServiceSpent = Math.max(
    sum(appointments ?? [], "total_value"),
    fallbackMetrics?.total_service_spent ?? 0
  );
  const totalSpent = totalServiceSpent + totalProductSpent;
  const lastVisit = findLatestDate(
    findLastVisit(appointments ?? []),
    fallbackMetrics?.last_visit ?? null
  );

  await upsertClientMetrics(supabase, {
    average_ticket: totalVisits > 0 ? totalSpent / totalVisits : 0,
    buys_products: totalProductSpent > 0,
    client_id: client.id,
    client_level: calculateClientLevel(totalSpent, totalVisits),
    client_status: calculateClientStatus(lastVisit, totalVisits),
    days_without_visit: calculateDaysWithoutVisit(lastVisit),
    last_visit: lastVisit,
    salon_id: salonId,
    total_product_spent: totalProductSpent,
    total_service_spent: totalServiceSpent,
    total_spent: totalSpent,
    total_visits: totalVisits,
    updated_at: new Date().toISOString(),
  });
}

async function upsertClientMetrics(
  supabase: SupabaseServerClient,
  metrics: ClientMetricsPayload
): Promise<void> {
  const { data: existingMetrics, error: lookupError } = await supabase
    .from("client_metrics")
    .select("id")
    .eq("salon_id", metrics.salon_id)
    .eq("client_id", metrics.client_id)
    .maybeSingle();

  if (lookupError) {
    throw lookupError;
  }

  if (existingMetrics) {
    const { error } = await supabase
      .from("client_metrics")
      .update(metrics)
      .eq("id", existingMetrics.id)
      .eq("salon_id", metrics.salon_id);

    if (error) {
      throw error;
    }

    return;
  }

  const { error } = await supabase.from("client_metrics").insert(metrics);

  if (error) {
    throw error;
  }
}

async function insertImportLog(
  supabase: SupabaseServerClient,
  log: {
    failedRows: number;
    fileName: string;
    importedRows: number;
    salonId: string;
    status: PersistImportStatus;
    totalRows: number;
    type: AvecImportType;
  }
): Promise<void> {
  const { error } = await supabase.from("imports").insert({
    failed_rows: log.failedRows,
    file_name: log.fileName,
    file_type: log.type,
    imported_rows: log.importedRows,
    salon_id: log.salonId,
    status: log.status,
    total_rows: log.totalRows,
  });

  if (error) {
    throw error;
  }
}

function getImportStatus(
  totalRows: number,
  importedRows: number,
  failedRows: number,
  errors: PersistImportError[]
): PersistImportStatus {
  if (totalRows === 0 || importedRows === 0) {
    return "failed";
  }

  if (failedRows > 0 || errors.length > 0) {
    return "completed_with_errors";
  }

  return "completed";
}

function findLastVisit(
  appointments: Array<{ appointment_date: string }>
): string | null {
  return appointments
    .map((appointment) => appointment.appointment_date)
    .sort()
    .at(-1) ?? null;
}

function findLatestDate(
  left: string | null,
  right: string | null
): string | null {
  if (!left) {
    return right;
  }

  if (!right) {
    return left;
  }

  return left.localeCompare(right) >= 0 ? left : right;
}

function sum<T extends Record<string, unknown>>(items: T[], field: keyof T): number {
  return items.reduce((total, item) => {
    const value = item[field];
    return total + (typeof value === "number" ? value : 0);
  }, 0);
}

function readString(
  normalized: Record<string, unknown>,
  field: string
): string | null {
  const value = normalized[field];

  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readRequiredString(
  normalized: Record<string, unknown>,
  field: string
): string {
  const value = readString(normalized, field);

  if (!value) {
    throw new Error(`Campo obrigatório ausente: ${field}.`);
  }

  return value;
}

function readNumber(
  normalized: Record<string, unknown>,
  field: string
): number | null {
  const value = normalized[field];

  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function hasRawColumnValue(
  raw: Record<string, unknown>,
  aliases: string[]
): boolean {
  const normalizedAliases = aliases.map(normalizeColumnName);
  const matchingEntry = Object.entries(raw).find(([key]) =>
    normalizedAliases.includes(normalizeColumnName(key))
  );

  if (!matchingEntry) {
    return false;
  }

  const value = matchingEntry[1];

  return value !== null && value !== undefined && String(value).trim() !== "";
}

function normalizeColumnName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function removeEmptyValues<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => {
      if (entry === null || entry === undefined) {
        return false;
      }

      return typeof entry !== "string" || entry.trim().length > 0;
    })
  ) as T;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Erro inesperado.";
}
