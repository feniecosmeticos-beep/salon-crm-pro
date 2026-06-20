import { Mail, Smartphone } from "lucide-react";
import {
  ClientLevelBadge,
  ClientStatusBadge,
} from "@/components/crm/client-badges";
import type { Client, ClientMetrics } from "@/types/database";
import { ClientHeaderActions } from "./client-profile-actions";

export function ClientProfileHeader({
  client,
  metrics,
}: {
  client: Client;
  metrics: ClientMetrics | null;
}) {
  const phoneToCopy = client.mobile ?? client.phone;

  return (
    <section className="surface-card p-5 sm:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span
            aria-label={`Iniciais de ${client.name}`}
            className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-accent text-lg font-bold text-accent-foreground"
          >
            {getInitials(client.name)}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold sm:text-2xl">
              {client.name}
            </h2>
            <div className="mt-2 flex flex-col gap-1.5 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-5">
              <span className="flex min-w-0 items-center gap-2">
                <Smartphone className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {client.mobile ?? "Celular não informado"}
                </span>
              </span>
              <span className="flex min-w-0 items-center gap-2">
                <Mail className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {client.email ?? "E-mail não informado"}
                </span>
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <ClientStatusBadge status={metrics?.client_status ?? null} />
              <ClientLevelBadge level={metrics?.client_level ?? null} />
            </div>
          </div>
        </div>
        <ClientHeaderActions
          clientName={client.name}
          phone={phoneToCopy}
          whatsappMobile={client.mobile}
        />
      </div>
    </section>
  );
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
