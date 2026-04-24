from __future__ import annotations

import argparse
import csv
import json
import os
import re
import shutil
import subprocess
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from postgrest.types import ReturnMethod
from supabase import Client, create_client


DEFAULT_SOURCE_URL = "https://www.chamberofmines.org.na/"
DEFAULT_TITLE = "Chamber member output by mine, 1990-2023"
DEFAULT_ATTRIBUTION = "Chamber of Mines Namibia"
DEFAULT_RECORD_TYPE = "mining_output_series"
DEFAULT_DATASET_NAME = "Output by Chamber Members 1990-2023 (Output by Mine)"
DEFAULT_SITE_MAP_NAME = "site-map.example.json"
YEAR_COUNT = 34


@dataclass(frozen=True)
class ParsedCell:
    raw_value: str
    numeric_value: float | None
    status: str
    note: str | None = None


@dataclass(frozen=True)
class DatasetMetadata:
    source_line: str | None
    footnotes: list[str]


@dataclass(frozen=True)
class SiteSeed:
    site_type: str
    owner: str
    country: str | None = None
    stage: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    lifetime_of_mine_years: float | None = None
    pit_depth: float | None = None
    surface_area: float | None = None
    shaft_depth: float | None = None
    tunnel_length: float | None = None


@dataclass(frozen=True)
class CommodityResolution:
    site_label: str
    metric_label: str
    metric_key: str
    product_label: str
    table_name: str
    unit: str | None
    commodity_name: str | None = None
    commodity_ore_type: str | None = None
    commodity_scoped: bool = False


COMMODITY_PATTERNS: tuple[tuple[re.Pattern[str], str, str], ...] = (
    (re.compile(r"\bdiamond\b|\bcarat", re.IGNORECASE), "Diamond", "carats"),
    (re.compile(r"\bgold\b", re.IGNORECASE), "Gold", "gold"),
    (re.compile(r"\buranium\b", re.IGNORECASE), "Uranium", "uranium oxide"),
    (re.compile(r"\bcopper\b", re.IGNORECASE), "Copper", "copper"),
    (re.compile(r"\bzinc\b", re.IGNORECASE), "Zinc", "zinc"),
    (re.compile(r"\blead\b", re.IGNORECASE), "Lead", "lead"),
    (re.compile(r"\btin\b", re.IGNORECASE), "Tin", "tin"),
    (re.compile(r"\bfluorspar\b", re.IGNORECASE), "Fluorspar", "fluorspar"),
    (re.compile(r"\biron ore\b", re.IGNORECASE), "Iron Ore", "iron ore"),
    (re.compile(r"\bgraphite\b", re.IGNORECASE), "Graphite", "graphite"),
    (re.compile(r"\bsalt\b", re.IGNORECASE), "Salt", "salt"),
    (re.compile(r"\bcement\b", re.IGNORECASE), "Cement", "cement"),
    (re.compile(r"\bpyrite\b", re.IGNORECASE), "Pyrite", "pyrite"),
)

SITE_COMMODITY_FALLBACKS: tuple[tuple[re.Pattern[str], str, str], ...] = (
    (
        re.compile(
            r"namdeb|debmarine|beach and marine|diamond fields|sakawe|ocean diamond|sperrgebiet",
            re.IGNORECASE,
        ),
        "Diamond",
        "carats",
    ),
    (
        re.compile(r"rossing|uranium|langer heinrich|swakop", re.IGNORECASE),
        "Uranium",
        "uranium oxide",
    ),
    (re.compile(r"navachab|b2gold", re.IGNORECASE), "Gold", "gold"),
    (
        re.compile(r"dundee|tsumeb|weatherly|kombat|otjihase|matchless|tschudi|khusib", re.IGNORECASE),
        "Copper",
        "copper",
    ),
)


def parse_args() -> argparse.Namespace:
    default_csv = Path(__file__).with_name(
        "Output-by-Chamber-Members-1990-2023(Output by Mine).csv"
    )
    parser = argparse.ArgumentParser(
        description=(
            "Import the Chamber of Mines Namibia output-by-mine CSV into the "
            "001_init_schema Supabase tables using documents, processing_jobs, "
            "and extracted_records."
        )
    )
    parser.add_argument(
        "--csv-path",
        type=Path,
        default=default_csv,
        help=f"Path to the CSV file. Defaults to {default_csv}.",
    )
    parser.add_argument(
        "--source-url",
        default=DEFAULT_SOURCE_URL,
        help=(
            "Public source URL for the dataset document. Override this with the "
            "exact landing page when you have it."
        ),
    )
    parser.add_argument("--title", default=DEFAULT_TITLE)
    parser.add_argument("--attribution", default=DEFAULT_ATTRIBUTION)
    parser.add_argument(
        "--site-map-path",
        type=Path,
        help=(
            "Optional JSON file mapping site labels to site metadata. When "
            "provided, the importer also writes site_facts and projects rows into "
            "site_water_metrics or site_commodity_metrics. When omitted for the "
            "bundled Chamber CSV, the bundled site map is used automatically."
        ),
    )
    parser.add_argument(
        "--target",
        choices=("local", "env"),
        default="local",
        help=(
            "Use local Supabase discovered from `supabase status` or fall back to "
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the environment."
        ),
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Parse and summarize the dataset without writing to Supabase.",
    )
    return parser.parse_args()


