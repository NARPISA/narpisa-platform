from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.config import Settings, get_settings
from app.models.document import ParsedDocument, SourceParseRequest
from app.services.pdf_parser import PdfParser
from app.services.source_fetcher import SourceFetcher

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
    fetch_result = await fetcher.fetch_pdf(str(payload.source_url))
    parser = PdfParser()
    return parser.parse(payload, fetch_result)
