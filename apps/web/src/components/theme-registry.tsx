"use client";

import * as React from "react";
import createCache, { type EmotionCache, type Options as EmotionOptions } from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { useServerInsertedHTML } from "next/navigation";

import theme from "@/theme";

type ThemeRegistryProps = React.PropsWithChildren<{
  options?: Omit<EmotionOptions, "insertionPoint">;
}>;

function createEmotionCache(options: Omit<EmotionOptions, "insertionPoint">) {
  const cache = createCache(options);
  cache.compat = true;

  const prevInsert = cache.insert;
  let inserted: string[] = [];

  cache.insert = (...args) => {
    const serialized = args[1];

    if (cache.inserted[serialized.name] === undefined) {
      inserted.push(serialized.name);
    }

    return prevInsert(...args);
  };

  const flush = () => {
    const prevInserted = inserted;
    inserted = [];
    return prevInserted;
  };

  return { cache, flush };
}

export default function ThemeRegistry({
  options = { key: "mui" },
  children,
}: ThemeRegistryProps) {
  const [{ cache, flush }] = React.useState(() => createEmotionCache(options));

  useServerInsertedHTML(() => {
    const names = flush();

    if (names.length === 0) {
      return null;
    }

    let styles = "";

    for (const name of names) {
      styles += cache.inserted[name];
    }

    return (
      <style
        data-emotion={`${cache.key} ${names.join(" ")}`}
        dangerouslySetInnerHTML={{ __html: styles }}
      />
    );
  });

  return (
    <CacheProvider value={cache as EmotionCache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </CacheProvider>
  );
}
