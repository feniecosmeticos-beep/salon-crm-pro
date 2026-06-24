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
  importProgress: ImportProgress | null;
  isPersisting: boolean;
  onContinue: () => void;
  persistenceResult: PersistAvecImportResult | null;
  selectedType: AvecImportType | null;
  result: ImportValidationResult | null;
};

export type ImportProgress = {
  currentBatch: number;
  elapsedMs: number;
  label?: string;
  percentage: number;
  processedRows: number;
  totalBatches: number;
  totalRows: number;
};

export function ImportSummaryCard({
  file,
  importProgress,
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
      {importProgress ? (
        <div className="mt-4 rounded-md border border-primary/25 bg-primary/10 p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-primary">
              {importProgress.label ??
                `Importando lote ${importProgress.currentBatch} de ${importProgress.totalBatches}...`}
            </p>
            <span className="text-sm font-semibold text-primary">
              {importProgress.percentage}%
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-primary/15">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${importProgress.percentage}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {importProgress.processedRows} de {importProgress.totalRows}{" "}
            registros enviados · {formatDuration(importProgress.elapsedMs)}
          </p>
        </div>
      ) : null}
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
              label="Falharam"
              value={persistenceResult.failedRows}
              tone={persistenceResult.failedRows > 0 ? "danger" : "default"}
            />
            <SummaryItem
              label="Total processado"
              value={persistenceResult.totalRows}
            />
            {persistenceResult.durationMs !== undefined ? (
              <SummaryItem
                label="Tempo total"
                value={formatDuration(persistenceResult.durationMs)}
              />
            ) : null}
            {persistenceResult.batch ? (
              <SummaryItem
                label="Lotes"
                value={`${persistenceResult.batch.current}/${persistenceResult.batch.total}`}
              />
            ) : null}
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
          {persistenceResult.warnings?.length ? (
            <div className="mt-4 rounded-md border border-amber-500/25 bg-amber-500/10 p-3">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                Avisos
              </p>
              <ul className="mt-2 space-y-1 text-xs text-amber-700 dark:text-amber-300">
                {persistenceResult.warnings.slice(0, 5).map((warning, index) => (
                  <li key={`${warning}-${index}`}>{warning}</li>
                ))}
              </ul>
              {persistenceResult.warnings.length > 5 ? (
                <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                  Mais {persistenceResult.warnings.length - 5} aviso(s)
                  oculto(s).
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

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}min ${seconds.toString().padStart(2, "0")}s`;
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
