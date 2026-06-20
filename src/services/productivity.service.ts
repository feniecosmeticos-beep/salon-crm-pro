import "server-only";

import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getCurrentSalonId,
  SALON_LINK_REQUIRED_MESSAGE,
} from "@/services/salon-context";
import { hasSupabaseServerConfig } from "@/services/supabase-config";
import type { FollowUp } from "@/types/database";

export type ProductivityDataState = "error" | "ready" | "unconfigured";

export type ProductivityFollowUp = FollowUp & {
  clientName: string | null;
};

export type OverdueFollowUp = ProductivityFollowUp & {
  daysOverdue: number;
};

export type ProductivitySummary = {
  completed: number;
  completionRate: number;
  overdue: number;
  pending: number;
  state: ProductivityDataState;
  tasksToday: number;
  total: number;
  warningMessage: string | null;
};

export type FollowUpsByStatus = {
  completed: ProductivityFollowUp[];
  pending: ProductivityFollowUp[];
};

export type FollowUpTypeKey =
  | "birthday"
  | "home_care"
  | "other"
  | "reactivation"
  | "return"
  | "vip";

export type FollowUpsByTypeItem = {
  key: FollowUpTypeKey;
  label: string;
  total: number;
};

type ProductivitySnapshot = {
  followUps: ProductivityFollowUp[];
  state: ProductivityDataState;
  warningMessage: string | null;
};

const TYPE_ORDER: FollowUpTypeKey[] = [
  "reactivation",
  "home_care",
  "birthday",
  "vip",
  "return",
  "other",
];

const TYPE_LABELS: Record<FollowUpTypeKey, string> = {
  birthday: "Aniversário",
  home_care: "Home care",
  other: "Outro",
  reactivation: "Reativação",
  return: "Retorno",
  vip: "VIP",
};

export async function getProductivitySummary(): Promise<ProductivitySummary> {
  const snapshot = await getProductivitySnapshot();
  const pending = snapshot.followUps.filter(
    (followUp) => followUp.status === "pending"
  );
  const completed = snapshot.followUps.filter(
    (followUp) => followUp.status === "done"
  );
  const overdue = filterOverdue(pending);
  const tasksToday = filterToday(pending);
  const total = pending.length + completed.length;

  return {
    completed: completed.length,
    completionRate: total > 0 ? (completed.length / total) * 100 : 0,
    overdue: overdue.length,
    pending: pending.length,
    state: snapshot.state,
    tasksToday: tasksToday.length,
    total,
    warningMessage: snapshot.warningMessage,
  };
}

export async function getFollowUpsByStatus(): Promise<FollowUpsByStatus> {
  const snapshot = await getProductivitySnapshot();

  return {
    completed: snapshot.followUps
      .filter((followUp) => followUp.status === "done")
      .sort(compareRecent),
    pending: snapshot.followUps
      .filter((followUp) => followUp.status === "pending")
      .sort(compareSuggestedDate),
  };
}

export async function getOverdueFollowUps(): Promise<OverdueFollowUp[]> {
  const snapshot = await getProductivitySnapshot();

  return filterOverdue(snapshot.followUps)
    .map((followUp) => ({
      ...followUp,
      daysOverdue: calculateDaysBetween(
        followUp.suggested_date as string,
        getTodayInSaoPaulo()
      ),
    }))
    .sort(
      (left, right) =>
        right.daysOverdue - left.daysOverdue ||
        left.title.localeCompare(right.title, "pt-BR")
    );
}

export async function getTodayFollowUps(): Promise<ProductivityFollowUp[]> {
  const snapshot = await getProductivitySnapshot();
  return filterToday(snapshot.followUps).sort(compareSuggestedDate);
}

export async function getFollowUpsByType(): Promise<FollowUpsByTypeItem[]> {
  const snapshot = await getProductivitySnapshot();
  const totals = new Map<FollowUpTypeKey, number>(
    TYPE_ORDER.map((key) => [key, 0])
  );

  for (const followUp of snapshot.followUps) {
    const key = getTypeKey(followUp.type);
    totals.set(key, (totals.get(key) ?? 0) + 1);
  }

  return TYPE_ORDER.map((key) => ({
    key,
    label: TYPE_LABELS[key],
    total: totals.get(key) ?? 0,
  }));
}

export async function getRecentCompletedFollowUps(): Promise<
  ProductivityFollowUp[]
> {
  const snapshot = await getProductivitySnapshot();

  return snapshot.followUps
    .filter((followUp) => followUp.status === "done")
    .sort(compareRecent)
    .slice(0, 6);
}

