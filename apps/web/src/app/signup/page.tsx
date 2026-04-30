import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import SignUpView from "./sign-up-view";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create a NaRPISA platform account",
};

export default async function SignUpPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/profile");
  }

  return <SignUpView />;
}