def normalize_text(value: str) -> str:
    return " ".join(value.replace("\xa0", " ").strip().split())


def slugify_key(value: str) -> str:
    normalized = normalize_text(value).lower()
    return re.sub(r"[^a-z0-9]+", "_", normalized).strip("_")


def strip_footnote_markers(value: str) -> str:
    return normalize_text(re.sub(r"\*+$", "", value))


def split_label_and_unit(label: str) -> tuple[str, str | None]:
    cleaned = normalize_text(label)
    if not cleaned.endswith(")") or "(" not in cleaned:
        return cleaned, None

    open_idx = cleaned.rfind("(")
    base = normalize_text(cleaned[:open_idx])
    unit = normalize_text(cleaned[open_idx + 1 : -1])
    if not base or not unit:
        return cleaned, None
    return base, unit


def parse_numeric_token(token: str) -> tuple[float | None, str | None]:
    normalized = normalize_text(token)
    if not normalized:
        return None, None

    lower = normalized.lower()
    if lower in {"n/a", "na", "no info", "-"}:
        return None, lower

    cleaned = normalized.replace(",", "")
    had_footnote = "*" in cleaned
    cleaned = cleaned.replace("*", "")

    try:
        value = float(cleaned)
    except ValueError:
        return None, normalized

    if had_footnote:
        return value, "contains_footnote_marker"
    return value, None


def parse_cell(raw_value: str) -> ParsedCell | None:
    cleaned = normalize_text(raw_value)
    if not cleaned:
        return None

    numeric_value, note = parse_numeric_token(cleaned)
    status = "numeric" if numeric_value is not None else "non_numeric"
    return ParsedCell(
        raw_value=cleaned,
        numeric_value=numeric_value,
        status=status,
        note=note,
    )


def load_csv_rows(csv_path: Path) -> list[list[str]]:
    with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.reader(handle))


def extract_metadata(rows: list[list[str]]) -> DatasetMetadata:
    source_line: str | None = None
    footnotes: list[str] = []

    for row in rows[1:]:
        label = normalize_text(row[0] if row else "")
        if not label:
            continue
        if label.lower().startswith("source:"):
            source_line = label
            continue
        if label.startswith("*"):
            footnotes.append(label)

    return DatasetMetadata(source_line=source_line, footnotes=footnotes)


def parse_series_rows(rows: list[list[str]]) -> tuple[list[int], list[dict[str, Any]], DatasetMetadata]:
    header = rows[0]
    years = [int(normalize_text(cell)) for cell in header[1 : YEAR_COUNT + 1]]
    metadata = extract_metadata(rows)

    series_rows: list[dict[str, Any]] = []
    current_context: str | None = None

    for line_number, row in enumerate(rows[1:], start=2):
        label = normalize_text(row[0] if row else "")
        year_cells = row[1 : YEAR_COUNT + 1]
        parsed_cells = []

        for year, raw_value in zip(years, year_cells, strict=True):
            parsed = parse_cell(raw_value)
            if parsed is None:
                continue
            parsed_cells.append(
                {
                    "year": year,
                    "raw_value": parsed.raw_value,
                    "numeric_value": parsed.numeric_value,
                    "status": parsed.status,
                    "note": parsed.note,
                }
            )

        if label.lower().startswith("source:") or label.startswith("*"):
            continue

        if not parsed_cells:
            if label:
                current_context = label
            continue

        effective_label = label or current_context or f"row-{line_number}"
        series_name, unit = split_label_and_unit(effective_label)
        context_label = None
        if current_context and normalize_text(current_context) != normalize_text(effective_label):
            context_label = current_context

        series_rows.append(
            {
                "line_number": line_number,
                "row_label": effective_label,
                "series_name": series_name,
                "unit": unit,
                "context_label": context_label,
                "values_by_year": parsed_cells,
            }
        )

    return years, series_rows, metadata


