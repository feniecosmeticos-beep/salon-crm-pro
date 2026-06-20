import { RestrictedAccess } from "@/components/auth/restricted-access";
import { ClientProfilePage } from "@/features/clients/profile/client-profile-page";
import { getClientProfile } from "@/services/client-profile.service";
import {
  canAccessRoute,
  getCurrentUserPermissions,
} from "@/services/permissions.service";

type ClientProfilePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ClientProfileRoute({
  params,
}: ClientProfilePageProps) {
  const { id } = await params;
  const [canAccess, permissions] = await Promise.all([
    canAccessRoute(`/clientes/${id}`),
    getCurrentUserPermissions(),
  ]);

  if (!canAccess) {
    return <RestrictedAccess />;
  }

  const profile = await getClientProfile(id);

  return (
    <ClientProfilePage
      canManageFollowUps={permissions.includes("manage_followups")}
      profile={profile}
    />
  );
}
