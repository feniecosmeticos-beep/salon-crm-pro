import type {
  ExcelPreview,
  ImportValidationResult,
  ParsedExcelRow,
} from "@/features/imports/types/avec-import.types";

type ImportPreviewTableProps = {
  preview: ExcelPreview | null;
  result: ImportValidationResult | null;
};

export function ImportPreviewTable({
  preview,
  result,
}: ImportPreviewTableProps) {
  const rows = result
    ? [...result.validRows, ...result.invalidRows]
        .sort((left, right) => left.index - right.index)
        .slice(0, 50)
    : [];

  return (
    <section className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="border-b p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-semibold">Prévia da importação</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {result
                ? `${result.validRows.length} válidas, ${result.invalidRows.length} com erro`
                : "Aguardando processamento"}
            </p>
          </div>
          <ColumnList columns={preview?.columns ?? []} />
        </div>
      </div>
      {rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="w-24 px-4 py-3 font-medium">Linha</th>
                <th className="px-4 py-3 font-medium">Dados normalizados</th>
                <th className="w-72 px-4 py-3 font-medium">Erros</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <PreviewRow key={row.index} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-6 text-sm text-muted-foreground">
          Nenhuma prévia processada.
        </div>
      )}
    </section>
  );
}

function ColumnList({ columns }: { columns: string[] }) {
  if (columns.length === 0) {
    return null;
  }

  return (
    <div className="flex max-w-full flex-wrap gap-2 lg:max-w-xl lg:justify-end">
      {columns.map((column) => (
        <span
          key={column}
          className="max-w-44 truncate rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground"
          title={column}
        >
          {column}
        </span>
      ))}
    </div>
  );
}

function PreviewRow({ row }: { row: ParsedExcelRow }) {
  return (
    <tr className="align-top">
      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
        {row.index}
      </td>
      <td className="px-4 py-3">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {Object.entries(row.normalized).map(([key, value]) => (
            <div key={key} className="min-w-0">
              <span className="block text-xs font-medium text-muted-foreground">
                {key}
              </span>
              <span className="block truncate" title={formatValue(value)}>
                {formatValue(value)}
              </span>
            </div>
          ))}
        </div>
      </td>
      <td className="px-4 py-3">
        {row.errors.length > 0 ? (
          <ul className="space-y-1 text-destructive">
            {row.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        ) : (
          <span className="text-muted-foreground">Sem erros</span>
        )}
      </td>
    </tr>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "number") {
    return new Intl.NumberFormat("pt-BR", {
      maximumFractionDigits: 2,
    }).format(value);
  }

  if (typeof value === "boolean") {
    return value ? "Sim" : "Não";
  }

  return String(value);
}
