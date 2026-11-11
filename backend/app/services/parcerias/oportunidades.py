"""Board 2 — Pipeline de Parceiros: oportunidade, elegibilidade, produtos e catálogo."""
from datetime import datetime
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.partner import Partner, PartnerTeamMember
from app.models.partner_opportunity import PartnerOpportunity, PartnerOpportunityProduct
from app.models.product import Product
from app.models.user import User
from app.schemas.parcerias import (
    ElegibilidadeRequest,
    GanhoRequest,
    MoverRequest,
    OportunidadeCreate,
    OportunidadeUpdate,
    ProdutoItemCreate,
    ProdutoItemUpdate,
)
from app.services.parcerias import acesso, atividades, clientes, semaforo
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
# Campos do valor do negócio (fora os produtos), travados depois de encerrada.
CAMPOS_DE_VALOR = ("global_discount", "global_discount_type", "shipping")


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


def _sem_vendedor_no_hunter(membro_id: Optional[int]) -> None:
    """O hunter é o próprio vendedor: a oportunidade dele não tem vendedor da equipe."""
    if membro_id is not None:
        raise _422("O hunter é o próprio vendedor: a oportunidade não leva vendedor da equipe.")


def _conferir_valor_aberto(user: User, op: PartnerOpportunity) -> None:
    """Depois de Ganho ou Perdido, produtos e valores só a gestão corrige."""
    if op.stage in ("ganho", "perdido") and not acesso.eh_gestao(user):
        raise _422("Oportunidade encerrada: produtos e valores só a gestão altera.")


def _liberacao(user: User, s: semaforo.Situacao, justificativa: Optional[str]) -> Optional[str]:
    """No vermelho só a gestão passa, e com justificativa. Devolve o texto da justificativa."""
    if s.resultado != "vermelho":
        return None
    if not acesso.eh_gestao(user):
        raise _422(s.frase)
    texto = (justificativa or "").strip()
    if not texto:
        raise _422(f"{s.frase} Para cadastrar mesmo assim, escreva a justificativa.")
    return texto


def _gravar_semaforo(db: Session, user: User, op: PartnerOpportunity,
                     s: semaforo.Situacao, liberacao: Optional[str]) -> None:
    op.cnpj_resultado, op.cnpj_motivo = s.resultado, s.motivo
    op.cnpj_liberado_por_id = user.id if liberacao else None
    op.cnpj_justificativa = liberacao
    if liberacao:
        atividades.registrar_evento(
            db, user,
            f"Cadastro liberado pela gestão com o CNPJ em vermelho ({semaforo.MOTIVOS[s.motivo]}). "
            f"Justificativa: {liberacao}",
            opportunity_id=op.id,
        )


def listar(db: Session, user: User, partner_id: Optional[int] = None) -> List[PartnerOpportunity]:
    q = acesso.oportunidades_visiveis(db, user)
    if partner_id is not None:
        q = q.filter(PartnerOpportunity.partner_id == partner_id)
    return q.order_by(PartnerOpportunity.position, PartnerOpportunity.id.desc()).all()


