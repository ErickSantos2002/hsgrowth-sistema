"""
Endpoints do Programa de Parceiros (seção Parcerias).

Board 1 — Aquisição de Parceiros: /parceiros
Board 2 — Pipeline de Parceiros: /oportunidades
O router inteiro passa por require_parcerias_access (admin, gerente, Financeiro,
parceiro e vendedor); quem vê o quê fica em app/services/parcerias/acesso.py.
"""
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db, ip_do_cliente
from app.models.user import User
from app.schemas.parcerias import (
    APagarBeneficiario,
    CalibracaoCreate,
    CalibracaoResponse,
    ComissaoConfigResponse,
    ComissaoConfigUpdate,
    ComissaoResponse,
    ComissaoResumo,
    DashboardResponse,
    DashFiltros,
    PagarRequest,
    PagarResponse,
    AcessoCreate,
    AcessoCriadoResponse,
    AcessoMembroCreate,
    AcessoResponse,
    AcessoUpdate,
    AtividadeCreate,
    AtividadeResponse,
    AtividadeUpdate,
    ConcluirRequest,
    ElegibilidadeRequest,
    GanhoRequest,
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
    HunterCreate,
    HunterResponse,
    IndicacaoCreate,
    IndicacaoResponse,
    ProdutoCatalogo,
    ProdutoItemCreate,
    ProdutoItemResponse,
    ProdutoItemUpdate,
    TermosAceiteResponse,
    TermosCreate,
    TermosPendenteResponse,
    TermosResponse,
)
from app.schemas.acessos import ConviteRequest, ConviteResponse
from app.services import tokens_de_acesso
from app.services.parcerias import acesso, atividades, bloqueio, comissoes, dashboard, hunters, indicacoes, oportunidades, parceiros, respostas, termos
from app.services.parcerias.etapas import ETAPAS_AQUISICAO, ETAPAS_OPORTUNIDADE

router = APIRouter()


@router.get("/etapas", response_model=EtapasResponse, summary="Etapas dos dois boards")
def etapas_dos_boards():
    return EtapasResponse(
        aquisicao=[EtapaOut(codigo=e.codigo, nome=e.nome) for e in ETAPAS_AQUISICAO],
        oportunidades=[EtapaOut(codigo=e.codigo, nome=e.nome) for e in ETAPAS_OPORTUNIDADE],
    )


# ─── Termos do Programa ──────────────────────────────────────────────────────

@router.get("/termos/pendente", response_model=TermosPendenteResponse, response_model_exclude_none=True)
def termos_pendentes(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    t = termos.pendente(db, current_user)
    return TermosPendenteResponse(pendente=bool(t), version=t.version if t else None, text=t.text if t else None)


@router.post("/termos/aceitar", response_model=TermosAceiteResponse)
def aceitar_termos(request: Request, db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_active_user)):
    p = termos.aceitar(db, current_user, ip_do_cliente(request))
    return TermosAceiteResponse(stage=p.stage, terms_accepted_at=p.terms_accepted_at)


@router.get("/termos", response_model=List[TermosResponse])
def listar_termos(audience: str = Query("empresa", pattern="^(empresa|hunter)$"), db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_active_user)):
    return termos.listar(db, current_user, audience)


@router.post("/termos", response_model=TermosResponse, status_code=201)
def publicar_termos(dados: TermosCreate, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_active_user)):
    return termos.publicar(db, current_user, dados.audience, dados.text)


# ─── Board 1: Aquisição de Parceiros ─────────────────────────────────────────

@router.post("/indicacoes", response_model=IndicacaoResponse, status_code=201)
def indicar_empresa(dados: IndicacaoCreate, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_active_user)):
    r = indicacoes.indicar(db, current_user, dados)
    p = acesso.buscar_parceiro(db, current_user, r.user.partner_id)
    return IndicacaoResponse(parceiro=respostas.parceiro_out(db, p, current_user), email_enviado=r.email_enviado)


