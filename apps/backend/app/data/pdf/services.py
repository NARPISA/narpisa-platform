# mypy: ignore-errors
from __future__ import annotations

from datetime import UTC, date, datetime
from enum import StrEnum
from pathlib import Path
from typing import Any, cast
from urllib.parse import urlparse

import httpx
import pypdf
from fastapi import HTTPException
from pydantic import BaseModel, Field, TypeAdapter, create_model

from app.core.config import Settings, get_settings
from app.core.database import engine
from app.data.pdf.models import (
    ParsedDocument,
    ParsedJobDetail,
    ParsedRecord,
    ParserCommitResponse,
    QueuedSourceDocument,
    SourceParseRequest,
)
from app.data.services import FetchResult, fetch_data_source

JSONValue = str | int | float | bool | None | list["JSONValue"] | dict[str, "JSONValue"]
PARSER_MODEL = "gemini-3.1-flash-lite-preview"
EXTRACTION_TARGETS = (
    "sites",
    "site_data",
    "underground_sites",
    "open_air_sites",
    "site_water_metrics",
    "site_commodity_metrics",
)


def _dynamic_strenum(enum_name: str, values: list[str]) -> type[StrEnum]:
    """Build a dedicated StrEnum subclass so JSON validation has a real enum type.

    Annotating fields with the base StrEnum and mutating it with setattr breaks
    Pydantic v2 JSON mode (needs_python_object). Each field gets its own enum type.
    """
    if not values:
        raise ValueError(f"Cannot build enum {enum_name!r}: no allowed values.")
    members: dict[str, str] = {}
    seen_keys: set[str] = set()
    for raw in values:
        stem = "".join(ch if ch.isalnum() else "_" for ch in raw).strip("_").upper()
        if not stem:
            stem = "MEMBER"
        if stem[0].isdigit():
            stem = f"V_{stem}"
        key = stem[:120]
        suffix = 0
        while key in seen_keys:
            suffix += 1
            key = f"{stem}_{suffix}"[:120]
        seen_keys.add(key)
        members[key] = raw
    return StrEnum(enum_name, members)


def build_model(
    model_name: str,
    field_keys: list[str],
    labels: list[str],
    data_types: list[str],
    enum_options: list[list[str] | None],
    *,
    include_site_name: bool = False,
) -> type[BaseModel]:
    model_dict: dict[str, tuple[Any, Field]] = {}
    if include_site_name:
        model_dict["site_name"] = (
            str | None,
            Field(
                default=None,
                description="Mine or project site name that this row belongs to.",
            ),
        )

    for field_key, label, data_type, enum_option in zip(
        field_keys, labels, data_types, enum_options, strict=True
    ):
        model_field_type: Any = str
        match data_type:
            case "text":
                model_field_type = str
            case "numeric":
                model_field_type = float
            case "integer":
                model_field_type = int
            case "boolean":
                model_field_type = bool
            case "date":
                model_field_type = date
            case "json":
                model_field_type = JSONValue
            case "enum":
                enum_name = f"{model_name}_{field_key}_Enum"
                model_field_type = _dynamic_strenum(enum_name, enum_option or [])
            case "foreign_key":
                relation = relation_options_for_field(field_key)
                enum_name = f"{model_name}_{field_key}_RelationEnum"
                names = relation or [""]
                model_field_type = _dynamic_strenum(enum_name, names)
        model_dict[field_key] = (
            model_field_type | None,
            Field(default=None, description=label),
        )
    return create_model(model_name, **model_dict)


def relation_options_for_field(field_key: str) -> list[str]:
    if field_key in {"country", "country_id"}:
        response = engine.table("countries").select("name").execute()
        return [str(row["name"]) for row in response.data or [] if row.get("name")]
    if field_key in {"commodity", "commodity_id", "commodity_name"}:
        response = engine.table("commodities").select("name").execute()
        return [str(row["name"]) for row in response.data or [] if row.get("name")]
    if field_key in {"site", "site_id", "site_name", "mine"}:
        response = engine.table("sites").select("name").execute()
        return [str(row["name"]) for row in response.data or [] if row.get("name")]
    return []


def fetch_fields(table_target: str) -> dict[str, list[Any]]:
    response = (
        engine.table("site_data_fields")
        .select(
            "field_key",
            "label",
            "data_type",
            "table_target",
            "enum_options",
        )
        .eq("table_target", table_target)
        .execute()
    )
    rows = response.data or []
    if not rows:
        return {"field_key": [], "label": [], "data_type": [], "enum_options": []}
    return {
        "field_key": [row["field_key"] for row in rows],
        "label": [row["label"] for row in rows],
        "data_type": [row["data_type"] for row in rows],
        "enum_options": [row.get("enum_options") for row in rows],
    }


