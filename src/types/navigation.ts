import type { LucideIcon } from "lucide-react";
import type { Permission } from "@/types/permissions";

export type NavigationItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  permission: Permission;
  disabled?: boolean;
};
