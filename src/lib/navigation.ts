import {
  BarChart3,
  CalendarCheck2,
  LayoutDashboard,
  Megaphone,
  Settings,
  Upload,
  Users,
} from "lucide-react";
import type { NavigationItem } from "@/types/navigation";

export const navigationItems: NavigationItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    permission: "view_dashboard",
  },
  {
    title: "Clientes",
    href: "/clientes",
    icon: Users,
    permission: "view_clients",
  },
  {
    title: "Importação AVEC",
    href: "/importacao",
    icon: Upload,
    permission: "import_avec",
  },
  {
    title: "Campanhas",
    href: "/campanhas",
    icon: Megaphone,
    permission: "use_campaigns",
  },
  {
    title: "Follow-ups",
    href: "/followups",
    icon: CalendarCheck2,
    permission: "manage_followups",
  },
  {
    title: "Relatórios",
    href: "/relatorios",
    icon: BarChart3,
    permission: "view_reports",
  },
  {
    title: "Configurações",
    href: "/configuracoes",
    icon: Settings,
    permission: "manage_settings",
  },
];
