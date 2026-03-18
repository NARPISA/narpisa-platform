from dataclasses import dataclass

from app.core.exceptions import NonRetryableTaskError, RetryableTaskError
from app.models.document import (
    ParsedDocument,
    ProcessingStatus,
    ProcessSourceTaskPayload,
    SourceParseRequest,
)
from app.services.job_repository import SupabaseJobRepository
from app.services.pdf_parser import PdfParser
from app.services.source_fetcher import SourceFetcher


@dataclass(slots=True)
class ProcessingResult:
    status: ProcessingStatus
    parsed_document: ParsedDocument | None = None


class SourceProcessingService:
    def __init__(
        self,
        repository: SupabaseJobRepository,
        fetcher: SourceFetcher,
        parser: PdfParser,
    ) -> None:
        self.repository = repository
        self.fetcher = fetcher
        self.parser = parser

    async def process_task(
        self,
        payload: ProcessSourceTaskPayload,
    ) -> ProcessingResult:
        job = await self.repository.get_job(payload.job_id)
        if job is None:
            raise NonRetryableTaskError(
                f"Processing job {payload.job_id} was not found.",
                status_code=404,
            )

        if job.status == "completed":
            return ProcessingResult(status="completed")

        await self.repository.update_job_status(
            payload.job_id,
            "fetching",
            started=job.status == "queued",
        )
        fetch_result = await self.fetcher.fetch_pdf(str(payload.source_url))

        await self.repository.update_job_status(payload.job_id, "parsing")
        parsed = self.parser.parse(
            SourceParseRequest(
                title=payload.title,
                source_url=payload.source_url,
                attribution=payload.attribution,
                notes=payload.notes,
            ),
            fetch_result,
        )
        await self.repository.persist_parsed_result(
            payload.document_id,
            payload.job_id,
            parsed,
        )
        return ProcessingResult(status="completed", parsed_document=parsed)

    async def mark_non_retryable_failure(
        self,
        job_id: str,
        error: NonRetryableTaskError,
    ) -> None:
        await self.repository.mark_job_failed(
            job_id,
            error_message=str(error),
            source_http_status=error.status_code,
        )

    async def mark_retryable_failure(
        self,
        job_id: str,
        error: RetryableTaskError | Exception,
    ) -> None:
        status_code = (
            error.status_code if isinstance(error, RetryableTaskError) else None
        )
        await self.repository.mark_job_failed(
            job_id,
            error_message=str(error),
            source_http_status=status_code,
        )