def infer_commodity_from_sources(*sources: str | None) -> tuple[str, str] | None:
    haystack = " ".join(normalize_text(source) for source in sources if source).strip()
    if not haystack:
        return None

    for pattern, commodity_name, ore_type in COMMODITY_PATTERNS:
        if pattern.search(haystack):
            return commodity_name, ore_type

    return None


def infer_commodity_from_site(*sources: str | None) -> tuple[str, str] | None:
    haystack = " ".join(normalize_text(source) for source in sources if source).strip()
    if not haystack:
        return None

    for pattern, commodity_name, ore_type in SITE_COMMODITY_FALLBACKS:
        if pattern.search(haystack):
            return commodity_name, ore_type

    return None


def classify_series_row(row: dict[str, Any]) -> CommodityResolution:
    raw_context = row.get("context_label")
    raw_series_name = row["series_name"]
    raw_unit = row.get("unit")

    site_label = normalize_text(raw_context or raw_series_name)
    series_name = strip_footnote_markers(raw_series_name)
    unit = normalize_text(raw_unit) if raw_unit else None

    lower_sources = " ".join(
        value.lower()
        for value in (series_name, unit, row.get("row_label"), raw_context, site_label)
        if value
    )
    water_metric_keys = {
        "groundwater": "Groundwater",
        "fresh_water": "Fresh water",
        "recycled_water": "Recycled water",
        "total_water": "Total water",
        "water_use_efficiency": "Water use efficiency",
    }
    for water_key, water_label in water_metric_keys.items():
        if water_key.replace("_", " ") in lower_sources:
            return CommodityResolution(
                site_label=site_label,
                metric_label=water_label,
                metric_key=water_key,
                product_label=water_label,
                table_name="site_water_metrics",
                unit=unit,
            )

    top_level_series = raw_context is None
    default_metric_label = "Reported output"
    if top_level_series and unit:
        default_metric_label = strip_footnote_markers(unit)
    elif not top_level_series:
        default_metric_label = series_name

    commodity = infer_commodity_from_sources(series_name, unit, row.get("row_label"))
    if commodity is None:
        commodity = infer_commodity_from_site(raw_context, site_label)
    commodity_name = commodity[0] if commodity else None
    commodity_ore_type = commodity[1] if commodity else None

    return CommodityResolution(
        site_label=site_label,
        metric_label=default_metric_label,
        metric_key=slugify_key(default_metric_label),
        product_label=series_name if not top_level_series else default_metric_label,
        table_name="site_commodity_metrics",
        unit=unit,
        commodity_name=commodity_name,
        commodity_ore_type=commodity_ore_type,
        commodity_scoped=commodity_name is not None,
    )


