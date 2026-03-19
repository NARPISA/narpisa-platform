from dataclasses import dataclass
from hashlib import sha256
from pathlib import Path
from urllib.parse import urlparse

import httpx
from fastapi import HTTPException, status

from app.core.config import Settings


@dataclass(slots=True)
class FetchResult:
    source_domain: str
    mime_type: str
    file_path: Path
    content_hash: str
    size_bytes: int
    source_http_status: int


class SourceFetcher:
    def __init__(
        self,
        settings: Settings,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self.settings = settings
        self._client = client

    async def fetch_pdf(self, source_url: str, destination_path: Path) -> FetchResult:
        timeout = httpx.Timeout(self.settings.fetch_timeout_seconds)
        destination_path.parent.mkdir(parents=True, exist_ok=True)
        hasher = sha256()
        total_bytes = 0

        async with httpx.AsyncClient(timeout=timeout) as owned_client:
            client = self._client or owned_client
            try:
                async with client.stream("GET", source_url) as response:
                    response.raise_for_status()

                    mime_type = response.headers.get(
                        "content-type",
                        "application/pdf",
                    ).split(";")[0]
                    if mime_type != "application/pdf":
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Only PDF source URLs are supported.",
                        )

                    with destination_path.open("wb") as downloaded_pdf:
                        async for chunk in response.aiter_bytes(
                            self.settings.fetch_chunk_size_bytes
                        ):
                            total_bytes += len(chunk)
                            if total_bytes > self.settings.fetch_max_bytes:
                                raise HTTPException(
                                    status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                                    detail=(
                                        "Source PDF exceeded the configured max size."
                                    ),
                                )

                            downloaded_pdf.write(chunk)
                            hasher.update(chunk)

                    source_domain = urlparse(source_url).hostname or "unknown"
                    return FetchResult(
                        source_domain=source_domain,
                        mime_type=mime_type,
                        file_path=destination_path,
                        content_hash=hasher.hexdigest(),
                        size_bytes=total_bytes,
                        source_http_status=response.status_code,
                    )
            except Exception:
                if destination_path.exists():
                    destination_path.unlink()
                raise
