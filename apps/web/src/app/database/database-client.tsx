"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Backdrop from "@mui/material/Backdrop";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Modal from "@mui/material/Modal";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  type DatabaseCategory,
  type DatabaseFilterGroup,
  type DatabaseRow,
} from "./database-types";
import { useDatabaseData } from "./use-database-data";

import DatabaseGrid from "@/components/database/database-grid";
import DatabaseHeader from "@/components/database/database-header";
import DatabaseFilterRail from "@/components/database/database-filter-rail";
import DatabaseNavDrawer from "@/components/database/database-nav-drawer";

export default function DatabaseClient() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<DatabaseCategory>("Mines");
  const { data, isLoading, error } = useDatabaseData();
  const [filterOverrides, setFilterOverrides] = useState<
    Record<DatabaseCategory, DatabaseFilterGroup[]> | null
  >(null);
  const [placeholderDismissed, setPlaceholderDismissed] = useState(false);
  const exportCsvRef = useRef<null | (() => void)>(null);
  const exportPrintRef = useRef<null | (() => void)>(null);
  const filtersByCategory = filterOverrides ?? data.filterGroupsByCategory;

  function toggleFilterOption(groupIndex: number, optionIndex: number) {
    setFilterOverrides((current) => {
      const source = current ?? data.filterGroupsByCategory;
      const nextGroups = source[activeCategory].map((group, gIdx) => {
        if (gIdx !== groupIndex) {
          return group;
        }
        return {
          ...group,
          options: group.options.map((option, oIdx) =>
            oIdx === optionIndex ? { ...option, checked: !option.checked } : option,
          ),
        };
      });
      return { ...source, [activeCategory]: nextGroups };
    });
  }

  function resetActiveCategoryFilters() {
    setFilterOverrides((current) => {
      const source = current ?? data.filterGroupsByCategory;
      return {
        ...source,
        [activeCategory]: data.filterGroupsByCategory[activeCategory],
      };
    });
  }

  function applyFilters(rows: DatabaseRow[], groups: DatabaseFilterGroup[]) {
    return groups.reduce((acc, group) => {
      const enabledValues = group.options
        .filter((option) => option.checked)
        .map((option) => option.label.toLowerCase());

      if (enabledValues.length === 0) {
        return [];
      }

      return acc.filter((row) =>
        enabledValues.includes(String(row[group.field] ?? "").toLowerCase()),
      );
    }, rows);
  }

  const activeRows = useMemo(() => {
    const sourceRows = data.tablesByCategory[activeCategory] ?? [];
    const activeGroups = filtersByCategory[activeCategory] ?? [];
    return applyFilters(sourceRows, activeGroups);
  }, [activeCategory, data.tablesByCategory, filtersByCategory]);

  const handleExportHandlers = useCallback(
    (handlers: { exportCsv: () => void; exportPrint: () => void }) => {
      exportCsvRef.current = handlers.exportCsv;
      exportPrintRef.current = handlers.exportPrint;
    },
    [],
  );

  return (
    <Box
      component="main"
      sx={{
        minHeight: "100vh",
        bgcolor: "background.200",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Stack direction={{ xs: "column", lg: "row" }} sx={{ flex: 1 }}>
        <DatabaseFilterRail
          menuOpen={drawerOpen}
          onOpenMenu={() => setDrawerOpen(true)}
          activeCategory={activeCategory}
          filterGroups={filtersByCategory[activeCategory] ?? []}
          onToggleFilterOption={toggleFilterOption}
          onResetFilters={resetActiveCategoryFilters}
          onExportCsv={() => exportCsvRef.current?.()}
          onExportPdf={() => exportPrintRef.current?.()}
        />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <DatabaseHeader />
          <Box sx={{ px: { xs: 1.5, md: 3 }, py: { xs: 1.5, md: 2.5 }, minWidth: 0 }}>
            {error ? (
              <Alert severity="warning" sx={{ mb: 1.5 }}>
                {error}
              </Alert>
            ) : null}
            <DatabaseGrid
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
              rows={activeRows}
              isLoading={isLoading}
              onExportHandlersChange={handleExportHandlers}
            />
          </Box>
        </Box>
      </Stack>

      <DatabaseNavDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      <Modal
        open={data.sourceKind === "placeholder" && !placeholderDismissed}
        onClose={() => setPlaceholderDismissed(true)}
        closeAfterTransition
        slots={{ backdrop: Backdrop }}
        slotProps={{
          backdrop: {
            sx: { bgcolor: "rgba(0,0,0,0.18)" },
          },
        }}
      >
        <Box
          sx={{
            maxWidth: 560,
            mx: "auto",
            mt: 10,
            bgcolor: "rgba(255,255,255,0.9)",
            border: "1px solid rgba(73,73,73,0.18)",
            borderRadius: 2,
            px: 2,
            py: 1.5,
          }}
        >
          <Typography sx={{ fontSize: "0.95rem", fontWeight: 700, mb: 0.5 }}>
            Live data unavailable
          </Typography>
          <Typography sx={{ fontSize: "0.82rem", color: "text.secondary", mb: 1 }}>
            {data.sourceMessage ??
              "The database view could not reach Supabase, so the page is showing an empty fallback state."}
          </Typography>
          <Button size="small" variant="contained" onClick={() => setPlaceholderDismissed(true)}>
            Dismiss
          </Button>
        </Box>
      </Modal>
    </Box>
  );
}
