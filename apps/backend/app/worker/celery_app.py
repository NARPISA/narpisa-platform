# mypy: disable-error-code=untyped-decorator

from celery import Celery
from celery.signals import worker_ready

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


@worker_ready.connect
def requeue_recoverable_jobs(**_: object) -> None:
    from app.worker.tasks import recover_queued_documents

    recover_queued_documents()
