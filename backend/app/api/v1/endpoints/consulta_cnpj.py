"""
Consulta de CNPJ (Parcerias, Entrega 2).

Router próprio porque o SDR consulta e não entra em Parcerias. Fica em
/parcerias/consulta-cnpj para o parceiro passar pela tranca. Quem entra:
require_consulta_cnpj (parceiro, vendedor, SDR, admin e gerente).
"""
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.models.user import User
from app.schemas.parcerias import (
    ConsultaCnpjRequest,
    ConsultaCnpjResponse,
    ConsultaHistoricoResponse,
    ConsultasHojeResponse,
    ConsultasResumoResponse,
    RegrasCnpjResponse,
    RegrasCnpjUpdate,
)
from app.services.parcerias import acesso, consultas, regras_cnpj

router = APIRouter()


@router.post("", response_model=ConsultaCnpjResponse, summary="Consultar um CNPJ no semáforo")
def consultar(req: ConsultaCnpjRequest, db: Session = Depends(get_db),
              current_user: User = Depends(get_current_active_user)):
    return consultas.consultar(db, current_user, req.cnpj)


def _regras_resposta(db: Session) -> RegrasCnpjResponse:
    c = regras_cnpj.linha_ou_padrao(db)
    quem = db.query(User).filter(User.id == c.updated_by_id).first() if c.updated_by_id else None
    return RegrasCnpjResponse(
        protection_days=c.protection_days, recent_purchase_days=c.recent_purchase_days,
        recent_loss_days=c.recent_loss_days, daily_query_limit=c.daily_query_limit,
        block_between_sellers=bool(c.block_between_sellers), updated_at=c.updated_at,
        updated_by_name=quem.name if quem else None,
    )


@router.get("/regras", response_model=RegrasCnpjResponse, summary="Regras da consulta (prazos e limite)")
def ler_regras(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return _regras_resposta(db)


@router.put("/regras", response_model=RegrasCnpjResponse, summary="Alterar as regras (só admin)")
def salvar_regras(dados: RegrasCnpjUpdate, db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_active_user)):
    if acesso.perfil(current_user) != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Só o admin altera as regras da Consulta de CNPJ.")
    regras_cnpj.salvar(db, current_user, dados.model_dump(exclude_unset=True))
    return _regras_resposta(db)


@router.get("/hoje", response_model=ConsultasHojeResponse, summary="Consultas feitas hoje e o limite")
def hoje(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return ConsultasHojeResponse(feitas=consultas.feitas_hoje(db, current_user), limite=consultas.limite_de(db, current_user))


@router.get("/resumo", response_model=ConsultasResumoResponse, summary="KPIs da Consulta de CNPJ")
def resumo(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return consultas.resumo(db, current_user)


@router.get("/historico", response_model=ConsultaHistoricoResponse, summary="Histórico (admin e gerente)")
def historico(
    user_id: Optional[int] = None,
    partner_id: Optional[int] = None,
    desde: Optional[date] = None,
    ate: Optional[date] = None,
    pagina: int = Query(1, ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return consultas.historico(db, current_user, user_id, partner_id, desde, ate, pagina)
