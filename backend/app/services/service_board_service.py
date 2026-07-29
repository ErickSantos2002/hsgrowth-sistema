"""
Service para lógica de negócio de ServiceBoard, ServiceList e ServiceCard.
"""
import uuid
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import HTTPException, status, UploadFile

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.repositories.service_board_repository import ServiceBoardRepository
from app.repositories.product_repository import ProductRepository
from app.repositories.service_repository import ServiceRepository
from app.schemas.service_board import (
    ServiceBoardCreate, ServiceBoardUpdate, ServiceBoardResponse, ServiceBoardListResponse,
    ServiceListCreate, ServiceListUpdate, ServiceListResponse,
    ServiceCardCreate, ServiceCardUpdate, ServiceCardResponse, ServiceCardListResponse,
    ServiceCardProductCreate, ServiceCardProductUpdate,
    ServiceCardProductResponse, ServiceCardProductSummary,
    ServiceCardActivityCreate, ServiceCardActivityUpdate, ServiceCardActivityResponse,
)
from app.schemas.service import (
    ServiceCardServiceCreate, ServiceCardServiceUpdate,
    ServiceCardServiceResponse, ServiceCardServiceSummary,
)
from app.models.service_board import ServiceBoard
from app.models.service_list import ServiceList
from app.models.service_card import ServiceCard
from app.models.service_card_product import ServiceCardProduct
from app.models.service_card_service import ServiceCardService
from app.models.service_card_activity import ServiceCardActivity
from app.models.user import User

# Funil oficial de serviço (board 1) — usado pela dashboard principal de Serviço.
SERVICE_FUNNEL_BOARD_IDS = {1}

# Boards que possuem regras de avanço + comportamento de Ganho/Perdido:
#   1 = Serviços (funil oficial) · 2 = Cobrança (Serviços - Atrasados).
# Cada um tem regras próprias (ver _validate_advance). Demais boards de serviço
# (duplicados) funcionam como kanban livre, sem regras.
SERVICE_RULE_BOARD_IDS = {1, 2}


# Diretório base de uploads (mesmo volume usado pelos anexos de vendas)
UPLOAD_DIR = Path("/app/uploads")


def _brl(valor: float) -> str:
    return f"{valor:,.2f}".replace(",", "§").replace(".", ",").replace("§", ".")


def deal_value_by_card(db: Session, card_ids: List[int]) -> dict:
    """Valor do negócio por card = soma dos SERVIÇOS do card − desconto global + frete.

    Total dos serviços = Σ (quantidade × preço − desconto por serviço). Sobre
    esse total incide o desconto global do card (R$ ou %) e soma-se o frete.
    Nunca fica negativo. Retorna {card_id: valor}.
    """
    if not card_ids:
        return {}
    from app.models.service_card_service import ServiceCardService

    # Total dos serviços por card
    rows = (
        db.query(
            ServiceCardService.service_card_id,
            func.coalesce(
                func.sum(
                    ServiceCardService.quantity * ServiceCardService.unit_price
                    - ServiceCardService.discount
                ),
                0,
            ),
        )
        .filter(ServiceCardService.service_card_id.in_(card_ids))
        .group_by(ServiceCardService.service_card_id)
        .all()
    )
    services_total = {cid: float(v or 0) for cid, v in rows}

    # Desconto global + frete de cada card
    meta = {
        c.id: c
        for c in db.query(
            ServiceCard.id,
            ServiceCard.global_discount,
            ServiceCard.global_discount_type,
            ServiceCard.shipping,
        ).filter(ServiceCard.id.in_(card_ids)).all()
    }

    result: dict = {}
    for cid in card_ids:
        base = services_total.get(cid, 0.0)
        c = meta.get(cid)
        gd = float(c.global_discount or 0) if c else 0.0
        gd_type = (c.global_discount_type or "value") if c else "value"
        ship = float(c.shipping or 0) if c else 0.0
        disc = base * gd / 100 if gd_type == "percent" else gd
        result[cid] = max(0.0, base - disc + ship)
    return result
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


