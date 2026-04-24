"use client";

import Box from "@mui/material/Box";
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
  DATABASE_METRIC_YEARS,
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
        No {category.toLowerCase()} match the current view.
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

function buildMetricColumns(
  leadingField: "commodity" | "waterType",
  leadingHeader: string,
): GridColDef<DatabaseRow>[] {
  return [
    { field: "site", headerName: "Site", minWidth: 170, flex: 1.1 },
    { field: leadingField, headerName: leadingHeader, minWidth: 140, flex: 0.9 },
    { field: "product", headerName: "Product", minWidth: 190, flex: 1.2 },
    { field: "unit", headerName: "Unit", minWidth: 100, flex: 0.7 },
    ...DATABASE_METRIC_YEARS.map(
      (year) =>
        ({
          field: `year_${year}`,
          headerName: String(year),
          minWidth: 86,
          flex: 0.56,
          align: "center",
          headerAlign: "center",
          sortable: false,
        }) satisfies GridColDef<DatabaseRow>,
    ),
    {
      field: "annual",
      headerName: "Annual",
      minWidth: 94,
      flex: 0.62,
      align: "center",
      headerAlign: "center",
      sortable: false,
    },
    {
      field: "lom",
      headerName: "LOM",
      minWidth: 82,
      flex: 0.56,
      align: "center",
      headerAlign: "center",
      sortable: false,
    },
  ];
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
          { field: "mine", headerName: "Mine", flex: 1.2, minWidth: 170, headerAlign: "left" },
          { field: "owner", headerName: "Owner", flex: 1.2, minWidth: 170 },
          { field: "country", headerName: "Country", flex: 0.9, minWidth: 130 },
          { field: "type", headerName: "Type", flex: 1, minWidth: 160 },
          { field: "stage", headerName: "Stage", flex: 0.9, minWidth: 130 },
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
          { field: "commodities", headerName: "Commodities", flex: 1.1, minWidth: 180 },
          { field: "lifetimeOfMine", headerName: "Life (yrs)", flex: 0.75, minWidth: 110 },
          { field: "pitDepth", headerName: "Pit Depth", flex: 0.8, minWidth: 110 },
          { field: "shaftDepth", headerName: "Shaft Depth", flex: 0.8, minWidth: 120 },
        ],
      },
      "Commodity Metrics": {
        columns: buildMetricColumns("commodity", "Commodity"),
      },
      "Water Metrics": {
        columns: buildMetricColumns("waterType", "Water Type"),
      },
      Licenses: {
        columns: [
          { field: "type", headerName: "Type", flex: 1, minWidth: 150 },
          { field: "country", headerName: "Country", flex: 1, minWidth: 130 },
          { field: "region", headerName: "Region", flex: 1, minWidth: 140 },
          { field: "status", headerName: "Status", flex: 0.8, minWidth: 120 },
          { field: "applicants", headerName: "Applicants", flex: 1.4, minWidth: 240 },
          { field: "applicationDate", headerName: "Applied", flex: 0.8, minWidth: 120 },
          { field: "startDate", headerName: "Start", flex: 0.8, minWidth: 120 },
          { field: "endDate", headerName: "End", flex: 0.8, minWidth: 120 },
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
          columnHeaderHeight={44}
          pagination
          pageSizeOptions={[20, 50, 100]}
          initialState={{
            pagination: {
              paginationModel: {
                pageSize: 20,
                page: 0,
              },
            },
          }}
          disableRowSelectionOnClick
          hideFooterSelectedRowCount
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
              fontSize: activeCategory.includes("Metrics") ? "0.9rem" : "1rem",
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
            "& .MuiDataGrid-footerContainer": {
              minHeight: 40,
              borderTopColor: "background.300",
              color: "text.secondary",
            },
            "& .MuiTablePagination-root": {
              fontSize: "0.74rem",
            },
            "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
              fontSize: "0.74rem",
              margin: 0,
            },
            "& .MuiTablePagination-select": {
              fontSize: "0.74rem",
              py: 0.25,
            },
            "& .MuiTablePagination-actions button": {
              p: 0.5,
            },
          }}
        />
      </Box>
    </Stack>
  );
}