def fetch_metric_definitions(kind: str) -> list[dict[str, Any]]:
    table = (
        "site_water_metric_definitions"
        if kind == "water"
        else "site_commodity_metric_definitions"
    )
    response = (
        engine.table(table)
        .select("id,metric_key,label,default_unit,sort_order")
        .order("sort_order")
        .execute()
    )
    return [cast(dict[str, Any], row) for row in response.data or []]


def build_metric_model(
    model_name: str,
    definitions: list[dict[str, Any]],
    *,
    commodity_scoped: bool,
) -> type[BaseModel]:
    metric_keys = [
        str(row["metric_key"]) for row in definitions if row.get("metric_key")
    ]
    metric_type: Any = (
        _dynamic_strenum(f"{model_name}_MetricEnum", metric_keys)
        if metric_keys
        else str
    )
    model_dict: dict[str, tuple[Any, Field]] = {
        "site_name": (
            str | None,
            Field(default=None, description="Mine or project site name."),
        ),
        "metric_key": (
            metric_type | None,
            Field(
                default=None,
                description=(
                    "Metric key from the allowed metric definitions. Use the closest "
                    "matching key when source labels differ."
                ),
            ),
        ),
        "metric_label": (
            str | None,
            Field(default=None, description="Raw metric label found in the source."),
        ),
        "yr": (int | None, Field(default=None, description="Reporting year.")),
        "value_numeric": (
            float | None,
            Field(default=None, description="Numeric metric value."),
        ),
        "unit": (
            str | None,
            Field(default=None, description="Unit exactly as reported."),
        ),
        "project_label": (
            str | None,
            Field(default=None, description="Project, scenario, or study case label."),
        ),
    }
    if commodity_scoped:
        model_dict["commodity_name"] = (
            str | None,
            Field(
                default=None,
                description="Commodity name if the metric is commodity-specific.",
            ),
        )
    return create_model(model_name, **model_dict)


def _model_rows(rows: list[BaseModel]) -> list[dict[str, Any]]:
    return [
        row.model_dump(mode="json", exclude_none=True)
        for row in rows
        if row.model_dump(mode="json", exclude_none=True)
    ]


def _generate_rows(
    client: Any,
    *,
    model_cls: type[BaseModel],
    prompt: str,
    pdf_file: Any,
) -> tuple[list[dict[str, Any]], str]:
    response = client.models.generate_content(
        model=PARSER_MODEL,
        contents=[prompt, pdf_file],
        config={
            "response_mime_type": "application/json",
            "response_json_schema": TypeAdapter(list[model_cls]).json_schema(),
        },
    )
    raw_text = response.text or "[]"
    parsed = TypeAdapter(list[model_cls]).validate_json(raw_text)
    return _model_rows(parsed), raw_text


async def parse_pdf(
    request: SourceParseRequest,
    fetch_result: FetchResult,
) -> ParsedDocument:
    settings = get_settings()
    reader = pypdf.PdfReader(fetch_result.path)
    page_count = len(reader.pages)

    from google import genai

    client = genai.Client(api_key=settings.gemini_api_key)
    pdf_file = client.files.upload(file=fetch_result.path)

    raw_outputs: list[str] = []
    extracted_rows: dict[str, list[dict[str, Any]]] = {}

    for target, model_name in [
        ("sites", "Site"),
        ("site_data", "SiteData"),
        ("underground_sites", "UndergroundSite"),
        ("open_air_sites", "OpenAirSite"),
    ]:
        data = fetch_fields(target)
        model_cls = build_model(
            model_name,
            data["field_key"],
            data["label"],
            data["data_type"],
            data["enum_options"],
            include_site_name=target != "sites",
        )
        rows, raw_text = _generate_rows(
            client,
            model_cls=model_cls,
            prompt=(
                f"Extract a list of {target} from the document. "
                "Return only facts explicitly supported by the source. "
                "For non-site rows include site_name so each row can be linked back "
                "to the mine or project."
            ),
            pdf_file=pdf_file,
        )
        extracted_rows[target] = rows
        raw_outputs.append(raw_text)

    water_model = build_metric_model(
        "SiteWaterMetric",
        fetch_metric_definitions("water"),
        commodity_scoped=False,
    )
    rows, raw_text = _generate_rows(
        client,
        model_cls=water_model,
        prompt=(
            "Extract a list of site_water_metrics from the document. Each row must "
            "include site_name, metric_key, yr, value_numeric, unit, and project_label "
            "when available."
        ),
        pdf_file=pdf_file,
    )
    extracted_rows["site_water_metrics"] = rows
    raw_outputs.append(raw_text)

    commodity_model = build_metric_model(
        "SiteCommodityMetric",
        fetch_metric_definitions("commodity"),
        commodity_scoped=True,
    )
    rows, raw_text = _generate_rows(
        client,
        model_cls=commodity_model,
        prompt=(
            "Extract a list of site_commodity_metrics from the document. Each row "
            "must include site_name, commodity_name when available, metric_key, yr, "
            "value_numeric, unit, and project_label when available."
        ),
        pdf_file=pdf_file,
    )
    extracted_rows["site_commodity_metrics"] = rows
    raw_outputs.append(raw_text)

    extracted_text = "\n\n".join(raw_outputs)
    excerpt = extracted_text[:2000]
    return ParsedDocument(
        title=request.title,
        source_url=request.source_url,
        source_domain=fetch_result.source_domain,
        attribution=request.attribution,
        content_hash=fetch_result.hash,
        page_count=page_count,
        extracted_text=extracted_text,
        extracted_excerpt=excerpt,
        sites_rows=extracted_rows["sites"],
        site_data_rows=extracted_rows["site_data"],
        underground_sites_rows=extracted_rows["underground_sites"],
        open_air_sites_rows=extracted_rows["open_air_sites"],
        site_water_metrics_rows=extracted_rows["site_water_metrics"],
        site_commodity_metrics_rows=extracted_rows["site_commodity_metrics"],
    )


