import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/env";

export function createClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
}

/** @deprecated Use createClient — kept for older imports. */
export const createSupabaseBrowserClient = createClient;
