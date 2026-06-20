import { RestrictedAccess } from "@/components/auth/restricted-access";
import { ImportsPage } from "@/features/imports/imports-page";
import { canAccessRoute } from "@/services/permissions.service";

export default async function Page() {
  if (!(await canAccessRoute("/importacao"))) {
    return <RestrictedAccess />;
  }

  return <ImportsPage />;
}
