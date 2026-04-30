from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.config import Settings, get_settings
from app.data.database_admin.models import AdminUser
from app.data.database_admin.services import require_admin_user
from app.data.pdf.models import (
    ParsedDocument,
    ParsedJobDetail,
    ParserCommitResponse,
    QueuedSourceDocument,
    SourceParseRequest,
)
from app.data.pdf.services import document_queue, parse_pdf
from app.data.pdf.tasks import process_queued_document
from app.data.services import fetch_data_source

router = APIRouter()


@router.post("/process-source", response_model=ParsedDocument, tags=["processing"])
async def process_source(
    payload: SourceParseRequest,
    settings: Annotated[Settings, Depends(get_settings)],
    _user: Annotated[AdminUser, Depends(require_admin_user)],
) -> ParsedDocument:
    download_path = settings.download_directory / "process-source-debug.pdf"
    download_path.parent.mkdir(parents=True, exist_ok=True)
    fetch_result = await fetch_data_source(
        str(payload.source_url),
        download_path,
        "application/pdf",
        timeout=settings.fetch_timeout_seconds,
        chunk_size=settings.fetch_chunk_size_bytes,
        max_size=settings.fetch_max_bytes,
    )
    try:
        return await parse_pdf(payload, fetch_result)
    finally:
        _cleanup_download(download_path)


@router.post(
    "/queue-source",
    response_model=QueuedSourceDocument,
    status_code=status.HTTP_202_ACCEPTED,
    tags=["processing"],
)
async def queue_source(
    payload: SourceParseRequest,
    _user: Annotated[AdminUser, Depends(require_admin_user)],
) -> QueuedSourceDocument:
    try:
        queued_document = await document_queue.enqueue(payload)
        process_queued_document.delay(queued_document.id)
        return queued_document
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error


@router.get(
    "/queue-source",
    response_model=list[QueuedSourceDocument],
    tags=["processing"],
)
async def list_queued_sources(
    _user: Annotated[AdminUser, Depends(require_admin_user)],
) -> list[QueuedSourceDocument]:
    return await document_queue.list_items()


@router.get(
    "/queue-source/{job_id}",
    response_model=ParsedJobDetail,
    tags=["processing"],
)
async def get_queued_source_detail(
    job_id: str,
    _user: Annotated[AdminUser, Depends(require_admin_user)],
) -> ParsedJobDetail:
    detail = await document_queue.parsed_detail(job_id)
    if detail is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Queued source not found.",
        )
    return detail


@router.post(
    "/queue-source/{job_id}/commit",
    response_model=ParserCommitResponse,
    tags=["processing"],
)
async def commit_queued_source(
    job_id: str,
    _user: Annotated[AdminUser, Depends(require_admin_user)],
) -> ParserCommitResponse:
    result = await document_queue.commit_item(job_id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Queued source not found.",
        )
    return result


@router.delete(
    "/queue-source/{job_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["processing"],
)
async def delete_queued_source(
    job_id: str,
    _user: Annotated[AdminUser, Depends(require_admin_user)],
) -> None:
    deleted = await document_queue.delete_item(job_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Queued source not found.",
        )


def _cleanup_download(download_path: Path) -> None:
    if download_path.exists():
        download_path.unlink()
