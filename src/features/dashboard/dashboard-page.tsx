import { Suspense } from "react";
import type { ComponentType } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Gem,
  MessageCircleMore,
  Package,
  ReceiptText,
  Scissors,
  TrendingDown,
  UserX,
  Users,
} from "lucide-react";
import { CrmEmptyState } from "@/components/crm/empty-state";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getDashboardData,
  type CommercialPriority,
} from "@/services/dashboard.service";
import { getDashboardOpportunities } from "@/services/opportunities.service";
import { DashboardCharts } from "./dashboard-charts";
import { OpportunitiesSection } from "./opportunities/opportunities-section";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

const numberFormatter = new Intl.NumberFormat("pt-BR");

export function DashboardPage({
  canManageFollowUps,
}: {
  canManageFollowUps: boolean;
}) {
  return (
    <PageShell
      description="Veja rapidamente onde agir para recuperar clientes e gerar novas oportunidades de receita."
      eyebrow="Visão comercial"
      title="Dashboard"
    >
      <Suspense fallback={<DashboardLoading />}>
        <DashboardContent canManageFollowUps={canManageFollowUps} />
      </Suspense>
    </PageShell>
  );
}

async function DashboardContent({
  canManageFollowUps,
}: {
  canManageFollowUps: boolean;
}) {
  const [data, opportunities] = await Promise.all([
    getDashboardData(),
    getDashboardOpportunities(),
  ]);
  const todayCards = [
    {
      accent: "info",
      icon: MessageCircleMore,
      label: "Clientes para chamar hoje",
      value: numberFormatter.format(data.summary.clientsToCallToday),
    },
    {
      accent: "warning",
      icon: TrendingDown,
      label: "Clientes em risco",
      value: numberFormatter.format(data.summary.riskClients),
    },
    {
      accent: "danger",
      icon: UserX,
      label: "Clientes inativos",
      value: numberFormatter.format(data.summary.inactiveClients),
    },
    {
      accent: "vip",
      icon: Gem,
      label: "Clientes VIP",
      value: numberFormatter.format(data.summary.vipClients),
    },
    {
      accent: "success",
      icon: Banknote,
      label: "Potencial de recuperação",
      value: currencyFormatter.format(data.summary.recoveryPotential),
    },
  ] as const;
  const performanceCards = [
    {
      icon: Users,
      label: "Total de clientes",
      value: numberFormatter.format(data.summary.totalClients),
    },
    {
      icon: Banknote,
      label: "Faturamento total",
      value: currencyFormatter.format(data.summary.totalRevenue),
    },
    {
      icon: ReceiptText,
      label: "Ticket médio",
      value: currencyFormatter.format(data.summary.averageTicket),
    },
    {
      icon: Scissors,
      label: "Serviços realizados",
      value: numberFormatter.format(data.summary.servicesPerformed),
    },
    {
      icon: Package,
      label: "Produtos vendidos",
      value: numberFormatter.format(data.summary.productsSold),
    },
  ];

  return (
    <>
      {data.hasWarning ? (
        <div className="flex items-start gap-3 rounded-lg border border-info/20 bg-info-soft px-4 py-3 text-sm text-info">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>{data.warningMessage}</p>
        </div>
      ) : null}

      {data.summary.totalClients === 0 ? (
        <section className="surface-card">
          <CrmEmptyState />
        </section>
      ) : null}

      <section>
        <SectionHeading
          description="A carteira que merece sua atenção imediata."
          title="Hoje no seu salão"
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {todayCards.map((card) => (
            <ActionMetricCard key={card.label} {...card} />
          ))}
        </div>
      </section>

      <OpportunitiesSection
        canManageFollowUps={canManageFollowUps}
        clients={opportunities.clientsToContactToday}
        summary={{
          callToday: opportunities.clientsToContactToday.length,
          highRisk: opportunities.highRiskClients.length,
          noHomeCare: opportunities.clientsWithoutProductOpportunity.length,
          recoveryPotential: opportunities.recoveryPotential,
          vipDisappearing: opportunities.vipClientsAtRisk.length,
        }}
      />

      <section>
        <SectionHeading
          description="Indicadores consolidados da operação."
          title="Performance"
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {performanceCards.map((card) => (
            <PerformanceCard key={card.label} {...card} />
          ))}
        </div>
      </section>

      <section>
        <SectionHeading
          description="Distribuição da carteira, receita e serviços."
          title="Leitura da operação"
        />
        <div className="mt-4">
          <DashboardCharts
            clientsByLevel={data.clientsByLevel}
            clientsByStatus={data.clientsByStatus}
            monthlyRevenue={data.monthlyRevenue}
            topServices={data.topServices}
          />
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between gap-4">
          <SectionHeading
            description="Segmentos que podem virar conversa e faturamento."
            title="Prioridades comerciais"
          />
          <Button asChild className="hidden sm:inline-flex" size="sm" variant="outline">
            <Link href="/clientes">
              Ver clientes
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
        <div className="surface-card mt-4 divide-y overflow-hidden">
          {data.priorities.map((priority) => (
            <PriorityRow key={priority.key} priority={priority} />
          ))}
        </div>
      </section>
    </>
  );
}

function SectionHeading({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div>
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function ActionMetricCard({
  accent,
  icon: Icon,
  label,
  value,
}: {
  accent: "danger" | "info" | "success" | "vip" | "warning";
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
}) {
  const accentClass = {
    danger: "bg-destructive/10 text-destructive",
    info: "bg-info-soft text-info",
    success: "bg-success-soft text-success",
    vip: "bg-vip-soft text-vip",
    warning: "bg-warning-soft text-warning",
  }[accent];

  return (
    <article className="surface-card min-h-36 p-5">
      <span
        className={cn(
          "flex size-10 items-center justify-center rounded-lg",
          accentClass
        )}
      >
        <Icon className="size-5" aria-hidden={true} />
      </span>
      <p className="mt-5 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-sm font-medium text-muted-foreground">{label}</p>
    </article>
  );
}

function PerformanceCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
}) {
  return (
    <article className="surface-card flex min-h-28 items-center gap-4 p-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-5" aria-hidden={true} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xl font-bold">{value}</p>
        <p className="mt-1 text-xs font-medium text-muted-foreground">{label}</p>
      </div>
    </article>
  );
}

function PriorityRow({ priority }: { priority: CommercialPriority }) {
  const tone = {
    inactive: "bg-destructive/10 text-destructive",
    no_products: "bg-info-soft text-info",
    risk: "bg-warning-soft text-warning",
    vip_overdue: "bg-vip-soft text-vip",
  }[priority.key];

  return (
    <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex min-w-0 items-start gap-3">
        <span className={cn("mt-0.5 size-2 shrink-0 rounded-full", tone)} />
        <div>
          <p className="text-sm font-semibold">{priority.label}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {priority.description}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 pl-5 sm:pl-0">
        <span className="text-xl font-bold">{priority.total}</span>
        <Button asChild aria-label={`Ver ${priority.label}`} size="icon" variant="ghost">
          <Link href="/clientes">
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function DashboardLoading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div className="h-36 animate-pulse rounded-lg bg-muted" key={index} />
        ))}
      </div>
      <div className="space-y-4">
        <div className="h-12 w-72 max-w-full animate-pulse rounded-lg bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => (
            <div className="h-36 animate-pulse rounded-lg bg-muted" key={index} />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="h-80 animate-pulse rounded-lg bg-muted" key={index} />
        ))}
      </div>
    </div>
  );
}
