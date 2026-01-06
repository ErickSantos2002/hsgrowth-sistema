"""
APScheduler - Agendador de tarefas periódicas (cron jobs).
Define jobs programados para executar automaticamente em intervalos específicos.
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime, timedelta
from loguru import logger
from typing import Optional

from app.db.session import SessionLocal
from app.core.config import settings
from app.workers.tasks import (
    check_scheduled_automations_task,
    cleanup_old_data_task,
    send_email_task,
    send_notification_task
)


# Instância global do scheduler
scheduler: Optional[AsyncIOScheduler] = None


def get_scheduler() -> AsyncIOScheduler:
    """
    Retorna a instância do scheduler (singleton).

    Returns:
        AsyncIOScheduler
    """
    global scheduler
    if scheduler is None:
        scheduler = AsyncIOScheduler(timezone="America/Sao_Paulo")
    return scheduler


# ===================== JOB FUNCTIONS =====================


def job_check_scheduled_automations():
    """
    Job: Verifica e executa automações agendadas.
    Frequência: A cada 1 minuto
    """
    try:
        logger.info("[CRON] Verificando automações agendadas...")
        result = check_scheduled_automations_task()
        logger.success(f"[CRON] Automações verificadas: {result}")
    except Exception as e:
        logger.error(f"[CRON] Erro ao verificar automações: {e}")


def job_update_sales_ranking():
    """
    Job: Atualiza ranking de vendedores.
    Frequência: Diariamente às 00:00
    """
    db = SessionLocal()
    try:
        logger.info("[CRON] Atualizando ranking de vendedores...")

        from app.repositories.user_repository import UserRepository
        from app.models.user import User
        from app.models.card import Card
        from sqlalchemy import func, and_
        from datetime import date

        user_repo = UserRepository(db)

        # Busca todos os vendedores ativos
        users = db.query(User).filter(
            User.is_deleted == False,
            User.is_active == True,
            User.role.in_(["salesperson", "manager"])
        ).all()

        # Atualiza pontos de gamificação baseado em vendas do mês
        today = date.today()
        month_start = today.replace(day=1)

        for user in users:
            # Conta cards ganhos no mês
            won_cards = db.query(func.count(Card.id)).filter(
                and_(
                    Card.assigned_to_id == user.id,
                    Card.stage == "won",
                    func.date(Card.updated_at) >= month_start
                )
            ).scalar() or 0

            # Atualiza estatísticas de gamificação (se existir)
            if hasattr(user, 'gamification_stats') and user.gamification_stats:
                user.gamification_stats.monthly_points = won_cards * 10  # 10 pontos por venda
                user.gamification_stats.total_points = user.gamification_stats.monthly_points

        db.commit()
        logger.success(f"[CRON] Ranking atualizado para {len(users)} vendedores")

    except Exception as e:
        logger.error(f"[CRON] Erro ao atualizar ranking: {e}")
        db.rollback()
    finally:
        db.close()


def job_verify_badges():
    """
    Job: Verifica e concede badges aos usuários.
    Frequência: Diariamente às 01:00
    """
    db = SessionLocal()
    try:
        logger.info("[CRON] Verificando badges para usuários...")

        from app.services.gamification_service import GamificationService

        service = GamificationService(db)

        # Busca todos os usuários ativos
        from app.models.user import User
        users = db.query(User).filter(
            User.is_deleted == False,
            User.is_active == True
        ).all()

        badges_granted = 0
        for user in users:
            try:
                # Verifica e concede badges (método do service)
                if hasattr(service, 'verify_and_grant_badges'):
                    granted = service.verify_and_grant_badges(user.id)
                    badges_granted += len(granted)
            except Exception as e:
                logger.warning(f"[CRON] Erro ao verificar badges do usuário {user.id}: {e}")

        logger.success(f"[CRON] {badges_granted} badges concedidos")

    except Exception as e:
        logger.error(f"[CRON] Erro ao verificar badges: {e}")
    finally:
        db.close()


def job_check_overdue_cards():
    """
    Job: Verifica cards vencidos e notifica responsáveis.
    Frequência: Diariamente às 08:00
    """
    db = SessionLocal()
    try:
        logger.info("[CRON] Verificando cards vencidos...")

        from app.models.card import Card
        from datetime import date

        today = date.today()

        # Busca cards vencidos que ainda não foram ganhos/perdidos
        overdue_cards = db.query(Card).filter(
            Card.due_date < today,
            Card.stage.notin_(["won", "lost"]),
            Card.assigned_to_id.isnot(None)
        ).all()

        # Notifica para cada card vencido
        notified_count = 0
        for card in overdue_cards:
            try:
                # Envia notificação
                send_notification_task.delay(
                    user_ids=[card.assigned_to_id],
                    notification_type="card_overdue",
                    title="Card Vencido",
                    message=f"O card '{card.title}' está vencido desde {card.due_date}",
                    entity_id=card.id,
                    entity_type="card"
                )
                notified_count += 1
            except Exception as e:
                logger.warning(f"[CRON] Erro ao notificar card vencido {card.id}: {e}")

        logger.success(f"[CRON] {notified_count} notificações de cards vencidos enviadas")

    except Exception as e:
        logger.error(f"[CRON] Erro ao verificar cards vencidos: {e}")
    finally:
        db.close()


def job_report_failed_automations():
    """
    Job: Envia relatório de automações que falharam nas últimas 24h.
    Frequência: Diariamente às 09:00
    """
    db = SessionLocal()
    try:
        logger.info("[CRON] Gerando relatório de automações falhadas...")

        from app.models.automation_execution import AutomationExecution
        from app.models.automation import Automation
        from app.models.user import User
        from sqlalchemy import func, and_

        yesterday = datetime.utcnow() - timedelta(days=1)

        # Busca execuções falhadas nas últimas 24h
        failed_executions = db.query(
            AutomationExecution,
            Automation
        ).join(
            Automation,
            AutomationExecution.automation_id == Automation.id
        ).filter(
            and_(
                AutomationExecution.status == "failed",
                AutomationExecution.executed_at >= yesterday
            )
        ).all()

        if not failed_executions:
            logger.info("[CRON] Nenhuma automação falhada nas últimas 24h")
            return

        # Agrupa por conta e prepara relatório
        failures_by_account = {}
        for execution, automation in failed_executions:
            account_id = automation.account_id
            if account_id not in failures_by_account:
                failures_by_account[account_id] = []

            failures_by_account[account_id].append({
                "automation_name": automation.name,
                "automation_id": automation.id,
                "error_message": execution.error_message or "Erro desconhecido",
                "executed_at": execution.executed_at.isoformat()
            })

        # Envia email para admins de cada conta
        emails_sent = 0
        for account_id, failures in failures_by_account.items():
            # Busca admins da conta
            admins = db.query(User).filter(
                User.account_id == account_id,
                User.role == "admin",
                User.is_active == True,
                User.is_deleted == False
            ).all()

            for admin in admins:
                try:
                    if len(failures) >= settings.EMAIL_GROUP_THRESHOLD:
                        # Envia email agrupado
                        send_email_task.delay(
                            email_type="automation_failures_grouped",
                            to_email=admin.email,
                            user_name=admin.name,
                            failures=failures
                        )
                    else:
                        # Envia email individual para cada falha
                        for failure in failures:
                            send_email_task.delay(
                                email_type="automation_failure",
                                to_email=admin.email,
                                automation_name=failure["automation_name"],
                                error_message=failure["error_message"],
                                automation_id=failure["automation_id"]
                            )
                    emails_sent += 1
                except Exception as e:
                    logger.warning(f"[CRON] Erro ao enviar relatório para {admin.email}: {e}")

        logger.success(f"[CRON] Relatório de falhas enviado para {emails_sent} admins")

    except Exception as e:
        logger.error(f"[CRON] Erro ao gerar relatório de automações falhadas: {e}")
    finally:
        db.close()


def job_cleanup_notifications():
    """
    Job: Limpa notificações antigas já lidas.
    Frequência: Semanalmente aos domingos às 03:00
    """
    try:
        logger.info("[CRON] Limpando notificações antigas...")
        result = cleanup_old_data_task.delay(retention_days=settings.LOG_RETENTION_DAYS)
        logger.success(f"[CRON] Task de limpeza disparada: {result}")
    except Exception as e:
        logger.error(f"[CRON] Erro ao disparar limpeza: {e}")


def job_update_gamification_stats():
    """
    Job: Atualiza estatísticas de gamificação.
    Frequência: Diariamente às 23:00
    """
    db = SessionLocal()
    try:
        logger.info("[CRON] Atualizando estatísticas de gamificação...")

        from app.models.user import User
        from app.models.gamification_stats import GamificationStats

        # Atualiza streak de atividade
        users_with_stats = db.query(User).join(GamificationStats).filter(
            User.is_deleted == False,
            User.is_active == True
        ).all()

        updated_count = 0
        for user in users_with_stats:
            try:
                stats = user.gamification_stats

                # Verifica se teve atividade hoje (última atualização)
                today = datetime.utcnow().date()
                last_activity = stats.updated_at.date() if stats.updated_at else None

                if last_activity == today:
                    # Teve atividade hoje, incrementa streak
                    stats.current_streak = (stats.current_streak or 0) + 1
                    stats.longest_streak = max(stats.longest_streak or 0, stats.current_streak)
                else:
                    # Não teve atividade, reseta streak
                    stats.current_streak = 0

                updated_count += 1

            except Exception as e:
                logger.warning(f"[CRON] Erro ao atualizar stats do usuário {user.id}: {e}")

        db.commit()
        logger.success(f"[CRON] Estatísticas atualizadas para {updated_count} usuários")

    except Exception as e:
        logger.error(f"[CRON] Erro ao atualizar estatísticas de gamificação: {e}")
        db.rollback()
    finally:
        db.close()


def job_check_pending_transfers():
    """
    Job: Verifica transferências pendentes que expiraram.
    Frequência: Diariamente às 10:00
    """
    db = SessionLocal()
    try:
        logger.info("[CRON] Verificando transferências pendentes...")

        from app.models.card_transfer import CardTransfer, TransferStatus

        # Busca transferências pendentes que expiraram
        expiration_date = datetime.utcnow() - timedelta(hours=settings.TRANSFER_APPROVAL_EXPIRATION_HOURS)

        expired_transfers = db.query(CardTransfer).filter(
            CardTransfer.status == TransferStatus.PENDING,
            CardTransfer.created_at < expiration_date
        ).all()

        # Cancela transferências expiradas
        cancelled_count = 0
        for transfer in expired_transfers:
            try:
                transfer.status = TransferStatus.REJECTED
                transfer.rejection_reason = "Transferência expirou (sem aprovação no prazo)"

                # Notifica usuário de origem
                send_notification_task.delay(
                    user_ids=[transfer.from_user_id],
                    notification_type="transfer_rejected",
                    title="Transferência Expirada",
                    message=f"A transferência do card '{transfer.card.title}' expirou",
                    entity_id=transfer.id,
                    entity_type="transfer"
                )

                cancelled_count += 1

            except Exception as e:
                logger.warning(f"[CRON] Erro ao cancelar transferência {transfer.id}: {e}")

        db.commit()
        logger.success(f"[CRON] {cancelled_count} transferências expiradas canceladas")

    except Exception as e:
        logger.error(f"[CRON] Erro ao verificar transferências pendentes: {e}")
        db.rollback()
    finally:
        db.close()


def job_backup_audit_logs():
    """
    Job: Faz backup de logs de auditoria para arquivo.
    Frequência: Semanalmente aos domingos às 04:00
    """
    db = SessionLocal()
    try:
        logger.info("[CRON] Fazendo backup de logs de auditoria...")

        from app.models.audit_log import AuditLog
        import json
        from pathlib import Path

        # Busca logs dos últimos 7 dias
        week_ago = datetime.utcnow() - timedelta(days=7)
        logs = db.query(AuditLog).filter(
            AuditLog.created_at >= week_ago
        ).all()

        if not logs:
            logger.info("[CRON] Nenhum log para fazer backup")
            return

        # Prepara dados para backup
        backup_data = []
        for log in logs:
            backup_data.append({
                "id": log.id,
                "user_id": log.user_id,
                "action": log.action,
                "entity_type": log.entity_type,
                "entity_id": log.entity_id,
                "details": log.details,
                "ip_address": log.ip_address,
                "user_agent": log.user_agent,
                "created_at": log.created_at.isoformat()
            })

        # Salva em arquivo JSON
        backup_dir = Path("backups/audit_logs")
        backup_dir.mkdir(parents=True, exist_ok=True)

        backup_file = backup_dir / f"audit_logs_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
        with open(backup_file, 'w', encoding='utf-8') as f:
            json.dump(backup_data, f, indent=2, ensure_ascii=False)

        logger.success(f"[CRON] Backup salvo: {backup_file} ({len(logs)} logs)")

    except Exception as e:
        logger.error(f"[CRON] Erro ao fazer backup de logs: {e}")
    finally:
        db.close()


# ===================== SCHEDULER CONFIGURATION =====================


def configure_jobs():
    """
    Configura todos os cron jobs no scheduler.
    """
    sched = get_scheduler()

    # 1. Verificar automações agendadas - A cada 1 minuto
    sched.add_job(
        job_check_scheduled_automations,
        trigger=IntervalTrigger(minutes=settings.AUTOMATION_CRON_INTERVAL_MINUTES),
        id="check_scheduled_automations",
        name="Verificar Automações Agendadas",
        replace_existing=True
    )

    # 2. Atualizar ranking de vendedores - Diariamente às 00:00
    sched.add_job(
        job_update_sales_ranking,
        trigger=CronTrigger(hour=0, minute=0),
        id="update_sales_ranking",
        name="Atualizar Ranking de Vendedores",
        replace_existing=True
    )

    # 3. Verificar badges - Diariamente às 01:00
    sched.add_job(
        job_verify_badges,
        trigger=CronTrigger(hour=1, minute=0),
        id="verify_badges",
        name="Verificar Badges",
        replace_existing=True
    )

    # 4. Verificar cards vencidos - Diariamente às 08:00
    sched.add_job(
        job_check_overdue_cards,
        trigger=CronTrigger(hour=8, minute=0),
        id="check_overdue_cards",
        name="Verificar Cards Vencidos",
        replace_existing=True
    )

    # 5. Relatório de automações falhadas - Diariamente às 09:00
    sched.add_job(
        job_report_failed_automations,
        trigger=CronTrigger(hour=9, minute=0),
        id="report_failed_automations",
        name="Relatório de Automações Falhadas",
        replace_existing=True
    )

    # 6. Verificar transferências pendentes - Diariamente às 10:00
    sched.add_job(
        job_check_pending_transfers,
        trigger=CronTrigger(hour=10, minute=0),
        id="check_pending_transfers",
        name="Verificar Transferências Pendentes",
        replace_existing=True
    )

    # 7. Atualizar estatísticas de gamificação - Diariamente às 23:00
    sched.add_job(
        job_update_gamification_stats,
        trigger=CronTrigger(hour=23, minute=0),
        id="update_gamification_stats",
        name="Atualizar Estatísticas de Gamificação",
        replace_existing=True
    )

    # 8. Limpar notificações antigas - Semanalmente aos domingos às 03:00
    sched.add_job(
        job_cleanup_notifications,
        trigger=CronTrigger(day_of_week="sun", hour=3, minute=0),
        id="cleanup_notifications",
        name="Limpar Notificações Antigas",
        replace_existing=True
    )

    # 9. Backup de logs de auditoria - Semanalmente aos domingos às 04:00
    sched.add_job(
        job_backup_audit_logs,
        trigger=CronTrigger(day_of_week="sun", hour=4, minute=0),
        id="backup_audit_logs",
        name="Backup de Logs de Auditoria",
        replace_existing=True
    )

    logger.info(f"[SCHEDULER] {len(sched.get_jobs())} jobs configurados")


async def start_scheduler():
    """
    Inicia o scheduler.
    Deve ser chamado no lifespan event do FastAPI.
    """
    sched = get_scheduler()

    if not sched.running:
        configure_jobs()
        sched.start()
        logger.success("[SCHEDULER] Scheduler iniciado com sucesso")

        # Log dos jobs configurados
        jobs = sched.get_jobs()
        logger.info(f"[SCHEDULER] Jobs ativos: {len(jobs)}")
        for job in jobs:
            logger.info(f"  - {job.name} (próxima execução: {job.next_run_time})")
    else:
        logger.warning("[SCHEDULER] Scheduler já está rodando")


async def stop_scheduler():
    """
    Para o scheduler gracefully.
    Deve ser chamado no shutdown do FastAPI.
    """
    sched = get_scheduler()

    if sched.running:
        sched.shutdown(wait=True)
        logger.success("[SCHEDULER] Scheduler parado com sucesso")
    else:
        logger.warning("[SCHEDULER] Scheduler não está rodando")
