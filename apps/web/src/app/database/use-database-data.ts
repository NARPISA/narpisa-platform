"use client";

import { useEffect, useState } from "react";

import {
  type DatabaseCategory,
  type DatabaseDataPayload,
  type DatabaseFilterGroup,
  type DatabaseRow,
} from "./database-types";

type DatabaseDataState = {
  data: DatabaseDataPayload;
  isLoading: boolean;
  error: string | null;
};

const EMPTY_TABLES: Record<DatabaseCategory, DatabaseRow[]> = {
  Mines: [],
  "Commodity Metrics": [],
  "Water Metrics": [],
  Licenses: [],
};

const EMPTY_FILTERS: Record<DatabaseCategory, DatabaseFilterGroup[]> = {
  Mines: [],
  "Commodity Metrics": [],
  "Water Metrics": [],
  Licenses: [],
};

function buildPlaceholder(reason: string): DatabaseDataPayload {
  return {
    tablesByCategory: EMPTY_TABLES,
    filterGroupsByCategory: EMPTY_FILTERS,
    sourceKind: "placeholder",
    sourceMessage: reason,
  };
}

export function useDatabaseData() {
  const [state, setState] = useState<DatabaseDataState>({
    data: buildPlaceholder("Loading placeholder data."),
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/v1/database", { cache: "no-store" });
        if (!response.ok) {
          const errorPayload = (await response.json().catch(() => null)) as
            | { detail?: string }
            | null;
          throw new Error(
            errorPayload?.detail ?? "Unable to load live database data.",
          );
        }

        const payload = (await response.json()) as Partial<DatabaseDataPayload>;
        const usablePayload: DatabaseDataPayload = {
          tablesByCategory: (payload.tablesByCategory ?? EMPTY_TABLES) as Record<
            DatabaseCategory,
            DatabaseRow[]
          >,
          filterGroupsByCategory: (payload.filterGroupsByCategory ??
            EMPTY_FILTERS) as Record<DatabaseCategory, DatabaseFilterGroup[]>,
          sourceKind: "backend",
          sourceMessage: payload.sourceMessage,
        };

        if (!cancelled) {
          setState({ data: usablePayload, isLoading: false, error: null });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            data: buildPlaceholder(
              "Unable to load live Supabase data right now.",
            ),
            isLoading: false,
            error: error instanceof Error ? error.message : "Unable to load backend data.",
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
