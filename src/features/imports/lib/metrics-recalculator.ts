export const METRICS_RECALCULATION_BATCH_SIZE = 100;

export type MetricsRecalculationResult = {
  durationMs?: number;
  hasMore: boolean;
  limit: number;
  message?: string;
  nextOffset: number | null;
  offset: number;
  processedClients: number;
  status: "completed" | "skipped";
  totalClients: number;
};

export async function recalculateMetricsBatch({
  limit = METRICS_RECALCULATION_BATCH_SIZE,
  offset,
}: {
  limit?: number;
  offset: number;
}): Promise<MetricsRecalculationResult> {
  const response = await fetch("/api/metrics/recalculate", {
    body: JSON.stringify({ limit, offset }),
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
      body?.error ?? "Não foi possível recalcular as métricas agora."
    );
  }

  return response.json() as Promise<MetricsRecalculationResult>;
}
