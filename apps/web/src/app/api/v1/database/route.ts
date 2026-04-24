import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import type {
  DatabaseCategory,
  DatabaseDataPayload,
  DatabaseFilterGroup,
  DatabaseRow,
} from "@/app/database/database-types";
import { DATABASE_METRIC_YEARS } from "@/app/database/database-types";

export const dynamic = "force-dynamic";

const EMPTY_TABLES: Record<DatabaseCategory, DatabaseRow[]> = {
  Mines: [],
  "Commodity Metrics": [],
  "Water Metrics": [],
  Licenses: [],
};

function createSupabaseRouteClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing public Supabase environment variables.");
  }

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function ensureArray<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) {
    return value;
  }

  return value == null ? [] : [value];
}

function firstRecord(value: unknown): Record<string, unknown> | null {
  const first = ensureArray(value as Record<string, unknown> | Record<string, unknown>[])[0];
  return first ?? null;
}

function stringValue(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return null;
}

function numericValue(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function relationField(
  value: unknown,
  field: string,
): string | number | boolean | null {
  const record = firstRecord(value);
  if (!record) {
    return null;
  }

  const result = record[field];
  if (
    typeof result === "string" ||
    typeof result === "number" ||
    typeof result === "boolean"
  ) {
    return result;
  }

  return null;
}

function provenanceField(value: unknown, field: string) {
  if (!value || typeof value !== "object") {
    return null;
  }

  return stringValue((value as Record<string, unknown>)[field]);
}

function titleizeEnum(value: string | null) {
  if (!value) {
    return "";
  }

  if (value === "pea" || value === "pfs" || value === "fs") {
    return value.toUpperCase();
  }

  return value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function compactJoin(values: Array<string | null | undefined>, separator = ", ") {
  return values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join(separator);
}

function cleanMetricLabel(value: string | null) {
  if (!value) {
    return "";
  }

  return value.replace(/\*+$/g, "").replace(/\s+/g, " ").trim();
}

function stripMetricUnit(value: string | null) {
  return cleanMetricLabel(value).replace(/\s*\([^)]*\)\s*$/g, "").trim();
}

function formatMetricValue(value: number | null) {
  if (value === null) {
    return "-";
  }

  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(2).replace(/\.00$/, "");
}

function metricYearField(year: number) {
  return `year_${year}`;
}

type MetricExtraFields = Record<string, string | number | boolean | null | undefined>;

function buildMetricBaseRow(id: number, extra: MetricExtraFields): DatabaseRow {
  return {
    id,
    ...Object.fromEntries(DATABASE_METRIC_YEARS.map((year) => [metricYearField(year), "-"])),
    annual: "-",
    lom: "-",
    ...extra,
  };
}

function inferCommodityLabel(...sources: Array<string | null>) {
  const haystack = sources
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();

  const keywords: Array<[RegExp, string]> = [
    [/\blead\b/, "Lead"],
    [/\bzinc\b/, "Zinc"],
    [/\bcopper\b/, "Copper"],
    [/\bgold\b/, "Gold"],
    [/\buranium\b/, "Uranium"],
    [/\bdiamond|\bcarat/, "Diamond"],
    [/\btin\b/, "Tin"],
    [/\bfluorspar\b/, "Fluorspar"],
    [/\biron ore\b/, "Iron Ore"],
    [/\bgraphite\b/, "Graphite"],
    [/\bsalt\b/, "Salt"],
    [/\bcement\b/, "Cement"],
  ];

  for (const [pattern, label] of keywords) {
    if (pattern.test(haystack)) {
      return label;
    }
  }

  return "Unknown";
}

function buildCommodityProduct(
  rowLabel: string | null,
  siteName: string,
  fallback: string,
) {
  const cleaned = stripMetricUnit(rowLabel);
  if (!cleaned) {
    return fallback;
  }

  if (cleaned.toLowerCase() === cleanMetricLabel(siteName).toLowerCase()) {
    return fallback;
  }

  return cleaned;
}

type MetricPivotSourceRow = {
  site: string;
  project: string;
  unit: string;
  year: number | null;
  value: number | null;
  metric: string;
  product: string;
  commodity?: string;
  waterType?: string;
};

function pivotMetricRows(
  rows: MetricPivotSourceRow[],
  kind: "commodity" | "water",
): DatabaseRow[] {
  const grouped = new Map<string, DatabaseRow>();

  rows.forEach((row, index) => {
    const groupKey = [
      row.site,
      row.project,
      row.unit,
      row.metric,
      row.product,
      row.commodity ?? "",
      row.waterType ?? "",
    ].join("::");

    const existing = grouped.get(groupKey);
    const baseRow: DatabaseRow =
      existing ??
      buildMetricBaseRow(index + 1, {
        site: row.site,
        project: row.project,
        unit: row.unit || "-",
        product: row.product || row.metric,
        ...(kind === "commodity"
          ? { commodity: row.commodity ?? "Unknown" }
          : { waterType: row.waterType ?? row.metric }),
      });

    if (row.year !== null && DATABASE_METRIC_YEARS.includes(row.year)) {
      baseRow[metricYearField(row.year)] = formatMetricValue(row.value);
    }

    if (baseRow.annual === "-" && row.value !== null) {
      baseRow.annual = formatMetricValue(row.value);
    }

    grouped.set(groupKey, baseRow);
  });

  return Array.from(grouped.values()).sort((left, right) =>
    String(
      kind === "commodity" ? left.commodity ?? "" : left.waterType ?? "",
    ).localeCompare(
      String(kind === "commodity" ? right.commodity ?? "" : right.waterType ?? ""),
    ) ||
    String(left.product ?? "").localeCompare(String(right.product ?? "")) ||
    String(left.site ?? "").localeCompare(String(right.site ?? "")),
  );
}

function buildFilterGroup(
  rows: DatabaseRow[],
  title: string,
  field: string,
): DatabaseFilterGroup | null {
  const options = Array.from(
    new Set(
      rows
        .map((row) => row[field])
        .map((value) => stringValue(value))
        .filter((value): value is string => Boolean(value)),
    ),
  )
    .sort((left, right) => left.localeCompare(right))
    .map((label) => ({ label, checked: true }));

  if (options.length === 0) {
    return null;
  }

  return { title, field, options };
}

function withGroups(
  rows: DatabaseRow[],
  groups: Array<DatabaseFilterGroup | null>,
) {
  return groups.filter((group): group is DatabaseFilterGroup => group !== null);
}

export async function GET() {
  try {
    const supabase = createSupabaseRouteClient();

    const [
      sitesResponse,
      commodityMetricsResponse,
      waterMetricsResponse,
      licensesResponse,
    ] = await Promise.all([
      supabase
        .from("sites")
        .select(
          `
            id,
            name,
            owner,
            status,
            site_type,
            country:countries(name),
            site_data(stage, latitude, longitude, lifetime_of_mine_years),
            open_air_sites(pit_depth, surface_area),
            underground_sites(shaft_depth, tunnel_length),
            site_commodities(commodity:commodities(name))
          `,
        )
        .order("name"),
      supabase
        .from("site_commodity_metrics")
        .select(
          `
            id,
            yr,
            value_numeric,
            unit,
            project_label,
            site:sites(name),
            commodity:commodities(name),
            definition:site_commodity_metric_definitions(label),
            fact:site_facts(provenance)
          `,
        )
        .order("yr", { ascending: false }),
      supabase
        .from("site_water_metrics")
        .select(
          `
            id,
            yr,
            value_numeric,
            unit,
            project_label,
            site:sites(name),
            definition:site_water_metric_definitions(label),
            fact:site_facts(provenance)
          `,
        )
        .order("yr", { ascending: false }),
      supabase
        .from("licenses")
        .select(
          `
            id,
            type,
            region,
            status,
            applicants,
            application_date,
            start_date,
            end_date,
            country:countries(name)
          `,
        )
        .order("application_date", { ascending: false }),
    ]);

    const firstError = [
      sitesResponse.error,
      commodityMetricsResponse.error,
      waterMetricsResponse.error,
      licensesResponse.error,
    ].find(Boolean);

    if (firstError) {
      throw new Error(firstError.message);
    }

    const minesRows: DatabaseRow[] = (sitesResponse.data ?? []).map((row) => {
      const siteData = firstRecord(row.site_data);
      const openAir = firstRecord(row.open_air_sites);
      const underground = firstRecord(row.underground_sites);
      const commodityNames = ensureArray(
        row.site_commodities as Array<Record<string, unknown>> | undefined,
      )
        .map((siteCommodity) => stringValue(relationField(siteCommodity.commodity, "name")))
        .filter((value): value is string => Boolean(value));

      return {
        id: numericValue(row.id) ?? 0,
        mine: stringValue(row.name) ?? "Unknown site",
        owner: stringValue(row.owner) ?? "",
        country: stringValue(relationField(row.country, "name")) ?? "",
        type: titleizeEnum(stringValue(row.site_type)),
        stage: titleizeEnum(stringValue(siteData?.stage)),
        status: titleizeEnum(stringValue(row.status)),
        commodities: commodityNames.join(", "),
        latitude: numericValue(siteData?.latitude) ?? "",
        longitude: numericValue(siteData?.longitude) ?? "",
        lifetimeOfMine: numericValue(siteData?.lifetime_of_mine_years) ?? "",
        pitDepth: numericValue(openAir?.pit_depth) ?? "",
        shaftDepth: numericValue(underground?.shaft_depth) ?? "",
      };
    });

    const commodityMetricRows = pivotMetricRows(
      (commodityMetricsResponse.data ?? []).map((row) => {
        const siteName = stringValue(relationField(row.site, "name")) ?? "";
        const provenance = firstRecord(row.fact)?.provenance;
        const rowLabel = provenanceField(provenance, "row_label");
        const metricLabel =
          provenanceField(provenance, "resolved_metric_label") ??
          stringValue(relationField(row.definition, "label")) ??
          "Reported output";
        const productLabel =
          provenanceField(provenance, "resolved_product_label") ??
          buildCommodityProduct(rowLabel, siteName, metricLabel);

        return {
          site: siteName,
          project: stringValue(row.project_label) ?? "",
          unit: stringValue(row.unit) ?? "",
          year: numericValue(row.yr),
          value: numericValue(row.value_numeric),
          metric: metricLabel,
          product: productLabel,
          commodity:
            stringValue(relationField(row.commodity, "name")) ??
            provenanceField(provenance, "resolved_commodity_name") ??
            inferCommodityLabel(rowLabel, stringValue(row.unit), metricLabel, siteName),
        };
      }),
      "commodity",
    );

    const waterMetricRows = pivotMetricRows(
      (waterMetricsResponse.data ?? []).map((row) => {
        const siteName = stringValue(relationField(row.site, "name")) ?? "";
        const provenance = firstRecord(row.fact)?.provenance;
        const metricLabel =
          provenanceField(provenance, "resolved_metric_label") ??
          stringValue(relationField(row.definition, "label")) ??
          "";

        return {
          site: siteName,
          project: stringValue(row.project_label) ?? "",
          unit: stringValue(row.unit) ?? "",
          year: numericValue(row.yr),
          value: numericValue(row.value_numeric),
          metric: metricLabel,
          product:
            provenanceField(provenance, "resolved_product_label") ??
            stringValue(row.project_label) ??
            siteName,
          waterType: metricLabel,
        };
      }),
      "water",
    );

    const licenseRows: DatabaseRow[] = (licensesResponse.data ?? []).map((row) => ({
      id: numericValue(row.id) ?? 0,
      type: stringValue(row.type) ?? "",
      country: stringValue(relationField(row.country, "name")) ?? "",
      region: stringValue(row.region) ?? "",
      status: titleizeEnum(stringValue(row.status)),
      applicants: compactJoin(ensureArray(row.applicants as string[] | undefined), ", "),
      applicationDate: stringValue(row.application_date) ?? "",
      startDate: stringValue(row.start_date) ?? "",
      endDate: stringValue(row.end_date) ?? "",
    }));

    const payload: DatabaseDataPayload = {
      tablesByCategory: {
        Mines: minesRows,
        "Commodity Metrics": commodityMetricRows,
        "Water Metrics": waterMetricRows,
        Licenses: licenseRows,
      },
      filterGroupsByCategory: {
        Mines: withGroups(minesRows, [
          buildFilterGroup(minesRows, "Country", "country"),
          buildFilterGroup(minesRows, "Type", "type"),
          buildFilterGroup(minesRows, "Stage", "stage"),
          buildFilterGroup(minesRows, "Status", "status"),
        ]),
        "Commodity Metrics": withGroups(commodityMetricRows, [
          buildFilterGroup(commodityMetricRows, "Site", "site"),
          buildFilterGroup(commodityMetricRows, "Commodity", "commodity"),
          buildFilterGroup(commodityMetricRows, "Metric", "metric"),
        ]),
        "Water Metrics": withGroups(waterMetricRows, [
          buildFilterGroup(waterMetricRows, "Site", "site"),
          buildFilterGroup(waterMetricRows, "Water Type", "waterType"),
          buildFilterGroup(waterMetricRows, "Product", "product"),
        ]),
        Licenses: withGroups(licenseRows, [
          buildFilterGroup(licenseRows, "Country", "country"),
          buildFilterGroup(licenseRows, "Status", "status"),
          buildFilterGroup(licenseRows, "Type", "type"),
        ]),
      },
      sourceKind: "backend",
    };

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        ...{
          tablesByCategory: EMPTY_TABLES,
          filterGroupsByCategory: {
            Mines: [],
            "Commodity Metrics": [],
            "Water Metrics": [],
            Licenses: [],
          },
          sourceKind: "placeholder",
        },
        detail:
          error instanceof Error ? error.message : "Unable to load database data.",
      },
      { status: 500 },
    );
  }
}
