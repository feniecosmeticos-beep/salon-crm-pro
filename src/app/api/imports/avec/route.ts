import { NextResponse } from "next/server";
import { persistAvecImportOnServer } from "@/features/imports/lib/avec-import-persistence-core";
import { isAvecImportType, validateRows } from "@/features/imports/lib/validators";
import type { ParsedExcelRow } from "@/features/imports/types/avec-import.types";
import { createAuditLog } from "@/services/audit.service";
import {
  getCurrentSalonContext,
  SALON_LINK_REQUIRED_MESSAGE,
} from "@/services/salon-context";
import { requirePermission } from "@/services/permissions.service";

const MAX_IMPORT_ROWS = 20_000;
const MAX_FILE_NAME_LENGTH = 255;

export async function POST(request: Request) {
  try {
    const salonContext = await getCurrentSalonContext();

    if (!salonContext.salonId) {
      const isUnauthenticated = salonContext.state === "unauthenticated";

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

    if (!(await requirePermission("import_avec"))) {
      await createAuditLog({
        action: "permission_denied",
        metadata: {
          area: "importacao",
          attempted_action: "import_avec",
          permission: "import_avec",
        },
      });

      return NextResponse.json(
        {
          error:
            "Seu perfil não possui permissão para realizar importações AVEC.",
        },
        { status: 403 }
      );
    }

    const body = (await request.json()) as unknown;

    if (!isRecord(body)) {
      return NextResponse.json(
        { error: "Parâmetros de importação incompletos." },
        { status: 400 }
      );
    }

    if (!isAvecImportType(body.type)) {
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
      return NextResponse.json(
        { error: "Linhas de importação inválidas." },
        { status: 400 }
      );
    }

    const rows = parseRows(body.rows);

    if (!rows) {
      return NextResponse.json(
        { error: "Linhas de importação inválidas." },
        { status: 400 }
      );
    }

    const validation = validateRows(body.type, rows);

    if (validation.invalidRows.length > 0) {
      return NextResponse.json(
        { error: "A importação contém linhas inválidas." },
        { status: 400 }
      );
    }

    const result = await persistAvecImportOnServer({
      fileName: body.fileName.trim(),
      rows: validation.validRows,
      salonId: salonContext.salonId,
      type: body.type,
    });

    await createAuditLog({
      action: "import_avec_completed",
      entityType: "import",
      metadata: {
        failed_rows: result.failedRows,
        file_name: body.fileName.trim(),
        file_type: body.type,
        imported_rows: result.importedRows,
        status: result.status,
        total_rows: result.totalRows,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to persist AVEC import.", error);

    return NextResponse.json(
      { error: "Não foi possível persistir a importação." },
      { status: 500 }
    );
  }
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
