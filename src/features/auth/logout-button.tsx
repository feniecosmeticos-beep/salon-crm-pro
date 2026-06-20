"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { hasSupabasePublicConfig } from "@/services/supabase-config";
import { cn } from "@/lib/utils";

export function LogoutButton({
  compact = false,
  sidebar = false,
}: {
  compact?: boolean;
  sidebar?: boolean;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  if (!hasSupabasePublicConfig()) {
    return null;
  }

  async function handleLogout() {
    if (isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut({ scope: "local" });
    } finally {
      router.replace("/login");
      router.refresh();
      setIsLoading(false);
    }
  }

  return (
    <Button
      aria-label={compact ? "Sair" : undefined}
      className={cn(
        compact && "text-muted-foreground",
        sidebar &&
          "w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
      disabled={isLoading}
      onClick={handleLogout}
      size={compact ? "icon" : "sm"}
      variant="ghost"
    >
      {isLoading ? (
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <LogOut className="size-4" aria-hidden="true" />
      )}
      {compact ? <span className="sr-only">Sair</span> : "Sair"}
    </Button>
  );
}
