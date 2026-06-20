import {
  CalendarClock,
  CheckCircle2,
  Gauge,
  ListTodo,
  TriangleAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductivitySummary } from "@/services/productivity.service";

export function ProductivitySummaryCards({
  summary,
}: {
  summary: ProductivitySummary;
}) {
  const cards: Array<{
    icon: LucideIcon;
    label: string;
    tone: "danger" | "info" | "success" | "vip" | "warning";
    value: string;
  }> = [
    {
      icon: ListTodo,
      label: "Follow-ups pendentes",
      tone: "warning",
      value: String(summary.pending),
    },
    {
      icon: CheckCircle2,
      label: "Follow-ups concluídos",
      tone: "success",
      value: String(summary.completed),
    },
    {
      icon: TriangleAlert,
      label: "Follow-ups atrasados",
      tone: "danger",
      value: String(summary.overdue),
    },
    {
      icon: CalendarClock,
      label: "Tarefas para hoje",
      tone: "info",
      value: String(summary.tasksToday),
    },
    {
      icon: Gauge,
      label: "Taxa de conclusão",
      tone: "vip",
      value: percentageFormatter.format(summary.completionRate / 100),
    },
  ];

  return (
    <section
      aria-label="Resumo da produtividade"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
    >
      {cards.map((card) => (
        <SummaryCard key={card.label} {...card} />
      ))}
    </section>
  );
}

const percentageFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
  style: "percent",
});

function SummaryCard({
  icon: Icon,
  label,
  tone,
  value,
}: {
  icon: LucideIcon;
  label: string;
  tone: "danger" | "info" | "success" | "vip" | "warning";
  value: string;
}) {
  const toneClass = {
    danger: "bg-destructive/10 text-destructive",
    info: "bg-info-soft text-info",
    success: "bg-success-soft text-success",
    vip: "bg-vip-soft text-vip",
    warning: "bg-warning-soft text-warning",
  }[tone];

  return (
    <article className="surface-card min-h-36 p-5">
      <span
        className={cn(
          "flex size-10 items-center justify-center rounded-lg",
          toneClass
        )}
      >
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <p className="mt-5 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-sm font-medium text-muted-foreground">{label}</p>
    </article>
  );
}
