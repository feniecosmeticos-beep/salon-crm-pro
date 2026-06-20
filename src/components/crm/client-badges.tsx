import type { ClientLevel, ClientStatus } from "@/types/database";
import { cn } from "@/lib/utils";

const baseClass =
  "inline-flex h-6 items-center rounded-md border px-2 text-xs font-semibold";

export function ClientStatusBadge({
  className,
  status,
}: {
  className?: string;
  status: ClientStatus | null;
}) {
  const currentStatus = status ?? "Sem histórico";

  return (
    <span
      className={cn(
        baseClass,
        currentStatus === "Ativo" &&
          "border-success/20 bg-success-soft text-success",
        currentStatus === "Novo" && "border-info/20 bg-info-soft text-info",
        currentStatus === "Em risco" &&
          "border-warning/25 bg-warning-soft text-warning",
        currentStatus === "Inativo" &&
          "border-destructive/20 bg-destructive/10 text-destructive",
        currentStatus === "Sem histórico" &&
          "border-border bg-muted text-muted-foreground",
        className
      )}
    >
      {currentStatus}
    </span>
  );
}

export function ClientLevelBadge({
  className,
  level,
}: {
  className?: string;
  level: ClientLevel | null;
}) {
  const currentLevel = level ?? "Bronze";

  return (
    <span
      className={cn(
        baseClass,
        currentLevel === "Diamante" && "border-vip/20 bg-vip-soft text-vip",
        currentLevel === "Ouro" && "border-gold/25 bg-gold-soft text-gold",
        currentLevel === "Prata" &&
          "border-border bg-secondary text-secondary-foreground",
        currentLevel === "Bronze" &&
          "border-orange-200 bg-orange-50 text-orange-700",
        className
      )}
    >
      {currentLevel}
    </span>
  );
}
