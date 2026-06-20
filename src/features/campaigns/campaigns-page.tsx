"use client";

import { useState } from "react";
import { AlertTriangle, DatabaseZap } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import type {
  CampaignSegmentKey,
  CampaignSegmentsData,
} from "@/services/campaigns.service";
import { CampaignClientList } from "./campaign-client-list";
import { CampaignMessagePreview } from "./campaign-message-preview";
import { CampaignSegmentCard } from "./campaign-segment-card";

export function CampaignsPage({ data }: { data: CampaignSegmentsData }) {
  const [selectedSegmentKey, setSelectedSegmentKey] =
    useState<CampaignSegmentKey>("risk");
  const selectedSegment =
    data.segments.find((segment) => segment.key === selectedSegmentKey) ??
    data.segments[0];

  return (
    <PageShell
      description="Encontre oportunidades de faturamento na sua carteira."
      eyebrow="Inteligência comercial"
      title="Campanhas Inteligentes"
    >
      {data.warningMessage ? (
        <CampaignWarning message={data.warningMessage} state={data.state} />
      ) : null}

      <section aria-labelledby="campaign-segments-title">
        <div>
          <h2 className="text-base font-bold" id="campaign-segments-title">
            Segmentos inteligentes
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Selecione uma oportunidade para visualizar os clientes e a mensagem
            sugerida.
          </p>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {data.segments.map((segment) => (
            <CampaignSegmentCard
              isSelected={segment.key === selectedSegment.key}
              key={segment.key}
              onSelect={setSelectedSegmentKey}
              segment={segment}
            />
          ))}
        </div>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <CampaignClientList segment={selectedSegment} />
        <CampaignMessagePreview segment={selectedSegment} />
      </div>
    </PageShell>
  );
}

function CampaignWarning({
  message,
  state,
}: {
  message: string;
  state: CampaignSegmentsData["state"];
}) {
  const Icon = state === "unconfigured" ? DatabaseZap : AlertTriangle;

  return (
    <div
      className="flex items-start gap-3 rounded-lg border border-info/20 bg-info-soft px-4 py-3 text-sm text-info"
      role="status"
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-semibold">
          {state === "unconfigured"
            ? "Dados ainda não conectados"
            : "Campanhas parcialmente indisponíveis"}
        </p>
        <p className="mt-1">{message}</p>
      </div>
    </div>
  );
}
