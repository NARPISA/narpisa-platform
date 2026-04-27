import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSafeInternalRedirect } from "@/lib/auth/safe-redirect";
import { createClient } from "@/lib/supabase/server";

import SignInView from "./sign-in-view";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to the NaRPISA platform",
};

type SearchParams = Promise<{ callbackUrl?: string }>;

export default async function SignInPageRoute({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { callbackUrl } = await searchParams;

  if (user) {
    redirect(getSafeInternalRedirect(callbackUrl));
  }

  return <SignInView />;
}
