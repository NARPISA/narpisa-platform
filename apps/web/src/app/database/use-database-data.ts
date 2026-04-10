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
  Usage: [],
  Other: [],
  "Financial Plans": [],
  Personnel: [],
  Projects: [],
};

const PLACEHOLDER_TABLES: Record<DatabaseCategory, DatabaseRow[]> = {
  Mines: [
    { id: 1, mine: "Husab Mine", location: "Namibia", type: "Open Pit", status: "Active", columnTitle: "Cell Item", sourceLinked: true, favorite: true },
    { id: 2, mine: "Rohan Mine", location: "South Africa", type: "Underground", status: "Inactive", columnTitle: "Cell Item", sourceLinked: false, favorite: false },
    { id: 3, mine: "Max Mine", location: "Zimbabwe", type: "Seabed", status: "Decommissioned", columnTitle: "Cell Item", sourceLinked: false, favorite: false },
  ],
  Usage: [
    { id: 1, asset: "Husab Mine", usageType: "Industrial", region: "Namibia", owner: "NaRPISA" },
    { id: 2, asset: "Rohan Mine", usageType: "Energy", region: "South Africa", owner: "Private" },
  ],
  Other: [{ id: 1, item: "Cell Item", summary: "Operational summary placeholder", status: "Active" }],
  "Financial Plans": [{ id: 1, project: "Husab Expansion", budget: "USD 2.4M", phase: "Approved", owner: "NaRPISA" }],
  Personnel: [{ id: 1, name: "Jane Doe", team: "Operations", role: "Lead", location: "Namibia" }],
  Projects: [{ id: 1, project: "South Basin", country: "Namibia", milestone: "Scoping", status: "Active" }],
};

const PLACEHOLDER_FILTERS: Record<DatabaseCategory, DatabaseFilterGroup[]> = {
  Mines: [
    { title: "Status", field: "status", options: [{ label: "Active", checked: true }, { label: "Inactive", checked: true }, { label: "Decommissioned", checked: true }] },
    { title: "Location", field: "location", options: [{ label: "Namibia", checked: true }, { label: "South Africa", checked: true }, { label: "Zimbabwe", checked: true }, { label: "Djibouti", checked: false }] },
    { title: "Mine Type", field: "type", options: [{ label: "Open Pit", checked: true }, { label: "Underground", checked: true }, { label: "Seabed", checked: true }, { label: "In-Situ", checked: false }] },
  ],
  Usage: [
    { title: "Usage Type", field: "usageType", options: [{ label: "Industrial", checked: true }, { label: "Energy", checked: true }, { label: "Construction", checked: false }] },
    { title: "Region", field: "region", options: [{ label: "Namibia", checked: true }, { label: "South Africa", checked: true }, { label: "Zimbabwe", checked: false }] },
  ],
  Other: [{ title: "Status", field: "status", options: [{ label: "Active", checked: true }, { label: "Inactive", checked: false }] }],
  "Financial Plans": [{ title: "Plan Phase", field: "phase", options: [{ label: "Draft", checked: true }, { label: "Approved", checked: true }, { label: "On Hold", checked: false }] }],
  Personnel: [{ title: "Team", field: "team", options: [{ label: "Operations", checked: true }, { label: "Finance", checked: true }, { label: "Engineering", checked: true }] }],
  Projects: [{ title: "Project Status", field: "status", options: [{ label: "Active", checked: true }, { label: "Pending", checked: true }, { label: "Closed", checked: false }] }],
};

function buildPlaceholder(reason: string): DatabaseDataPayload {
  return {
    tablesByCategory: PLACEHOLDER_TABLES,
    filterGroupsByCategory: PLACEHOLDER_FILTERS,
    sourceKind: "placeholder",
    sourceMessage: reason,
  };
}

function hasAnyRows(tables: Record<DatabaseCategory, DatabaseRow[]>) {
  return Object.values(tables).some((rows) => rows.length > 0);
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
        // TODO(backend): replace this stub with the finalized FastAPI endpoint contract.
        const response = await fetch("/api/v1/database", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Database endpoint is not yet integrated.");
        }

        const payload = (await response.json()) as Partial<DatabaseDataPayload>;
        const tablesByCategory = (payload.tablesByCategory ?? EMPTY_TABLES) as Record<
          DatabaseCategory,
          DatabaseRow[]
        >;
        const filterGroupsByCategory = (payload.filterGroupsByCategory ??
          PLACEHOLDER_FILTERS) as Record<DatabaseCategory, DatabaseFilterGroup[]>;

        const usablePayload: DatabaseDataPayload = hasAnyRows(tablesByCategory)
          ? {
              tablesByCategory,
              filterGroupsByCategory,
              sourceKind: "backend",
            }
          : buildPlaceholder(
              "Backend returned no rows. Showing placeholder data until integration is complete.",
            );

        if (!cancelled) {
          setState({ data: usablePayload, isLoading: false, error: null });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            data: buildPlaceholder(
              "Backend endpoint not integrated yet. Showing placeholder data.",
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
