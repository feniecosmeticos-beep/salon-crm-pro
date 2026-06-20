import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { Session, User } from "@supabase/supabase-js";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import { hasSupabasePublicConfig } from "@/services/supabase-config";

export const getAuthenticatedUser = cache(async (): Promise<User | null> => {
  if (!hasSupabasePublicConfig()) {
    return null;
  }

  try {
    const supabase = await createSupabaseAuthServerClient();
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      return null;
    }

    return data.user;
  } catch {
    return null;
  }
});

export const getCurrentSession = cache(
  async (): Promise<Session | null> => {
    if (!hasSupabasePublicConfig()) {
      return null;
    }

    try {
      const supabase = await createSupabaseAuthServerClient();
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        return null;
      }

      return data.session;
    } catch {
      return null;
    }
  }
);

export async function requireAuthenticatedUser(): Promise<User | null> {
  if (!hasSupabasePublicConfig()) {
    return null;
  }

  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
