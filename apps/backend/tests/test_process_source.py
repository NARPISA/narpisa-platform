from pathlib import Path

from httpx import ASGITransport, AsyncClient

from app.main import app
from app.services.source_fetcher import FetchResult, SourceFetcher


async def test_process_source_returns_parsed_metadata(
    monkeypatch, sample_pdf_bytes: bytes
) -> None:
    async def fake_fetch_pdf(
        self: SourceFetcher,
        source_url: str,
        destination_path: Path,
    ) -> FetchResult:
        destination_path.write_bytes(sample_pdf_bytes)
        return FetchResult(
            source_domain="documents.example.org",
            mime_type="application/pdf",
            file_path=destination_path,
            content_hash="a" * 64,
            size_bytes=len(sample_pdf_bytes),
            source_http_status=200,
        )

    monkeypatch.setattr(SourceFetcher, "fetch_pdf", fake_fetch_pdf)

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
