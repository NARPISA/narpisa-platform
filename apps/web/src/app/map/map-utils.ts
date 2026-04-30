import maplibregl from "maplibre-gl";
import type { FeatureCollection, Geometry } from "geojson";

import type { LicenseMapFeature, LicenseMapFeatureProperties } from "./map-types";

export function featureStatus(feature: LicenseMapFeature) {
  return feature.properties.sourceStatus || feature.properties.status || "Unknown";
}

export function optionLabel(value: string) {
  return value.trim() || "Unknown";
}

export function applicantLabel(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean).join(", ");
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        return applicantLabel(parsed);
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }
  return "";
}

export function applicantItems(value: unknown) {
  return applicantLabel(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function regionItems(value: string) {
  return value
    .split(",")
    .map((item) => optionLabel(item))
    .filter(Boolean);
}

export function buildOptions(
  features: LicenseMapFeature[],
  getValue: (feature: LicenseMapFeature) => string,
) {
  return Array.from(new Set(features.map((feature) => optionLabel(getValue(feature)))))
    .sort((left, right) => left.localeCompare(right));
}

export function buildMultiOptions(
  features: LicenseMapFeature[],
  getValues: (feature: LicenseMapFeature) => string[],
) {
  return Array.from(
    new Set(features.flatMap((feature) => getValues(feature).map(optionLabel))),
  ).sort((left, right) => left.localeCompare(right));
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

export function featureCollectionBounds(features: LicenseMapFeature[]) {
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

export function toFeatureCollection(features: LicenseMapFeature[]) {
  return {
    type: "FeatureCollection",
    features,
  } satisfies FeatureCollection<Geometry, LicenseMapFeatureProperties>;
}
