import { RestrictedAccess } from "@/components/auth/restricted-access";
import { CampaignsPage } from "@/features/campaigns/campaigns-page";
import { getCampaignSegments } from "@/services/campaigns.service";
import { canAccessRoute } from "@/services/permissions.service";

export const dynamic = "force-dynamic";

export default async function Page() {
  if (!(await canAccessRoute("/campanhas"))) {
    return <RestrictedAccess />;
  }

  const data = await getCampaignSegments();

  return <CampaignsPage data={data} />;
}
