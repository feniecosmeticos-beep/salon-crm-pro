import type {
  AvecImportType,
  ParsedExcelRow,
} from "@/features/imports/types/avec-import.types";

export type PersistImportStatus =
  | "completed"
  | "completed_with_errors"
  | "failed";

export type PersistImportError = {
  rowIndex?: number;
  message: string;
};

export const AVEC_IMPORT_BATCH_SIZE = 500;

export type PersistImportBatch = {
  current: number;
  total: number;
};

export type PersistAvecImportParams = {
  type: AvecImportType;
  fileName: string;
  rows: ParsedExcelRow[];
  batch?: PersistImportBatch;
  importLogId?: string;
};

export type PersistAvecImportResult = {
  totalRows: number;
  importedRows: number;
  failedRows: number;
  errors: PersistImportError[];
  warnings?: string[];
  status: PersistImportStatus;
  batch?: PersistImportBatch;
  durationMs?: number;
  importLogId?: string;
};

export async function persistAvecImport(
  params: PersistAvecImportParams
): Promise<PersistAvecImportResult> {
  if (params.rows.length > AVEC_IMPORT_BATCH_SIZE) {
    throw new Error(
      `Cada lote de importação deve ter no máximo ${AVEC_IMPORT_BATCH_SIZE} registros.`
    );
  }

  const label = createClientTimerLabel("persistAvecImport", params);

  console.time(label);
  console.log("[AVEC import][client] persistAvecImport start", {
    batch: params.batch ?? null,
    fileName: params.fileName,
    hasImportLogId: Boolean(params.importLogId),
    rows: params.rows.length,
    type: params.type,
  });

  try {
    const fetchLabel = createClientTimerLabel("persistAvecImport.fetch", params);
    console.time(fetchLabel);
    const response = await fetch("/api/imports/avec", {
      body: JSON.stringify(params),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    console.timeEnd(fetchLabel);

    console.log("[AVEC import][client] persistAvecImport response", {
      batch: params.batch ?? null,
      ok: response.ok,
      rows: params.rows.length,
      status: response.status,
      type: params.type,
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      throw new Error(
        body?.error ?? "Não foi possível concluir a importação AVEC."
      );
    }

    return response.json() as Promise<PersistAvecImportResult>;
  } finally {
    console.timeEnd(label);
  }
}

function createClientTimerLabel(
  step: string,
  params: PersistAvecImportParams
): string {
  const batchLabel = params.batch
    ? `${params.batch.current}/${params.batch.total}`
    : "single";

  return `[AVEC import][client] ${step} | type=${params.type} | batch=${batchLabel} | rows=${params.rows.length}`;
}
