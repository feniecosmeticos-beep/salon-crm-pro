"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ClientStatus } from "@/types/database";
import { getOpportunityMessage } from "./opportunity-message";

type CopyState = "copied" | "error" | "idle";

export function OpportunityMessageActions({
  clientName,
  mobile,
  reason,
  status,
}: {
  clientName: string;
  mobile: string | null;
  reason: string;
  status: ClientStatus | null;
}) {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const message = getOpportunityMessage({
    clientName,
    reason,
    status,
  });
  const whatsappHref = getWhatsAppHref(mobile, message);

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }

    window.setTimeout(() => setCopyState("idle"), 1800);
  }

  return (
    <div className="flex flex-wrap gap-1">
      <Button
        aria-label={`Copiar mensagem para ${clientName}`}
        onClick={copyMessage}
        size="icon"
        variant="ghost"
      >
        {copyState === "copied" ? (
          <Check className="size-4" aria-hidden="true" />
        ) : (
          <Copy className="size-4" aria-hidden="true" />
        )}
        <span className="sr-only" aria-live="polite">
          {copyState === "copied"
            ? "Mensagem copiada"
            : copyState === "error"
              ? "Não foi possível copiar"
              : "Copiar mensagem"}
        </span>
      </Button>
      {whatsappHref ? (
        <Button
          asChild
          aria-label={`Abrir WhatsApp de ${clientName}`}
          size="icon"
          variant="ghost"
        >
          <a href={whatsappHref} rel="noreferrer" target="_blank">
            <MessageCircle className="size-4" aria-hidden="true" />
          </a>
        </Button>
      ) : null}
    </div>
  );
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
