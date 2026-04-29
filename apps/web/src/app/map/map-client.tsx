"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import LayersRoundedIcon from "@mui/icons-material/LayersRounded";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import maplibregl, {
  type GeoJSONSource,
  type Map as MapLibreMap,
  type StyleSpecification,
} from "maplibre-gl";

import MapFeatureCard from "./map-feature-card";
import MapFilterRail from "./map-filter-rail";
import type { LicenseMapFeature, LicenseMapLayerKey } from "./map-types";
import {
  buildMultiOptions,
  buildOptions,
  featureCollectionBounds,
  featureStatus,
  regionItems,
  toFeatureCollection,
} from "./map-utils";
import { useMapData } from "./use-map-data";

import DatabaseNavDrawer from "@/components/database/database-nav-drawer";

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

export default function MapClient() {
  const { data, isLoading, error, status } = useMapData();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const filteredFeaturesRef = useRef<LicenseMapFeature[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [layerOverride, setLayerOverride] = useState<Set<LicenseMapLayerKey> | null>(null);
  const [statusOverride, setStatusOverride] = useState<Set<string> | null>(null);
  const [regionOverride, setRegionOverride] = useState<Set<string> | null>(null);
  const [applicantQuery, setApplicantQuery] = useState("");
  const [validOnDate, setValidOnDate] = useState("");
  const [selectedFeature, setSelectedFeature] = useState<LicenseMapFeature | null>(null);

  const statusOptions = useMemo(() => {
    return buildOptions(data?.features ?? [], featureStatus);
  }, [data]);

  const regionOptions = useMemo(() => {
    return buildMultiOptions(data?.features ?? [], (feature) =>
      regionItems(feature.properties.region),
    );
  }, [data]);

  const activeLayers = useMemo(
    () => layerOverride ?? new Set(data?.layers.map((layer) => layer.key) ?? []),
    [data, layerOverride],
  );
  const activeStatuses = useMemo(
    () => statusOverride ?? new Set(statusOptions),
    [statusOptions, statusOverride],
  );
  const activeRegions = useMemo(
    () => regionOverride ?? new Set(regionOptions),
    [regionOptions, regionOverride],
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
      if (!regionItems(feature.properties.region).some((region) => activeRegions.has(region))) {
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
  }, [activeLayers, activeRegions, activeStatuses, applicantQuery, data, validOnDate]);

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
        const featureId = Number(event.features?.[0]?.properties?.id);
        const feature = filteredFeaturesRef.current.find(
          (item) => item.properties.id === featureId,
        );
        if (!feature) {
          return;
        }
        setSelectedFeature(feature);
        const bounds = featureCollectionBounds([feature]);
        if (bounds) {
          map.fitBounds(bounds, { padding: 64, maxZoom: 11.5, duration: 700 });
        }
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

  function zoomToFeatures(features: LicenseMapFeature[], maxZoom = 10) {
    const map = mapRef.current;
    const bounds = featureCollectionBounds(features);
    if (!map || !bounds) {
      return;
    }
    map.fitBounds(bounds, { padding: 64, maxZoom, duration: 700 });
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

  function toggleRegion(option: string) {
    setRegionOverride((current) => {
      const next = new Set(current ?? activeRegions);
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
    setRegionOverride(null);
    setApplicantQuery("");
    setValidOnDate("");
    setSelectedFeature(null);
  }

  const accessDenied = status === 403;

  return (
    <Box component="main" sx={{ height: "100vh", overflow: "hidden", bgcolor: "background.100" }}>
      <Stack direction={{ xs: "column", lg: "row" }} sx={{ height: "100vh", minHeight: 0 }}>
        <MapFilterRail
          drawerOpen={drawerOpen}
          onOpenDrawer={() => setDrawerOpen(true)}
          data={data}
          isLoading={isLoading}
          error={error}
          accessDenied={accessDenied}
          activeLayers={activeLayers}
          activeRegions={activeRegions}
          activeStatuses={activeStatuses}
          applicantQuery={applicantQuery}
          validOnDate={validOnDate}
          filteredFeatureCount={filteredFeatures.length}
          regionOptions={regionOptions}
          statusOptions={statusOptions}
          onToggleLayer={toggleLayer}
          onToggleRegion={toggleRegion}
          onToggleStatus={toggleStatus}
          onApplicantQueryChange={setApplicantQuery}
          onValidOnDateChange={setValidOnDate}
          onResetFilters={resetFilters}
          onFit={() => zoomToFeatures(filteredFeatures, 10)}
        />

        <DatabaseNavDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          activeLabel="Map"
        />

        <Box sx={{ flex: 1, minWidth: 0, position: "relative", height: "100vh" }}>
          <Box ref={mapContainerRef} sx={{ position: "absolute", inset: 0 }} />

          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{
              position: "absolute",
              top: 16,
              left: 16,
              px: 1.6,
              py: 1.1,
              borderRadius: 2,
              bgcolor: "rgba(255,255,255,0.92)",
              boxShadow: 3,
              zIndex: 1,
            }}
          >
            <LayersRoundedIcon fontSize="medium" />
            <Typography sx={{ fontWeight: 800, fontSize: "1rem" }}>
              {filteredFeatures.length} visible features
            </Typography>
          </Stack>

          {selectedFeature ? (
            <MapFeatureCard
              feature={selectedFeature}
              onClose={() => setSelectedFeature(null)}
            />
          ) : null}
        </Box>
      </Stack>
    </Box>
  );
}
