import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/services/supabase-config";
import type { Database } from "@/types/database";

let browserClient: SupabaseClient<Database> | null = null;

export function createSupabaseBrowserClient(): SupabaseClient<Database> {
  const config = getSupabasePublicConfig();

  if (!config) {
    throw new Error("Supabase public configuration is missing.");
  }

  return createBrowserClient<Database>(
    config.supabaseUrl,
    config.supabaseKey
  );
}

export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (!browserClient) {
    browserClient = createSupabaseBrowserClient();
  }

  return browserClient;
}
