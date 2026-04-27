"use client";

import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import CircularProgress from "@mui/material/CircularProgress";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";
import {
  type DatabaseCategory,
  type DatabaseFilterGroup,
} from "@/app/database/database-types";
import BrandHomeLink from "@/components/brand-home-link";
import DatabaseHamburgerButton from "./database-hamburger-button";

type DatabaseFilterRailProps = {
  menuOpen: boolean;
  onOpenMenu: () => void;
  activeCategory: DatabaseCategory;
  filterGroups: DatabaseFilterGroup[];
  onToggleFilterOption: (groupIndex: number, optionIndex: number) => void;
  onResetFilters: () => void;
  onExportCsv: () => void;
  onExportPdf: () => void;
  isAdmin: boolean;
  hasPendingChanges: boolean;
  isSaving: boolean;
  pendingChangeCount: number;
  onSaveChanges: () => void;
};

type SearchableFilterOption = DatabaseFilterGroup["options"][number] & {
  sourceOptionIndex: number;
};

type SearchableFilterGroup = Omit<DatabaseFilterGroup, "options"> & {
  sourceGroupIndex: number;
  options: SearchableFilterOption[];
};

export default function DatabaseFilterRail({
  menuOpen,
  onOpenMenu,
  activeCategory,
  filterGroups,
  onToggleFilterOption,
  onResetFilters,
  onExportCsv,
  onExportPdf,
  isAdmin,
  hasPendingChanges,
  isSaving,
  pendingChangeCount,
  onSaveChanges,
}: DatabaseFilterRailProps) {
  const [optionSearch, setOptionSearch] = useState("");
  const filteredGroups: SearchableFilterGroup[] = useMemo(() => {
    const query = optionSearch.trim().toLowerCase();
    if (!query) {
      return filterGroups.map((group, sourceGroupIndex) => ({
        ...group,
        sourceGroupIndex,
        options: group.options.map((option, sourceOptionIndex) => ({
          ...option,
          sourceOptionIndex,
        })),
      }));
    }
    return filterGroups
      .map((group, sourceGroupIndex) => ({
        ...group,
        sourceGroupIndex,
        options: group.options
          .map((option, sourceOptionIndex) => ({ ...option, sourceOptionIndex }))
          .filter((option) => option.label.toLowerCase().includes(query)),
      }))
      .filter((group) => group.options.length > 0);
  }, [filterGroups, optionSearch]);

  return (
    <Box
      sx={{
        width: { xs: "100%", lg: 310 },
        bgcolor: "background.300",
        px: 3,
        py: 2,
        borderRight: { lg: "1px solid" },
        borderColor: "background.200",
      }}
    >
      <Stack spacing={2.5}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <BrandHomeLink size={70} color="background.700" title="MineralDB" subtitle="" />
          <DatabaseHamburgerButton open={menuOpen} onClick={onOpenMenu} />
        </Stack>

        <Typography sx={{ fontSize: "1.8rem", color: "background.600", fontWeight: 600 }}>
          Categories
        </Typography>

        <TextField
          size="small"
          placeholder="Search filter options"
          value={optionSearch}
          onChange={(event) => setOptionSearch(event.target.value)}
          sx={{
            "& .MuiOutlinedInput-root": {
              height: 30,
              borderRadius: "10px",
              bgcolor: "background.default",
              color: "background.700",
              "& fieldset": { borderColor: "transparent" },
            },
            "& .MuiInputBase-input": {
              py: 0.5,
              fontSize: "0.75rem",
              lineHeight: 1.2,
            },
            "& .MuiInputBase-input::placeholder": {
              color: "background.500",
              opacity: 1,
              fontSize: "0.72rem",
              fontWeight: 600,
            },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" sx={{ color: "background.500" }} />
                </InputAdornment>
              ),
            },
          }}
        />

        {filteredGroups.length === 0 ? (
          <Typography sx={{ fontSize: "0.78rem", color: "background.500" }}>
            No options match your search.
          </Typography>
        ) : null}

        {filteredGroups.map((group) => (
          <Stack spacing={0.25} key={`${activeCategory}-${group.title}`}>
            <Typography sx={{ fontSize: "0.8rem", color: "background.600", fontWeight: 700 }}>
              {group.title}
            </Typography>
            {group.options.map((option) => (
              <Stack key={`${group.title}-${option.label}`} direction="row" spacing={0.8} alignItems="center">
                <Checkbox
                  checked={Boolean(option.checked)}
                  onChange={() =>
                    onToggleFilterOption(group.sourceGroupIndex, option.sourceOptionIndex)
                  }
                  size="small"
                  icon={
                    <Box
                      sx={{
                        width: 14,
                        height: 14,
                        bgcolor: "common.white",
                        border: "1px solid rgba(0,0,0,0.08)",
                      }}
                    />
                  }
                  checkedIcon={
                    <Box
                      sx={{
                        width: 14,
                        height: 14,
                        bgcolor: "primary.main",
                      }}
                    />
                  }
                  sx={{ p: 0.2 }}
                />
                <Typography sx={{ fontSize: "0.82rem", color: "background.600" }}>
                  {option.label}
                </Typography>
              </Stack>
            ))}
          </Stack>
        ))}

        <Stack direction="row" spacing={1.5} justifyContent="space-between" pt={2}>
          <Button
            variant="contained"
            onClick={onResetFilters}
            sx={{
              width: 96,
              minWidth: 96,
              height: 32,
              borderRadius: 0,
              bgcolor: "common.white",
              color: "#272727",
              fontSize: "0.85rem",
              fontWeight: 700,
            }}
          >
            Reset
          </Button>
        </Stack>

        {isAdmin ? (
          <Stack spacing={0.75}>
            <Typography sx={{ fontSize: "0.8rem", color: "background.600", fontWeight: 700 }}>
              Admin changes
            </Typography>
            <Button
              variant="contained"
              disabled={!hasPendingChanges || isSaving}
              onClick={onSaveChanges}
              startIcon={
                isSaving ? (
                  <CircularProgress size={14} sx={{ color: "common.white" }} />
                ) : (
                  <SaveRoundedIcon fontSize="small" />
                )
              }
              sx={{
                width: 1,
                height: 36,
                borderRadius: 0,
                bgcolor: hasPendingChanges ? "tertiary.main" : "background.500",
                color: "common.white",
                fontSize: "0.85rem",
                fontWeight: 700,
                "&.Mui-disabled": {
                  bgcolor: "background.500",
                  color: "common.white",
                },
              }}
            >
              {isSaving
                ? "Saving..."
                : hasPendingChanges
                  ? `Save ${pendingChangeCount} change${pendingChangeCount === 1 ? "" : "s"}`
                  : "No changes"}
            </Button>
          </Stack>
        ) : null}

        <Stack direction="row" spacing={1.5} justifyContent="space-between">
          <Button
            variant="contained"
            onClick={onExportCsv}
            startIcon={<DownloadRoundedIcon fontSize="small" />}
            sx={{
              width: 106,
              minWidth: 106,
              height: 36,
              borderRadius: 0,
              bgcolor: "primary.main",
              color: "common.white",
              fontSize: "0.9rem",
              fontWeight: 700,
            }}
          >
            CSV
          </Button>
          <Button
            variant="contained"
            onClick={onExportPdf}
            startIcon={<DownloadRoundedIcon fontSize="small" />}
            sx={{
              width: 106,
              minWidth: 106,
              height: 36,
              borderRadius: 0,
              bgcolor: "#007BE0",
              color: "common.white",
              fontSize: "0.9rem",
              fontWeight: 700,
            }}
          >
            PDF
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
