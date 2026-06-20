import type {
  AvecImportType,
  ImportValidationResult,
  ParsedExcelRow,
} from "../types/avec-import.types";

export const AVEC_IMPORT_TYPES: AvecImportType[] = [
  "clients",
  "attended_clients",
  "appointments",
  "services",
  "product_sales",
];

const REQUIRED_FIELDS: Record<
  AvecImportType,
  Array<{ field: string; label: string }>
> = {
  clients: [{ field: "name", label: "nome" }],
  attended_clients: [{ field: "client_name", label: "cliente" }],
  appointments: [
    { field: "client_name", label: "cliente" },
    { field: "service_name", label: "serviço" },
    { field: "appointment_date", label: "data" },
  ],
  services: [{ field: "name", label: "serviço" }],
  product_sales: [
    { field: "client_name", label: "cliente" },
    { field: "product_name", label: "produto" },
  ],
};

export function isAvecImportType(value: unknown): value is AvecImportType {
  return (
    typeof value === "string" &&
    AVEC_IMPORT_TYPES.includes(value as AvecImportType)
  );
}

export function validateRows(
  type: AvecImportType,
  rows: ParsedExcelRow[]
): ImportValidationResult {
  const requiredFields = REQUIRED_FIELDS[type];
  const parsedRows = rows.map((row) => {
    const errors = [...row.errors];

    for (const requiredField of requiredFields) {
      if (!hasValue(row.normalized[requiredField.field])) {
        errors.push(`Campo obrigatório ausente: ${requiredField.label}.`);
      }
    }

    return { ...row, errors };
  });
  const validRows = parsedRows.filter((row) => row.errors.length === 0);
  const invalidRows = parsedRows.filter((row) => row.errors.length > 0);

  return {
    validRows,
    invalidRows,
    totalRows: parsedRows.length,
    errorCount: invalidRows.reduce((total, row) => total + row.errors.length, 0),
  };
}

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return true;
}
