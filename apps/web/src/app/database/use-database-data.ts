"use client";

import { useCallback, useEffect, useState } from "react";

import {
  type DatabaseAdminMeta,
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
};

const EMPTY_FILTERS: Record<DatabaseCategory, DatabaseFilterGroup[]> = {
};

const EMPTY_ADMIN: DatabaseAdminMeta = {
  isAdmin: false,
  columnsByCategory: {},
  hiddenColumnsByCategory: {},
  canAddColumnsByCategory: {},
  canHideColumnsByCategory: {},
};

function buildPlaceholder(reason: string): DatabaseDataPayload {
  return {
    categories: [],
    tablesByCategory: EMPTY_TABLES,
    filterGroupsByCategory: EMPTY_FILTERS,
    admin: EMPTY_ADMIN,
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
  const setData = useCallback((updater: (data: DatabaseDataPayload) => DatabaseDataPayload) => {
    setState((current) => ({ ...current, data: updater(current.data) }));
  }, []);

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
          categories: payload.categories ?? [],
          tablesByCategory: (payload.tablesByCategory ?? EMPTY_TABLES) as Record<
            DatabaseCategory,
            DatabaseRow[]
          >,
          filterGroupsByCategory: (payload.filterGroupsByCategory ??
            EMPTY_FILTERS) as Record<DatabaseCategory, DatabaseFilterGroup[]>,
          admin: payload.admin ?? EMPTY_ADMIN,
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

  return { ...state, setData };
}