@router.get("/indicacoes", response_model=List[ParceiroResponse])
def listar_indicacoes(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return respostas.parceiros_out(db, indicacoes.listar(db, current_user), current_user)


@router.post("/hunters", response_model=ConviteResponse, status_code=201)
def cadastrar_hunter(dados: HunterCreate, db: Session = Depends(get_db),
                     current_user: User = Depends(get_current_active_user)):
    r = hunters.criar(db, current_user, dados)
    return ConviteResponse(**tokens_de_acesso.campos_do_acesso(db, r.user),
                           link=r.link, email_enviado=r.email_enviado)


@router.get("/hunters", response_model=List[HunterResponse])
def listar_hunters(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return hunters.listar(db, current_user)


@router.post("/hunters/{partner_id}/convite", response_model=ConviteResponse)
def convidar_hunter(partner_id: int, dados: ConviteRequest, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_active_user)):
    r = hunters.convidar(db, current_user, partner_id, dados.enviar)
    return ConviteResponse(**tokens_de_acesso.campos_do_acesso(db, r.user),
                           link=r.link, email_enviado=r.email_enviado)


@router.post("/parceiros/{partner_id}/bloquear", response_model=ParceiroResponse)
def bloquear_parceiro(partner_id: int, db: Session = Depends(get_db),
                      current_user: User = Depends(get_current_active_user)):
    return respostas.parceiro_out(db, bloqueio.bloquear(db, current_user, partner_id), current_user)


@router.post("/parceiros/{partner_id}/desbloquear", response_model=ParceiroResponse)
def desbloquear_parceiro(partner_id: int, db: Session = Depends(get_db),
                         current_user: User = Depends(get_current_active_user)):
    return respostas.parceiro_out(db, bloqueio.desbloquear(db, current_user, partner_id), current_user)


@router.get("/parceiros", response_model=List[ParceiroResponse])
def listar_parceiros(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return respostas.parceiros_out(db, parceiros.listar(db, current_user), current_user)


@router.post("/parceiros", response_model=ParceiroResponse, status_code=201)
def criar_parceiro(dados: ParceiroCreate, db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_active_user)):
    return respostas.parceiro_out(db, parceiros.criar(db, current_user, dados), current_user)


@router.get("/parceiros/{partner_id}", response_model=ParceiroResponse)
def buscar_parceiro(partner_id: int, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_active_user)):
    return respostas.parceiro_out(db, acesso.buscar_parceiro(db, current_user, partner_id), current_user)


@router.put("/parceiros/{partner_id}", response_model=ParceiroResponse)
def atualizar_parceiro(partner_id: int, dados: ParceiroUpdate, db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_active_user)):
    return respostas.parceiro_out(db, parceiros.atualizar(db, current_user, partner_id, dados), current_user)


@router.post("/parceiros/{partner_id}/contrato", response_model=ParceiroResponse)
async def anexar_contrato(partner_id: int, file: UploadFile = File(...), db: Session = Depends(get_db),
                          current_user: User = Depends(get_current_active_user)):
    return respostas.parceiro_out(db, await parceiros.anexar_contrato(db, current_user, partner_id, file), current_user)


@router.put("/parceiros/{partner_id}/mover", response_model=ParceiroResponse)
def mover_parceiro(partner_id: int, req: MoverRequest, db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_active_user)):
    return respostas.parceiro_out(db, parceiros.mover(db, current_user, partner_id, req), current_user)


@router.get("/parceiros/{partner_id}/equipe", response_model=List[MembroResponse])
def listar_equipe(partner_id: int, db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_active_user)):
    return [respostas.membro_out(db, m) for m in parceiros.listar_equipe(db, current_user, partner_id)]


@router.post("/parceiros/{partner_id}/equipe", response_model=MembroResponse, status_code=201)
def criar_membro(partner_id: int, dados: MembroCreate, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_active_user)):
    return respostas.membro_out(db, parceiros.criar_membro(db, current_user, partner_id, dados))


@router.put("/parceiros/{partner_id}/equipe/{membro_id}", response_model=MembroResponse)
def atualizar_membro(partner_id: int, membro_id: int, dados: MembroUpdate, db: Session = Depends(get_db),
                     current_user: User = Depends(get_current_active_user)):
    return respostas.membro_out(db, parceiros.atualizar_membro(db, current_user, partner_id, membro_id, dados))


@router.post("/parceiros/{partner_id}/equipe/{membro_id}/acesso", response_model=ConviteResponse, status_code=201)
def dar_acesso_ao_membro(partner_id: int, membro_id: int, dados: AcessoMembroCreate,
                         db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    r = parceiros.dar_acesso_ao_membro(db, current_user, partner_id, membro_id, dados)
    return ConviteResponse(**tokens_de_acesso.campos_do_acesso(db, r.user),
                           link=r.link, email_enviado=r.email_enviado)


@router.post("/parceiros/{partner_id}/equipe/{membro_id}/acesso/convite", response_model=ConviteResponse)
def convidar_membro(partner_id: int, membro_id: int, dados: ConviteRequest,
                    db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    r = parceiros.convidar_membro(db, current_user, partner_id, membro_id, dados.enviar)
    return ConviteResponse(**tokens_de_acesso.campos_do_acesso(db, r.user),
                           link=r.link, email_enviado=r.email_enviado)


@router.get("/parceiros/{partner_id}/acessos", response_model=List[AcessoResponse])
def listar_acessos(partner_id: int, db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_active_user)):
    return [respostas.acesso_out(db, u) for u in parceiros.listar_acessos(db, current_user, partner_id)]


@router.post("/parceiros/{partner_id}/acessos", response_model=AcessoCriadoResponse, status_code=201)
def criar_acesso(partner_id: int, dados: AcessoCreate, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_active_user)):
    r = parceiros.criar_acesso(db, current_user, partner_id, dados)
    return respostas.acesso_out(db, r.user, r.email_enviado)


