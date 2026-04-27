import { NextResponse } from "next/server";

import type {
  DatabaseAdminMeta,
  DatabaseCategory,
  DatabaseCategoryMeta,
  DatabaseColumnDataType,
  DatabaseColumnMeta,
  DatabaseDataPayload,
  DatabaseFilterGroup,
  DatabaseRow,
} from "@/app/database/database-types";
import { DATABASE_METRIC_YEARS } from "@/app/database/database-types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const EMPTY_TABLES: Record<DatabaseCategory, DatabaseRow[]> = {
};

const EMPTY_ADMIN: DatabaseAdminMeta = {
  isAdmin: false,
  columnsByCategory: {},
  hiddenColumnsByCategory: {},
  canAddColumnsByCategory: {},
  canHideColumnsByCategory: {},
};

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

function booleanValue(value: unknown) {
  return typeof value === "boolean" ? value : Boolean(value);
}

function normalizeDataType(value: unknown): DatabaseColumnDataType {
  if (value === "numeric" || value === "integer" || value === "boolean" || value === "date") {
    return value;
  }
  if (value === "enum") {
    return "enum";
  }
  return "text";
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
  const fallback = sources
    .filter((value): value is string => Boolean(value))
    .map((value) => cleanMetricLabel(value))
    .find(Boolean);

  return fallback || "Unknown";
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
  metricRowId: number;
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
      const field = metricYearField(row.year);
      baseRow[field] = formatMetricValue(row.value);
      baseRow.__metricIds = {
        ...((baseRow.__metricIds as Record<string, number> | undefined) ?? {}),
        [field]: row.metricRowId,
      };
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

function buildMetricColumnMeta(
  leadingField: "commodity" | "waterType",
  leadingHeader: string,
): DatabaseColumnMeta[] {
  return [
    {
      field: "site",
      headerName: "Site",
      dataType: "text",
      source: "derived",
      editable: false,
      hideable: false,
      addable: false,
      visible: true,
      flex: 1.1,
    },
    {
      field: leadingField,
      headerName: leadingHeader,
      dataType: "text",
      source: "derived",
      editable: false,
      hideable: false,
      addable: false,
      visible: true,
      flex: 0.9,
    },
    {
      field: "product",
      headerName: "Product",
      dataType: "text",
      source: "derived",
      editable: false,
      hideable: false,
      addable: false,
      visible: true,
      flex: 1.2,
    },
    {
      field: "unit",
      headerName: "Unit",
      dataType: "text",
      source: "derived",
      editable: false,
      hideable: false,
      addable: false,
      visible: true,
      flex: 0.7,
    },
    ...DATABASE_METRIC_YEARS.map((year) => ({
      field: metricYearField(year),
      headerName: String(year),
      dataType: "numeric" as const,
      source: leadingField === "commodity" ? "site_commodity_metrics" as const : "site_water_metrics" as const,
      editable: true,
      hideable: false,
      addable: false,
      visible: true,
      relation: "metric-year" as const,
      width: 86,
      flex: 0.56,
    })),
    {
      field: "annual",
      headerName: "Annual",
      dataType: "numeric",
      source: "derived",
      editable: false,
      hideable: false,
      addable: false,
      visible: true,
      flex: 0.62,
    },
    {
      field: "lom",
      headerName: "LOM",
      dataType: "numeric",
      source: "derived",
      editable: false,
      hideable: false,
      addable: false,
      visible: true,
      flex: 0.56,
    },
  ];
}

function visibleColumns(columns: DatabaseColumnMeta[]) {
  return columns.filter((column) => column.visible);
}

function hiddenColumns(columns: DatabaseColumnMeta[]) {
  return columns.filter((column) => !column.visible);
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: isAdminResult } = user
      ? await supabase.rpc("is_admin_user")
      : { data: false };

    const [
      sitesResponse,
      commodityMetricsResponse,
      waterMetricsResponse,
      licensesResponse,
      siteFieldsResponse,
      licenseFieldsResponse,
      categoriesResponse,
    ] = await Promise.all([
      supabase
        .from("sites")
        .select(
          `
            *,
            country:countries(name),
            site_data(*),
            open_air_sites(*),
            underground_sites(*),
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
            *,
            country:countries(name)
          `,
        )
        .order("application_date", { ascending: false }),
      supabase
        .from("site_data_fields")
        .select(
          "field_key,label,data_type,table_target,column_name,ui_field,subtype_scope,is_visible,is_admin_editable,sort_order",
        )
        .order("sort_order"),
      supabase
        .from("license_data_fields")
        .select(
          "field_key,label,data_type,column_name,ui_field,is_visible,is_admin_editable,sort_order",
        )
        .order("sort_order"),
      supabase
        .from("database_categories")
        .select("label,source_key,can_edit_cells,can_add_columns,can_hide_columns,sort_order")
        .order("sort_order"),
    ]);

    const firstError = [
      sitesResponse.error,
      commodityMetricsResponse.error,
      waterMetricsResponse.error,
      licensesResponse.error,
      siteFieldsResponse.error,
      licenseFieldsResponse.error,
      categoriesResponse.error,
    ].find(Boolean);

    if (firstError) {
      throw new Error(firstError.message);
    }

    const isAdmin = Boolean(isAdminResult);
    const categories: DatabaseCategoryMeta[] = (categoriesResponse.data ?? []).map(
      (category) => ({
        label: stringValue(category.label) ?? "",
        source: stringValue(category.source_key) ?? "",
        canEditCells: booleanValue(category.can_edit_cells),
        canAddColumns: booleanValue(category.can_add_columns),
        canHideColumns: booleanValue(category.can_hide_columns),
        sortOrder: numericValue(category.sort_order) ?? 0,
      }),
    ).filter((category) => category.label);
    const categoryBySource = new Map(categories.map((category) => [category.source, category]));
    const minesCategory = categoryBySource.get("mines")?.label ?? "Mines";
    const commodityMetricsCategory =
      categoryBySource.get("commodity_metrics")?.label ?? "Commodity Metrics";
    const waterMetricsCategory =
      categoryBySource.get("water_metrics")?.label ?? "Water Metrics";
    const licensesCategory = categoryBySource.get("licenses")?.label ?? "Licenses";
    const siteFieldRows = siteFieldsResponse.data ?? [];
    const licenseFieldRows = licenseFieldsResponse.data ?? [];
    const mineColumns: DatabaseColumnMeta[] = [
      ...siteFieldRows.map((field) => ({
        field: stringValue(field.ui_field) ?? stringValue(field.field_key) ?? "",
        headerName: stringValue(field.label) ?? "Field",
        dataType: normalizeDataType(field.data_type),
        source: stringValue(field.table_target) as DatabaseColumnMeta["source"],
        editable: booleanValue(field.is_admin_editable),
        hideable: true,
        addable: false,
        visible: booleanValue(field.is_visible),
        relation: field.field_key === "country_id" ? ("country" as const) : undefined,
        flex: 1,
      })),
      {
        field: "commodities",
        headerName: "Commodities",
        dataType: "text" as const,
        source: "derived" as const,
        editable: false,
        hideable: false,
        addable: false,
        visible: true,
        flex: 1.1,
      } satisfies DatabaseColumnMeta,
    ].filter((column) => column.field);
    const licenseColumns: DatabaseColumnMeta[] = licenseFieldRows
      .map((field) => ({
        field: stringValue(field.ui_field) ?? stringValue(field.field_key) ?? "",
        headerName: stringValue(field.label) ?? "Field",
        dataType: normalizeDataType(field.data_type),
        source: "licenses" as const,
        editable: booleanValue(field.is_admin_editable),
        hideable: true,
        addable: false,
        visible: booleanValue(field.is_visible),
        relation:
          field.field_key === "country"
            ? ("country" as const)
            : field.field_key === "applicants"
              ? ("applicants" as const)
              : undefined,
        flex: field.field_key === "applicants" ? 1.4 : 1,
      }))
      .filter((column) => column.field);
    const commodityMetricColumns = buildMetricColumnMeta("commodity", "Commodity");
    const waterMetricColumns = buildMetricColumnMeta("waterType", "Water Type");
    const adminMeta: DatabaseAdminMeta = {
      isAdmin,
      columnsByCategory: {
        [minesCategory]: isAdmin ? mineColumns : visibleColumns(mineColumns),
        [commodityMetricsCategory]: commodityMetricColumns,
        [waterMetricsCategory]: waterMetricColumns,
        [licensesCategory]: isAdmin ? licenseColumns : visibleColumns(licenseColumns),
      },
      hiddenColumnsByCategory: {
        [minesCategory]: isAdmin ? hiddenColumns(mineColumns) : [],
        [commodityMetricsCategory]: [],
        [waterMetricsCategory]: [],
        [licensesCategory]: isAdmin ? hiddenColumns(licenseColumns) : [],
      },
      canAddColumnsByCategory: {
        [minesCategory]: isAdmin && Boolean(categoryBySource.get("mines")?.canAddColumns),
        [commodityMetricsCategory]:
          isAdmin && Boolean(categoryBySource.get("commodity_metrics")?.canAddColumns),
        [waterMetricsCategory]:
          isAdmin && Boolean(categoryBySource.get("water_metrics")?.canAddColumns),
        [licensesCategory]: isAdmin && Boolean(categoryBySource.get("licenses")?.canAddColumns),
      },
      canHideColumnsByCategory: {
        [minesCategory]: isAdmin && Boolean(categoryBySource.get("mines")?.canHideColumns),
        [commodityMetricsCategory]:
          isAdmin && Boolean(categoryBySource.get("commodity_metrics")?.canHideColumns),
        [waterMetricsCategory]:
          isAdmin && Boolean(categoryBySource.get("water_metrics")?.canHideColumns),
        [licensesCategory]: isAdmin && Boolean(categoryBySource.get("licenses")?.canHideColumns),
      },
    };

    const minesRows: DatabaseRow[] = (sitesResponse.data ?? []).map((row) => {
      const siteData = firstRecord(row.site_data);
      const openAir = firstRecord(row.open_air_sites);
      const underground = firstRecord(row.underground_sites);
      const commodityNames = ensureArray(
        row.site_commodities as Array<Record<string, unknown>> | undefined,
      )
        .map((siteCommodity) => stringValue(relationField(siteCommodity.commodity, "name")))
        .filter((value): value is string => Boolean(value));

      const baseRow: DatabaseRow = {
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

      mineColumns.forEach((column) => {
        if (baseRow[column.field] !== undefined) {
          return;
        }
        const registry = siteFieldRows.find(
          (field) =>
            (stringValue(field.ui_field) ?? stringValue(field.field_key)) === column.field,
        );
        const columnName = stringValue(registry?.column_name);
        if (!registry || !columnName) {
          return;
        }
        const tableTarget = stringValue(registry.table_target);
        const source =
          tableTarget === "sites"
            ? row
            : tableTarget === "open_air_sites"
              ? openAir
              : tableTarget === "underground_sites"
                ? underground
                : siteData;
        baseRow[column.field] = stringValue(source?.[columnName]) ?? numericValue(source?.[columnName]) ?? "";
      });

      return Object.fromEntries(
        Object.entries(baseRow).filter(
          ([field]) => field === "id" || mineColumns.some((column) => column.field === field && column.visible),
        ),
      ) as DatabaseRow;
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
          metricRowId: numericValue(row.id) ?? 0,
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
          metricRowId: numericValue(row.id) ?? 0,
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

    const licenseRows: DatabaseRow[] = (licensesResponse.data ?? []).map((row) => {
      const baseRow: DatabaseRow = {
        id: numericValue(row.id) ?? 0,
        type: stringValue(row.type) ?? "",
        country: stringValue(relationField(row.country, "name")) ?? "",
        region: stringValue(row.region) ?? "",
        status: titleizeEnum(stringValue(row.status)),
        applicants: compactJoin(ensureArray(row.applicants as string[] | undefined), ", "),
        applicationDate: stringValue(row.application_date) ?? "",
        startDate: stringValue(row.start_date) ?? "",
        endDate: stringValue(row.end_date) ?? "",
      };

      licenseColumns.forEach((column) => {
        if (baseRow[column.field] !== undefined) {
          return;
        }
        const registry = licenseFieldRows.find(
          (field) => stringValue(field.field_key) === column.field,
        );
        const columnName = stringValue(registry?.column_name);
        if (!columnName) {
          return;
        }
        baseRow[column.field] =
          stringValue(row[columnName]) ?? numericValue(row[columnName]) ?? "";
      });

      return Object.fromEntries(
        Object.entries(baseRow).filter(
          ([field]) =>
            field === "id" ||
            licenseColumns.some((column) => column.field === field && column.visible),
        ),
      ) as DatabaseRow;
    });

    const payload: DatabaseDataPayload = {
      categories,
      tablesByCategory: {
        [minesCategory]: minesRows,
        [commodityMetricsCategory]: commodityMetricRows,
        [waterMetricsCategory]: waterMetricRows,
        [licensesCategory]: licenseRows,
      },
      filterGroupsByCategory: {
        [minesCategory]: withGroups(minesRows, [
          buildFilterGroup(minesRows, "Country", "country"),
          buildFilterGroup(minesRows, "Type", "type"),
          buildFilterGroup(minesRows, "Stage", "stage"),
          buildFilterGroup(minesRows, "Status", "status"),
        ]),
        [commodityMetricsCategory]: withGroups(commodityMetricRows, [
          buildFilterGroup(commodityMetricRows, "Site", "site"),
          buildFilterGroup(commodityMetricRows, "Commodity", "commodity"),
          buildFilterGroup(commodityMetricRows, "Metric", "metric"),
        ]),
        [waterMetricsCategory]: withGroups(waterMetricRows, [
          buildFilterGroup(waterMetricRows, "Site", "site"),
          buildFilterGroup(waterMetricRows, "Water Type", "waterType"),
          buildFilterGroup(waterMetricRows, "Product", "product"),
        ]),
        [licensesCategory]: withGroups(licenseRows, [
          buildFilterGroup(licenseRows, "Country", "country"),
          buildFilterGroup(licenseRows, "Status", "status"),
          buildFilterGroup(licenseRows, "Type", "type"),
        ]),
      },
      admin: adminMeta,
      sourceKind: "backend",
    };

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        ...{
          tablesByCategory: EMPTY_TABLES,
          filterGroupsByCategory: {},
          admin: EMPTY_ADMIN,
          categories: [],
          sourceKind: "placeholder",
        },
        detail:
          error instanceof Error ? error.message : "Unable to load database data.",
      },
      { status: 500 },
    );
  }
}
