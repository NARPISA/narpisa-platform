import { getPdfWorkerUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function getSupabaseAccessToken() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return { error: "Authentication required.", status: 401 as const };
  }

  return { accessToken: session.access_token, status: 200 as const };
}

export async function proxyDatabaseAdminRequest(
  request: Request,
  backendPath: string,
  method: "POST" | "PATCH",
) {
  const token = await getSupabaseAccessToken();
  if ("error" in token) {
    return Response.json({ detail: token.error }, { status: token.status });
  }

  const backendUrl = new URL(backendPath, getPdfWorkerUrl());
  const response = await fetch(backendUrl, {
    method,
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      "Content-Type": "application/json",
    },
    body: await request.text(),
    cache: "no-store",
  });

  return new Response(await response.text(), {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "application/json",
    },
  });
}
