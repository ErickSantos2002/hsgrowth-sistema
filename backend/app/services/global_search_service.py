"""
Busca geral (Ctrl+K): encontra cards de Vendas e de Serviço/Cobrança.

Campos buscados:
- Vendas:  título, nome do cliente, CNPJ/CPF do cliente, nome do contato.
- Serviço: os mesmos + nº de série / nº do módulo dos aparelhos do card.

Nº de série/módulo vem dos aparelhos REAIS do card (ServiceCardProduct.aparelhos), que
acompanham o aparelho quando ele é movido entre cards. O registro da integração
(business_info.equipamentos) só vale para card sem nenhum produto.

CNPJ/CPF compara só os dígitos quando o termo tem 4+ dígitos, então
"19.235.340/0001-20" e "19235340000120" encontram o mesmo cliente.
"""
import re
from typing import Iterable, List, Optional, Set

from sqlalchemy import String, cast, func, or_
from sqlalchemy.orm import Session

from app.models.board import Board
from app.models.card import Card
from app.models.client import Client
from app.models.list import List as BoardList
from app.models.person import Person
from app.models.service_board import ServiceBoard
from app.models.service_card import ServiceCard
from app.models.service_card_product import ServiceCardProduct
from app.models.service_list import ServiceList
from app.models.user import User
from app.schemas.search import GlobalSearchResponse, SalesSearchResult, ServiceSearchResult

# Mesmos papéis que acessam o módulo de Serviços (ver require_service_access).
SERVICE_ROLES = ("admin", "manager", "service")
DEVICE_FIELDS = ("serial_number", "alcohol_module")
MIN_DOC_DIGITS = 4


def _digits(s: Optional[str]) -> str:
    return re.sub(r"\D", "", s or "")


def _doc_digits_sql(col):
    """Documento só com dígitos, em SQL portável (Postgres e SQLite)."""
    expr = col
    for ch in (".", "/", "-", " "):
        expr = func.replace(expr, ch, "")
    return expr


def _device_matches(aparelhos: Optional[Iterable], termo: str) -> bool:
    t = termo.lower()
    return any(
        isinstance(a, dict) and any(t in str(a.get(k) or "").lower() for k in DEVICE_FIELDS)
        for a in (aparelhos or [])
    )


