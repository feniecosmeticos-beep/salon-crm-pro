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
  traceId?: string;
};

type ImportRowHandler = (
  supabase: SupabaseServerClient,
  salonId: string,
  row: ParsedExcelRow
) => Promise<void>;

type ImportTraceContext = {
  batchLabel: string;
  fileName: string;
  traceId: string;
  type: AvecImportType | "metrics";
};

type ImportRowsTraceContext = ImportTraceContext & {
  type: AvecImportType;
};

type PersistRowsParams = {
  handler: ImportRowHandler;
  rows: ParsedExcelRow[];
  salonId: string;
  supabase: SupabaseServerClient;
  trace: ImportRowsTraceContext;
};

type PersistRowsResult = {
  errors: PersistImportError[];
  importedRows: number;
};

type AppointmentBatchEntry = {
  appointmentDate: string;
  avecCode: string | null;
  category: string | null;
  clientName: string;
  discountValue: number | null;
  email: string | null;
  grossValue: number | null;
  mobile: string | null;
  professionalName: string | null;
  row: ParsedExcelRow;
  serviceName: string;
  totalValue: number;
};

type AppointmentInsertPayload = {
  appointment_date: string;
  client_id: string;
  discount_value: number;
  gross_value: number;
  import_source: string;
  professional_id: string | null;
  salon_id: string;
  service_id: string;
  total_value: number;
};

type AppointmentInsertCandidate = {
  key: string;
  payload: AppointmentInsertPayload;
  rowIndexes: number[];
};

type ClientLookupMaps = {
  byAvecCode: Map<string, ClientRow>;
  byEmail: Map<string, ClientRow>;
  byMobile: Map<string, ClientRow>;
  byName: Map<string, ClientRow>;
};

type ServiceLookupMaps = {
  byExactKey: Map<string, ServiceRow>;
  byName: Map<string, ServiceRow>;
};

type ProfessionalLookupMaps = {
  byName: Map<string, ProfessionalRow>;
};

