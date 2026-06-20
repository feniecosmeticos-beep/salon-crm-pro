import { RestrictedAccess } from "@/components/auth/restricted-access";
import { ReportsPage } from "@/features/reports/reports-page";
import { canAccessRoute } from "@/services/permissions.service";
import {
  getFollowUpsByType,
  getOverdueFollowUps,
  getProductivitySummary,
  getRecentCompletedFollowUps,
  getTodayFollowUps,
} from "@/services/productivity.service";

export const dynamic = "force-dynamic";

export default async function Page() {
  if (!(await canAccessRoute("/relatorios"))) {
    return <RestrictedAccess />;
  }

  const [summary, today, overdue, completed, followUpsByType] =
    await Promise.all([
      getProductivitySummary(),
      getTodayFollowUps(),
      getOverdueFollowUps(),
      getRecentCompletedFollowUps(),
      getFollowUpsByType(),
    ]);

  return (
    <ReportsPage
      completed={completed}
      followUpsByType={followUpsByType}
      overdue={overdue}
      summary={summary}
      today={today}
    />
  );
}