def _parsed_row_groups(
    parsed_document: ParsedDocument,
) -> list[tuple[str, list[dict[str, Any]]]]:
    return [
        ("sites", parsed_document.sites_rows),
        ("site_data", parsed_document.site_data_rows),
        ("underground_sites", parsed_document.underground_sites_rows),
        ("open_air_sites", parsed_document.open_air_sites_rows),
        ("site_water_metrics", parsed_document.site_water_metrics_rows),
        ("site_commodity_metrics", parsed_document.site_commodity_metrics_rows),
    ]


def _clean_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _site_name(row: dict[str, Any]) -> str | None:
    for key in ("site_name", "mine", "name", "site", "project"):
        value = _clean_text(row.get(key))
        if value:
            return value
    return None


def _first_row(rows: Any) -> dict[str, Any] | None:
    return rows[0] if isinstance(rows, list) and rows else None


def _resolve_country_id(country: Any) -> int | None:
    country_name = _clean_text(country)
    if not country_name:
        return None
    existing = (
        engine.table("countries")
        .select("id")
        .eq("name", country_name)
        .limit(1)
        .execute()
    )
    row = _first_row(existing.data)
    if row:
        return int(row["id"])
    created = engine.table("countries").insert({"name": country_name}).execute()
    row = _first_row(created.data)
    return int(row["id"]) if row else None


def _resolve_site_id(row: dict[str, Any], *, create: bool = True) -> int | None:
    name = _site_name(row)
    if not name:
        return None

    existing = engine.table("sites").select("id").eq("name", name).limit(1).execute()
    existing_row = _first_row(existing.data)
    if existing_row:
        site_id = int(existing_row["id"])
        updates = _site_payload(row, partial=True)
        if updates:
            engine.table("sites").update(updates).eq("id", site_id).execute()
        return site_id

    if not create:
        return None

    payload: dict[str, Any] = {
        "name": name,
        "owner": _clean_text(row.get("owner")) or "Unknown",
        "site_type": _clean_text(row.get("site_type") or row.get("type")) or "open_air",
        "status": _clean_text(row.get("status")) or "active",
    }
    country_id = _resolve_country_id(row.get("country_id") or row.get("country"))
    if country_id is not None:
        payload["country_id"] = country_id
    created = engine.table("sites").insert(payload).execute()
    created_row = _first_row(created.data)
    return int(created_row["id"]) if created_row else None


def _site_payload(row: dict[str, Any], *, partial: bool) -> dict[str, Any]:
    payload: dict[str, Any] = {}
    if _clean_text(row.get("owner")):
        payload["owner"] = _clean_text(row.get("owner"))
    if _clean_text(row.get("site_type") or row.get("type")):
        payload["site_type"] = _clean_text(row.get("site_type") or row.get("type"))
    if _clean_text(row.get("status")):
        payload["status"] = _clean_text(row.get("status"))
    country_id = _resolve_country_id(row.get("country_id") or row.get("country"))
    if country_id is not None:
        payload["country_id"] = country_id
    return payload if partial else {"name": _site_name(row), **payload}


