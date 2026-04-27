from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.routes import router as core_router
from app.data.database_admin.routes import router as database_admin_router
from app.data.pdf.routes import router as pdf_adaptor_router
from app.data.routes import router as adaptor_router

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(core_router, prefix="/api/v1")
app.include_router(adaptor_router, prefix="/api/v1")
app.include_router(pdf_adaptor_router, prefix="/api/v1")
app.include_router(database_admin_router, prefix="/api/v1")
