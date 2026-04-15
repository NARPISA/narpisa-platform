from app.data.pdf.models import QueuedSourceDocument, SourceParseRequest
from app.data.pdf.services import DocumentQueue


def build_job(title: str, source_url: str) -> QueuedSourceDocument:
    return QueuedSourceDocument.from_request(
        SourceParseRequest(
            title=title,
            source_url=source_url,
            attribution="NaRPISA test suite",
        )
    )


def test_latest_jobs_by_document_keeps_only_newest_visible_job() -> None:
    queue = DocumentQueue()
    latest_job = build_job("Latest Source", "https://documents.example.org/source.pdf")
    older_job = latest_job.model_copy(update={"status": "failed"})
    other_job = build_job("Other Source", "https://documents.example.org/other.pdf")

    jobs = [latest_job, older_job, other_job]

    collapsed_jobs = queue._latest_jobs_by_document(jobs)

    assert collapsed_jobs == [latest_job, other_job]
