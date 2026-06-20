import { RestrictedAccess } from "@/components/auth/restricted-access";
import { SettingsPage } from "@/features/settings/settings-page";
import { getRecentAuditLogs } from "@/services/audit.service";
import { canAccessRoute } from "@/services/permissions.service";
import { getCurrentSalonSettings } from "@/services/settings.service";
import {
  getTeamUsers,
  getTeamUsersSummary,
} from "@/services/team-users.service";

export const dynamic = "force-dynamic";

export default async function Page() {
  if (!(await canAccessRoute("/configuracoes"))) {
    return <RestrictedAccess />;
  }

  const [auditData, data, teamData, teamSummary] = await Promise.all([
    getRecentAuditLogs(),
    getCurrentSalonSettings(),
    getTeamUsers(),
    getTeamUsersSummary(),
  ]);

  return (
    <SettingsPage
      auditData={auditData}
      data={data}
      teamData={teamData}
      teamSummary={teamSummary}
    />
  );
}
