from functools import lru_cache
from urllib.parse import urlparse

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "NaRPISA PDF Worker"
    app_env: str = "development"
    worker_version: str = "0.2.0"
    log_level: str = Field(
        default="INFO",
        validation_alias=AliasChoices("PDF_WORKER_LOG_LEVEL", "LOG_LEVEL"),
    )
    port: int = Field(
        default=8000,
        validation_alias=AliasChoices("PORT", "PDF_WORKER_PORT"),
    )
    fetch_timeout_seconds: int = Field(
        default=20,
        validation_alias=AliasChoices("PDF_WORKER_FETCH_TIMEOUT_SECONDS"),
    )
    fetch_max_bytes: int = Field(
        default=10 * 1024 * 1024,
        validation_alias=AliasChoices("PDF_WORKER_FETCH_MAX_BYTES"),
    )
    fetch_allowed_domains: str = Field(
        default="",
        validation_alias=AliasChoices("PDF_WORKER_FETCH_ALLOWED_DOMAINS"),
    )
    tasks_provider: str = Field(
        default="inline",
        validation_alias=AliasChoices(
            "PDF_WORKER_TASKS_PROVIDER",
            "CLOUD_TASKS_PROVIDER",
        ),
    )
    task_auth_enabled: bool = Field(
        default=False,
        validation_alias=AliasChoices(
            "PDF_WORKER_TASK_AUTH_ENABLED",
            "CLOUD_TASKS_AUTH_ENABLED",
        ),
    )
    gcp_project_id: str = Field(
        default="",
        validation_alias=AliasChoices("GCP_PROJECT_ID"),
    )
    gcp_location: str = Field(
        default="",
        validation_alias=AliasChoices("GCP_LOCATION"),
    )
    cloud_tasks_queue: str = Field(
        default="narpisa-pdf-jobs",
        validation_alias=AliasChoices("CLOUD_TASKS_QUEUE"),
    )
    cloud_run_service_url: str = Field(
        default="",
        validation_alias=AliasChoices("CLOUD_RUN_SERVICE_URL"),
    )
    cloud_tasks_handler_path: str = Field(
        default="/api/v1/tasks/process-source",
        validation_alias=AliasChoices("CLOUD_TASKS_HANDLER_PATH"),
    )
    cloud_tasks_service_account_email: str = Field(
        default="",
        validation_alias=AliasChoices("CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL"),
    )
    cloud_tasks_audience: str = Field(
        default="",
        validation_alias=AliasChoices("CLOUD_TASKS_AUDIENCE"),
    )
    supabase_url: str = Field(
        default="",
        validation_alias=AliasChoices("SUPABASE_URL"),
    )
    supabase_service_role_key: str = Field(
        default="",
        validation_alias=AliasChoices("SUPABASE_SERVICE_ROLE_KEY"),
    )
    supabase_schema: str = Field(
        default="public",
        validation_alias=AliasChoices("SUPABASE_SCHEMA"),
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )

    @property
    def allowed_domains(self) -> list[str]:
        raw_values = [
            value.strip().lower() for value in self.fetch_allowed_domains.split(",")
        ]
        return [value for value in raw_values if value]

    @property
    def task_handler_url(self) -> str:
        return (
            f"{self.cloud_run_service_url.rstrip('/')}{self.cloud_tasks_handler_path}"
            if self.cloud_run_service_url
            else ""
        )

    @property
    def task_audience(self) -> str:
        if self.cloud_tasks_audience:
            return self.cloud_tasks_audience
        if self.cloud_run_service_url:
            return self.cloud_run_service_url.rstrip("/")
        return ""

    @property
    def uses_cloud_tasks(self) -> bool:
        return self.tasks_provider == "gcp"

    @property
    def can_enqueue_cloud_tasks(self) -> bool:
        return all(
            [
                self.uses_cloud_tasks,
                self.gcp_project_id,
                self.gcp_location,
                self.cloud_tasks_queue,
                self.task_handler_url,
                self.cloud_tasks_service_account_email,
            ]
        )

    @property
    def supabase_enabled(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_role_key)

    def is_domain_allowed(self, url: str) -> bool:
        domain = urlparse(url).hostname
        if domain is None:
            return False
        if not self.allowed_domains:
            return True
        return domain.lower() in self.allowed_domains


@lru_cache
def get_settings() -> Settings:
    return Settings()
