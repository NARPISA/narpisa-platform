from pathlib import Path

import pytest

from app.core.config import Settings
from app.models.document import ParsedDocument, QueuedSourceDocument, SourceParseRequest
from app.services.job_processor import QueuedDocumentProcessor
from app.services.job_store import JobStore
from app.services.pdf_parser import PdfParser
from app.services.source_fetcher import FetchResult, SourceFetcher


@pytest.mark.asyncio
async def test_job_processor_updates_status_and_cleans_up_download(
    monkeypatch,
    sample_pdf_bytes: bytes,
    tmp_path: Path,
) -> None:
    settings = Settings(
        download_dir=str(tmp_path),
        keep_downloaded_pdfs=False,
        supabase_url="https://example.supabase.co",
        supabase_service_role_key="test-service-role-key",
    )
    queued_job = QueuedSourceDocument.from_request(
        SourceParseRequest(
            title="Queued Source",
            source_url="https://documents.example.org/queued-source.pdf",
            attribution="NaRPISA test suite",
        )
    )
    status_updates: list[str] = []

    async def fake_get_job(self: JobStore, job_id: str) -> QueuedSourceDocument | None:
        assert job_id == queued_job.id
        return queued_job

    async def fake_mark_fetching(self: JobStore, job_id: str) -> None:
        assert job_id == queued_job.id
        status_updates.append("fetching")

    async def fake_mark_parsing(
        self: JobStore,
        job_id: str,
        *,
        source_http_status: int,
    ) -> None:
        assert job_id == queued_job.id
        assert source_http_status == 200
        status_updates.append("parsing")

    async def fake_mark_completed(
        self: JobStore,
        job_id: str,
        *,
        content_hash: str,
        page_count: int,
        source_http_status: int,
    ) -> None:
        assert job_id == queued_job.id
        assert content_hash == "b" * 64
        assert page_count == 1
        assert source_http_status == 200
        status_updates.append("completed")

    async def fake_fetch_pdf(
        self: SourceFetcher,
        source_url: str,
        destination_path: Path,
    ) -> FetchResult:
        assert source_url == "https://documents.example.org/queued-source.pdf"
        destination_path.write_bytes(sample_pdf_bytes)
        return FetchResult(
            source_domain="documents.example.org",
            mime_type="application/pdf",
            file_path=destination_path,
            content_hash="b" * 64,
            size_bytes=len(sample_pdf_bytes),
            source_http_status=200,
        )

    def fake_parse(
        self: PdfParser,
        request: SourceParseRequest,
        fetch_result: FetchResult,
    ) -> ParsedDocument:
        assert request.title == queued_job.title
        assert fetch_result.file_path.exists()
        return ParsedDocument(
            title=request.title,
            source_url=request.source_url,
            source_domain=fetch_result.source_domain,
            attribution=request.attribution,
            content_hash=fetch_result.content_hash,
            page_count=1,
            extracted_text="",
            extracted_excerpt="",
        )

    monkeypatch.setattr("app.services.job_processor.get_settings", lambda: settings)
    monkeypatch.setattr(JobStore, "get_job", fake_get_job)
    monkeypatch.setattr(JobStore, "mark_fetching", fake_mark_fetching)
    monkeypatch.setattr(JobStore, "mark_parsing", fake_mark_parsing)
    monkeypatch.setattr(JobStore, "mark_completed", fake_mark_completed)
    monkeypatch.setattr(SourceFetcher, "fetch_pdf", fake_fetch_pdf)
    monkeypatch.setattr(PdfParser, "parse", fake_parse)

    processor = QueuedDocumentProcessor()
    await processor.process(queued_job.id)

    assert status_updates == ["fetching", "parsing", "completed"]
    assert list(tmp_path.glob("*.pdf")) == []


@pytest.mark.asyncio
async def test_job_processor_keeps_download_when_debug_flag_is_enabled(
    monkeypatch,
    sample_pdf_bytes: bytes,
    tmp_path: Path,
) -> None:
    settings = Settings(
        download_dir=str(tmp_path),
        keep_downloaded_pdfs=True,
        supabase_url="https://example.supabase.co",
        supabase_service_role_key="test-service-role-key",
    )
    queued_job = QueuedSourceDocument.from_request(
        SourceParseRequest(
            title="Queued Source",
            source_url="https://documents.example.org/queued-source.pdf",
            attribution="NaRPISA test suite",
        )
    )

    async def fake_get_job(self: JobStore, job_id: str) -> QueuedSourceDocument | None:
        assert job_id == queued_job.id
        return queued_job

    async def fake_mark_fetching(self: JobStore, job_id: str) -> None:
        assert job_id == queued_job.id

    async def fake_mark_parsing(
        self: JobStore,
        job_id: str,
        *,
        source_http_status: int,
    ) -> None:
        assert job_id == queued_job.id
        assert source_http_status == 200

    async def fake_mark_completed(
        self: JobStore,
        job_id: str,
        *,
        content_hash: str,
        page_count: int,
        source_http_status: int,
    ) -> None:
        assert job_id == queued_job.id
        assert content_hash == "b" * 64
        assert page_count == 1
        assert source_http_status == 200

    async def fake_fetch_pdf(
        self: SourceFetcher,
        source_url: str,
        destination_path: Path,
    ) -> FetchResult:
        assert source_url == "https://documents.example.org/queued-source.pdf"
        destination_path.write_bytes(sample_pdf_bytes)
        return FetchResult(
            source_domain="documents.example.org",
            mime_type="application/pdf",
            file_path=destination_path,
            content_hash="b" * 64,
            size_bytes=len(sample_pdf_bytes),
            source_http_status=200,
        )

    def fake_parse(
        self: PdfParser,
        request: SourceParseRequest,
        fetch_result: FetchResult,
    ) -> ParsedDocument:
        assert request.title == queued_job.title
        assert fetch_result.file_path.exists()
        return ParsedDocument(
            title=request.title,
            source_url=request.source_url,
            source_domain=fetch_result.source_domain,
            attribution=request.attribution,
            content_hash=fetch_result.content_hash,
            page_count=1,
            extracted_text="",
            extracted_excerpt="",
        )

    monkeypatch.setattr("app.services.job_processor.get_settings", lambda: settings)
    monkeypatch.setattr(JobStore, "get_job", fake_get_job)
    monkeypatch.setattr(JobStore, "mark_fetching", fake_mark_fetching)
    monkeypatch.setattr(JobStore, "mark_parsing", fake_mark_parsing)
    monkeypatch.setattr(JobStore, "mark_completed", fake_mark_completed)
    monkeypatch.setattr(SourceFetcher, "fetch_pdf", fake_fetch_pdf)
    monkeypatch.setattr(PdfParser, "parse", fake_parse)

    processor = QueuedDocumentProcessor()
    await processor.process(queued_job.id)

    downloaded_files = list(tmp_path.glob("*.pdf"))
    assert len(downloaded_files) == 1
    assert downloaded_files[0].read_bytes() == sample_pdf_bytes
