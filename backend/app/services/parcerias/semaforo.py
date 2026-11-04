"""
Semáforo da Consulta de CNPJ (Parcerias, Entrega 2).

Cruza o CNPJ com os cards de Vendas (pelo cliente vinculado) e com as
oportunidades de todos os parceiros, seguindo a Aba 2 do documento:
negociação aberta e protegida (regras 1, 4 e 5), compra nos últimos 30 dias
(regra 2), perda nos últimos 90 dias (regra 6) e outra unidade da mesma
empresa (regra 8). Serviço não entra.
"""
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from typing import Iterable, List, Optional, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.board import Board
from app.models.card import Card
from app.models.card_list_history import CardListHistory
from app.models.card_note import CardNote
from app.models.card_task import CardTask
from app.models.client import Client
from app.models.list import List as Lista
from app.models.partner_activity import PartnerActivity
from app.models.partner_opportunity import PartnerOpportunity
from app.services.parcerias.etapas import ETAPAS_OPORTUNIDADE, nome_da_etapa

DIAS_PROTECAO = 10
DIAS_COMPRA_RECENTE = 30
DIAS_PERDA_RECENTE = 90

# Entre vermelhos, a mensagem segue esta ordem.
ORDEM_VERMELHOS = ("em_negociacao", "compra_recente", "perdida_recente")
MOTIVOS = {
    "livre": "Livre",
    "em_negociacao": "Em negociação",
    "compra_recente": "Compra recente",
    "perdida_recente": "Perdida há pouco",
    "outra_unidade": "Outra unidade",
}


def _naive(dt: datetime) -> datetime:
    """Anotações gravam com fuso; o resto do banco é UTC sem fuso."""
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def protegido(agora: datetime, prazos: Iterable[Optional[datetime]],
              movimentos: Iterable[Optional[datetime]]) -> bool:
    """
    Aberto e protegido: tem atividade em aberto que não está atrasada há mais
    de 10 dias (agendada para daqui a 2 meses protege) ou teve movimento nos
    últimos 10 dias. Atividade em aberto sem data não conta.
    """
    limite = agora - timedelta(days=DIAS_PROTECAO)
    if any(p is not None and _naive(p) >= limite for p in prazos):
        return True
    return any(m is not None and _naive(m) >= limite for m in movimentos)


def motivo_do_registro(agora: datetime, aberto: bool, protegido_: bool = False,
                       ganho_em: Optional[datetime] = None,
                       perdido_em: Optional[datetime] = None) -> Optional[Tuple[str, Optional[date]]]:
    """O que o registro bloqueia (motivo e data em que libera), ou None se não bloqueia."""
    if aberto:
        return ("em_negociacao", None) if protegido_ else None
    if ganho_em is not None:
        libera = _naive(ganho_em) + timedelta(days=DIAS_COMPRA_RECENTE)
        return ("compra_recente", libera.date()) if libera > agora else None
    if perdido_em is not None:
        libera = _naive(perdido_em) + timedelta(days=DIAS_PERDA_RECENTE)
        return ("perdida_recente", libera.date()) if libera > agora else None
    return None


@dataclass
class Registro:
    """Um card de Vendas ou uma oportunidade que bloqueia o CNPJ (ou a raiz)."""
    tipo: str  # card | oportunidade
    id: int
    titulo: str
    onde: str
    responsavel: Optional[str]
    cnpj: str
    motivo: str
    libera_em: Optional[date]
    parceiro_id: Optional[int]
    parceiro: Optional[str]
    desde: datetime


@dataclass
class Situacao:
    resultado: str  # verde | amarelo | vermelho
    motivo: str
    libera_em: Optional[date]
    frase: str
    registros: List[Registro] = field(default_factory=list)


def _frase(motivo: str, libera_em: Optional[date]) -> str:
    data = libera_em.strftime("%d/%m/%Y") if libera_em else ""
    return {
        "livre": "Pode cadastrar.",
        "em_negociacao": "Esta empresa já está em negociação.",
        "compra_recente": f"Cliente com compra recente. Disponível a partir de {data}.",
        "perdida_recente": f"Negociação encerrada há pouco. Disponível a partir de {data}.",
        "outra_unidade": "Outra unidade desta empresa está em negociação. O cadastro entra para análise da H&S.",
    }[motivo]


def juntar(cnpj: str, registros: List[Registro]) -> Situacao:
    """O pior caso vence: mesmo CNPJ = vermelho; só outra unidade = amarelo."""
    mesmos = [r for r in registros if r.cnpj == cnpj]
    if mesmos:
        motivo = min((r.motivo for r in mesmos), key=ORDEM_VERMELHOS.index)
        datas = [r.libera_em for r in mesmos if r.libera_em]
        libera = None if motivo == "em_negociacao" or not datas else max(datas)
        return Situacao("vermelho", motivo, libera, _frase(motivo, libera), registros)
    if registros:
        return Situacao("amarelo", "outra_unidade", None, _frase("outra_unidade", None), registros)
    return Situacao("verde", "livre", None, _frase("livre", None), [])


# ─── Consultas no banco ──────────────────────────────────────────────────────

def _cnpj_sql(col):
    """Documento sem máscara e em maiúsculas (CNPJ com letras), em SQL portável (Postgres e SQLite)."""
    expr = func.upper(col)
    for ch in (".", "/", "-", " "):
        expr = func.replace(expr, ch, "")
    return expr


