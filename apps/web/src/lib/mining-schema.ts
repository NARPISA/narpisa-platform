export type MineType = "open_air" | "underground";

export type SiteStage =
  | "pea"
  | "pfs"
  | "fs"
  | "permitting"
  | "construction"
  | "production";

export type SiteTableTarget =
  | "sites"
  | "site_data"
  | "underground_sites"
  | "open_air_sites"
  | "site_water_metrics"
  | "site_commodity_metrics";

export type AdminFieldDataType =
  | "text"
  | "numeric"
  | "integer"
  | "boolean"
  | "date"
  | "json"
  | "enum"
  | "foreign_key";

export type SiteFactStatus =
  | "candidate"
  | "accepted"
  | "rejected"
  | "superseded";

export type SiteFactValueType =
  | "numeric"
  | "text"
  | "boolean"
  | "date"
  | "json";

export interface SiteFactProvenance {
  document_id?: number;
  citation_id?: number;
  source_url?: string;
  uploaded_at?: string;
  uploaded_by?: string;
  dataset_name?: string;
  row_label?: string;
  context_label?: string | null;
  source_line_number?: number;
  raw_value?: string;
  note?: string | null;
  quote_text?: string;
  parser_version?: string;
  [key: string]: unknown;
}

export interface SiteDataFieldDefinition {
  id: number;
  field_key: string;
  label: string;
  data_type: AdminFieldDataType;
  table_target: SiteTableTarget;
  column_name: string;
  subtype_scope: MineType | null;
  is_active: boolean;
  is_llm_exposed: boolean;
  is_admin_editable: boolean;
  sort_order: number;
  created_at: string;
}

export interface SiteWaterMetricDefinition {
  id: number;
  metric_key: string;
  label: string;
  default_unit: string | null;
  sort_order: number;
  created_at: string;
}

export interface SiteCommodityMetricDefinition {
  id: number;
  metric_key: string;
  label: string;
  default_unit: string | null;
  commodity_scoped: boolean;
  sort_order: number;
  created_at: string;
}

export interface SiteFact {
  id: string;
  site_id: number;
  document_id: number | null;
  citation_id: number | null;
  extracted_record_id: string | null;
  commodity_id: number | null;
  field_key: string;
  table_target: SiteTableTarget;
  subtype_scope: MineType | null;
  value_type: SiteFactValueType;
  value_numeric: number | null;
  value_text: string | null;
  value_boolean: boolean | null;
  value_date: string | null;
  value_json: Record<string, unknown> | null;
  effective_year: number | null;
  unit: string | null;
  project_label: string | null;
  status: SiteFactStatus;
  provenance: SiteFactProvenance;
  created_at: string;
  updated_at: string;
}

export interface SiteWaterMetric {
  id: number;
  site_id: number;
  definition_id: number;
  yr: number;
  value_numeric: number;
  unit: string;
  project_label: string | null;
  fact_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SiteCommodityMetric {
  id: number;
  site_id: number;
  commodity_id: number | null;
  definition_id: number;
  yr: number;
  value_numeric: number;
  unit: string;
  project_label: string | null;
  fact_id: string | null;
  created_at: string;
  updated_at: string;
}

export function sortBySortOrder<T extends { sort_order: number; label: string }>(
  items: T[],
) {
  return [...items].sort(
    (left, right) =>
      left.sort_order - right.sort_order || left.label.localeCompare(right.label),
  );
}
