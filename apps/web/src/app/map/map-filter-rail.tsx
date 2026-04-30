"use client";

import { useMemo, useState } from "react";
import MyLocationRoundedIcon from "@mui/icons-material/MyLocationRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import type { LicenseMapLayerKey, LicenseMapPayload } from "./map-types";

import BrandHomeLink from "@/components/brand-home-link";
import DatabaseHamburgerButton from "@/components/database/database-hamburger-button";

type MapFilterRailProps = {
  drawerOpen: boolean;
  onOpenDrawer: () => void;
  data: LicenseMapPayload | null;
  isLoading: boolean;
  error: string | null;
  accessDenied: boolean;
  activeLayers: Set<LicenseMapLayerKey>;
  activeRegions: Set<string>;
  activeStatuses: Set<string>;
  applicantQuery: string;
  validOnDate: string;
  filteredFeatureCount: number;
  regionOptions: string[];
  statusOptions: string[];
  onToggleLayer: (layer: LicenseMapLayerKey) => void;
  onToggleRegion: (region: string) => void;
  onToggleStatus: (status: string) => void;
  onApplicantQueryChange: (value: string) => void;
  onValidOnDateChange: (value: string) => void;
  onResetFilters: () => void;
  onFit: () => void;
};

function SquareCheckIcon({ checked }: { checked: boolean }) {
  return (
    <Box
      sx={{
        width: 18,
        height: 18,
        bgcolor: checked ? "primary.main" : "common.white",
        border: "1px solid rgba(0,0,0,0.12)",
      }}
    />
  );
}

type CheckboxGroupProps = {
  title: string;
  options: string[];
  selected: Set<string>;
  onToggle: (option: string) => void;
  emptyLabel: string;
  searchable?: boolean;
};

