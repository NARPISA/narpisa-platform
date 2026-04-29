import type { Metadata } from "next";

import ForgotPasswordView from "./forgot-password-view";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Reset your Alluvial AI platform password",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordView />;
}
