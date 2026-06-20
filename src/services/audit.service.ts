import "server-only";

import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/services/auth.service";
import {
  getCurrentSalonContext,
  SALON_LINK_REQUIRED_MESSAGE,
} from "@/services/salon-context";
import {
  hasSupabasePublicConfig,
  hasSupabaseServerConfig,
} from "@/services/supabase-config";
import type { AppUser, AuditLog, JsonValue } from "@/types/database";

export type AuditMetadata = Record<string, JsonValue>;

export type CreateAuditLogParams = {
  action: string;
  entityId?: string | null;
  entityType?: string | null;
  metadata?: AuditMetadata;
};

export type AuditLogsState =
  | "error"
  | "forbidden"
  | "ready"
  | "unconfigured"
  | "unlinked";

export type AuditLogsResult = {
  logs: AuditLog[];
  state: AuditLogsState;
  warningMessage: string | null;
};

const SUPABASE_UNCONFIGURED_MESSAGE =
  "Supabase ainda não está configurado neste ambiente.";
const AUDIT_ADMIN_REQUIRED_MESSAGE =
  "Somente administradores podem visualizar as atividades.";

export async function createAuditLog(
  params: CreateAuditLogParams
): Promise<boolean> {
  if (
    !params.action.trim() ||
    !hasSupabasePublicConfig() ||
    !hasSupabaseServerConfig()
  ) {
    return false;
  }

  try {
    const [salonContext, requestContext] = await Promise.all([
      getCurrentSalonContext(),
      getRequestContext(),
    ]);

    if (!salonContext.salonId) {
      return false;
    }

    const supabase = createSupabaseServerClient();
    const currentUser = await resolveCurrentAuditUser(
      supabase,
      salonContext.salonId
    );
    const { error } = await supabase.from("audit_logs").insert({
      action: params.action.trim(),
      entity_id: params.entityId ?? null,
      entity_type: params.entityType?.trim() || null,
      ip_address: requestContext.ipAddress,
      metadata: params.metadata ?? {},
      salon_id: salonContext.salonId,
      user_agent: requestContext.userAgent,
      user_email: currentUser?.email ?? null,
      user_id: currentUser?.id ?? null,
    });

    return !error;
  } catch {
    return false;
  }
}

export async function getAuditLogs(limit = 50): Promise<AuditLogsResult> {
  if (!hasSupabasePublicConfig() || !hasSupabaseServerConfig()) {
    return {
      logs: [],
      state: "unconfigured",
      warningMessage: SUPABASE_UNCONFIGURED_MESSAGE,
    };
  }

  const salonContext = await getCurrentSalonContext();

  if (!salonContext.salonId) {
    return {
      logs: [],
      state: "unlinked",
      warningMessage:
        salonContext.warningMessage ?? SALON_LINK_REQUIRED_MESSAGE,
    };
  }

  try {
    const supabase = createSupabaseServerClient();
    const currentUser = await resolveCurrentAuditUser(
      supabase,
      salonContext.salonId
    );

    if (currentUser?.role !== "admin") {
      return {
        logs: [],
        state: "forbidden",
        warningMessage: AUDIT_ADMIN_REQUIRED_MESSAGE,
      };
    }

    const safeLimit = Math.min(Math.max(Math.trunc(limit) || 1, 1), 100);
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("salon_id", salonContext.salonId)
      .order("created_at", { ascending: false })
      .limit(safeLimit);

    if (error) {
      return auditQueryError();
    }

    return {
      logs: data ?? [],
      state: "ready",
      warningMessage: null,
    };
  } catch {
    return auditQueryError();
  }
}

export async function getRecentAuditLogs(): Promise<AuditLogsResult> {
  return getAuditLogs(10);
}

async function resolveCurrentAuditUser(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  salonId: string
): Promise<Pick<AppUser, "email" | "id" | "role"> | null> {
  const authUser = await getAuthenticatedUser();

  if (!authUser) {
    return null;
  }

  const idResult = await supabase
    .from("users")
    .select("id, email, role")
    .eq("id", authUser.id)
    .eq("salon_id", salonId)
    .maybeSingle();

  if (!idResult.error && idResult.data) {
    return idResult.data;
  }

  const email = authUser.email?.trim().toLowerCase();

  if (!email) {
    return null;
  }

  const emailResult = await supabase
    .from("users")
    .select("id, email, role")
    .eq("salon_id", salonId)
    .eq("email", email)
    .limit(2);
  const matches = emailResult.error ? [] : (emailResult.data ?? []);

  return matches.length === 1 ? matches[0] : null;
}

async function getRequestContext(): Promise<{
  ipAddress: string | null;
  userAgent: string | null;
}> {
  try {
    const requestHeaders = await headers();
    const forwardedFor = requestHeaders.get("x-forwarded-for");
    const ipAddress =
      forwardedFor?.split(",")[0]?.trim() ||
      requestHeaders.get("x-real-ip") ||
      null;

    return {
      ipAddress,
      userAgent: requestHeaders.get("user-agent"),
    };
  } catch {
    return {
      ipAddress: null,
      userAgent: null,
    };
  }
}

function auditQueryError(): AuditLogsResult {
  return {
    logs: [],
    state: "error",
    warningMessage: "Não foi possível carregar as últimas atividades.",
  };
}
