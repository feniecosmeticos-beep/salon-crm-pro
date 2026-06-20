import "server-only";

import { cache } from "react";
import { getCurrentAppUser } from "@/services/team-users.service";
import {
  hasSupabasePublicConfig,
  hasSupabaseServerConfig,
} from "@/services/supabase-config";
import type { AppRole, Permission } from "@/types/permissions";

const ROLE_PERMISSIONS: Record<AppRole, readonly Permission[]> = {
  admin: [
    "view_dashboard",
    "view_clients",
    "view_client_profile",
    "import_avec",
    "use_campaigns",
    "manage_followups",
    "view_reports",
    "manage_settings",
    "manage_team_users",
  ],
  gerente: [
    "view_dashboard",
    "view_clients",
    "view_client_profile",
    "import_avec",
    "use_campaigns",
    "manage_followups",
    "view_reports",
  ],
  atendimento: [
    "view_dashboard",
    "view_clients",
    "view_client_profile",
    "use_campaigns",
    "manage_followups",
  ],
  leitura: ["view_dashboard", "view_clients", "view_client_profile"],
};

const ROUTE_PERMISSIONS: Array<{
  matches: (route: string) => boolean;
  permission: Permission;
}> = [
  {
    matches: (route) => route.startsWith("/clientes/"),
    permission: "view_client_profile",
  },
  {
    matches: (route) => route === "/clientes",
    permission: "view_clients",
  },
  {
    matches: (route) => route === "/importacao",
    permission: "import_avec",
  },
  {
    matches: (route) => route === "/campanhas",
    permission: "use_campaigns",
  },
  {
    matches: (route) =>
      route === "/followups" || route === "/follow-ups",
    permission: "manage_followups",
  },
  {
    matches: (route) => route === "/relatorios",
    permission: "view_reports",
  },
  {
    matches: (route) => route === "/configuracoes",
    permission: "manage_settings",
  },
  {
    matches: (route) => route === "/",
    permission: "view_dashboard",
  },
];

export const getCurrentUserRole = cache(
  async (): Promise<AppRole | null> => {
    if (!hasSupabasePublicConfig() || !hasSupabaseServerConfig()) {
      return "admin";
    }

    const currentUser = await getCurrentAppUser();
    return currentUser?.role ?? null;
  }
);

export const getCurrentUserPermissions = cache(
  async (): Promise<Permission[]> => {
    const role = await getCurrentUserRole();
    return role ? [...ROLE_PERMISSIONS[role]] : [];
  }
);

export async function canAccessRoute(route: string): Promise<boolean> {
  const normalizedRoute = normalizeRoute(route);
  const routePermission = ROUTE_PERMISSIONS.find(({ matches }) =>
    matches(normalizedRoute)
  )?.permission;

  return routePermission ? requirePermission(routePermission) : true;
}

export async function requirePermission(
  permission: Permission
): Promise<boolean> {
  const permissions = await getCurrentUserPermissions();
  return permissions.includes(permission);
}

function normalizeRoute(route: string): string {
  const pathname = route.split(/[?#]/, 1)[0] || "/";
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

export type { AppRole, Permission } from "@/types/permissions";
