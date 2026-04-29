import type { Metadata } from "next";

import ChangePasswordView from "./password-view";

export const metadata: Metadata = {
  title: "Change Password",
  description: "Update your NaRPISA account password",
};

export default function ChangePasswordPage() {
  return <ChangePasswordView />;
}
