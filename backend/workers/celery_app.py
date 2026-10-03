from celery import Celery
from celery.signals import setup_logging

from app.logging_config import configure_logging
from app.settings import get_settings

celery_app = Celery("riverline", broker=get_settings().redis_url, include=["workers.tasks"])
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    task_ignore_result=True,
    worker_prefetch_multiplier=1,
    broker_connection_retry_on_startup=True,
)


@setup_logging.connect
def worker_logging(**kwargs):
    configure_logging()
