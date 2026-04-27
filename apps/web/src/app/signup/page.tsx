import type { Metadata } from "next";

import SignUpView from "./sign-up-view";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create a NaRPISA platform account",
};

export default function SignUpPage() {
  return <SignUpView />;
}
