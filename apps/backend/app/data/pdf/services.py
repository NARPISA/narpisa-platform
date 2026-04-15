from __future__ import annotations

from app.core.config import Settings, get_settings
from app.data.services import FetchResult, fetch_data_source
from app.data.pdf.models import ParsedDocument, SourceParseRequest, QueuedSourceDocument

from dataclasses import dataclass
from datetime import UTC, datetime
from fastapi import HTTPException, status
from hashlib import sha256
import httpx
from pathlib import Path
from pypdf import PdfReader
from typing import Any, cast
from urllib.parse import urlparse


class PdfParser:
    def parse(
        self,
        request: SourceParseRequest,
        fetch_result: FetchResult,
    ) -> ParsedDocument:
        reader = PdfReader(str(fetch_result.path))
        extracted_text = ""
        excerpt = ""

        return ParsedDocument(
            title=request.title,
            source_url=request.source_url,
            source_domain=fetch_result.source_domain,
            attribution=request.attribution,
            content_hash=fetch_result.hash,
            page_count=len(reader.pages),
            extracted_text=extracted_text,
            extracted_excerpt=excerpt,
        )


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
            document_id=document_row["id"],
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
        parser = PdfParser()

        try:
            await job_store.mark_fetching(job_id)
            fetch_result = await fetch_data_source(
                str(queued_job.source_url),
                download_path,
                "application/pdf",
                timeout=settings.fetch_timeout_seconds,
                chunk_size=settings.fetch_chunk_size_bytes,
                max_size=settings.fetch_max_bytes
            )

            await job_store.mark_parsing(
                job_id,
                source_http_status=fetch_result.source_status,
            )

            parsed_document = parser.parse(
                self._build_parse_request(queued_job),
                fetch_result,
            )

            await job_store.mark_completed(
                job_id,
                content_hash=parsed_document.content_hash,
                page_count=parsed_document.page_count,
                source_http_status=fetch_result.source_status,
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