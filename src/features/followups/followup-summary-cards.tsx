import {
  CalendarCheck2,
  CalendarClock,
  CircleCheckBig,
  TriangleAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FollowUpSummary } from "@/services/followups.service";

export function FollowUpSummaryCards({
  summary,
}: {
  summary: FollowUpSummary;
}) {
  const cards: Array<{
    icon: LucideIcon;
    label: string;
    tone: "danger" | "info" | "success" | "warning";
    value: number;
  }> = [
    {
      icon: CalendarCheck2,
      label: "Total",
      tone: "info",
      value: summary.total,
    },
    {
      icon: CalendarClock,
      label: "Pendentes",
      tone: "warning",
      value: summary.pending,
    },
    {
      icon: CircleCheckBig,
      label: "Concluídos",
      tone: "success",
      value: summary.completed,
    },
    {
      icon: TriangleAlert,
      label: "Atrasados",
      tone: "danger",
      value: summary.overdue,
    },
  ];

  return (
    <section
      aria-label="Resumo dos follow-ups"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {cards.map((card) => (
        <SummaryCard key={card.label} {...card} />
      ))}
    </section>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  tone,
  value,
}: {
  icon: LucideIcon;
  label: string;
  tone: "danger" | "info" | "success" | "warning";
  value: number;
}) {
  const toneClass = {
    danger: "bg-destructive/10 text-destructive",
    info: "bg-info-soft text-info",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
  }[tone];

  return (
    <article className="surface-card flex min-h-28 items-center gap-4 p-4 sm:p-5">
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          toneClass
        )}
      >
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="mt-1 text-sm font-medium text-muted-foreground">
          {label}
        </p>
      </div>
    </article>
  );
}
