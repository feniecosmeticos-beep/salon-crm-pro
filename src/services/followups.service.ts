import "server-only";

import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/services/audit.service";
import {
  getCurrentSalonId,
  SALON_LINK_REQUIRED_MESSAGE,
} from "@/services/salon-context";
import { requirePermission } from "@/services/permissions.service";
import { hasSupabaseServerConfig } from "@/services/supabase-config";
import type { FollowUp } from "@/types/database";

export type FollowUpDataState = "error" | "ready" | "unconfigured";

export type FollowUpListItem = FollowUp & {
  clientName: string | null;
};

export type FollowUpSummary = {
  completed: number;
  overdue: number;
  pending: number;
  total: number;
};

export type FollowUpsResult = {
  followUps: FollowUpListItem[];
  state: FollowUpDataState;
  warningMessage: string | null;
};

export type CreateFollowUpInput = {
  clientId: string;
  suggestedDate: string;
  suggestedMessage: string;
  title: string;
  type: string;
};

export type FollowUpMutationResult = {
  followUp: FollowUp | null;
  message: string;
  success: boolean;
};

export async function getFollowUps(): Promise<FollowUpsResult> {
  return getFollowUpSnapshot();
}

export async function getPendingFollowUps(): Promise<FollowUpListItem[]> {
  const result = await getFollowUpSnapshot();
  return result.followUps.filter((followUp) => followUp.status === "pending");
}

export async function getCompletedFollowUps(): Promise<FollowUpListItem[]> {
  const result = await getFollowUpSnapshot();
  return result.followUps.filter((followUp) => followUp.status === "done");
}

export async function getFollowUpSummary(): Promise<FollowUpSummary> {
  const result = await getFollowUpSnapshot();
  return buildSummary(result.followUps);
}

export async function createFollowUp(
  input: CreateFollowUpInput
): Promise<FollowUpMutationResult> {
  if (!hasSupabaseServerConfig()) {
    return mutationError(
      "Supabase não configurado. Não foi possível criar o follow-up."
    );
  }

  if (!(await requirePermission("manage_followups"))) {
    await createAuditLog({
      action: "permission_denied",
      metadata: {
        area: "followups",
        attempted_action: "create_followup",
        permission: "manage_followups",
      },
    });

    return mutationError(
      "Seu perfil não possui permissão para criar follow-ups."
    );
  }

  const validationMessage = validateCreateInput(input);

  if (validationMessage) {
    return mutationError(validationMessage);
  }

  try {
    const supabase = createSupabaseServerClient();
    const salonId = await getCurrentSalonId();

    if (!salonId) {
      return mutationError(SALON_LINK_REQUIRED_MESSAGE);
    }

    const clientResult = await supabase
      .from("clients")
      .select("id")
      .eq("id", input.clientId)
      .eq("salon_id", salonId)
      .maybeSingle();

    if (clientResult.error) {
      console.error("Failed to validate follow-up client.", clientResult.error);
      return mutationError("Não foi possível validar o cliente selecionado.");
    }

    if (!clientResult.data) {
      return mutationError("Cliente não encontrado neste salão.");
    }

    const { data, error } = await supabase
      .from("follow_ups")
      .insert({
        client_id: input.clientId,
        salon_id: salonId,
        status: "pending",
        suggested_date: input.suggestedDate,
        suggested_message: emptyToNull(input.suggestedMessage),
        title: input.title.trim(),
        type: input.type.trim(),
      })
      .select("*")
      .single();

    if (error) {
      console.error("Failed to create follow-up.", error);
      return mutationError("Não foi possível criar o follow-up agora.");
    }

    await createAuditLog({
      action: "followup_created",
      entityId: data.id,
      entityType: "follow_up",
      metadata: {
        client_id: data.client_id,
        suggested_date: data.suggested_date,
        type: data.type,
      },
    });

    return {
      followUp: data,
      message: "Follow-up criado com sucesso.",
      success: true,
    };
  } catch (error) {
    console.error("Failed to create follow-up.", error);
    return mutationError("Não foi possível criar o follow-up agora.");
  }
}

export async function updateFollowUpStatus(
  followUpId: string,
  status: "done" | "pending"
): Promise<FollowUpMutationResult> {
  if (!hasSupabaseServerConfig()) {
    return mutationError(
      "Supabase não configurado. Não foi possível atualizar o follow-up."
    );
  }

  if (!(await requirePermission("manage_followups"))) {
    await createAuditLog({
      action: "permission_denied",
      metadata: {
        area: "followups",
        attempted_action: "update_followup_status",
        permission: "manage_followups",
      },
    });

    return mutationError(
      "Seu perfil não possui permissão para alterar follow-ups."
    );
  }

  if (!followUpId.trim()) {
    return mutationError("Follow-up inválido.");
  }

  if (!["done", "pending"].includes(status)) {
    return mutationError("Status de follow-up inválido.");
  }

  try {
    const supabase = createSupabaseServerClient();
    const salonId = await getCurrentSalonId();

    if (!salonId) {
      return mutationError(SALON_LINK_REQUIRED_MESSAGE);
    }

    const existingResult = await supabase
      .from("follow_ups")
      .select("id, client_id, status")
      .eq("id", followUpId)
      .eq("salon_id", salonId)
      .maybeSingle();

    if (existingResult.error) {
      console.error(
        "Failed to validate follow-up before status update.",
        existingResult.error
      );
      return mutationError("Não foi possível atualizar o follow-up agora.");
    }

    if (!existingResult.data) {
      return mutationError("Follow-up não encontrado neste salão.");
    }

    const { data, error } = await supabase
      .from("follow_ups")
      .update({ status })
      .eq("id", followUpId)
      .eq("salon_id", salonId)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("Failed to update follow-up status.", error);
      return mutationError("Não foi possível atualizar o follow-up agora.");
    }

    if (!data) {
      return mutationError("Follow-up não encontrado neste salão.");
    }

    if (existingResult.data.status !== status) {
      await createAuditLog({
        action:
          status === "done" ? "followup_completed" : "followup_reopened",
        entityId: data.id,
        entityType: "follow_up",
        metadata: {
          client_id: data.client_id,
          followup_id: data.id,
        },
      });
    }

    return {
      followUp: data,
      message:
        status === "done"
          ? "Follow-up marcado como concluído."
          : "Follow-up reaberto com sucesso.",
      success: true,
    };
  } catch (error) {
    console.error("Failed to update follow-up status.", error);
    return mutationError("Não foi possível atualizar o follow-up agora.");
  }
}

