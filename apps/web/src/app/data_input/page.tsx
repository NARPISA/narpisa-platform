import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import ParserAdminClient from "./parser-admin-client";

export default async function DataInputPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/signin?callbackUrl=%2Fdata_input");
  }

  const { data: isAdmin } = await supabase.rpc("is_admin_user");
  if (!isAdmin) {
    redirect("/profile");
  }

  return <ParserAdminClient />;
}
