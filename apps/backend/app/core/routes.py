from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.config import Settings, get_settings

router = APIRouter()


@router.get("/health", tags=["health"])
async def check_health(
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name}