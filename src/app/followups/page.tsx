import { RestrictedAccess } from "@/components/auth/restricted-access";
import { FollowupsPage } from "@/features/followups/followups-page";
import type { FollowUpPrefill } from "@/features/followups/followup-form";
import { getClients } from "@/services/clients.service";
import {
  getFollowUps,
  getFollowUpSummary,
} from "@/services/followups.service";
import { canAccessRoute } from "@/services/permissions.service";

export const dynamic = "force-dynamic";

type FollowupsRouteProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: FollowupsRouteProps) {
  if (!(await canAccessRoute("/followups"))) {
    return <RestrictedAccess />;
  }

  const params = await searchParams;
  const [data, summary, clients] = await Promise.all([
    getFollowUps(),
    getFollowUpSummary(),
    getClients(),
  ]);
  const requestedClientId = getStringParam(params.clientId);
  const clientId = clients.some((client) => client.id === requestedClientId)
    ? requestedClientId
    : "";
  const prefill: FollowUpPrefill = {
    clientId,
    suggestedDate: getValidDateParam(params.date) ?? getTodayInSaoPaulo(),
    suggestedMessage: getStringParam(params.message).slice(0, 1200),
    title: getStringParam(params.title).slice(0, 140),
    type: (getStringParam(params.type) || "relacionamento").slice(0, 60),
  };

  return (
    <FollowupsPage
      clients={clients}
      data={data}
      prefill={prefill}
      summary={summary}
    />
  );
}

function getStringParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function getValidDateParam(
  value: string | string[] | undefined
): string | null {
  const date = getStringParam(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

function getTodayInSaoPaulo(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}