const getProductivitySnapshot = cache(
  async (): Promise<ProductivitySnapshot> => {
    if (!hasSupabaseServerConfig()) {
      return {
        followUps: [],
        state: "unconfigured",
        warningMessage:
          "Supabase não configurado. Não foi possível carregar a produtividade comercial.",
      };
    }

    try {
      const supabase = createSupabaseServerClient();
      const salonId = await getCurrentSalonId();

      if (!salonId) {
        return {
          followUps: [],
          state: "error",
          warningMessage: SALON_LINK_REQUIRED_MESSAGE,
        };
      }

      const followUpsResult = await supabase
        .from("follow_ups")
        .select("*")
        .eq("salon_id", salonId)
        .in("status", ["pending", "done"]);

      if (followUpsResult.error) {
        console.error(
          "Failed to fetch productivity follow-ups.",
          followUpsResult.error
        );
        return createErrorSnapshot();
      }

      const followUps = followUpsResult.data ?? [];
      const clientIds = Array.from(
        new Set(
          followUps
            .map((followUp) => followUp.client_id)
            .filter((clientId): clientId is string => Boolean(clientId))
        )
      );

      if (clientIds.length === 0) {
        return {
          followUps: followUps.map((followUp) => ({
            ...followUp,
            clientName: null,
          })),
          state: "ready",
          warningMessage: null,
        };
      }

      const clientsResult = await supabase
        .from("clients")
        .select("id, name")
        .eq("salon_id", salonId)
        .in("id", clientIds);
      const clientsById = new Map(
        (clientsResult.data ?? []).map((client) => [client.id, client.name])
      );

      if (clientsResult.error) {
        console.error(
          "Failed to fetch productivity clients.",
          clientsResult.error
        );
      }

      return {
        followUps: followUps.map((followUp) => ({
          ...followUp,
          clientName: followUp.client_id
            ? (clientsById.get(followUp.client_id) ?? null)
            : null,
        })),
        state: clientsResult.error ? "error" : "ready",
        warningMessage: clientsResult.error
          ? "Os indicadores foram carregados, mas alguns nomes de clientes podem estar indisponíveis."
          : null,
      };
    } catch (error) {
      console.error("Failed to fetch productivity data.", error);
      return createErrorSnapshot();
    }
  }
);

function filterOverdue(
  followUps: ProductivityFollowUp[]
): ProductivityFollowUp[] {
  const today = getTodayInSaoPaulo();

  return followUps.filter(
    (followUp) =>
      followUp.status === "pending" &&
      Boolean(followUp.suggested_date) &&
      (followUp.suggested_date as string) < today
  );
}

function filterToday(
  followUps: ProductivityFollowUp[]
): ProductivityFollowUp[] {
  const today = getTodayInSaoPaulo();

  return followUps.filter(
    (followUp) =>
      followUp.status === "pending" && followUp.suggested_date === today
  );
}

function getTypeKey(type: string | null): FollowUpTypeKey {
  const normalized = normalizeText(type ?? "");

  if (normalized.includes("reativ")) {
    return "reactivation";
  }

  if (
    normalized.includes("home care") ||
    normalized.includes("home_care") ||
    normalized.includes("produto")
  ) {
    return "home_care";
  }

  if (normalized.includes("anivers")) {
    return "birthday";
  }

  if (normalized === "vip" || normalized.includes("cliente vip")) {
    return "vip";
  }

  if (normalized.includes("retorno")) {
    return "return";
  }

  return "other";
}

function compareSuggestedDate(
  left: ProductivityFollowUp,
  right: ProductivityFollowUp
): number {
  return (
    (left.suggested_date ?? "9999-12-31").localeCompare(
      right.suggested_date ?? "9999-12-31"
    ) || left.title.localeCompare(right.title, "pt-BR")
  );
}

function compareRecent(
  left: ProductivityFollowUp,
  right: ProductivityFollowUp
): number {
  return (
    right.updated_at.localeCompare(left.updated_at) ||
    left.title.localeCompare(right.title, "pt-BR")
  );
}

function calculateDaysBetween(start: string, end: string): number {
  const startTime = new Date(`${start}T00:00:00Z`).getTime();
  const endTime = new Date(`${end}T00:00:00Z`).getTime();

  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
    return 0;
  }

  return Math.max(0, Math.round((endTime - startTime) / 86_400_000));
}

function getTodayInSaoPaulo(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function createErrorSnapshot(): ProductivitySnapshot {
  return {
    followUps: [],
    state: "error",
    warningMessage:
      "Não foi possível carregar os indicadores de produtividade agora.",
  };
}
