export type AvecImportType =
  | "clients"
  | "attended_clients"
  | "appointments"
  | "services"
  | "product_sales";

export type ParsedExcelRow = {
  index: number;
  raw: Record<string, unknown>;
  normalized: Record<string, unknown>;
  errors: string[];
};

export type ExcelPreview = {
  columns: string[];
  rows: ParsedExcelRow[];
  totalRows: number;
};

export type ImportValidationResult = {
  validRows: ParsedExcelRow[];
  invalidRows: ParsedExcelRow[];
  totalRows: number;
  errorCount: number;
};