class GlobalSearchService:
    def __init__(self, db: Session):
        self.db = db

    def search(self, q: str, user, limit: int = 8) -> GlobalSearchResponse:
        termo = (q or "").strip()
        if not termo:
            return GlobalSearchResponse()
        role = user.role.name if user and getattr(user, "role", None) else ""
        return GlobalSearchResponse(
            vendas=self.search_sales(termo, limit),
            servico=self.search_service(termo, limit) if role in SERVICE_ROLES else [],
        )

    # ─── Helpers ────────────────────────────────────────────────────────────────

    def _by_id(self, model, ids) -> dict:
        """{id: objeto} numa única consulta."""
        ids = [i for i in ids if i is not None]
        if not ids:
            return {}
        return {o.id: o for o in self.db.query(model).filter(model.id.in_(ids)).all()}

    @staticmethod
    def _contact_conditions(termo: str):
        """Condições por cliente (nome/CNPJ) e contato (nome). Requer outerjoin de Client e Person."""
        like = f"%{termo}%"
        conds = [Client.name.ilike(like), Client.document.ilike(like), Person.name.ilike(like)]
        dig = _digits(termo)
        if len(dig) >= MIN_DOC_DIGITS:
            conds.append(_doc_digits_sql(Client.document).like(f"%{dig}%"))
        return conds

    @staticmethod
    def _matched_on(termo: str, title: str, client, person, by_device: bool = False) -> Optional[str]:
        t = termo.lower()
        dig = _digits(termo)
        if by_device:
            return "Nº de série/módulo"
        doc = (client.document or "") if client else ""
        if doc and (t in doc.lower() or (len(dig) >= MIN_DOC_DIGITS and dig in _digits(doc))):
            return "CNPJ/CPF"
        if t in (title or "").lower():
            return "Título"
        if client and t in (client.name or "").lower():
            return "Cliente"
        if person and t in (person.name or "").lower():
            return "Contato"
        return None

    # ─── Vendas ─────────────────────────────────────────────────────────────────

    def search_sales(self, termo: str, limit: int) -> List[SalesSearchResult]:
        like = f"%{termo}%"
        rows = (
            self.db.query(Card, Client, Person)
            .outerjoin(Client, Card.client_id == Client.id)
            .outerjoin(Person, Card.person_id == Person.id)
            .filter(
                Card.is_deleted == False,  # noqa: E712
                or_(Card.title.ilike(like), *self._contact_conditions(termo)),
            )
            .order_by(Card.updated_at.desc())
            .limit(limit)
            .all()
        )
        # Carrega listas, boards e responsáveis de uma vez (evita 1 consulta por resultado).
        lists = self._by_id(BoardList, {c.list_id for c, _, _ in rows})
        boards = self._by_id(Board, {l.board_id for l in lists.values()})
        users = self._by_id(User, {c.assigned_to_id for c, _, _ in rows if c.assigned_to_id})
        out: List[SalesSearchResult] = []
        for card, client, person in rows:
            lst = lists.get(card.list_id)
            board = boards.get(lst.board_id) if lst else None
            assigned = users.get(card.assigned_to_id)
            out.append(SalesSearchResult(
                id=card.id,
                title=card.title,
                board_id=lst.board_id if lst else None,
                list_name=f"{board.name} / {lst.name}" if board and lst else (lst.name if lst else None),
                assigned_to_name=assigned.name if assigned else None,
                client_name=client.name if client else None,
                value=float(card.value) if card.value is not None else None,
                is_won=card.is_won == 1,
                is_lost=card.is_won == -1,
                matched_on=self._matched_on(termo, card.title, client, person),
            ))
        return out

    # ─── Serviço / Cobrança ─────────────────────────────────────────────────────

    def _service_ids_by_device(self, termo: str) -> Set[int]:
        """Cards de serviço cujo nº de série/módulo contém o termo.

        Pré-filtra no SQL pelo texto do JSON e confirma em Python só nos campos de
        série/módulo (evita falso positivo em nomes de chave, modelo, datas...).
        """
        like = f"%{termo}%"
        ids: Set[int] = set()
        for cid, aps in (
            self.db.query(ServiceCardProduct.service_card_id, ServiceCardProduct.aparelhos)
            .filter(cast(ServiceCardProduct.aparelhos, String).ilike(like))
            .limit(500)
            .all()
        ):
            if _device_matches(aps, termo):
                ids.add(cid)
        # Fallback: registro da integração — só para cards SEM nenhum produto.
        com_produto = self.db.query(ServiceCardProduct.service_card_id)
        for cid, bi in (
            self.db.query(ServiceCard.id, ServiceCard.business_info)
            .filter(
                cast(ServiceCard.business_info, String).ilike(like),
                ~ServiceCard.id.in_(com_produto),
            )
            .limit(500)
            .all()
        ):
            if _device_matches((bi or {}).get("equipamentos"), termo):
                ids.add(cid)
        return ids

    def search_service(self, termo: str, limit: int) -> List[ServiceSearchResult]:
        like = f"%{termo}%"
        device_ids = self._service_ids_by_device(termo)
        conds = [ServiceCard.title.ilike(like), *self._contact_conditions(termo)]
        if device_ids:
            conds.append(ServiceCard.id.in_(device_ids))
        rows = (
            self.db.query(ServiceCard, Client, Person)
            .outerjoin(Client, ServiceCard.client_id == Client.id)
            .outerjoin(Person, ServiceCard.person_id == Person.id)
            .filter(ServiceCard.is_deleted == False, or_(*conds))  # noqa: E712
            .order_by(ServiceCard.updated_at.desc())
            .limit(limit)
            .all()
        )
        lists = self._by_id(ServiceList, {c.list_id for c, _, _ in rows})
        boards = self._by_id(ServiceBoard, {l.board_id for l in lists.values()})
        out: List[ServiceSearchResult] = []
        for card, client, person in rows:
            lst = lists.get(card.list_id)
            board = boards.get(lst.board_id) if lst else None
            nome = (lst.name or "").lower() if lst else ""
            out.append(ServiceSearchResult(
                id=card.id,
                title=card.title,
                board_id=lst.board_id if lst else None,
                board_name=board.name if board else None,
                list_name=lst.name if lst else None,
                client_name=client.name if client else None,
                is_won=bool(lst and (lst.is_done_stage or "ganho" in nome)),
                is_lost=bool(lst and (lst.is_lost_stage or "perdido" in nome)),
                matched_on=self._matched_on(termo, card.title, client, person,
                                            by_device=card.id in device_ids),
            ))
        return out
