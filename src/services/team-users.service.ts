import "server-only";

import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/services/audit.service";
import { getAuthenticatedUser } from "@/services/auth.service";
import {
  getCurrentSalonContext,
  SALON_LINK_REQUIRED_MESSAGE,
} from "@/services/salon-context";
import {
  hasSupabasePublicConfig,
  hasSupabaseServerConfig,
} from "@/services/supabase-config";
import type { AppUser } from "@/types/database";

export const TEAM_USER_ROLES = [
  "admin",
  "gerente",
  "atendimento",
  "leitura",
] as const;

export type TeamUserRole = (typeof TEAM_USER_ROLES)[number];

export type TeamUser = Pick<
  AppUser,
  "created_at" | "email" | "id" | "name"
> & {
  role: TeamUserRole;
};

export type TeamUsersDataState =
  | "error"
  | "ready"
  | "unconfigured"
  | "unlinked";

export type TeamUsersResult = {
  currentUser: TeamUser | null;
  state: TeamUsersDataState;
  users: TeamUser[];
  warningMessage: string | null;
};

export type TeamUsersSummary = {
  admins: number;
  attendants: number;
  managers: number;
  readers: number;
  total: number;
};

export type TeamUserMutationResult = {
  message: string;
  success: boolean;
  user: TeamUser | null;
};

const SUPABASE_UNCONFIGURED_MESSAGE =
  "Supabase ainda não está configurado neste ambiente.";
const ADMIN_REQUIRED_MESSAGE =
  "Somente administradores podem alterar funções.";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const getTeamUsersSnapshot = cache(async (): Promise<TeamUsersResult> => {
  if (!hasSupabasePublicConfig() || !hasSupabaseServerConfig()) {
    return {
      currentUser: null,
      state: "unconfigured",
      users: [],
      warningMessage: SUPABASE_UNCONFIGURED_MESSAGE,
    };
  }

  const [salonContext, authUser] = await Promise.all([
    getCurrentSalonContext(),
    getAuthenticatedUser(),
  ]);

  if (!salonContext.salonId) {
    return createMissingContextResult(salonContext.state);
  }

  if (!authUser) {
    return teamError("Sessão não encontrada. Faça login novamente.");
  }

  try {
    const { data, error } = await createSupabaseServerClient()
      .from("users")
      .select("id, name, email, role, created_at")
      .eq("salon_id", salonContext.salonId)
      .order("name", { ascending: true });

    if (error) {
      console.error("Failed to fetch team users.", error);
      return teamError("Não foi possível carregar os usuários internos.");
    }

    const rows = data ?? [];
    const users = rows.map(toTeamUser);

    if (users.length === 0) {
      return {
        currentUser: null,
        state: "ready",
        users: [],
        warningMessage: null,
      };
    }

    const currentUser = resolveCurrentAppUser(rows, authUser);

    if (!currentUser) {
      return {
        currentUser: null,
        state: "error",
        users,
        warningMessage:
          "Não foi possível identificar o usuário interno atual.",
      };
    }

    return {
      currentUser,
      state: "ready",
      users,
      warningMessage: null,
    };
  } catch (error) {
    console.error("Failed to fetch team users.", error);
    return teamError("Não foi possível carregar os usuários internos.");
  }
});

export async function getTeamUsers(): Promise<TeamUsersResult> {
  return getTeamUsersSnapshot();
}

export async function getCurrentAppUser(): Promise<TeamUser | null> {
  const result = await getTeamUsersSnapshot();
  return result.currentUser;
}

export async function getTeamUsersSummary(): Promise<TeamUsersSummary> {
  const result = await getTeamUsersSnapshot();

  return result.users.reduce<TeamUsersSummary>(
    (summary, user) => {
      summary.total += 1;

      if (user.role === "admin") {
        summary.admins += 1;
      } else if (user.role === "gerente") {
        summary.managers += 1;
      } else if (user.role === "atendimento") {
        summary.attendants += 1;
      } else {
        summary.readers += 1;
      }

      return summary;
    },
    {
      admins: 0,
      attendants: 0,
      managers: 0,
      readers: 0,
      total: 0,
    }
  );
}

