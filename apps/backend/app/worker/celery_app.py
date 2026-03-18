from celery import Celery

from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "narpisa_pdf_worker",
    broker=settings.celery_broker_url,
    include=["app.worker.tasks"],
)
celery_app.conf.update(
    task_ignore_result=True,
    worker_prefetch_multiplier=1,
)
