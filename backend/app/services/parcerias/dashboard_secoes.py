"""
Seções do Dashboard de Parcerias no padrão dos outros dashboards (spec 2026-11-16):
visão geral, pipeline por etapa, conversão e atenção/riscos.

Cada função recebe o escopo de oportunidades do perfil e só conta o que está nele.
Valor = produtos − desconto geral, sem frete (a mesma base do "valor vendido").
"""
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from typing import Dict, List, Optional, Sequence, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.partner import Partner
from app.models.partner_opportunity import PartnerOpportunity
from app.services.notificacoes import parcerias as alertas
from app.services.parcerias import comissoes, regras_cnpj, respostas
from app.services.parcerias.etapas import ETAPAS_OPORTUNIDADE
from app.services.parcerias.semaforo import _naive, data_de_queda

ZERO = Decimal("0.00")
FECHADAS = ("ganho", "perdido")
ETAPAS_ABERTAS = tuple(e for e in ETAPAS_OPORTUNIDADE if e.codigo not in FECHADAS)


@dataclass(frozen=True)
class Escopo:
    """Quais oportunidades o perfil vê: as dos parceiros e, se houver, só as do membro."""
    partner_ids: Tuple[int, ...]
    seller_member_id: Optional[int] = None

    def filtrar(self, q):
        q = q.filter(PartnerOpportunity.is_deleted.is_(False),
                     PartnerOpportunity.partner_id.in_(self.partner_ids or (-1,)))
        if self.seller_member_id is not None:
            q = q.filter(PartnerOpportunity.seller_member_id == self.seller_member_id)
        return q


def _txt(valor) -> str:
    return f"{Decimal(valor or 0).quantize(comissoes.CENTAVO):.2f}"


def _no_periodo(q, coluna, de: Optional[date], ate: Optional[date]):
    """Dias de calendário de São Paulo, inclusivos (a mesma regra das vendas)."""
    inicio, fim = comissoes._limites_utc(de, ate)
    if inicio is not None:
        q = q.filter(coluna >= inicio)
    if fim is not None:
        q = q.filter(coluna < fim)
    return q


def abertas(db: Session, escopo: Escopo) -> List[PartnerOpportunity]:
    """Em negociação agora: etapa aberta e elegibilidade não rejeitada."""
    return escopo.filtrar(db.query(PartnerOpportunity)).filter(
        PartnerOpportunity.stage.notin_(FECHADAS),
        PartnerOpportunity.eligibility_status != "rejeitada",
    ).all()


def _valores(db: Session, ops: Sequence[PartnerOpportunity]) -> Dict[int, Decimal]:
    totais = respostas.totais_de_produtos(db, [o.id for o in ops])
    return {o.id: max(ZERO, respostas.produtos_menos_desconto(totais.get(o.id, ZERO), o)) for o in ops}


def resumo_e_pipeline(db: Session, escopo: Escopo, de: Optional[date],
                      ate: Optional[date]) -> Tuple[dict, List[dict]]:
    """(resumo, pipeline): novas no período, em negociação agora e as 5 etapas abertas."""
    ops = abertas(db, escopo)
    valores = _valores(db, ops)
    por_etapa = {e.codigo: [0, ZERO] for e in ETAPAS_ABERTAS}
    for o in ops:
        conta = por_etapa.get(o.stage)
        if conta is not None:
            conta[0] += 1
            conta[1] += valores[o.id]
    novas = _no_periodo(escopo.filtrar(db.query(func.count(PartnerOpportunity.id))),
                        PartnerOpportunity.created_at, de, ate).scalar() or 0
    resumo = {"novas": novas,
              "em_negociacao": {"quantidade": len(ops), "valor": _txt(sum(valores.values(), ZERO))}}
    pipeline = [{"etapa": e.codigo, "nome": e.nome, "quantidade": por_etapa[e.codigo][0],
                 "valor": _txt(por_etapa[e.codigo][1])} for e in ETAPAS_ABERTAS]
    return resumo, pipeline


def _taxa(parte: int, todo: int) -> Optional[float]:
    return round(100 * parte / todo, 1) if todo else None


def conversao(db: Session, escopo: Escopo, de: Optional[date], ate: Optional[date]) -> dict:
    """
    Taxas sem histórico de etapas (a mudança de etapa só fica gravada como texto):
    fechamento = ganhos ÷ (ganhos + perdidos); elegibilidade = validadas ÷ (validadas +
    rejeitadas); tempo médio do cadastro até o ganho confirmado. Tudo no período.
    """
    base = escopo.filtrar(db.query(PartnerOpportunity))
    ganhas = _no_periodo(base.filter(PartnerOpportunity.won_confirmed_at.isnot(None)),
                         PartnerOpportunity.won_confirmed_at, de, ate).all()
    perdidos = _no_periodo(base.filter(PartnerOpportunity.stage == "perdido"),
                           PartnerOpportunity.lost_at, de, ate).count()

    def elegibilidade(situacao: str) -> int:
        return _no_periodo(base.filter(PartnerOpportunity.eligibility_status == situacao),
                           PartnerOpportunity.eligibility_at, de, ate).count()

    validadas, rejeitadas = elegibilidade("validada"), elegibilidade("rejeitada")
    dias = [(o.won_confirmed_at - o.created_at).total_seconds() / 86400
            for o in ganhas if o.created_at is not None]
    return {
        "ganhos": len(ganhas), "perdidos": perdidos,
        "taxa_fechamento": _taxa(len(ganhas), len(ganhas) + perdidos),
        "validadas": validadas, "rejeitadas": rejeitadas,
        "taxa_elegibilidade": _taxa(validadas, validadas + rejeitadas),
        "tempo_medio_ganho_dias": round(sum(dias) / len(dias), 1) if dias else None,
    }


