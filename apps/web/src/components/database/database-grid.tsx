"use client";

import StarRoundedIcon from "@mui/icons-material/StarRounded";
import StarBorderRoundedIcon from "@mui/icons-material/StarBorderRounded";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import {
  DataGrid,
  GridToolbarColumnsButton,
  GridToolbarContainer,
  GridToolbarDensitySelector,
  GridToolbarFilterButton,
  GridToolbarQuickFilter,
  useGridApiRef,
  type GridColDef,
} from "@mui/x-data-grid";
import { useEffect, useMemo } from "react";

import {
  DATABASE_CATEGORY_TABS,
  type DatabaseCategory,
  type DatabaseRow,
  type DatabaseStatus,
} from "@/app/database/database-types";

type DatabaseGridProps = {
  activeCategory: DatabaseCategory;
  onCategoryChange: (category: DatabaseCategory) => void;
  rows: DatabaseRow[];
  isLoading: boolean;
  onExportHandlersChange: (handlers: { exportCsv: () => void; exportPrint: () => void }) => void;
};

function EmptyOverlay({ category }: { category: DatabaseCategory }) {
  return (
    <Stack alignItems="center" justifyContent="center" sx={{ height: "100%", px: 2 }}>
      <Typography sx={{ fontSize: "1rem", fontWeight: 600, color: "text.secondary", textAlign: "center" }}>
        {category} will populate once backend integration is complete.
      </Typography>
    </Stack>
  );
}

function statusChip(status: DatabaseStatus) {
  if (status === "Active") {
    return {
      label: "Active",
      sx: { bgcolor: "success.light", color: "success.main" },
    };
  }
  if (status === "Inactive") {
    return {
      label: "Inactive",
      sx: { bgcolor: "error.light", color: "error.main" },
    };
  }
  return {
    label: "Decommissioned",
    sx: { bgcolor: "background.300", color: "background.700" },
  };
}

