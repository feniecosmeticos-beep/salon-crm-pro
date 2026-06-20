"use client";

import type { ReactNode } from "react";
import { BarChart3 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  ClientsByLevel,
  ClientsByStatus,
  MonthlyRevenue,
  TopService,
} from "@/services/dashboard.service";

type DashboardChartsProps = {
  clientsByLevel: ClientsByLevel[];
  clientsByStatus: ClientsByStatus[];
  monthlyRevenue: MonthlyRevenue[];
  topServices: TopService[];
};

const STATUS_COLORS = [
  "var(--info)",
  "var(--success)",
  "var(--warning)",
  "var(--destructive)",
  "var(--muted-foreground)",
];

const LEVEL_COLORS = [
  "var(--vip)",
  "var(--gold)",
  "oklch(0.62 0.02 250)",
  "oklch(0.62 0.1 55)",
];

const tooltipStyle = {
  border: "1px solid var(--border)",
  borderRadius: "8px",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
  fontSize: "12px",
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

export function DashboardCharts({
  clientsByLevel,
  clientsByStatus,
  monthlyRevenue,
  topServices,
}: DashboardChartsProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartPanel title="Clientes por status" isEmpty={!hasTotals(clientsByStatus)}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={clientsByStatus}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="status"
              fontSize={11}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              fontSize={11}
              tickLine={false}
              width={28}
            />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
            <Bar dataKey="total" radius={[5, 5, 0, 0]}>
              {clientsByStatus.map((entry, index) => (
                <Cell
                  fill={STATUS_COLORS[index % STATUS_COLORS.length]}
                  key={entry.status}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Clientes por nível" isEmpty={!hasTotals(clientsByLevel)}>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={clientsByLevel}
              dataKey="total"
              innerRadius={56}
              nameKey="level"
              outerRadius={92}
              paddingAngle={2}
            >
              {clientsByLevel.map((entry, index) => (
                <Cell
                  key={entry.level}
                  fill={LEVEL_COLORS[index % LEVEL_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend iconSize={8} />
          </PieChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Faturamento por mês" isEmpty={monthlyRevenue.length === 0}>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={monthlyRevenue}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="month"
              fontSize={11}
              tickLine={false}
            />
            <YAxis
              axisLine={false}
              fontSize={11}
              tickFormatter={(value) => formatCompactCurrency(Number(value))}
              tickLine={false}
              width={72}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value) => currencyFormatter.format(Number(value))}
            />
            <Line
              dataKey="revenue"
              dot={{ r: 3 }}
              stroke="var(--primary)"
              strokeWidth={3}
              type="monotone"
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Serviços mais realizados" isEmpty={topServices.length === 0}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={topServices} layout="vertical">
            <CartesianGrid stroke="var(--border)" horizontal={false} />
            <XAxis
              allowDecimals={false}
              axisLine={false}
              fontSize={11}
              tickLine={false}
              type="number"
            />
            <YAxis
              axisLine={false}
              dataKey="name"
              fontSize={11}
              tickLine={false}
              type="category"
              width={112}
            />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
            <Bar dataKey="total" fill="var(--primary)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>
    </div>
  );
}

function ChartPanel({
  children,
  isEmpty,
  title,
}: {
  children: ReactNode;
  isEmpty: boolean;
  title: string;
}) {
  return (
    <section className="surface-card p-5 text-card-foreground">
      <h3 className="text-sm font-bold">{title}</h3>
      <div className="mt-5 h-[280px]">
        {isEmpty ? <EmptyChartState /> : children}
      </div>
    </section>
  );
}

function EmptyChartState() {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-md border border-dashed bg-muted/30 px-4 text-center">
      <BarChart3 className="size-5 text-muted-foreground" aria-hidden="true" />
      <p className="mt-3 text-sm font-medium">Sem dados para exibir</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Os indicadores aparecerão após a importação.
      </p>
    </div>
  );
}

function hasTotals(items: Array<{ total: number }>) {
  return items.some((item) => item.total > 0);
}

function formatCompactCurrency(value: number) {
  if (value >= 1000) {
    return `R$ ${Math.round(value / 1000)}k`;
  }

  return `R$ ${Math.round(value)}`;
}