class SupabaseDataClient:
    def __init__(self, *, target: str) -> None:
        supabase_url, service_role_key = resolve_supabase_config(target=target)
        self.client: Client = create_client(supabase_url, service_role_key)

    def close(self) -> None:
        return None

    def _execute(self, operation: str, query: Any) -> list[dict[str, Any]]:
        try:
            response = query.execute()
        except Exception as exc:
            raise RuntimeError(f"Supabase query failed ({operation}): {exc}") from exc
        return list(response.data)

    def _apply_filters(self, query: Any, filters: dict[str, Any]) -> Any:
        for column, value in filters.items():
            if value is None:
                query = query.is_(column, "null")
            else:
                query = query.eq(column, value)
        return query

    def _select_first(
        self,
        table_name: str,
        *,
        filters: dict[str, Any],
        columns: str = "*",
    ) -> dict[str, Any] | None:
        query = self.client.table(table_name).select(columns).limit(1)
        query = self._apply_filters(query, filters)
        payload = self._execute(f"select from {table_name}", query)
        if not payload:
            return None
        return payload[0]

    def _insert_one(self, table_name: str, payload: dict[str, Any]) -> dict[str, Any]:
        response = self._execute(
            f"insert into {table_name}",
            self.client.table(table_name).insert(payload),
        )
        if not response:
            raise RuntimeError(f"Supabase insert returned no rows for {table_name}.")
        return response[0]

    def _update(self, table_name: str, *, filters: dict[str, Any], payload: dict[str, Any]) -> None:
        query = self.client.table(table_name).update(
            payload,
            returning=ReturnMethod.minimal,
        )
        query = self._apply_filters(query, filters)
        self._execute(f"update {table_name}", query)

    def _delete(self, table_name: str, *, filters: dict[str, Any]) -> None:
        query = self.client.table(table_name).delete(returning=ReturnMethod.minimal)
        query = self._apply_filters(query, filters)
        self._execute(f"delete from {table_name}", query)

    def get_document_by_source_url(self, source_url: str) -> dict[str, Any] | None:
        return self._select_first("documents", filters={"source_url": source_url})

    def create_document(self, payload: dict[str, Any]) -> dict[str, Any]:
        return self._insert_one("documents", payload)

    def patch_document(self, document_id: str, payload: dict[str, Any]) -> None:
        self._update("documents", filters={"id": document_id}, payload=payload)

    def create_job(self, payload: dict[str, Any]) -> dict[str, Any]:
        return self._insert_one("processing_jobs", payload)

    def patch_job(self, job_id: str, payload: dict[str, Any]) -> None:
        self._update("processing_jobs", filters={"id": job_id}, payload=payload)

    def delete_extracted_records(self, document_id: str) -> None:
        self._delete("extracted_records", filters={"document_id": document_id})

    def insert_extracted_records(self, payload: list[dict[str, Any]]) -> None:
        self._execute(
            "insert into extracted_records",
            self.client.table("extracted_records").insert(
                payload,
                returning=ReturnMethod.minimal,
            ),
        )

    def get_country_by_name(self, name: str) -> dict[str, Any] | None:
        return self._select_first("countries", filters={"name": name})

    def create_country(self, name: str) -> dict[str, Any]:
        return self._insert_one("countries", {"name": name})

    def get_commodity_by_name(self, name: str) -> dict[str, Any] | None:
        return self._select_first("commodities", filters={"name": name})

    def create_commodity(self, payload: dict[str, Any]) -> dict[str, Any]:
        return self._insert_one("commodities", payload)

    def get_site_commodity(self, site_id: int, commodity_id: int) -> dict[str, Any] | None:
        return self._select_first(
            "site_commodities",
            filters={"site_id": site_id, "commodity_id": commodity_id},
        )

    def create_site_commodity(self, payload: dict[str, Any]) -> dict[str, Any]:
        return self._insert_one("site_commodities", payload)

    def get_site_by_name(self, name: str) -> dict[str, Any] | None:
        return self._select_first("sites", filters={"name": name})

    def create_site(self, payload: dict[str, Any]) -> dict[str, Any]:
        return self._insert_one("sites", payload)

    def patch_site(self, site_id: int, payload: dict[str, Any]) -> None:
        self._update("sites", filters={"id": site_id}, payload=payload)

    def get_site_data(self, site_id: int) -> dict[str, Any] | None:
        return self._select_first("site_data", filters={"site_id": site_id})

    def create_site_data(self, payload: dict[str, Any]) -> dict[str, Any]:
        return self._insert_one("site_data", payload)

    def patch_site_data(self, site_id: int, payload: dict[str, Any]) -> None:
        self._update("site_data", filters={"site_id": site_id}, payload=payload)

    def get_subtype_row(self, table_name: str, site_id: int) -> dict[str, Any] | None:
        return self._select_first(table_name, filters={"site_id": site_id})

    def create_subtype_row(self, table_name: str, payload: dict[str, Any]) -> dict[str, Any]:
        return self._insert_one(table_name, payload)

    def patch_subtype_row(self, table_name: str, site_id: int, payload: dict[str, Any]) -> None:
        self._update(table_name, filters={"site_id": site_id}, payload=payload)

    def get_definition_by_key(self, table_name: str, metric_key: str) -> dict[str, Any] | None:
        return self._select_first(table_name, filters={"metric_key": metric_key})

    def create_definition(self, table_name: str, payload: dict[str, Any]) -> dict[str, Any]:
        return self._insert_one(table_name, payload)

    def create_site_fact(self, payload: dict[str, Any]) -> dict[str, Any]:
        return self._insert_one("site_facts", payload)

    def list_site_facts_by_document(self, document_id: int) -> list[dict[str, Any]]:
        return self._execute(
            "select ids from site_facts",
            self.client.table("site_facts").select("id").eq("document_id", document_id),
        )

    def delete_site_facts_by_document(self, document_id: int) -> None:
        self._delete("site_facts", filters={"document_id": document_id})

    def delete_site_water_metrics_by_fact_id(self, fact_id: str) -> None:
        self._delete("site_water_metrics", filters={"fact_id": fact_id})

    def delete_site_commodity_metrics_by_fact_id(self, fact_id: str) -> None:
        self._delete("site_commodity_metrics", filters={"fact_id": fact_id})

    def get_metric_row(
        self,
        table_name: str,
        *,
        site_id: int,
        definition_id: int,
        yr: int,
        commodity_id: int | None = None,
        project_label: str | None = None,
    ) -> dict[str, Any] | None:
        filters: dict[str, Any] = {
            "site_id": site_id,
            "definition_id": definition_id,
            "yr": yr,
            "project_label": project_label,
        }
        if table_name == "site_commodity_metrics":
            filters["commodity_id"] = commodity_id
        return self._select_first(table_name, filters=filters)

    def create_metric_row(self, table_name: str, payload: dict[str, Any]) -> dict[str, Any]:
        return self._insert_one(table_name, payload)

    def patch_metric_row(self, table_name: str, row_id: int, payload: dict[str, Any]) -> None:
        self._update(table_name, filters={"id": row_id}, payload=payload)


