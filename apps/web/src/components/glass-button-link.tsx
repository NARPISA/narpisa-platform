"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import GlassButton from "@/components/glass-button";

/**
 * Client-only wrapper so `Link` is not passed from a Server Component into
 * `GlassButton` (Next.js cannot serialize function props across the boundary).
 */
export default function GlassButtonLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <GlassButton component={Link} href={href}>
      {children}
    </GlassButton>
  );
}
