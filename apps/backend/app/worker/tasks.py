# mypy: disable-error-code=untyped-decorator

import asyncio

from app.services.document_queue import document_queue
from app.services.job_processor import QueuedDocumentProcessor
from app.worker.celery_app import celery_app


# Celery's decorator is intentionally untyped.
@celery_app.task(name="app.worker.tasks.process_queued_document")
def process_queued_document(job_id: str) -> None:
    processor = QueuedDocumentProcessor()
    asyncio.run(processor.process(job_id))


def recover_queued_documents() -> None:
    async def _recover() -> None:
        recoverable_jobs = await document_queue.list_recoverable_items()
        for job in recoverable_jobs:
            process_queued_document.delay(job.id)

    asyncio.run(_recover())
