from __future__ import annotations

from pathlib import Path

import httpx
from fastapi import HTTPException

from app.core.config import get_settings
from app.models.document import QueuedSourceDocument, SourceParseRequest
from app.services.job_store import JobStore
from app.services.pdf_parser import PdfParser
from app.services.source_fetcher import SourceFetcher


class QueuedDocumentProcessor:
    async def process(self, job_id: str) -> None:
        settings = get_settings()
        job_store = JobStore(settings=settings)
        queued_job = await job_store.get_job(job_id)
        if queued_job is None:
            return

        download_path = settings.download_directory / f"{queued_job.id}.pdf"
        fetcher = SourceFetcher(settings=settings)
        parser = PdfParser()

        try:
            await job_store.mark_fetching(job_id)
            fetch_result = await fetcher.fetch_pdf(
                str(queued_job.source_url),
                download_path,
            )

            await job_store.mark_parsing(
                job_id,
                source_http_status=fetch_result.source_http_status,
            )

            parsed_document = parser.parse(
                self._build_parse_request(queued_job),
                fetch_result,
            )

            await job_store.mark_completed(
                job_id,
                content_hash=parsed_document.content_hash,
                page_count=parsed_document.page_count,
                source_http_status=fetch_result.source_http_status,
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
