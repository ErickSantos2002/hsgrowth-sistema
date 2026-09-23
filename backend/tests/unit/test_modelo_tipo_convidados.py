"""
As duas colunas novas da reunião: o tipo e quem foi convidado.

Guardar os convidados é o que permite, meses depois, abrir o card e saber para
quem o convite foi. Sem isso, a única resposta seria "para quem estava no
cadastro naquele dia", que ninguém consegue reconstruir.
"""
from sqlalchemy.orm import Session

from app.models.card_task import CardTask


def test_guarda_o_tipo_e_os_convidados(db: Session, test_card, test_salesperson_user):
    task = CardTask(
        card_id=test_card.id,
        title="Apresentação Phoebus - ACME",
        task_type="meeting",
        assigned_to_id=test_salesperson_user.id,
        meeting_kind="apresentacao_phoebus",
        invited_emails=["vendedor@empresa.com", "cliente@acme.com"],
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    assert task.meeting_kind == "apresentacao_phoebus"
    assert task.invited_emails == ["vendedor@empresa.com", "cliente@acme.com"]


def test_reuniao_antiga_fica_sem_tipo_e_sem_convidados(
    db: Session, test_card, test_salesperson_user
):
    """As duas colunas são nulas: nenhuma reunião existente precisa ser tocada."""
    task = CardTask(
        card_id=test_card.id,
        title="Reunião de antes",
        task_type="meeting",
        assigned_to_id=test_salesperson_user.id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    assert task.meeting_kind is None
    assert task.invited_emails is None
