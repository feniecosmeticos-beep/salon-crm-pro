import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PersistAvecImportResult } from "@/features/imports/lib";
import type {
  AvecImportType,
  ImportValidationResult,
} from "@/features/imports/types/avec-import.types";
import { IMPORT_TYPE_OPTIONS } from "./import-type-selector";

type ImportSummaryCardProps = {
  file: File | null;
  isPersisting: boolean;
  onContinue: () => void;
  persistenceResult: PersistAvecImportResult | null;
  selectedType: AvecImportType | null;
  result: ImportValidationResult | null;
};

export function ImportSummaryCard({
  file,
  isPersisting,
  onContinue,
  persistenceResult,
  selectedType,
  result,
}: ImportSummaryCardProps) {
  const selectedLabel =
    IMPORT_TYPE_OPTIONS.find((option) => option.value === selectedType)?.label ??
    "Não selecionado";
  const totalRows = result?.totalRows ?? 0;
  const validRows = result?.validRows.length ?? 0;
  const invalidRows = result?.invalidRows.length ?? 0;

  return (
    <section className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Resumo</h2>
        <Button
          type="button"
          disabled={validRows === 0 || isPersisting}
          onClick={onContinue}
        >
          {isPersisting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <ArrowRight className="size-4" aria-hidden="true" />
          )}
          {isPersisting ? "Salvando..." : "Continuar importação"}
        </Button>
      </div>
      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryItem label="Arquivo" value={file?.name ?? "Nenhum"} />
        <SummaryItem label="Tipo" value={selectedLabel} />
        <SummaryItem label="Total" value={totalRows} />
        <SummaryItem label="Válidos" value={validRows} tone="success" />
        <SummaryItem label="Inválidos" value={invalidRows} tone="danger" />
      </dl>
      {persistenceResult ? (
        <div className="mt-4 rounded-md border bg-background p-4">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold">Resultado da importação</h3>
            <span className="text-xs font-medium text-muted-foreground">
              {formatStatus(persistenceResult.status)}
            </span>
          </div>
          <dl className="grid gap-3 sm:grid-cols-3">
            <SummaryItem
              label="Importados"
              value={persistenceResult.importedRows}
              tone="success"
            />
            <SummaryItem
              label="Falhas"
              value={persistenceResult.failedRows}
              tone={persistenceResult.failedRows > 0 ? "danger" : "default"}
            />
            <SummaryItem label="Total gravado" value={persistenceResult.totalRows} />
          </dl>
          {persistenceResult.errors.length > 0 ? (
            <div className="mt-4 rounded-md border border-destructive/25 bg-destructive/10 p-3">
              <p className="text-xs font-semibold text-destructive">
                Erros encontrados
              </p>
              <ul className="mt-2 space-y-1 text-xs text-destructive">
                {persistenceResult.errors.slice(0, 5).map((error, index) => (
                  <li key={`${error.rowIndex ?? "geral"}-${index}`}>
                    {error.rowIndex ? `Linha ${error.rowIndex}: ` : ""}
                    {error.message}
                  </li>
                ))}
              </ul>
              {persistenceResult.errors.length > 5 ? (
                <p className="mt-2 text-xs text-destructive">
                  Mais {persistenceResult.errors.length - 5} erro(s) oculto(s).
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function formatStatus(status: PersistAvecImportResult["status"]): string {
  const labels: Record<PersistAvecImportResult["status"], string> = {
    completed: "Concluída",
    completed_with_errors: "Concluída com erros",
    failed: "Falhou",
  };

  return labels[status];
}

function SummaryItem({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
  tone?: "default" | "success" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "text-primary"
      : tone === "danger"
        ? "text-destructive"
        : "text-foreground";

  return (
    <div className="min-w-0 rounded-md border bg-background p-3">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className={`mt-1 truncate text-sm font-semibold ${toneClass}`}>
        {value}
      </dd>
    </div>
  );
}
