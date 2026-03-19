from httpx import ASGITransport, AsyncClient

from app.main import app
from app.models.document import QueuedSourceDocument, SourceParseRequest
from app.services.document_queue import DocumentQueue
from app.worker.tasks import process_queued_document


def build_queued_document() -> QueuedSourceDocument:
    return QueuedSourceDocument.from_request(
        SourceParseRequest(
            title="Queued Source",
            source_url="https://documents.example.org/queued-source.pdf",
            attribution="NaRPISA test suite",
        )
    )


async def test_queue_source_adds_document_to_queue(monkeypatch) -> None:
    queued_document = build_queued_document()
    dispatched_job_ids: list[str] = []

    async def fake_enqueue(
        self: DocumentQueue,
        request: SourceParseRequest,
    ) -> QueuedSourceDocument:
        return queued_document

    def fake_delay(job_id: str) -> None:
        dispatched_job_ids.append(job_id)

    monkeypatch.setattr(DocumentQueue, "enqueue", fake_enqueue)
    monkeypatch.setattr(process_queued_document, "delay", fake_delay)

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post(
            "/api/v1/queue-source",
            json={
                "title": "Queued Source",
                "source_url": "https://documents.example.org/queued-source.pdf",
                "attribution": "NaRPISA test suite",
            },
        )

    body = response.json()

    assert response.status_code == 202
    assert body["title"] == "Queued Source"
    assert body["status"] == "queued"
    assert body["source_url"] == "https://documents.example.org/queued-source.pdf"
    assert dispatched_job_ids == [queued_document.id]


async def test_list_queued_sources_returns_enqueued_documents(monkeypatch) -> None:
    queued_document = build_queued_document()

    async def fake_list_items(self: DocumentQueue) -> list[QueuedSourceDocument]:
        return [queued_document]

    monkeypatch.setattr(DocumentQueue, "list_items", fake_list_items)

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.get("/api/v1/queue-source")

    body = response.json()

    assert response.status_code == 200
    assert len(body) == 1
    assert body[0]["title"] == "Queued Source"


async def test_delete_queued_source_returns_no_content(monkeypatch) -> None:
    async def fake_delete_item(self: DocumentQueue, job_id: str) -> bool:
        return job_id == "job-123"

    monkeypatch.setattr(DocumentQueue, "delete_item", fake_delete_item)

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.delete("/api/v1/queue-source/job-123")

    assert response.status_code == 204


async def test_queue_source_rejects_non_pdf_urls() -> None:
    payload = {
        "title": "Not a PDF",
        "source_url": "https://magicui.design/docs/components/word-rotate",
        "attribution": "NaRPISA test suite",
    }

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post("/api/v1/queue-source", json=payload)

    body = response.json()

    assert response.status_code == 400
    assert body["detail"] == "Source URL must point to a PDF document."
