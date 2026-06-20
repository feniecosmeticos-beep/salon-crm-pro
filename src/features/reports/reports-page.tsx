import Link from "next/link";
import { AlertTriangle, CalendarPlus, DatabaseZap } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import type {
  FollowUpsByTypeItem,
  OverdueFollowUp,
  ProductivityFollowUp,
  ProductivitySummary,
} from "@/services/productivity.service";
import { CompletedFollowUps } from "./completed-followups";
import { FollowUpsByType } from "./followups-by-type";
import { OverdueFollowUps } from "./overdue-followups";
import { ProductivitySummaryCards } from "./productivity-summary-cards";
import { TodayFollowUps } from "./today-followups";

export function ReportsPage({
  completed,
  followUpsByType,
  overdue,
  summary,
  today,
}: {
  completed: ProductivityFollowUp[];
  followUpsByType: FollowUpsByTypeItem[];
  overdue: OverdueFollowUp[];
  summary: ProductivitySummary;
  today: ProductivityFollowUp[];
}) {
  return (
    <PageShell
      actions={
        <Button asChild size="sm" variant="outline">
          <Link href="/followups">
            <CalendarPlus className="size-4" aria-hidden="true" />
            Gerenciar Follow-ups
          </Link>
        </Button>
      }
      description="Acompanhe o ritmo da equipe, as prioridades do dia e a evolução das ações comerciais."
      eyebrow="Desempenho comercial"
      title="Produtividade Comercial"
    >
      {summary.warningMessage ? (
        <ProductivityWarning
          message={summary.warningMessage}
          state={summary.state}
        />
      ) : null}

      {summary.total === 0 ? (
        <ProductivityEmptyState />
      ) : (
        <>
          <ProductivitySummaryCards summary={summary} />

          <div className="grid items-start gap-6 2xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
            <TodayFollowUps followUps={today} />
            <OverdueFollowUps followUps={overdue} />
          </div>

          <div className="grid items-start gap-6 xl:grid-cols-2">
            <CompletedFollowUps followUps={completed} />
            <FollowUpsByType
              items={followUpsByType}
              total={summary.total}
            />
          </div>
        </>
      )}
    </PageShell>
  );
}

function ProductivityWarning({
  message,
  state,
}: {
  message: string;
  state: ProductivitySummary["state"];
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
            : "Produtividade parcialmente indisponível"}
        </p>
        <p className="mt-1">{message}</p>
      </div>
    </div>
  );
}

function ProductivityEmptyState() {
  return (
    <section className="surface-card flex min-h-72 flex-col items-center justify-center px-5 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        <CalendarPlus className="size-5" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-base font-semibold">
        Comece a acompanhar sua rotina comercial
      </h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        Crie seus primeiros follow-ups para acompanhar a rotina comercial do
        salão.
      </p>
      <Button asChild className="mt-5" size="sm">
        <Link href="/followups">
          <CalendarPlus className="size-4" aria-hidden="true" />
          Criar Follow-up
        </Link>
      </Button>
    </section>
  );
}
