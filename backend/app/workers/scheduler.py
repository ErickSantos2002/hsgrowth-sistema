"""
APScheduler - Agendador de tarefas periódicas (cron jobs).
Define jobs programados para executar automaticamente em intervalos específicos.
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime, timedelta, timezone
from loguru import logger
from typing import Optional

from app.db.session import SessionLocal
from app.core.config import settings
from app.workers.tasks import (
    check_scheduled_automations_task,
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


def job_recalculate_gamification_rankings():
    """
    Job: Recalcula rankings de gamificação para os dois boards e todos os períodos.
    Frequência: A cada 1 hora.

    Rankings são separados por board_type (prospecting/acquisition) e período
    (semanal, mensal, trimestral, anual). Apenas usuários com role salesperson
    e sdr participam dos rankings.
    """
    db = SessionLocal()
    try:
        logger.info("[CRON] Recalculando rankings de gamificação...")

        from app.services.gamification_service import GamificationService

        service = GamificationService(db)
        boards = ["prospecting", "acquisition"]
        periods = ["weekly", "monthly", "quarterly", "annual"]

        total_calculated = 0
        for board_type in boards:
            for period_type in periods:
                try:
                    result = service.calculate_rankings_for_board(board_type, period_type)
                    total_calculated += len(result.rankings)
                    logger.debug(
                        f"[CRON] Rankings calculados: board={board_type}, "
                        f"period={period_type}, usuários={len(result.rankings)}"
                    )
                except Exception as e:
                    logger.warning(
                        f"[CRON] Erro ao calcular ranking {board_type}/{period_type}: {e}"
                    )

        logger.success(f"[CRON] Rankings recalculados: {total_calculated} posições atualizadas")

    except Exception as e:
        logger.error(f"[CRON] Erro ao recalcular rankings de gamificação: {e}")
        db.rollback()
    finally:
        db.close()


def job_limpar_gravacoes_antigas():
    """
    Descarta as gravações que passaram do prazo de retenção.

    Sem isso o bucket cresce indefinidamente. A transcrição e a análise ficam:
    ocupam pouco e são o que tem valor no histórico do negócio.
    """
    try:
        from app.services.recording_service import limpar_gravacoes_antigas

        descartadas = limpar_gravacoes_antigas()
        if descartadas:
            logger.info(f"[CRON] {descartadas} gravacao(oes) antiga(s) descartada(s)")
    except Exception as e:
        logger.error(f"[CRON] Erro ao limpar gravacoes antigas: {e}")


def job_verify_badges():
    """
    Job: Verifica e concede badges automáticos aos usuários.
    Frequência: Diariamente às 01:00 (ou a cada 30 minutos se configurado)
    """
    db = SessionLocal()
    try:
        logger.info("[CRON] Verificando badges automáticos para usuários...")

        from app.workers.badge_checker import check_and_award_automatic_badges

        # Executa verificação de badges
        result = check_and_award_automatic_badges(db)

        logger.success(
            f"[CRON] Verificação completa: "
            f"{result['total_badges_awarded']} badges atribuídos a "
            f"{len(result['users_with_new_badges'])} usuários"
        )

    except Exception as e:
        logger.error(f"[CRON] Erro ao verificar badges: {e}")
        db.rollback()
    finally:
        db.close()


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


# ── Avisos (sem Celery: gravam direto no banco) ──────────────────────────────
# Os lembretes antigos iam para a fila do Celery, e produção não tem worker:
# nunca chegaram a ninguém. Estes rodam aqui mesmo, dentro da API.

def _rodar_aviso(nome: str, funcao) -> None:
    db = SessionLocal()
    try:
        quantos = funcao(db, datetime.utcnow())
        if quantos:
            logger.info(f"[AVISOS] {nome}: {quantos}")
    except Exception as e:
        db.rollback()
        logger.error(f"[AVISOS] {nome} falhou: {e}")
    finally:
        db.close()


def job_resumo_manha():
    from app.services.notificacoes.resumo import enviar_resumos_da_manha
    _rodar_aviso("resumo da manhã", enviar_resumos_da_manha)


def job_reuniao_15min():
    from app.services.notificacoes.reunioes import avisar_reunioes_proximas
    _rodar_aviso("reunião em 15 minutos", avisar_reunioes_proximas)


def job_lembrete_reuniao_email():
    from app.services.notificacoes.lembrete_reuniao import enviar_lembretes_de_reuniao
    _rodar_aviso("lembrete de reunião por e-mail", enviar_lembretes_de_reuniao)


def job_cards_novos_servico():
    from app.services.notificacoes.servico import avisar_cards_novos_de_servico
    _rodar_aviso("card novo de Serviço", avisar_cards_novos_de_servico)


def job_limpar_notificacoes():
    from app.services.notificacoes.limpeza import limpar_notificacoes_lidas
    _rodar_aviso("limpeza de notificações", limpar_notificacoes_lidas)


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

    # 2. Recalcular rankings de gamificação - A cada 1 hora
    # next_run_time=datetime.utcnow() garante execução imediata no startup,
    # corrigindo o problema de restarts frequentes que zerariam o timer
    sched.add_job(
        job_recalculate_gamification_rankings,
        trigger=IntervalTrigger(hours=1),
        id="recalculate_gamification_rankings",
        name="Recalcular Rankings de Gamificação",
        replace_existing=True,
        next_run_time=datetime.now(timezone.utc)
    )

    # 2b. Descartar gravações antigas - Diariamente às 03:00
    # Madrugada porque percorre o bucket e pode demorar em volume grande
    sched.add_job(
        job_limpar_gravacoes_antigas,
        trigger=CronTrigger(hour=3, minute=0),
        id="limpar_gravacoes_antigas",
        name="Descartar Gravações Antigas",
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

    # 4. Avisos: resumo da manhã, reunião em 15 min, card novo de Serviço e
    # limpeza das lidas. Gravam direto no banco, sem Celery.
    sched.add_job(job_resumo_manha, trigger=CronTrigger(day_of_week="mon-fri", hour=8, minute=0),
                  id="resumo_manha", name="Resumo da manhã", replace_existing=True)
    sched.add_job(job_reuniao_15min, trigger=IntervalTrigger(minutes=1),
                  id="reuniao_15min", name="Reunião em 15 minutos", replace_existing=True)
    # E-mail aos convidados da reunião: 8h do dia e 1 hora antes
    sched.add_job(job_lembrete_reuniao_email, trigger=IntervalTrigger(minutes=1),
                  id="lembrete_reuniao_email", name="Lembrete de reunião por e-mail", replace_existing=True)
    sched.add_job(job_cards_novos_servico, trigger=IntervalTrigger(minutes=5),
                  id="cards_novos_servico", name="Card novo de Serviço", replace_existing=True)
    sched.add_job(job_limpar_notificacoes, trigger=CronTrigger(hour=3, minute=30),
                  id="limpar_notificacoes", name="Limpar notificações lidas", replace_existing=True)

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