def _cards(db: Session, raiz: str, agora: datetime) -> List[Registro]:
    doc = _cnpj_sql(Client.document)
    linhas = (
        db.query(Card, doc, Lista.name, Board.name)
        .join(Client, Card.client_id == Client.id)
        .join(Lista, Card.list_id == Lista.id)
        .join(Board, Lista.board_id == Board.id)
        .filter(
            Card.is_deleted.is_(False),
            Client.is_deleted.is_(False),
            func.length(doc) == 14,
            doc.like(f"{raiz}%"),
        )
        .all()
    )
    if not linhas:
        return []
    ids = [card.id for card, *_ in linhas]

    prazos, movimentos = {}, {}
    for t in db.query(CardTask).filter(CardTask.card_id.in_(ids)).all():
        if not t.is_completed and not t.is_cancelled:
            prazos.setdefault(t.card_id, []).append(t.due_date)
        movimentos.setdefault(t.card_id, []).extend([t.created_at, t.completed_at])
    for card_id, quando in (
        db.query(CardNote.card_id, func.max(CardNote.created_at))
        .filter(CardNote.card_id.in_(ids)).group_by(CardNote.card_id).all()
    ):
        movimentos.setdefault(card_id, []).append(quando)
    for card_id, quando in (
        db.query(CardListHistory.card_id, func.max(CardListHistory.entered_at))
        .filter(CardListHistory.card_id.in_(ids)).group_by(CardListHistory.card_id).all()
    ):
        movimentos.setdefault(card_id, []).append(quando)

    registros = []
    for card, documento, lista, board in linhas:
        aberto = card.is_won == 0
        resultado = motivo_do_registro(
            agora,
            aberto=aberto,
            protegido_=aberto and protegido(
                agora, prazos.get(card.id, []), movimentos.get(card.id, []) + [card.created_at]
            ),
            ganho_em=card.closed_at if card.is_won == 1 else None,
            perdido_em=card.closed_at if card.is_won == -1 else None,
        )
        if resultado:
            registros.append(Registro(
                tipo="card", id=card.id, titulo=card.title, onde=f"{board} · {lista}",
                responsavel=card.assigned_to.name if card.assigned_to else None,
                cnpj=documento, motivo=resultado[0], libera_em=resultado[1],
                parceiro_id=None, parceiro=None, desde=card.created_at,
            ))
    return registros


def _oportunidades(db: Session, raiz: str, agora: datetime,
                   ignorar: Optional[int] = None) -> List[Registro]:
    q = db.query(PartnerOpportunity).filter(
        PartnerOpportunity.is_deleted.is_(False),
        PartnerOpportunity.eligibility_status != "rejeitada",
        PartnerOpportunity.cnpj.like(f"{raiz}%"),
    )
    if ignorar is not None:
        q = q.filter(PartnerOpportunity.id != ignorar)
    ops = q.all()
    if not ops:
        return []

    prazos = {}
    for a in db.query(PartnerActivity).filter(
        PartnerActivity.opportunity_id.in_([o.id for o in ops]),
        PartnerActivity.category == "atividade",
        PartnerActivity.is_completed.is_(False),
    ).all():
        prazos.setdefault(a.opportunity_id, []).append(a.due_date)

    registros = []
    for o in ops:
        aberto = o.stage not in ("ganho", "perdido")
        resultado = motivo_do_registro(
            agora,
            aberto=aberto,
            protegido_=aberto and protegido(agora, prazos.get(o.id, []), [o.last_activity_at, o.created_at]),
            ganho_em=o.won_at if o.stage == "ganho" else None,
            perdido_em=o.lost_at if o.stage == "perdido" else None,
        )
        if resultado:
            nome = o.partner.name if o.partner else ""
            registros.append(Registro(
                tipo="oportunidade", id=o.id, titulo=o.title,
                onde=f"Parceiro {nome} · {nome_da_etapa(ETAPAS_OPORTUNIDADE, o.stage)}",
                responsavel=o.seller.name if o.seller else None,
                cnpj=o.cnpj, motivo=resultado[0], libera_em=resultado[1],
                parceiro_id=o.partner_id, parceiro=nome, desde=o.created_at,
            ))
    return registros


def situacao(db: Session, cnpj: str, ignorar_oportunidade_id: Optional[int] = None,
             agora: Optional[datetime] = None) -> Situacao:
    """A cor do CNPJ (14 dígitos) contra Vendas e todos os parceiros."""
    agora = agora or datetime.utcnow()
    raiz = cnpj[:8]
    registros = _cards(db, raiz, agora) + _oportunidades(db, raiz, agora, ignorar_oportunidade_id)
    return juntar(cnpj, registros)


def protecao_de_parceiro(db: Session, cnpj: str, agora: Optional[datetime] = None) -> List[Registro]:
    """
    Oportunidades de parceiro em negociação com exatamente este CNPJ (faixa e
    bloqueio em Vendas). Oportunidade ganha ou perdida não segura o vendedor.
    """
    agora = agora or datetime.utcnow()
    return [r for r in _oportunidades(db, cnpj[:8], agora)
            if r.cnpj == cnpj and r.motivo == "em_negociacao"]
