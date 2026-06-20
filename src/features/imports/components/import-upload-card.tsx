"use client";

import { useRef } from "react";
import { FileSpreadsheet, Loader2, Play, RotateCcw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

type ImportUploadCardProps = {
  file: File | null;
  isProcessing: boolean;
  onFileChange: (file: File | null) => void;
  onProcessPreview: () => void;
  onClear: () => void;
};

export function ImportUploadCard({
  file,
  isProcessing,
  onFileChange,
  onProcessPreview,
  onClear,
}: ImportUploadCardProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <section className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold">Arquivo AVEC</h2>
      </div>
      <div className="flex min-h-28 flex-col justify-between gap-4 rounded-md border border-dashed bg-muted/40 p-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground">
            <FileSpreadsheet className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {file?.name ?? "Nenhum arquivo selecionado"}
            </p>
            <p className="text-xs text-muted-foreground">Formato aceito: .xlsx</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            onChange={(event) => {
              onFileChange(event.target.files?.[0] ?? null);
              event.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="size-4" aria-hidden="true" />
            Escolher arquivo
          </Button>
          <Button
            type="button"
            disabled={isProcessing}
            onClick={onProcessPreview}
          >
            {isProcessing ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Play className="size-4" aria-hidden="true" />
            )}
            Processar prévia
          </Button>
          <Button type="button" variant="ghost" onClick={onClear}>
            <RotateCcw className="size-4" aria-hidden="true" />
            Limpar
          </Button>
        </div>
      </div>
    </section>
  );
}
