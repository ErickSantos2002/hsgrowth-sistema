"""
Configuração do Celery para processamento assíncrono de tarefas.
Define filas, serialização, timeouts e outras configurações.
"""
from kombu import Queue


class CeleryConfig:
    """Configurações do Celery"""

    # Broker e Backend
    broker_url = None  # Será definido dinamicamente
    result_backend = None  # Será definido dinamicamente

    # Serialização
    task_serializer = "json"
    result_serializer = "json"
    accept_content = ["json"]

    # Timezone
    timezone = "America/Sao_Paulo"
    enable_utc = False

    # Task tracking
    task_track_started = True
    task_time_limit = 3600  # 1 hora
    task_soft_time_limit = 3000  # 50 minutos

    # Result backend settings
    result_expires = 86400  # 24 horas
    result_persistent = True

    # Task routes - direciona tasks para filas específicas
    task_routes = {
        "app.workers.tasks.execute_automation_task": {"queue": "automations"},
        "app.workers.tasks.send_notification_task": {"queue": "notifications"},
        "app.workers.tasks.send_email_task": {"queue": "emails"},
        "app.workers.tasks.generate_report_task": {"queue": "reports"},
        "app.workers.tasks.cleanup_old_data_task": {"queue": "maintenance"},
    }

    # Filas definidas
    task_queues = (
        Queue("default"),          # Fila padrão
        Queue("automations"),      # Alta prioridade - automações
        Queue("notifications"),    # Média prioridade - notificações
        Queue("emails"),          # Média prioridade - emails
        Queue("reports"),         # Baixa prioridade - relatórios
        Queue("maintenance"),     # Baixa prioridade - manutenção
    )

    # Default queue
    task_default_queue = "default"
    task_default_exchange = "default"
    task_default_routing_key = "default"

    # Retry settings
    task_acks_late = True
    task_reject_on_worker_lost = True

    # Worker settings
    worker_prefetch_multiplier = 4
    worker_max_tasks_per_child = 1000
    worker_disable_rate_limits = False

    # Monitoring
    worker_send_task_events = True
    task_send_sent_event = True

    # Logs
    worker_log_format = "[%(asctime)s: %(levelname)s/%(processName)s] %(message)s"
    worker_task_log_format = "[%(asctime)s: %(levelname)s/%(processName)s][%(task_name)s(%(task_id)s)] %(message)s"

    # Beat scheduler (para tarefas agendadas)
    beat_scheduler = "celery.beat.PersistentScheduler"
    beat_schedule_filename = "celerybeat-schedule"

    # Redis connection pool settings
    broker_connection_retry_on_startup = True
    broker_connection_max_retries = 10

    @classmethod
    def from_settings(cls, settings):
        """
        Cria configuração do Celery a partir das settings da aplicação.

        Args:
            settings: Instância de Settings com configurações da aplicação

        Returns:
            Dict com configurações do Celery
        """
        config = cls()
        config.broker_url = settings.CELERY_BROKER_URL
        config.result_backend = settings.CELERY_RESULT_BACKEND

        # Retorna como dict para aplicar no Celery app
        return {
            key: value
            for key, value in vars(config).items()
            if not key.startswith("_") and key != "from_settings"
        }
