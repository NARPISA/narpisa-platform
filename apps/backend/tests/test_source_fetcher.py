from pathlib import Path

import httpx
import pytest
from fastapi import HTTPException

from app.data.services import fetch_data_source


class FakeStreamResponse:
    def __init__(
        self,
        *,
        chunks: list[bytes],
        content_type: str = "application/pdf",
        status_code: int = 200,
    ) -> None:
        self.headers = {"content-type": content_type}
        self.status_code = status_code
        self._chunks = chunks

    async def __aenter__(self) -> "FakeStreamResponse":
        return self

    async def __aexit__(self, exc_type, exc, traceback) -> None:
        return None

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            request = httpx.Request("GET", "https://documents.example.org/sample.pdf")
            response = httpx.Response(self.status_code, request=request)
            raise httpx.HTTPStatusError(
                "Request failed",
                request=request,
                response=response,
            )

    async def aiter_bytes(self, chunk_size: int):
        del chunk_size
        for chunk in self._chunks:
            yield chunk


class FakeAsyncClient:
    def __init__(self, response: FakeStreamResponse) -> None:
        self._response = response

    def stream(self, method: str, source_url: str) -> FakeStreamResponse:
        del method, source_url
        return self._response


@pytest.mark.asyncio
async def test_fetch_pdf_streams_file_to_disk(tmp_path: Path) -> None:
    download_path = tmp_path / "sample.pdf"
    result = await fetch_data_source(
        "https://documents.example.org/sample.pdf",
        download_path,
        "application/pdf",
        client=FakeAsyncClient(FakeStreamResponse(chunks=[b"%PDF-", b"sample-bytes"])),
    )

    assert download_path.exists()
    assert result.path == download_path
    assert result.hash == "82b3244f7b454a46df7211acccffdaf36c180592eddce4f54c7e48ce66a803e8"
    assert result.source_status == 200


@pytest.mark.asyncio
async def test_fetch_pdf_rejects_oversized_files(tmp_path: Path) -> None:
    download_path = tmp_path / "sample.pdf"

    with pytest.raises(HTTPException) as error:
        await fetch_data_source(
            "https://documents.example.org/sample.pdf",
            download_path,
            "application/pdf",
            client=FakeAsyncClient(FakeStreamResponse(chunks=[b"%PDF", b"-too-big"])),
            max_size=4,
        )

    assert error.value.status_code == 413
    assert not download_path.exists()