export async function updateTeamUserRole(
  userId: string,
  role: string
): Promise<TeamUserMutationResult> {
  if (!hasSupabasePublicConfig() || !hasSupabaseServerConfig()) {
    return mutationError(SUPABASE_UNCONFIGURED_MESSAGE);
  }

  const normalizedUserId = userId.trim();

  if (!UUID_PATTERN.test(normalizedUserId)) {
    return mutationError("Usuário inválido.");
  }

  if (!isTeamUserRole(role)) {
    return mutationError("Função de usuário inválida.");
  }

  const [salonContext, teamData] = await Promise.all([
    getCurrentSalonContext(),
    getTeamUsersSnapshot(),
  ]);
  const currentUser = teamData.currentUser;
  const targetUser = teamData.users.find(
    (user) => user.id === normalizedUserId
  );

  if (!salonContext.salonId) {
    return mutationError(
      salonContext.state === "unlinked"
        ? SALON_LINK_REQUIRED_MESSAGE
        : "Não foi possível identificar o salão deste usuário agora."
    );
  }

  if (!currentUser) {
    return mutationError(
      "Não foi possível identificar o usuário interno atual."
    );
  }

  if (currentUser.role !== "admin") {
    await createAuditLog({
      action: "permission_denied",
      entityId: normalizedUserId,
      entityType: "user",
      metadata: {
        area: "usuarios_internos",
        attempted_action: "update_team_user_role",
        permission: "manage_team_users",
      },
    });

    return mutationError(ADMIN_REQUIRED_MESSAGE);
  }

  try {
    const { data, error } = await createSupabaseServerClient()
      .from("users")
      .update({ role })
      .eq("id", normalizedUserId)
      .eq("salon_id", salonContext.salonId)
      .select("id, name, email, role, created_at")
      .maybeSingle();

    if (error) {
      console.error("Failed to update team user role.", error);
      return mutationError("Não foi possível atualizar a função agora.");
    }

    if (!data) {
      return mutationError("Usuário não encontrado neste salão.");
    }

    await createAuditLog({
      action: "team_user_role_updated",
      entityId: normalizedUserId,
      entityType: "user",
      metadata: {
        new_role: role,
        old_role: targetUser?.role ?? null,
        target_user_id: normalizedUserId,
      },
    });

    return {
      message: "Função atualizada com sucesso.",
      success: true,
      user: toTeamUser(data),
    };
  } catch (error) {
    console.error("Failed to update team user role.", error);
    return mutationError("Não foi possível atualizar a função agora.");
  }
}

function resolveCurrentAppUser(
  users: Array<
    Pick<AppUser, "created_at" | "email" | "id" | "name" | "role">
  >,
  authUser: { email?: string | null; id: string }
): TeamUser | null {
  const idMatch = users.find((user) => user.id === authUser.id);

  if (idMatch) {
    return toTeamUser(idMatch);
  }

  const email = authUser.email?.trim().toLowerCase();

  if (!email) {
    return null;
  }

  const emailMatches = users.filter(
    (user) => user.email.trim().toLowerCase() === email
  );

  return emailMatches.length === 1 ? toTeamUser(emailMatches[0]) : null;
}

function toTeamUser(
  user: Pick<AppUser, "created_at" | "email" | "id" | "name" | "role">
): TeamUser {
  return {
    created_at: user.created_at,
    email: user.email,
    id: user.id,
    name: user.name,
    role: normalizeTeamUserRole(user.role),
  };
}

function normalizeTeamUserRole(role: string | null): TeamUserRole {
  if (role === "manager") {
    return "gerente";
  }

  return isTeamUserRole(role) ? role : "leitura";
}

function isTeamUserRole(role: string | null): role is TeamUserRole {
  return TEAM_USER_ROLES.some((allowedRole) => allowedRole === role);
}

function createMissingContextResult(
  state: "error" | "local" | "ready" | "unauthenticated" | "unlinked"
): TeamUsersResult {
  if (state === "unlinked") {
    return {
      currentUser: null,
      state: "unlinked",
      users: [],
      warningMessage: SALON_LINK_REQUIRED_MESSAGE,
    };
  }

  return teamError(
    state === "unauthenticated"
      ? "Sessão não encontrada. Faça login novamente."
      : "Não foi possível identificar o salão deste usuário agora."
  );
}

function teamError(message: string): TeamUsersResult {
  return {
    currentUser: null,
    state: "error",
    users: [],
    warningMessage: message,
  };
}

function mutationError(message: string): TeamUserMutationResult {
  return {
    message,
    success: false,
    user: null,
  };
}
