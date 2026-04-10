import type { Metadata } from "next";

import TestThemeClient from "./test-theme-client";

export const metadata: Metadata = {
  title: "Theme test",
  description: "Internal palette preview for theme.ts (not linked in navigation).",
  robots: { index: false, follow: false },
};

export default function TestThemePage() {
  return <TestThemeClient />;
}
