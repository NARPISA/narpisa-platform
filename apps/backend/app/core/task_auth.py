from typing import Any, cast

from fastapi import HTTPException, Request, status
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2 import id_token

from app.core.config import Settings


def verify_task_request(request: Request, settings: Settings) -> dict[str, Any]:
    if settings.tasks_provider == "inline" or not settings.task_auth_enabled:
        return {}

    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token for task request.",
        )

    token = auth_header.removeprefix("Bearer ").strip()
    try:
        claims = cast(
            dict[str, Any],
            id_token.verify_oauth2_token(  # type: ignore[no-untyped-call]
                token,
                GoogleRequest(),
                settings.task_audience,
            ),
        )
    except Exception as exc:  # pragma: no cover - external token verification path
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unable to verify the Cloud Tasks OIDC token.",
        ) from exc

    token_email = claims.get("email")
    if (
        settings.cloud_tasks_service_account_email
        and token_email != settings.cloud_tasks_service_account_email
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Task request used an unexpected service account.",
        )
    return claims