const getFollowUpSnapshot = cache(async (): Promise<FollowUpsResult> => {
  if (!hasSupabaseServerConfig()) {
    return {
      followUps: [],
      state: "unconfigured",
      warningMessage:
        "Supabase não configurado. Não foi possível carregar os follow-ups.",
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
      console.error("Failed to fetch follow-ups.", followUpsResult.error);
      return queryError();
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
        followUps: sortFollowUps(
          followUps.map((followUp) => ({
            ...followUp,
            clientName: null,
          }))
        ),
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
    const items = followUps.map((followUp) => ({
      ...followUp,
      clientName: followUp.client_id
        ? (clientsById.get(followUp.client_id) ?? null)
        : null,
    }));

    if (clientsResult.error) {
      console.error(
        "Failed to fetch follow-up clients.",
        clientsResult.error
      );
    }

    return {
      followUps: sortFollowUps(items),
      state: clientsResult.error ? "error" : "ready",
      warningMessage: clientsResult.error
        ? "Os follow-ups foram carregados, mas alguns nomes de clientes podem estar indisponíveis."
        : null,
    };
  } catch (error) {
    console.error("Failed to fetch follow-ups.", error);
    return queryError();
  }
});

function buildSummary(followUps: FollowUpListItem[]): FollowUpSummary {
  const today = getTodayInSaoPaulo();

  return {
    completed: followUps.filter((followUp) => followUp.status === "done")
      .length,
    overdue: followUps.filter(
      (followUp) =>
        followUp.status === "pending" &&
        Boolean(followUp.suggested_date) &&
        (followUp.suggested_date as string) < today
    ).length,
    pending: followUps.filter((followUp) => followUp.status === "pending")
      .length,
    total: followUps.length,
  };
}

function sortFollowUps(followUps: FollowUpListItem[]): FollowUpListItem[] {
  const today = getTodayInSaoPaulo();

  return [...followUps].sort((left, right) => {
    const groupDifference =
      getSortGroup(left, today) - getSortGroup(right, today);

    if (groupDifference !== 0) {
      return groupDifference;
    }

    const leftDate = left.suggested_date ?? "9999-12-31";
    const rightDate = right.suggested_date ?? "9999-12-31";
    const dateDifference =
      left.status === "done"
        ? rightDate.localeCompare(leftDate)
        : leftDate.localeCompare(rightDate);

    return (
      dateDifference ||
      left.title.localeCompare(right.title, "pt-BR", {
        sensitivity: "base",
      })
    );
  });
}

function getSortGroup(followUp: FollowUp, today: string): number {
  if (followUp.status === "done") {
    return 4;
  }

  if (!followUp.suggested_date) {
    return 3;
  }

  if (followUp.suggested_date < today) {
    return 0;
  }

  if (followUp.suggested_date === today) {
    return 1;
  }

  return 2;
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

function validateCreateInput(input: CreateFollowUpInput): string | null {
  if (!input.clientId.trim()) {
    return "Selecione um cliente.";
  }

  if (input.type.trim().length < 2 || input.type.trim().length > 60) {
    return "Informe um tipo entre 2 e 60 caracteres.";
  }

  if (input.title.trim().length < 2 || input.title.trim().length > 140) {
    return "Informe um título entre 2 e 140 caracteres.";
  }

  if (input.suggestedMessage.trim().length > 1200) {
    return "A mensagem sugerida deve ter no máximo 1.200 caracteres.";
  }

  if (!isValidIsoDate(input.suggestedDate)) {
    return "Informe uma data sugerida válida.";
  }

  return null;
}

function isValidIsoDate(value: string): boolean {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() + 1 === Number(match[2]) &&
    date.getUTCDate() === Number(match[3])
  );
}

function emptyToNull(value: string): string | null {
  const normalized = value.trim();
  return normalized || null;
}

function mutationError(message: string): FollowUpMutationResult {
  return {
    followUp: null,
    message,
    success: false,
  };
}

function queryError(): FollowUpsResult {
  return {
    followUps: [],
    state: "error",
    warningMessage: "Não foi possível carregar os follow-ups agora.",
  };
}
