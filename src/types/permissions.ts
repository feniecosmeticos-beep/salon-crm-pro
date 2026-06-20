export const APP_ROLES = [
  "admin",
  "gerente",
  "atendimento",
  "leitura",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const PERMISSIONS = [
  "view_dashboard",
  "view_clients",
  "view_client_profile",
  "import_avec",
  "use_campaigns",
  "manage_followups",
  "view_reports",
  "manage_settings",
  "manage_team_users",
] as const;

export type Permission = (typeof PERMISSIONS)[number];
