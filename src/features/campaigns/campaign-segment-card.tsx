import type { LucideIcon } from "lucide-react";
import {
  CakeSlice,
  ChevronRight,
  Crown,
  Palette,
  PackageX,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  CampaignSegment,
  CampaignSegmentKey,
} from "@/services/campaigns.service";

const segmentIcons: Record<CampaignSegmentKey, LucideIcon> = {
  birthday: CakeSlice,
  color: Palette,
  inactive: ShieldAlert,
  no_products: PackageX,
  progressive: Sparkles,
  risk: ShieldAlert,
  vip: Crown,
};

const segmentAccentClasses: Record<CampaignSegmentKey, string> = {
  birthday: "bg-info-soft text-info",
  color: "bg-vip-soft text-vip",
  inactive: "bg-destructive/10 text-destructive",
  no_products: "bg-warning-soft text-warning",
  progressive: "bg-success-soft text-success",
  risk: "bg-warning-soft text-warning",
  vip: "bg-gold-soft text-gold",
};

export function CampaignSegmentCard({
  isSelected,
  onSelect,
  segment,
}: {
  isSelected: boolean;
  onSelect: (key: CampaignSegmentKey) => void;
  segment: CampaignSegment;
}) {
  const Icon = segmentIcons[segment.key];

  return (
    <button
      aria-pressed={isSelected}
      className={cn(
        "surface-card group min-h-36 w-full p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30",
        isSelected && "border-primary/45 ring-2 ring-primary/10"
      )}
      onClick={() => onSelect(segment.key)}
      type="button"
    >
      <div className="flex items-start justify-between gap-4">
        <span
          className={cn(
            "flex size-10 items-center justify-center rounded-lg",
            segmentAccentClasses[segment.key]
          )}
        >
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <span className="text-2xl font-bold tabular-nums">
          {segment.clients.length}
        </span>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold">{segment.label}</h3>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
            {segment.description}
          </p>
        </div>
        <ChevronRight
          className={cn(
            "mb-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5",
            isSelected && "text-primary"
          )}
          aria-hidden="true"
        />
      </div>
    </button>
  );
}
