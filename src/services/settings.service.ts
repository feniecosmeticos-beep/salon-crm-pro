import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/services/audit.service";
import {
  getCurrentSalonContext,
  SALON_LINK_REQUIRED_MESSAGE,
} from "@/services/salon-context";
import { requirePermission } from "@/services/permissions.service";
import {
  hasSupabasePublicConfig,
  hasSupabaseServerConfig,
} from "@/services/supabase-config";
import type { Salon } from "@/types/database";

export type SalonSettings = Pick<
  Salon,
  "city" | "created_at" | "id" | "name" | "phone" | "plan"
>;

export type SettingsDataState =
  | "error"
  | "ready"
  | "unconfigured"
  | "unlinked";

export type SalonSettingsResult = {
  settings: SalonSettings | null;
  state: SettingsDataState;
  warningMessage: string | null;
};

export type UpdateSalonSettingsInput = {
  city: string;
  name: string;
  phone: string;
};

export type SettingsMutationResult = {
  message: string;
  settings: SalonSettings | null;
  success: boolean;
};

const SUPABASE_UNCONFIGURED_MESSAGE =
  "Supabase ainda não está configurado neste ambiente.";

export async function getCurrentSalonSettings(): Promise<SalonSettingsResult> {
  if (!hasSupabasePublicConfig() || !hasSupabaseServerConfig()) {
    return {
      settings: null,
      state: "unconfigured",
      warningMessage: SUPABASE_UNCONFIGURED_MESSAGE,
    };
  }

  const salonContext = await getCurrentSalonContext();

  if (!salonContext.salonId) {
    return createMissingContextResult(salonContext.state);
  }

  try {
    const { data, error } = await createSupabaseServerClient()
      .from("salons")
      .select("id, name, phone, city, plan, created_at")
      .eq("id", salonContext.salonId)
      .maybeSingle();

    if (error) {
      console.error("Failed to fetch current salon settings.", error);
      return settingsError("Não foi possível carregar os dados do salão.");
    }

    if (!data) {
      return {
        settings: null,
        state: "unlinked",
        warningMessage: SALON_LINK_REQUIRED_MESSAGE,
      };
    }

    return {
      settings: data,
      state: "ready",
      warningMessage: null,
    };
  } catch (error) {
    console.error("Failed to fetch current salon settings.", error);
    return settingsError("Não foi possível carregar os dados do salão.");
  }
}

export async function updateCurrentSalonSettings(
  input: UpdateSalonSettingsInput
): Promise<SettingsMutationResult> {
  if (!hasSupabasePublicConfig() || !hasSupabaseServerConfig()) {
    return mutationError(SUPABASE_UNCONFIGURED_MESSAGE);
  }

  if (!(await requirePermission("manage_settings"))) {
    await createAuditLog({
      action: "permission_denied",
      metadata: {
        area: "configuracoes",
        attempted_action: "update_salon_settings",
        permission: "manage_settings",
      },
    });

    return mutationError(
      "Seu perfil não possui permissão para editar as configurações do salão."
    );
  }

  const validationMessage = validateSettings(input);

  if (validationMessage) {
    return mutationError(validationMessage);
  }

  const salonContext = await getCurrentSalonContext();

  if (!salonContext.salonId) {
    return mutationError(
      salonContext.state === "unlinked"
        ? SALON_LINK_REQUIRED_MESSAGE
        : "Não foi possível identificar o salão deste usuário agora."
    );
  }

  try {
    const supabase = createSupabaseServerClient();
    const previousResult = await supabase
      .from("salons")
      .select("name, phone, city")
      .eq("id", salonContext.salonId)
      .maybeSingle();
    const { data, error } = await supabase
      .from("salons")
      .update({
        city: emptyToNull(input.city),
        name: input.name.trim(),
        phone: emptyToNull(input.phone),
      })
      .eq("id", salonContext.salonId)
      .select("id, name, phone, city, plan, created_at")
      .maybeSingle();

    if (error) {
      console.error("Failed to update current salon settings.", error);
      return mutationError(
        "Não foi possível salvar as alterações do salão agora."
      );
    }

    if (!data) {
      return mutationError(SALON_LINK_REQUIRED_MESSAGE);
    }

    await createAuditLog({
      action: "salon_settings_updated",
      entityId: data.id,
      entityType: "salon",
      metadata: {
        changed_fields: getChangedSettingFields(
          previousResult.error ? null : previousResult.data,
          data
        ),
      },
    });

    return {
      message: "Dados do salão atualizados com sucesso.",
      settings: data,
      success: true,
    };
  } catch (error) {
    console.error("Failed to update current salon settings.", error);
    return mutationError(
      "Não foi possível salvar as alterações do salão agora."
    );
  }
}

function createMissingContextResult(
  state: "error" | "local" | "ready" | "unauthenticated" | "unlinked"
): SalonSettingsResult {
  if (state === "unlinked") {
    return {
      settings: null,
      state: "unlinked",
      warningMessage: SALON_LINK_REQUIRED_MESSAGE,
    };
  }

  return settingsError(
    state === "unauthenticated"
      ? "Sessão não encontrada. Faça login novamente."
      : "Não foi possível identificar o salão deste usuário agora."
  );
}

function settingsError(message: string): SalonSettingsResult {
  return {
    settings: null,
    state: "error",
    warningMessage: message,
  };
}

function mutationError(message: string): SettingsMutationResult {
  return {
    message,
    settings: null,
    success: false,
  };
}

function validateSettings(input: UpdateSalonSettingsInput): string | null {
  const name = input.name.trim();
  const phone = input.phone.trim();
  const city = input.city.trim();

  if (name.length < 2 || name.length > 120) {
    return "Informe um nome de salão entre 2 e 120 caracteres.";
  }

  if (phone.length > 40) {
    return "O telefone deve ter no máximo 40 caracteres.";
  }

  if (city.length > 100) {
    return "A cidade deve ter no máximo 100 caracteres.";
  }

  return null;
}

function emptyToNull(value: string): string | null {
  const normalized = value.trim();
  return normalized || null;
}

function getChangedSettingFields(
  previous: Pick<Salon, "city" | "name" | "phone"> | null,
  current: Pick<Salon, "city" | "name" | "phone">
): string[] {
  if (!previous) {
    return ["name", "phone", "city"];
  }

  return (["name", "phone", "city"] as const).filter(
    (field) => previous[field] !== current[field]
  );
}
