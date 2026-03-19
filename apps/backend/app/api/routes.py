from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.config import Settings, get_settings
from app.models.document import ParsedDocument, QueuedSourceDocument, SourceParseRequest
from app.services.document_queue import document_queue
from app.services.pdf_parser import PdfParser
from app.services.source_fetcher import SourceFetcher
from app.worker.tasks import process_queued_document

router = APIRouter()


@router.get("/health", tags=["health"])
async def healthcheck(
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name}


@router.post("/process-source", response_model=ParsedDocument, tags=["processing"])
async def process_source(
    payload: SourceParseRequest,
    settings: Annotated[Settings, Depends(get_settings)],
) -> ParsedDocument:
    fetcher = SourceFetcher(settings=settings)
    download_path = settings.download_directory / "process-source-debug.pdf"
    download_path.parent.mkdir(parents=True, exist_ok=True)
    fetch_result = await fetcher.fetch_pdf(str(payload.source_url), download_path)
    parser = PdfParser()
    try:
        return parser.parse(payload, fetch_result)
    finally:
        _cleanup_download(download_path)


@router.post(
    "/queue-source",
    response_model=QueuedSourceDocument,
    status_code=status.HTTP_202_ACCEPTED,
    tags=["processing"],
)
async def queue_source(payload: SourceParseRequest) -> QueuedSourceDocument:
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
async def list_queued_sources() -> list[QueuedSourceDocument]:
    return await document_queue.list_items()


@router.delete(
    "/queue-source/{job_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["processing"],
)
async def delete_queued_source(job_id: str) -> None:
    deleted = await document_queue.delete_item(job_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Queued source not found.",
        )


def _cleanup_download(download_path: Path) -> None:
    if download_path.exists():
        download_path.unlink()
