"""
Limpeza das lidas com mais de 30 dias e os jobs no agendador da API.

Os lembretes antigos (card vencido, tarefa vencendo...) iam para a fila do
Celery, e produção não tem worker: nunca chegaram a ninguém.
"""
from datetime import datetime, timedelta

from app.models.notification import Notification
from app.services.notificacoes.limpeza import limpar_notificacoes_lidas

AGORA = datetime(2026, 11, 20, 6, 30)


def _aviso(db, user, lida_em=None):
    db.add(Notification(user_id=user.id, notification_type="card_atribuido", title="t",
                        message="m", notification_metadata={},
                        is_read=lida_em is not None, read_at=lida_em))
    db.commit()


def test_apaga_so_as_lidas_ha_mais_de_30_dias(db, test_salesperson_user):
    _aviso(db, test_salesperson_user, lida_em=AGORA - timedelta(days=31))
    _aviso(db, test_salesperson_user, lida_em=AGORA - timedelta(days=29))
    _aviso(db, test_salesperson_user)  # não lida

    assert limpar_notificacoes_lidas(db, AGORA) == 1
    assert db.query(Notification).count() == 2


def test_jobs_registrados():
    from app.workers import scheduler as agenda

    agenda.scheduler = None
    try:
        agenda.configure_jobs()
        ids = {j.id for j in agenda.get_scheduler().get_jobs()}
    finally:
        agenda.scheduler = None

    assert {"resumo_manha", "reuniao_15min", "cards_novos_servico", "limpar_notificacoes"} <= ids
    assert not ids & {"check_overdue_cards", "check_overdue_tasks", "check_pending_transfers",
                      "report_failed_automations", "cleanup_notifications"}
