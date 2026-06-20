import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicConfig } from "@/services/supabase-config";
import type { Database } from "@/types/database";

export async function createSupabaseAuthServerClient() {
  const config = getSupabasePublicConfig();

  if (!config) {
    throw new Error("Supabase public configuration is missing.");
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(
    config.supabaseUrl,
    config.supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, options, value }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot always write cookies. The proxy
            // refreshes and persists the session before rendering.
          }
        },
      },
    }
  );
}
