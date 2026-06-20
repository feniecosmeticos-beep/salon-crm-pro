import { AlertTriangle, CalendarPlus, DatabaseZap } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import type {
  FollowUpsResult,
  FollowUpSummary,
} from "@/services/followups.service";
import type { Client } from "@/types/database";
import { FollowUpForm, type FollowUpPrefill } from "./followup-form";
import { FollowUpList } from "./followup-list";
import { FollowUpSummaryCards } from "./followup-summary-cards";

export function FollowupsPage({
  clients,
  data,
  prefill,
  summary,
}: {
  clients: Client[];
  data: FollowUpsResult;
  prefill: FollowUpPrefill;
  summary: FollowUpSummary;
}) {
  return (
    <PageShell
      actions={
        <Button asChild size="sm">
          <a href="#novo-followup">
            <CalendarPlus className="size-4" aria-hidden="true" />
            Novo Follow-up
          </a>
        </Button>
      }
      description="Organize contatos e ações comerciais para não deixar nenhuma oportunidade passar."
      eyebrow="Rotina comercial"
      title="Central de Follow-ups"
    >
      {data.warningMessage ? (
        <FollowUpWarning message={data.warningMessage} state={data.state} />
      ) : null}

      <FollowUpSummaryCards summary={summary} />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="order-last min-w-0 xl:order-first">
          <FollowUpList followUps={data.followUps} />
        </div>
        <aside className="order-first xl:order-last xl:sticky xl:top-6">
          <FollowUpForm
            clients={clients}
            disabled={data.state === "unconfigured"}
            prefill={prefill}
          />
        </aside>
      </div>
    </PageShell>
  );
}

function FollowUpWarning({
  message,
  state,
}: {
  message: string;
  state: FollowUpsResult["state"];
}) {
  const Icon = state === "unconfigured" ? DatabaseZap : AlertTriangle;

  return (
    <div
      className="flex items-start gap-3 rounded-lg border border-info/20 bg-info-soft px-4 py-3 text-sm text-info"
      role="status"
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-semibold">
          {state === "unconfigured"
            ? "Dados ainda não conectados"
            : "Follow-ups parcialmente indisponíveis"}
        </p>
        <p className="mt-1">{message}</p>
      </div>
    </div>
  );
}
