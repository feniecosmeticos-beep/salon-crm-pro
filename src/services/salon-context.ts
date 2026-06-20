import "server-only";

import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/services/auth.service";
import {
  hasSupabasePublicConfig,
  hasSupabaseServerConfig,
} from "@/services/supabase-config";

const DEVELOPMENT_SALON_ID = "11111111-1111-4111-8111-111111111111";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const SALON_LINK_REQUIRED_MESSAGE =
  "Usuário sem salão vinculado. Verifique o cadastro interno.";

export type SalonContext = {
  salonId: string | null;
  state: "error" | "local" | "ready" | "unauthenticated" | "unlinked";
  warningMessage: string | null;
};

export const getCurrentSalonContext = cache(
  async (): Promise<SalonContext> => {
    if (!hasSupabasePublicConfig() || !hasSupabaseServerConfig()) {
      return {
        salonId: getLocalFallbackSalonId(),
        state: "local",
        warningMessage: null,
      };
    }

    const authUser = await getAuthenticatedUser();

    if (!authUser) {
      return {
        salonId: null,
        state: "unauthenticated",
        warningMessage: null,
      };
    }

    try {
      const supabase = createSupabaseServerClient();
      const idResult = await supabase
        .from("users")
        .select("id, email, salon_id")
        .eq("id", authUser.id)
        .maybeSingle();

      if (idResult.error) {
        return createContextError();
      }

      if (idResult.data?.salon_id) {
        return {
          salonId: idResult.data.salon_id,
          state: "ready",
          warningMessage: null,
        };
      }

      const email = authUser.email?.trim().toLowerCase();

      if (!email) {
        return createUnlinkedContext();
      }

      const emailResult = await supabase
        .from("users")
        .select("id, email, salon_id")
        .eq("email", email)
        .limit(2);

      if (emailResult.error) {
        return createContextError();
      }

      const matches = emailResult.data ?? [];

      if (matches.length !== 1 || !matches[0].salon_id) {
        return createUnlinkedContext();
      }

      return {
        salonId: matches[0].salon_id,
        state: "ready",
        warningMessage: null,
      };
    } catch {
      return createContextError();
    }
  }
);

export async function getCurrentSalonId(): Promise<string | null> {
  const context = await getCurrentSalonContext();
  return context.salonId;
}

function getLocalFallbackSalonId(): string {
  const configuredSalonId = process.env.SALON_ID?.trim();

  if (configuredSalonId && UUID_PATTERN.test(configuredSalonId)) {
    return configuredSalonId;
  }

  return DEVELOPMENT_SALON_ID;
}

function createUnlinkedContext(): SalonContext {
  return {
    salonId: null,
    state: "unlinked",
    warningMessage: SALON_LINK_REQUIRED_MESSAGE,
  };
}

function createContextError(): SalonContext {
  return {
    salonId: null,
    state: "error",
    warningMessage:
      "Não foi possível identificar o salão deste usuário agora.",
  };
}
