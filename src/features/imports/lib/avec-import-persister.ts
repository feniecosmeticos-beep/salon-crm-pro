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

export type PersistAvecImportParams = {
  type: AvecImportType;
  fileName: string;
  rows: ParsedExcelRow[];
};

export type PersistAvecImportResult = {
  totalRows: number;
  importedRows: number;
  failedRows: number;
  errors: PersistImportError[];
  status: PersistImportStatus;
};

export async function persistAvecImport(
  params: PersistAvecImportParams
): Promise<PersistAvecImportResult> {
  const response = await fetch("/api/imports/avec", {
    body: JSON.stringify(params),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
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
}
