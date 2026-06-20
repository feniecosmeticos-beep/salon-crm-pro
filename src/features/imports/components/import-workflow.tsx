"use client";

import { useState } from "react";
import {
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
import { ImportSummaryCard } from "./import-summary-card";
import { ImportTypeSelector } from "./import-type-selector";
import { ImportUploadCard } from "./import-upload-card";

export function ImportWorkflow() {
  const [selectedType, setSelectedType] = useState<AvecImportType | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ExcelPreview | null>(null);
  const [result, setResult] = useState<ImportValidationResult | null>(null);
  const [persistenceResult, setPersistenceResult] =
    useState<PersistAvecImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPersisting, setIsPersisting] = useState(false);

  function handleFileChange(nextFile: File | null) {
    setPreview(null);
    setResult(null);
    setPersistenceResult(null);
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

    try {
      const nextPersistenceResult = await persistAvecImport({
        fileName: file.name,
        rows: result.validRows,
        type: selectedType,
      });

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
