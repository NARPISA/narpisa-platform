from __future__ import annotations

import argparse
import csv
import json
import os
import shutil
import subprocess
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.error import HTTPError
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen


DEFAULT_SOURCE_URL = "https://www.chamberofmines.org.na/"
DEFAULT_TITLE = "Chamber member output by mine, 1990-2023"
DEFAULT_ATTRIBUTION = "Chamber of Mines Namibia"
DEFAULT_RECORD_TYPE = "mining_output_series"
DEFAULT_DATASET_NAME = "Output by Chamber Members 1990-2023 (Output by Mine)"
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


class SupabaseRestClient:
    def __init__(self, *, target: str) -> None:
        base_url, service_role_key = resolve_supabase_rest_config(target=target)
        self.base_url = base_url
        self.default_headers = {
            "apikey": service_role_key,
            "Authorization": f"Bearer {service_role_key}",
            "Content-Type": "application/json",
        }

    def close(self) -> None:
        return None

    def _request(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, str] | None = None,
        json_body: dict[str, Any] | list[dict[str, Any]] | None = None,
        headers: dict[str, str] | None = None,
    ) -> Any:
        parsed_base = urlparse(self.base_url)
        query = ""
        if params:
            query = urlencode(params)
        base_path = parsed_base.path.rstrip("/")
        url = f"{parsed_base.scheme}://{parsed_base.netloc}{base_path}{path}"
        if query:
            url = f"{url}?{query}"

        request_headers = dict(self.default_headers)
        if headers:
            request_headers.update(headers)

        data: bytes | None = None
        if json_body is not None:
            data = json.dumps(json_body).encode("utf-8")

        request = Request(url, data=data, headers=request_headers, method=method)
        try:
            with urlopen(request, timeout=30) as response:
                payload = response.read().decode("utf-8")
                if not payload:
                    return None
                return json.loads(payload)
        except HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(
                f"Supabase request failed ({method} {path}): {exc.code} {body}"
            ) from exc

    def get_document_by_source_url(self, source_url: str) -> dict[str, Any] | None:
        payload = self._request(
            "GET",
            "/documents",
            params={"source_url": f"eq.{source_url}", "select": "*"},
        )
        if not payload:
            return None
        return payload[0]

    def create_document(self, payload: dict[str, Any]) -> dict[str, Any]:
        response = self._request(
            "POST",
            "/documents",
            headers={"Prefer": "return=representation"},
            json_body=payload,
        )
        return response[0]

    def patch_document(self, document_id: str, payload: dict[str, Any]) -> None:
        self._request(
            "PATCH",
            "/documents",
            params={"id": f"eq.{document_id}"},
            json_body=payload,
        )

    def create_job(self, payload: dict[str, Any]) -> dict[str, Any]:
        response = self._request(
            "POST",
            "/processing_jobs",
            headers={"Prefer": "return=representation"},
            json_body=payload,
        )
        return response[0]

    def patch_job(self, job_id: str, payload: dict[str, Any]) -> None:
        self._request(
            "PATCH",
            "/processing_jobs",
            params={"id": f"eq.{job_id}"},
            json_body=payload,
        )

    def delete_extracted_records(self, document_id: str) -> None:
        self._request(
            "DELETE",
            "/extracted_records",
            params={"document_id": f"eq.{document_id}"},
        )

    def insert_extracted_records(self, payload: list[dict[str, Any]]) -> None:
        self._request(
            "POST",
            "/extracted_records",
            headers={"Prefer": "return=minimal"},
            json_body=payload,
        )


def build_document_notes(metadata: DatasetMetadata, csv_path: Path) -> str:
    parts = [
        f"Imported from CSV: {csv_path.name}.",
        (
            "Imported against the 001_init_schema document-processing tables "
            "instead of site_data because this CSV does not include the coordinates "
            "or mine-type fields required by public.sites."
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
            "confidence": 1.0,
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
                "confidence": 1.0,
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


def resolve_local_supabase_rest_config() -> tuple[str, str]:
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
    rest_url = payload.get("REST_URL")
    service_role_key = payload.get("SERVICE_ROLE_KEY")
    if not rest_url or not service_role_key:
        raise RuntimeError(
            "Local Supabase status did not return REST_URL and SERVICE_ROLE_KEY."
        )
    return str(rest_url), str(service_role_key)


def resolve_env_supabase_rest_config() -> tuple[str, str]:
    repo_root = resolve_repo_root()
    load_dotenv(repo_root / ".env")

    supabase_url = os.environ.get("SUPABASE_URL")
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not service_role_key:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the "
            "environment or the repo root .env file."
        )

    parsed = urlparse(supabase_url)
    if parsed.netloc == "supabase.com":
        path_parts = [part for part in parsed.path.split("/") if part]
        if len(path_parts) >= 3 and path_parts[:2] == ["dashboard", "project"]:
            project_ref = path_parts[2]
            rest_url = f"https://{project_ref}.supabase.co/rest/v1"
            return rest_url, service_role_key

    return f"{supabase_url.rstrip('/')}/rest/v1", service_role_key


def resolve_supabase_rest_config(*, target: str) -> tuple[str, str]:
    if target == "local":
        return resolve_local_supabase_rest_config()
    return resolve_env_supabase_rest_config()


def upsert_dataset_document(
    client: SupabaseRestClient,
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

    print(
        f"Parsed {len(series_rows)} series rows covering {years[0]}-{years[-1]} "
        f"from {args.csv_path.name}."
    )
    if args.dry_run:
        preview = series_rows[:3]
        for item in preview:
            print(
                f"- {item['series_name']} "
                f"({len(item['values_by_year'])} populated years)"
            )
        print("Dry run complete. No changes written to Supabase.")
        return

    client = SupabaseRestClient(target=args.target)
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

        completed_at = utc_now()
        client.patch_job(
            job_id,
            {
                "status": "completed",
                "completed_at": completed_at,
                "extracted_excerpt": (
                    f"Imported {len(series_rows)} series rows and "
                    f"{len(record_payloads)} extracted records."
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
            f"Imported {len(record_payloads)} records into Supabase for document "
            f"{document_id}."
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