def _metric_definition_id(kind: str, row: dict[str, Any]) -> int | None:
    table = (
        "site_water_metric_definitions"
        if kind == "water"
        else "site_commodity_metric_definitions"
    )
    metric_key = _clean_text(row.get("metric_key"))
    metric_label = _clean_text(row.get("metric_label"))
    query = engine.table(table).select("id")
    if metric_key:
        response = query.eq("metric_key", metric_key).limit(1).execute()
    elif metric_label:
        response = query.eq("label", metric_label).limit(1).execute()
    else:
        return None
    result = _first_row(response.data)
    return int(result["id"]) if result else None


def _resolve_commodity_id(row: dict[str, Any]) -> int | None:
    commodity_name = _clean_text(row.get("commodity_name") or row.get("commodity"))
    if not commodity_name:
        return None
    existing = (
        engine.table("commodities")
        .select("id")
        .eq("name", commodity_name)
        .limit(1)
        .execute()
    )
    existing_row = _first_row(existing.data)
    if existing_row:
        return int(existing_row["id"])
    created = (
        engine.table("commodities")
        .insert({"name": commodity_name, "ore_type": "unknown"})
        .execute()
    )
    created_row = _first_row(created.data)
    return int(created_row["id"]) if created_row else None


def _fact_value_payload(value: Any) -> dict[str, Any] | None:
    if value is None or value == "":
        return None
    if isinstance(value, bool):
        return {"value_type": "boolean", "value_boolean": value}
    if isinstance(value, int | float):
        return {"value_type": "numeric", "value_numeric": value}
    if isinstance(value, dict | list):
        return {"value_type": "json", "value_json": value}
    return {"value_type": "text", "value_text": str(value)}


def _insert_fact(
    *,
    document_id: int,
    job_id: str | None,
    extracted_record_id: str | None,
    site_id: int,
    table_target: str,
    field_key: str,
    value_payload: dict[str, Any],
    source_url: str,
    unit: str | None = None,
    project_label: str | None = None,
    effective_year: int | None = None,
    commodity_id: int | None = None,
    provenance: dict[str, Any] | None = None,
) -> None:
    engine.table("site_facts").insert(
        {
            "site_id": site_id,
            "document_id": document_id,
            "extracted_record_id": extracted_record_id,
            "commodity_id": commodity_id,
            "field_key": field_key,
            "table_target": table_target,
            "unit": unit,
            "project_label": project_label,
            "effective_year": effective_year,
            "status": "candidate",
            "provenance": {
                "source": "pdf_parser",
                "source_url": source_url,
                "job_id": job_id,
                **(provenance or {}),
            },
            **value_payload,
        }
    ).execute()


def persist_parsed_document(
    *,
    document_id: int,
    job_id: str,
    parsed_document: ParsedDocument,
) -> int:
    extracted_records: list[dict[str, Any]] = []
    for record_type, rows in _parsed_row_groups(parsed_document):
        extracted_records.extend(
            {
                "document_id": document_id,
                "job_id": job_id,
                "record_type": record_type,
                "payload": row,
            }
            for row in rows
        )

    if not extracted_records:
        return 0

    inserted = engine.table("extracted_records").insert(extracted_records).execute()
    inserted_rows = inserted.data or []
    for record in cast(list[dict[str, Any]], inserted_rows):
        _create_candidate_fact_for_record(
            record=record,
            source_url=str(parsed_document.source_url),
        )
    return len(inserted_rows)


def _create_candidate_fact_for_record(
    *,
    record: dict[str, Any],
    source_url: str,
) -> None:
    payload = cast(dict[str, Any], record.get("payload") or {})
    record_type = str(record["record_type"])
    document_id = int(record["document_id"])
    job_id = str(record["job_id"]) if record.get("job_id") else None
    site_id = _resolve_site_id(payload)
    if site_id is None:
        return

    if record_type in {"site_water_metrics", "site_commodity_metrics"}:
        kind = "water" if record_type == "site_water_metrics" else "commodity"
        definition_id = _metric_definition_id(kind, payload)
        value = payload.get("value_numeric")
        if definition_id is None or value is None:
            return
        commodity_id = (
            _resolve_commodity_id(payload)
            if record_type == "site_commodity_metrics"
            else None
        )
        _insert_fact(
            document_id=document_id,
            job_id=job_id,
            extracted_record_id=str(record["id"]),
            site_id=site_id,
            table_target=record_type,
            field_key=_clean_text(payload.get("metric_key"))
            or _clean_text(payload.get("metric_label"))
            or "metric",
            value_payload={"value_type": "numeric", "value_numeric": value},
            source_url=source_url,
            unit=_clean_text(payload.get("unit")),
            project_label=_clean_text(payload.get("project_label")),
            effective_year=cast(int | None, payload.get("yr")),
            commodity_id=commodity_id,
            provenance={
                "metric_label": payload.get("metric_label"),
                "commodity_name": payload.get("commodity_name"),
                "raw_payload": payload,
            },
        )
        return

    for field_key, value in payload.items():
        if field_key in {"site_name", "mine", "name", "site"}:
            continue
        value_payload = _fact_value_payload(value)
        if value_payload is None:
            continue
        _insert_fact(
            document_id=document_id,
            job_id=job_id,
            extracted_record_id=str(record["id"]),
            site_id=site_id,
            table_target=record_type,
            field_key=field_key,
            value_payload=value_payload,
            source_url=source_url,
            provenance={"raw_payload": payload},
        )


