"""
Workers e Jobs Assíncronos.
Contém configuração do Celery, tasks e scheduler APScheduler.
"""
from app.workers.celery_app import celery_app

__all__ = ["celery_app"]
