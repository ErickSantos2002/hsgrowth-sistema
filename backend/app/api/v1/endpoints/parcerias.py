"""
Endpoints do Programa de Parceiros (seção Parcerias).

Board 1 — Aquisição de Parceiros: /parceiros
Board 2 — Pipeline de Parceiros: /oportunidades
O router inteiro passa por require_parcerias_access (admin, gerente, Financeiro
e parceiro); quem vê o quê fica em app/services/parcerias/acesso.py.
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.models.user import User
from app.schemas.parcerias import (
    AcessoCreate,
    AcessoResponse,
    AcessoUpdate,
    ElegibilidadeRequest,
    EtapaOut,
    EtapasResponse,
    MembroCreate,
    MembroResponse,
    MembroUpdate,
    MoverRequest,
    OportunidadeCreate,
    OportunidadeResponse,
    OportunidadeUpdate,
    ParceiroCreate,
    ParceiroResponse,
    ParceiroUpdate,
    ProdutoCatalogo,
    ProdutoItemCreate,
    ProdutoItemResponse,
    ProdutoItemUpdate,
)
from app.services.parcerias import acesso, oportunidades, parceiros, respostas
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


# ─── Board 2: Pipeline de Parceiros ──────────────────────────────────────────

def _uma(db: Session, op) -> OportunidadeResponse:
    return respostas.oportunidade_out(op, respostas.valores_por_oportunidade(db, [op.id]).get(op.id, 0))


@router.get("/oportunidades", response_model=List[OportunidadeResponse])
def listar_oportunidades(partner_id: Optional[int] = None, db: Session = Depends(get_db),
                         current_user: User = Depends(get_current_active_user)):
    return respostas.oportunidades_out(db, oportunidades.listar(db, current_user, partner_id))


@router.post("/oportunidades", response_model=OportunidadeResponse, status_code=201)
def criar_oportunidade(dados: OportunidadeCreate, db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_active_user)):
    return _uma(db, oportunidades.criar(db, current_user, dados))


@router.get("/oportunidades/{opportunity_id}", response_model=OportunidadeResponse)
def buscar_oportunidade(opportunity_id: int, db: Session = Depends(get_db),
                        current_user: User = Depends(get_current_active_user)):
    return _uma(db, acesso.buscar_oportunidade(db, current_user, opportunity_id))


@router.put("/oportunidades/{opportunity_id}", response_model=OportunidadeResponse)
def atualizar_oportunidade(opportunity_id: int, dados: OportunidadeUpdate, db: Session = Depends(get_db),
                           current_user: User = Depends(get_current_active_user)):
    return _uma(db, oportunidades.atualizar(db, current_user, opportunity_id, dados))


@router.put("/oportunidades/{opportunity_id}/mover", response_model=OportunidadeResponse)
def mover_oportunidade(opportunity_id: int, req: MoverRequest, db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_active_user)):
    return _uma(db, oportunidades.mover(db, current_user, opportunity_id, req))


@router.put("/oportunidades/{opportunity_id}/elegibilidade", response_model=OportunidadeResponse)
def definir_elegibilidade(opportunity_id: int, req: ElegibilidadeRequest, db: Session = Depends(get_db),
                          current_user: User = Depends(get_current_active_user)):
    return _uma(db, oportunidades.definir_elegibilidade(db, current_user, opportunity_id, req))


@router.get("/oportunidades/{opportunity_id}/produtos", response_model=List[ProdutoItemResponse])
def listar_produtos(opportunity_id: int, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_active_user)):
    return [respostas.item_out(i) for i in oportunidades.listar_produtos(db, current_user, opportunity_id)]


@router.post("/oportunidades/{opportunity_id}/produtos", response_model=ProdutoItemResponse, status_code=201)
def adicionar_produto(opportunity_id: int, dados: ProdutoItemCreate, db: Session = Depends(get_db),
                      current_user: User = Depends(get_current_active_user)):
    return respostas.item_out(oportunidades.adicionar_produto(db, current_user, opportunity_id, dados))


@router.put("/oportunidades/{opportunity_id}/produtos/{item_id}", response_model=ProdutoItemResponse)
def atualizar_produto(opportunity_id: int, item_id: int, dados: ProdutoItemUpdate,
                      db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return respostas.item_out(oportunidades.atualizar_produto(db, current_user, opportunity_id, item_id, dados))


@router.delete("/oportunidades/{opportunity_id}/produtos/{item_id}")
def remover_produto(opportunity_id: int, item_id: int, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_active_user)):
    oportunidades.remover_produto(db, current_user, opportunity_id, item_id)
    return {"ok": True}


@router.get("/produtos", response_model=List[ProdutoCatalogo], summary="Catálogo resumido para o parceiro")
def catalogo(busca: str = Query("", max_length=100), db: Session = Depends(get_db)):
    return [
        ProdutoCatalogo(id=p.id, name=p.name, sku=p.sku, unit_price=float(p.unit_price or 0))
        for p in oportunidades.catalogo(db, busca)
    ]
