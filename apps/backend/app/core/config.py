from functools import lru_cache
from pathlib import Path
from urllib.parse import urlparse

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def _resolve_env_file() -> Path:
    current_file = Path(__file__).resolve()
    # search upward for the monorepo root
    # via turbo.json when running locally
    for parent in current_file.parents:
        if (parent / "turbo.json").exists():
            return parent / ".env"
    # fall back to the backend app root
    # via pyproject.toml inside Docker/Render
    for parent in current_file.parents:
        if (parent / "pyproject.toml").exists():
            return parent / ".env"

    return current_file.parent / ".env"


ENV_FILE = _resolve_env_file()


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
        env_file=ENV_FILE,
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
