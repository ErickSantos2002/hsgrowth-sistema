"""
Celery Tasks - Tarefas assíncronas processadas pelo worker.
Define tasks para automações, notificações, emails, relatórios e manutenção.
"""
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from loguru import logger

from app.workers.celery_app import celery_app
from app.db.session import SessionLocal
from app.services.automation_service import AutomationService
from app.services.notification_service import NotificationService
from app.services.email_service import EmailService
from app.services.report_service import ReportService
from app.repositories.notification_repository import NotificationRepository
from app.models.automation_execution import AutomationExecution


# ===================== AUTOMATIONS =====================


@celery_app.task(name="execute_automation_task", bind=True, max_retries=3)
def execute_automation_task(
    self,
    automation_id: int,
    card_id: Optional[int] = None,
    triggered_by_id: Optional[int] = None,
    execution_data: Optional[Dict[str, Any]] = None
):
    """
    Executa uma automação assincronamente.

    Args:
        automation_id: ID da automação
        card_id: ID do card (opcional)
        triggered_by_id: ID do usuário que disparou (opcional)
        execution_data: Dados adicionais (opcional)

    Returns:
        Dict com resultado da execução
    """
    db = SessionLocal()
    try:
        logger.info(f"Executando automação {automation_id} (card={card_id})")

        service = AutomationService(db)
        result = service.execute_automation(
            automation_id=automation_id,
            card_id=card_id,
            triggered_by_id=triggered_by_id,
            execution_data=execution_data
        )

        logger.success(f"Automação {automation_id} executada com sucesso")
        return {
            "success": True,
            "execution_id": result.id,
            "status": result.status,
            "message": "Automação executada com sucesso"
        }

    except Exception as e:
        logger.error(f"Erro ao executar automação {automation_id}: {e}")

        # Retry com exponential backoff
        try:
            raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))
        except self.MaxRetriesExceededError:
            logger.error(f"Máximo de tentativas excedido para automação {automation_id}")
            return {
                "success": False,
                "error": str(e),
                "message": "Falha após múltiplas tentativas"
            }

    finally:
        db.close()


# ===================== NOTIFICATIONS =====================


@celery_app.task(name="send_notification_task")
def send_notification_task(
    user_ids: List[int],
    notification_type: str,
    title: str,
    message: str,
    entity_id: Optional[int] = None,
    entity_type: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
):
    """
    Envia notificação para múltiplos usuários assincronamente.

    Args:
        user_ids: Lista de IDs dos usuários
        notification_type: Tipo da notificação
        title: Título
        message: Mensagem
        entity_id: ID da entidade relacionada (opcional)
        entity_type: Tipo da entidade (opcional)
        metadata: Metadados adicionais (opcional)

    Returns:
        Dict com quantidade de notificações enviadas
    """
    db = SessionLocal()
    try:
        logger.info(f"Enviando notificação tipo '{notification_type}' para {len(user_ids)} usuários")

        service = NotificationService(db)

        # Envia para cada usuário
        created_count = 0
        for user_id in user_ids:
            try:
                from app.schemas.notification import NotificationCreate
                notification_data = NotificationCreate(
                    user_id=user_id,
                    notification_type=notification_type,
                    title=title,
                    message=message,
                    entity_id=entity_id,
                    entity_type=entity_type,
                    metadata=metadata or {}
                )
                service.create_notification(notification_data)
                created_count += 1
            except Exception as e:
                logger.warning(f"Falha ao notificar usuário {user_id}: {e}")

        logger.success(f"{created_count}/{len(user_ids)} notificações enviadas")
        return {
            "success": True,
            "sent": created_count,
            "total": len(user_ids),
            "message": f"{created_count} notificações enviadas"
        }

    except Exception as e:
        logger.error(f"Erro ao enviar notificações: {e}")
        return {
            "success": False,
            "error": str(e)
        }

    finally:
        db.close()


# ===================== EMAIL =====================


@celery_app.task(name="send_email_task", bind=True, max_retries=5)
def send_email_task(
    self,
    email_type: str,
    to_email: str,
    **kwargs
):
    """
    Envia email assincronamente.

    Args:
        email_type: Tipo do email (password_reset, automation_failure, welcome, etc)
        to_email: Email do destinatário
        **kwargs: Parâmetros específicos do tipo de email

    Returns:
        Dict com resultado do envio
    """
    db = SessionLocal()
    try:
        logger.info(f"Enviando email tipo '{email_type}' para {to_email}")

        service = EmailService(db)

        # Despacha para o método correto baseado no tipo
        if email_type == "password_reset":
            service.send_password_reset_email(
                to_email=to_email,
                reset_token=kwargs.get("reset_token"),
                user_name=kwargs.get("user_name")
            )

        elif email_type == "automation_failure":
            service.send_automation_failure_email(
                to_email=to_email,
                automation_name=kwargs.get("automation_name"),
                error_message=kwargs.get("error_message"),
                automation_id=kwargs.get("automation_id")
            )

        elif email_type == "automation_failures_grouped":
            service.send_automation_failures_grouped_email(
                to_email=to_email,
                user_name=kwargs.get("user_name"),
                failures=kwargs.get("failures", [])
            )

        elif email_type == "automation_disabled":
            service.send_automation_disabled_email(
                to_email=to_email,
                automation_name=kwargs.get("automation_name"),
                failure_count=kwargs.get("failure_count"),
                automation_id=kwargs.get("automation_id")
            )

        elif email_type == "welcome":
            service.send_welcome_email(
                to_email=to_email,
                user_name=kwargs.get("user_name")
            )

        else:
            raise ValueError(f"Tipo de email desconhecido: {email_type}")

        logger.success(f"Email '{email_type}' enviado para {to_email}")
        return {
            "success": True,
            "email_type": email_type,
            "to_email": to_email,
            "message": "Email enviado com sucesso"
        }

    except Exception as e:
        logger.error(f"Erro ao enviar email '{email_type}' para {to_email}: {e}")

        # Retry com exponential backoff
        try:
            raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))
        except self.MaxRetriesExceededError:
            logger.error(f"Máximo de tentativas excedido para email '{email_type}'")
            return {
                "success": False,
                "error": str(e),
                "message": "Falha após múltiplas tentativas"
            }

    finally:
        db.close()


