import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentSalonId } from "@/services/salon-context";
import { hasSupabaseServerConfig } from "@/services/supabase-config";
import type { ImportLog } from "@/types/database";

export async function getImportLogs(): Promise<ImportLog[]> {
  if (!hasSupabaseServerConfig()) {
    return [];
  }

  try {
    const supabase = createSupabaseServerClient();
    const salonId = await getCurrentSalonId();

    if (!salonId) {
      return [];
    }

    const { data, error } = await supabase
      .from("imports")
      .select("*")
      .eq("salon_id", salonId)
      .order("imported_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch import logs.", error);
      return [];
    }

    return data ?? [];
  } catch (error) {
    console.error("Failed to fetch import logs.", error);
    return [];
  }
}
