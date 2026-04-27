"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Backdrop from "@mui/material/Backdrop";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Modal from "@mui/material/Modal";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  type DatabaseAddColumnInput,
  type DatabaseCategory,
  type DatabaseColumnDataType,
  type DatabaseColumnMeta,
  type DatabaseDirtyCell,
  type DatabaseFilterGroup,
  type DatabaseRow,
  type DatabaseSaveResult,
} from "./database-types";
import { useDatabaseData } from "./use-database-data";

import DatabaseGrid from "@/components/database/database-grid";
import DatabaseHeader from "@/components/database/database-header";
import DatabaseFilterRail from "@/components/database/database-filter-rail";
import DatabaseNavDrawer from "@/components/database/database-nav-drawer";

const COLUMN_DATA_TYPES: DatabaseColumnDataType[] = [
  "text",
  "numeric",
  "integer",
  "date",
  "boolean",
  "enum",
];

function dirtyCellKey(change: Pick<DatabaseDirtyCell, "category" | "rowId" | "field">) {
  return `${change.category}:${change.rowId}:${change.field}`;
}

function applyPendingEdits(
  rows: DatabaseRow[],
  category: DatabaseCategory,
  dirtyCells: Record<string, DatabaseDirtyCell>,
) {
  const changes = Object.values(dirtyCells).filter((change) => change.category === category);
  if (changes.length === 0) {
    return rows;
  }
  return rows.map((row) => {
    const rowChanges = changes.filter((change) => change.rowId === row.id);
    if (rowChanges.length === 0) {
      return row;
    }
    return {
      ...row,
      ...Object.fromEntries(rowChanges.map((change) => [change.field, change.value])),
    };
  });
}

