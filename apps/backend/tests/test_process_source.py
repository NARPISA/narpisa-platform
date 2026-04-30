from pathlib import Path

from httpx import ASGITransport, AsyncClient

from app.data.pdf.models import ParsedDocument, SourceParseRequest
from app.data.services import FetchResult
from app.main import app


async def test_process_source_returns_parsed_metadata(
    monkeypatch, sample_pdf_bytes: bytes
) -> None:
    async def fake_fetch_data_source(
        source_url: str,
        destination_path: Path,
        desired_mime_type: str | None = None,
        **_: object,
    ) -> FetchResult:
        assert source_url == "https://documents.example.org/sample.pdf"
        assert desired_mime_type == "application/pdf"
        destination_path.write_bytes(sample_pdf_bytes)
        return FetchResult(
            mime_type="application/pdf",
            path=destination_path,
            hash="a" * 64,
            source_domain="documents.example.org",
            source_status=200,
        )

    monkeypatch.setattr(
        "app.data.pdf.routes.fetch_data_source",
        fake_fetch_data_source,
    )

    async def fake_parse_pdf(
        request: SourceParseRequest,
        fetch_result: FetchResult,
    ) -> ParsedDocument:
        return ParsedDocument(
            title=request.title,
            source_url=request.source_url,
            source_domain=fetch_result.source_domain,
            attribution=request.attribution,
            content_hash=fetch_result.hash,
            page_count=1,
            extracted_text="[]",
            extracted_excerpt="[]",
            sites_rows=[{"mine": "Sample Mine"}],
        )

    monkeypatch.setattr("app.data.pdf.routes.parse_pdf", fake_parse_pdf)

    payload = {
        "title": "Sample Source",
        "source_url": "https://documents.example.org/sample.pdf",
        "attribution": "NaRPISA research team",
    }

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post("/api/v1/process-source", json=payload)

    body = response.json()

    assert response.status_code == 200
    assert body["source_domain"] == "documents.example.org"
    assert body["status"] == "completed"
    assert body["page_count"] == 1
    assert len(body["content_hash"]) == 64
    assert body["sites_rows"] == [{"mine": "Sample Mine"}]
