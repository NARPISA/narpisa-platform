from dataclasses import dataclass
from urllib.parse import urlparse

import httpx

from app.core.config import Settings
from app.core.exceptions import NonRetryableTaskError, RetryableTaskError


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
            raise NonRetryableTaskError(
                "Source domain is not in the allowlist.",
                status_code=400,
            )

        timeout = httpx.Timeout(self.settings.fetch_timeout_seconds)
        try:
            async with httpx.AsyncClient(timeout=timeout) as owned_client:
                client = self._client or owned_client
                response = await client.get(source_url)
        except httpx.TimeoutException as exc:
            raise RetryableTaskError(
                "Timed out while fetching the source PDF.",
                status_code=504,
            ) from exc
        except httpx.HTTPError as exc:
            raise RetryableTaskError(
                "Transient network error while fetching the source PDF.",
                status_code=503,
            ) from exc

        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            status_code = exc.response.status_code
            if 400 <= status_code < 500 and status_code not in {408, 429}:
                raise NonRetryableTaskError(
                    f"Source returned HTTP {status_code}.",
                    status_code=status_code,
                ) from exc
            raise RetryableTaskError(
                f"Source returned transient HTTP {status_code}.",
                status_code=status_code,
            ) from exc

        mime_type = response.headers.get(
            "content-type",
            "application/pdf",
        ).split(
            ";"
        )[0]
        if mime_type != "application/pdf":
            raise NonRetryableTaskError(
                "Only PDF source URLs are supported.",
                status_code=400,
            )

        content = response.content
        if len(content) > self.settings.fetch_max_bytes:
            raise NonRetryableTaskError(
                "Source PDF exceeded the configured max size.",
                status_code=413,
            )

        source_domain = urlparse(source_url).hostname or "unknown"
        return FetchResult(
            source_domain=source_domain,
            mime_type=mime_type,
            content=content,
        )
