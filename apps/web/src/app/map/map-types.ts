import type { Feature, Geometry } from "geojson";

export type LicenseMapLayerKey = "ml" | "epl" | "clm" | "applications";

export type LicenseMapLayer = {
  key: LicenseMapLayerKey;
  label: string;
  color: string;
  count: number;
};

export type LicenseMapSource = {
  layerKey: LicenseMapLayerKey;
  label: string;
  contentHash: string | null;
  featureCount: number;
  lastFetchedAt: string | null;
  lastProcessedAt: string | null;
};

export type LicenseMapFeatureProperties = {
  id: number;
  licenseId: number;
  sourceLayer: LicenseMapLayerKey;
  sourceFeatureId: string;
  licenseNo: string;
  type: string;
  region: string;
  status: string;
  sourceStatus: string;
  applicants: string[];
  applicationDate: string | null;
  startDate: string | null;
  endDate: string | null;
};

export type LicenseMapFeature = Feature<Geometry, LicenseMapFeatureProperties>;

export type LicenseMapPayload = {
  type: "FeatureCollection";
  features: LicenseMapFeature[];
  layers: LicenseMapLayer[];
  sources: LicenseMapSource[];
};
