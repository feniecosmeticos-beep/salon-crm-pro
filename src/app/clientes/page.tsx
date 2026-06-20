import { RestrictedAccess } from "@/components/auth/restricted-access";
import { ClientsPage } from "@/features/clients/clients-page";
import { canAccessRoute } from "@/services/permissions.service";

export default async function Page() {
  if (!(await canAccessRoute("/clientes"))) {
    return <RestrictedAccess />;
  }

  return <ClientsPage />;
}
