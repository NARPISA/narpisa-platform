from functools import lru_cache
from pathlib import Path
from urllib.parse import urlparse

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[4]


class Settings(BaseSettings):
    app_name: str = "NaRPISA PDF Worker"
    app_env: str = "development"
    log_level: str = "INFO"
    port: int = 8000
    fetch_timeout_seconds: int = 20
    fetch_max_bytes: int = 10 * 1024 * 1024
    fetch_chunk_size_bytes: int = 1024 * 1024
    download_dir: str = "/tmp/narpisa-pdf-worker"
    keep_downloaded_pdfs: bool = Field(
        default=False,
        validation_alias=AliasChoices(
            "KEEP_DOWNLOADED_PDFS",
            "PDF_WORKER_KEEP_DOWNLOADED_PDFS",
        ),
    )
    celery_broker_url: str = Field(
        default="redis://localhost:6379/0",
        validation_alias="CELERY_BROKER_URL",
    )
    supabase_url: str = Field(
        default="https://example.supabase.co",
        validation_alias="SUPABASE_URL",
    )
    supabase_service_role_key: str = Field(
        default="test-service-role-key", validation_alias="SUPABASE_SERVICE_ROLE_KEY"
    )
    supabase_schema: str = Field(default="public", validation_alias="SUPABASE_SCHEMA")

    model_config = SettingsConfigDict(
        env_prefix="PDF_WORKER_",
        env_file=REPO_ROOT / ".env",
        populate_by_name=True,
        extra="ignore",
    )

    @property
    def download_directory(self) -> Path:
        return Path(self.download_dir)

    @property
    def supabase_rest_url(self) -> str:
        parsed_url = urlparse(self.supabase_url)
        if parsed_url.netloc == "supabase.com":
            path_parts = [part for part in parsed_url.path.split("/") if part]
            if len(path_parts) >= 3 and path_parts[:2] == ["dashboard", "project"]:
                project_ref = path_parts[2]
                return f"https://{project_ref}.supabase.co/rest/v1"

        return f"{self.supabase_url.rstrip('/')}/rest/v1"


@lru_cache
def get_settings() -> Settings:
    return Settings()
