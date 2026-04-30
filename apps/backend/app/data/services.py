from dataclasses import dataclass
from hashlib import sha256
from pathlib import Path
from urllib.parse import urlparse

from fastapi import HTTPException, status
from httpx import URL, AsyncClient, Timeout


@dataclass
class FetchResult:
    mime_type: str
    path: Path
    hash: str
    source_domain: str
    source_status: int


async def fetch_data_source(
    source: str | URL,
    destination: Path,
    desired_mime_type: str | None = None,
    client: AsyncClient | None = None,
    timeout: int = 20,
    chunk_size: int = 1024 * 1024,
    max_size: int = 10 * 1024 * 1024,
    verify_ssl: bool = True,
) -> FetchResult:
    source_url = str(source)
    request_timeout = Timeout(timeout)
    hasher = sha256()
    size = 0
    destination.parent.mkdir(parents=True, exist_ok=True)
    async with AsyncClient(timeout=request_timeout, verify=verify_ssl) as local_client:
        client = client or local_client
        try:
            async with client.stream("GET", source_url) as response:
                response.raise_for_status()
                content_type = response.headers.get("content-type", "")
                mime_type = content_type.split(";")[0] if content_type else ""
                if desired_mime_type and desired_mime_type != mime_type:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=(
                            f"Data source MIME type ({mime_type}) did not match "
                            f"specified mime type ({desired_mime_type})"
                        ),
                    )
                with destination.open("wb") as f:
                    async for chunk in response.aiter_bytes(chunk_size):
                        size += len(chunk)
                        if size > max_size:
                            raise HTTPException(
                                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                                detail="Data source size exceeds specified max size",
                            )
                        f.write(chunk)
                        hasher.update(chunk)
                return FetchResult(
                    mime_type,
                    destination,
                    hasher.hexdigest(),
                    urlparse(source_url).hostname or "unknown",
                    response.status_code,
                )
        except Exception:
            if destination.exists():
                destination.unlink()
            raise
