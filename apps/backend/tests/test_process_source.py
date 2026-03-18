from httpx import ASGITransport, AsyncClient

from app.main import app
from app.services.source_fetcher import FetchResult, SourceFetcher


async def test_process_source_returns_parsed_metadata(
    monkeypatch, sample_pdf_bytes: bytes
) -> None:
    async def fake_fetch_pdf(self: SourceFetcher, source_url: str) -> FetchResult:
        return FetchResult(
            source_domain="documents.example.org",
            mime_type="application/pdf",
            content=sample_pdf_bytes,
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