def build_document_notes(metadata: DatasetMetadata, csv_path: Path) -> str:
    parts = [
        f"Imported from CSV: {csv_path.name}.",
        (
            "Imported into documents/extracted_records and, when a site mapping is "
            "provided, projected into site_facts and the yearly metric tables."
        ),
    ]
    if metadata.source_line:
        parts.append(metadata.source_line)
    if metadata.footnotes:
        parts.extend(metadata.footnotes)
    return "\n".join(parts)


def build_record_payloads(
    *,
    document_id: str,
    job_id: str,
    dataset_name: str,
    years: list[int],
    series_rows: list[dict[str, Any]],
    metadata: DatasetMetadata,
) -> list[dict[str, Any]]:
    record_payloads: list[dict[str, Any]] = [
        {
            "document_id": document_id,
            "job_id": job_id,
            "record_type": "dataset_metadata",
            "source_section": "dataset",
            "payload": {
                "dataset_name": dataset_name,
                "year_range": {"start": years[0], "end": years[-1]},
                "series_count": len(series_rows),
                "source_line": metadata.source_line,
                "footnotes": metadata.footnotes,
            },
        }
    ]

    for row in series_rows:
        record_payloads.append(
            {
                "document_id": document_id,
                "job_id": job_id,
                "record_type": DEFAULT_RECORD_TYPE,
                "source_section": row["context_label"],
                "payload": {
                    "dataset_name": dataset_name,
                    "row_label": row["row_label"],
                    "series_name": row["series_name"],
                    "unit": row["unit"],
                    "context_label": row["context_label"],
                    "source_line_number": row["line_number"],
                    "values_by_year": row["values_by_year"],
                },
            }
        )
    return record_payloads


def chunked(items: list[dict[str, Any]], size: int) -> list[list[dict[str, Any]]]:
    return [items[idx : idx + size] for idx in range(0, len(items), size)]


def utc_now() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


def resolve_repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "turbo.json").exists():
            return parent
    raise RuntimeError("Could not locate the monorepo root from this script path.")


def load_dotenv(dotenv_path: Path) -> None:
    if not dotenv_path.exists():
        return

    for raw_line in dotenv_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.split(" #", 1)[0].strip().strip("\"'")
        os.environ.setdefault(key, value)


def extract_json_object(raw_output: str) -> dict[str, Any]:
    json_start = raw_output.find("{")
    if json_start == -1:
        raise RuntimeError(f"Could not locate JSON object in output:\n{raw_output}")
    return json.loads(raw_output[json_start:])


def normalize_supabase_project_url(raw_url: str) -> str:
    parsed = urlparse(raw_url)
    if parsed.netloc == "supabase.com":
        path_parts = [part for part in parsed.path.split("/") if part]
        if len(path_parts) >= 3 and path_parts[:2] == ["dashboard", "project"]:
            project_ref = path_parts[2]
            return f"https://{project_ref}.supabase.co"

    if raw_url.rstrip("/").endswith("/rest/v1"):
        return raw_url[: -len("/rest/v1")]
    return raw_url.rstrip("/")


def resolve_local_supabase_config() -> tuple[str, str]:
    repo_root = resolve_repo_root()
    npx_executable = shutil.which("npx") or shutil.which("npx.cmd")
    if npx_executable is None:
        raise RuntimeError(
            "Could not find `npx` on PATH. Install Node.js or use --target env."
        )
    result = subprocess.run(
        [npx_executable, "supabase", "status", "-o", "json"],
        cwd=repo_root,
        capture_output=True,
        text=True,
        check=True,
    )
    payload = extract_json_object(result.stdout)
    supabase_url = payload.get("API_URL") or payload.get("SUPABASE_URL") or payload.get(
        "REST_URL"
    )
    service_role_key = payload.get("SERVICE_ROLE_KEY")
    if not supabase_url or not service_role_key:
        raise RuntimeError(
            "Local Supabase status did not return a Supabase URL and SERVICE_ROLE_KEY."
        )
    return normalize_supabase_project_url(str(supabase_url)), str(service_role_key)


