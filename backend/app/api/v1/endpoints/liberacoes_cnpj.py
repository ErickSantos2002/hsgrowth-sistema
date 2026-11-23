"""
Pedidos de liberação de CNPJ em Vendas (1.11.32).

Vendedor e SDR pedem; admin e gerente liberam ou recusam. As regras ficam em
app/services/parcerias/liberacoes.py.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.models.cnpj_release_request import CnpjReleaseRequest
from app.models.user import User
from app.schemas.liberacoes_cnpj import (
    LiberacaoCnpjContagem, LiberacaoCnpjCreate, LiberacaoCnpjDecisao, LiberacaoCnpjPagina,
    LiberacaoCnpjResponse,
)
from app.services.parcerias import liberacoes

router = APIRouter()

PERFIS = ("admin", "manager", "salesperson", "sdr")


def _usuario_de_vendas(current_user: User = Depends(get_current_active_user)) -> User:
    if not current_user.role or current_user.role.name not in PERFIS:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Sem acesso aos pedidos de liberação de CNPJ.")
    return current_user


def _saida(p: CnpjReleaseRequest) -> LiberacaoCnpjResponse:
    return LiberacaoCnpjResponse(
        id=p.id, kind=p.kind, status=p.status, client_id=p.client_id,
        empresa=liberacoes.nome_da_empresa(p), cnpj=p.cnpj, card_id=p.card_id,
        titulo_do_card=liberacoes.titulo_do_card(p), reason=p.reason, blocked_with=p.blocked_with,
        requested_by_id=p.requested_by_id, solicitante=p.requested_by.name if p.requested_by else None,
        decided_by_id=p.decided_by_id, decisor=p.decided_by.name if p.decided_by else None,
        decided_at=p.decided_at, decision_note=p.decision_note, created_at=p.created_at,
    )


@router.post("", response_model=LiberacaoCnpjResponse, status_code=201)
def pedir(dados: LiberacaoCnpjCreate, db: Session = Depends(get_db),
          user: User = Depends(_usuario_de_vendas)):
    return _saida(liberacoes.pedir(db, user, dados.kind, dados.client_id, dados.reason,
                                   payload=dados.payload, card_id=dados.card_id))


@router.get("", response_model=LiberacaoCnpjPagina)
def listar(situacao: Optional[str] = Query(None), pagina: int = Query(1, ge=1),
           db: Session = Depends(get_db), user: User = Depends(_usuario_de_vendas)):
    total, itens = liberacoes.listar(db, user, situacao, pagina)
    return LiberacaoCnpjPagina(total=total, itens=[_saida(p) for p in itens])


@router.get("/pendentes/contagem", response_model=LiberacaoCnpjContagem)
def contar(db: Session = Depends(get_db), user: User = Depends(_usuario_de_vendas)):
    return LiberacaoCnpjContagem(total=liberacoes.contar_pendentes(db, user))


@router.post("/{pedido_id}/liberar", response_model=LiberacaoCnpjResponse)
def liberar(pedido_id: int, dados: LiberacaoCnpjDecisao, db: Session = Depends(get_db),
            user: User = Depends(_usuario_de_vendas)):
    return _saida(liberacoes.liberar(db, user, pedido_id, dados.nota))


@router.post("/{pedido_id}/recusar", response_model=LiberacaoCnpjResponse)
def recusar(pedido_id: int, dados: LiberacaoCnpjDecisao, db: Session = Depends(get_db),
            user: User = Depends(_usuario_de_vendas)):
    return _saida(liberacoes.recusar(db, user, pedido_id, dados.nota))


@router.post("/{pedido_id}/cancelar", response_model=LiberacaoCnpjResponse)
def cancelar(pedido_id: int, db: Session = Depends(get_db), user: User = Depends(_usuario_de_vendas)):
    return _saida(liberacoes.cancelar(db, user, pedido_id))