# ===================== REPORTS =====================


@celery_app.task(name="generate_report_task")
def generate_report_task(
    account_id: int,
    report_type: str,
    period: str,
    filters: Optional[Dict[str, Any]] = None
):
    """
    Gera um relatório assincronamente.

    Args:
        account_id: ID da conta
        report_type: Tipo do relatório (sales, conversion, transfers)
        period: Período (today, this_week, this_month, etc)
        filters: Filtros adicionais (opcional)

    Returns:
        Dict com dados do relatório
    """
    db = SessionLocal()
    try:
        logger.info(f"Gerando relatório '{report_type}' para conta {account_id}")

        service = ReportService(db)

        # Despacha para o método correto
        if report_type == "sales":
            from app.schemas.report import SalesReportRequest
            request = SalesReportRequest(
                account_id=account_id,
                period=period,
                **(filters or {})
            )
            result = service.get_sales_report(request)

        elif report_type == "conversion":
            from app.schemas.report import ConversionReportRequest
            request = ConversionReportRequest(
                account_id=account_id,
                period=period,
                **(filters or {})
            )
            result = service.get_conversion_report(request)

        elif report_type == "transfers":
            from app.schemas.report import TransferReportRequest
            request = TransferReportRequest(
                account_id=account_id,
                period=period,
                **(filters or {})
            )
            result = service.get_transfer_report(request)

        else:
            raise ValueError(f"Tipo de relatório desconhecido: {report_type}")

        logger.success(f"Relatório '{report_type}' gerado para conta {account_id}")
        return {
            "success": True,
            "report_type": report_type,
            "data": result.model_dump() if hasattr(result, 'model_dump') else result,
            "message": "Relatório gerado com sucesso"
        }

    except Exception as e:
        logger.error(f"Erro ao gerar relatório '{report_type}': {e}")
        return {
            "success": False,
            "error": str(e)
        }

    finally:
        db.close()


# ===================== MAINTENANCE =====================


@celery_app.task(name="cleanup_old_data_task")
def cleanup_old_data_task(retention_days: int = 90):
    """
    Limpa dados antigos do sistema.

    Args:
        retention_days: Dias de retenção (padrão: 90)

    Returns:
        Dict com estatísticas de limpeza
    """
    db = SessionLocal()
    try:
        logger.info(f"Iniciando limpeza de dados antigos (retenção: {retention_days} dias)")

        cutoff_date = datetime.utcnow() - timedelta(days=retention_days)

        # Limpa notificações antigas já lidas
        notification_repo = NotificationRepository(db)
        deleted_notifications = notification_repo.delete_old_notifications(cutoff_date, read_only=True)

        # Limpa execuções de automações antigas (apenas as bem-sucedidas)
        from app.models.automation_execution import AutomationExecution
        deleted_executions = db.query(AutomationExecution).filter(
            AutomationExecution.executed_at < cutoff_date,
            AutomationExecution.status == "success"
        ).delete(synchronize_session=False)
        db.commit()

        logger.success(
            f"Limpeza concluída: {deleted_notifications} notificações, "
            f"{deleted_executions} execuções removidas"
        )

        return {
            "success": True,
            "deleted_notifications": deleted_notifications,
            "deleted_executions": deleted_executions,
            "cutoff_date": cutoff_date.isoformat(),
            "message": "Limpeza concluída com sucesso"
        }

    except Exception as e:
        logger.error(f"Erro na limpeza de dados: {e}")
        db.rollback()
        return {
            "success": False,
            "error": str(e)
        }

    finally:
        db.close()


# ===================== UTILITY TASKS =====================


@celery_app.task(name="check_scheduled_automations_task")
def check_scheduled_automations_task():
    """
    Verifica e executa automações agendadas que devem rodar agora.

    Returns:
        Dict com estatísticas de execução
    """
    db = SessionLocal()
    try:
        logger.info("Verificando automações agendadas...")

        from app.repositories.automation_repository import AutomationRepository
        repo = AutomationRepository(db)

        # Busca automações que devem rodar agora
        automations = repo.find_scheduled_to_run()

        executed_count = 0
        for automation in automations:
            try:
                # Dispara task assíncrona para executar
                execute_automation_task.delay(automation.id)
                executed_count += 1
            except Exception as e:
                logger.warning(f"Falha ao disparar automação {automation.id}: {e}")

        logger.success(f"{executed_count} automações agendadas disparadas")
        return {
            "success": True,
            "checked": len(automations),
            "executed": executed_count,
            "message": f"{executed_count} automações disparadas"
        }

    except Exception as e:
        logger.error(f"Erro ao verificar automações agendadas: {e}")
        return {
            "success": False,
            "error": str(e)
        }

    finally:
        db.close()
