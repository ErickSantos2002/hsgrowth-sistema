"""
Instância principal do Celery para processamento assíncrono.
"""
from celery import Celery
from app.core.config import settings
from app.core.celery_config import CeleryConfig


def create_celery_app() -> Celery:
    """
    Cria e configura a instância do Celery.

    Returns:
        Celery: Instância configurada do Celery
    """
    celery_app = Celery("hsgrowth")

    # Aplica configurações
    celery_config = CeleryConfig.from_settings(settings)
    celery_app.config_from_object(celery_config)

    return celery_app


# Instância global do Celery
celery_app = create_celery_app()

# Importa tasks após celery_app estar disponível (evita circular import)
from app.workers import tasks  # noqa: F401, E402


# Task decorator exemplo para monitoramento
def monitored_task(name=None, **options):
    """
    Decorator para tasks com monitoramento adicional.
    Loga início, fim e erros de execução.

    Args:
        name: Nome da task (opcional)
        **options: Opções adicionais para a task

    Usage:
        @monitored_task(name="minha_task")
        def minha_task():
            pass
    """
    from functools import wraps
    from loguru import logger
    import time

    def decorator(func):
        # Registra a task no Celery
        task_func = celery_app.task(name=name, **options)(func)

        @wraps(func)
        def wrapper(*args, **kwargs):
            task_name = name or func.__name__
            logger.info(f"[CELERY] Iniciando task: {task_name}")
            start_time = time.time()

            try:
                result = task_func(*args, **kwargs)
                execution_time = (time.time() - start_time) * 1000
                logger.success(
                    f"[CELERY] Task {task_name} concluída em {execution_time:.2f}ms"
                )
                return result
            except Exception as e:
                execution_time = (time.time() - start_time) * 1000
                logger.error(
                    f"[CELERY] Erro na task {task_name} após {execution_time:.2f}ms: {e}"
                )
                raise

        return wrapper

    return decorator


if __name__ == "__main__":
    # Para debug: mostra configuração do Celery
    print("=== Configuração do Celery ===")
    print(f"Broker: {celery_app.conf.broker_url}")
    print(f"Backend: {celery_app.conf.result_backend}")
    print(f"Timezone: {celery_app.conf.timezone}")
    print(f"Filas: {[q.name for q in celery_app.conf.task_queues]}")
    print("=" * 30)
