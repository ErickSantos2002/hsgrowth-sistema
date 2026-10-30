"""Board 2 — Pipeline de Parceiros: oportunidade, elegibilidade, produtos e catálogo."""
from datetime import datetime
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.partner import PartnerTeamMember
from app.models.partner_opportunity import PartnerOpportunity, PartnerOpportunityProduct
from app.models.product import Product
from app.models.user import User
from app.schemas.parcerias import (
    ElegibilidadeRequest,
    MoverRequest,
    OportunidadeCreate,
    OportunidadeUpdate,
    ProdutoItemCreate,
    ProdutoItemUpdate,
)
from app.services.parcerias import acesso, ativacao, atividades
from app.services.parcerias.etapas import (
    ETAPAS_OPORTUNIDADE,
    TravaError,
    nome_da_etapa,
    validar_mudanca_oportunidade,
)

ELEGIBILIDADE = {"em_analise": "Em análise", "validada": "Validada", "rejeitada": "Rejeitada"}
# Campos que não podem ficar vazios na edição (a tela manda campo apagado como null).
OBRIGATORIOS = {
    "title": "Título", "deal_type": "Tipo de negócio", "sector": "Setor",
    "relationship_type": "Tipo de relacionamento", "context": "Contexto da indicação",
    "cnpj": "CNPJ", "company_name": "Razão social / nome",
}
# Etapas que contam como "proposta enviada" para a ativação do parceiro.
ETAPAS_COM_PROPOSTA = ("proposta", "negociacao", "aguardando_pedido")


def _422(mensagem: str) -> HTTPException:
    return HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, mensagem)


def _conferir_vendedor(db: Session, partner_id: int, membro_id: Optional[int]) -> None:
    if membro_id is None:
        return
    membro = db.query(PartnerTeamMember).filter(
        PartnerTeamMember.id == membro_id,
        PartnerTeamMember.partner_id == partner_id,
        PartnerTeamMember.is_active.is_(True),
    ).first()
    if not membro:
        raise _422("O vendedor escolhido não é da equipe deste parceiro.")


def listar(db: Session, user: User, partner_id: Optional[int] = None) -> List[PartnerOpportunity]:
    q = acesso.oportunidades_visiveis(db, user)
    if partner_id is not None:
        q = q.filter(PartnerOpportunity.partner_id == partner_id)
    return q.order_by(PartnerOpportunity.position, PartnerOpportunity.id.desc()).all()


def criar(db: Session, user: User, dados: OportunidadeCreate) -> PartnerOpportunity:
    acesso.exigir_escrita(user)
    if acesso.eh_parceiro(user):
        partner_id = acesso.parceiro_do_login(user)
    else:
        if not dados.partner_id:
            raise _422("Escolha o parceiro da oportunidade.")
        partner_id = acesso.buscar_parceiro(db, user, dados.partner_id).id
    _conferir_vendedor(db, partner_id, dados.seller_member_id)

    agora = datetime.utcnow()
    op = PartnerOpportunity(
        **dados.model_dump(exclude={"partner_id"}),
        partner_id=partner_id,
        stage="novo_lead",
        eligibility_status="em_analise",
        position=0,
        last_activity_at=agora,
        created_by_id=user.id,
    )
    db.add(op)
    db.flush()
    atividades.registrar_evento(db, user, "Oportunidade cadastrada", opportunity_id=op.id, tipo="card_created")
    db.commit()
    db.refresh(op)
    return op


def atualizar(db: Session, user: User, opportunity_id: int, dados: OportunidadeUpdate) -> PartnerOpportunity:
    acesso.exigir_escrita(user)
    op = acesso.buscar_oportunidade(db, user, opportunity_id)
    campos = dados.model_dump(exclude_unset=True)
    for campo, nome in OBRIGATORIOS.items():
        if campo in campos and campos[campo] is None:
            raise _422(f"{nome} é obrigatório.")
    if "seller_member_id" in campos:
        _conferir_vendedor(db, op.partner_id, campos["seller_member_id"])
    novo_cnpj = campos.get("cnpj")
    if novo_cnpj and novo_cnpj != op.cnpj and op.eligibility_status != "em_analise" and not acesso.eh_gestao(user):
        raise _422("O CNPJ não muda depois da validação da elegibilidade.")
    for campo, valor in campos.items():
        setattr(op, campo, valor)
    db.commit()
    db.refresh(op)
    return op


