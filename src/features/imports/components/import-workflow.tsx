"use client";

import { useState } from "react";
import {
  AVEC_IMPORT_BATCH_SIZE,
  parseAvecExcel,
  persistAvecImport,
  readExcelFile,
} from "@/features/imports/lib";
import type { PersistAvecImportResult } from "@/features/imports/lib";
import type {
  AvecImportType,
  ExcelPreview,
  ImportValidationResult,
} from "@/features/imports/types/avec-import.types";
import { ImportPreviewTable } from "./import-preview-table";
import {
  ImportSummaryCard,
  type ImportProgress,
} from "./import-summary-card";
import { ImportTypeSelector } from "./import-type-selector";
import { ImportUploadCard } from "./import-upload-card";

export function ImportWorkflow() {
  const [selectedType, setSelectedType] = useState<AvecImportType | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ExcelPreview | null>(null);
  const [result, setResult] = useState<ImportValidationResult | null>(null);
  const [persistenceResult, setPersistenceResult] =
    useState<PersistAvecImportResult | null>(null);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPersisting, setIsPersisting] = useState(false);

  function handleFileChange(nextFile: File | null) {
    setPreview(null);
    setResult(null);
    setPersistenceResult(null);
    setImportProgress(null);
    setSuccessMessage(null);

    if (!nextFile) {
      setFile(null);
      return;
    }

    if (!nextFile.name.toLowerCase().endsWith(".xlsx")) {
      setFile(null);
      setErrorMessage("Selecione um arquivo no formato .xlsx.");
      return;
    }

    setFile(nextFile);
    setErrorMessage(null);
  }

  async function handleProcessPreview() {
    if (!selectedType) {
      setErrorMessage("Selecione o tipo de arquivo antes de processar.");
      return;
    }

    if (!file) {
      setErrorMessage("Escolha um arquivo .xlsx antes de processar.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setPersistenceResult(null);
    setImportProgress(null);

    try {
      const [nextPreview, nextResult] = await Promise.all([
        readExcelFile(file),
        parseAvecExcel(file, selectedType),
      ]);

      setPreview(nextPreview);
      setResult(nextResult);
    } catch {
      setPreview(null);
      setResult(null);
      setErrorMessage(
        "Não foi possível ler o arquivo. Verifique se o Excel está no formato .xlsx."
      );
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleContinueImport() {
    if (isPersisting) {
      return;
    }

    if (!selectedType) {
      setErrorMessage("Selecione o tipo de arquivo antes de continuar.");
      return;
    }

    if (!file) {
      setErrorMessage("Escolha um arquivo .xlsx antes de continuar.");
      return;
    }

    if (!result || result.validRows.length === 0) {
      setErrorMessage("Não há linhas válidas para importar.");
      return;
    }

    setIsPersisting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setPersistenceResult(null);
    setImportProgress(null);

    try {
      const startedAt = performance.now();
      const batches = chunkRows(result.validRows, AVEC_IMPORT_BATCH_SIZE);
      let processedRows = 0;
      let importLogId: string | undefined;
      const aggregate = createEmptyPersistenceResult();

      for (const [batchIndex, batchRows] of batches.entries()) {
        const batch = {
          current: batchIndex + 1,
          total: batches.length,
        };

        setImportProgress({
          currentBatch: batch.current,
          elapsedMs: Math.round(performance.now() - startedAt),
          percentage: calculatePercentage(processedRows, result.validRows.length),
          processedRows,
          totalBatches: batches.length,
          totalRows: result.validRows.length,
        });

        try {
          const batchResult = await persistAvecImport({
            batch,
            fileName: file.name,
            importLogId,
            rows: batchRows,
            type: selectedType,
          });

          importLogId = batchResult.importLogId ?? importLogId;
          mergePersistenceResult(aggregate, batchResult);
        } catch (error) {
          mergePersistenceResult(aggregate, {
            batch,
            errors: batchRows.map((row) => ({
              message:
                error instanceof Error
                  ? error.message
                  : "Não foi possível importar este lote.",
              rowIndex: row.index,
            })),
            failedRows: batchRows.length,
            importedRows: 0,
            status: "failed",
            totalRows: batchRows.length,
          });
        } finally {
          processedRows += batchRows.length;

          const partialResult = finalizePersistenceResult(aggregate, {
            batch,
            durationMs: Math.round(performance.now() - startedAt),
            importLogId,
          });

          setImportProgress({
            currentBatch: batch.current,
            elapsedMs: partialResult.durationMs ?? 0,
            percentage: calculatePercentage(
              processedRows,
              result.validRows.length
            ),
            processedRows,
            totalBatches: batches.length,
            totalRows: result.validRows.length,
          });
          setPersistenceResult(partialResult);
        }
      }

      const nextPersistenceResult = finalizePersistenceResult(aggregate, {
        batch: {
          current: batches.length,
          total: batches.length,
        },
        durationMs: Math.round(performance.now() - startedAt),
        importLogId,
      });

      setImportProgress(null);
      setPersistenceResult(nextPersistenceResult);

      if (nextPersistenceResult.status === "failed") {
        setErrorMessage("A importação falhou. Confira os erros abaixo.");
        return;
      }

      setSuccessMessage(
        nextPersistenceResult.status === "completed_with_errors"
          ? "Importação concluída com alertas."
          : "Importação concluída com sucesso."
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível concluir a importação."
      );
    } finally {
      setIsPersisting(false);
    }
  }

  function handleClear() {
    setSelectedType(null);
    setFile(null);
    setPreview(null);
    setResult(null);
    setPersistenceResult(null);
    setImportProgress(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsProcessing(false);
    setIsPersisting(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <ImportTypeSelector
        selectedType={selectedType}
        onChange={(type) => {
          setSelectedType(type);
          setPreview(null);
          setResult(null);
          setPersistenceResult(null);
          setImportProgress(null);
          setErrorMessage(null);
          setSuccessMessage(null);
        }}
      />
      <ImportUploadCard
        file={file}
        isProcessing={isProcessing || isPersisting}
        onFileChange={handleFileChange}
        onProcessPreview={handleProcessPreview}
        onClear={handleClear}
      />
      {errorMessage ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          {errorMessage}
        </div>
      ) : null}
      {successMessage ? (
        <div
          role="status"
          className="rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm text-primary"
        >
          {successMessage}
        </div>
      ) : null}
      <ImportSummaryCard
        file={file}
        importProgress={importProgress}
        isPersisting={isPersisting}
        onContinue={handleContinueImport}
        persistenceResult={persistenceResult}
        selectedType={selectedType}
        result={result}
      />
      <ImportPreviewTable preview={preview} result={result} />
    </div>
  );
}

function chunkRows<T>(rows: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }

  return chunks;
}

function createEmptyPersistenceResult(): PersistAvecImportResult {
  return {
    errors: [],
    failedRows: 0,
    importedRows: 0,
    status: "failed",
    totalRows: 0,
  };
}

function mergePersistenceResult(
  target: PersistAvecImportResult,
  source: PersistAvecImportResult
) {
  target.errors.push(...source.errors);
  target.failedRows += source.failedRows;
  target.importedRows += source.importedRows;
  target.totalRows += source.totalRows;
}

function finalizePersistenceResult(
  result: PersistAvecImportResult,
  metadata: Pick<
    PersistAvecImportResult,
    "batch" | "durationMs" | "importLogId"
  >
): PersistAvecImportResult {
  return {
    ...result,
    ...metadata,
    status: getAggregateImportStatus(result),
  };
}

function getAggregateImportStatus(
  result: Pick<
    PersistAvecImportResult,
    "errors" | "failedRows" | "importedRows" | "totalRows"
  >
): PersistAvecImportResult["status"] {
  if (result.totalRows === 0 || result.importedRows === 0) {
    return "failed";
  }

  if (result.failedRows > 0 || result.errors.length > 0) {
    return "completed_with_errors";
  }

  return "completed";
}

function calculatePercentage(processedRows: number, totalRows: number): number {
  if (totalRows <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((processedRows / totalRows) * 100));
}