def resolve_env_supabase_config() -> tuple[str, str]:
    repo_root = resolve_repo_root()
    load_dotenv(repo_root / ".env")

    supabase_url = os.environ.get("SUPABASE_URL")
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not service_role_key:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the "
            "environment or the repo root .env file."
        )

    return normalize_supabase_project_url(supabase_url), service_role_key


def resolve_supabase_config(*, target: str) -> tuple[str, str]:
    if target == "local":
        return resolve_local_supabase_config()
    return resolve_env_supabase_config()


def load_site_seeds(site_map_path: Path | None) -> dict[str, SiteSeed]:
    if site_map_path is None:
        return {}
    payload = json.loads(site_map_path.read_text(encoding="utf-8"))
    seeds: dict[str, SiteSeed] = {}
    for raw_key, raw_value in payload.items():
        key = normalize_text(raw_key)
        seeds[key] = SiteSeed(
            site_type=normalize_text(raw_value["site_type"]),
            owner=normalize_text(raw_value.get("owner", key)),
            country=normalize_text(raw_value["country"]) if raw_value.get("country") else None,
            stage=normalize_text(raw_value["stage"]) if raw_value.get("stage") else None,
            latitude=float(raw_value["latitude"]) if raw_value.get("latitude") is not None else None,
            longitude=float(raw_value["longitude"]) if raw_value.get("longitude") is not None else None,
            lifetime_of_mine_years=(
                float(raw_value["lifetime_of_mine_years"])
                if raw_value.get("lifetime_of_mine_years") is not None
                else None
            ),
            pit_depth=float(raw_value["pit_depth"]) if raw_value.get("pit_depth") is not None else None,
            surface_area=(
                float(raw_value["surface_area"])
                if raw_value.get("surface_area") is not None
                else None
            ),
            shaft_depth=(
                float(raw_value["shaft_depth"])
                if raw_value.get("shaft_depth") is not None
                else None
            ),
            tunnel_length=(
                float(raw_value["tunnel_length"])
                if raw_value.get("tunnel_length") is not None
                else None
            ),
        )
    return seeds


def resolve_site_map_path(args: argparse.Namespace) -> Path | None:
    if args.site_map_path is not None:
        return args.site_map_path

    default_csv = Path(__file__).with_name(
        "Output-by-Chamber-Members-1990-2023(Output by Mine).csv"
    )
    default_site_map = Path(__file__).with_name(DEFAULT_SITE_MAP_NAME)
    if args.csv_path.resolve() == default_csv.resolve() and default_site_map.exists():
        return default_site_map
    return None


def ensure_country(
    client: SupabaseDataClient, country_name: str | None
) -> int | None:
    if country_name is None:
        return None
    existing = client.get_country_by_name(country_name)
    if existing is not None:
        return int(existing["id"])
    return int(client.create_country(country_name)["id"])


def ensure_site(
    client: SupabaseDataClient,
    *,
    site_label: str,
    site_seed: SiteSeed,
) -> int:
    country_id = ensure_country(client, site_seed.country)
    existing = client.get_site_by_name(site_label)
    payload = {
        "name": site_label,
        "owner": site_seed.owner,
        "country_id": country_id,
        "site_type": site_seed.site_type,
    }
    if existing is None:
        site = client.create_site(payload)
        site_id = int(site["id"])
    else:
        site_id = int(existing["id"])
        client.patch_site(site_id, payload)

    site_data_payload = {
        "site_id": site_id,
        "stage": site_seed.stage,
        "latitude": site_seed.latitude,
        "longitude": site_seed.longitude,
        "lifetime_of_mine_years": site_seed.lifetime_of_mine_years,
    }
    site_data_row = client.get_site_data(site_id)
    if site_data_row is None:
        client.create_site_data(site_data_payload)
    else:
        client.patch_site_data(site_id, site_data_payload)

    subtype_table = (
        "underground_sites"
        if site_seed.site_type == "underground"
        else "open_air_sites"
    )
    subtype_payload: dict[str, Any] = {"site_id": site_id}
    if subtype_table == "underground_sites":
        subtype_payload.update(
            {
                "shaft_depth": site_seed.shaft_depth,
                "tunnel_length": site_seed.tunnel_length,
            }
        )
    else:
        subtype_payload.update(
            {
                "pit_depth": site_seed.pit_depth,
                "surface_area": site_seed.surface_area,
            }
        )
    subtype_row = client.get_subtype_row(subtype_table, site_id)
    if subtype_row is None:
        client.create_subtype_row(subtype_table, subtype_payload)
    else:
        client.patch_subtype_row(subtype_table, site_id, subtype_payload)
    return site_id


