# mypy: disable-error-code=untyped-decorator

import asyncio

from app.celery_main import celery_app
from app.data.pdf.services import QueuedDocumentProcessor, document_queue


# Celery's decorator is intentionally untyped.
@celery_app.task
def process_queued_document(job_id: str) -> None:
    processor = QueuedDocumentProcessor()
    asyncio.run(processor.process(job_id))


def recover_queued_documents() -> None:
    async def _recover() -> None:
        recoverable_jobs = await document_queue.list_recoverable_items()
        for job in recoverable_jobs:
            process_queued_document.delay(job.id)

    asyncio.run(_recover())
