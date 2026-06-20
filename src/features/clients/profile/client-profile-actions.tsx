"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type CopyState = "copied" | "error" | "idle";

export function ClientHeaderActions({
  clientName,
  phone,
  whatsappMobile,
}: {
  clientName: string;
  phone: string | null;
  whatsappMobile: string | null;
}) {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const whatsappHref = getWhatsAppHref(whatsappMobile);

  async function copyPhone() {
    if (!phone) {
      return;
    }

    try {
      await navigator.clipboard.writeText(phone);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }

    window.setTimeout(() => setCopyState("idle"), 1800);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button disabled={!phone} onClick={copyPhone} size="sm" variant="outline">
        {copyState === "copied" ? (
          <Check className="size-4" aria-hidden="true" />
        ) : (
          <Copy className="size-4" aria-hidden="true" />
        )}
        <span aria-live="polite">
          {copyState === "copied"
            ? "Telefone copiado"
            : copyState === "error"
              ? "Não foi possível copiar"
              : "Copiar telefone"}
        </span>
      </Button>
      {whatsappHref ? (
        <Button asChild size="sm">
          <a href={whatsappHref} rel="noreferrer" target="_blank">
            <MessageCircle className="size-4" aria-hidden="true" />
            Abrir WhatsApp
            <span className="sr-only"> de {clientName}</span>
          </a>
        </Button>
      ) : null}
    </div>
  );
}

export function CopyMessageButton({ message }: { message: string }) {
  const [copyState, setCopyState] = useState<CopyState>("idle");

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
    <Button onClick={copyMessage} size="sm" variant="outline">
      {copyState === "copied" ? (
        <Check className="size-4" aria-hidden="true" />
      ) : (
        <Copy className="size-4" aria-hidden="true" />
      )}
      <span aria-live="polite">
        {copyState === "copied"
          ? "Mensagem copiada"
          : copyState === "error"
            ? "Não foi possível copiar"
            : "Copiar mensagem"}
      </span>
    </Button>
  );
}

function getWhatsAppHref(mobile: string | null): string | null {
  if (!mobile) {
    return null;
  }

  const digits = mobile.replace(/\D/g, "");

  if (!digits) {
    return null;
  }

  const number = digits.startsWith("55") ? digits : `55${digits}`;

  return `https://wa.me/${number}`;
}
