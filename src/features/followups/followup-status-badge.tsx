import { cn } from "@/lib/utils";
import type { FollowUpStatus } from "@/types/database";

const statusLabels: Record<FollowUpStatus, string> = {
  cancelled: "Cancelado",
  done: "Concluído",
  pending: "Pendente",
};

export function FollowUpStatusBadge({
  isOverdue = false,
  status,
}: {
  isOverdue?: boolean;
  status: FollowUpStatus;
}) {
  const label = isOverdue && status === "pending" ? "Atrasado" : statusLabels[status];

  return (
    <span
      className={cn(
        "inline-flex min-h-6 shrink-0 items-center rounded-md border px-2 py-1 text-xs font-semibold",
        status === "pending" &&
          !isOverdue &&
          "border-warning/25 bg-warning-soft text-warning",
        status === "pending" &&
          isOverdue &&
          "border-destructive/20 bg-destructive/10 text-destructive",
        status === "done" &&
          "border-success/20 bg-success-soft text-success",
        status === "cancelled" &&
          "border-border bg-muted text-muted-foreground"
      )}
    >
      {label}
    </span>
  );
}
