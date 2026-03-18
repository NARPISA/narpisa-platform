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


class SourceEnqueueResponse(BaseModel):
    document_id: str
    job_id: str
    status: ProcessingStatus
    task_mode: Literal["inline", "cloud_tasks"]
    task_name: str | None = None


class ProcessSourceTaskPayload(BaseModel):
    document_id: str
    job_id: str
    title: str
    source_url: HttpUrl
    attribution: str
    notes: str | None = None


class TaskExecutionResponse(BaseModel):
    job_id: str
    status: ProcessingStatus
    detail: str
    retryable: bool = False


class DocumentRecord(BaseModel):
    id: str
    title: str
    source_url: str
    source_domain: str
    attribution: str
    notes: str | None = None
    latest_job_status: ProcessingStatus


class ProcessingJobRecord(BaseModel):
    id: str
    document_id: str
    status: ProcessingStatus
    worker_version: str
