import { NextResponse } from "next/server";

import { getSafeInternalRedirect } from "@/lib/auth/safe-redirect";
import { getPublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = getSafeInternalRedirect(searchParams.get("next"));
  const appUrl = getPublicEnv().NEXT_PUBLIC_APP_URL;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, appUrl));
    }
  }

  return NextResponse.redirect(new URL("/auth/auth-code-error", appUrl));
}