def ensure_metric_definition(
    client: SupabaseDataClient,
    *,
    table_name: str,
    metric_key: str,
    label: str,
    unit: str | None,
    commodity_scoped: bool = False,
) -> int:
    definitions_table = (
        "site_water_metric_definitions"
        if table_name == "site_water_metrics"
        else "site_commodity_metric_definitions"
    )
    existing = client.get_definition_by_key(definitions_table, metric_key)
    if existing is not None:
        return int(existing["id"])

    payload: dict[str, Any] = {
        "metric_key": metric_key,
        "label": label,
        "default_unit": unit,
        "sort_order": 1000,
    }
    if definitions_table == "site_commodity_metric_definitions":
        payload["commodity_scoped"] = commodity_scoped
    created = client.create_definition(definitions_table, payload)
    return int(created["id"])


def ensure_commodity(
    client: SupabaseDataClient,
    *,
    name: str,
    ore_type: str,
) -> int:
    existing = client.get_commodity_by_name(name)
    if existing is not None:
        return int(existing["id"])
    created = client.create_commodity({"name": name, "ore_type": ore_type})
    return int(created["id"])


def ensure_site_commodity(
    client: SupabaseDataClient,
    *,
    site_id: int,
    commodity_id: int,
) -> None:
    existing = client.get_site_commodity(site_id, commodity_id)
    if existing is None:
        client.create_site_commodity({"site_id": site_id, "commodity_id": commodity_id})


def project_rows_to_site_facts(
    client: SupabaseDataClient,
    *,
    document_id: int,
    dataset_name: str,
    series_rows: list[dict[str, Any]],
    site_seeds: dict[str, SiteSeed],
) -> dict[str, int]:
    if not site_seeds:
        return {"projected_rows": 0, "skipped_rows": len(series_rows)}

    existing_facts = client.list_site_facts_by_document(document_id)
    for fact in existing_facts:
        fact_id = str(fact["id"])
        client.delete_site_water_metrics_by_fact_id(fact_id)
        client.delete_site_commodity_metrics_by_fact_id(fact_id)
    if existing_facts:
        client.delete_site_facts_by_document(document_id)

    projected_rows = 0
    skipped_rows = 0
    imported_at = utc_now()

    for row in series_rows:
        classification = classify_series_row(row)
        site_seed = site_seeds.get(classification.site_label)
        if site_seed is None:
            skipped_rows += 1
            continue

        site_id = ensure_site(client, site_label=classification.site_label, site_seed=site_seed)
        commodity_id: int | None = None
        if classification.commodity_name and classification.commodity_ore_type:
            commodity_id = ensure_commodity(
                client,
                name=classification.commodity_name,
                ore_type=classification.commodity_ore_type,
            )
            ensure_site_commodity(client, site_id=site_id, commodity_id=commodity_id)

        definition_id = ensure_metric_definition(
            client,
            table_name=classification.table_name,
            metric_key=classification.metric_key,
            label=classification.metric_label,
            unit=classification.unit,
            commodity_scoped=classification.commodity_scoped,
        )
        for cell in row["values_by_year"]:
            if cell["numeric_value"] is None:
                continue
            provenance = {
                "document_id": document_id,
                "source_url": DEFAULT_SOURCE_URL,
                "uploaded_at": imported_at,
                "uploaded_by": "import_chamber_output_csv.py",
                "dataset_name": dataset_name,
                "row_label": row["row_label"],
                "context_label": row["context_label"],
                "source_line_number": row["line_number"],
                "resolved_site_label": classification.site_label,
                "resolved_metric_label": classification.metric_label,
                "resolved_product_label": classification.product_label,
                "resolved_commodity_name": classification.commodity_name,
                "raw_value": cell["raw_value"],
                "note": cell["note"],
            }
            fact = client.create_site_fact(
                {
                    "site_id": site_id,
                    "document_id": document_id,
                    "commodity_id": commodity_id,
                    "field_key": classification.metric_key,
                    "table_target": classification.table_name,
                    "subtype_scope": site_seed.site_type,
                    "value_type": "numeric",
                    "value_numeric": cell["numeric_value"],
                    "effective_year": cell["year"],
                    "unit": classification.unit,
                    "project_label": row["context_label"],
                    "status": "accepted",
                    "provenance": provenance,
                }
            )
            metric_payload = {
                "site_id": site_id,
                "definition_id": definition_id,
                "yr": cell["year"],
                "value_numeric": cell["numeric_value"],
                "unit": classification.unit or "",
                "project_label": row["context_label"],
                "fact_id": fact["id"],
            }
            if classification.table_name == "site_commodity_metrics":
                metric_payload["commodity_id"] = commodity_id
            existing_metric = client.get_metric_row(
                classification.table_name,
                site_id=site_id,
                definition_id=definition_id,
                yr=int(cell["year"]),
                commodity_id=commodity_id,
                project_label=row["context_label"],
            )
            if existing_metric is None:
                client.create_metric_row(classification.table_name, metric_payload)
            else:
                client.patch_metric_row(
                    classification.table_name,
                    int(existing_metric["id"]),
                    metric_payload,
                )
            projected_rows += 1
    return {"projected_rows": projected_rows, "skipped_rows": skipped_rows}


