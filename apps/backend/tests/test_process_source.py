from httpx import ASGITransport, AsyncClient

from app.api.routes import (
    get_job_repository,
    get_processing_service,
    get_settings,
    get_task_queue,
)
from app.main import app
from app.models.document import (
    DocumentRecord,
    ProcessingJobRecord,
    ProcessSourceTaskPayload,
)
from app.services.processing_service import ProcessingResult
from app.services.task_queue import EnqueuedTask


class FakeRepository:
    async def upsert_document(self, payload) -> DocumentRecord:
        return DocumentRecord(
            id="doc-1",
            title=payload.title,
            source_url=str(payload.source_url),
            source_domain="documents.example.org",
            attribution=payload.attribution,
            notes=payload.notes,
            latest_job_status="queued",
        )

    async def create_job(self, document_id: str) -> ProcessingJobRecord:
        return ProcessingJobRecord(
            id="job-1",
            document_id=document_id,
            status="queued",
            worker_version="0.2.0",
        )

    async def get_job(self, job_id: str) -> ProcessingJobRecord | None:
        return ProcessingJobRecord(
            id=job_id,
            document_id="doc-1",
            status="completed",
            worker_version="0.2.0",
        )


class FakeCloudTaskQueue:
    async def enqueue_process_source(
        self, payload: ProcessSourceTaskPayload
    ) -> EnqueuedTask:
        return EnqueuedTask(mode="cloud_tasks", task_name="tasks/123")


class FakeInlineTaskQueue:
    async def enqueue_process_source(
        self, payload: ProcessSourceTaskPayload
    ) -> EnqueuedTask:
        return EnqueuedTask(mode="inline")


class FakeProcessor:
    async def process_task(self, payload: ProcessSourceTaskPayload) -> ProcessingResult:
        return ProcessingResult(status="completed")

    async def mark_non_retryable_failure(self, job_id: str, error) -> None:
        return None

    async def mark_retryable_failure(self, job_id: str, error) -> None:
        return None


def clear_overrides() -> None:
    app.dependency_overrides = {}


async def test_process_source_enqueues_cloud_task() -> None:
    payload = {
        "title": "Sample Source",
        "source_url": "https://documents.example.org/sample.pdf",
        "attribution": "NaRPISA research team",
    }
    app.dependency_overrides[get_job_repository] = lambda: FakeRepository()
    app.dependency_overrides[get_task_queue] = lambda: FakeCloudTaskQueue()
    app.dependency_overrides[get_processing_service] = lambda: FakeProcessor()

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post("/api/v1/process-source", json=payload)

    body = response.json()
    clear_overrides()

    assert response.status_code == 202
    assert body["status"] == "queued"
    assert body["task_mode"] == "cloud_tasks"
    assert body["task_name"] == "tasks/123"


async def test_process_source_processes_inline_mode() -> None:
    payload = {
        "title": "Sample Source",
        "source_url": "https://documents.example.org/sample.pdf",
        "attribution": "NaRPISA research team",
    }
    app.dependency_overrides[get_settings] = lambda: get_settings().model_copy(
        update={"tasks_provider": "inline"}
    )
    app.dependency_overrides[get_job_repository] = lambda: FakeRepository()
    app.dependency_overrides[get_task_queue] = lambda: FakeInlineTaskQueue()
    app.dependency_overrides[get_processing_service] = lambda: FakeProcessor()

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post("/api/v1/process-source", json=payload)

    body = response.json()
    clear_overrides()

    assert response.status_code == 202
    assert body["status"] == "completed"
    assert body["task_mode"] == "inline"
    assert body["document_id"] == "doc-1"


async def test_process_source_task_returns_completed_response() -> None:
    payload = {
        "document_id": "doc-1",
        "job_id": "job-1",
        "title": "Sample Source",
        "source_url": "https://documents.example.org/sample.pdf",
        "attribution": "NaRPISA research team",
        "notes": "queued by test",
    }
    app.dependency_overrides[get_settings] = lambda: get_settings().model_copy(
        update={"tasks_provider": "inline", "task_auth_enabled": False}
    )
    app.dependency_overrides[get_processing_service] = lambda: FakeProcessor()

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post("/api/v1/tasks/process-source", json=payload)

    body = response.json()
    clear_overrides()

    assert response.status_code == 200
    assert body["job_id"] == "job-1"
    assert body["status"] == "completed"
