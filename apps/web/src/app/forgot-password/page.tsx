import type { Metadata } from "next";

import ForgotPasswordView from "./forgot-password-view";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Reset your NaRPISA platform password",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordView />;
}
