import {
  OpportunityCard,
  type OpportunityCardKind,
} from "./opportunity-card";
import {
  OpportunityClientList,
  type OpportunityClient,
} from "./opportunity-client-list";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

const numberFormatter = new Intl.NumberFormat("pt-BR");

export type OpportunitiesSummary = {
  callToday: number;
  highRisk: number;
  noHomeCare: number;
  recoveryPotential: number;
  vipDisappearing: number;
};

export type OpportunitiesSectionProps = {
  canManageFollowUps: boolean;
  clients: OpportunityClient[];
  summary: OpportunitiesSummary;
};

export function OpportunitiesSection({
  canManageFollowUps,
  clients,
  summary,
}: OpportunitiesSectionProps) {
  const cards: Array<{ kind: OpportunityCardKind; value: string }> = [
    {
      kind: "call_today",
      value: numberFormatter.format(summary.callToday),
    },
    {
      kind: "high_risk",
      value: numberFormatter.format(summary.highRisk),
    },
    {
      kind: "vip_disappearing",
      value: numberFormatter.format(summary.vipDisappearing),
    },
    {
      kind: "no_home_care",
      value: numberFormatter.format(summary.noHomeCare),
    },
    {
      kind: "recovery_potential",
      value: currencyFormatter.format(summary.recoveryPotential),
    },
  ];

  return (
    <section
      aria-labelledby="opportunities-section-title"
      className="flex flex-col gap-5"
    >
      <header>
        <p className="text-xs font-semibold uppercase text-primary">
          Ação comercial
        </p>
        <h2
          className="mt-1 text-lg font-bold"
          id="opportunities-section-title"
        >
          Central de Oportunidades
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Clientes que merecem atenção agora para recuperar faturamento.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <OpportunityCard key={card.kind} {...card} />
        ))}
      </div>

      <OpportunityClientList
        canManageFollowUps={canManageFollowUps}
        clients={clients}
      />
    </section>
  );
}

export type { OpportunityClient } from "./opportunity-client-list";
export type { OpportunityReason } from "./opportunity-client-list";
