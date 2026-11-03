"""
Consulta de CNPJ (Parcerias, Entrega 2).

Router próprio porque o SDR consulta e não entra em Parcerias. Fica em
/parcerias/consulta-cnpj para o parceiro passar pela tranca. Quem entra:
require_consulta_cnpj (parceiro, vendedor, SDR, admin e gerente).
"""
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.models.user import User
from app.schemas.parcerias import (
    ConsultaCnpjRequest,
    ConsultaCnpjResponse,
    ConsultaHistoricoResponse,
    ConsultasHojeResponse,
)
from app.services.parcerias import consultas

router = APIRouter()


@router.post("", response_model=ConsultaCnpjResponse, summary="Consultar um CNPJ no semáforo")
def consultar(req: ConsultaCnpjRequest, db: Session = Depends(get_db),
              current_user: User = Depends(get_current_active_user)):
    return consultas.consultar(db, current_user, req.cnpj)


@router.get("/hoje", response_model=ConsultasHojeResponse, summary="Consultas feitas hoje e o limite")
def hoje(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return ConsultasHojeResponse(feitas=consultas.feitas_hoje(db, current_user), limite=consultas.limite_de(current_user))


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