def _upsert_metric_current_row(
    *,
    table_name: str,
    site_id: int,
    definition_id: int,
    value_numeric: Any,
    yr: Any,
    unit: str | None,
    project_label: str | None,
    commodity_id: int | None = None,
) -> bool:
    if value_numeric is None or yr is None:
        return False
    response = (
        engine.table(table_name)
        .select("id,project_label,commodity_id")
        .eq("site_id", site_id)
        .eq("definition_id", definition_id)
        .eq("yr", yr)
        .execute()
    )
    existing = next(
        (
            row
            for row in cast(list[dict[str, Any]], response.data or [])
            if (row.get("project_label") or "") == (project_label or "")
            and (
                table_name != "site_commodity_metrics"
                or (row.get("commodity_id") or 0) == (commodity_id or 0)
            )
        ),
        None,
    )
    payload = {
        "site_id": site_id,
        "definition_id": definition_id,
        "yr": yr,
        "value_numeric": value_numeric,
        "unit": unit or "",
        "project_label": project_label,
    }
    if table_name == "site_commodity_metrics":
        payload["commodity_id"] = commodity_id
    if existing:
        engine.table(table_name).update(payload).eq("id", existing["id"]).execute()
    else:
        engine.table(table_name).insert(payload).execute()
    return True


def commit_extracted_records(records: list[ParsedRecord]) -> int:
    committed = 0
    for record in records:
        payload = record.payload
        record_type = record.record_type
        site_id = _resolve_site_id(payload)
        if site_id is None:
            continue
        if record_type == "sites":
            committed += 1
            continue
        if record_type in {"site_data", "open_air_sites", "underground_sites"}:
            row_payload = {
                key: value
                for key, value in payload.items()
                if key not in {"site_name", "mine", "name", "site"}
                and value not in (None, "")
            }
            if not row_payload:
                continue
            row_payload["site_id"] = site_id
            existing = (
                engine.table(record_type)
                .select("site_id")
                .eq("site_id", site_id)
                .limit(1)
                .execute()
            )
            if _first_row(existing.data):
                (
                    engine.table(record_type)
                    .update(row_payload)
                    .eq("site_id", site_id)
                    .execute()
                )
            else:
                engine.table(record_type).insert(row_payload).execute()
            committed += 1
            continue
        if record_type in {"site_water_metrics", "site_commodity_metrics"}:
            kind = "water" if record_type == "site_water_metrics" else "commodity"
            definition_id = _metric_definition_id(kind, payload)
            if definition_id is None:
                continue
            commodity_id = (
                _resolve_commodity_id(payload)
                if record_type == "site_commodity_metrics"
                else None
            )
            if _upsert_metric_current_row(
                table_name=record_type,
                site_id=site_id,
                definition_id=definition_id,
                value_numeric=payload.get("value_numeric"),
                yr=payload.get("yr"),
                unit=_clean_text(payload.get("unit")),
                project_label=_clean_text(payload.get("project_label")),
                commodity_id=commodity_id,
            ):
                committed += 1
    return committed


