from app.data.pdf.models import QueuedSourceDocument, SourceParseRequest
from app.data.pdf.services import DocumentQueue
from app.data.pdf.tasks import process_queued_document, recover_queued_documents


def build_queued_document() -> QueuedSourceDocument:
    return QueuedSourceDocument.from_request(
        SourceParseRequest(
            title="Recovered Source",
            source_url="https://documents.example.org/recovered-source.pdf",
            attribution="NaRPISA test suite",
        )
    )


def test_recover_queued_documents_requeues_active_jobs(monkeypatch) -> None:
    queued_document = build_queued_document()
    dispatched_job_ids: list[str] = []

    async def fake_list_recoverable_items(
        self: DocumentQueue,
    ) -> list[QueuedSourceDocument]:
        return [queued_document]

    def fake_delay(job_id: str) -> None:
        dispatched_job_ids.append(job_id)

    monkeypatch.setattr(
        DocumentQueue,
        "list_recoverable_items",
        fake_list_recoverable_items,
    )
    monkeypatch.setattr(process_queued_document, "delay", fake_delay)

    recover_queued_documents()

    assert dispatched_job_ids == [queued_document.id]
