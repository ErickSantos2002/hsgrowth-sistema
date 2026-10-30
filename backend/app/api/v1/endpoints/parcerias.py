"""
Endpoints do Programa de Parceiros (seção Parcerias).

Board 1 — Aquisição de Parceiros: /parceiros
Board 2 — Pipeline de Parceiros: /oportunidades
O router inteiro passa por require_parcerias_access (admin, gerente, Financeiro
e parceiro); quem vê o quê fica em app/services/parcerias/acesso.py.
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.models.user import User
from app.schemas.parcerias import (
    AcessoCreate,
    AcessoResponse,
    AcessoUpdate,
    AtividadeCreate,
    AtividadeResponse,
    AtividadeUpdate,
    ConcluirRequest,
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
from app.services.parcerias import acesso, atividades, oportunidades, parceiros, respostas
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


# ─── Atividades (os dois boards, no padrão dos cards de Serviço) ─────────────

@router.get("/parceiros/{partner_id}/atividades", response_model=List[AtividadeResponse])
def atividades_do_parceiro(partner_id: int, db: Session = Depends(get_db),
                           current_user: User = Depends(get_current_active_user)):
    p = acesso.buscar_parceiro(db, current_user, partner_id)
    return [respostas.atividade_out(a) for a in atividades.listar(db, partner_id=p.id)]


@router.post("/parceiros/{partner_id}/atividades", response_model=AtividadeResponse, status_code=201)
def criar_atividade_do_parceiro(partner_id: int, dados: AtividadeCreate, db: Session = Depends(get_db),
                                current_user: User = Depends(get_current_active_user)):
    p = acesso.buscar_parceiro(db, current_user, partner_id)
    return respostas.atividade_out(atividades.criar(db, current_user, dados, partner_id=p.id))


@router.post("/parceiros/{partner_id}/atividades/arquivos", response_model=AtividadeResponse, status_code=201)
async def anexar_no_parceiro(partner_id: int, file: UploadFile = File(...), db: Session = Depends(get_db),
                             current_user: User = Depends(get_current_active_user)):
    p = acesso.buscar_parceiro(db, current_user, partner_id)
    return respostas.atividade_out(await atividades.anexar(db, current_user, file, partner_id=p.id))


@router.get("/oportunidades/{opportunity_id}/atividades", response_model=List[AtividadeResponse])
def atividades_da_oportunidade(opportunity_id: int, db: Session = Depends(get_db),
                               current_user: User = Depends(get_current_active_user)):
    op = acesso.buscar_oportunidade(db, current_user, opportunity_id)
    return [respostas.atividade_out(a) for a in atividades.listar(db, opportunity_id=op.id)]


@router.post("/oportunidades/{opportunity_id}/atividades", response_model=AtividadeResponse, status_code=201)
def criar_atividade_da_oportunidade(opportunity_id: int, dados: AtividadeCreate, db: Session = Depends(get_db),
                                    current_user: User = Depends(get_current_active_user)):
    op = acesso.buscar_oportunidade(db, current_user, opportunity_id)
    return respostas.atividade_out(atividades.criar(db, current_user, dados, oportunidade=op))


@router.post("/oportunidades/{opportunity_id}/atividades/arquivos", response_model=AtividadeResponse, status_code=201)
async def anexar_na_oportunidade(opportunity_id: int, file: UploadFile = File(...), db: Session = Depends(get_db),
                                 current_user: User = Depends(get_current_active_user)):
    op = acesso.buscar_oportunidade(db, current_user, opportunity_id)
    return respostas.atividade_out(await atividades.anexar(db, current_user, file, oportunidade=op))


@router.put("/atividades/{atividade_id}", response_model=AtividadeResponse)
def atualizar_atividade(atividade_id: int, dados: AtividadeUpdate, db: Session = Depends(get_db),
                        current_user: User = Depends(get_current_active_user)):
    return respostas.atividade_out(atividades.atualizar(db, current_user, atividade_id, dados))


@router.patch("/atividades/{atividade_id}/concluir", response_model=AtividadeResponse)
def concluir_atividade(atividade_id: int, req: ConcluirRequest, db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_active_user)):
    return respostas.atividade_out(atividades.concluir(db, current_user, atividade_id, req.is_completed, req.is_valid))


@router.delete("/atividades/{atividade_id}")
def excluir_atividade(atividade_id: int, db: Session = Depends(get_db),
                      current_user: User = Depends(get_current_active_user)):
    atividades.excluir(db, current_user, atividade_id)
    return {"ok": True}


@router.get("/atividades/{atividade_id}/arquivo")
def baixar_arquivo(atividade_id: int, db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_active_user)):
    caminho, nome, tipo = atividades.arquivo_para_baixar(db, current_user, atividade_id)
    return FileResponse(path=str(caminho), filename=nome, media_type=tipo)