class JobStore:
    def __init__(
        self,
        settings: Settings,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self.settings = settings
        self._client = client

    async def create_queued_job(
        self,
        request: SourceParseRequest,
    ) -> QueuedSourceDocument:
        document_payload = {
            "title": request.title,
            "source_url": str(request.source_url),
            "source_domain": urlparse(str(request.source_url)).hostname or "unknown",
            "attribution": request.attribution,
            "notes": request.notes,
            "mime_type": "application/pdf",
            "latest_job_status": "queued",
        }

        async with self._get_client() as client:
            document_response = await client.post(
                "/documents",
                params={"on_conflict": "source_url"},
                headers={
                    "Prefer": "return=representation,resolution=merge-duplicates",
                },
                json=document_payload,
            )
            document_response.raise_for_status()
            document_row = self._extract_single_row(document_response)

            job_response = await client.post(
                "/processing_jobs",
                headers={"Prefer": "return=representation"},
                json={
                    "document_id": document_row["id"],
                    "status": "queued",
                },
            )
            job_response.raise_for_status()
            job_row = self._extract_single_row(job_response)

        return self._map_job(document_row, job_row)

    async def get_job(self, job_id: str) -> QueuedSourceDocument | None:
        async with self._get_client() as client:
            response = await client.get(
                "/processing_jobs",
                params={
                    "select": (
                        "id,status,source_http_status,page_count,error_message,"
                        "started_at,completed_at,created_at,updated_at,"
                        "document:documents("
                        "id,title,source_url,source_domain,attribution,notes,"
                        "mime_type,content_hash,last_http_status,created_at,updated_at)"
                    ),
                    "id": f"eq.{job_id}",
                    "limit": "1",
                },
            )
            response.raise_for_status()
            rows = response.json()

        if not rows:
            return None

        row = rows[0]
        return self._map_job(row["document"], row)

    async def list_jobs(
        self,
        *,
        statuses: list[str] | None = None,
    ) -> list[QueuedSourceDocument]:
        params: dict[str, str] = {
            "select": (
                "id,status,source_http_status,page_count,error_message,"
                "started_at,completed_at,created_at,updated_at,"
                "document:documents("
                "id,title,source_url,source_domain,attribution,notes,"
                "mime_type,content_hash,last_http_status,created_at,updated_at)"
            ),
            "order": "created_at.desc",
        }
        if statuses:
            params["status"] = f"in.({','.join(statuses)})"

        async with self._get_client() as client:
            response = await client.get(
                "/processing_jobs",
                params=params,
            )
            response.raise_for_status()
            rows = response.json()

        return [self._map_job(row["document"], row) for row in rows]

    async def delete_job(self, job_id: str) -> bool:
        job = await self.get_job(job_id)
        if job is None:
            return False

        async with self._get_client() as client:
            document_delete_response = await client.delete(
                "/documents",
                params={"id": f"eq.{job.document_id}"},
            )
            document_delete_response.raise_for_status()

        return True

    async def parsed_detail(self, job_id: str) -> ParsedJobDetail | None:
        job = await self.get_job(job_id)
        if job is None:
            return None

        response = (
            engine.table("extracted_records")
            .select("id,document_id,job_id,record_type,payload,created_at")
            .eq("job_id", job_id)
            .order("created_at")
            .execute()
        )
        records = [
            ParsedRecord.model_validate(row)
            for row in cast(list[dict[str, Any]], response.data or [])
        ]
        return ParsedJobDetail(job=job, records=records)

    async def persist_parsed_document(
        self,
        job_id: str,
        parsed_document: ParsedDocument,
    ) -> int:
        job = await self.get_job(job_id)
        if job is None:
            return 0
        return persist_parsed_document(
            document_id=int(job.document_id),
            job_id=job_id,
            parsed_document=parsed_document,
        )

    async def commit_parsed_document(self, job_id: str) -> ParserCommitResponse | None:
        detail = await self.parsed_detail(job_id)
        if detail is None:
            return None
        records_committed = commit_extracted_records(detail.records)
        facts_response = (
            engine.table("site_facts")
            .update({"status": "accepted"})
            .eq("document_id", int(detail.job.document_id))
            .execute()
        )
        facts_accepted = len(facts_response.data or [])
        return ParserCommitResponse(
            job_id=job_id,
            records_committed=records_committed,
            facts_accepted=facts_accepted,
        )

    async def mark_fetching(self, job_id: str) -> None:
        now = datetime.now(UTC).isoformat()
        job = await self.get_job(job_id)
        if job is None:
            return

        await self._patch_job(job_id, {"status": "fetching", "started_at": now})
        await self._patch_document(job.document_id, {"latest_job_status": "fetching"})

    async def mark_parsing(
        self,
        job_id: str,
        *,
        source_http_status: int,
    ) -> None:
        job = await self.get_job(job_id)
        if job is None:
            return

        await self._patch_job(
            job_id,
            {"status": "parsing", "source_http_status": source_http_status},
        )
        await self._patch_document(
            job.document_id,
            {
                "latest_job_status": "parsing",
                "last_http_status": source_http_status,
                "last_fetched_at": datetime.now(UTC).isoformat(),
            },
        )

    async def mark_completed(
        self,
        job_id: str,
        *,
        content_hash: str,
        page_count: int,
        source_http_status: int,
        extracted_excerpt: str | None = None,
    ) -> None:
        now = datetime.now(UTC).isoformat()
        job = await self.get_job(job_id)
        if job is None:
            return

        await self._patch_job(
            job_id,
            {
                "status": "completed",
                "source_http_status": source_http_status,
                "page_count": page_count,
                "extracted_excerpt": extracted_excerpt,
                "completed_at": now,
                "error_message": None,
            },
        )
        await self._patch_document(
            job.document_id,
            {
                "latest_job_status": "completed",
                "content_hash": content_hash,
                "last_http_status": source_http_status,
                "last_fetched_at": now,
                "latest_processed_at": now,
            },
        )

    async def mark_failed(
        self,
        job_id: str,
        *,
        error_message: str,
        source_http_status: int | None = None,
    ) -> None:
        print(f"Job failed: {error_message}, {source_http_status}")
        now = datetime.now(UTC).isoformat()
        job = await self.get_job(job_id)
        if job is None:
            return

        await self._patch_job(
            job_id,
            {
                "status": "failed",
                "source_http_status": source_http_status,
                "error_message": error_message,
                "completed_at": now,
            },
        )
        document_updates: dict[str, Any] = {
            "latest_job_status": "failed",
        }
        if source_http_status is not None:
            document_updates["last_http_status"] = source_http_status
        await self._patch_document(job.document_id, document_updates)

    async def _patch_job(self, job_id: str, payload: dict[str, Any]) -> None:
        async with self._get_client() as client:
            response = await client.patch(
                "/processing_jobs",
                params={"id": f"eq.{job_id}"},
                json=payload,
            )
            response.raise_for_status()

    async def _patch_document(
        self,
        document_id: str,
        payload: dict[str, Any],
    ) -> None:
        async with self._get_client() as client:
            response = await client.patch(
                "/documents",
                params={"id": f"eq.{document_id}"},
                json=payload,
            )
            response.raise_for_status()

    def _get_client(self) -> _AsyncClientManager:
        return _AsyncClientManager(
            client=self._client,
            base_url=self.settings.supabase_rest_url,
            headers={
                "apikey": self.settings.supabase_service_role_key,
                "Authorization": f"Bearer {self.settings.supabase_service_role_key}",
                "Content-Type": "application/json",
            },
        )

    def _extract_single_row(self, response: httpx.Response) -> dict[str, Any]:
        payload = response.json()
        if isinstance(payload, list):
            return cast(dict[str, Any], payload[0])
        return cast(dict[str, Any], payload)

    def _map_job(
        self,
        document_row: dict[str, Any],
        job_row: dict[str, Any],
    ) -> QueuedSourceDocument:
        return QueuedSourceDocument(
            id=job_row["id"],
            document_id=str(document_row["id"]),
            title=document_row["title"],
            source_url=document_row["source_url"],
            source_domain=document_row["source_domain"],
            attribution=document_row["attribution"],
            notes=document_row.get("notes"),
            mime_type=document_row.get("mime_type", "application/pdf"),
            status=job_row["status"],
            content_hash=document_row.get("content_hash"),
            page_count=job_row.get("page_count"),
            source_http_status=job_row.get("source_http_status"),
            error_message=job_row.get("error_message"),
            queued_at=self._parse_datetime(job_row["created_at"]),
            started_at=self._parse_nullable_datetime(job_row.get("started_at")),
            completed_at=self._parse_nullable_datetime(job_row.get("completed_at")),
            updated_at=self._parse_nullable_datetime(
                job_row.get("updated_at") or document_row.get("updated_at")
            ),
        )

    def _parse_datetime(self, value: str) -> datetime:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))

    def _parse_nullable_datetime(self, value: str | None) -> datetime | None:
        if value is None:
            return None
        return self._parse_datetime(value)


