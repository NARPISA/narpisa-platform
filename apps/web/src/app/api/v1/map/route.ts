import { NextResponse } from "next/server";

import type {
  LicenseMapFeature,
  LicenseMapLayer,
  LicenseMapLayerKey,
  LicenseMapPayload,
  LicenseMapSource,
} from "@/app/map/map-types";
import { createClient } from "@/lib/supabase/server";
import type { Geometry } from "geojson";

export const dynamic = "force-dynamic";

const LAYER_META: Record<LicenseMapLayerKey, { label: string; color: string }> = {
  ml: { label: "Mining License", color: "#2563eb" },
  epl: { label: "Exclusive Prospecting License", color: "#16a34a" },
  clm: { label: "Mining Claim", color: "#f97316" },
  applications: { label: "Applications", color: "#9333ea" },
};
const PAGE_SIZE = 1000;

function firstRecord(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    return (value[0] as Record<string, unknown> | undefined) ?? null;
  }
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function stringValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function nullableString(value: unknown): string | null {
  const text = stringValue(value).trim();
  return text || null;
}

function numericValue(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => stringValue(item).trim()).filter(Boolean);
}

function layerKey(value: unknown): LicenseMapLayerKey {
  const key = stringValue(value).toLowerCase();
  if (key === "ml" || key === "epl" || key === "clm" || key === "applications") {
    return key;
  }
  return "applications";
}

async function fetchAllRows<T>(
  buildQuery: (from: number, to: number) => PromiseLike<{
    data: T[] | null;
    error: { message: string } | null;
  }>,
) {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1;
    const response = await buildQuery(from, to);
    if (response.error) {
      throw new Error(response.error.message);
    }
    const page = response.data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) {
      return rows;
    }
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

    if (claimsError || !claimsData?.claims?.sub) {
      return NextResponse.json({ detail: "Authentication required." }, { status: 401 });
    }

    const { data: canAccessMap, error: accessError } = await supabase.rpc("can_access_map");
    if (accessError) {
      throw new Error(accessError.message);
    }
    if (!canAccessMap) {
      return NextResponse.json(
        { detail: "Gold, Platinum, or Admin access is required for the map." },
        { status: 403 },
      );
    }

    const [geometryRows, sourcesResponse] = await Promise.all([
      fetchAllRows<Record<string, unknown>>((from, to) =>
        supabase
          .from("license_geometries")
          .select(
            `
              id,
              source_layer,
              source_feature_id,
              geometry_geojson,
              properties,
              license:licenses (
                id,
                type,
                region,
                status,
                applicants,
                application_date,
                start_date,
                end_date,
                source_license_no,
                source_status
              )
            `,
          )
          .order("source_layer")
          .order("source_feature_id")
          .range(from, to),
      ),
      supabase
        .from("mme_source_files")
        .select(
          "layer_key,layer_label,content_hash,feature_count,last_fetched_at,last_processed_at",
        )
        .order("layer_key"),
    ]);

    if (sourcesResponse.error) {
      throw new Error(sourcesResponse.error.message);
    }

    const counts: Record<LicenseMapLayerKey, number> = {
      ml: 0,
      epl: 0,
      clm: 0,
      applications: 0,
    };

    const features: LicenseMapFeature[] = geometryRows
      .map((row): LicenseMapFeature | null => {
        const layer = layerKey(row.source_layer);
        const license = firstRecord(row.license);
        const geometry = row.geometry_geojson as Geometry | null;
        if (!geometry || !license) {
          return null;
        }

        counts[layer] += 1;
        return {
          type: "Feature",
          id: numericValue(row.id),
          geometry,
          properties: {
            id: numericValue(row.id),
            licenseId: numericValue(license.id),
            sourceLayer: layer,
            sourceFeatureId: stringValue(row.source_feature_id),
            licenseNo: stringValue(license.source_license_no),
            type: stringValue(license.type) || LAYER_META[layer].label,
            region: stringValue(license.region),
            status: stringValue(license.status),
            sourceStatus: stringValue(license.source_status),
            applicants: stringArray(license.applicants),
            applicationDate: nullableString(license.application_date),
            startDate: nullableString(license.start_date),
            endDate: nullableString(license.end_date),
          },
        };
      })
      .filter((feature): feature is LicenseMapFeature => feature !== null);

    const layers: LicenseMapLayer[] = (Object.keys(LAYER_META) as LicenseMapLayerKey[]).map(
      (key) => ({
        key,
        label: LAYER_META[key].label,
        color: LAYER_META[key].color,
        count: counts[key],
      }),
    );

    const sources: LicenseMapSource[] = (sourcesResponse.data ?? []).map((source) => {
      const key = layerKey(source.layer_key);
      return {
        layerKey: key,
        label: stringValue(source.layer_label) || LAYER_META[key].label,
        contentHash: nullableString(source.content_hash),
        featureCount: numericValue(source.feature_count),
        lastFetchedAt: nullableString(source.last_fetched_at),
        lastProcessedAt: nullableString(source.last_processed_at),
      };
    });

    const payload: LicenseMapPayload = {
      type: "FeatureCollection",
      features,
      layers,
      sources,
    };

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        detail: error instanceof Error ? error.message : "Unable to load map data.",
      },
      { status: 500 },
    );
  }
}