def upsert_dataset_document(
    client: SupabaseDataClient,
    *,
    source_url: str,
    title: str,
    attribution: str,
    notes: str,
) -> dict[str, Any]:
    existing = client.get_document_by_source_url(source_url)
    payload = {
        "title": title,
        "source_url": source_url,
        "source_domain": urlparse(source_url).netloc or "unknown",
        "attribution": attribution,
        "notes": notes,
        "mime_type": "text/csv",
        "last_http_status": None,
        "last_fetched_at": None,
        "latest_job_status": "queued",
    }
    if existing is None:
        return client.create_document(payload)

    client.patch_document(existing["id"], payload)
    existing.update(payload)
    return existing


def run_import(args: argparse.Namespace) -> None:
    if not args.csv_path.exists():
        raise FileNotFoundError(f"CSV not found: {args.csv_path}")

    rows = load_csv_rows(args.csv_path)
    years, series_rows, metadata = parse_series_rows(rows)
    notes = build_document_notes(metadata, args.csv_path)
    site_map_path = resolve_site_map_path(args)
    site_seeds = load_site_seeds(site_map_path)

    print(
        f"Parsed {len(series_rows)} series rows covering {years[0]}-{years[-1]} "
        f"from {args.csv_path.name}."
    )
    if site_map_path is None:
        print(
            "No site map configured; importer will only write documents, "
            "processing_jobs, and extracted_records."
        )
    else:
        print(f"Using site map: {site_map_path.name}.")
    if args.dry_run:
        preview = series_rows[:3]
        for item in preview:
            print(
                f"- {item['series_name']} "
                f"({len(item['values_by_year'])} populated years)"
            )
        print("Dry run complete. No changes written to Supabase.")
        return

    client = SupabaseDataClient(target=args.target)
    job_id: str | None = None
    document_id: str | None = None

    try:
        document = upsert_dataset_document(
            client,
            source_url=args.source_url,
            title=args.title,
            attribution=args.attribution,
            notes=notes,
        )
        document_id = document["id"]

        client.patch_document(
            document_id,
            {"latest_job_status": "parsing", "updated_at": utc_now()},
        )

        job = client.create_job(
            {
                "document_id": document_id,
                "status": "parsing",
                "worker_version": "csv-importer-v1",
                "started_at": utc_now(),
                "extracted_excerpt": (
                    f"Importing {len(series_rows)} output series from CSV dataset."
                ),
            }
        )
        job_id = job["id"]

        record_payloads = build_record_payloads(
            document_id=document_id,
            job_id=job_id,
            dataset_name=DEFAULT_DATASET_NAME,
            years=years,
            series_rows=series_rows,
            metadata=metadata,
        )

        client.delete_extracted_records(document_id)
        for batch in chunked(record_payloads, size=100):
            client.insert_extracted_records(batch)

        projection_summary = project_rows_to_site_facts(
            client,
            document_id=int(document_id),
            dataset_name=DEFAULT_DATASET_NAME,
            series_rows=series_rows,
            site_seeds=site_seeds,
        )

        completed_at = utc_now()
        client.patch_job(
            job_id,
            {
                "status": "completed",
                "completed_at": completed_at,
                "extracted_excerpt": (
                    f"Imported {len(series_rows)} series rows, "
                    f"{len(record_payloads)} extracted records, and "
                    f"{projection_summary['projected_rows']} projected fact rows."
                ),
            },
        )
        client.patch_document(
            document_id,
            {
                "latest_job_status": "completed",
                "latest_processed_at": completed_at,
            },
        )
        print(
            f"Imported {len(record_payloads)} extracted records for document "
            f"{document_id}; projected {projection_summary['projected_rows']} "
            f"site fact rows and skipped {projection_summary['skipped_rows']} "
            f"unmapped series rows."
        )
    except Exception as exc:
        if job_id is not None:
            client.patch_job(
                job_id,
                {
                    "status": "failed",
                    "completed_at": utc_now(),
                    "error_message": str(exc),
                },
            )
        if document_id is not None:
            client.patch_document(document_id, {"latest_job_status": "failed"})
        raise
    finally:
        client.close()


def main() -> None:
    args = parse_args()
    run_import(args)


if __name__ == "__main__":
    main()
