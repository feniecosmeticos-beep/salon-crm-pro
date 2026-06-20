import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  MessageCircleMore,
  PackageX,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type OpportunityCardKind =
  | "call_today"
  | "high_risk"
  | "no_home_care"
  | "recovery_potential"
  | "vip_disappearing";

type OpportunityCardConfig = {
  description: string;
  icon: LucideIcon;
  label: string;
  tone: string;
};

const cardConfig: Record<OpportunityCardKind, OpportunityCardConfig> = {
  call_today: {
    description: "Clientes com prioridade de contato neste momento.",
    icon: MessageCircleMore,
    label: "Chamar hoje",
    tone: "bg-info-soft text-info",
  },
  high_risk: {
    description: "Clientes mais próximos de se tornarem inativos.",
    icon: ShieldAlert,
    label: "Alto risco",
    tone: "bg-destructive/10 text-destructive",
  },
  vip_disappearing: {
    description: "Clientes de alto valor sem visita recente.",
    icon: Sparkles,
    label: "VIPs sumindo",
    tone: "bg-vip-soft text-vip",
  },
  no_home_care: {
    description: "Oportunidades para indicação de produtos.",
    icon: PackageX,
    label: "Sem home care",
    tone: "bg-warning-soft text-warning",
  },
  recovery_potential: {
    description: "Receita estimada ao recuperar clientes prioritários.",
    icon: Banknote,
    label: "Potencial de recuperação",
    tone: "bg-success-soft text-success",
  },
};

export function OpportunityCard({
  kind,
  value,
}: {
  kind: OpportunityCardKind;
  value: string;
}) {
  const config = cardConfig[kind];
  const Icon = config.icon;

  return (
    <article className="surface-card min-h-36 p-4 sm:p-5">
      <span
        className={cn(
          "flex size-10 items-center justify-center rounded-lg",
          config.tone
        )}
      >
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <p className="mt-5 text-2xl font-bold tabular-nums">{value}</p>
      <h3 className="mt-1 text-sm font-semibold">{config.label}</h3>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        {config.description}
      </p>
    </article>
  );
}
