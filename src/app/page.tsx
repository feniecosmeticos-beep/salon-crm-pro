import { RestrictedAccess } from "@/components/auth/restricted-access";
import { DashboardPage } from "@/features/dashboard/dashboard-page";
import {
  canAccessRoute,
  getCurrentUserPermissions,
} from "@/services/permissions.service";

export default async function Home() {
  const [canAccess, permissions] = await Promise.all([
    canAccessRoute("/"),
    getCurrentUserPermissions(),
  ]);

  if (!canAccess) {
    return <RestrictedAccess />;
  }

  return (
    <DashboardPage
      canManageFollowUps={permissions.includes("manage_followups")}
    />
  );
}
