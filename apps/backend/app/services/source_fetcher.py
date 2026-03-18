from dataclasses import dataclass
from urllib.parse import urlparse

import httpx
from fastapi import HTTPException, status

from app.core.config import Settings


@dataclass(slots=True)
class FetchResult:
    source_domain: str
    mime_type: str
    content: bytes


class SourceFetcher:
    def __init__(
        self,
        settings: Settings,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self.settings = settings
        self._client = client

    async def fetch_pdf(self, source_url: str) -> FetchResult:
        if not self.settings.is_domain_allowed(source_url):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Source domain is not in the allowlist.",
            )

        timeout = httpx.Timeout(self.settings.fetch_timeout_seconds)
        async with httpx.AsyncClient(timeout=timeout) as owned_client:
            client = self._client or owned_client
            response = await client.get(source_url)

        response.raise_for_status()

        mime_type = response.headers.get(
            "content-type",
            "application/pdf",
        ).split(
            ";"
        )[0]
        if mime_type != "application/pdf":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only PDF source URLs are supported.",
            )

        content = response.content
        if len(content) > self.settings.fetch_max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Source PDF exceeded the configured max size.",
            )

        source_domain = urlparse(source_url).hostname or "unknown"
        return FetchResult(
            source_domain=source_domain,
            mime_type=mime_type,
            content=content,
        )
