import { MessageSquareText, ShieldCheck } from "lucide-react";
import type { CampaignSegment } from "@/services/campaigns.service";

export function CampaignMessagePreview({
  segment,
}: {
  segment: CampaignSegment;
}) {
  return (
    <aside className="surface-card overflow-hidden xl:sticky xl:top-24">
      <div className="border-b px-5 py-4">
        <div className="flex items-center gap-2">
          <MessageSquareText
            className="size-4 text-primary"
            aria-hidden="true"
          />
          <h2 className="text-sm font-bold">Mensagem sugerida</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{segment.label}</p>
      </div>
      <div className="p-5">
        <blockquote className="rounded-lg border bg-muted/45 p-4 text-sm leading-6">
          “{segment.message}”
        </blockquote>
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-success-soft px-3 py-3 text-xs leading-5 text-success">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            Esta tela apenas prepara a mensagem. O envio continua manual e
            depende da confirmação da equipe no WhatsApp.
          </p>
        </div>
      </div>
    </aside>
  );
}