function CheckboxGroup({
  title,
  options,
  selected,
  onToggle,
  emptyLabel,
  searchable = false,
}: CheckboxGroupProps) {
  const [search, setSearch] = useState("");
  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return options;
    }
    return options.filter((option) => option.toLowerCase().includes(query));
  }, [options, search]);
  const hasOptions = options.length > 0;

  return (
    <Stack spacing={1}>
      <Typography sx={{ fontSize: "1rem", color: "background.650", fontWeight: 800 }}>
        {title}
      </Typography>
      {searchable ? (
        <TextField
          size="medium"
          placeholder={`Search ${title.toLowerCase()}`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{
            "& .MuiOutlinedInput-root": {
              height: 42,
              borderRadius: "12px",
              bgcolor: "background.default",
              color: "background.700",
              "& fieldset": { borderColor: "transparent" },
            },
            "& .MuiInputBase-input": {
              fontSize: "0.95rem",
            },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="medium" sx={{ color: "background.500" }} />
                </InputAdornment>
              ),
            },
          }}
        />
      ) : null}
      {!hasOptions ? (
        <Typography sx={{ color: "background.500", fontSize: "0.95rem" }}>
          {emptyLabel}
        </Typography>
      ) : null}
      {hasOptions && filteredOptions.length === 0 ? (
        <Typography sx={{ color: "background.500", fontSize: "0.95rem" }}>
          No options match your search.
        </Typography>
      ) : null}
      <Stack spacing={0.45} sx={{ maxHeight: 220, overflowY: "auto", pr: 0.5 }}>
        {filteredOptions.map((option) => (
          <Stack key={`${title}-${option}`} direction="row" spacing={1} alignItems="center">
            <Checkbox
              checked={selected.has(option)}
              onChange={() => onToggle(option)}
              size="medium"
              icon={<SquareCheckIcon checked={false} />}
              checkedIcon={<SquareCheckIcon checked />}
              sx={{ p: 0.25 }}
            />
            <Typography sx={{ fontSize: "0.98rem", color: "background.650", lineHeight: 1.25 }}>
              {option}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}

export default function MapFilterRail({
  drawerOpen,
  onOpenDrawer,
  data,
  isLoading,
  error,
  accessDenied,
  activeLayers,
  activeRegions,
  activeStatuses,
  applicantQuery,
  validOnDate,
  filteredFeatureCount,
  regionOptions,
  statusOptions,
  onToggleLayer,
  onToggleRegion,
  onToggleStatus,
  onApplicantQueryChange,
  onValidOnDateChange,
  onResetFilters,
  onFit,
}: MapFilterRailProps) {
  return (
    <Box
      component="aside"
      sx={{
        width: { xs: "100%", lg: 390 },
        height: { lg: "100vh" },
        maxHeight: { lg: "100vh" },
        overflowY: "auto",
        bgcolor: "background.300",
        borderRight: { lg: "1px solid" },
        borderColor: "background.200",
        px: 3,
        py: 2.5,
      }}
    >
      <Stack spacing={2.5}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <BrandHomeLink size={72} color="background.700" title="Alluvial AI" subtitle="" />
          <DatabaseHamburgerButton open={drawerOpen} onClick={onOpenDrawer} />
        </Stack>

        <Stack spacing={0.7}>
          <Typography sx={{ color: "background.700", fontWeight: 800, fontSize: "2rem" }}>
            License Map
          </Typography>
          <Typography sx={{ color: "background.500", fontSize: "1rem", lineHeight: 1.35 }}>
            Namibia MME ML, EPL, CLM, and application polygons.
          </Typography>
        </Stack>

        {isLoading ? (
          <Stack direction="row" spacing={1.2} alignItems="center">
            <CircularProgress size={22} />
            <Typography sx={{ color: "background.600", fontSize: "1rem" }}>
              Loading map data...
            </Typography>
          </Stack>
        ) : null}

        {error ? (
          <Alert
            severity={accessDenied ? "warning" : "error"}
            sx={{ "& .MuiAlert-message": { fontSize: "0.9rem" } }}
          >
            {accessDenied
              ? "Map access is available to Gold, Platinum, and Admin users."
              : error}
          </Alert>
        ) : null}

        <Stack spacing={1}>
          <Typography sx={{ color: "background.700", fontWeight: 800, fontSize: "1.05rem" }}>
            Layers
          </Typography>
          {(data?.layers ?? []).map((layer) => (
            <Stack
              key={layer.key}
              direction="row"
              spacing={1}
              alignItems="center"
              justifyContent="space-between"
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Checkbox
                  checked={activeLayers.has(layer.key)}
                  onChange={() => onToggleLayer(layer.key)}
                  size="medium"
                  sx={{ p: 0.35 }}
                />
                <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: layer.color }} />
                <Typography sx={{ color: "background.650", fontSize: "1rem", lineHeight: 1.25 }}>
                  {layer.label}
                </Typography>
              </Stack>
              <Chip label={layer.count} size="medium" />
            </Stack>
          ))}
        </Stack>

        <Divider />

        <TextField
          size="medium"
          label="Applicant or license number"
          value={applicantQuery}
          onChange={(event) => onApplicantQueryChange(event.target.value)}
          sx={{
            "& .MuiInputBase-input": {
              fontSize: "1rem",
            },
            "& .MuiInputLabel-root": {
              fontSize: "1rem",
            },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="medium" />
                </InputAdornment>
              ),
            },
          }}
        />

        <TextField
          size="medium"
          type="date"
          label="Valid on"
          value={validOnDate}
          onChange={(event) => onValidOnDateChange(event.target.value)}
          sx={{
            "& .MuiInputBase-input": {
              fontSize: "1rem",
            },
            "& .MuiInputLabel-root": {
              fontSize: "1rem",
            },
          }}
          slotProps={{ inputLabel: { shrink: true } }}
        />

        <CheckboxGroup
          title="Regions"
          options={regionOptions}
          selected={activeRegions}
          onToggle={onToggleRegion}
          emptyLabel="No regions loaded yet."
          searchable
        />

        <CheckboxGroup
          title="Source Status"
          options={statusOptions}
          selected={activeStatuses}
          onToggle={onToggleStatus}
          emptyLabel="No statuses loaded yet."
        />

        <Stack direction="row" spacing={1}>
          <Button variant="contained" onClick={onResetFilters} size="large">
            Reset
          </Button>
          <Button
            variant="outlined"
            startIcon={<MyLocationRoundedIcon />}
            onClick={onFit}
            disabled={filteredFeatureCount === 0}
            size="large"
          >
            Fit
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
