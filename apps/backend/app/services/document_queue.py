from urllib.parse import urlparse

from app.core.config import get_settings
from app.models.document import QueuedSourceDocument, SourceParseRequest
from app.services.job_store import JobStore


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