const BATCH_INSERT_FALLBACK_SIZE = 100;

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
  const trace = createImportTraceContext(params);
  const totalLabel = createTimerLabel(trace, "persistAvecImport");
  let summary: Record<string, unknown> = {
    batch: params.batch ?? null,
    fileName: params.fileName,
    inputRows: params.rows.length,
    traceId: trace.traceId,
    type: params.type,
  };

  console.time(totalLabel);
  console.log("[AVEC import][persistAvecImport] start", summary);

  const supabase = createSupabaseServerClient();
  const rows = params.rows.filter((row) => row.errors.length === 0);
  const handler = IMPORT_HANDLERS[params.type];

  try {
    const persistRowsResult = await persistRowsByType({
      handler,
      rows,
      salonId: params.salonId,
      supabase,
      trace,
    });
    const errors = [...persistRowsResult.errors];
    const importedRows = persistRowsResult.importedRows;

    if (
      ["clients", "attended_clients", "appointments", "product_sales"].includes(
        params.type
      )
    ) {
      if (shouldRecalculateMetrics(params.batch)) {
        try {
          await recalculateClientMetrics(params.salonId, trace);
        } catch (error) {
          errors.push({
            message: `Falha ao recalcular métricas: ${getErrorMessage(error)}`,
          });
        }
      } else {
        console.log("[AVEC import][recalculateMetrics] skipped", {
          batch: params.batch ?? null,
          reason: "not_final_batch",
          traceId: trace.traceId,
          type: params.type,
        });
      }
    }

    const failedRows = rows.length - importedRows;
    const status = getImportStatus(rows.length, importedRows, failedRows, errors);
    let importLogId: string | undefined;
    const importLogLabel = createTimerLabel(trace, "importsLog.upsert");

    console.time(importLogLabel);
    try {
      importLogId = await upsertImportLog(supabase, {
        failedRows,
        fileName: params.fileName,
        importLogId: params.importLogId,
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
    } finally {
      console.timeEnd(importLogLabel);
    }

    const result = {
      totalRows: rows.length,
      importedRows,
      failedRows,
      errors,
      batch: params.batch,
      importLogId,
      status: errors.length > 0 && status === "completed"
        ? "completed_with_errors"
        : status,
    };

    summary = {
      ...summary,
      failedRows: result.failedRows,
      importedRows: result.importedRows,
      importLogId: result.importLogId ?? null,
      outputStatus: result.status,
      persistedRows: result.totalRows,
    };
    console.log("[AVEC import][persistAvecImport] end", summary);

    return result;
  } finally {
    console.timeEnd(totalLabel);
  }
}

function shouldRecalculateMetrics(
  batch: PersistAvecImportParams["batch"]
): boolean {
  return !batch || batch.current === batch.total;
}

async function persistRowsByType(
  params: PersistRowsParams
): Promise<PersistRowsResult> {
  if (params.trace.type === "clients") {
    return persistClients(params);
  }

  if (params.trace.type === "appointments") {
    return persistAppointments(params);
  }

  if (params.trace.type === "product_sales") {
    return persistProducts(params);
  }

  return persistRowsWithTiming(getPersistRowsStep(params.trace.type), params);
}

async function persistClients(
  params: PersistRowsParams
): Promise<PersistRowsResult> {
  return persistRowsWithTiming("persistClients", params);
}

async function persistAppointments(
  params: PersistRowsParams
): Promise<PersistRowsResult> {
  const { rows, salonId, supabase, trace } = params;
  const label = createTimerLabel(trace, "persistAppointments");
  const errors: PersistImportError[] = [];
  let importedRows = 0;

  console.time(label);
  console.log("[AVEC import][persistAppointments] start", {
    batch: trace.batchLabel,
    mode: "batch",
    rows: rows.length,
    traceId: trace.traceId,
    type: trace.type,
  });

  try {
    const normalizeLabel = createTimerLabel(
      trace,
      "persistAppointments.normalize"
    );
    console.time(normalizeLabel);
    const normalized = normalizeAppointmentBatch(rows);
    console.timeEnd(normalizeLabel);
    errors.push(...normalized.errors);

    console.log("[AVEC import][persistAppointments] normalized", {
      invalidRows: normalized.errors.length,
      rows: rows.length,
      traceId: trace.traceId,
      validRows: normalized.entries.length,
    });

    if (normalized.entries.length === 0) {
      return {
        errors,
        importedRows,
      };
    }

    const clients = await resolveAppointmentClients({
      entries: normalized.entries,
      salonId,
      supabase,
      trace,
    });
    const professionals = await resolveAppointmentProfessionals({
      entries: normalized.entries,
      salonId,
      supabase,
      trace,
    });
    const services = await resolveAppointmentServices({
      entries: normalized.entries,
      salonId,
      supabase,
      trace,
    });
    const candidates = buildAppointmentInsertCandidates({
      clients,
      entries: normalized.entries,
      errors,
      professionals,
      salonId,
      services,
    });
    const existingKeys = await fetchExistingAppointmentKeys({
      candidates,
      salonId,
      supabase,
      trace,
    });
    const candidatesToInsert: AppointmentInsertCandidate[] = [];
    let existingRows = 0;

    for (const candidate of candidates) {
      if (existingKeys.has(candidate.key)) {
        existingRows += candidate.rowIndexes.length;
        continue;
      }

      candidatesToInsert.push(candidate);
    }

    importedRows += existingRows;
    console.log("[AVEC import][persistAppointments] deduplicated", {
      candidates: candidates.length,
      existingRows,
      insertCandidates: candidatesToInsert.length,
      rowsToInsert: sumCandidateRows(candidatesToInsert),
      traceId: trace.traceId,
    });

    const insertResult = await insertAppointmentCandidates({
      candidates: candidatesToInsert,
      supabase,
      trace,
    });

    importedRows += insertResult.importedRows;
    errors.push(...insertResult.errors);

    return {
      errors,
      importedRows,
    };
  } finally {
    console.log("[AVEC import][persistAppointments] end", {
      failedRows: errors.length,
      importedRows,
      rows: rows.length,
      traceId: trace.traceId,
    });
    console.timeEnd(label);
  }
}

async function persistProducts(
  params: PersistRowsParams
): Promise<PersistRowsResult> {
  return persistRowsWithTiming("persistProducts", params);
}

async function persistRowsWithTiming(
  step: string,
  { handler, rows, salonId, supabase, trace }: PersistRowsParams
): Promise<PersistRowsResult> {
  const label = createTimerLabel(trace, step);
  const errors: PersistImportError[] = [];
  let importedRows = 0;
  let processedRows = 0;

  console.time(label);
  console.log(`[AVEC import][${step}] start`, {
    batch: trace.batchLabel,
    mode: "sequential_row_loop",
    rows: rows.length,
    traceId: trace.traceId,
    type: trace.type,
  });

  try {
    for (const row of rows) {
      try {
        await handler(supabase, salonId, row);
        importedRows += 1;
      } catch (error) {
        errors.push({
          rowIndex: row.index,
          message: getErrorMessage(error),
        });
      } finally {
        processedRows += 1;

        if (processedRows % 100 === 0 || processedRows === rows.length) {
          console.log(`[AVEC import][${step}] progress`, {
            failedRows: errors.length,
            importedRows,
            processedRows,
            rows: rows.length,
            traceId: trace.traceId,
          });
        }
      }
    }

    return {
      errors,
      importedRows,
    };
  } finally {
    console.log(`[AVEC import][${step}] end`, {
      failedRows: errors.length,
      importedRows,
      processedRows,
      rows: rows.length,
      traceId: trace.traceId,
    });
    console.timeEnd(label);
  }
}

export async function recalculateClientMetrics(
  salonId: string,
  trace?: ImportTraceContext
): Promise<void> {
  const metricsTrace = trace ?? createStandaloneTraceContext("metrics");
  const totalLabel = createTimerLabel(metricsTrace, "recalculateMetrics");

  console.time(totalLabel);
  console.log("[AVEC import][recalculateMetrics] start", {
    batch: metricsTrace.batchLabel,
    traceId: metricsTrace.traceId,
    type: metricsTrace.type,
  });

  const supabase = createSupabaseServerClient();
  const fetchClientsLabel = createTimerLabel(
    metricsTrace,
    "recalculateMetrics.fetchClients"
  );

  console.time(fetchClientsLabel);
  const { data: clients, error: clientsError } = await supabase
    .from("clients")
    .select("*")
    .eq("salon_id", salonId);
  console.timeEnd(fetchClientsLabel);

  if (clientsError) {
    console.timeEnd(totalLabel);
    throw clientsError;
  }

  const safeClients = clients ?? [];
  const loopLabel = createTimerLabel(metricsTrace, "recalculateMetrics.clientLoop");
  let processedClients = 0;

  console.time(loopLabel);
  try {
    for (const client of safeClients) {
      await recalculateSingleClientMetrics(supabase, salonId, client);
      processedClients += 1;

      if (
        processedClients % 500 === 0 ||
        processedClients === safeClients.length
      ) {
        console.log("[AVEC import][recalculateMetrics] progress", {
          clients: safeClients.length,
          processedClients,
          traceId: metricsTrace.traceId,
        });
      }
    }
  } finally {
    console.log("[AVEC import][recalculateMetrics] end", {
      clients: safeClients.length,
      processedClients,
      traceId: metricsTrace.traceId,
    });
    console.timeEnd(loopLabel);
    console.timeEnd(totalLabel);
  }
}

function createImportTraceContext(
  params: PersistAvecImportOnServerParams
): ImportRowsTraceContext {
  return {
    batchLabel: params.batch
      ? `${params.batch.current}/${params.batch.total}`
      : "single",
    fileName: params.fileName,
    traceId: params.traceId ?? createImportTraceId(),
    type: params.type,
  };
}

function createStandaloneTraceContext(
  type: AvecImportType | "metrics"
): ImportTraceContext {
  return {
    batchLabel: "standalone",
    fileName: "standalone",
    traceId: createImportTraceId(),
    type,
  };
}

function createImportTraceId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createTimerLabel(trace: ImportTraceContext, step: string): string {
  return `[AVEC import][${trace.traceId}] ${step} | type=${trace.type} | batch=${trace.batchLabel}`;
}

function getPersistRowsStep(type: AvecImportType): string {
  const labels: Record<AvecImportType, string> = {
    appointments: "persistAppointments",
    attended_clients: "persistAttendedClients",
    clients: "persistClients",
    product_sales: "persistProducts",
    services: "persistServices",
  };

  return labels[type];
}

function normalizeAppointmentBatch(rows: ParsedExcelRow[]): {
  entries: AppointmentBatchEntry[];
  errors: PersistImportError[];
} {
  const entries: AppointmentBatchEntry[] = [];
  const errors: PersistImportError[] = [];

  for (const row of rows) {
    try {
      const normalized = row.normalized;
      const clientName = readRequiredString(normalized, "client_name");
      const serviceName = readRequiredString(normalized, "service_name");
      const appointmentDate = readRequiredString(
        normalized,
        "appointment_date"
      );
      const grossValue = readNumber(normalized, "gross_value");
      const discountValue = readNumber(normalized, "discount_value");
      const importedTotalValue = readNumber(normalized, "total_value");
      const calculatedTotalValue =
        importedTotalValue ??
        (grossValue !== null ? grossValue - (discountValue ?? 0) : null);

      entries.push({
        appointmentDate,
        avecCode: readString(normalized, "avec_code"),
        category: readString(normalized, "category"),
        clientName,
        discountValue,
        email: readString(normalized, "email"),
        grossValue,
        mobile: readString(normalized, "mobile"),
        professionalName: readOptionalReference(normalized, "professional_name"),
        row,
        serviceName,
        totalValue: calculatedTotalValue ?? 0,
      });
    } catch (error) {
      errors.push({
        rowIndex: row.index,
        message: getErrorMessage(error),
      });
    }
  }

  return { entries, errors };
}

async function resolveAppointmentClients({
  entries,
  salonId,
  supabase,
  trace,
}: {
  entries: AppointmentBatchEntry[];
  salonId: string;
  supabase: SupabaseServerClient;
  trace: ImportTraceContext;
}): Promise<ClientLookupMaps> {
  const maps = createClientLookupMaps();
  const fetchLabel = createTimerLabel(trace, "persistAppointments.fetchClients");
  const insertLabel = createTimerLabel(
    trace,
    "persistAppointments.insertMissingClients"
  );

  console.time(fetchLabel);
  const existingClients = await fetchClientsForAppointmentEntries(
    supabase,
    salonId,
    entries
  );
  console.timeEnd(fetchLabel);

  for (const client of existingClients) {
    addClientToLookupMaps(maps, client);
  }

  const missingPayloads = new Map<
    string,
    {
      avec_code: string | null;
      email: string | null;
      mobile: string | null;
      name: string;
      salon_id: string;
    }
  >();

  for (const entry of entries) {
    if (findClientForAppointmentEntry(maps, entry)) {
      continue;
    }

    missingPayloads.set(createMissingClientKey(entry), {
      avec_code: entry.avecCode,
      email: entry.email,
      mobile: entry.mobile,
      name: entry.clientName,
      salon_id: salonId,
    });
  }

  console.time(insertLabel);
  const insertedClients = await insertClientsWithFallback(
    supabase,
    [...missingPayloads.values()],
    trace
  );
  console.timeEnd(insertLabel);

  for (const client of insertedClients) {
    addClientToLookupMaps(maps, client);
  }

  console.log("[AVEC import][persistAppointments] clients resolved", {
    existing: existingClients.length,
    inserted: insertedClients.length,
    missingRequested: missingPayloads.size,
    traceId: trace.traceId,
  });

  return maps;
}

async function resolveAppointmentProfessionals({
  entries,
  salonId,
  supabase,
  trace,
}: {
  entries: AppointmentBatchEntry[];
  salonId: string;
  supabase: SupabaseServerClient;
  trace: ImportTraceContext;
}): Promise<ProfessionalLookupMaps> {
  const maps: ProfessionalLookupMaps = {
    byName: new Map(),
  };
  const names = uniqueValues(
    entries
      .map((entry) => entry.professionalName)
      .filter((name): name is string => Boolean(name))
  );

  if (names.length === 0) {
    return maps;
  }

  const fetchLabel = createTimerLabel(
    trace,
    "persistAppointments.fetchProfessionals"
  );
  const insertLabel = createTimerLabel(
    trace,
    "persistAppointments.insertMissingProfessionals"
  );

  console.time(fetchLabel);
  const existingProfessionals = await fetchProfessionalsByNames(
    supabase,
    salonId,
    names
  );
  console.timeEnd(fetchLabel);

  for (const professional of existingProfessionals) {
    maps.byName.set(normalizeLookupKey(professional.name), professional);
  }

  const missingPayloads = names
    .filter((name) => !maps.byName.has(normalizeLookupKey(name)))
    .map((name) => ({
      active: true,
      name,
      salon_id: salonId,
    }));

  console.time(insertLabel);
  const insertedProfessionals = await insertProfessionalsWithFallback(
    supabase,
    missingPayloads,
    trace
  );
  console.timeEnd(insertLabel);

  for (const professional of insertedProfessionals) {
    maps.byName.set(normalizeLookupKey(professional.name), professional);
  }

  console.log("[AVEC import][persistAppointments] professionals resolved", {
    existing: existingProfessionals.length,
    inserted: insertedProfessionals.length,
    missingRequested: missingPayloads.length,
    traceId: trace.traceId,
  });

  return maps;
}

async function resolveAppointmentServices({
  entries,
  salonId,
  supabase,
  trace,
}: {
  entries: AppointmentBatchEntry[];
  salonId: string;
  supabase: SupabaseServerClient;
  trace: ImportTraceContext;
}): Promise<ServiceLookupMaps> {
  const maps: ServiceLookupMaps = {
    byExactKey: new Map(),
    byName: new Map(),
  };
  const serviceNames = uniqueValues(entries.map((entry) => entry.serviceName));
  const fetchLabel = createTimerLabel(trace, "persistAppointments.fetchServices");
  const insertLabel = createTimerLabel(
    trace,
    "persistAppointments.insertMissingServices"
  );

  console.time(fetchLabel);
  const existingServices = await fetchServicesByNames(
    supabase,
    salonId,
    serviceNames
  );
  console.timeEnd(fetchLabel);

  for (const service of existingServices) {
    addServiceToLookupMaps(maps, service);
  }

  const missingPayloads = new Map<
    string,
    {
      active: boolean;
      category: string | null;
      name: string;
      salon_id: string;
      standard_price: number;
    }
  >();

  for (const entry of entries) {
    if (findServiceForAppointmentEntry(maps, entry)) {
      continue;
    }

    missingPayloads.set(createServiceLookupKey(entry.serviceName, entry.category), {
      active: true,
      category: entry.category,
      name: entry.serviceName,
      salon_id: salonId,
      standard_price: entry.grossValue ?? 0,
    });
  }

  console.time(insertLabel);
  const insertedServices = await insertServicesWithFallback(
    supabase,
    [...missingPayloads.values()],
    trace
  );
  console.timeEnd(insertLabel);

  for (const service of insertedServices) {
    addServiceToLookupMaps(maps, service);
  }

  console.log("[AVEC import][persistAppointments] services resolved", {
    existing: existingServices.length,
    inserted: insertedServices.length,
    missingRequested: missingPayloads.size,
    traceId: trace.traceId,
  });

  return maps;
}

function buildAppointmentInsertCandidates({
  clients,
  entries,
  errors,
  professionals,
  salonId,
  services,
}: {
  clients: ClientLookupMaps;
  entries: AppointmentBatchEntry[];
  errors: PersistImportError[];
  professionals: ProfessionalLookupMaps;
  salonId: string;
  services: ServiceLookupMaps;
}): AppointmentInsertCandidate[] {
  const candidates = new Map<string, AppointmentInsertCandidate>();

  for (const entry of entries) {
    const client = findClientForAppointmentEntry(clients, entry);
    const service = findServiceForAppointmentEntry(services, entry);
    const professional = entry.professionalName
      ? professionals.byName.get(normalizeLookupKey(entry.professionalName))
      : null;

    if (!client) {
      errors.push({
        rowIndex: entry.row.index,
        message: "Cliente não encontrado ou não criado para este atendimento.",
      });
      continue;
    }

    if (!service) {
      errors.push({
        rowIndex: entry.row.index,
        message: "Serviço não encontrado ou não criado para este atendimento.",
      });
      continue;
    }

    if (entry.professionalName && !professional) {
      errors.push({
        rowIndex: entry.row.index,
        message:
          "Profissional não encontrado ou não criado para este atendimento.",
      });
      continue;
    }

    const payload = {
      appointment_date: entry.appointmentDate,
      client_id: client.id,
      discount_value: entry.discountValue ?? 0,
      gross_value: entry.grossValue ?? 0,
      import_source: "avec",
      professional_id: professional?.id ?? null,
      salon_id: salonId,
      service_id: service.id,
      total_value: entry.totalValue,
    };
    const key = createAppointmentDedupKey(payload);
    const existingCandidate = candidates.get(key);

    if (existingCandidate) {
      existingCandidate.rowIndexes.push(entry.row.index);
      continue;
    }

    candidates.set(key, {
      key,
      payload,
      rowIndexes: [entry.row.index],
    });
  }

  return [...candidates.values()];
}

async function fetchExistingAppointmentKeys({
  candidates,
  salonId,
  supabase,
  trace,
}: {
  candidates: AppointmentInsertCandidate[];
  salonId: string;
  supabase: SupabaseServerClient;
  trace: ImportTraceContext;
}): Promise<Set<string>> {
  const keys = new Set<string>();

  if (candidates.length === 0) {
    return keys;
  }

  const label = createTimerLabel(
    trace,
    "persistAppointments.fetchExistingAppointments"
  );
  const candidateKeys = new Set(candidates.map((candidate) => candidate.key));
  const dates = uniqueValues(
    candidates.map((candidate) => candidate.payload.appointment_date)
  );

  console.time(label);
  try {
    for (const dateChunk of chunkArray(dates, BATCH_INSERT_FALLBACK_SIZE)) {
      const { data, error } = await supabase
        .from("appointments")
        .select("client_id, service_id, appointment_date, total_value")
        .eq("salon_id", salonId)
        .in("appointment_date", dateChunk);

      if (error) {
        throw error;
      }

      for (const appointment of data ?? []) {
        const key = createAppointmentDedupKey({
          appointment_date: appointment.appointment_date,
          client_id: appointment.client_id ?? "",
          service_id: appointment.service_id ?? "",
          total_value: Number(appointment.total_value ?? 0),
        });

        if (candidateKeys.has(key)) {
          keys.add(key);
        }
      }
    }

    console.log("[AVEC import][persistAppointments] existing appointments", {
      existingKeys: keys.size,
      lookupDates: dates.length,
      traceId: trace.traceId,
    });

    return keys;
  } finally {
    console.timeEnd(label);
  }
}

async function insertAppointmentCandidates({
  candidates,
  supabase,
  trace,
}: {
  candidates: AppointmentInsertCandidate[];
  supabase: SupabaseServerClient;
  trace: ImportTraceContext;
}): Promise<PersistRowsResult> {
  const label = createTimerLabel(trace, "persistAppointments.insertAppointments");
  const errors: PersistImportError[] = [];
  let importedRows = 0;

  if (candidates.length === 0) {
    return {
      errors,
      importedRows,
    };
  }

  console.time(label);
  try {
    const firstAttempt = await tryInsertAppointmentCandidateGroup(
      supabase,
      candidates
    );

    if (firstAttempt.ok) {
      importedRows = sumCandidateRows(candidates);

      console.log("[AVEC import][persistAppointments] inserted appointments", {
        candidateRows: candidates.length,
        mode: "single_batch",
        rows: importedRows,
        traceId: trace.traceId,
      });

      return {
        errors,
        importedRows,
      };
    }

    console.warn("[AVEC import][persistAppointments] batch insert failed", {
      candidates: candidates.length,
      error: firstAttempt.message,
      fallbackSize: BATCH_INSERT_FALLBACK_SIZE,
      traceId: trace.traceId,
    });

    for (const candidateChunk of chunkArray(
      candidates,
      BATCH_INSERT_FALLBACK_SIZE
    )) {
      const chunkAttempt = await tryInsertAppointmentCandidateGroup(
        supabase,
        candidateChunk
      );

      if (chunkAttempt.ok) {
        importedRows += sumCandidateRows(candidateChunk);
        continue;
      }

      const message = `Falha ao inserir grupo de atendimentos: ${chunkAttempt.message}`;

      for (const candidate of candidateChunk) {
        for (const rowIndex of candidate.rowIndexes) {
          errors.push({
            rowIndex,
            message,
          });
        }
      }
    }

    return {
      errors,
      importedRows,
    };
  } finally {
    console.log("[AVEC import][persistAppointments] insert result", {
      failedRows: errors.length,
      importedRows,
      requestedCandidates: candidates.length,
      requestedRows: sumCandidateRows(candidates),
      traceId: trace.traceId,
    });
    console.timeEnd(label);
  }
}

async function tryInsertAppointmentCandidateGroup(
  supabase: SupabaseServerClient,
  candidates: AppointmentInsertCandidate[]
): Promise<{ ok: true } | { message: string; ok: false }> {
  if (candidates.length === 0) {
    return { ok: true };
  }

  const { error } = await supabase
    .from("appointments")
    .insert(candidates.map((candidate) => candidate.payload));

  return error ? { message: getErrorMessage(error), ok: false } : { ok: true };
}

async function fetchClientsForAppointmentEntries(
  supabase: SupabaseServerClient,
  salonId: string,
  entries: AppointmentBatchEntry[]
): Promise<ClientRow[]> {
  const results = await Promise.all([
    fetchClientsByField(
      supabase,
      salonId,
      "avec_code",
      uniqueValues(
        entries
          .map((entry) => entry.avecCode)
          .filter((value): value is string => Boolean(value))
      )
    ),
    fetchClientsByField(
      supabase,
      salonId,
      "mobile",
      uniqueValues(
        entries
          .map((entry) => entry.mobile)
          .filter((value): value is string => Boolean(value))
      )
    ),
    fetchClientsByField(
      supabase,
      salonId,
      "email",
      uniqueValues(
        entries
          .map((entry) => entry.email)
          .filter((value): value is string => Boolean(value))
      )
    ),
    fetchClientsByField(
      supabase,
      salonId,
      "name",
      uniqueValues(entries.map((entry) => entry.clientName))
    ),
  ]);
  const byId = new Map<string, ClientRow>();

  for (const result of results) {
    for (const client of result) {
      byId.set(client.id, client);
    }
  }

  return [...byId.values()];
}

async function fetchClientsByField(
  supabase: SupabaseServerClient,
  salonId: string,
  field: "avec_code" | "email" | "mobile" | "name",
  values: string[]
): Promise<ClientRow[]> {
  if (values.length === 0) {
    return [];
  }

  const clients: ClientRow[] = [];

  for (const valueChunk of chunkArray(values, BATCH_INSERT_FALLBACK_SIZE)) {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("salon_id", salonId)
      .in(field, valueChunk);

    if (error) {
      throw error;
    }

    clients.push(...(data ?? []));
  }

  return clients;
}

async function fetchProfessionalsByNames(
  supabase: SupabaseServerClient,
  salonId: string,
  names: string[]
): Promise<ProfessionalRow[]> {
  const professionals: ProfessionalRow[] = [];

  for (const nameChunk of chunkArray(names, BATCH_INSERT_FALLBACK_SIZE)) {
    const { data, error } = await supabase
      .from("professionals")
      .select("*")
      .eq("salon_id", salonId)
      .in("name", nameChunk);

    if (error) {
      throw error;
    }

    professionals.push(...(data ?? []));
  }

  return professionals;
}

async function fetchServicesByNames(
  supabase: SupabaseServerClient,
  salonId: string,
  names: string[]
): Promise<ServiceRow[]> {
  const services: ServiceRow[] = [];

  for (const nameChunk of chunkArray(names, BATCH_INSERT_FALLBACK_SIZE)) {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("salon_id", salonId)
      .in("name", nameChunk);

    if (error) {
      throw error;
    }

    services.push(...(data ?? []));
  }

  return services;
}

async function insertClientsWithFallback(
  supabase: SupabaseServerClient,
  payloads: Array<{
    avec_code: string | null;
    email: string | null;
    mobile: string | null;
    name: string;
    salon_id: string;
  }>,
  trace: ImportTraceContext
): Promise<ClientRow[]> {
  if (payloads.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("clients")
    .insert(payloads)
    .select("*");

  if (!error) {
    return data ?? [];
  }

  console.warn("[AVEC import][persistAppointments] client batch failed", {
    error: getErrorMessage(error),
    fallbackSize: BATCH_INSERT_FALLBACK_SIZE,
    payloads: payloads.length,
    traceId: trace.traceId,
  });

  const inserted: ClientRow[] = [];

  for (const payloadChunk of chunkArray(payloads, BATCH_INSERT_FALLBACK_SIZE)) {
    const result = await supabase.from("clients").insert(payloadChunk).select("*");

    if (result.error) {
      console.error("[AVEC import][persistAppointments] client chunk failed", {
        error: getErrorMessage(result.error),
        payloads: payloadChunk.length,
        traceId: trace.traceId,
      });
      continue;
    }

    inserted.push(...(result.data ?? []));
  }

  return inserted;
}

async function insertProfessionalsWithFallback(
  supabase: SupabaseServerClient,
  payloads: Array<{
    active: boolean;
    name: string;
    salon_id: string;
  }>,
  trace: ImportTraceContext
): Promise<ProfessionalRow[]> {
  if (payloads.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("professionals")
    .insert(payloads)
    .select("*");

  if (!error) {
    return data ?? [];
  }

  console.warn("[AVEC import][persistAppointments] professional batch failed", {
    error: getErrorMessage(error),
    fallbackSize: BATCH_INSERT_FALLBACK_SIZE,
    payloads: payloads.length,
    traceId: trace.traceId,
  });

  const inserted: ProfessionalRow[] = [];

  for (const payloadChunk of chunkArray(payloads, BATCH_INSERT_FALLBACK_SIZE)) {
    const result = await supabase
      .from("professionals")
      .insert(payloadChunk)
      .select("*");

    if (result.error) {
      console.error(
        "[AVEC import][persistAppointments] professional chunk failed",
        {
          error: getErrorMessage(result.error),
          payloads: payloadChunk.length,
          traceId: trace.traceId,
        }
      );
      continue;
    }

    inserted.push(...(result.data ?? []));
  }

  return inserted;
}

async function insertServicesWithFallback(
  supabase: SupabaseServerClient,
  payloads: Array<{
    active: boolean;
    category: string | null;
    name: string;
    salon_id: string;
    standard_price: number;
  }>,
  trace: ImportTraceContext
): Promise<ServiceRow[]> {
  if (payloads.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("services")
    .insert(payloads)
    .select("*");

  if (!error) {
    return data ?? [];
  }

  console.warn("[AVEC import][persistAppointments] service batch failed", {
    error: getErrorMessage(error),
    fallbackSize: BATCH_INSERT_FALLBACK_SIZE,
    payloads: payloads.length,
    traceId: trace.traceId,
  });

  const inserted: ServiceRow[] = [];

  for (const payloadChunk of chunkArray(payloads, BATCH_INSERT_FALLBACK_SIZE)) {
    const result = await supabase
      .from("services")
      .insert(payloadChunk)
      .select("*");

    if (result.error) {
      console.error("[AVEC import][persistAppointments] service chunk failed", {
        error: getErrorMessage(result.error),
        payloads: payloadChunk.length,
        traceId: trace.traceId,
      });
      continue;
    }

    inserted.push(...(result.data ?? []));
  }

  return inserted;
}

function createClientLookupMaps(): ClientLookupMaps {
  return {
    byAvecCode: new Map(),
    byEmail: new Map(),
    byMobile: new Map(),
    byName: new Map(),
  };
}

function addClientToLookupMaps(maps: ClientLookupMaps, client: ClientRow) {
  if (client.avec_code) {
    maps.byAvecCode.set(client.avec_code, client);
  }

  if (client.mobile) {
    maps.byMobile.set(client.mobile, client);
  }

  if (client.email) {
    maps.byEmail.set(client.email.toLowerCase(), client);
  }

  maps.byName.set(normalizeLookupKey(client.name), client);
}

function addServiceToLookupMaps(maps: ServiceLookupMaps, service: ServiceRow) {
  maps.byExactKey.set(createServiceLookupKey(service.name, service.category), service);

  const nameKey = normalizeLookupKey(service.name);

  if (!maps.byName.has(nameKey)) {
    maps.byName.set(nameKey, service);
  }
}

function findClientForAppointmentEntry(
  maps: ClientLookupMaps,
  entry: AppointmentBatchEntry
): ClientRow | null {
  if (entry.avecCode && maps.byAvecCode.has(entry.avecCode)) {
    return maps.byAvecCode.get(entry.avecCode) ?? null;
  }

  if (entry.mobile && maps.byMobile.has(entry.mobile)) {
    return maps.byMobile.get(entry.mobile) ?? null;
  }

  if (entry.email && maps.byEmail.has(entry.email.toLowerCase())) {
    return maps.byEmail.get(entry.email.toLowerCase()) ?? null;
  }

  return maps.byName.get(normalizeLookupKey(entry.clientName)) ?? null;
}

function findServiceForAppointmentEntry(
  maps: ServiceLookupMaps,
  entry: AppointmentBatchEntry
): ServiceRow | null {
  return (
    maps.byExactKey.get(createServiceLookupKey(entry.serviceName, entry.category)) ??
    maps.byName.get(normalizeLookupKey(entry.serviceName)) ??
    null
  );
}

function createMissingClientKey(entry: AppointmentBatchEntry): string {
  if (entry.avecCode) {
    return `avec:${entry.avecCode}`;
  }

  if (entry.mobile) {
    return `mobile:${entry.mobile}`;
  }

  if (entry.email) {
    return `email:${entry.email.toLowerCase()}`;
  }

  return `name:${normalizeLookupKey(entry.clientName)}`;
}

function createServiceLookupKey(name: string, category: string | null): string {
  return `${normalizeLookupKey(name)}|${normalizeLookupKey(category ?? "")}`;
}

function createAppointmentDedupKey(
  appointment: Pick<
    AppointmentInsertPayload,
    "appointment_date" | "client_id" | "service_id" | "total_value"
  >
): string {
  return [
    appointment.client_id,
    appointment.service_id,
    appointment.appointment_date,
    formatMoneyKey(appointment.total_value),
  ].join("|");
}

function readOptionalReference(
  normalized: Record<string, unknown>,
  field: string
): string | null {
  const value = readString(normalized, field);

  if (!value || value === "-" || value === "—") {
    return null;
  }

  return value;
}

function normalizeLookupKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function formatMoneyKey(value: number): string {
  return value.toFixed(2);
}

function sumCandidateRows(candidates: AppointmentInsertCandidate[]): number {
  return candidates.reduce(
    (total, candidate) => total + candidate.rowIndexes.length,
    0
  );
}

function uniqueValues(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
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

async function upsertImportLog(
  supabase: SupabaseServerClient,
  log: {
    failedRows: number;
    fileName: string;
    importLogId?: string;
    importedRows: number;
    salonId: string;
    status: PersistImportStatus;
    totalRows: number;
    type: AvecImportType;
  }
): Promise<string> {
  if (log.importLogId) {
    const { data: existingLog, error: lookupError } = await supabase
      .from("imports")
      .select("id, total_rows, imported_rows, failed_rows, status")
      .eq("id", log.importLogId)
      .eq("salon_id", log.salonId)
      .maybeSingle();

    if (lookupError) {
      throw lookupError;
    }

    if (existingLog) {
      const totalRows = (existingLog.total_rows ?? 0) + log.totalRows;
      const importedRows = (existingLog.imported_rows ?? 0) + log.importedRows;
      const failedRows = (existingLog.failed_rows ?? 0) + log.failedRows;
      const status = getMergedImportStatus({
        batchStatus: log.status,
        existingStatus: existingLog.status,
        failedRows,
        importedRows,
        totalRows,
      });
      const { data, error } = await supabase
        .from("imports")
        .update({
          failed_rows: failedRows,
          imported_rows: importedRows,
          status,
          total_rows: totalRows,
        })
        .eq("id", existingLog.id)
        .eq("salon_id", log.salonId)
        .select("id")
        .single();

      if (error) {
        throw error;
      }

      return data.id;
    }
  }

  const { data, error } = await supabase.from("imports").insert({
    failed_rows: log.failedRows,
    file_name: log.fileName,
    file_type: log.type,
    imported_rows: log.importedRows,
    salon_id: log.salonId,
    status: log.status,
    total_rows: log.totalRows,
  }).select("id").single();

  if (error) {
    throw error;
  }

  return data.id;
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

function getMergedImportStatus({
  batchStatus,
  existingStatus,
  failedRows,
  importedRows,
  totalRows,
}: {
  batchStatus: PersistImportStatus;
  existingStatus?: string | null;
  failedRows: number;
  importedRows: number;
  totalRows: number;
}): PersistImportStatus {
  if (totalRows === 0 || importedRows === 0) {
    return "failed";
  }

  if (
    failedRows > 0 ||
    batchStatus !== "completed" ||
    existingStatus === "completed_with_errors" ||
    existingStatus === "failed"
  ) {
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
