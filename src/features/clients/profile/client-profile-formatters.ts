const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const quantityFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number): string {
  return currencyFormatter.format(Number.isFinite(value) ? value : 0);
}

export function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = value.includes("T")
    ? new Date(value)
    : new Date(`${value}T12:00:00`);

  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

export function formatQuantity(value: number): string {
  return quantityFormatter.format(Number.isFinite(value) ? value : 0);
}
