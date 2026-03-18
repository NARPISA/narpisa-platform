from datetime import UTC, datetime
from typing import Literal
from urllib.parse import urlparse
from uuid import uuid4

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


class QueuedSourceDocument(BaseModel):
    id: str
    document_id: str
    title: str
    source_url: HttpUrl
    source_domain: str
    attribution: str
    notes: str | None = None
    mime_type: str = "application/pdf"
    status: ProcessingStatus = "queued"
    content_hash: str | None = None
    page_count: int | None = None
    source_http_status: int | None = None
    error_message: str | None = None
    queued_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None
    updated_at: datetime | None = None

    @classmethod
    def from_request(cls, request: SourceParseRequest) -> "QueuedSourceDocument":
        now = datetime.now(UTC)
        source_domain = urlparse(str(request.source_url)).hostname or "unknown"
        return cls(
            id=str(uuid4()),
            document_id=str(uuid4()),
            title=request.title,
            source_url=request.source_url,
            source_domain=source_domain,
            attribution=request.attribution,
            notes=request.notes,
            queued_at=now,
            updated_at=now,
        )
