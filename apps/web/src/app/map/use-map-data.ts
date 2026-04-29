"use client";

import { useEffect, useState } from "react";

import type { LicenseMapPayload } from "./map-types";

type MapDataState = {
  data: LicenseMapPayload | null;
  isLoading: boolean;
  error: string | null;
  status: number | null;
};

export function useMapData() {
  const [state, setState] = useState<MapDataState>({
    data: null,
    isLoading: true,
    error: null,
    status: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/v1/map", { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as
          | (Partial<LicenseMapPayload> & { detail?: string })
          | null;

        if (!response.ok) {
          throw Object.assign(
            new Error(payload?.detail ?? "Unable to load map data."),
            { status: response.status },
          );
        }

        if (!payload || payload.type !== "FeatureCollection") {
          throw new Error("The map API returned an invalid payload.");
        }

        if (!cancelled) {
          setState({
            data: {
              type: "FeatureCollection",
              features: payload.features ?? [],
              layers: payload.layers ?? [],
              sources: payload.sources ?? [],
            },
            isLoading: false,
            error: null,
            status: response.status,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            data: null,
            isLoading: false,
            error: error instanceof Error ? error.message : "Unable to load map data.",
            status:
              error instanceof Error && "status" in error
                ? Number(error.status)
                : null,
          });
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
