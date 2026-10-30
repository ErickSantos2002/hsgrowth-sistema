"""
Endpoints do Programa de Parceiros (seção Parcerias).

Board 1 — Aquisição de Parceiros: /parceiros
Board 2 — Pipeline de Parceiros: /oportunidades
O router inteiro passa por require_parcerias_access (admin, gerente, Financeiro
e parceiro); quem vê o quê fica em app/services/parcerias/acesso.py.
"""
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.models.user import User
from app.schemas.parcerias import (
    AcessoCreate,
    AcessoResponse,
    AcessoUpdate,
    EtapaOut,
    EtapasResponse,
    MembroCreate,
    MembroResponse,
    MembroUpdate,
    MoverRequest,
    ParceiroCreate,
    ParceiroResponse,
    ParceiroUpdate,
)
from app.services.parcerias import acesso, parceiros, respostas
from app.services.parcerias.etapas import ETAPAS_AQUISICAO, ETAPAS_OPORTUNIDADE

router = APIRouter()


@router.get("/etapas", response_model=EtapasResponse, summary="Etapas dos dois boards")
def etapas_dos_boards():
    return EtapasResponse(
        aquisicao=[EtapaOut(codigo=e.codigo, nome=e.nome) for e in ETAPAS_AQUISICAO],
        oportunidades=[EtapaOut(codigo=e.codigo, nome=e.nome) for e in ETAPAS_OPORTUNIDADE],
    )


# ─── Board 1: Aquisição de Parceiros ─────────────────────────────────────────

@router.get("/parceiros", response_model=List[ParceiroResponse])
def listar_parceiros(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return [respostas.parceiro_out(db, p) for p in parceiros.listar(db, current_user)]


@router.post("/parceiros", response_model=ParceiroResponse, status_code=201)
def criar_parceiro(dados: ParceiroCreate, db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_active_user)):
    return respostas.parceiro_out(db, parceiros.criar(db, current_user, dados))


@router.get("/parceiros/{partner_id}", response_model=ParceiroResponse)
def buscar_parceiro(partner_id: int, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_active_user)):
    return respostas.parceiro_out(db, acesso.buscar_parceiro(db, current_user, partner_id))


@router.put("/parceiros/{partner_id}", response_model=ParceiroResponse)
def atualizar_parceiro(partner_id: int, dados: ParceiroUpdate, db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_active_user)):
    return respostas.parceiro_out(db, parceiros.atualizar(db, current_user, partner_id, dados))


@router.put("/parceiros/{partner_id}/mover", response_model=ParceiroResponse)
def mover_parceiro(partner_id: int, req: MoverRequest, db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_active_user)):
    return respostas.parceiro_out(db, parceiros.mover(db, current_user, partner_id, req))


@router.get("/parceiros/{partner_id}/equipe", response_model=List[MembroResponse])
def listar_equipe(partner_id: int, db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_active_user)):
    return parceiros.listar_equipe(db, current_user, partner_id)


@router.post("/parceiros/{partner_id}/equipe", response_model=MembroResponse, status_code=201)
def criar_membro(partner_id: int, dados: MembroCreate, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_active_user)):
    return parceiros.criar_membro(db, current_user, partner_id, dados)


@router.put("/parceiros/{partner_id}/equipe/{membro_id}", response_model=MembroResponse)
def atualizar_membro(partner_id: int, membro_id: int, dados: MembroUpdate, db: Session = Depends(get_db),
                     current_user: User = Depends(get_current_active_user)):
    return parceiros.atualizar_membro(db, current_user, partner_id, membro_id, dados)


@router.get("/parceiros/{partner_id}/acessos", response_model=List[AcessoResponse])
def listar_acessos(partner_id: int, db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_active_user)):
    return parceiros.listar_acessos(db, current_user, partner_id)


@router.post("/parceiros/{partner_id}/acessos", response_model=AcessoResponse, status_code=201)
def criar_acesso(partner_id: int, dados: AcessoCreate, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_active_user)):
    return parceiros.criar_acesso(db, current_user, partner_id, dados)


@router.put("/parceiros/{partner_id}/acessos/{user_id}", response_model=AcessoResponse)
def alterar_acesso(partner_id: int, user_id: int, dados: AcessoUpdate, db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_active_user)):
    return parceiros.alterar_acesso(db, current_user, partner_id, user_id, dados.is_active)