def mover(db: Session, user: User, opportunity_id: int, req: MoverRequest) -> PartnerOpportunity:
    acesso.exigir_escrita(user)
    op = acesso.buscar_oportunidade(db, user, opportunity_id)
    origem = op.stage
    if req.expected_close_date:
        op.expected_close_date = req.expected_close_date
    if req.modality:
        op.modality = req.modality
    if req.stage == "perdido":
        op.loss_reason = (req.loss_reason or "").strip() or None
        op.loss_detail = req.loss_detail
    try:
        validar_mudanca_oportunidade(op, req.stage, acesso.perfil(user))
    except TravaError as erro:
        db.rollback()
        raise _422(str(erro))

    if origem != req.stage:
        agora = datetime.utcnow()
        op.stage = req.stage
        op.won_at = agora if req.stage == "ganho" else None
        op.lost_at = agora if req.stage == "perdido" else None
        if origem == "perdido":
            op.loss_reason = op.loss_detail = None
        atividades.registrar_evento(
            db, user,
            f"Etapa: {nome_da_etapa(ETAPAS_OPORTUNIDADE, origem)} → {nome_da_etapa(ETAPAS_OPORTUNIDADE, req.stage)}",
            opportunity_id=op.id,
            tipo={"ganho": "card_won", "perdido": "card_lost"}.get(req.stage, "stage_change"),
        )
        atividades.tocar(op)
        if req.stage == "ganho":
            ativacao.registrar_evidencia(db, op, "primeira_venda", user)
        elif req.stage in ETAPAS_COM_PROPOSTA:
            ativacao.registrar_evidencia(db, op, "proposta_enviada", user)
    if req.position is not None:
        op.position = req.position
    db.commit()
    db.refresh(op)
    return op


def definir_elegibilidade(db: Session, user: User, opportunity_id: int,
                          req: ElegibilidadeRequest) -> PartnerOpportunity:
    if acesso.perfil(user) not in acesso.VALIDAM_ELEGIBILIDADE:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Só o Financeiro, admin ou gerente validam a elegibilidade.")
    op = acesso.buscar_oportunidade(db, user, opportunity_id)
    if op.stage != "novo_lead":
        raise _422("A elegibilidade só muda enquanto a oportunidade está em Novo Lead.")
    nota = (req.note or "").strip() or None
    if req.status == "rejeitada" and not nota:
        raise _422("Explique por que a oportunidade foi rejeitada.")

    op.eligibility_status = req.status
    op.eligibility_note = nota
    op.eligibility_by_id = user.id
    op.eligibility_at = datetime.utcnow()
    descricao = f"Elegibilidade: {ELEGIBILIDADE[req.status]}"
    if nota:
        descricao += f" — {nota}"
    atividades.registrar_evento(db, user, descricao, opportunity_id=op.id)
    if req.status == "validada":
        ativacao.registrar_evidencia(db, op, "oportunidade_validada", user)
    db.commit()
    db.refresh(op)
    return op


# ─── Produtos ────────────────────────────────────────────────────────────────

def _produto_do_catalogo(db: Session, product_id: int) -> Product:
    produto = db.query(Product).filter(
        Product.id == product_id, Product.is_active.is_(True), Product.is_deleted.is_(False)
    ).first()
    if not produto:
        raise _422("Produto não encontrado no catálogo.")
    return produto


def _buscar_item(db: Session, op: PartnerOpportunity, item_id: int) -> PartnerOpportunityProduct:
    item = db.query(PartnerOpportunityProduct).filter(
        PartnerOpportunityProduct.id == item_id, PartnerOpportunityProduct.opportunity_id == op.id
    ).first()
    if not item:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Produto não encontrado na oportunidade.")
    return item


def listar_produtos(db: Session, user: User, opportunity_id: int) -> List[PartnerOpportunityProduct]:
    op = acesso.buscar_oportunidade(db, user, opportunity_id)
    return db.query(PartnerOpportunityProduct).filter(
        PartnerOpportunityProduct.opportunity_id == op.id
    ).order_by(PartnerOpportunityProduct.id).all()


def adicionar_produto(db: Session, user: User, opportunity_id: int,
                      dados: ProdutoItemCreate) -> PartnerOpportunityProduct:
    acesso.exigir_escrita(user)
    op = acesso.buscar_oportunidade(db, user, opportunity_id)
    produto = _produto_do_catalogo(db, dados.product_id)
    item = PartnerOpportunityProduct(
        opportunity_id=op.id,
        product_id=produto.id,
        quantity=dados.quantity,
        unit_price=dados.unit_price if dados.unit_price is not None else produto.unit_price,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def atualizar_produto(db: Session, user: User, opportunity_id: int, item_id: int,
                      dados: ProdutoItemUpdate) -> PartnerOpportunityProduct:
    acesso.exigir_escrita(user)
    op = acesso.buscar_oportunidade(db, user, opportunity_id)
    item = _buscar_item(db, op, item_id)
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(item, campo, valor)
    db.commit()
    db.refresh(item)
    return item


def remover_produto(db: Session, user: User, opportunity_id: int, item_id: int) -> None:
    acesso.exigir_escrita(user)
    op = acesso.buscar_oportunidade(db, user, opportunity_id)
    db.delete(_buscar_item(db, op, item_id))
    db.commit()


def catalogo(db: Session, busca: str = "", limite: int = 20) -> List[Product]:
    q = db.query(Product).filter(Product.is_active.is_(True), Product.is_deleted.is_(False))
    termo = busca.strip()
    if termo:
        like = f"%{termo}%"
        q = q.filter(or_(Product.name.ilike(like), Product.sku.ilike(like)))
    return q.order_by(Product.name).limit(limite).all()