class _AsyncClientManager:
    def __init__(
        self,
        *,
        client: httpx.AsyncClient | None,
        base_url: str,
        headers: dict[str, str],
    ) -> None:
        self._client = client
        self._base_url = base_url
        self._headers = headers
        self._owned_client: httpx.AsyncClient | None = None

    async def __aenter__(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client

        self._owned_client = httpx.AsyncClient(
            base_url=self._base_url,
            headers=self._headers,
            timeout=httpx.Timeout(20.0),
        )
        return self._owned_client

    async def __aexit__(self, exc_type: Any, exc: Any, traceback: Any) -> None:
        if self._owned_client is not None:
            await self._owned_client.aclose()


class QueuedDocumentProcessor:
    async def process(self, job_id: str) -> None:
        settings = get_settings()
        job_store = JobStore(settings=settings)
        queued_job = await job_store.get_job(job_id)
        if queued_job is None:
            return

        download_path = settings.download_directory / f"{queued_job.id}.pdf"

        try:
            await job_store.mark_fetching(job_id)
            fetch_result = await fetch_data_source(
                str(queued_job.source_url),
                download_path,
                "application/pdf",
                timeout=settings.fetch_timeout_seconds,
                chunk_size=settings.fetch_chunk_size_bytes,
                max_size=settings.fetch_max_bytes,
            )

            await job_store.mark_parsing(
                job_id,
                source_http_status=fetch_result.source_status,
            )

            parsed_document = await parse_pdf(
                self._build_parse_request(queued_job), fetch_result
            )
            await job_store.persist_parsed_document(job_id, parsed_document)

            await job_store.mark_completed(
                job_id,
                content_hash=parsed_document.content_hash,
                page_count=parsed_document.page_count,
                source_http_status=fetch_result.source_status,
                extracted_excerpt=parsed_document.extracted_excerpt,
            )
        except HTTPException as error:
            await job_store.mark_failed(
                job_id,
                error_message=error.detail,
                source_http_status=self._extract_http_status(error),
            )
        except httpx.HTTPStatusError as error:
            await job_store.mark_failed(
                job_id,
                error_message=(
                    f"Source fetch failed with HTTP {error.response.status_code}."
                ),
                source_http_status=error.response.status_code,
            )
        except Exception as error:
            await job_store.mark_failed(
                job_id,
                error_message=str(error) or "Unexpected processing failure.",
            )
        finally:
            if not settings.keep_downloaded_pdfs:
                self._cleanup_download(download_path)

    def _build_parse_request(
        self,
        queued_job: QueuedSourceDocument,
    ) -> SourceParseRequest:
        return SourceParseRequest(
            title=queued_job.title,
            source_url=queued_job.source_url,
            attribution=queued_job.attribution,
            notes=queued_job.notes,
        )

    def _cleanup_download(self, download_path: Path) -> None:
        if download_path.exists():
            download_path.unlink()

    def _extract_http_status(self, error: HTTPException) -> int | None:
        return error.status_code if isinstance(error.status_code, int) else None


class DocumentQueue:
    async def enqueue(self, request: SourceParseRequest) -> QueuedSourceDocument:
        self._validate_pdf_source_url(str(request.source_url))
        settings = get_settings()
        job_store = JobStore(settings=settings)
        return await job_store.create_queued_job(request)

    async def list_items(self) -> list[QueuedSourceDocument]:
        settings = get_settings()
        job_store = JobStore(settings=settings)
        return self._latest_jobs_by_document(await job_store.list_jobs())

    async def list_recoverable_items(self) -> list[QueuedSourceDocument]:
        settings = get_settings()
        job_store = JobStore(settings=settings)
        return self._latest_jobs_by_document(
            await job_store.list_jobs(statuses=["queued", "fetching", "parsing"])
        )

    async def get_item(self, job_id: str) -> QueuedSourceDocument | None:
        settings = get_settings()
        job_store = JobStore(settings=settings)
        return await job_store.get_job(job_id)

    async def delete_item(self, job_id: str) -> bool:
        settings = get_settings()
        job_store = JobStore(settings=settings)
        return await job_store.delete_job(job_id)

    async def parsed_detail(self, job_id: str) -> ParsedJobDetail | None:
        settings = get_settings()
        job_store = JobStore(settings=settings)
        return await job_store.parsed_detail(job_id)

    async def commit_item(self, job_id: str) -> ParserCommitResponse | None:
        settings = get_settings()
        job_store = JobStore(settings=settings)
        return await job_store.commit_parsed_document(job_id)

    def _validate_pdf_source_url(self, source_url: str) -> None:
        parsed_url = urlparse(source_url)
        if not parsed_url.path.lower().endswith(".pdf"):
            raise ValueError("Source URL must point to a PDF document.")

    def _latest_jobs_by_document(
        self,
        jobs: list[QueuedSourceDocument],
    ) -> list[QueuedSourceDocument]:
        latest_by_document: dict[str, QueuedSourceDocument] = {}
        ordered_latest_jobs: list[QueuedSourceDocument] = []

        for job in jobs:
            if job.document_id in latest_by_document:
                continue

            latest_by_document[job.document_id] = job
            ordered_latest_jobs.append(job)

        return ordered_latest_jobs


document_queue = DocumentQueue()
