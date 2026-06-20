import {
  CakeSlice,
  Gem,
  PackageCheck,
  RefreshCcw,
  RotateCcw,
  Shapes,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  FollowUpsByTypeItem,
  FollowUpTypeKey,
} from "@/services/productivity.service";

const typeContent: Record<
  FollowUpTypeKey,
  { icon: LucideIcon; tone: string }
> = {
  birthday: {
    icon: CakeSlice,
    tone: "bg-vip-soft text-vip",
  },
  home_care: {
    icon: PackageCheck,
    tone: "bg-info-soft text-info",
  },
  other: {
    icon: Shapes,
    tone: "bg-muted text-muted-foreground",
  },
  reactivation: {
    icon: RefreshCcw,
    tone: "bg-warning-soft text-warning",
  },
  return: {
    icon: RotateCcw,
    tone: "bg-success-soft text-success",
  },
  vip: {
    icon: Gem,
    tone: "bg-gold-soft text-gold",
  },
};

export function FollowUpsByType({
  items,
  total,
}: {
  items: FollowUpsByTypeItem[];
  total: number;
}) {
  return (
    <section className="surface-card overflow-hidden">
      <div className="border-b px-5 py-4">
        <h2 className="text-base font-bold">Distribuição por tipo</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Como a rotina comercial está distribuída entre as principais ações.
        </p>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
        {items.map((item) => {
          const content = typeContent[item.key];
          const Icon = content.icon;
          const percentage = total > 0 ? (item.total / total) * 100 : 0;

          return (
            <article className="rounded-lg border bg-background p-4" key={item.key}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg",
                      content.tone
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <p className="truncate text-sm font-semibold">{item.label}</p>
                </div>
                <span className="text-lg font-bold">{item.total}</span>
              </div>
              <div
                aria-label={`${percentageFormatter.format(percentage / 100)} dos follow-ups`}
                className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={Math.round(percentage)}
              >
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

const percentageFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
  style: "percent",
});
