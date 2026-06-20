"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Copy,
  Megaphone,
  MessageCircle,
  UsersRound,
} from "lucide-react";
import {
  ClientLevelBadge,
  ClientStatusBadge,
} from "@/components/crm/client-badges";
import { Button } from "@/components/ui/button";
import type { CampaignSegment } from "@/services/campaigns.service";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function CampaignClientList({
  segment,
}: {
  segment: CampaignSegment;
}) {
  const [copiedClientId, setCopiedClientId] = useState<string | null>(null);

  async function copyMessage(clientId: string, message: string) {
    try {
      await navigator.clipboard.writeText(message);
      setCopiedClientId(clientId);
      window.setTimeout(() => setCopiedClientId(null), 1800);
    } catch {
      setCopiedClientId(null);
    }
  }

  return (
    <section className="surface-card min-w-0 overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b px-4 py-4 sm:px-5">
        <div>
          <div className="flex items-center gap-2">
            <UsersRound className="size-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-bold">{segment.label}</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {segment.clients.length}{" "}
            {segment.clients.length === 1 ? "cliente" : "clientes"} neste
            segmento
          </p>
        </div>
      </div>

      {segment.clients.length === 0 ? (
        <CampaignsEmptyState />
      ) : (
        <>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead className="bg-muted/55 text-left text-xs font-semibold text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Nome</th>
                  <th className="px-4 py-3">Telefone</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Nível</th>
                  <th className="px-4 py-3">Última visita</th>
                  <th className="px-4 py-3">Total gasto</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {segment.clients.map(({ client, metrics }) => {
                  const personalizedMessage = personalizeMessage(
                    segment.message,
                    client.name
                  );
                  const phone = client.mobile ?? client.phone;
                  const whatsappHref = getWhatsAppHref(
                    client.mobile,
                    personalizedMessage
                  );

                  return (
                    <tr
                      className="border-t transition-colors hover:bg-muted/35"
                      key={client.id}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <ClientAvatar name={client.name} />
                          <p className="max-w-48 truncate font-semibold">
                            {client.name}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {phone ?? "—"}
                      </td>
                      <td className="px-4 py-4">
                        <ClientStatusBadge
                          status={metrics?.client_status ?? null}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <ClientLevelBadge
                          level={metrics?.client_level ?? null}
                        />
                      </td>
                      <td className="px-4 py-4">
                        {formatDate(metrics?.last_visit ?? null)}
                      </td>
                      <td className="px-4 py-4 font-semibold">
                        {currencyFormatter.format(metrics?.total_spent ?? 0)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          <Button
                            aria-label={`Copiar mensagem para ${client.name}`}
                            onClick={() =>
                              copyMessage(client.id, personalizedMessage)
                            }
                            size="icon"
                            variant="ghost"
                          >
                            {copiedClientId === client.id ? (
                              <Check className="size-4" aria-hidden="true" />
                            ) : (
                              <Copy className="size-4" aria-hidden="true" />
                            )}
                          </Button>
                          {whatsappHref ? (
                            <Button
                              asChild
                              aria-label={`Abrir WhatsApp de ${client.name}`}
                              size="icon"
                              variant="ghost"
                            >
                              <a
                                href={whatsappHref}
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
                              Ver perfil
                              <ArrowRight
                                className="size-4"
                                aria-hidden="true"
                              />
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="divide-y lg:hidden">
            {segment.clients.map(({ client, metrics }) => {
              const personalizedMessage = personalizeMessage(
                segment.message,
                client.name
              );
              const phone = client.mobile ?? client.phone;
              const whatsappHref = getWhatsAppHref(
                client.mobile,
                personalizedMessage
              );

              return (
                <article className="p-4" key={client.id}>
                  <div className="flex items-start gap-3">
                    <ClientAvatar name={client.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {client.name}
                      </p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {phone ?? "Telefone não informado"}
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
                  <p className="mt-3 text-xs text-muted-foreground">
                    Última visita: {formatDate(metrics?.last_visit ?? null)}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 border-t pt-3">
                    <Button
                      onClick={() =>
                        copyMessage(client.id, personalizedMessage)
                      }
                      size="sm"
                      variant="outline"
                    >
                      {copiedClientId === client.id ? (
                        <Check className="size-4" aria-hidden="true" />
                      ) : (
                        <Copy className="size-4" aria-hidden="true" />
                      )}
                      {copiedClientId === client.id
                        ? "Mensagem copiada"
                        : "Copiar mensagem"}
                    </Button>
                    {whatsappHref ? (
                      <Button asChild size="sm" variant="outline">
                        <a
                          href={whatsappHref}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <MessageCircle
                            className="size-4"
                            aria-hidden="true"
                          />
                          WhatsApp
                        </a>
                      </Button>
                    ) : null}
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/clientes/${client.id}`}>
                        Ver perfil
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </Link>
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

function CampaignsEmptyState() {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center px-5 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        <Megaphone className="size-5" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-base font-semibold">
        Nenhum cliente neste segmento
      </h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        Quando clientes atenderem aos critérios desta oportunidade, eles
        aparecerão aqui.
      </p>
    </div>
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

function personalizeMessage(message: string, name: string): string {
  const firstName = name.split(" ").filter(Boolean)[0] || name;
  return message.replace("[Nome]", firstName);
}

function getWhatsAppHref(
  mobile: string | null,
  message: string
): string | null {
  if (!mobile) {
    return null;
  }

  const digits = mobile.replace(/\D/g, "");

  if (!digits) {
    return null;
  }

  const number = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}
