"use client";

import { Bell, Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { navigationItems } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NavigationList, SidebarBrand } from "@/components/layout/sidebar";
import { LogoutButton } from "@/features/auth/logout-button";
import type { Permission } from "@/types/permissions";

function getPageTitle(pathname: string) {
  return (
    navigationItems.find((item) =>
      item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
    )?.title ?? "Salon CRM Pro"
  );
}

export function Topbar({ permissions }: { permissions: Permission[] }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Abrir menu"
            >
              <Menu className="size-5" aria-hidden="true" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0" showCloseButton={false}>
            <SheetHeader className="border-b p-0">
              <SidebarBrand />
              <SheetTitle className="sr-only">Salon CRM Pro</SheetTitle>
              <SheetDescription className="sr-only">
                Menu principal
              </SheetDescription>
            </SheetHeader>
            <nav className="px-3 py-4">
              <NavigationList mobile permissions={permissions} />
            </nav>
          </SheetContent>
        </Sheet>
        <p className="truncate text-sm font-semibold text-foreground">
          {getPageTitle(pathname)}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          aria-label="Notificações"
          className="text-muted-foreground"
          disabled
          size="icon"
          variant="ghost"
        >
          <Bell className="size-4" aria-hidden="true" />
        </Button>
        <LogoutButton compact />
      </div>
    </header>
  );
}