class ServiceBoardService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ServiceBoardRepository(db)

    # ─── Board ────────────────────────────────────────────────────────────────

    def get_board(self, board_id: int) -> ServiceBoard:
        board = self.repo.find_board_by_id(board_id)
        if not board:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Board de serviços não encontrado")
        return board

    def list_boards(
        self,
        page: int = 1,
        page_size: int = 50,
        is_deleted: Optional[bool] = None,
    ) -> ServiceBoardListResponse:
        skip = (page - 1) * page_size
        boards = self.repo.list_boards(skip=skip, limit=page_size, is_deleted=is_deleted)
        total = self.repo.count_boards(is_deleted=is_deleted)
        total_pages = max(1, (total + page_size - 1) // page_size)

        items = []
        for b in boards:
            lists_count = self.repo.count_lists_by_board(b.id)
            cards_count = self.repo.count_cards_by_board(b.id)
            items.append(ServiceBoardResponse(
                id=b.id,
                name=b.name,
                description=b.description,
                color=b.color,
                icon=b.icon,
                is_deleted=b.is_deleted,
                created_at=b.created_at,
                updated_at=b.updated_at,
                lists_count=lists_count,
                cards_count=cards_count,
            ))

        return ServiceBoardListResponse(
            boards=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    def create_board(self, data: ServiceBoardCreate, user: User) -> ServiceBoard:
        return self.repo.create_board(data)

    def update_board(self, board_id: int, data: ServiceBoardUpdate, user: User) -> ServiceBoard:
        board = self.get_board(board_id)
        return self.repo.update_board(board, data)

    def delete_board(self, board_id: int, user: User) -> None:
        board = self.get_board(board_id)
        self.repo.delete_board(board)

    def duplicate_board(self, board_id: int, new_name: str, copy_lists: bool, user: User) -> ServiceBoard:
        board = self.get_board(board_id)
        new_board = self.repo.duplicate_board(board, new_name)
        if copy_lists:
            for lst in self.repo.list_lists_by_board(board_id):
                self.repo.create_list(ServiceListCreate(
                    board_id=new_board.id,
                    name=lst.name,
                    color=lst.color,
                    position=lst.position,
                    is_done_stage=lst.is_done_stage,
                    is_lost_stage=lst.is_lost_stage,
                    is_entry_stage=lst.is_entry_stage,
                ))
        return new_board

    # ─── List ─────────────────────────────────────────────────────────────────

    def get_list(self, list_id: int) -> ServiceList:
        lst = self.repo.find_list_by_id(list_id)
        if not lst:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lista de serviços não encontrada")
        return lst

    def list_lists(self, board_id: int) -> List[ServiceListResponse]:
        self.get_board(board_id)
        lists = self.repo.list_lists_by_board(board_id)
        return [
            ServiceListResponse(
                id=l.id,
                board_id=l.board_id,
                name=l.name,
                color=l.color,
                position=l.position,
                is_done_stage=l.is_done_stage,
                is_lost_stage=l.is_lost_stage,
                is_entry_stage=l.is_entry_stage,
                created_at=l.created_at,
                updated_at=l.updated_at,
            )
            for l in lists
        ]

    def create_list(self, data: ServiceListCreate, user: User) -> ServiceList:
        self.get_board(data.board_id)
        return self.repo.create_list(data)

    def update_list(self, list_id: int, data: ServiceListUpdate, user: User) -> ServiceList:
        lst = self.get_list(list_id)
        return self.repo.update_list(lst, data)

    def delete_list(self, list_id: int, user: User) -> None:
        lst = self.get_list(list_id)
        self.repo.delete_list(lst)

    def move_list(self, list_id: int, new_position: int, user: User) -> ServiceList:
        self.get_list(list_id)
        return self.repo.move_list(list_id, new_position)

    # ─── Card ─────────────────────────────────────────────────────────────────

    def get_card(self, card_id: int) -> ServiceCard:
        card = self.repo.find_card_by_id(card_id)
        if not card:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card de serviços não encontrado")
        return card

    def get_card_in_board(self, board_id: int, card_id: int) -> ServiceCard:
        """Busca o card garantindo que ele pertence ao board informado (anti-IDOR)."""
        card = self.get_card(card_id)
        if not card.list or card.list.board_id != board_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card não encontrado neste board")
        return card

    def _cards_aggregates(self, card_ids: List[int]) -> dict:
        """Calcula, para cada card: valor (produtos), status da próxima atividade
        pendente, contagem de pendentes e se está parado há 3+ dias."""
        if not card_ids:
            return {}
        db = self.db
        now = datetime.utcnow()
        threshold = now - timedelta(days=3)
        today_start = datetime(now.year, now.month, now.day)
        today_end = today_start + timedelta(days=1)

        # Valor do negócio por card = soma dos totais das propostas vinculadas
        value_by_card = deal_value_by_card(db, card_ids)

        # Equipamentos por card (id + nome) — para o filtro no Kanban.
        # Catálogo de Serviços (service_products), não o de Vendas.
        from app.models.service_product import ServiceProduct
        prod_rows = (
            db.query(ServiceCardProduct.service_card_id, ServiceProduct.id, ServiceProduct.name)
            .join(ServiceProduct, ServiceCardProduct.product_id == ServiceProduct.id)
            .filter(ServiceCardProduct.service_card_id.in_(card_ids))
            .all()
        )
        products_by_card: dict = {}
        for cid, pid, pname in prod_rows:
            products_by_card.setdefault(cid, []).append({"id": pid, "name": pname or ""})

        # Atividades pendentes (category=atividade, não concluída)
        pending_rows = (
            db.query(ServiceCardActivity.service_card_id, ServiceCardActivity.due_date)
            .filter(
                ServiceCardActivity.service_card_id.in_(card_ids),
                ServiceCardActivity.category == "atividade",
                ServiceCardActivity.is_completed == False,  # noqa: E712
            )
            .all()
        )
        pending_map: dict = {}
        for cid, due in pending_rows:
            entry = pending_map.setdefault(cid, {"count": 0, "overdue": False, "today": False, "future": False})
            entry["count"] += 1
            if due:
                if due < today_start:
                    entry["overdue"] = True
                elif due < today_end:
                    entry["today"] = True
                else:
                    entry["future"] = True

        # Parado 3d+: tem alguma atividade, mas nenhuma nos últimos 3 dias E card não atualizado há 3 dias
        has_activity = {cid for (cid,) in db.query(ServiceCardActivity.service_card_id)
                        .filter(ServiceCardActivity.service_card_id.in_(card_ids)).distinct().all()}
        recent_activity = {cid for (cid,) in db.query(ServiceCardActivity.service_card_id)
                           .filter(ServiceCardActivity.service_card_id.in_(card_ids),
                                   ServiceCardActivity.created_at >= threshold).distinct().all()}
        # Parado 7d+: nenhuma atividade nos últimos 7 dias (janela maior = subconjunto de 3d+)
        threshold_7d = now - timedelta(days=7)
        recent_activity_7d = {cid for (cid,) in db.query(ServiceCardActivity.service_card_id)
                              .filter(ServiceCardActivity.service_card_id.in_(card_ids),
                                      ServiceCardActivity.created_at >= threshold_7d).distinct().all()}

        # Colaboradores: quem agiu em cada card (modelo colaborativo — sem dono único)
        collab_rows = (
            db.query(ServiceCardActivity.service_card_id, ServiceCardActivity.user_id, User.name)
            .join(User, ServiceCardActivity.user_id == User.id)
            .filter(ServiceCardActivity.service_card_id.in_(card_ids), ServiceCardActivity.user_id.isnot(None))
            .distinct()
            .all()
        )
        collab_map: dict = {}
        for cid, uid, name in collab_rows:
            collab_map.setdefault(cid, {})[uid] = name  # dedup por usuário

        result = {}
        for cid in card_ids:
            p = pending_map.get(cid)
            if p:
                status_str = "overdue" if p["overdue"] else "today" if p["today"] else "future" if p["future"] else "none"
            else:
                status_str = "none"
            result[cid] = {
                "value": value_by_card.get(cid, 0.0),
                "pending_status": status_str,
                "pending_count": p["count"] if p else 0,
                "has_activity": cid in has_activity,
                "recent_activity": cid in recent_activity,
                "recent_activity_7d": cid in recent_activity_7d,
                "products": products_by_card.get(cid, []),
                "collaborators": [{"id": uid, "name": nm} for uid, nm in (collab_map.get(cid) or {}).items()],
            }
        return result

    def list_cards(self, board_id: int, page: int = 1, page_size: int = 200) -> ServiceCardListResponse:
        self.get_board(board_id)
        skip = (page - 1) * page_size
        cards = self.repo.list_cards_by_board(board_id, skip=skip, limit=page_size)
        total = self.repo.count_cards_by_board(board_id)
        total_pages = max(1, (total + page_size - 1) // page_size)

        threshold = datetime.utcnow() - timedelta(days=3)
        threshold_7d = datetime.utcnow() - timedelta(days=7)
        agg = self._cards_aggregates([c.id for c in cards])

        items = []
        for c in cards:
            a = agg.get(c.id, {})
            is_stuck = bool(a.get("has_activity") and not a.get("recent_activity") and c.updated_at and c.updated_at < threshold)
            is_stuck_7d = bool(a.get("has_activity") and not a.get("recent_activity_7d") and c.updated_at and c.updated_at < threshold_7d)
            items.append(ServiceCardResponse(
                id=c.id,
                list_id=c.list_id,
                title=c.title,
                description=c.description,
                assigned_to_id=c.assigned_to_id,
                assigned_to_name=c.assigned_to.name if c.assigned_to else None,
                due_date=c.due_date,
                contact_info=c.contact_info,
                payment_info=c.payment_info,
                business_info=c.business_info,
                client_id=c.client_id,
                person_id=c.person_id,
                client_name=c.client.name if c.client else None,
                person_name=c.person.name if c.person else None,
                position=float(c.position or 0),
                is_deleted=c.is_deleted,
                created_at=c.created_at,
                updated_at=c.updated_at,
                value=a.get("value", 0.0),
                pending_status=a.get("pending_status", "none"),
                pending_count=a.get("pending_count", 0),
                is_stuck_3d=is_stuck,
                is_stuck_7d=is_stuck_7d,
                collaborators=a.get("collaborators", []),
                products=a.get("products", []),
            ))

        return ServiceCardListResponse(
            cards=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    def create_card(self, data: ServiceCardCreate, user: User, board_id: Optional[int] = None) -> ServiceCard:
        lst = self.get_list(data.list_id)
        if board_id is not None and lst.board_id != board_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A lista informada não pertence a este board de serviços.",
            )
        card = self.repo.create_card(data)
        self.log_event(card.id, user, "card_created", "Card criado")
        return card

    def update_card(self, card_id: int, data: ServiceCardUpdate, user: User) -> ServiceCard:
        card = self.get_card(card_id)
        old_title, old_client, old_person = card.title, card.client_id, card.person_id
        updated = self.repo.update_card(card, data)
        changed = data.model_dump(exclude_unset=True)
        if "title" in changed and old_title != updated.title:
            self.log_event(card_id, user, "card_title_changed", f"Título alterado para: {updated.title}")
        if "client_id" in changed and old_client != updated.client_id:
            if updated.client_id:
                self.log_event(card_id, user, "client_linked", "Cliente vinculado", {"client_id": updated.client_id})
            else:
                self.log_event(card_id, user, "client_unlinked", "Cliente desvinculado")
        if "person_id" in changed and old_person != updated.person_id:
            if updated.person_id:
                self.log_event(card_id, user, "person_linked", "Pessoa vinculada", {"person_id": updated.person_id})
            else:
                self.log_event(card_id, user, "person_unlinked", "Pessoa desvinculada")
        return updated

    def delete_card(self, card_id: int, user: User) -> None:
        card = self.get_card(card_id)
        self.repo.delete_card(card)

    def _validate_advance(self, card: ServiceCard, old_list, new_list) -> None:
        """Trava de avanço por etapa: bloqueia mover o card se as obrigatoriedades
        da etapa não estiverem cumpridas. Só valida avanço (não voltar etapa).

        As regras valem para os boards com regra (SERVICE_RULE_BOARD_IDS), cada um
        com seu próprio conjunto: board 1 = funil oficial, board 2 = Cobrança.
        Boards duplicados/outros funcionam como kanban livre."""
        if not old_list or not new_list or old_list.id == new_list.id:
            return

        # Boards sem regra: kanban livre (sem travas de avanço).
        if old_list.board_id not in SERVICE_RULE_BOARD_IDS:
            return
        board_id = old_list.board_id

        acts = self.repo.list_card_activities(card.id)
        biz = card.business_info or {}
        has_slot = lambda slot: any(  # noqa: E731
            a.category == "arquivo" and (a.activity_metadata or {}).get("doc_slot") == slot for a in acts
        )

        # Momento em que o card entrou na etapa atual (última mudança para old_list)
        def _entered_current_stage_at():
            ts = [
                a.created_at for a in acts
                if a.category == "alteracao"
                and (a.activity_metadata or {}).get("to_list_id") == (old_list.id if old_list else None)
                and a.created_at
            ]
            return max(ts) if ts else card.created_at

        # Exige pelo menos 1 atividade CONCLUÍDA dentro da etapa atual
        def has_completed_activity():
            entered = _entered_current_stage_at()
            for a in acts:
                if a.category != "atividade" or not a.is_completed:
                    continue
                done_at = a.completed_at or a.created_at
                if done_at and entered and done_at >= entered:
                    return True
            return False

        new_name = (new_list.name or "").lower()
        src_name = (old_list.name or "").strip().lower()

        # Destino: Negócio Ganho — regras por board.
        if new_list.is_done_stage or "ganho" in new_name:
            miss = []
            if board_id == 1:
                # Número da proposta (do GestorHS) é obrigatório para dar Ganho —
                # vai no aviso de volta ao GestorHS (fase 2).
                pn = biz.get("proposal_number")
                try:
                    pn_ok = pn not in (None, "") and int(pn) > 0
                except (TypeError, ValueError):
                    pn_ok = False
                if not pn_ok:
                    miss.append("Número da proposta preenchido no Resumo")
                # Funil oficial — dois caminhos conforme a origem:
                #   De "Proposta" (Faturamento direto): forma=faturamento_direto + Proposta anexada
                #   De "Aguardando Pedido" (Pedido): OC anexada
                if src_name == "proposta":
                    if biz.get("closing_type") != "faturamento_direto":
                        miss.append("selecionar 'Faturamento direto' na Forma de fechamento (Resumo) — se for 'Pedido', avance para 'Aguardando Pedido'")
                    if not has_slot("proposta"):
                        miss.append("Proposta anexada no Resumo (Documentos)")
                else:
                    if not has_slot("oc"):
                        miss.append("OC (Ordem de Compra) anexada no Resumo")
            elif board_id == 2:
                # Cobrança: Operações → Ganho exige Confirmação de envio = Sim.
                if biz.get("shipping_confirmed") != "sim":
                    miss.append("Confirmação de envio marcada como 'Sim' (no Resumo)")
            if miss:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                    detail="Para marcar como Ganho, é preciso: " + "; ".join(miss) + ".")
            return

        # Destino: Negócio Perdido — motivo é tratado pelo modal (não bloqueia aqui)
        if new_list.is_lost_stage or "perdido" in new_name:
            return

        # Só valida avanço para frente entre etapas ativas (voltar é livre)
        if (new_list.position or 0) <= (old_list.position or 0):
            return

        # Não pode pular etapas: o destino tem que ser a PRÓXIMA etapa imediata.
        all_lists = self.repo.list_lists_by_board(old_list.board_id)
        idx = next((i for i, l in enumerate(all_lists) if l.id == old_list.id), None)
        if idx is not None and idx + 1 < len(all_lists):
            next_list = all_lists[idx + 1]
            if new_list.id != next_list.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Não é possível pular etapas — avance uma por vez. A próxima etapa é '{next_list.name}'.",
                )

        old_name = (old_list.name or "").strip().lower()
        miss = []

        if board_id == 1:
            # ── Funil oficial ──
            # Liberados do Laboratório → Dados Preenchidos: sem regra (OS não é mais exigida).
            if "dados preenchidos" in old_name:
                # Dados Preenchidos → Tentativa de Contato
                products = self.repo.list_card_products(card.id)
                if not products:
                    miss.append("ao menos 1 produto no card")
                services = self.repo.list_card_services(card.id)
                if not services:
                    miss.append("ao menos 1 serviço no card")
                if not card.client_id:
                    miss.append("Empresa (Cliente) vinculada")
                if not card.person_id:
                    miss.append("Pessoa (Contato de informação) vinculada")
                if not biz.get("service_type"):
                    miss.append("Recalibração e/ou Manutenção (no Resumo)")
            elif "tentativa de contato" in old_name:
                # Tentativa de Contato → Proposta
                if not has_completed_activity():
                    miss.append("pelo menos 1 atividade concluída nesta etapa")
            elif old_name == "proposta":
                # Proposta → Aguardando Pedido (caminho Pedido)
                if biz.get("closing_type") != "pedido":
                    miss.append("selecionar 'Pedido' na Forma de fechamento (Resumo) — se for 'Faturamento direto', use o botão Ganho")
                if not has_slot("proposta"):
                    miss.append("Proposta anexada no Resumo (Documentos)")

        elif board_id == 2:
            # ── Cobrança (Serviços - Atrasados) ──
            if "oportunidade existente" in old_name:
                # Oportunidade Existente → Tentativa de Contato
                products = self.repo.list_card_products(card.id)
                if not products:
                    miss.append("ao menos 1 produto no card")
                services = self.repo.list_card_services(card.id)
                if not services:
                    miss.append("ao menos 1 serviço no card")
                if not card.client_id:
                    miss.append("Empresa (Cliente) vinculada")
                if not card.person_id:
                    miss.append("Pessoa (Contato de informação) vinculada")
                if not biz.get("collection_type"):
                    miss.append("Tipo de cobrança (Aparelhos a vencer ou atrasados, no Resumo)")
                if not biz.get("acquisition_channel"):
                    miss.append("Canal de aquisição (no Resumo)")
            elif "tentativa de contato" in old_name:
                # Tentativa de Contato → Proposta
                if not has_completed_activity():
                    miss.append("pelo menos 1 atividade concluída nesta etapa")
                if not biz.get("service_type"):
                    miss.append("Recalibração e/ou Manutenção (no Resumo)")
            elif old_name == "proposta":
                # Proposta → Operações
                if not has_slot("proposta"):
                    miss.append("Proposta anexada no Resumo (Documentos)")
                if not biz.get("form_answered"):
                    miss.append("Formulário de Coleta de Dados enviado (marque o checkbox no Resumo)")

        if miss:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Para avançar de '{old_list.name}', preencha: " + "; ".join(miss) + ".",
            )

    def move_card(self, card_id: int, new_list_id: int, new_position: Optional[float], user: User) -> ServiceCard:
        card = self.get_card(card_id)
        old_list = self.repo.find_list_by_id(card.list_id)
        new_list = self.get_list(new_list_id)
        old_list_id = card.list_id
        # Admin e Gerente passam livremente pelas regras de avanço (igual ao board de
        # Vendas — ver CardService.move_card / is_privileged). Demais roles seguem as
        # travas do funil (Serviços e Cobrança).
        role_name = user.role.name if user and user.role else ""
        is_privileged = role_name in ("admin", "manager")
        if old_list_id != new_list_id and not is_privileged:
            self._validate_advance(card, old_list, new_list)
        moved = self.repo.move_card(card_id, new_list_id, new_position)
        if old_list_id != new_list_id:
            meta = {"from_list_id": old_list_id, "to_list_id": new_list_id}
            new_name = (new_list.name or "").lower()
            # Comportamento de Ganho/Perdido vale nos boards com regra (funil + Cobrança).
            # Em boards livres (duplicados) qualquer movimento é só "stage_change".
            is_funnel = new_list.board_id in SERVICE_RULE_BOARD_IDS
            if is_funnel and (new_list.is_done_stage or "ganho" in new_name):
                self.log_event(card_id, user, "card_won", f"Negócio marcado como Ganho ({new_list.name})", meta)
                self._complete_pending_activities(card_id)
                self._notificar_ganho_gestorhs(card, user)
            elif is_funnel and (new_list.is_lost_stage or "perdido" in new_name):
                self.log_event(card_id, user, "card_lost", f"Negócio marcado como Perdido ({new_list.name})", meta)
                self._complete_pending_activities(card_id)
            else:
                self.log_event(
                    card_id, user, "stage_change",
                    f"Etapa alterada: {old_list.name if old_list else '—'} → {new_list.name}",
                    meta,
                )
        return moved

    def _complete_pending_activities(self, card_id: int) -> int:
        """Conclui automaticamente as atividades pendentes do card (usado ao
        marcar Ganho/Perdido). Nunca quebra o fluxo.

        Exceção: atividades de **follow-up** NÃO são concluídas — elas costumam
        ser agendadas para o futuro (ex.: marcar Perdido para não acumular e
        reabrir o card no dia), então devem permanecer pendentes.
        """
        try:
            pending = [
                a for a in self.repo.list_card_activities(card_id)
                if a.category == "atividade"
                and not a.is_completed
                and a.activity_type != "follow_up"
            ]
            now = datetime.utcnow()
            for a in pending:
                a.is_completed = True
                if not a.completed_at:
                    a.completed_at = now
            if pending:
                self.db.commit()
            return len(pending)
        except Exception as e:  # pragma: no cover
            self.db.rollback()
            print(f"[SERVICE-ACTIVITY] erro ao concluir atividades pendentes: {e}")
            return 0

    def _notificar_ganho_gestorhs(self, card: ServiceCard, user: User) -> None:
        """Enfileira o aviso de Ganho ao GestorHS — só para cards vindos de OS.

        Best-effort: enfileirar nunca pode quebrar o Ganho. Se o broker estiver
        fora, o card ainda vira Ganho e a falha fica logada.
        """
        if card.external_source != "gestorhs.os" or not card.external_id:
            return
        try:
            from app.workers.tasks import notificar_ganho_gestorhs

            valor = deal_value_by_card(self.db, [card.id]).get(card.id, 0.0)
            numero = (card.business_info or {}).get("proposal_number")
            numero = int(numero) if numero not in (None, "") else None
            quem = user.name if user else "sistema"
            obs = f"Ganho no GrowthHS — card #{card.id} · R$ {_brl(valor)} · por {quem}"
            notificar_ganho_gestorhs.delay(card.external_id, numero, obs)
        except Exception as e:  # noqa: BLE001 — best-effort, nunca quebra o Ganho
            print(f"[GANHO-GESTORHS] falha ao enfileirar aviso (card {card.id}): {e}")

    # ─── Card Products ────────────────────────────────────────────────────────

    def _build_card_product_response(self, item: ServiceCardProduct) -> ServiceCardProductResponse:
        return ServiceCardProductResponse(
            id=item.id,
            service_card_id=item.service_card_id,
            product_id=item.product_id,
            quantity=item.quantity,
            unit_price=item.unit_price,
            discount=item.discount,
            notes=item.notes,
            aparelhos=item.aparelhos,
            subtotal=item.subtotal,
            total=item.total,
            created_at=item.created_at,
            updated_at=item.updated_at,
            product_name=item.product.name if item.product else None,
            product_sku=item.product.sku if item.product else None,
            product_category=item.product.category if item.product else None,
        )

    def get_card_products(self, card_id: int) -> ServiceCardProductSummary:
        self.get_card(card_id)
        items = self.repo.list_card_products(card_id)
        subtotal = sum(i.subtotal for i in items)
        total_discount = sum(float(i.discount) for i in items)
        total = sum(i.total for i in items)
        return ServiceCardProductSummary(
            items=[self._build_card_product_response(i) for i in items],
            total_items=len(items),
            subtotal=subtotal,
            total_discount=total_discount,
            total=total,
        )

    def add_card_product(
        self, card_id: int, data: ServiceCardProductCreate, user: User
    ) -> ServiceCardProductResponse:
        self.get_card(card_id)

        # Catálogo de Serviços (service_products), não o de Vendas.
        from app.models.service_product import ServiceProduct
        product = (
            self.db.query(ServiceProduct)
            .filter(
                ServiceProduct.id == data.product_id,
                ServiceProduct.is_deleted.is_(False),
            )
            .first()
        )
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Equipamento {data.product_id} não encontrado no catálogo de Serviços",
            )

        existing = self.repo.get_card_product_by_card_and_product(card_id, data.product_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"O produto '{product.name}' já está adicionado neste card",
            )

        item = self.repo.add_card_product(card_id, data)
        self.log_event(card_id, user, "product_added", f"Produto adicionado: {product.name}",
                       {"product_id": product.id})
        return self._build_card_product_response(item)

    def update_card_product(
        self, item_id: int, data: ServiceCardProductUpdate, user: User
    ) -> ServiceCardProductResponse:
        item = self.repo.get_card_product_by_id(item_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Produto do card {item_id} não encontrado",
            )
        updated = self.repo.update_card_product(item_id, data)
        return self._build_card_product_response(updated)

    def remove_card_product(self, item_id: int, user: User) -> dict:
        item = self.repo.get_card_product_by_id(item_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Produto do card {item_id} não encontrado",
            )
        product_name = item.product.name if item.product else "Produto"
        card_id = item.service_card_id
        self.repo.remove_card_product(item_id)
        self.log_event(card_id, user, "product_removed", f"Produto removido: {product_name}",
                       {"product_id": item.product_id})
        return {"message": "Produto removido do card com sucesso"}

    # ─── Card Services (mirror de Card Products, sem aparelhos) ──────────────────

    def _build_card_service_response(self, item: ServiceCardService) -> ServiceCardServiceResponse:
        return ServiceCardServiceResponse(
            id=item.id,
            service_card_id=item.service_card_id,
            service_id=item.service_id,
            quantity=item.quantity,
            unit_price=float(item.unit_price),
            discount=float(item.discount),
            notes=item.notes,
            subtotal=item.subtotal,
            total=item.total,
            created_at=item.created_at,
            updated_at=item.updated_at,
            service_name=item.service.name if item.service else None,
            service_sku=item.service.sku if item.service else None,
            service_category=item.service.category if item.service else None,
        )

    def get_card_services(self, card_id: int) -> ServiceCardServiceSummary:
        self.get_card(card_id)
        items = self.repo.list_card_services(card_id)
        subtotal = sum(i.subtotal for i in items)
        total_discount = sum(float(i.discount) for i in items)
        total = sum(i.total for i in items)
        return ServiceCardServiceSummary(
            items=[self._build_card_service_response(i) for i in items],
            total_items=len(items),
            subtotal=subtotal,
            total_discount=total_discount,
            total=total,
        )

    def add_card_service(
        self, card_id: int, data: ServiceCardServiceCreate, user: User
    ) -> ServiceCardServiceResponse:
        self.get_card(card_id)

        service = ServiceRepository(self.db).get_service_by_id(data.service_id)
        if not service:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Serviço {data.service_id} não encontrado",
            )

        existing = self.repo.get_card_service_by_card_and_service(card_id, data.service_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"O serviço '{service.name}' já está adicionado neste card",
            )

        item = self.repo.add_card_service(card_id, data)
        self.log_event(card_id, user, "service_added", f"Serviço adicionado: {service.name}",
                       {"service_id": service.id})
        return self._build_card_service_response(item)

    def update_card_service(
        self, item_id: int, data: ServiceCardServiceUpdate, user: User
    ) -> ServiceCardServiceResponse:
        item = self.repo.get_card_service_by_id(item_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Serviço do card {item_id} não encontrado",
            )
        updated = self.repo.update_card_service(item_id, data)
        return self._build_card_service_response(updated)

    def remove_card_service(self, item_id: int, user: User) -> dict:
        item = self.repo.get_card_service_by_id(item_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Serviço do card {item_id} não encontrado",
            )
        service_name = item.service.name if item.service else "Serviço"
        card_id = item.service_card_id
        self.repo.remove_card_service(item_id)
        self.log_event(card_id, user, "service_removed", f"Serviço removido: {service_name}",
                       {"service_id": item.service_id})
        return {"message": "Serviço removido do card com sucesso"}

    # ─── Card Activities (Atividade / Anotação / Arquivo / Alteração) ─────────

    def _build_activity_response(self, a: ServiceCardActivity) -> ServiceCardActivityResponse:
        return ServiceCardActivityResponse(
            id=a.id,
            service_card_id=a.service_card_id,
            user_id=a.user_id,
            user_name=a.user.name if a.user else None,
            category=a.category,
            activity_type=a.activity_type,
            title=a.title,
            description=a.description,
            activity_metadata=a.activity_metadata,
            priority=a.priority,
            due_date=a.due_date,
            is_completed=a.is_completed,
            completed_at=a.completed_at,
            file_name=a.file_name,
            file_size=a.file_size,
            mime_type=a.mime_type,
            created_at=a.created_at,
            updated_at=a.updated_at,
        )

    def log_event(self, card_id: int, user: Optional[User], activity_type: str,
                  description: str, metadata: Optional[dict] = None) -> None:
        """Registra um evento automático (categoria 'alteracao'). Nunca quebra o fluxo."""
        try:
            self.repo.create_activity(
                service_card_id=card_id,
                user_id=user.id if user else None,
                category="alteracao",
                activity_type=activity_type,
                description=description,
                activity_metadata=metadata,
            )
        except Exception as e:  # pragma: no cover
            print(f"[SERVICE-ACTIVITY] erro ao registrar evento: {e}")

    def _get_activity_scoped(self, board_id: int, card_id: int, activity_id: int) -> ServiceCardActivity:
        """Busca a atividade garantindo que pertence ao card e ao board (anti-IDOR)."""
        self.get_card_in_board(board_id, card_id)
        activity = self.repo.get_activity_by_id(activity_id)
        if not activity or activity.service_card_id != card_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Atividade não encontrada")
        return activity

    def list_activities(self, board_id: int, card_id: int) -> List[ServiceCardActivityResponse]:
        self.get_card_in_board(board_id, card_id)
        items = self.repo.list_card_activities(card_id)
        return [self._build_activity_response(a) for a in items]

    def create_activity(self, board_id: int, card_id: int, data: ServiceCardActivityCreate, user: User) -> ServiceCardActivityResponse:
        self.get_card_in_board(board_id, card_id)
        if data.category not in ("atividade", "anotacao"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Categoria inválida")
        activity = self.repo.create_activity(
            service_card_id=card_id,
            user_id=user.id,
            category=data.category,
            activity_type=data.activity_type or ("note" if data.category == "anotacao" else "task"),
            title=data.title,
            description=data.description,
            priority=data.priority,
            due_date=data.due_date,
            activity_metadata=data.activity_metadata,
        )
        return self._build_activity_response(activity)

    def update_activity(self, board_id: int, card_id: int, activity_id: int, data: ServiceCardActivityUpdate, user: User) -> ServiceCardActivityResponse:
        activity = self._get_activity_scoped(board_id, card_id, activity_id)
        changes = data.model_dump(exclude_unset=True)
        incoming_meta = changes.pop("activity_metadata", None)
        if activity.category == "atividade":
            meta = dict(activity.activity_metadata or {})
            if incoming_meta:
                meta.update(incoming_meta)
            # Registra a edição no ciclo de vida da atividade (para o histórico)
            edits = list(meta.get("edits") or [])
            edits.append(datetime.utcnow().isoformat())
            meta["edits"] = edits
            changes["activity_metadata"] = meta
        elif incoming_meta is not None:
            changes["activity_metadata"] = incoming_meta
        updated = self.repo.update_activity(activity, changes)
        return self._build_activity_response(updated)

    def complete_activity(self, board_id: int, card_id: int, activity_id: int, is_completed: bool, user: User, is_valid: Optional[bool] = None) -> ServiceCardActivityResponse:
        activity = self._get_activity_scoped(board_id, card_id, activity_id)
        changes = {
            "is_completed": is_completed,
            "completed_at": datetime.utcnow() if is_completed else None,
        }
        if is_valid is not None:
            meta = dict(activity.activity_metadata or {})
            meta["is_valid"] = is_valid
            changes["activity_metadata"] = meta
        updated = self.repo.update_activity(activity, changes)
        return self._build_activity_response(updated)

    def delete_activity(self, board_id: int, card_id: int, activity_id: int, user: User) -> dict:
        activity = self._get_activity_scoped(board_id, card_id, activity_id)
        # Remove o arquivo físico, se for um anexo
        if activity.category == "arquivo" and activity.file_path:
            try:
                fp = UPLOAD_DIR / activity.file_path
                if fp.exists():
                    fp.unlink()
            except Exception as e:  # pragma: no cover
                print(f"[SERVICE-ACTIVITY] erro ao remover arquivo: {e}")
        self.repo.delete_activity(activity)
        return {"message": "Removido com sucesso"}

    async def upload_file(self, board_id: int, card_id: int, file: UploadFile, user: User, slot: Optional[str] = None) -> ServiceCardActivityResponse:
        self.get_card_in_board(board_id, card_id)
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                                detail="Arquivo muito grande. Máximo: 10MB")
        original = file.filename or "arquivo"
        ext = Path(original).suffix
        unique = f"{uuid.uuid4().hex}{ext}"
        card_dir = UPLOAD_DIR / "service_cards" / str(card_id)
        card_dir.mkdir(parents=True, exist_ok=True)
        try:
            with open(card_dir / unique, "wb") as f:
                f.write(content)
        except Exception:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                                detail="Erro ao salvar arquivo no disco")
        # Slot do documento no Resumo (proposta|os|oc) — usado pelos anexos nomeados.
        # Se já houver um arquivo no mesmo slot, ele é substituído (removido o anterior).
        valid_slots = {"proposta", "os", "oc"}
        meta = None
        if slot and slot in valid_slots:
            meta = {"doc_slot": slot}
            self._remove_files_in_slot(card_id, slot)
        activity = self.repo.create_activity(
            service_card_id=card_id,
            user_id=user.id,
            category="arquivo",
            activity_type="file_attached",
            title=original,
            file_name=original,
            file_path=f"service_cards/{card_id}/{unique}",
            file_size=len(content),
            mime_type=file.content_type,
            activity_metadata=meta,
        )
        return self._build_activity_response(activity)

    def _remove_files_in_slot(self, card_id: int, slot: str) -> None:
        """Remove arquivos antigos do mesmo slot (proposta|os|oc) — mantém só o mais novo."""
        try:
            for a in self.repo.list_card_activities(card_id):
                if a.category == "arquivo" and (a.activity_metadata or {}).get("doc_slot") == slot:
                    if a.file_path:
                        fp = UPLOAD_DIR / a.file_path
                        try:
                            if fp.exists():
                                fp.unlink()
                        except Exception:
                            pass
                    self.repo.delete_activity(a)
        except Exception as e:  # pragma: no cover
            print(f"[SERVICE-FILE] erro ao limpar slot {slot}: {e}")

    def get_file_for_download(self, board_id: int, card_id: int, activity_id: int):
        activity = self._get_activity_scoped(board_id, card_id, activity_id)
        if activity.category != "arquivo" or not activity.file_path:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arquivo não encontrado")
        fp = UPLOAD_DIR / activity.file_path
        if not fp.exists():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arquivo não encontrado no disco")
        return fp, activity.file_name or "arquivo", activity.mime_type or "application/octet-stream"
