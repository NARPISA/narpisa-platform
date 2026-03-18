from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.config import Settings, get_settings
from app.core.exceptions import NonRetryableTaskError, RetryableTaskError
from app.core.task_auth import verify_task_request
from app.models.document import (
    ProcessSourceTaskPayload,
    SourceEnqueueResponse,
    SourceParseRequest,
    TaskExecutionResponse,
)
from app.services.job_repository import SupabaseJobRepository
from app.services.pdf_parser import PdfParser
from app.services.processing_service import SourceProcessingService
from app.services.source_fetcher import SourceFetcher
from app.services.task_queue import SourceTaskQueue

router = APIRouter()


def get_job_repository(
    settings: Annotated[Settings, Depends(get_settings)],
) -> SupabaseJobRepository:
    return SupabaseJobRepository(settings)


def get_task_queue(
    settings: Annotated[Settings, Depends(get_settings)],
) -> SourceTaskQueue:
    return SourceTaskQueue(settings)


def get_processing_service(
    settings: Annotated[Settings, Depends(get_settings)],
    repository: Annotated[SupabaseJobRepository, Depends(get_job_repository)],
) -> SourceProcessingService:
    return SourceProcessingService(
        repository=repository,
        fetcher=SourceFetcher(settings=settings),
        parser=PdfParser(),
    )


@router.get("/health", tags=["health"])
async def healthcheck(
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name}


@router.post(
    "/process-source",
    response_model=SourceEnqueueResponse,
    status_code=status.HTTP_202_ACCEPTED,
    tags=["processing"],
)
async def process_source(
    payload: SourceParseRequest,
    settings: Annotated[Settings, Depends(get_settings)],
    repository: Annotated[SupabaseJobRepository, Depends(get_job_repository)],
    queue: Annotated[SourceTaskQueue, Depends(get_task_queue)],
    processor: Annotated[SourceProcessingService, Depends(get_processing_service)],
) -> SourceEnqueueResponse:
    document = await repository.upsert_document(payload)
    job = await repository.create_job(document.id)
    task_payload = ProcessSourceTaskPayload(
        document_id=document.id,
        job_id=job.id,
        title=payload.title,
        source_url=payload.source_url,
        attribution=payload.attribution,
        notes=payload.notes,
    )
    enqueued_task = await queue.enqueue_process_source(task_payload)

    if enqueued_task.mode == "inline":
        try:
            await processor.process_task(task_payload)
            latest_job = await repository.get_job(job.id)
            return SourceEnqueueResponse(
                document_id=document.id,
                job_id=job.id,
                status=latest_job.status if latest_job is not None else "completed",
                task_mode="inline",
            )
        except NonRetryableTaskError as exc:
            await processor.mark_non_retryable_failure(job.id, exc)
            return SourceEnqueueResponse(
                document_id=document.id,
                job_id=job.id,
                status="failed",
                task_mode="inline",
            )
        except RetryableTaskError as exc:
            await processor.mark_retryable_failure(job.id, exc)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=str(exc),
            ) from exc

    return SourceEnqueueResponse(
        document_id=document.id,
        job_id=job.id,
        status="queued",
        task_mode="cloud_tasks",
        task_name=enqueued_task.task_name,
    )


@router.post(
    "/tasks/process-source",
    response_model=TaskExecutionResponse,
    tags=["processing"],
)
async def process_source_task(
    payload: ProcessSourceTaskPayload,
    request: Request,
    settings: Annotated[Settings, Depends(get_settings)],
    processor: Annotated[SourceProcessingService, Depends(get_processing_service)],
) -> TaskExecutionResponse:
    verify_task_request(request, settings)
    try:
        result = await processor.process_task(payload)
        detail = (
            "Task already completed."
            if result.parsed_document is None
            else "Task processed successfully."
        )
        return TaskExecutionResponse(
            job_id=payload.job_id,
            status=result.status,
            detail=detail,
        )
    except NonRetryableTaskError as exc:
        await processor.mark_non_retryable_failure(payload.job_id, exc)
        return TaskExecutionResponse(
            job_id=payload.job_id,
            status="failed",
            detail=str(exc),
            retryable=False,
        )
    except RetryableTaskError as exc:
        await processor.mark_retryable_failure(payload.job_id, exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