@router.post("/parceiros/{partner_id}/acessos/{user_id}/convite", response_model=ConviteResponse)
def convidar_acesso(partner_id: int, user_id: int, dados: ConviteRequest, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_active_user)):
    r = parceiros.convidar_acesso(db, current_user, partner_id, user_id, dados.enviar)
    return ConviteResponse(**tokens_de_acesso.campos_do_acesso(db, r.user),
                           link=r.link, email_enviado=r.email_enviado)


@router.put("/parceiros/{partner_id}/acessos/{user_id}", response_model=AcessoResponse)
def alterar_acesso(partner_id: int, user_id: int, dados: AcessoUpdate, db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_active_user)):
    login = parceiros.alterar_acesso(db, current_user, partner_id, user_id, dados.is_active)
    return respostas.acesso_out(db, login)


# ─── Board 2: Pipeline de Parceiros ──────────────────────────────────────────

def _uma(db: Session, op, user: User) -> OportunidadeResponse:
    return respostas.oportunidade_out(op, respostas.valores_por_oportunidade(db, [op]).get(op.id, 0), user)


@router.get("/oportunidades", response_model=List[OportunidadeResponse])
def listar_oportunidades(partner_id: Optional[int] = None, db: Session = Depends(get_db),
                         current_user: User = Depends(get_current_active_user)):
    return respostas.oportunidades_out(db, oportunidades.listar(db, current_user, partner_id), current_user)


@router.post("/oportunidades", response_model=OportunidadeResponse, status_code=201)
def criar_oportunidade(dados: OportunidadeCreate, db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_active_user)):
    return _uma(db, oportunidades.criar(db, current_user, dados), current_user)


@router.get("/oportunidades/{opportunity_id}", response_model=OportunidadeResponse)
def buscar_oportunidade(opportunity_id: int, db: Session = Depends(get_db),
                        current_user: User = Depends(get_current_active_user)):
    return _uma(db, acesso.buscar_oportunidade(db, current_user, opportunity_id), current_user)


@router.put("/oportunidades/{opportunity_id}", response_model=OportunidadeResponse)
def atualizar_oportunidade(opportunity_id: int, dados: OportunidadeUpdate, db: Session = Depends(get_db),
                           current_user: User = Depends(get_current_active_user)):
    return _uma(db, oportunidades.atualizar(db, current_user, opportunity_id, dados), current_user)


@router.put("/oportunidades/{opportunity_id}/mover", response_model=OportunidadeResponse)
def mover_oportunidade(opportunity_id: int, req: MoverRequest, db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_active_user)):
    return _uma(db, oportunidades.mover(db, current_user, opportunity_id, req), current_user)


@router.put("/oportunidades/{opportunity_id}/ganho", response_model=OportunidadeResponse)
def confirmar_ganho(opportunity_id: int, req: GanhoRequest, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_active_user)):
    return _uma(db, oportunidades.confirmar_ganho(db, current_user, opportunity_id, req), current_user)


@router.put("/oportunidades/{opportunity_id}/elegibilidade", response_model=OportunidadeResponse)
def definir_elegibilidade(opportunity_id: int, req: ElegibilidadeRequest, db: Session = Depends(get_db),
                          current_user: User = Depends(get_current_active_user)):
    return _uma(db, oportunidades.definir_elegibilidade(db, current_user, opportunity_id, req), current_user)


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
    p = acesso.buscar_parceiro_proprio(db, current_user, partner_id)
    return [respostas.atividade_out(a, current_user) for a in atividades.listar(db, partner_id=p.id)]


@router.post("/parceiros/{partner_id}/atividades", response_model=AtividadeResponse, status_code=201)
def criar_atividade_do_parceiro(partner_id: int, dados: AtividadeCreate, db: Session = Depends(get_db),
                                current_user: User = Depends(get_current_active_user)):
    p = acesso.buscar_parceiro_proprio(db, current_user, partner_id)
    return respostas.atividade_out(atividades.criar(db, current_user, dados, partner_id=p.id))


