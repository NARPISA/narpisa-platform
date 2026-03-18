from datetime import UTC, datetime
from typing import Literal

from pydantic import BaseModel, HttpUrl

ProcessingStatus = Literal["queued", "fetching", "parsing", "completed", "failed"]


class SourceParseRequest(BaseModel):
    title: str
    source_url: HttpUrl
    attribution: str
    notes: str | None = None


class ParsedDocument(BaseModel):
    title: str
    source_url: HttpUrl
    source_domain: str
    attribution: str
    content_hash: str
    page_count: int
    extracted_text: str
    extracted_excerpt: str
    status: ProcessingStatus = "completed"
    extracted_at: datetime = datetime.now(UTC)
