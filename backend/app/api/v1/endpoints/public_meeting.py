"""
Endpoints públicos da reunião por vídeo — usados pelo convidado (cliente),
sem autenticação.

Esta é a única superfície do sistema acessível sem login, então:
- o token do link é opaco e aleatório (secrets.token_urlsafe, 32 bytes);
- a resposta de consulta não inclui chave, token, URL da sala nem dado
  interno do CRM — só o suficiente para o convidado se situar;
- a URL da sala só é devolvida depois que o convidado se identifica;
- reunião encerrada deixa de aceitar entrada.
"""
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.card_task import CardTask

router = APIRouter()


class GuestJoinRequest(BaseModel):
    """Dados que o convidado informa na tela de entrada."""

    name: str = Field(..., min_length=1, max_length=120, description="Nome de quem está entrando")
    company: Optional[str] = Field(None, max_length=200, description="Empresa")
    email: Optional[str] = Field(None, max_length=255, description="E-mail de contato")

    @field_validator("name")
    @classmethod
    def nome_nao_pode_ser_so_espaco(cls, v: str) -> str:
        limpo = (v or "").strip()
        if not limpo:
            raise ValueError("Informe seu nome para entrar na reunião.")
        return limpo


def _get_task_or_404(db: Session, token: str) -> CardTask:
    """
    Busca a reunião pelo token do link.

    Só reunião do Daily tem link público — uma reunião do Teams com token
    (caso improvável) não é acessível por aqui.
    """
    task = (
        db.query(CardTask)
        .filter(
            CardTask.public_access_token == token,
            CardTask.meeting_provider == "daily",
        )
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Reunião não encontrada ou link expirado.")
    return task


@router.get(
    "/meeting/{public_token}",
    summary="[Público] Informações da reunião",
    description="Dados mínimos para a tela de entrada do convidado. Não requer login.",
)
async def get_public_meeting(public_token: str, db: Session = Depends(get_db)) -> Any:
    task = _get_task_or_404(db, public_token)

    return {
        "title": task.title,
        "scheduled_at": task.due_date.isoformat() if task.due_date else None,
        "duration_minutes": task.duration_minutes,
        "already_started": task.meeting_started_at is not None,
        "already_ended": task.meeting_ended_at is not None,
    }


@router.post(
    "/meeting/{public_token}/join",
    summary="[Público] Entrar na reunião",
    description="""
    Valida o link, registra a entrada do convidado e devolve o acesso à sala.

    O convidado entra na sala de espera; quem libera é o anfitrião.
    """,
)
async def join_public_meeting(
    public_token: str,
    payload: GuestJoinRequest,
    db: Session = Depends(get_db),
) -> Any:
    from app.services.daily_service import DailyService

    task = _get_task_or_404(db, public_token)

    if task.meeting_ended_at:
        raise HTTPException(status_code=410, detail="Esta reunião já foi encerrada.")

    if not task.contact_joined_at:
        task.contact_joined_at = datetime.utcnow()
        db.commit()

    # O convidado entra SEM token do Daily, de propósito.
    #
    # Token vale como autorização: quem tem um entra direto, mesmo em sala com
    # enable_knocking. Sem token, o Daily apresenta a tela de "pedir para
    # entrar" e o anfitrião aprova — que é a sala de espera que queremos.
    #
    # Continua seguro: a sala é privada, só chega aqui quem tem o link, e
    # ninguém entra sem o anfitrião admitir.
    return {"room_url": task.daily_room_url, "user_name": payload.name}
