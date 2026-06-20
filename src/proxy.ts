import type { NextRequest } from "next/server";
import { updateAuthSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateAuthSession(request);
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/clientes/:path*",
    "/importacao/:path*",
    "/campanhas/:path*",
    "/followups/:path*",
    "/follow-ups/:path*",
    "/relatorios/:path*",
    "/configuracoes/:path*",
  ],
};