# ─── Atenção · riscos ────────────────────────────────────────────────────────

MAX_ITENS_RISCO = 50


def _item(o: PartnerOpportunity, detalhe: str, quando: Optional[datetime]) -> dict:
    return {"id": o.id, "titulo": o.title, "empresa": o.company_name, "detalhe": detalhe,
            "quando": quando, "link": f"/parcerias/oportunidades/{o.id}"}


def _lista(pares: List[Tuple[datetime, dict]]) -> dict:
    """pares = [(ordem, item)] → {total, itens}, na ordem, até MAX_ITENS_RISCO itens."""
    itens = [i for _, i in sorted(pares, key=lambda par: (par[0], par[1]["id"]))]
    return {"total": len(itens), "itens": itens[:MAX_ITENS_RISCO]}


def _texto_queda(faltam: int) -> str:
    if faltam == 0:
        return "Perde a proteção hoje"
    return "Perde a proteção em 1 dia" if faltam == 1 else f"Perde a proteção em {faltam} dias"


def _texto_vencidas(n: int) -> str:
    return "1 atividade vencida" if n == 1 else f"{n} atividades vencidas"


def riscos(db: Session, escopo: Escopo, agora: datetime, da_hs: bool = False) -> dict:
    """
    Proteção do CNPJ caindo em até 3 dias (a mesma conta dos alertas) e atividades
    vencidas, para todos; ganho a confirmar, elegibilidade em análise e convites
    sem ativação, só para a H&S.
    """
    ops = abertas(db, escopo)
    prazos = alertas.prazos_em_aberto(db, [o.id for o in ops])
    dias = regras_cnpj.regras(db).protecao
    hoje = alertas.dia_local(agora)
    protecao, vencidas = [], []
    for o in ops:
        meus = prazos.get(o.id, [])
        bloqueado = o.partner is not None and o.partner.stage == "bloqueado"
        if dias > 0 and not bloqueado:
            cai = data_de_queda(meus, [o.last_activity_at, o.created_at], dias=dias)
            if cai is not None and cai >= agora:
                faltam = (alertas.dia_local(cai) - hoje).days
                if faltam <= alertas.AVISO_ANTES_DIAS:
                    protecao.append((cai, _item(o, _texto_queda(faltam), cai)))
        atrasadas = sorted(_naive(p) for p in meus if p is not None and _naive(p) < agora)
        if atrasadas:
            vencidas.append((atrasadas[0], _item(o, _texto_vencidas(len(atrasadas)), atrasadas[0])))
    saida = {"protecao": _lista(protecao), "atividades_vencidas": _lista(vencidas)}
    if da_hs:
        saida.update(_riscos_da_hs(db, escopo, agora))
    return saida


def _riscos_da_hs(db: Session, escopo: Escopo, agora: datetime) -> dict:
    base = escopo.filtrar(db.query(PartnerOpportunity))
    ganho = base.filter(PartnerOpportunity.stage == "ganho",
                        PartnerOpportunity.won_confirmed_at.is_(None)).all()
    analise = base.filter(PartnerOpportunity.eligibility_status == "em_analise",
                          PartnerOpportunity.stage != "perdido").all()
    return {
        "ganho_a_confirmar": _lista([(o.won_at or o.created_at,
                                      _item(o, "Ganho marcado, falta confirmar", o.won_at)) for o in ganho]),
        "elegibilidade_em_analise": _lista([(o.created_at, _item(o, "Aguardando a validação", o.created_at))
                                            for o in analise]),
        "convites": _lista(_convites(db, escopo.partner_ids, agora)),
    }


def _convites(db: Session, partner_ids: Sequence[int], agora: datetime) -> List[Tuple[datetime, dict]]:
    """Convidados há 23 dias ou mais sem aceitar os termos (a mesma conta dos alertas)."""
    hoje = alertas.dia_local(agora)
    pares = []
    for p in db.query(Partner).filter(Partner.is_deleted.is_(False), Partner.stage == "convidado",
                                      Partner.id.in_(tuple(partner_ids) or (-1,))).all():
        desde = alertas.convidado_desde(db, p)
        if desde is None:
            continue
        dias = (hoje - alertas.dia_local(desde)).days
        if dias >= alertas.DIA_AVISO_CONVITE:
            pares.append((desde, {"id": p.id, "titulo": p.name, "empresa": None,
                                  "detalhe": f"Convidado há {dias} dias", "quando": desde,
                                  "link": f"/parcerias/aquisicao/{p.id}"}))
    return pares
