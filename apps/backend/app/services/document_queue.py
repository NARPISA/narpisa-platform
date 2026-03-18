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
        return await job_store.list_jobs()

    async def get_item(self, job_id: str) -> QueuedSourceDocument | None:
        settings = get_settings()
        job_store = JobStore(settings=settings)
        return await job_store.get_job(job_id)

    def _validate_pdf_source_url(self, source_url: str) -> None:
        parsed_url = urlparse(source_url)
        if not parsed_url.path.lower().endswith(".pdf"):
            raise ValueError("Source URL must point to a PDF document.")


document_queue = DocumentQueue()
