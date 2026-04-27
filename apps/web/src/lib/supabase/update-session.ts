import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getSafeInternalRedirect } from "@/lib/auth/safe-redirect";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/env";

function copyAuthCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach(({ name, value, ...options }) => {
    to.cookies.set(name, value, options);
  });
  return to;
}

/**
 * Refreshes the Supabase session from cookies and applies route guards.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value: v, options }) =>
          response.cookies.set(name, v, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const isProtected =
    pathname.startsWith("/database") || pathname.startsWith("/profile");

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set(
      "callbackUrl",
      getSafeInternalRedirect(`${pathname}${request.nextUrl.search}`, pathname),
    );
    return copyAuthCookies(response, NextResponse.redirect(url));
  }

  if (user && pathname.startsWith("/signin")) {
    const dest = getSafeInternalRedirect(request.nextUrl.searchParams.get("callbackUrl"));
    const url = new URL(dest, request.url);
    return copyAuthCookies(response, NextResponse.redirect(url));
  }

  return response;
}
