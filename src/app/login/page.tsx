import { redirect } from "next/navigation";
import { LoginPage } from "@/features/auth/login-page";
import { getAuthenticatedUser } from "@/services/auth.service";
import { hasSupabasePublicConfig } from "@/services/supabase-config";

type LoginRouteProps = {
  searchParams: Promise<{
    next?: string | string[];
  }>;
};

export default async function LoginRoute({
  searchParams,
}: LoginRouteProps) {
  const configured = hasSupabasePublicConfig();

  if (configured && (await getAuthenticatedUser())) {
    redirect("/");
  }

  const params = await searchParams;

  return (
    <LoginPage
      configured={configured}
      redirectTo={getSafeRedirect(params.next)}
    />
  );
}

function getSafeRedirect(value: string | string[] | undefined): string {
  const redirectTo = Array.isArray(value) ? value[0] : value;

  if (
    !redirectTo ||
    !redirectTo.startsWith("/") ||
    redirectTo.startsWith("//") ||
    redirectTo.startsWith("/login")
  ) {
    return "/";
  }

  return redirectTo;
}
