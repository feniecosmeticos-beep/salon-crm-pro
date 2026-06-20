import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicConfig } from "@/services/supabase-config";
import type { Database } from "@/types/database";

const PUBLIC_ROUTE = "/login";

export async function updateAuthSession(request: NextRequest) {
  const config = getSupabasePublicConfig();

  if (!config) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(
    config.supabaseUrl,
    config.supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, options, value }) => {
            response.cookies.set(name, value, options);
          });

          Object.entries(headers).forEach(([name, value]) => {
            response.headers.set(name, value);
          });
        },
      },
    }
  );
  let isAuthenticated = false;

  try {
    const { data, error } = await supabase.auth.getClaims();
    isAuthenticated = !error && Boolean(data?.claims?.sub);
  } catch {
    isAuthenticated = false;
  }

  const pathname = request.nextUrl.pathname;

  if (!isAuthenticated && pathname !== PUBLIC_ROUTE) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = PUBLIC_ROUTE;
    loginUrl.search = "";

    if (pathname !== "/") {
      loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    }

    return copyAuthState(response, NextResponse.redirect(loginUrl));
  }

  if (isAuthenticated && pathname === PUBLIC_ROUTE) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    return copyAuthState(response, NextResponse.redirect(homeUrl));
  }

  return response;
}

function copyAuthState(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });

  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = source.headers.get(header);

    if (value) {
      target.headers.set(header, value);
    }
  }

  return target;
}
