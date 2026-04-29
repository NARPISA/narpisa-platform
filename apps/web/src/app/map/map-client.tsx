"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import LayersRoundedIcon from "@mui/icons-material/LayersRounded";
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
import maplibregl, {
  type GeoJSONSource,
  type Map as MapLibreMap,
  type StyleSpecification,
} from "maplibre-gl";
import type { FeatureCollection, Geometry } from "geojson";

import type {
  LicenseMapFeature,
  LicenseMapFeatureProperties,
  LicenseMapLayerKey,
} from "./map-types";
import { useMapData } from "./use-map-data";

import BrandHomeLink from "@/components/brand-home-link";

const BASE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

const DEFAULT_CENTER: [number, number] = [17.0832, -22.9576];

function featureStatus(feature: LicenseMapFeature) {
  return feature.properties.sourceStatus || feature.properties.status || "Unknown";
}

function collectCoordinates(value: unknown, points: Array<[number, number]>) {
  if (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  ) {
    points.push([value[0], value[1]]);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectCoordinates(item, points));
  }
}

function collectGeometryCoordinates(geometry: Geometry, points: Array<[number, number]>) {
  if (geometry.type === "GeometryCollection") {
    geometry.geometries.forEach((item) => collectGeometryCoordinates(item, points));
    return;
  }

  collectCoordinates(geometry.coordinates, points);
}

function featureCollectionBounds(features: LicenseMapFeature[]) {
  const points: Array<[number, number]> = [];
  features.forEach((feature) => {
    collectGeometryCoordinates(feature.geometry, points);
  });
  if (points.length === 0) {
    return null;
  }
  const bounds = new maplibregl.LngLatBounds(points[0], points[0]);
  points.slice(1).forEach((point) => bounds.extend(point));
  return bounds;
}

function toFeatureCollection(features: LicenseMapFeature[]) {
  return {
    type: "FeatureCollection",
    features,
  } satisfies FeatureCollection<Geometry, LicenseMapFeatureProperties>;
}

