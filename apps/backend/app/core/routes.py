from app.core.config import Settings, get_settings
from fastapi import APIRouter, Depends
from typing import Annotated


router = APIRouter()


@router.get("/health", tags=["health"])
async def check_health(
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name}