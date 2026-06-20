"use client";

import Link from "next/link";
import { Building2, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import { navigationItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";
import { SheetClose } from "@/components/ui/sheet";
import { LogoutButton } from "@/features/auth/logout-button";
import type { Permission } from "@/types/permissions";

type SidebarBrandProps = {
  tone?: "default" | "sidebar";
};

function isActiveRoute(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function SidebarBrand({ tone = "default" }: SidebarBrandProps) {
  const isSidebar = tone === "sidebar";

  return (
    <Link href="/" className="flex min-h-20 items-center gap-3 px-5 py-4">
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold shadow-sm",
          isSidebar
            ? "bg-sidebar-primary text-sidebar-primary-foreground"
            : "bg-primary text-primary-foreground"
        )}
      >
        <Sparkles className="size-5" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span
          className={cn(
            "block truncate text-sm font-bold",
            isSidebar ? "text-sidebar-foreground" : "text-foreground"
          )}
        >
          Salon CRM Pro
        </span>
        <span
          className={cn(
            "mt-0.5 block truncate text-xs",
            isSidebar
              ? "text-sidebar-foreground/55"
              : "text-muted-foreground"
          )}
        >
          Inteligência para salões
        </span>
      </span>
    </Link>
  );
}

export function NavigationList({
  mobile = false,
  permissions,
}: {
  mobile?: boolean;
  permissions: Permission[];
}) {
  const pathname = usePathname();
  const visibleItems = navigationItems.filter((item) =>
    permissions.includes(item.permission)
  );

  return (
    <div className="flex flex-col gap-1">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const isActive = isActiveRoute(item.href, pathname);
        if (item.disabled) {
          return (
            <div
              aria-disabled="true"
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "h-11 w-full cursor-not-allowed justify-start gap-3 px-3 text-sm opacity-45",
                mobile ? "text-foreground" : "text-sidebar-foreground"
              )}
              key={item.href}
            >
              <Icon className="size-4" aria-hidden="true" />
              <span>{item.title}</span>
            </div>
          );
        }

        const link = (
          <Link
            href={item.href}
            className={cn(
              buttonVariants({ variant: isActive ? "secondary" : "ghost" }),
              "h-11 w-full justify-start gap-3 px-3 text-sm",
              mobile
                ? "text-foreground"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              isActive &&
                (mobile
                  ? "bg-accent text-accent-foreground"
                  : "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_3px_0_0_var(--sidebar-primary)]")
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            <span>{item.title}</span>
          </Link>
        );

        return mobile ? (
          <SheetClose asChild key={item.href}>
            {link}
          </SheetClose>
        ) : (
          <div key={item.href}>{link}</div>
        );
      })}
    </div>
  );
}

export function Sidebar({ permissions }: { permissions: Permission[] }) {
  return (
    <aside className="hidden w-72 shrink-0 border-r border-sidebar-border bg-sidebar lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
      <SidebarBrand tone="sidebar" />
      <Separator className="bg-sidebar-border" />
      <nav className="flex-1 px-3 py-5">
        <NavigationList permissions={permissions} />
      </nav>
      <div className="p-3">
        <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/55 p-3">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-sidebar-primary/15 text-sidebar-primary">
              <Building2 className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-sidebar-foreground">
                Salão Modelo
              </p>
              <p className="mt-0.5 text-xs text-sidebar-foreground/55">
                Plano Demo
              </p>
            </div>
          </div>
        </div>
        <div className="mt-2">
          <LogoutButton sidebar />
        </div>
      </div>
    </aside>
  );
}
