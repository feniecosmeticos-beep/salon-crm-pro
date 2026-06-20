import {
  CalendarDays,
  CircleDollarSign,
  Clock3,
  ReceiptText,
  Scissors,
  ShoppingBag,
} from "lucide-react";
import type { ClientMetrics } from "@/types/database";
import { formatCurrency, formatDate } from "./client-profile-formatters";

export function ClientProfileMetrics({
  metrics,
}: {
  metrics: ClientMetrics | null;
}) {
  const items = [
    {
      icon: CircleDollarSign,
      label: "Total gasto",
      value: formatCurrency(metrics?.total_spent ?? 0),
    },
    {
      icon: ReceiptText,
      label: "Ticket médio",
      value: formatCurrency(metrics?.average_ticket ?? 0),
    },
    {
      icon: Scissors,
      label: "Número de visitas",
      value: String(metrics?.total_visits ?? 0),
    },
    {
      icon: CalendarDays,
      label: "Última visita",
      value: formatDate(metrics?.last_visit ?? null),
    },
    {
      icon: Clock3,
      label: "Dias sem visita",
      value: String(metrics?.days_without_visit ?? 0),
    },
    {
      icon: ShoppingBag,
      label: "Compra produtos",
      value: metrics?.buys_products ? "Sim" : "Não",
    },
  ];

  return (
    <section aria-labelledby="client-profile-metrics-title">
      <div>
        <h2 className="text-base font-bold" id="client-profile-metrics-title">
          Indicadores principais
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Resumo do relacionamento e valor deste cliente.
        </p>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <article className="surface-card min-h-28 p-4" key={item.label}>
              <span className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <p className="mt-4 text-lg font-bold">{item.value}</p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                {item.label}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
