import {
  BookOpen,
  BriefcaseBusiness,
  Headphones,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { TeamUsersSummary } from "@/services/team-users.service";

const summaryItems = [
  {
    icon: Users,
    key: "total",
    label: "Total de usuários",
    tone: "bg-accent text-accent-foreground",
  },
  {
    icon: ShieldCheck,
    key: "admins",
    label: "Admins",
    tone: "bg-success-soft text-success",
  },
  {
    icon: BriefcaseBusiness,
    key: "managers",
    label: "Gerentes",
    tone: "bg-info-soft text-info",
  },
  {
    icon: Headphones,
    key: "attendants",
    label: "Atendimentos",
    tone: "bg-warning-soft text-warning",
  },
  {
    icon: BookOpen,
    key: "readers",
    label: "Leitura",
    tone: "bg-muted text-muted-foreground",
  },
] as const;

export function TeamUsersSummaryCards({
  summary,
}: {
  summary: TeamUsersSummary;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {summaryItems.map((item) => {
        const Icon = item.icon;

        return (
          <article
            className="surface-card flex min-h-24 items-center gap-3 p-4"
            key={item.key}
          >
            <span
              className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${item.tone}`}
            >
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xl font-bold">{summary[item.key]}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {item.label}
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
