from functools import lru_cache
from urllib.parse import urlparse

from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "NaRPISA PDF Worker"
    app_env: str = "development"
    log_level: str = "INFO"
    port: int = 8000
    fetch_timeout_seconds: int = 20
    fetch_max_bytes: int = 10 * 1024 * 1024
    fetch_allowed_domains: str = Field(default="")

    model_config = SettingsConfigDict(
        env_prefix="PDF_WORKER_",
        env_file=".env",
        extra="ignore",
    )

    @computed_field  # type: ignore[prop-decorator]
    @property
    def allowed_domains(self) -> list[str]:
        raw_values = [
            value.strip().lower() for value in self.fetch_allowed_domains.split(",")
        ]
        return [value for value in raw_values if value]

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
