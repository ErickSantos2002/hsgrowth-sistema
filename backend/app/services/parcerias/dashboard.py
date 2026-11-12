"""
Painel de Parcerias (spec 2026-11-11, §5).

Venda = oportunidade não excluída, com ganho confirmado e `modality != "locacao"`.
Valor vendido = a mesma base da comissão (produtos − desconto geral, sem frete),
somada em Decimal. Período (`de`/`ate`) sobre `won_confirmed_at`, em dias de
São Paulo; a série mensal também agrupa pelo mês de São Paulo.
"""
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Dict, Iterable, List, Optional, Tuple

from dateutil.relativedelta import relativedelta
from fastapi import HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.partner import Partner, PartnerTeamMember
from app.models.partner_commission import PartnerCommission
from app.models.partner_opportunity import PartnerOpportunity
from app.models.user import User
from app.services.parcerias import acesso, comissoes, respostas

ZERO = Decimal("0.00")
DIAS_PARADA = 30
SEM_VENDEDOR = "Sem vendedor"


def _txt(valor) -> str:
    return f"{Decimal(valor or 0).quantize(comissoes.CENTAVO):.2f}"


def _filtro_venda(q):
    return q.filter(
        PartnerOpportunity.is_deleted.is_(False),
        PartnerOpportunity.won_confirmed_at.isnot(None),
        or_(PartnerOpportunity.modality.is_(None), PartnerOpportunity.modality != "locacao"),
    )


def _vendas(db: Session, partner_ids: Iterable[int], de: Optional[date], ate: Optional[date],
            seller_member_id: Optional[int] = None) -> List[Tuple[PartnerOpportunity, Decimal]]:
    """(oportunidade, valor) das vendas do período; os totais vêm numa consulta só."""
    ids = list(partner_ids)
    if not ids:
        return []
    q = _filtro_venda(db.query(PartnerOpportunity)).filter(PartnerOpportunity.partner_id.in_(ids))
    inicio, fim = comissoes._limites_utc(de, ate)
    if inicio is not None:
        q = q.filter(PartnerOpportunity.won_confirmed_at >= inicio)
    if fim is not None:
        q = q.filter(PartnerOpportunity.won_confirmed_at < fim)
    if seller_member_id is not None:
        q = q.filter(PartnerOpportunity.seller_member_id == seller_member_id)
    ops = q.all()
    totais = respostas.totais_de_produtos(db, [o.id for o in ops])
    return [(o, max(ZERO, respostas.produtos_menos_desconto(totais.get(o.id, ZERO), o))) for o in ops]


def _somar(vendas: List[Tuple[PartnerOpportunity, Decimal]]) -> Tuple[int, Decimal]:
    return len(vendas), sum((v for _, v in vendas), ZERO)


def vendas_de(db: Session, partner_ids: Iterable[int], de: Optional[date] = None,
              ate: Optional[date] = None, seller_member_id: Optional[int] = None) -> Tuple[int, Decimal]:
    """(quantidade, valor) das vendas dos parceiros no período."""
    return _somar(_vendas(db, partner_ids, de, ate, seller_member_id))


def _mes_local(momento: datetime) -> str:
    local = momento.replace(tzinfo=timezone.utc).astimezone(comissoes.FUSO)
    return f"{local.year:04d}-{local.month:02d}"


def _serie(vendas: List[Tuple[PartnerOpportunity, Decimal]]) -> List[dict]:
    meses: Dict[str, List] = {}
    for op, valor in vendas:
        m = meses.setdefault(_mes_local(op.won_confirmed_at), [0, ZERO])
        m[0] += 1
        m[1] += valor
    return [{"mes": mes, "quantidade": q, "valor": _txt(v)} for mes, (q, v) in sorted(meses.items())]


def serie_mensal(db: Session, partner_ids: Iterable[int], de: Optional[date] = None,
                 ate: Optional[date] = None, seller_member_id: Optional[int] = None) -> List[dict]:
    """Vendas por mês de São Paulo, em ordem; meses sem venda ficam de fora."""
    return _serie(_vendas(db, partner_ids, de, ate, seller_member_id))


def _bloco_vendas(vendas) -> dict:
    q, v = _somar(vendas)
    return {"quantidade": q, "valor": _txt(v)}


def _ultimas_datas(db: Session, partner_ids: List[int]) -> Tuple[Dict[int, datetime], Dict[int, datetime]]:
    """Última venda confirmada (sempre, sem período) e última oportunidade criada, por parceiro."""
    if not partner_ids:
        return {}, {}
    vendas = dict(_filtro_venda(db.query(PartnerOpportunity.partner_id, func.max(PartnerOpportunity.won_confirmed_at)))
                  .filter(PartnerOpportunity.partner_id.in_(partner_ids))
                  .group_by(PartnerOpportunity.partner_id).all())
    criadas = dict(db.query(PartnerOpportunity.partner_id, func.max(PartnerOpportunity.created_at))
                   .filter(PartnerOpportunity.partner_id.in_(partner_ids), PartnerOpportunity.is_deleted.is_(False))
                   .group_by(PartnerOpportunity.partner_id).all())
    return vendas, criadas


