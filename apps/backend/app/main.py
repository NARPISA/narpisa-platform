from fastapi import FastAPI

from app.api.routes import router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.worker_version,
    docs_url="/docs",
    redoc_url="/redoc",
)
app.include_router(router, prefix="/api/v1")
