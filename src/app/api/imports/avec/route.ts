import { NextResponse } from "next/server";
import { persistAvecImportOnServer } from "@/features/imports/lib/avec-import-persistence-core";
import { isAvecImportType, validateRows } from "@/features/imports/lib/validators";
import type { ParsedExcelRow } from "@/features/imports/types/avec-import.types";
import { createAuditLog } from "@/services/audit.service";
import {
  AVEC_IMPORT_BATCH_SIZE,
  type PersistImportBatch,
} from "@/features/imports/lib/avec-import-persister";
import {
  getCurrentSalonContext,
  SALON_LINK_REQUIRED_MESSAGE,
} from "@/services/salon-context";
import { requirePermission } from "@/services/permissions.service";

const MAX_IMPORT_ROWS = AVEC_IMPORT_BATCH_SIZE;
const MAX_FILE_NAME_LENGTH = 255;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const traceId = createImportTraceId();
  const routeLabel = createRouteTimerLabel(traceId, "route.total");
  let requestSummary: Record<string, unknown> = {
    traceId,
  };

  console.time(routeLabel);
  console.log("[AVEC import][route] start", requestSummary);

  try {
    const salonContextLabel = createRouteTimerLabel(traceId, "route.salonContext");
    console.time(salonContextLabel);
    const salonContext = await getCurrentSalonContext();
    console.timeEnd(salonContextLabel);

    if (!salonContext.salonId) {
      const isUnauthenticated = salonContext.state === "unauthenticated";
      requestSummary = {
        ...requestSummary,
        routeStatus: isUnauthenticated ? 401 : 403,
        salonContextState: salonContext.state,
      };

      return NextResponse.json(
        {
          error: isUnauthenticated
            ? "Sessão não encontrada. Faça login novamente."
            : (salonContext.warningMessage ?? SALON_LINK_REQUIRED_MESSAGE),
        },
        {
          status: isUnauthenticated ? 401 : 403,
        }
      );
    }

    const permissionLabel = createRouteTimerLabel(traceId, "route.permission");
    console.time(permissionLabel);
    if (!(await requirePermission("import_avec"))) {
      console.timeEnd(permissionLabel);
      await createAuditLog({
        action: "permission_denied",
        metadata: {
          area: "importacao",
          attempted_action: "import_avec",
          permission: "import_avec",
        },
      });
      requestSummary = {
        ...requestSummary,
        routeStatus: 403,
        salonContextState: salonContext.state,
      };

      return NextResponse.json(
        {
          error:
            "Seu perfil não possui permissão para realizar importações AVEC.",
        },
        { status: 403 }
      );
    }
    console.timeEnd(permissionLabel);

    const readBodyLabel = createRouteTimerLabel(traceId, "route.readBody");
    console.time(readBodyLabel);
    const body = (await request.json()) as unknown;
    console.timeEnd(readBodyLabel);

    if (!isRecord(body)) {
      requestSummary = {
        ...requestSummary,
        routeStatus: 400,
        validationError: "body_not_record",
      };

      return NextResponse.json(
        { error: "Parâmetros de importação incompletos." },
        { status: 400 }
      );
    }

    const incomingRows = Array.isArray(body.rows) ? body.rows.length : null;
    requestSummary = {
      ...requestSummary,
      batch: isRecord(body.batch) ? body.batch : null,
      fileName: typeof body.fileName === "string" ? body.fileName : null,
      hasImportLogId: typeof body.importLogId === "string",
      rows: incomingRows,
      type: body.type,
    };
    console.log("[AVEC import][route] payload", requestSummary);

    const validatePayloadLabel = createRouteTimerLabel(
      traceId,
      "route.validatePayload"
    );
    console.time(validatePayloadLabel);

    if (!isAvecImportType(body.type)) {
      console.timeEnd(validatePayloadLabel);
      requestSummary = {
        ...requestSummary,
        routeStatus: 400,
        validationError: "invalid_type",
      };

      return NextResponse.json(
        { error: "Tipo de importação inválido." },
        { status: 400 }
      );
    }

    if (
      typeof body.fileName !== "string" ||
      body.fileName.trim().length === 0 ||
      body.fileName.length > MAX_FILE_NAME_LENGTH ||
      !body.fileName.toLowerCase().endsWith(".xlsx")
    ) {
      console.timeEnd(validatePayloadLabel);
      requestSummary = {
        ...requestSummary,
        routeStatus: 400,
        validationError: "invalid_file_name",
      };

      return NextResponse.json(
        { error: "Nome de arquivo inválido." },
        { status: 400 }
      );
    }

    if (
      !Array.isArray(body.rows) ||
      body.rows.length === 0 ||
      body.rows.length > MAX_IMPORT_ROWS
    ) {
      console.timeEnd(validatePayloadLabel);
      requestSummary = {
        ...requestSummary,
        routeStatus: 400,
        validationError: "invalid_rows_or_batch_too_large",
      };

      return NextResponse.json(
        {
          error: `Cada lote de importação deve ter no máximo ${MAX_IMPORT_ROWS} registros.`,
        },
        { status: 400 }
      );
    }

    if (
      body.importLogId !== undefined &&
      (typeof body.importLogId !== "string" ||
        !UUID_PATTERN.test(body.importLogId))
    ) {
      console.timeEnd(validatePayloadLabel);
      requestSummary = {
        ...requestSummary,
        routeStatus: 400,
        validationError: "invalid_import_log_id",
      };

      return NextResponse.json(
        { error: "Identificador da importação inválido." },
        { status: 400 }
      );
    }

    const batch = parseBatch(body.batch);

    if (body.batch !== undefined && !batch) {
      console.timeEnd(validatePayloadLabel);
      requestSummary = {
        ...requestSummary,
        routeStatus: 400,
        validationError: "invalid_batch",
      };

      return NextResponse.json(
        { error: "Informações do lote inválidas." },
        { status: 400 }
      );
    }
    console.timeEnd(validatePayloadLabel);

    const parseRowsLabel = createRouteTimerLabel(traceId, "route.parseRows");
    console.time(parseRowsLabel);
    const rows = parseRows(body.rows);
    console.timeEnd(parseRowsLabel);

    if (!rows) {
      requestSummary = {
        ...requestSummary,
        routeStatus: 400,
        validationError: "invalid_row_shape",
      };

      return NextResponse.json(
        { error: "Linhas de importação inválidas." },
        { status: 400 }
      );
    }

    const validateRowsLabel = createRouteTimerLabel(traceId, "route.validateRows");
    console.time(validateRowsLabel);
    const validation = validateRows(body.type, rows);
    console.timeEnd(validateRowsLabel);
    console.log("[AVEC import][route] validated rows", {
      batch,
      invalidRows: validation.invalidRows.length,
      totalRows: validation.totalRows,
      traceId,
      type: body.type,
      validRows: validation.validRows.length,
    });

    if (validation.invalidRows.length > 0) {
      requestSummary = {
        ...requestSummary,
        invalidRows: validation.invalidRows.length,
        routeStatus: 400,
        validationError: "rows_failed_business_validation",
      };

      return NextResponse.json(
        { error: "A importação contém linhas inválidas." },
        { status: 400 }
      );
    }

    const persistLabel = createRouteTimerLabel(traceId, "route.persistAvecImport");
    console.time(persistLabel);
    const result = await persistAvecImportOnServer({
      batch: batch ?? undefined,
      fileName: body.fileName.trim(),
      importLogId: body.importLogId,
      rows: validation.validRows,
      salonId: salonContext.salonId,
      traceId,
      type: body.type,
    });
    console.timeEnd(persistLabel);

    const auditLabel = createRouteTimerLabel(traceId, "route.auditLog");
    console.time(auditLabel);
    await createAuditLog({
      action: "import_avec_completed",
      entityType: "import",
      metadata: {
        failed_rows: result.failedRows,
        file_name: body.fileName.trim(),
        file_type: body.type,
        imported_rows: result.importedRows,
        import_log_id: result.importLogId ?? null,
        batch_current: batch?.current ?? null,
        batch_total: batch?.total ?? null,
        status: result.status,
        total_rows: result.totalRows,
      },
    });
    console.timeEnd(auditLabel);

    requestSummary = {
      ...requestSummary,
      failedRows: result.failedRows,
      importedRows: result.importedRows,
      importLogId: result.importLogId ?? null,
      routeStatus: 200,
      status: result.status,
      totalRows: result.totalRows,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to persist AVEC import.", error);
    requestSummary = {
      ...requestSummary,
      routeStatus: 500,
    };

    return NextResponse.json(
      { error: "Não foi possível persistir a importação." },
      { status: 500 }
    );
  } finally {
    console.log("[AVEC import][route] end", requestSummary);
    console.timeEnd(routeLabel);
  }
}

function createImportTraceId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createRouteTimerLabel(traceId: string, step: string): string {
  return `[AVEC import][${traceId}] ${step}`;
}

function parseBatch(value: unknown): PersistImportBatch | null {
  if (value === undefined) {
    return null;
  }

  if (!isRecord(value)) {
    return null;
  }

  if (
    !Number.isInteger(value.current) ||
    !Number.isInteger(value.total) ||
    typeof value.current !== "number" ||
    typeof value.total !== "number" ||
    value.current <= 0 ||
    value.total <= 0 ||
    value.current > value.total
  ) {
    return null;
  }

  return {
    current: value.current,
    total: value.total,
  };
}

function parseRows(value: unknown): ParsedExcelRow[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const rows: ParsedExcelRow[] = [];

  for (const item of value) {
    if (
      !isRecord(item) ||
      !Number.isInteger(item.index) ||
      typeof item.index !== "number" ||
      item.index <= 0 ||
      !isRecord(item.raw) ||
      !isRecord(item.normalized)
    ) {
      return null;
    }

    rows.push({
      errors: [],
      index: item.index,
      normalized: item.normalized,
      raw: item.raw,
    });
  }

  return rows;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
