"use client";

import { AppProvider, type Router as ToolpadRouter, type Session } from "@toolpad/core/AppProvider";
import type { User } from "@supabase/supabase-js";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import theme from "@/theme";
import { createClient } from "@/lib/supabase/client";

function getSafeAvatarUrl(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function mapUser(user: User | null): Session | null {
  if (!user) {
    return null;
  }
  const meta = user.user_metadata as Record<string, string | undefined> | undefined;
  const name = (meta?.full_name as string | undefined)?.trim() || user.email || null;

  return {
    user: {
      id: user.id,
      email: user.email ?? null,
      name,
      image: getSafeAvatarUrl(meta?.avatar_url as string | undefined),
    },
  };
}

function ToolpadProvidersInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();

  const [session, setSession] = React.useState<Session | null>(null);
  const supabase = React.useMemo(() => createClient(), []);

  React.useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, authSession) => {
      setSession(mapUser(authSession?.user ?? null));
    });

    void supabase.auth.getUser().then(({ data: { user } }) => {
      setSession(mapUser(user));
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const toolpadRouter = React.useMemo<ToolpadRouter>(
    () => ({
      pathname,
      searchParams: searchParams ?? new URLSearchParams(),
      navigate: (url, options) => {
        const href = typeof url === "string" ? url : url.toString();
        if (options?.history === "replace") {
          router.replace(href);
        } else {
          router.push(href);
        }
      },
    }),
    [pathname, searchParams, router],
  );

  const authentication = React.useMemo(
    () => ({
      signIn: () => {
        router.push("/signin");
      },
      signOut: async () => {
        await supabase.auth.signOut();
        router.refresh();
        router.push("/");
      },
    }),
    [router, supabase],
  );

  return (
    <AppProvider
      theme={theme}
      session={session}
      authentication={authentication}
      router={toolpadRouter}
    >
      {children}
    </AppProvider>
  );
}

export default function ToolpadProviders({ children }: { children: React.ReactNode }) {
  return <ToolpadProvidersInner>{children}</ToolpadProvidersInner>;
}