export default function DatabaseGrid({
  activeCategory,
  onCategoryChange,
  rows,
  isLoading,
  onExportHandlersChange,
}: DatabaseGridProps) {
  const apiRef = useGridApiRef();

  useEffect(() => {
    onExportHandlersChange({
      exportCsv: () => apiRef.current?.exportDataAsCsv(),
      exportPrint: () => apiRef.current?.exportDataAsPrint(),
    });
  }, [apiRef, onExportHandlersChange]);

  function DatabaseToolbar() {
    return (
      <GridToolbarContainer sx={{ px: 0.25, pb: 0.75 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: 1 }}>
          <Stack direction="row" spacing={0.5}>
            <GridToolbarColumnsButton />
            <GridToolbarFilterButton />
            <GridToolbarDensitySelector />
          </Stack>
          <GridToolbarQuickFilter debounceMs={300} />
        </Stack>
      </GridToolbarContainer>
    );
  }

  const tableConfigs = useMemo<
    Record<DatabaseCategory, { columns: GridColDef<DatabaseRow>[] }>
  >(
    () => ({
      Mines: {
        columns: [
          {
            field: "selected",
            headerName: "",
            width: 52,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            renderCell: (params) => (
              <Checkbox
                checked={Boolean(params.value)}
                size="small"
                sx={{ color: "common.white", "&.Mui-checked": { color: "primary.main" } }}
              />
            ),
          },
          { field: "mine", headerName: "Mine", flex: 1.1, minWidth: 150, headerAlign: "left" },
          { field: "location", headerName: "Location", flex: 1, minWidth: 130 },
          { field: "type", headerName: "Type", flex: 1, minWidth: 160 },
          {
            field: "status",
            headerName: "Status",
            flex: 0.85,
            minWidth: 120,
            renderCell: (params) => {
              const item = statusChip(params.value as DatabaseStatus);
              return (
                <Chip
                  label={item.label}
                  size="small"
                  sx={{ ...item.sx, fontWeight: 600, fontSize: "0.65rem", height: 20 }}
                />
              );
            },
          },
          {
            field: "sourceLinked",
            headerName: "",
            width: 52,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            renderCell: (params) =>
              params.value ? (
                <Typography sx={{ color: "primary.main", fontSize: "1rem" }}>↻</Typography>
              ) : (
                <Box sx={{ width: 16, height: 16 }} />
              ),
          },
          { field: "columnTitle", headerName: "Column Title", flex: 1, minWidth: 150 },
          {
            field: "favorite",
            headerName: "",
            width: 52,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            renderCell: (params) =>
              params.value ? (
                <StarRoundedIcon sx={{ fontSize: 16, color: "primary.main" }} />
              ) : (
                <StarBorderRoundedIcon sx={{ fontSize: 16, color: "background.300" }} />
              ),
          },
        ],
      },
      Usage: {
        columns: [
          { field: "asset", headerName: "Asset", flex: 1.1, minWidth: 160 },
          { field: "usageType", headerName: "Usage Type", flex: 1, minWidth: 140 },
          { field: "region", headerName: "Region", flex: 1, minWidth: 140 },
          { field: "owner", headerName: "Owner", flex: 1, minWidth: 140 },
        ],
      },
      Other: {
        columns: [
          { field: "item", headerName: "Item", flex: 1, minWidth: 170 },
          { field: "summary", headerName: "Summary", flex: 1.3, minWidth: 240 },
          { field: "status", headerName: "Status", flex: 0.7, minWidth: 120 },
        ],
      },
      "Financial Plans": {
        columns: [
          { field: "project", headerName: "Project", flex: 1.1, minWidth: 170 },
          { field: "budget", headerName: "Budget", flex: 0.8, minWidth: 130 },
          { field: "phase", headerName: "Phase", flex: 0.8, minWidth: 120 },
          { field: "owner", headerName: "Owner", flex: 1, minWidth: 160 },
        ],
      },
      Personnel: {
        columns: [
          { field: "name", headerName: "Name", flex: 1, minWidth: 160 },
          { field: "team", headerName: "Team", flex: 1, minWidth: 150 },
          { field: "role", headerName: "Role", flex: 1, minWidth: 140 },
          { field: "location", headerName: "Location", flex: 1, minWidth: 140 },
        ],
      },
      Projects: {
        columns: [
          { field: "project", headerName: "Project", flex: 1.2, minWidth: 180 },
          { field: "country", headerName: "Country", flex: 1, minWidth: 130 },
          { field: "milestone", headerName: "Milestone", flex: 1, minWidth: 150 },
          { field: "status", headerName: "Status", flex: 0.8, minWidth: 120 },
        ],
      },
    }),
    [],
  );

  const safeActiveCategory = activeCategory;
  const tabValue = DATABASE_CATEGORY_TABS.indexOf(safeActiveCategory);
  const activeTable = tableConfigs[safeActiveCategory];

  return (
    <Stack spacing={2}>
      <Tabs
        value={tabValue}
        variant="fullWidth"
        onChange={(_event, index) => {
          const nextCategory = DATABASE_CATEGORY_TABS[index];
          if (nextCategory) {
            onCategoryChange(nextCategory);
          }
        }}
        sx={{
          minHeight: 44,
          borderBottom: "1px solid",
          borderColor: "background.300",
          "& .MuiTab-root": {
            minHeight: 44,
            py: 0.75,
            px: 1.5,
            color: "text.secondary",
            textTransform: "none",
            fontSize: "1rem",
            fontWeight: 700,
          },
          "& .Mui-selected": { color: "#007BE0 !important" },
          "& .MuiTabs-indicator": { bgcolor: "#007BE0", height: 3 },
        }}
      >
        {DATABASE_CATEGORY_TABS.map((tabLabel) => (
          <Tab key={tabLabel} label={tabLabel} />
        ))}
      </Tabs>

      <Box sx={{ width: "100%", minHeight: 460 }}>
        <DataGrid
          apiRef={apiRef}
          rows={rows}
          columns={activeTable.columns}
          loading={isLoading}
          hideFooter
          disableRowSelectionOnClick
          rowHeight={40}
          slots={{
            toolbar: DatabaseToolbar,
            noRowsOverlay: () => <EmptyOverlay category={safeActiveCategory} />,
          }}
          showToolbar
          sx={{
            border: "none",
            bgcolor: "background.200",
            "& .MuiDataGrid-columnHeaders": {
              bgcolor: "secondary.main",
              borderBottom: "none",
            },
            "& .MuiDataGrid-columnHeader": {
              bgcolor: "secondary.main",
            },
            "& .MuiDataGrid-columnHeaderTitle": {
              color: "common.white",
              fontWeight: 800,
              fontSize: "1rem",
            },
            "& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within": {
              outline: "none",
            },
            "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within": {
              outline: "none",
            },
            "& .MuiDataGrid-iconButtonContainer .MuiSvgIcon-root, & .MuiDataGrid-sortIcon": {
              color: "common.white",
            },
            "& .MuiDataGrid-columnHeader .MuiIconButton-root": {
              width: 18,
              height: 18,
              p: 0,
              borderRadius: 0,
              bgcolor: "transparent",
            },
            "& .MuiDataGrid-columnHeader .MuiIconButton-root:hover": {
              bgcolor: "transparent !important",
            },
            "& .MuiDataGrid-columnHeader .MuiIconButton-root.Mui-focusVisible": {
              bgcolor: "transparent !important",
              outline: "none",
            },
            "& .MuiDataGrid-columnHeader .MuiTouchRipple-root": {
              display: "none",
            },
            "& .MuiDataGrid-columnSeparator": {
              color: "rgba(255,255,255,0.55)",
            },
            "& .MuiDataGrid-columnSeparator svg": {
              display: "none",
            },
            "& .MuiDataGrid-cell": {
              borderBottomColor: "background.200",
              fontSize: "0.85rem",
              color: "text.secondary",
            },
            "& .MuiDataGrid-main": {
              fontSize: "0.85rem",
            },
            "& .MuiDataGrid-toolbarContainer": {
              px: 0.25,
              pb: 0.75,
            },
            "& .MuiDataGrid-toolbarContainer .MuiButton-root": {
              color: "text.secondary",
              textTransform: "none",
              fontSize: "0.78rem",
              fontWeight: 600,
            },
            "& .MuiDataGrid-toolbarContainer .MuiInputBase-root": {
              borderRadius: "10px",
              bgcolor: "background.100",
              fontSize: "0.78rem",
            },
            "& .MuiDataGrid-row:hover": {
              bgcolor: "rgba(83,132,180,0.08)",
            },
          }}
        />
      </Box>
    </Stack>
  );
}
