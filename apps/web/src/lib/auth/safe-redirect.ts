const DEFAULT_AUTH_REDIRECT = "/database";

export function getSafeInternalRedirect(
  value?: string | null,
  fallback = DEFAULT_AUTH_REDIRECT,
): string {
  if (!value) {
    return fallback;
  }

  try {
    const decoded = decodeURIComponent(value).trim();

    if (!decoded.startsWith("/") || decoded.startsWith("//")) {
      return fallback;
    }

    const parsed = new URL(decoded, "http://narpisa.local");

    if (parsed.origin !== "http://narpisa.local") {
      return fallback;
    }

    const normalized = `${parsed.pathname}${parsed.search}${parsed.hash}`;

    if (!normalized.startsWith("/") || normalized.startsWith("//") || normalized === "/") {
      return fallback;
    }

    return normalized;
  } catch {
    return fallback;
  }
}

