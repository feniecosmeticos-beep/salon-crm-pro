"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  MessageCircle,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  ClientLevelBadge,
  ClientStatusBadge,
} from "@/components/crm/client-badges";
import { CrmEmptyState } from "@/components/crm/empty-state";
import { Button } from "@/components/ui/button";
import type { ClientLevel, ClientStatus } from "@/types/database";
import type { ClientListItem } from "./client-list.types";

type ClientsTableProps = {
  clients: ClientListItem[];
  warningMessage: string | null;
};

const CLIENT_STATUSES: ClientStatus[] = [
  "Novo",
  "Ativo",
  "Em risco",
  "Inativo",
  "Sem histórico",
];

const CLIENT_LEVELS: ClientLevel[] = ["Diamante", "Ouro", "Prata", "Bronze"];

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function ClientsTable({ clients, warningMessage }: ClientsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClientStatus | "">("");
  const [levelFilter, setLevelFilter] = useState<ClientLevel | "">("");
  const [buysProductsFilter, setBuysProductsFilter] = useState<
    "" | "yes" | "no"
  >("");
  const filteredClients = useMemo(() => {
    const normalizedSearch = normalizeSearch(searchTerm);

    return clients.filter(({ client, metrics }) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        normalizeSearch(client.name).includes(normalizedSearch) ||
        normalizeSearch(client.mobile ?? "").includes(normalizedSearch);
      const matchesStatus =
        !statusFilter || metrics?.client_status === statusFilter;
      const matchesLevel = !levelFilter || metrics?.client_level === levelFilter;
      const matchesProducts =
        !buysProductsFilter ||
        (buysProductsFilter === "yes"
          ? metrics?.buys_products === true
          : metrics?.buys_products !== true);

      return matchesSearch && matchesStatus && matchesLevel && matchesProducts;
    });
  }, [buysProductsFilter, clients, levelFilter, searchTerm, statusFilter]);
  const hasFilters = Boolean(
    searchTerm || statusFilter || levelFilter || buysProductsFilter
  );

  function clearFilters() {
    setSearchTerm("");
    setStatusFilter("");
    setLevelFilter("");
    setBuysProductsFilter("");
  }

  return (
    <div className="flex flex-col gap-5">
      {warningMessage ? (
        <div className="flex items-start gap-3 rounded-lg border border-info/20 bg-info-soft px-4 py-3 text-sm text-info">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>{warningMessage}</p>
        </div>
      ) : null}

      <section className="surface-card p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <h2 className="text-sm font-bold">Filtros da carteira</h2>
          </div>
          {hasFilters ? (
            <Button onClick={clearFilters} size="sm" variant="ghost">
              <X className="size-4" aria-hidden="true" />
              Limpar
            </Button>
          ) : null}
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_180px_160px_180px]">
          <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-muted-foreground">
            Buscar cliente
            <span className="relative">
              <Search
                className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20"
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Nome ou celular"
                type="search"
                value={searchTerm}
              />
            </span>
          </label>

          <FilterSelect
            label="Status"
            onChange={(value) => setStatusFilter(value as ClientStatus | "")}
            options={CLIENT_STATUSES}
            value={statusFilter}
          />
          <FilterSelect
            label="Nível"
            onChange={(value) => setLevelFilter(value as ClientLevel | "")}
            options={CLIENT_LEVELS}
            value={levelFilter}
          />
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">
            Compra produtos
            <select
              className="h-10 rounded-md border bg-background px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20"
              onChange={(event) =>
                setBuysProductsFilter(event.target.value as "" | "yes" | "no")
              }
              value={buysProductsFilter}
            >
              <option value="">Todos</option>
              <option value="yes">Sim</option>
              <option value="no">Não</option>
            </select>
          </label>
        </div>
      </section>

      <section className="surface-card overflow-hidden">
        <div className="flex flex-col gap-2 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-sm font-bold">Carteira de clientes</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {filteredClients.length} de {clients.length} clientes
            </p>
          </div>
        </div>

        {clients.length === 0 ? (
          <CrmEmptyState />
        ) : filteredClients.length === 0 ? (
          <CrmEmptyState
            description="Revise a busca ou limpe os filtros para voltar a visualizar sua carteira."
            showImportAction={false}
            title="Nenhum cliente corresponde aos filtros"
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1120px] border-collapse text-sm">
                <thead className="bg-muted/55 text-left text-xs font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3">Cliente</th>
                    <th className="px-4 py-3">Contato</th>
                    <th className="px-4 py-3">Última visita</th>
                    <th className="px-4 py-3">Total gasto</th>
                    <th className="px-4 py-3">Visitas</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Nível</th>
                    <th className="px-4 py-3">Produtos</th>
                    <th className="px-5 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map(({ client, metrics }) => (
                    <tr
                      className="border-t transition-colors hover:bg-muted/35"
                      key={client.id}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <ClientAvatar name={client.name} />
                          <div className="min-w-0">
                            <p className="max-w-48 truncate font-semibold">
                              {client.name}
                            </p>
                            <p className="mt-0.5 max-w-48 truncate text-xs text-muted-foreground">
                              {client.email ?? "E-mail não informado"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {client.mobile ?? "—"}
                      </td>
                      <td className="px-4 py-4">
                        {formatDate(metrics?.last_visit ?? null)}
                      </td>
                      <td className="px-4 py-4 font-semibold">
                        {currencyFormatter.format(metrics?.total_spent ?? 0)}
                      </td>
                      <td className="px-4 py-4">
                        {metrics?.total_visits ?? 0}
                      </td>
                      <td className="px-4 py-4">
                        <ClientStatusBadge
                          status={metrics?.client_status ?? null}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <ClientLevelBadge level={metrics?.client_level ?? null} />
                      </td>
                      <td className="px-4 py-4">
                        {metrics?.buys_products ? "Sim" : "Não"}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          {client.mobile ? (
                            <Button
                              asChild
                              aria-label={`Abrir WhatsApp de ${client.name}`}
                              size="icon"
                              variant="ghost"
                            >
                              <a
                                href={getWhatsAppHref(client.mobile)}
                                rel="noreferrer"
                                target="_blank"
                              >
                                <MessageCircle
                                  className="size-4"
                                  aria-hidden="true"
                                />
                              </a>
                            </Button>
                          ) : null}
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/clientes/${client.id}`}>
                              Ver detalhes
                              <ArrowRight
                                className="size-4"
                                aria-hidden="true"
                              />
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y lg:hidden">
              {filteredClients.map(({ client, metrics }) => (
                <article className="p-4" key={client.id}>
                  <div className="flex items-start gap-3">
                    <ClientAvatar name={client.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {client.name}
                      </p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {client.mobile ?? client.email ?? "Contato não informado"}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-bold">
                      {currencyFormatter.format(metrics?.total_spent ?? 0)}
                    </p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <ClientStatusBadge
                      status={metrics?.client_status ?? null}
                    />
                    <ClientLevelBadge level={metrics?.client_level ?? null} />
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t pt-3">
                    <p className="text-xs text-muted-foreground">
                      Última visita: {formatDate(metrics?.last_visit ?? null)}
                    </p>
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/clientes/${client.id}`}>
                        Ver detalhes
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </Link>
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function FilterSelect<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T | "") => void;
  options: T[];
  value: T | "";
}) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">
      {label}
      <select
        className="h-10 rounded-md border bg-background px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20"
        onChange={(event) => onChange(event.target.value as T | "")}
        value={value}
      >
        <option value="">Todos</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ClientAvatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-xs font-bold text-accent-foreground"
    >
      {getInitials(name)}
    </span>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getWhatsAppHref(mobile: string) {
  const digits = mobile.replace(/\D/g, "");
  const number = digits.startsWith("55") ? digits : `55${digits}`;

  return `https://wa.me/${number}`;
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return dateFormatter.format(new Date(`${value}T00:00:00`));
}