def _carteira(db: Session, indicados: List[Partner], de, ate, com_prazo: bool,
              agora: datetime) -> Tuple[List[dict], List[Tuple[PartnerOpportunity, Decimal]]]:
    """Um item por empresa indicada (um nível) e as vendas delas no período."""
    ids = [p.id for p in indicados]
    vendas = _vendas(db, ids, de, ate)
    por_parceiro: Dict[int, list] = {}
    for par in vendas:
        por_parceiro.setdefault(par[0].partner_id, []).append(par)
    ult_venda, ult_criada = _ultimas_datas(db, ids)
    meses = int(comissoes._config(db).indication_months or comissoes.MESES_PADRAO)
    itens = []
    for p in indicados:
        v, c = ult_venda.get(p.id), ult_criada.get(p.id)
        ultima = max((d for d in (v, c) if d is not None), default=None)
        dias = (agora - ultima).days if ultima is not None else None
        item = {
            "partner_id": p.id, "nome": p.name, "situacao": p.stage,
            **_bloco_vendas(por_parceiro.get(p.id, [])),
            "ultima_venda_em": v, "ultima_atividade_em": ultima,
            "dias_parada": dias, "parada": dias is not None and dias >= DIAS_PARADA,
        }
        if com_prazo:
            item["prazo_indicacao_ate"] = (p.first_sale_at + relativedelta(months=meses)
                                           if p.first_sale_at else None)
        itens.append(item)
    return itens, vendas


def _comissoes(db: Session, user: User, de, ate) -> dict:
    """"Vai ganhar" = pendente; "recebido" = paga; cancelada fica de fora."""
    q = comissoes._filtrar(comissoes._escopo(db, user, None), de, ate)
    linhas = q.filter(PartnerCommission.status.in_(("pendente", "paga"))).with_entities(
        PartnerCommission.kind, PartnerCommission.status, func.sum(PartnerCommission.amount),
    ).group_by(PartnerCommission.kind, PartnerCommission.status).all()
    pend = pago = ZERO
    por_tipo: Dict[str, Dict[str, str]] = {}
    for kind, st, soma in linhas:
        soma = Decimal(str(soma or 0))
        t = por_tipo.setdefault(kind, {"pendente": ZERO, "pago": ZERO})
        if st == "pendente":
            pend += soma
            t["pendente"] += soma
        else:
            pago += soma
            t["pago"] += soma
    return {"pendente": _txt(pend), "pago": _txt(pago),
            "por_tipo": {k: {"pendente": _txt(v["pendente"]), "pago": _txt(v["pago"])}
                         for k, v in sorted(por_tipo.items())}}


def _indicados(db: Session, partner_id: int) -> List[Partner]:
    ids = acesso._indicados_diretos(db, partner_id)
    if not ids:
        return []
    return [p for p in db.query(Partner).filter(Partner.id.in_(ids)).order_by(Partner.name).all()
            if p.id != partner_id]


def painel_vendedor(db: Session, user: User, de, ate) -> dict:
    membro = acesso.membro_do_login(db, user)
    vendas = _vendas(db, [membro.partner_id], de, ate, seller_member_id=membro.id)
    return {"visao": "vendedor", "vendas": _bloco_vendas(vendas), "serie": _serie(vendas)}


def painel_empresa(db: Session, user: User, de, ate, agora: Optional[datetime] = None) -> dict:
    agora = agora or datetime.utcnow()
    proprio = acesso.parceiro_do_login(user)
    vendas = _vendas(db, [proprio], de, ate)
    membros = db.query(PartnerTeamMember).filter(PartnerTeamMember.partner_id == proprio).order_by(
        PartnerTeamMember.name).all()
    por: Dict[Optional[int], list] = {}
    for par in vendas:
        por.setdefault(par[0].seller_member_id, []).append(par)
    por_vendedor = []
    for m in membros:
        if m.is_active or m.id in por:
            por_vendedor.append({"membro_id": m.id, "nome": m.name, **_bloco_vendas(por.get(m.id, []))})
    conhecidos = {m.id for m in membros}
    sobra = [p for k, v in por.items() if k not in conhecidos for p in v]
    if sobra:
        por_vendedor.append({"membro_id": None, "nome": SEM_VENDEDOR, **_bloco_vendas(sobra)})
    unidades, _ = _carteira(db, _indicados(db, proprio), de, ate, False, agora)
    return {"visao": "empresa", "vendas": _bloco_vendas(vendas), "serie": _serie(vendas),
            "por_vendedor": por_vendedor, "unidades": unidades, "comissoes": _comissoes(db, user, de, ate)}


def painel_hunter(db: Session, user: User, de, ate, agora: Optional[datetime] = None) -> dict:
    agora = agora or datetime.utcnow()
    proprio = acesso.parceiro_do_login(user)
    proprias = _vendas(db, [proprio], de, ate)
    carteira, da_carteira = _carteira(db, _indicados(db, proprio), de, ate, True, agora)
    return {"visao": "hunter", "vendas": _bloco_vendas(proprias), "serie": _serie(proprias + da_carteira),
            "carteira": carteira, "comissoes": _comissoes(db, user, de, ate)}


def painel(db: Session, user: User, de: Optional[date] = None, ate: Optional[date] = None) -> dict:
    perfil = acesso.perfil(user)
    if perfil == acesso.PARCEIRO_VENDEDOR:
        return painel_vendedor(db, user, de, ate)
    if perfil == acesso.PARCEIRO_DONO:
        return painel_empresa(db, user, de, ate)
    if perfil == acesso.HUNTER:
        return painel_hunter(db, user, de, ate)
    raise HTTPException(status.HTTP_403_FORBIDDEN, "Você não tem acesso ao painel.")
