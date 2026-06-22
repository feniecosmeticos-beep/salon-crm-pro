"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import type { Permission } from "@/types/permissions";

export function AppShell({
  children,
  permissions,
  salon,
  salonFallback,
  salonWarning,
}: {
  children: ReactNode;
  permissions: Permission[];
  salon: {
    name: string;
    plan: string | null;
  } | null;
  salonFallback: boolean;
  salonWarning: string | null;
}) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <Sidebar
          permissions={permissions}
          salon={salon}
          salonFallback={salonFallback}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar permissions={permissions} />
          <main className="min-h-[calc(100vh-4rem)] px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
            <div className="mx-auto w-full max-w-[1600px]">
              {salonWarning ? (
                <div
                  className="mb-6 flex items-start gap-3 rounded-lg border border-warning/25 bg-warning-soft px-4 py-3 text-sm text-warning"
                  role="alert"
                >
                  <AlertTriangle
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden="true"
                  />
                  <p>{salonWarning}</p>
                </div>
              ) : null}
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