export default function DatabaseClient() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<DatabaseCategory>("");
  const { data, isLoading, error, setData } = useDatabaseData();
  const [filterOverrides, setFilterOverrides] = useState<
    Record<DatabaseCategory, DatabaseFilterGroup[]> | null
  >(null);
  const [placeholderDismissed, setPlaceholderDismissed] = useState(false);
  const [dirtyCells, setDirtyCells] = useState<Record<string, DatabaseDirtyCell>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [hiddenColumnMessage, setHiddenColumnMessage] = useState<string | null>(null);
  const [addColumnOpen, setAddColumnOpen] = useState(false);
  const [columnLabel, setColumnLabel] = useState("");
  const [columnDataType, setColumnDataType] = useState<DatabaseColumnDataType>("text");
  const [enumOptions, setEnumOptions] = useState("");
  const [restoreColumn, setRestoreColumn] = useState<DatabaseColumnMeta | null>(null);
  const exportCsvRef = useRef<null | (() => void)>(null);
  const exportPrintRef = useRef<null | (() => void)>(null);
  const filtersByCategory = filterOverrides ?? data.filterGroupsByCategory;
  const categoryLabels = data.categories.map((category) => category.label);
  const activeCategoryMeta = data.categories.find(
    (category) => category.label === activeCategory,
  );
  const activeColumnsMeta = data.admin.columnsByCategory[activeCategory] ?? [];
  const activeHiddenColumns = data.admin.hiddenColumnsByCategory[activeCategory] ?? [];
  const dirtyCellList = Object.values(dirtyCells);
  const hasPendingChanges = dirtyCellList.length > 0;

  useEffect(() => {
    if (!activeCategory && categoryLabels.length > 0) {
      setActiveCategory(categoryLabels[0]);
      return;
    }
    if (activeCategory && categoryLabels.length > 0 && !categoryLabels.includes(activeCategory)) {
      setActiveCategory(categoryLabels[0]);
    }
  }, [activeCategory, categoryLabels]);

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
    setDirtyCells({});
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
    const editedRows = applyPendingEdits(sourceRows, activeCategory, dirtyCells);
    const activeGroups = filtersByCategory[activeCategory] ?? [];
    return applyFilters(editedRows, activeGroups);
  }, [activeCategory, data.tablesByCategory, dirtyCells, filtersByCategory]);

  const handleCategoryChange = useCallback((category: DatabaseCategory) => {
    setDirtyCells({});
    setActiveCategory(category);
  }, []);

  const handleExportHandlers = useCallback(
    (handlers: { exportCsv: () => void; exportPrint: () => void }) => {
      exportCsvRef.current = handlers.exportCsv;
      exportPrintRef.current = handlers.exportPrint;
    },
    [],
  );

  const handleCellChange = useCallback((change: DatabaseDirtyCell) => {
    setDirtyCells((current) => {
      const key = dirtyCellKey(change);
      if (String(change.value ?? "") === String(change.originalValue ?? "")) {
        const remaining = { ...current };
        delete remaining[key];
        return remaining;
      }
      return { ...current, [key]: change };
    });
  }, []);

  async function handleSaveChanges() {
    if (!hasPendingChanges || isSaving) {
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);
    try {
      const response = await fetch("/api/v1/database/admin/rows", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes: dirtyCellList }),
      });
      const result = (await response.json().catch(() => null)) as
        | Partial<DatabaseSaveResult & { detail: string }>
        | null;
      if (!response.ok) {
        throw new Error(result?.detail ?? "Unable to save database edits.");
      }

      const failedKeys = new Set(
        (result?.failed ?? []).map((failure) =>
          dirtyCellKey({
            category: dirtyCellList.find(
              (change) => change.rowId === failure.rowId && change.field === failure.field,
            )?.category ?? activeCategory,
            rowId: failure.rowId,
            field: failure.field,
          }),
        ),
      );
      setDirtyCells((current) =>
        Object.fromEntries(
          Object.entries(current).filter(([key]) => failedKeys.has(key)),
        ),
      );
      const failedCount = result?.failed?.length ?? 0;
      setSaveMessage(
        failedCount > 0
          ? `Saved ${result?.saved ?? 0} changes. ${failedCount} changes need review.`
          : `Saved ${result?.saved ?? dirtyCellList.length} changes.`,
      );
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "Unable to save database edits.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleHideColumn(column: DatabaseColumnMeta) {
    const response = await fetch("/api/v1/database/admin/columns/visibility", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: activeCategory,
        field: column.field,
        visible: false,
      }),
    });
    if (response.ok) {
      setData((current) => {
        const categoryColumns = current.admin.columnsByCategory[activeCategory] ?? [];
        const hiddenColumns = current.admin.hiddenColumnsByCategory[activeCategory] ?? [];
        const hiddenColumn = { ...column, visible: false };
        return {
          ...current,
          admin: {
            ...current.admin,
            columnsByCategory: {
              ...current.admin.columnsByCategory,
              [activeCategory]: categoryColumns.map((item) =>
                item.field === column.field ? hiddenColumn : item,
              ),
            },
            hiddenColumnsByCategory: {
              ...current.admin.hiddenColumnsByCategory,
              [activeCategory]: [
                ...hiddenColumns.filter((item) => item.field !== column.field),
                hiddenColumn,
              ],
            },
          },
        };
      });
      setHiddenColumnMessage(`Column ${column.headerName} has been hidden for all users`);
      return;
    }
    const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
    setSaveMessage(payload?.detail ?? `Unable to hide ${column.headerName}.`);
  }

  async function handleRestoreColumn() {
    if (!restoreColumn) {
      return;
    }
    const response = await fetch("/api/v1/database/admin/columns/visibility", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: activeCategory,
        field: restoreColumn.field,
        visible: true,
      }),
    });
    if (response.ok) {
      setData((current) => {
        const categoryColumns = current.admin.columnsByCategory[activeCategory] ?? [];
        const restoredColumn = { ...restoreColumn, visible: true };
        const hasExistingColumn = categoryColumns.some(
          (column) => column.field === restoreColumn.field,
        );
        return {
          ...current,
          admin: {
            ...current.admin,
            columnsByCategory: {
              ...current.admin.columnsByCategory,
              [activeCategory]: hasExistingColumn
                ? categoryColumns.map((column) =>
                    column.field === restoreColumn.field ? restoredColumn : column,
                  )
                : [...categoryColumns, restoredColumn],
            },
            hiddenColumnsByCategory: {
              ...current.admin.hiddenColumnsByCategory,
              [activeCategory]: (
                current.admin.hiddenColumnsByCategory[activeCategory] ?? []
              ).filter((column) => column.field !== restoreColumn.field),
            },
          },
        };
      });
      setHiddenColumnMessage(`Column ${restoreColumn.headerName} has been restored for all users`);
      setRestoreColumn(null);
      setAddColumnOpen(false);
      return;
    }
    const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
    setSaveMessage(payload?.detail ?? `Unable to restore ${restoreColumn.headerName}.`);
  }

  async function handleAddColumn() {
    if (!activeCategoryMeta?.canAddColumns || !columnLabel.trim()) {
      return;
    }
    const input: DatabaseAddColumnInput = {
      category: activeCategory,
      label: columnLabel,
      dataType: columnDataType,
      enumOptions:
        columnDataType === "enum"
          ? enumOptions
              .split(",")
              .map((option) => option.trim())
              .filter(Boolean)
          : undefined,
    };
    const response = await fetch("/api/v1/database/admin/columns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { column?: { field_key?: string; column_name?: string }[] }
        | null;
      const created = payload?.column?.[0];
      const field = created?.column_name ?? created?.field_key ?? input.label.trim();
      const newColumn: DatabaseColumnMeta = {
        field,
        headerName: input.label.trim(),
        dataType: input.dataType,
        source: activeCategoryMeta?.source ?? activeCategory,
        editable: true,
        hideable: true,
        addable: true,
        visible: true,
      };
      setData((current) => {
        const categoryColumns = current.admin.columnsByCategory[activeCategory] ?? [];
        return {
          ...current,
          tablesByCategory: {
            ...current.tablesByCategory,
            [activeCategory]: (current.tablesByCategory[activeCategory] ?? []).map((row) => ({
              ...row,
              [field]: row[field] ?? null,
            })),
          },
          admin: {
            ...current.admin,
            columnsByCategory: {
              ...current.admin.columnsByCategory,
              [activeCategory]: [
                ...categoryColumns.filter((column) => column.field !== field),
                newColumn,
              ],
            },
            hiddenColumnsByCategory: {
              ...current.admin.hiddenColumnsByCategory,
              [activeCategory]: (
                current.admin.hiddenColumnsByCategory[activeCategory] ?? []
              ).filter((column) => column.field !== field),
            },
          },
        };
      });
      setAddColumnOpen(false);
      setColumnLabel("");
      setEnumOptions("");
      setSaveMessage(`Column ${input.label} has been added.`);
      return;
    }
    const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
    setSaveMessage(payload?.detail ?? `Unable to add ${input.label}.`);
  }

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
          isAdmin={data.admin.isAdmin}
          hasPendingChanges={hasPendingChanges}
          isSaving={isSaving}
          pendingChangeCount={dirtyCellList.length}
          onSaveChanges={handleSaveChanges}
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
              categories={categoryLabels}
              activeCategory={activeCategory}
              onCategoryChange={handleCategoryChange}
              rows={activeRows}
              isLoading={isLoading}
              isAdmin={data.admin.isAdmin}
              columnsMeta={activeColumnsMeta}
              canAddColumns={data.admin.canAddColumnsByCategory[activeCategory]}
              canHideColumns={data.admin.canHideColumnsByCategory[activeCategory]}
              onOpenAddColumn={() => setAddColumnOpen(true)}
              onHideColumn={handleHideColumn}
              onCellChange={handleCellChange}
              onExportHandlersChange={handleExportHandlers}
            />
          </Box>
        </Box>
      </Stack>

      <DatabaseNavDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      <Dialog
        open={addColumnOpen}
        onClose={() => setAddColumnOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Add or restore a column
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 0.5 }}>
            <TextField
              label="New column name"
              value={columnLabel}
              onChange={(event) => setColumnLabel(event.target.value)}
              disabled={!activeCategoryMeta?.canAddColumns}
              helperText={
                activeCategoryMeta?.canAddColumns
                  ? "Creates a real database column for this table."
                  : "Columns cannot be added to metric tables."
              }
            />
            <TextField
              select
              label="Datatype"
              value={columnDataType}
              onChange={(event) =>
                setColumnDataType(event.target.value as DatabaseColumnDataType)
              }
            >
              {COLUMN_DATA_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>
            {columnDataType === "enum" ? (
              <TextField
                label="Enum options"
                value={enumOptions}
                onChange={(event) => setEnumOptions(event.target.value)}
                helperText="Comma-separated options."
              />
            ) : null}
            {activeHiddenColumns.length > 0 ? (
              <Autocomplete
                options={activeHiddenColumns}
                value={restoreColumn}
                onChange={(_event, value) => setRestoreColumn(value)}
                getOptionLabel={(option) => option.headerName}
                sx={{
                  "& .MuiInputBase-root": {
                    fontSize: "0.9rem",
                  },
                  "& .MuiAutocomplete-input": {
                    fontSize: "0.9rem",
                    lineHeight: 1.35,
                  },
                }}
                renderOption={(props, option) => {
                  const { key, ...optionProps } = props;
                  return (
                    <Box
                      key={key}
                      component="li"
                      {...optionProps}
                      sx={{
                        fontSize: "0.85rem",
                        lineHeight: 1.35,
                        minHeight: 34,
                      }}
                    >
                      {option.headerName}
                    </Box>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Restore hidden column"
                    helperText="Hidden columns are not deleted and can be shown again."
                  />
                )}
              />
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddColumnOpen(false)}>Cancel</Button>
          <Button
            onClick={handleRestoreColumn}
            disabled={!restoreColumn}
            variant="outlined"
          >
            Restore
          </Button>
          <Button
            onClick={handleAddColumn}
            disabled={!columnLabel.trim() || !activeCategoryMeta?.canAddColumns}
            variant="contained"
          >
            Add column
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={hasPendingChanges}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Alert
          severity="warning"
          sx={{
            alignItems: "center",
            bgcolor: "common.white",
            border: "2px solid",
            borderColor: "warning.main",
            borderRadius: 0,
            color: "text.primary",
            fontSize: "0.85rem",
            fontWeight: 700,
            boxShadow: 3,
            "& .MuiAlert-icon": {
              color: "warning.main",
              fontSize: "1.2rem",
            },
          }}
        >
          You have unsaved edits. They will only be written to Supabase when you click Save.
        </Alert>
      </Snackbar>

      <Snackbar
        open={Boolean(hiddenColumnMessage)}
        autoHideDuration={3600}
        onClose={() => setHiddenColumnMessage(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Alert severity="success" sx={{ fontSize: "0.9rem", alignItems: "center" }}>
          {hiddenColumnMessage}
        </Alert>
      </Snackbar>

      <Snackbar
        open={Boolean(saveMessage)}
        autoHideDuration={5000}
        onClose={() => setSaveMessage(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="info" sx={{ fontSize: "0.9rem", alignItems: "center" }}>
          {saveMessage}
        </Alert>
      </Snackbar>

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