export default function MapClient() {
  const { data, isLoading, error, status } = useMapData();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const filteredFeaturesRef = useRef<LicenseMapFeature[]>([]);
  const [layerOverride, setLayerOverride] = useState<Set<LicenseMapLayerKey> | null>(null);
  const [statusOverride, setStatusOverride] = useState<Set<string> | null>(null);
  const [applicantQuery, setApplicantQuery] = useState("");
  const [validOnDate, setValidOnDate] = useState("");
  const [selectedFeature, setSelectedFeature] = useState<LicenseMapFeature | null>(null);

  const statusOptions = useMemo(() => {
    const values = new Set<string>();
    data?.features.forEach((feature) => values.add(featureStatus(feature)));
    return Array.from(values).sort((left, right) => left.localeCompare(right));
  }, [data]);

  const activeLayers = useMemo(
    () => layerOverride ?? new Set(data?.layers.map((layer) => layer.key) ?? []),
    [data, layerOverride],
  );
  const activeStatuses = useMemo(
    () => statusOverride ?? new Set(statusOptions),
    [statusOptions, statusOverride],
  );

  const filteredFeatures = useMemo(() => {
    const query = applicantQuery.trim().toLowerCase();
    const validOn = validOnDate ? new Date(validOnDate) : null;

    return (data?.features ?? []).filter((feature) => {
      if (!activeLayers.has(feature.properties.sourceLayer)) {
        return false;
      }
      if (!activeStatuses.has(featureStatus(feature))) {
        return false;
      }
      if (
        query &&
        !feature.properties.applicants.some((applicant) =>
          applicant.toLowerCase().includes(query),
        ) &&
        !feature.properties.licenseNo.toLowerCase().includes(query)
      ) {
        return false;
      }
      if (validOn) {
        const start = feature.properties.startDate
          ? new Date(feature.properties.startDate)
          : null;
        const end = feature.properties.endDate ? new Date(feature.properties.endDate) : null;
        if (start && start > validOn) {
          return false;
        }
        if (end && end < validOn) {
          return false;
        }
      }
      return true;
    });
  }, [activeLayers, activeStatuses, applicantQuery, data, validOnDate]);

  useEffect(() => {
    filteredFeaturesRef.current = filteredFeatures;
  }, [filteredFeatures]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: BASE_STYLE,
      center: DEFAULT_CENTER,
      zoom: 5,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    map.on("load", () => {
      map.addSource("licenses", {
        type: "geojson",
        data: toFeatureCollection(filteredFeaturesRef.current),
      });
      map.addLayer({
        id: "license-fill",
        type: "fill",
        source: "licenses",
        paint: {
          "fill-color": [
            "match",
            ["get", "sourceLayer"],
            "ml",
            "#2563eb",
            "epl",
            "#16a34a",
            "clm",
            "#f97316",
            "applications",
            "#9333ea",
            "#64748b",
          ],
          "fill-opacity": 0.38,
        },
      });
      map.addLayer({
        id: "license-line",
        type: "line",
        source: "licenses",
        paint: {
          "line-color": [
            "match",
            ["get", "sourceLayer"],
            "ml",
            "#1d4ed8",
            "epl",
            "#15803d",
            "clm",
            "#c2410c",
            "applications",
            "#7e22ce",
            "#334155",
          ],
          "line-width": 1.4,
        },
      });

      map.on("click", "license-fill", (event) => {
        const feature = event.features?.[0] as LicenseMapFeature | undefined;
        setSelectedFeature(feature ?? null);
      });
      map.on("mouseenter", "license-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "license-fill", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    const updateSource = () => {
      const source = map.getSource("licenses") as GeoJSONSource | undefined;
      source?.setData(toFeatureCollection(filteredFeatures));
    };
    if (!map.isStyleLoaded()) {
      map.once("load", updateSource);
      return () => {
        map.off("load", updateSource);
      };
    }
    updateSource();
  }, [filteredFeatures]);

  function fitFilteredFeatures() {
    const map = mapRef.current;
    const bounds = featureCollectionBounds(filteredFeatures);
    if (!map || !bounds) {
      return;
    }
    map.fitBounds(bounds, { padding: 48, maxZoom: 10, duration: 700 });
  }

  function toggleLayer(layer: LicenseMapLayerKey) {
    setLayerOverride((current) => {
      const next = new Set(current ?? activeLayers);
      if (next.has(layer)) {
        next.delete(layer);
      } else {
        next.add(layer);
      }
      return next;
    });
  }

  function toggleStatus(option: string) {
    setStatusOverride((current) => {
      const next = new Set(current ?? activeStatuses);
      if (next.has(option)) {
        next.delete(option);
      } else {
        next.add(option);
      }
      return next;
    });
  }

  function resetFilters() {
    setLayerOverride(null);
    setStatusOverride(null);
    setApplicantQuery("");
    setValidOnDate("");
    setSelectedFeature(null);
  }

  const accessDenied = status === 403;

  return (
    <Box component="main" sx={{ minHeight: "100vh", bgcolor: "background.100" }}>
      <Stack direction={{ xs: "column", lg: "row" }} sx={{ minHeight: "100vh" }}>
        <Box
          component="aside"
          sx={{
            width: { xs: "100%", lg: 340 },
            bgcolor: "background.300",
            borderRight: { lg: "1px solid" },
            borderColor: "background.200",
            px: 3,
            py: 2.5,
          }}
        >
          <Stack spacing={2.4}>
            <BrandHomeLink size={70} color="background.700" title="Alluvial AI" subtitle="" />
            <Stack spacing={0.5}>
              <Typography sx={{ color: "background.700", fontWeight: 800, fontSize: "1.85rem" }}>
                License Map
              </Typography>
              <Typography sx={{ color: "background.500", fontSize: "0.88rem" }}>
                Namibia MME ML, EPL, CLM, and application polygons.
              </Typography>
            </Stack>

            {isLoading ? (
              <Stack direction="row" spacing={1.2} alignItems="center">
                <CircularProgress size={18} />
                <Typography sx={{ color: "background.600", fontSize: "0.86rem" }}>
                  Loading map data...
                </Typography>
              </Stack>
            ) : null}

            {error ? (
              <Alert severity={accessDenied ? "warning" : "error"}>
                {accessDenied
                  ? "Map access is available to Gold, Platinum, and Admin users."
                  : error}
              </Alert>
            ) : null}

            <Stack spacing={1}>
              <Typography sx={{ color: "background.700", fontWeight: 700 }}>
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
                  <Stack direction="row" spacing={0.8} alignItems="center">
                    <Checkbox
                      checked={activeLayers.has(layer.key)}
                      onChange={() => toggleLayer(layer.key)}
                      size="small"
                    />
                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: layer.color }} />
                    <Typography sx={{ color: "background.650", fontSize: "0.86rem" }}>
                      {layer.label}
                    </Typography>
                  </Stack>
                  <Chip label={layer.count} size="small" />
                </Stack>
              ))}
            </Stack>

            <Divider />

            <TextField
              size="small"
              label="Applicant or license number"
              value={applicantQuery}
              onChange={(event) => setApplicantQuery(event.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <TextField
              size="small"
              type="date"
              label="Valid on"
              value={validOnDate}
              onChange={(event) => setValidOnDate(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />

            <Stack spacing={1}>
              <Typography sx={{ color: "background.700", fontWeight: 700 }}>
                Source Status
              </Typography>
              {statusOptions.length === 0 ? (
                <Typography sx={{ color: "background.500", fontSize: "0.82rem" }}>
                  No statuses loaded yet.
                </Typography>
              ) : null}
              {statusOptions.map((option) => (
                <Stack key={option} direction="row" spacing={0.8} alignItems="center">
                  <Checkbox
                    checked={activeStatuses.has(option)}
                    onChange={() => toggleStatus(option)}
                    size="small"
                  />
                  <Typography sx={{ color: "background.650", fontSize: "0.84rem" }}>
                    {option}
                  </Typography>
                </Stack>
              ))}
            </Stack>

            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={resetFilters}>
                Reset
              </Button>
              <Button
                variant="outlined"
                startIcon={<MyLocationRoundedIcon />}
                onClick={fitFilteredFeatures}
                disabled={filteredFeatures.length === 0}
              >
                Fit
              </Button>
            </Stack>
          </Stack>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0, position: "relative", minHeight: { xs: 560, lg: "100vh" } }}>
          <Box ref={mapContainerRef} sx={{ position: "absolute", inset: 0 }} />

          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{
              position: "absolute",
              top: 16,
              left: 16,
              px: 1.4,
              py: 1,
              borderRadius: 2,
              bgcolor: "rgba(255,255,255,0.92)",
              boxShadow: 3,
              zIndex: 1,
            }}
          >
            <LayersRoundedIcon fontSize="small" />
            <Typography sx={{ fontWeight: 700, fontSize: "0.86rem" }}>
              {filteredFeatures.length} visible features
            </Typography>
          </Stack>

          {selectedFeature ? (
            <Box
              sx={{
                position: "absolute",
                right: 16,
                bottom: 16,
                width: { xs: "calc(100% - 32px)", sm: 360 },
                bgcolor: "rgba(255,255,255,0.96)",
                boxShadow: 5,
                borderRadius: 2,
                p: 2,
                zIndex: 1,
              }}
            >
              <Stack spacing={1}>
                <Typography sx={{ fontWeight: 800, color: "background.700" }}>
                  {selectedFeature.properties.licenseNo || "License"}
                </Typography>
                <Typography sx={{ color: "background.600", fontSize: "0.9rem" }}>
                  {selectedFeature.properties.type}
                </Typography>
                <Divider />
                <Typography sx={{ fontSize: "0.84rem" }}>
                  Region: {selectedFeature.properties.region || "Unknown"}
                </Typography>
                <Typography sx={{ fontSize: "0.84rem" }}>
                  Source status: {featureStatus(selectedFeature)}
                </Typography>
                <Typography sx={{ fontSize: "0.84rem" }}>
                  Applicants: {selectedFeature.properties.applicants.join(", ") || "Unknown"}
                </Typography>
                <Typography sx={{ fontSize: "0.84rem" }}>
                  Valid: {selectedFeature.properties.startDate ?? "Unknown"} to{" "}
                  {selectedFeature.properties.endDate ?? "Unknown"}
                </Typography>
                <Button size="small" onClick={() => setSelectedFeature(null)}>
                  Close
                </Button>
              </Stack>
            </Box>
          ) : null}
        </Box>
      </Stack>
    </Box>
  );
}