def criar(db: Session, user: User, dados: OportunidadeCreate) -> PartnerOpportunity:
    acesso.exigir_escrita(user)
    if acesso.eh_parceiro(user):
        partner_id = acesso.parceiro_do_login(user)
        if acesso.eh_vendedor_do_parceiro(user):
            # Oportunidade do vendedor do parceiro nasce com ele como vendedor.
            dados = dados.model_copy(update={"seller_member_id": acesso.membro_do_login(db, user).id})
        elif acesso.eh_hunter(user):
            _sem_vendedor_no_hunter(dados.seller_member_id)
    else:
        if not dados.partner_id:
            raise _422("Escolha o parceiro da oportunidade.")
        partner_id = acesso.buscar_parceiro(db, user, dados.partner_id).id
    dono = db.query(Partner).filter(Partner.id == partner_id).first()
    if not dono or dono.is_deleted or dono.stage == "bloqueado":
        raise _422("Parceiro bloqueado não registra oportunidade.")
    _conferir_vendedor(db, partner_id, dados.seller_member_id)
    # Semáforo de novo no servidor (não conta no limite nem entra no histórico).
    s = semaforo.situacao(db, dados.cnpj)
    liberacao = _liberacao(user, s, dados.cnpj_justificativa)

    agora = datetime.utcnow()
    op = PartnerOpportunity(
        **dados.model_dump(exclude={"partner_id", "cnpj_justificativa"}),
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
    _gravar_semaforo(db, user, op, s, liberacao)
    clientes.vincular(db, user, op)
    db.commit()
    db.refresh(op)
    return op


def atualizar(db: Session, user: User, opportunity_id: int, dados: OportunidadeUpdate) -> PartnerOpportunity:
    acesso.exigir_escrita(user)
    op = acesso.buscar_oportunidade_para_escrever(db, user, opportunity_id)
    campos = dados.model_dump(exclude_unset=True)
    justificativa = campos.pop("cnpj_justificativa", None)
    if any(c in campos for c in CAMPOS_DE_VALOR):
        _conferir_valor_aberto(user, op)
    for campo in ("global_discount", "shipping"):
        if campo in campos and campos[campo] is None:
            campos[campo] = 0
    if "global_discount_type" in campos and campos["global_discount_type"] is None:
        campos.pop("global_discount_type")
    tipo = campos.get("global_discount_type", op.global_discount_type)
    desconto = campos.get("global_discount", op.global_discount) or 0
    if tipo == "percent" and desconto > 100:
        raise _422("O desconto geral não pode passar de 100%.")
    for campo, nome in OBRIGATORIOS.items():
        if campo in campos and campos[campo] is None:
            raise _422(f"{nome} é obrigatório.")
    if "seller_member_id" in campos and acesso.eh_vendedor_do_parceiro(user) \
            and campos["seller_member_id"] != op.seller_member_id:
        raise _422("Só o dono do parceiro ou a H&S trocam o vendedor da oportunidade.")
    if "seller_member_id" in campos and acesso.eh_hunter(user):
        _sem_vendedor_no_hunter(campos["seller_member_id"])
    if "seller_member_id" in campos:
        _conferir_vendedor(db, op.partner_id, campos["seller_member_id"])
    novo_cnpj = campos.get("cnpj")
    if novo_cnpj and novo_cnpj != op.cnpj and op.eligibility_status != "em_analise" and not acesso.eh_gestao(user):
        raise _422("O CNPJ não muda depois da validação da elegibilidade.")
    if novo_cnpj and novo_cnpj != op.cnpj:
        s = semaforo.situacao(db, novo_cnpj, ignorar_oportunidade_id=op.id)
        _gravar_semaforo(db, user, op, s, _liberacao(user, s, justificativa))
    alterados = {c for c, v in campos.items() if getattr(op, c) != v}
    for campo, valor in campos.items():
        setattr(op, campo, valor)
    # Oportunidade de antes da ligação (sem cliente) se liga na primeira edição.
    if op.client_id is None or alterados & set(clientes.CAMPOS_DA_LIGACAO):
        clientes.vincular(db, user, op, alterados)
    db.commit()
    db.refresh(op)
    return op


def mover(db: Session, user: User, opportunity_id: int, req: MoverRequest) -> PartnerOpportunity:
    acesso.exigir_escrita(user)
    op = acesso.buscar_oportunidade_para_escrever(db, user, opportunity_id)
    origem = op.stage
    if req.expected_close_date:
        op.expected_close_date = req.expected_close_date
    if req.modality:
        op.modality = req.modality
    # Reordenar dentro de Perdido não apaga o motivo já gravado.
    if req.stage == "perdido" and origem != "perdido":
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
        # Ganho novo (ou reaberto) volta a esperar a confirmação da H&S.
        op.won_confirmed_at = op.won_confirmed_by_id = None
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
    if req.position is not None:
        op.position = req.position
    db.commit()
    db.refresh(op)
    return op


def definir_elegibilidade(db: Session, user: User, opportunity_id: int,
                          req: ElegibilidadeRequest) -> PartnerOpportunity:
    if acesso.perfil(user) not in acesso.VALIDAM_ELEGIBILIDADE:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Só o Financeiro, admin ou gerente validam a elegibilidade.")
    # Vale em qualquer etapa, até depois do Ganho: a elegibilidade não trava o board.
    op = acesso.buscar_oportunidade(db, user, opportunity_id)
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
    db.commit()
    db.refresh(op)
    return op


def confirmar_ganho(db: Session, user: User, opportunity_id: int, req: GanhoRequest) -> PartnerOpportunity:
    """
    O parceiro marca Ganho; admin, gerente ou Financeiro confirmam. Negado, o
    card volta para Aguardando Pedido com o motivo no histórico.
    """
    if acesso.perfil(user) not in acesso.VALIDAM_ELEGIBILIDADE:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Só o Financeiro, admin ou gerente confirmam o ganho.")
    op = acesso.buscar_oportunidade(db, user, opportunity_id)
    if op.stage != "ganho":
        raise _422("Só oportunidade em Ganho tem o ganho confirmado ou negado.")
    if req.acao == "confirmar":
        op.won_confirmed_at = datetime.utcnow()
        op.won_confirmed_by_id = user.id
        atividades.registrar_evento(db, user, "Ganho confirmado", opportunity_id=op.id)
    else:
        motivo = (req.motivo or "").strip()
        if not motivo:
            raise _422("Explique por que o ganho foi negado.")
        op.stage = "aguardando_pedido"
        op.won_at = op.won_confirmed_at = op.won_confirmed_by_id = None
        atividades.registrar_evento(db, user, f"Ganho negado: {motivo}", opportunity_id=op.id,
                                    tipo="stage_change")
    db.commit()
    db.refresh(op)
    return op


# ─── Produtos ────────────────────────────────────────────────────────────────

def _liberados(db: Session):
    """Produtos que o Pipeline de Parceiros aceita: ativos e liberados para parceiros."""
    return db.query(Product).filter(
        Product.is_active.is_(True), Product.is_deleted.is_(False), Product.partner_enabled.is_(True)
    )


def _produto_do_catalogo(db: Session, product_id: int) -> Product:
    produto = _liberados(db).filter(Product.id == product_id).first()
    if not produto:
        raise _422("Produto não liberado para parceiros.")
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
    op = acesso.buscar_oportunidade_para_escrever(db, user, opportunity_id)
    _conferir_valor_aberto(user, op)
    produto = _produto_do_catalogo(db, dados.product_id)
    ja_tem = db.query(PartnerOpportunityProduct).filter(
        PartnerOpportunityProduct.opportunity_id == op.id, PartnerOpportunityProduct.product_id == produto.id
    ).first()
    if ja_tem:
        raise _422("Este produto já está na oportunidade. Mude a quantidade na linha dele.")
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
    op = acesso.buscar_oportunidade_para_escrever(db, user, opportunity_id)
    _conferir_valor_aberto(user, op)
    item = _buscar_item(db, op, item_id)
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        if valor is not None:
            setattr(item, campo, valor)
    if (item.discount or 0) > item.quantity * (item.unit_price or 0):
        db.rollback()
        raise _422("O desconto não pode ser maior que o valor da linha.")
    db.commit()
    db.refresh(item)
    return item


def remover_produto(db: Session, user: User, opportunity_id: int, item_id: int) -> None:
    acesso.exigir_escrita(user)
    op = acesso.buscar_oportunidade_para_escrever(db, user, opportunity_id)
    _conferir_valor_aberto(user, op)
    db.delete(_buscar_item(db, op, item_id))
    db.commit()


def catalogo(db: Session, busca: str = "", limite: int = 20) -> List[Product]:
    q = _liberados(db)
    termo = busca.strip()
    if termo:
        like = f"%{termo}%"
        q = q.filter(or_(Product.name.ilike(like), Product.sku.ilike(like)))
    return q.order_by(Product.name).limit(limite).all()
