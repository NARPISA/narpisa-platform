import asyncio
import json
from dataclasses import dataclass

from google.cloud import tasks_v2

from app.core.config import Settings
from app.core.exceptions import NonRetryableTaskError
from app.models.document import ProcessSourceTaskPayload


@dataclass(slots=True)
class EnqueuedTask:
    mode: str
    task_name: str | None = None


class SourceTaskQueue:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def enqueue_process_source(
        self,
        payload: ProcessSourceTaskPayload,
    ) -> EnqueuedTask:
        if self.settings.tasks_provider == "inline":
            return EnqueuedTask(mode="inline")

        if not self.settings.can_enqueue_cloud_tasks:
            raise NonRetryableTaskError(
                "Cloud Tasks is enabled but required GCP settings are missing.",
                status_code=500,
            )

        return await asyncio.to_thread(self._enqueue_cloud_task, payload)

    def _enqueue_cloud_task(self, payload: ProcessSourceTaskPayload) -> EnqueuedTask:
        client = tasks_v2.CloudTasksClient()
        queue_path = client.queue_path(
            self.settings.gcp_project_id,
            self.settings.gcp_location,
            self.settings.cloud_tasks_queue,
        )

        http_request = tasks_v2.HttpRequest(
            http_method=tasks_v2.HttpMethod.POST,
            url=self.settings.task_handler_url,
            headers={"Content-Type": "application/json"},
            body=json.dumps(payload.model_dump(mode="json")).encode(),
            oidc_token=tasks_v2.OidcToken(
                service_account_email=self.settings.cloud_tasks_service_account_email,
                audience=self.settings.task_audience,
            ),
        )
        task = tasks_v2.Task(http_request=http_request)
        response = client.create_task(
            tasks_v2.CreateTaskRequest(parent=queue_path, task=task)
        )
        return EnqueuedTask(mode="cloud_tasks", task_name=response.name)
