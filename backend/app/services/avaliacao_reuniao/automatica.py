"""
Quando a avaliação pela régua roda sozinha.

Uma regra só para os dois fluxos:

    chegou transcrição  +  tipo avaliado  →  avalia

No CRM a transcrição chega sozinha ao fim de toda reunião — ela começa quando
alguém entra na sala, com ou sem gravação de vídeo. No Teams ela chega com o
clique em "Analisar Reunião", porque a transcrição pertence a quem organizou a
reunião — e a avaliação sai no mesmo clique.

Gravar não entra na conta: o tipo da reunião já diz que a conversa importa.
Até 13/10 a avaliação esperava a gravação, e 6 apresentações sem vídeo ficaram
sem nota. O que entra é ter havido conversa (`conversa.py`).

Duas regras, uma por tecnologia, ninguém decora; e duplicar a decisão em dois
lugares significaria que um dia elas divergiriam.
"""
from sqlalchemy.orm import Session

from app.models.card_task import CardTask


def avaliar_se_for_o_caso(db: Session, task: CardTask, transcricao: str) -> bool:
    """
    Avalia a reunião pela régua, se ela for do tipo que se avalia.

    Nunca levanta: quem chama está no meio de um processamento que já deu
    certo, e a transcrição e a análise não podem ser perdidas por causa disto.

    Returns:
        True se a avaliação foi gravada.
    """
    from app.core.config import settings
    from app.models.meeting_evaluation import MeetingEvaluation
    from app.services.reunioes.tipos import e_avaliado

    from app.services.avaliacao_reuniao.conversa import motivo_para_nao_avaliar

    if not e_avaliado(task.meeting_kind):
        return False

    motivo = motivo_para_nao_avaliar(transcricao)
    if motivo:
        print(f"[AVALIACAO] Reuniao {task.id} nao avaliada: {motivo}")
        return False

    if not settings.OPENAI_API_KEY:
        return False

    # Alguém já avaliou (reprocessamento, ou um clique que chegou antes):
    # não passa por cima de uma avaliação que outra pessoa pediu.
    if db.query(MeetingEvaluation).filter(MeetingEvaluation.card_task_id == task.id).first():
        return False

    try:
        from app.services.avaliacao_reuniao import servico
        from app.services.avaliacao_reuniao.gravar import gravar_avaliacao

        contexto = f"Negócio: {task.card.title}" if task.card else ""
        resultado = servico.avaliar(transcricao, contexto)
        gravar_avaliacao(db, task, resultado, avaliado_por_id=None)
        print(f"[AVALIACAO] Reuniao {task.id} avaliada automaticamente")
        return True
    except Exception as e:
        db.rollback()
        print(f"[AVALIACAO] Falhou na reuniao {task.id}: {e}")
        return False
