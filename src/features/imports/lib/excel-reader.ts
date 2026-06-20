import * as XLSX from "xlsx";
import {
  mapAppointmentRow,
  mapAttendedClientRow,
  mapClientRow,
  mapProductSaleRow,
  mapServiceRow,
} from "./avec-mappers";
import { normalizeText } from "./normalizers";
import { validateRows } from "./validators";
import type {
  AvecImportType,
  ExcelPreview,
  ImportValidationResult,
  ParsedExcelRow,
} from "../types/avec-import.types";

const PREVIEW_ROW_LIMIT = 50;
const INVALID_EXCEL_MESSAGE = "Arquivo Excel inválido ou não suportado.";

type RowMapper = (row: Record<string, unknown>) => Record<string, unknown>;

const MAPPERS: Record<AvecImportType, RowMapper> = {
  clients: mapClientRow,
  attended_clients: mapAttendedClientRow,
  appointments: mapAppointmentRow,
  services: mapServiceRow,
  product_sales: mapProductSaleRow,
};

export async function readExcelFile(file: File): Promise<ExcelPreview> {
  const excelRows = await readExcelRows(file, PREVIEW_ROW_LIMIT);

  return {
    columns: excelRows.columns,
    rows: excelRows.rows,
    totalRows: excelRows.totalRows,
  };
}

export async function parseAvecExcel(
  file: File,
  type: AvecImportType
): Promise<ImportValidationResult> {
  const mapper = MAPPERS[type];
  const excelRows = await readExcelRows(file);
  const mappedRows = excelRows.rows.map((row) => ({
    ...row,
    normalized: mapper(row.raw),
  }));

  return validateRows(type, mappedRows);
}

async function readExcelRows(
  file: File,
  limit?: number
): Promise<{ columns: string[]; rows: ParsedExcelRow[]; totalRows: number }> {
  try {
    if (!file || file.size === 0) {
      throw new Error(INVALID_EXCEL_MESSAGE);
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { cellDates: true, type: "array" });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      throw new Error(INVALID_EXCEL_MESSAGE);
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const worksheetRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      blankrows: true,
      defval: "",
      header: 1,
      raw: true,
    });
    const headerIndex = worksheetRows.findIndex((row) => !isEmptyRow(row));

    if (headerIndex === -1) {
      throw new Error(INVALID_EXCEL_MESSAGE);
    }

    const columns = buildColumns(worksheetRows[headerIndex]);
    const parsedRows = worksheetRows
      .slice(headerIndex + 1)
      .map((row, rowOffset) => ({
        row,
        sheetRowIndex: headerIndex + rowOffset + 2,
      }))
      .filter(({ row }) => !isEmptyRow(row))
      .map(({ row, sheetRowIndex }) => ({
        index: sheetRowIndex,
        raw: buildRawRow(columns, row),
        normalized: {},
        errors: [],
      }));

    return {
      columns,
      rows: typeof limit === "number" ? parsedRows.slice(0, limit) : parsedRows,
      totalRows: parsedRows.length,
    };
  } catch (error) {
    if (error instanceof Error && error.message === INVALID_EXCEL_MESSAGE) {
      throw error;
    }

    throw new Error(INVALID_EXCEL_MESSAGE);
  }
}

function buildColumns(headerRow: unknown[]): string[] {
  return headerRow.map((value, index) => {
    return normalizeText(value) ?? `Coluna ${index + 1}`;
  });
}

function buildRawRow(
  columns: string[],
  row: unknown[]
): Record<string, unknown> {
  return columns.reduce<Record<string, unknown>>((rawRow, column, index) => {
    rawRow[column] = row[index] ?? "";
    return rawRow;
  }, {});
}

function isEmptyRow(row: unknown[]): boolean {
  return row.every((value) => normalizeText(value) === null);
}
