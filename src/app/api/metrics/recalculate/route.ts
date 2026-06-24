import { NextResponse } from "next/server";
import { recalculateClientMetricsBatch } from "@/features/imports/lib/avec-import-persistence-core";
import { createAuditLog } from "@/services/audit.service";
import { requirePermission } from "@/services/permissions.service";
import {
  getCurrentSalonContext,
  SALON_LINK_REQUIRED_MESSAGE,
} from "@/services/salon-context";
import {
  hasSupabasePublicConfig,
  hasSupabaseServerConfig,
} from "@/services/supabase-config";

const DEFAULT_METRICS_RECALCULATION_LIMIT = 100;
const MAX_METRICS_RECALCULATION_LIMIT = 200;

export async function POST(request: Request) {
  const traceId = createMetricsTraceId();
  const routeLabel = `[metrics][${traceId}] route.total`;
  const startedAt = Date.now();
  let requestSummary: Record<string, unknown> = {
    traceId,
  };

  console.time(routeLabel);
  console.log("[metrics][recalculate] start", requestSummary);

  try {
    if (!hasSupabasePublicConfig() || !hasSupabaseServerConfig()) {
      requestSummary = {
        ...requestSummary,
        routeStatus: 200,
        skipped: true,
      };

      return NextResponse.json({
        durationMs: Date.now() - startedAt,
        hasMore: false,
        limit: DEFAULT_METRICS_RECALCULATION_LIMIT,
        message: "Supabase ainda não está configurado neste ambiente.",
        nextOffset: null,
        offset: 0,
        processedClients: 0,
        status: "skipped",
        totalClients: 0,
      });
    }

    const salonContext = await getCurrentSalonContext();

    if (!salonContext.salonId) {
      const isUnauthenticated = salonContext.state === "unauthenticated";
      requestSummary = {
        ...requestSummary,
        routeStatus: isUnauthenticated ? 401 : 403,
        salonContextState: salonContext.state,
      };

      return NextResponse.json(
        {
          error: isUnauthenticated
            ? "Sessão não encontrada. Faça login novamente."
            : (salonContext.warningMessage ?? SALON_LINK_REQUIRED_MESSAGE),
        },
        {
          status: isUnauthenticated ? 401 : 403,
        }
      );
    }

    if (!(await requirePermission("import_avec"))) {
      await createAuditLog({
        action: "permission_denied",
        metadata: {
          area: "metricas",
          attempted_action: "recalculate_client_metrics",
          permission: "import_avec",
        },
      });

      requestSummary = {
        ...requestSummary,
        routeStatus: 403,
        salonContextState: salonContext.state,
      };

      return NextResponse.json(
        {
          error:
            "Seu perfil não possui permissão para recalcular métricas de importação.",
        },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    const offset = parseNonNegativeInteger(
      readRecordNumber(body, "offset"),
      0
    );
    const requestedLimit = parsePositiveInteger(
      readRecordNumber(body, "limit"),
      DEFAULT_METRICS_RECALCULATION_LIMIT
    );
    const limit = Math.min(
      requestedLimit,
      MAX_METRICS_RECALCULATION_LIMIT
    );

    requestSummary = {
      ...requestSummary,
      limit,
      offset,
      salonContextState: salonContext.state,
    };

    const result = await recalculateClientMetricsBatch(salonContext.salonId, {
      limit,
      offset,
      traceId,
    });

    requestSummary = {
      ...requestSummary,
      processedClients: result.processedClients,
      routeStatus: 200,
      totalClients: result.totalClients,
    };

    return NextResponse.json({
      ...result,
      durationMs: Date.now() - startedAt,
      status: "completed",
    });
  } catch (error) {
    console.error("[metrics][recalculate] failed", {
      error,
      traceId,
    });
    requestSummary = {
      ...requestSummary,
      routeStatus: 500,
    };

    return NextResponse.json(
      { error: "Não foi possível recalcular as métricas agora." },
      { status: 500 }
    );
  } finally {
    console.log("[metrics][recalculate] end", requestSummary);
    console.timeEnd(routeLabel);
  }
}

function createMetricsTraceId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function readRecordNumber(value: unknown, key: string): number | null {
  if (!isRecord(value)) {
    return null;
  }

  return typeof value[key] === "number" ? value[key] : null;
}

function parseNonNegativeInteger(value: number | null, fallback: number): number {
  if (!Number.isInteger(value) || value === null || value < 0) {
    return fallback;
  }

  return value;
}

function parsePositiveInteger(value: number | null, fallback: number): number {
  if (!Number.isInteger(value) || value === null || value <= 0) {
    return fallback;
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