@router.post("/parceiros/{partner_id}/atividades/arquivos", response_model=AtividadeResponse, status_code=201)
async def anexar_no_parceiro(partner_id: int, file: UploadFile = File(...), db: Session = Depends(get_db),
                             current_user: User = Depends(get_current_active_user)):
    p = acesso.buscar_parceiro_proprio(db, current_user, partner_id)
    return respostas.atividade_out(await atividades.anexar(db, current_user, file, partner_id=p.id))


@router.get("/oportunidades/{opportunity_id}/atividades", response_model=List[AtividadeResponse])
def atividades_da_oportunidade(opportunity_id: int, db: Session = Depends(get_db),
                               current_user: User = Depends(get_current_active_user)):
    op = atividades.buscar_oportunidade_das_atividades(db, current_user, opportunity_id)
    return [respostas.atividade_out(a, current_user) for a in atividades.listar(db, opportunity_id=op.id)]


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


# ─── Comissões ───────────────────────────────────────────────────────────────

@router.get("/comissoes/config", response_model=ComissaoConfigResponse)
def ler_config_comissoes(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    comissoes.exigir_ver_tudo(current_user)
    return comissoes.ler_config(db)


@router.put("/comissoes/config", response_model=ComissaoConfigResponse)
def salvar_config_comissoes(dados: ComissaoConfigUpdate, db: Session = Depends(get_db),
                            current_user: User = Depends(get_current_active_user)):
    return comissoes.salvar_config(db, current_user, dados)


@router.get("/comissoes", response_model=List[ComissaoResponse])
def listar_comissoes(status: Optional[str] = Query(None, pattern="^(pendente|paga|cancelada)$"),
                     beneficiario: Optional[int] = None, de: Optional[date] = None, ate: Optional[date] = None,
                     db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return comissoes.listar(db, current_user, status, beneficiario, de, ate)


@router.get("/comissoes/resumo", response_model=ComissaoResumo)
def resumo_comissoes(beneficiario: Optional[int] = None, de: Optional[date] = None, ate: Optional[date] = None,
                     db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return comissoes.resumo(db, current_user, None, beneficiario, de, ate)


@router.get("/comissoes/a-pagar", response_model=List[APagarBeneficiario])
def comissoes_a_pagar(de: Optional[date] = None, ate: Optional[date] = None, db: Session = Depends(get_db),
                      current_user: User = Depends(get_current_active_user)):
    return comissoes.a_pagar(db, current_user, de, ate)


@router.get("/comissoes/a-pagar.csv")
def comissoes_a_pagar_csv(de: Optional[date] = None, ate: Optional[date] = None, db: Session = Depends(get_db),
                          current_user: User = Depends(get_current_active_user)):
    conteudo = comissoes.a_pagar_csv(db, current_user, de, ate)
    return Response(content=conteudo.encode("utf-8"), media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": 'attachment; filename="comissoes-a-pagar.csv"'})


@router.post("/comissoes/pagar", response_model=PagarResponse)
def pagar_comissoes(dados: PagarRequest, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_active_user)):
    return comissoes.pagar(db, current_user, dados)


@router.get("/oportunidades/{opportunity_id}/calibracoes", response_model=List[CalibracaoResponse])
def listar_calibracoes(opportunity_id: int, db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_active_user)):
    return comissoes.listar_calibracoes(db, current_user, opportunity_id)


@router.post("/oportunidades/{opportunity_id}/calibracoes", response_model=CalibracaoResponse, status_code=201)
def lancar_calibracao(opportunity_id: int, dados: CalibracaoCreate, db: Session = Depends(get_db),
                      current_user: User = Depends(get_current_active_user)):
    return comissoes.lancar_calibracao(db, current_user, opportunity_id, dados)


# ─── Dashboard ───────────────────────────────────────────────────────────────

@router.get("/dashboard/filtros", response_model=DashFiltros)
def filtros_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if acesso.perfil(current_user) not in comissoes.VEEM_TUDO:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Você não tem acesso aos filtros do painel.")
    return dashboard.filtros(db)


@router.get("/dashboard", response_model=DashboardResponse)
def painel_dashboard(de: Optional[date] = None, ate: Optional[date] = None,
                     hunter_id: Optional[int] = None, partner_id: Optional[int] = None, db: Session = Depends(get_db),
                     current_user: User = Depends(get_current_active_user)):
    return dashboard.painel(db, current_user, de, ate, hunter_id, partner_id)
