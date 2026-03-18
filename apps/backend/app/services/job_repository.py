import asyncio
from datetime import UTC, datetime
from typing import Any
from urllib.parse import urlparse

from supabase import Client, create_client

from app.core.config import Settings
from app.core.exceptions import NonRetryableTaskError
from app.models.document import (
    DocumentRecord,
    ParsedDocument,
    ProcessingJobRecord,
    SourceParseRequest,
)


def utc_now_iso() -> str:
    return datetime.now(UTC).isoformat()


class SupabaseJobRepository:
    def __init__(self, settings: Settings) -> None:
        if not settings.supabase_enabled:
            raise NonRetryableTaskError(
                "Supabase credentials are not configured for the worker.",
                status_code=500,
            )
        self.settings = settings
        self._client: Client = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key,
        )

    async def upsert_document(self, payload: SourceParseRequest) -> DocumentRecord:
        source_url = str(payload.source_url)
        source_domain = urlparse(source_url).hostname or "unknown"
        document_payload = {
            "title": payload.title,
            "source_url": source_url,
            "source_domain": source_domain,
            "attribution": payload.attribution,
            "notes": payload.notes,
            "latest_job_status": "queued",
        }

        response = await asyncio.to_thread(
            lambda: self._client.table("documents")
            .upsert(document_payload, on_conflict="source_url")
            .execute()
        )
        document = response.data[0]
        return DocumentRecord.model_validate(document)

    async def create_job(self, document_id: str) -> ProcessingJobRecord:
        response = await asyncio.to_thread(
            lambda: self._client.table("processing_jobs")
            .insert(
                {
                    "document_id": document_id,
                    "status": "queued",
                    "worker_version": self.settings.worker_version,
                }
            )
            .execute()
        )
        await self._update_document(
            document_id,
            {"latest_job_status": "queued", "updated_at": utc_now_iso()},
        )
        return ProcessingJobRecord.model_validate(response.data[0])

    async def get_job(self, job_id: str) -> ProcessingJobRecord | None:
        response = await asyncio.to_thread(
            lambda: self._client.table("processing_jobs")
            .select("*")
            .eq("id", job_id)
            .limit(1)
            .execute()
        )
        if not response.data:
            return None
        return ProcessingJobRecord.model_validate(response.data[0])

    async def update_job_status(
        self,
        job_id: str,
        status: str,
        *,
        source_http_status: int | None = None,
        error_message: str | None = None,
        page_count: int | None = None,
        extracted_excerpt: str | None = None,
        started: bool = False,
        completed: bool = False,
    ) -> None:
        job = await self.get_job(job_id)
        if job is None:
            raise NonRetryableTaskError(
                f"Processing job {job_id} was not found.",
                status_code=404,
            )

        update_payload: dict[str, Any] = {
            "status": status,
            "source_http_status": source_http_status,
            "error_message": error_message,
            "page_count": page_count,
            "extracted_excerpt": extracted_excerpt,
            "updated_at": utc_now_iso(),
        }
        if started:
            update_payload["started_at"] = utc_now_iso()
        if completed:
            update_payload["completed_at"] = utc_now_iso()

        await asyncio.to_thread(
            lambda: self._client.table("processing_jobs")
            .update(update_payload)
            .eq("id", job_id)
            .execute()
        )
        document_payload: dict[str, Any] = {
            "latest_job_status": status,
            "updated_at": utc_now_iso(),
        }
        if completed:
            document_payload["latest_processed_at"] = utc_now_iso()
        await self._update_document(job.document_id, document_payload)

    async def persist_parsed_result(
        self,
        document_id: str,
        job_id: str,
        parsed: ParsedDocument,
    ) -> None:
        await asyncio.to_thread(
            lambda: self._client.table("extracted_records")
            .delete()
            .eq("job_id", job_id)
            .execute()
        )
        await asyncio.to_thread(
            lambda: self._client.table("extracted_records")
            .insert(
                {
                    "document_id": document_id,
                    "job_id": job_id,
                    "record_type": "parsed_document",
                    "source_section": "full_document",
                    "confidence": 1.0,
                    "payload": parsed.model_dump(mode="json"),
                }
            )
            .execute()
        )
        await self._update_document(
            document_id,
            {
                "content_hash": parsed.content_hash,
                "last_http_status": 200,
                "last_fetched_at": utc_now_iso(),
                "latest_processed_at": utc_now_iso(),
                "latest_job_status": "completed",
                "updated_at": utc_now_iso(),
            },
        )
        await self.update_job_status(
            job_id,
            "completed",
            source_http_status=200,
            page_count=parsed.page_count,
            extracted_excerpt=parsed.extracted_excerpt,
            completed=True,
        )

    async def mark_job_failed(
        self,
        job_id: str,
        *,
        error_message: str,
        source_http_status: int | None = None,
    ) -> None:
        await self.update_job_status(
            job_id,
            "failed",
            source_http_status=source_http_status,
            error_message=error_message,
        )

    async def _update_document(
        self,
        document_id: str,
        payload: dict[str, Any],
    ) -> None:
        await asyncio.to_thread(
            lambda: self._client.table("documents")
            .update(payload)
            .eq("id", document_id)
            .execute()
        )
