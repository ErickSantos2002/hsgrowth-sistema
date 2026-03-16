"""
Card Service - Lógica de negócio para cards.
Implementa validações e regras de negócio.
"""
from typing import Optional, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories.card_repository import CardRepository
from app.repositories.list_repository import ListRepository
from app.repositories.board_repository import BoardRepository
from app.repositories.field_repository import FieldRepository
from app.repositories.notification_repository import NotificationRepository
from app.repositories.activity_repository import ActivityRepository
from app.repositories.person_repository import PersonRepository
from app.repositories.client_repository import ClientRepository
from app.schemas.card import CardCreate, CardUpdate, CardResponse, CardListResponse
from app.schemas.field import CardFieldValueCreate, CardFieldValueResponse
from app.models.card import Card
from app.models.user import User


# Import local para evitar circular dependency
def get_automation_service():
    from app.services.automation_service import AutomationService
    return AutomationService


class CardService:
    """
    Service para lógica de negócio relacionada a cards.
    """

    def __init__(self, db: Session):
        self.db = db
        self.card_repository = CardRepository(db)
        self.list_repository = ListRepository(db)
        self.board_repository = BoardRepository(db)
        self.field_repository = FieldRepository(db)
        self.activity_repository = ActivityRepository(db)
        self.notification_repository = NotificationRepository(db)
        self.person_repository = PersonRepository(db)
        self.client_repository = ClientRepository(db)

    def _verify_card_access(self, card: Card) -> None:
        """
        Verifica se o card existe e é válido.

        Args:
            card: Card a verificar

        Raises:
            HTTPException: Se não tiver acesso
        """
        # Busca a lista do card
        list_obj = self.list_repository.find_by_id(card.list_id)
        if not list_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lista não encontrada"
            )

        # Busca o board da lista
        board = self.board_repository.find_by_id(list_obj.board_id)
        if not board:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Board não encontrado"
            )

    def get_card_by_id(self, card_id: int, current_user: Optional[User] = None) -> Card:
        """
        Busca um card por ID.

        Args:
            card_id: ID do card
            current_user: Usuário autenticado — quando informado, aplica
                          verificação de acesso por role (salesperson/sdr)

        Returns:
            Card

        Raises:
            HTTPException: 404 se não encontrado, 403 se sem permissão
        """
        card = self.card_repository.find_by_id(card_id)

        if not card:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Card não encontrado"
            )

        # Verifica acesso estrutural (lista e board existem)
        self._verify_card_access(card)

        # Verifica permissão por role quando o usuário é fornecido
        if current_user is not None:
            if current_user.role.name == "salesperson" and card.assigned_to_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Você não tem permissão para acessar este card"
                )
            if current_user.role.name == "sdr" and card.sdr_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Você não tem permissão para acessar este card"
                )

        return card

    def list_cards(
        self,
        board_id: int,
        page: int = 1,
        page_size: int = 50,
        all: bool = False,
        minimal: bool = False,
        assigned_to_id: Optional[int] = None,
        sdr_id: Optional[int] = None,
        person_id: Optional[int] = None,
        is_won: Optional[bool] = None,
        is_lost: Optional[bool] = None,
        current_user: Optional[User] = None,
    ):
        """
        Lista cards de um board com paginação e filtros.

        Args:
            board_id: ID do board
            page: Número da página
            page_size: Tamanho da página
            all: Se True, retorna TODOS os cards sem paginação
            minimal: Se True, retorna apenas campos essenciais (otimizado)
            assigned_to_id: Filtro por responsável (sobrescrito pelo role se necessário)
            sdr_id: Filtro por SDR (sobrescrito pelo role se necessário)
            person_id: Filtro por pessoa de contato
            is_won: Filtro por cards ganhos
            is_lost: Filtro por cards perdidos
            current_user: Usuário autenticado — quando informado, aplica
                          filtros automáticos por role (salesperson/sdr)

        Returns:
            CardListResponse ou CardMinimalListResponse
        """
        from app.schemas.card import CardMinimalResponse, CardMinimalListResponse

        # Força filtros por role: salesperson só vê os seus; SDR só vê onde é o SDR
        # Isso garante que o filtro não pode ser contornado via parâmetro de query
        if current_user is not None:
            if current_user.role.name == "salesperson":
                assigned_to_id = current_user.id
            elif current_user.role.name == "sdr":
                sdr_id = current_user.id

        # Verifica se o board existe
        board = self.board_repository.find_by_id(board_id)
        if not board:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Board não encontrado"
            )

        # Se all=True, ignora paginação
        if all:
            skip = 0
            limit = 999999  # Limite muito alto (todos os cards)
        else:
            skip = (page - 1) * page_size
            limit = page_size

        # Busca cards
        cards = self.card_repository.list_by_board(
            board_id=board_id,
            skip=skip,
            limit=limit,
            assigned_to_id=assigned_to_id,
            sdr_id=sdr_id,
            person_id=person_id,
            is_won=is_won,
            is_lost=is_lost
        )

        # Conta total
        total = self.card_repository.count_by_board(
            board_id=board_id,
            assigned_to_id=assigned_to_id,
            sdr_id=sdr_id,
            person_id=person_id,
            is_won=is_won,
            is_lost=is_lost
        )

        # Calcula total de páginas
        if all:
            total_pages = 1  # Se retornou todos, só tem 1 "página"
        else:
            total_pages = (total + page_size - 1) // page_size

        # Modo MINIMAL: Retorna apenas campos essenciais (otimizado para Kanban)
        if minimal:
            cards_response = []
            # Busca contagem e status de tasks pendentes para todos os cards de uma vez (otimizado)
            from app.models.card_task import CardTask
            from sqlalchemy import func
            from datetime import datetime, timezone

            card_ids = [card.id for card in cards]
            pending_tasks_counts = {}
            pending_tasks_statuses = {}

            if card_ids:
                # Busca todas as tasks pendentes com suas datas
                pending_tasks = self.db.query(CardTask).filter(
                    CardTask.card_id.in_(card_ids),
                    CardTask.is_completed == False
                ).all()

                # Agrupa por card_id e determina contagem e status
                from collections import defaultdict
                tasks_by_card = defaultdict(list)
                for task in pending_tasks:
                    tasks_by_card[task.card_id].append(task)

                now = datetime.now(timezone.utc)
                today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
                today_end = now.replace(hour=23, minute=59, second=59, microsecond=999999)

                for card_id, tasks in tasks_by_card.items():
                    pending_tasks_counts[card_id] = len(tasks)

                    # Determina o status baseado nas datas das tasks
                    has_overdue = False
                    has_today = False
                    has_future = False

                    for task in tasks:
                        if task.due_date:
                            task_date = task.due_date
                            # Garante que está em UTC
                            if task_date.tzinfo is None:
                                task_date = task_date.replace(tzinfo=timezone.utc)

                            if task_date < today_start:
                                has_overdue = True
                            elif today_start <= task_date <= today_end:
                                has_today = True
                            else:
                                has_future = True

                    # Prioridade: overdue > today > future
                    if has_overdue:
                        pending_tasks_statuses[card_id] = "overdue"
                    elif has_today:
                        pending_tasks_statuses[card_id] = "today"
                    elif has_future:
                        pending_tasks_statuses[card_id] = "future"
                    else:
                        pending_tasks_statuses[card_id] = "none"

            for card in cards:
                # Usa o usuário já carregado via eager loading (sem query adicional)
                assigned_to_name = None
                assigned_to_avatar_url = None
                if card.assigned_to:
                    assigned_to_name = card.assigned_to.name
                    assigned_to_avatar_url = card.assigned_to.avatar_url

                sdr_name = None
                sdr_avatar_url = None
                if card.sdr:
                    sdr_name = card.sdr.name
                    sdr_avatar_url = card.sdr.avatar_url

                # Pega a contagem e status de tasks pendentes
                pending_count = pending_tasks_counts.get(card.id, 0)
                pending_status = pending_tasks_statuses.get(card.id, "none" if pending_count == 0 else None)

                cards_response.append(
                    CardMinimalResponse(
                        id=card.id,
                        title=card.title,
                        list_id=card.list_id,
                        position=card.position,
                        assigned_to_id=card.assigned_to_id,
                        assigned_to_name=assigned_to_name,
                        assigned_to_avatar_url=assigned_to_avatar_url,
                        sdr_id=card.sdr_id,
                        sdr_name=sdr_name,
                        sdr_avatar_url=sdr_avatar_url,
                        pending_tasks_count=pending_count,
                        pending_tasks_status=pending_status,
                        value=card.value,
                        due_date=card.due_date,
                        created_at=card.created_at,
                        is_won=card.is_won,
                        is_lost=card.is_lost,
                        closed_at=card.closed_at
                    )
                )

            return CardMinimalListResponse(
                cards=cards_response,
                total=total,
                page=page,
                page_size=page_size if not all else total,
                total_pages=total_pages
            )

        # Modo COMPLETO: Retorna todos os campos
        # Busca contagem e status de tasks pendentes para todos os cards de uma vez (otimizado)
        from app.models.card_task import CardTask
        from sqlalchemy import func
        from datetime import datetime, timezone

        card_ids = [card.id for card in cards]
        pending_tasks_counts = {}
        pending_tasks_statuses = {}

        if card_ids:
            # Busca todas as tasks pendentes com suas datas
            pending_tasks = self.db.query(CardTask).filter(
                CardTask.card_id.in_(card_ids),
                CardTask.is_completed == False
            ).all()

            # Agrupa por card_id e determina contagem e status
            from collections import defaultdict
            tasks_by_card = defaultdict(list)
            for task in pending_tasks:
                tasks_by_card[task.card_id].append(task)

            now = datetime.now(timezone.utc)
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            today_end = now.replace(hour=23, minute=59, second=59, microsecond=999999)

            for card_id, tasks in tasks_by_card.items():
                pending_tasks_counts[card_id] = len(tasks)

                # Determina o status baseado nas datas das tasks
                has_overdue = False
                has_today = False
                has_future = False

                for task in tasks:
                    if task.due_date:
                        task_date = task.due_date
                        # Garante que está em UTC
                        if task_date.tzinfo is None:
                            task_date = task_date.replace(tzinfo=timezone.utc)

                        if task_date < today_start:
                            has_overdue = True
                        elif today_start <= task_date <= today_end:
                            has_today = True
                        else:
                            has_future = True

                # Prioridade: overdue > today > future
                if has_overdue:
                    pending_tasks_statuses[card_id] = "overdue"
                elif has_today:
                    pending_tasks_statuses[card_id] = "today"
                elif has_future:
                    pending_tasks_statuses[card_id] = "future"
                else:
                    pending_tasks_statuses[card_id] = "none"

        cards_response = []
        for card in cards:
            # Usa o usuário já carregado via eager loading (sem query adicional)
            assigned_to_name = None
            assigned_to_avatar_url = None
            if card.assigned_to:
                assigned_to_name = card.assigned_to.name
                assigned_to_avatar_url = card.assigned_to.avatar_url

            sdr_name = None
            sdr_avatar_url = None
            if card.sdr:
                sdr_name = card.sdr.name
                sdr_avatar_url = card.sdr.avatar_url

            list_obj = self.list_repository.find_by_id(card.list_id)
            list_name = list_obj.name if list_obj else None

            # Pega a contagem e status de tasks pendentes
            pending_count = pending_tasks_counts.get(card.id, 0)
            pending_status = pending_tasks_statuses.get(card.id, "none" if pending_count == 0 else None)

            cards_response.append(
                CardResponse(
                    id=card.id,
                    title=card.title,
                    description=card.description,
                    list_id=card.list_id,
                    assigned_to_id=card.assigned_to_id,
                    sdr_id=card.sdr_id,
                    value=card.value,
                    due_date=card.due_date,
                    is_won=card.is_won,
                    is_lost=card.is_lost,
                    won_at=card.won_at,
                    lost_at=card.lost_at,
                    position=card.position,
                    created_at=card.created_at,
                    updated_at=card.updated_at,
                    assigned_to_name=assigned_to_name,
                    assigned_to_avatar_url=assigned_to_avatar_url,
                    sdr_name=sdr_name,
                    sdr_avatar_url=sdr_avatar_url,
                    pending_tasks_count=pending_count,
                    pending_tasks_status=pending_status,
                    list_name=list_name,
                    board_id=board_id
                )
            )

        return CardListResponse(
            cards=cards_response,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )

    def create_card(self, card_data: CardCreate, current_user: User) -> Card:
        """
        Cria um novo card.

        Args:
            card_data: Dados do card
            current_user: Usuário autenticado

        Returns:
            Card criado
        """
        # Verifica se a lista existe
        list_obj = self.list_repository.find_by_id(card_data.list_id)
        if not list_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lista não encontrada"
            )

        board = self.board_repository.find_by_id(list_obj.board_id)
        if not board:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Board não encontrado"
            )

        # Verifica se o usuário tem permissão para criar card nessa lista.
        # Apenas Admin e Manager podem criar em qualquer lista.
        # Demais roles só podem criar na primeira lista do board de Prospecção (id=6).
        is_privileged = (
            current_user.role and current_user.role.name in ("admin", "manager")
        )
        if not is_privileged:
            from app.models.list import List as ListModel
            first_list = (
                self.db.query(ListModel)
                .filter(ListModel.board_id == 6)
                .order_by(ListModel.position.asc())
                .first()
            )
            if not first_list or list_obj.id != first_list.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=(
                        "Você só pode criar negócios na lista 'Lead Novo' "
                        "do quadro Prospecção"
                    ),
                )

        # Valida empresa vinculada: deve ter setor e tipo de relacionamento
        if card_data.client_id:
            client = self.client_repository.find_by_id(card_data.client_id)
            if not client:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Empresa não encontrada"
                )
            if not client.sector or not client.relationship_type:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=(
                        "A empresa vinculada não possui Setor e/ou Tipo de Relacionamento. "
                        "Complete os dados da empresa antes de criar o card."
                    )
                )

        # Valida contato vinculado: deve ter pelo menos e-mail ou telefone
        if card_data.person_id:
            person = self.person_repository.find_by_id(card_data.person_id)
            if not person:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Contato não encontrado"
                )
            has_contact = any([
                person.email,
                person.email_commercial,
                person.phone,
                person.phone_whatsapp,
                person.phone_commercial,
            ])
            if not has_contact:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=(
                        "O contato vinculado não possui e-mail ou telefone. "
                        "Complete os dados do contato antes de criar o card."
                    )
                )

        # Cria o card
        card = self.card_repository.create(card_data)
        print(f"[AUTOMATION] Card criado ID={card.id}, Board={board.id}")

        # Preenche data de entrada no board automaticamente
        from datetime import datetime
        now = datetime.utcnow()

        if board.id == 6:  # Prospecção
            card.prospection_entry_date = now
        elif board.id == 7:  # Aquisição
            card.acquisition_entry_date = now
        elif board.id == 8:  # Expansão (Pós Venda)
            card.expansion_entry_date = now

        self.db.commit()
        self.db.refresh(card)

        # Registra entrada inicial na lista de histórico
        try:
            from app.models.card_list_history import CardListHistory
            initial_entry = CardListHistory(
                card_id=card.id,
                list_id=card.list_id,
                board_id=board.id,
                entered_at=now,
            )
            self.db.add(initial_entry)
            self.db.commit()
        except Exception as e:
            print(f"[CARD_LIST_HISTORY] Erro ao registrar entrada inicial: {e}")

        # Notifica responsável e SDR se já vieram definidos na criação do card
        if card.assigned_to_id:
            try:
                self.notification_repository.create({
                    "user_id": card.assigned_to_id,
                    "notification_type": "card_assigned",
                    "title": "Card atribuído a você",
                    "message": f"O card '{card.title}' foi atribuído a você",
                    "icon": "bell",
                    "color": "info",
                    "notification_metadata": {
                        "card_id": card.id,
                        "card_title": card.title,
                        "url": f"/cards/{card.id}"
                    }
                })
            except Exception as e:
                print(f"[NOTIFICATION] Erro ao notificar responsável na criação do card: {e}")

        if card.sdr_id:
            try:
                self.notification_repository.create({
                    "user_id": card.sdr_id,
                    "notification_type": "card_assigned",
                    "title": "Card atribuído a você",
                    "message": f"O card '{card.title}' foi atribuído a você como SDR",
                    "icon": "bell",
                    "color": "info",
                    "notification_metadata": {
                        "card_id": card.id,
                        "card_title": card.title,
                        "url": f"/cards/{card.id}"
                    }
                })
            except Exception as e:
                print(f"[NOTIFICATION] Erro ao notificar SDR na criação do card: {e}")

        # Dispara automações do tipo "card_created"
        try:
            print(f"[AUTOMATION] Buscando automações para board_id={board.id}, trigger=card_created")
            AutomationService = get_automation_service()
            automation_service = AutomationService(self.db)
            executions = automation_service.process_trigger(
                board_id=board.id,
                trigger_event="card_created",
                card=card,
                user=current_user,
                trigger_data={}
            )
            print(f"[AUTOMATION] Disparadas {len(executions)} automações")
        except Exception as e:
            # Log do erro mas não falha a criação do card
            print(f"[AUTOMATION] Erro ao disparar automações: {e}")
            import traceback
            traceback.print_exc()

        return card

    def update_card(self, card_id: int, card_data: CardUpdate, current_user: User) -> Card:
        """
        Atualiza um card.

        Args:
            card_id: ID do card
            card_data: Dados de atualização
            current_user: Usuário autenticado

        Returns:
            Card atualizado
        """
        # Busca e verifica acesso (inclui verificação de role)
        card = self.get_card_by_id(card_id, current_user)

        # Guarda valores antigos para detectar mudanças
        old_is_won = card.is_won
        old_is_lost = card.is_lost
        old_assigned_to_id = card.assigned_to_id
        old_sdr_id = card.sdr_id

        # Captura snapshot dos campos alteráveis para registrar mudanças no histórico
        update_data_fields = card_data.model_dump(exclude_unset=True)
        changes_snapshot = {
            field: getattr(card, field, None)
            for field in ["title", "value", "assigned_to_id", "due_date"]
            if field in update_data_fields
        }

        # Atualiza o card
        updated_card = self.card_repository.update(card, card_data)

        # Se shipping_cost foi alterado, recalcula card.value (produtos + frete)
        # para que o Kanban e todos os outros locais que usam card.value já recebam
        # o total correto sem precisar de recarregamento
        if "shipping_cost" in update_data_fields:
            from app.repositories.product_repository import ProductRepository
            product_repo = ProductRepository(self.db)
            totals = product_repo.get_card_products_total(card_id)
            shipping = float(updated_card.shipping_cost) if updated_card.shipping_cost else 0
            updated_card.value = totals["total"] + shipping
            self.db.commit()
            self.db.refresh(updated_card)

        # Dispara triggers de automação se status mudou
        try:
            # Busca a lista do card para pegar o board_id
            list_obj = self.list_repository.find_by_id(updated_card.list_id)
            if list_obj:
                board = self.board_repository.find_by_id(list_obj.board_id)
                if board:
                    AutomationService = get_automation_service()
                    automation_service = AutomationService(self.db)

                    # Dispara trigger card_won se mudou de False para True
                    if not old_is_won and updated_card.is_won:
                        print(f"[AUTOMATION] Card {card_id} marcado como ganho, disparando trigger card_won")
                        automation_service.process_trigger(
                            board_id=board.id,
                            trigger_event="card_won",
                            card=updated_card,
                            user=current_user,
                            trigger_data={"manual": True}
                        )

                    # Dispara trigger card_lost se mudou de False para True
                    if not old_is_lost and updated_card.is_lost:
                        print(f"[AUTOMATION] Card {card_id} marcado como perdido, disparando trigger card_lost")
                        automation_service.process_trigger(
                            board_id=board.id,
                            trigger_event="card_lost",
                            card=updated_card,
                            user=current_user,
                            trigger_data={"manual": True}
                        )

                    # Dispara trigger card_assigned se responsável mudou
                    if (
                        "assigned_to_id" in update_data_fields
                        and old_assigned_to_id != updated_card.assigned_to_id
                        and updated_card.assigned_to_id is not None
                    ):
                        print(f"[AUTOMATION] Card {card_id} atribuído a usuário {updated_card.assigned_to_id}, disparando trigger card_assigned")
                        automation_service.process_trigger(
                            board_id=board.id,
                            trigger_event="card_assigned",
                            card=updated_card,
                            user=current_user,
                            trigger_data={"assigned_to_id": updated_card.assigned_to_id}
                        )
        except Exception as e:
            # Log do erro mas não falha a atualização do card
            print(f"[AUTOMATION] Erro ao disparar automações no update_card: {e}")
            import traceback
            traceback.print_exc()

        # Envia notificação ao novo responsável se o vendedor foi alterado
        if (
            "assigned_to_id" in update_data_fields
            and old_assigned_to_id != updated_card.assigned_to_id
            and updated_card.assigned_to_id is not None
        ):
            try:
                self.notification_repository.create({
                    "user_id": updated_card.assigned_to_id,
                    "notification_type": "card_assigned",
                    "title": "Card atribuído a você",
                    "message": f"O card '{updated_card.title}' foi atribuído a você",
                    "icon": "bell",
                    "color": "info",
                    "notification_metadata": {
                        "card_id": updated_card.id,
                        "card_title": updated_card.title,
                        "url": f"/cards/{updated_card.id}"
                    }
                })
            except Exception as e:
                print(f"[NOTIFICATION] Erro ao notificar novo responsável: {e}")

        # Envia notificação ao novo SDR se o sdr_id foi alterado
        if (
            "sdr_id" in update_data_fields
            and old_sdr_id != updated_card.sdr_id
            and updated_card.sdr_id is not None
        ):
            try:
                self.notification_repository.create({
                    "user_id": updated_card.sdr_id,
                    "notification_type": "card_assigned",
                    "title": "Card atribuído a você",
                    "message": f"O card '{updated_card.title}' foi atribuído a você como SDR",
                    "icon": "bell",
                    "color": "info",
                    "notification_metadata": {
                        "card_id": updated_card.id,
                        "card_title": updated_card.title,
                        "url": f"/cards/{updated_card.id}"
                    }
                })
            except Exception as e:
                print(f"[NOTIFICATION] Erro ao notificar novo SDR: {e}")

        # Registra no histórico as alterações realizadas nos campos do card
        try:
            activities_to_log = []

            # Verifica cada campo do snapshot e registra o que mudou
            if "title" in changes_snapshot and changes_snapshot["title"] != updated_card.title:
                old_val = changes_snapshot["title"] or ""
                activities_to_log.append({
                    "type": "card_title_changed",
                    "description": f"Título alterado: <strong>{old_val}</strong> → <strong>{updated_card.title}</strong>",
                    "metadata": {"old_title": old_val, "new_title": updated_card.title}
                })

            if "value" in changes_snapshot and changes_snapshot["value"] != updated_card.value:
                # Converte para float pois o PostgreSQL retorna NUMERIC como Decimal (não serializável em JSON)
                old_val = float(changes_snapshot["value"] or 0)
                new_val = float(updated_card.value or 0)
                # Formata no padrão brasileiro (R$ 1.234,56)
                old_str = f"R$ {old_val:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
                new_str = f"R$ {new_val:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
                activities_to_log.append({
                    "type": "card_value_changed",
                    "description": f"Valor alterado: <strong>{old_str}</strong> → <strong>{new_str}</strong>",
                    "metadata": {"old_value": old_val, "new_value": new_val}
                })

            if "assigned_to_id" in changes_snapshot and changes_snapshot["assigned_to_id"] != updated_card.assigned_to_id:
                old_uid = changes_snapshot["assigned_to_id"]
                new_uid = updated_card.assigned_to_id
                old_user_obj = self.db.query(User).filter(User.id == old_uid).first() if old_uid else None
                new_user_obj = self.db.query(User).filter(User.id == new_uid).first() if new_uid else None
                old_name = old_user_obj.name if old_user_obj else "Ninguém"
                new_name = new_user_obj.name if new_user_obj else "Ninguém"
                activities_to_log.append({
                    "type": "card_assigned_changed",
                    "description": f"Responsável alterado: <strong>{old_name}</strong> → <strong>{new_name}</strong>",
                    "metadata": {"old_user": old_name, "new_user": new_name}
                })

            if "due_date" in changes_snapshot and changes_snapshot["due_date"] != updated_card.due_date:
                old_date = changes_snapshot["due_date"]
                new_date = updated_card.due_date
                old_str = old_date.strftime("%d/%m/%Y") if old_date else "Não definida"
                new_str = new_date.strftime("%d/%m/%Y") if new_date else "Removida"
                activities_to_log.append({
                    "type": "card_due_date_changed",
                    "description": f"Data de vencimento: <strong>{old_str}</strong> → <strong>{new_str}</strong>",
                    "metadata": {}
                })

            if not old_is_won and updated_card.is_won:
                activities_to_log.append({
                    "type": "card_won",
                    "description": "Card marcado como <strong>Ganho</strong>",
                    "metadata": {}
                })

            if not old_is_lost and updated_card.is_lost:
                activities_to_log.append({
                    "type": "card_lost",
                    "description": "Card marcado como <strong>Perdido</strong>",
                    "metadata": {}
                })

            for act in activities_to_log:
                self.activity_repository.create(
                    card_id=card_id,
                    user_id=current_user.id,
                    activity_type=act["type"],
                    description=act["description"],
                    activity_metadata=act["metadata"]
                )

        except Exception as e:
            # Rollback necessário: se o insert de Activity falhou, a sessão fica em estado
            # "needs rollback" no SQLAlchemy, o que causaria 500 ao serializar updated_card
            self.db.rollback()
            print(f"[ACTIVITY] Erro ao registrar alterações no histórico: {e}")

        return updated_card

    def delete_card(self, card_id: int, current_user: User) -> None:
        """
        Deleta um card.

        Args:
            card_id: ID do card
            current_user: Usuário autenticado

        Raises:
            HTTPException: Se não tiver permissão para deletar
        """
        # Verifica permissão: apenas admins e managers podem deletar cards
        if current_user.role and current_user.role.name not in ["admin", "manager"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não tem permissão para deletar cards"
            )

        # Busca e verifica acesso (inclui verificação de role)
        card = self.get_card_by_id(card_id, current_user)

        # Deleta o card
        self.card_repository.delete(card)

    def _validate_stage_advancement(
        self,
        card: Card,
        source_list,
        target_list,
    ) -> None:
        """
        Valida as regras de movimentação de card entre etapas do pipeline.

        Para o board 6 (Prospecção), usa um mapa explícito de transições permitidas,
        pois o fluxo não é estritamente sequencial — "Reagendamento" é uma etapa de
        retorno (populada pelo botão No Show) e não faz parte do avanço normal:

            Lead Novo → Prospecção → Conectado → Agendado (→ board Aquisição)
                                                 ↑
                                          Reagendamento  (retorno via No Show)

        Para outros boards, aplica a regra genérica de "só próxima etapa".

        Raises:
            HTTPException 403: Se tentar fazer uma transição não permitida
            HTTPException 422: Se os critérios de avanço não estiverem preenchidos
        """
        from app.models.list import List as ListModel
        from app.models.client import Client
        from app.models.person import Person
        from app.models.api4com import CallLog
        from app.models.card_task import CardTask, TaskType
        from app.models.card_note import CardNote
        from app.models.attachment import Attachment
        from app.models.card_product import CardProduct
        from app.models.product import Product

        # Busca todas as listas do board de origem ordenadas por posição
        board_lists = (
            self.db.query(ListModel)
            .filter(ListModel.board_id == source_list.board_id)
            .order_by(ListModel.position.asc())
            .all()
        )

        # Determina os índices de origem e destino no pipeline
        source_index = next(
            (i for i, l in enumerate(board_lists) if l.id == source_list.id), None
        )
        target_index = next(
            (i for i, l in enumerate(board_lists) if l.id == target_list.id), None
        )

        if source_index is None or target_index is None:
            return  # Não conseguiu mapear, deixa passar

        # ── Validação de transição ──────────────────────────────────────────────
        #
        # Board 6: mapa explícito de transições (source_index → [target_indices])
        # Qualquer combinação fora do mapa é bloqueada.
        #
        # Board outros: regra genérica — só pode avançar para a próxima posição.
        # ───────────────────────────────────────────────────────────────────────
        if source_list.board_id == 6:
            # Mapa de transições permitidas por índice de origem no board 6.
            # "Reagendamento" (índice 3) não recebe cards pelo pipeline normal —
            # é populado exclusivamente pelo botão No Show no board de Aquisição.
            allowed_transitions = {
                0: [1],  # Lead Novo       → Prospecção
                1: [2],  # Prospecção      → Conectado
                2: [4],  # Conectado       → Agendado (pula Reagendamento propositalmente)
                3: [4],  # Reagendamento   → Agendado (SDR reagendando após No Show)
            }
            allowed = allowed_transitions.get(source_index, [])

            if target_index not in allowed:
                if target_index < source_index:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Não é permitido voltar etapas pelo pipeline.",
                    )
                # Indica qual é o destino correto para a etapa de origem
                correct_targets = ", ".join(
                    f"'{board_lists[i].name}'" for i in allowed if i < len(board_lists)
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=(
                        f"Transição não permitida. "
                        f"De '{source_list.name}', o destino correto é: {correct_targets}."
                    ),
                )
        else:
            # Regra genérica para outros boards: só próxima etapa
            if target_index != source_index + 1:
                if target_index < source_index:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Não é permitido voltar etapas pelo pipeline.",
                    )
                next_list = board_lists[source_index + 1]
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=(
                        f"Não é permitido pular etapas. "
                        f"Avance o negócio para a próxima etapa: '{next_list.name}'."
                    ),
                )

        # ── Validações por etapa de origem (CUMULATIVAS para Board 6) ──────────
        #
        # As regras são acumuladas conforme o card avança no pipeline:
        # - etapa 0 → valida apenas regras da etapa 0
        # - etapa 1 → valida etapa 0 + etapa 1
        # - etapa 2 → valida etapa 0 + etapa 1 + etapa 2
        #
        # Isso garante que campos obrigatórios permaneçam preenchidos mesmo após
        # o avanço inicial. Produto só é exigido a partir da etapa 2.
        #
        if source_list.board_id == 6 and source_index in (0, 1, 2):
            missing = []
            MIN_NOTE_LENGTH = 20

            # ── Etapa 0: Lead Novo → Prospecção ───────────────────────────────
            # Empresa: nome, tipo de relacionamento, segmento
            # Contato: nome, e-mail, cargo, área
            # Negócio: canal de aquisição, detalhamento, tipo de negócio
            if not card.client_id:
                missing.append("empresa vinculada ao negócio")
            else:
                client = self.db.query(Client).filter(Client.id == card.client_id).first()
                if client:
                    if not (client.name or "").strip():
                        missing.append("nome da empresa")
                    if not (client.relationship_type or "").strip():
                        missing.append("tipo de relacionamento da empresa")
                    if not (client.sector or "").strip():
                        missing.append("segmento da empresa")

            if not card.person_id:
                missing.append("contato vinculado ao negócio")
            else:
                person = self.db.query(Person).filter(Person.id == card.person_id).first()
                if person:
                    if not (person.name or "").strip():
                        missing.append("nome do contato")
                    # Aceita qualquer campo de e-mail preenchido
                    has_email = any([
                        (person.email or "").strip(),
                        (person.email_commercial or "").strip(),
                        (person.email_personal or "").strip(),
                        (person.email_alternative or "").strip(),
                    ])
                    if not has_email:
                        missing.append("e-mail do contato")
                    if not (person.position or "").strip():
                        missing.append("cargo do contato")
                    if not (person.area or "").strip():
                        missing.append("área/departamento do contato")

            if not (card.acquisition_channel or "").strip():
                missing.append("canal de aquisição")
            if not (card.acquisition_channel_detail or "").strip():
                missing.append("canal de aquisição - detalhamento")
            if not (card.deal_type or "").strip():
                missing.append("tipo de negócio")

            # ── Etapa 1: Prospecção → Conectado (e etapas seguintes) ──────────
            # Evidência de contato efetivo: ligação VOIP, task de ligação concluída,
            # ou nota com ao menos 20 caracteres
            if source_index >= 1:
                has_completed_call = (
                    self.db.query(CallLog)
                    .filter(CallLog.card_id == card.id, CallLog.status == "completed")
                    .first()
                ) is not None

                has_completed_call_task = (
                    self.db.query(CardTask)
                    .filter(
                        CardTask.card_id == card.id,
                        CardTask.task_type == TaskType.CALL,
                        CardTask.is_completed == True,  # noqa: E712
                    )
                    .first()
                ) is not None

                notes = self.db.query(CardNote).filter(CardNote.card_id == card.id).all()
                has_valid_note = any(
                    len((n.content or "").strip()) >= MIN_NOTE_LENGTH for n in notes
                )

                if not (has_completed_call or has_completed_call_task or has_valid_note):
                    missing.append(
                        f"evidência de contato efetivo (ligação VOIP concluída, tarefa de "
                        f"ligação marcada como feita, ou nota com ao menos {MIN_NOTE_LENGTH} caracteres)"
                    )

            # ── Etapa 2: Conectado → Agendado (e etapas seguintes) ────────────
            # Produto obrigatório, vendedor responsável, reunião se Phoebus,
            # nota do problema, implementação, pessoas para manusear,
            # colaboradores e status do cliente
            if source_index >= 2:
                # Busca produtos vinculados ao card com join no catálogo
                card_products = (
                    self.db.query(CardProduct)
                    .join(Product, CardProduct.product_id == Product.id)
                    .filter(CardProduct.card_id == card.id)
                    .all()
                )
                product_names = [cp.product.name or "" for cp in card_products]

                # Ao menos 1 produto vinculado ao negócio
                if not card_products:
                    missing.append("ao menos 1 produto vinculado ao negócio")

                # Task de reunião: obrigatória APENAS quando há produto Phoebus vinculado
                has_phoebus = any("phoebus" in name.lower() for name in product_names)
                if has_phoebus:
                    has_meeting_task = (
                        self.db.query(CardTask)
                        .filter(
                            CardTask.card_id == card.id,
                            CardTask.task_type == TaskType.MEETING,
                        )
                        .first()
                    ) is not None
                    if not has_meeting_task:
                        missing.append(
                            "tarefa de reunião no card "
                            "(obrigatório pois há produto Phoebus vinculado)"
                        )

                # Nota documentando o problema identificado
                # has_valid_note já calculado no bloco da etapa 1 (source_index >= 1)
                if not has_valid_note:
                    missing.append(
                        f"nota com ao menos {MIN_NOTE_LENGTH} caracteres "
                        "descrevendo o problema identificado"
                    )

                # Vendedor responsável vinculado ao negócio
                if not card.assigned_to_id:
                    missing.append("vendedor responsável vinculado ao negócio")

                # Campos do negócio: implementação e pessoas para manusear
                # (inteiros: null = não respondido, 0 ou 1 = respondido)
                if card.has_implementation is None:
                    missing.append("implementação (negócio)")
                if card.has_personnel is None:
                    missing.append("se tem pessoas para manusear (negócio)")

                # Campos adicionais da empresa para esta etapa
                # (relationship_type já validado na etapa 0)
                if card.client_id:
                    client_e2 = self.db.query(Client).filter(Client.id == card.client_id).first()
                    if client_e2:
                        if not (client_e2.employee_count or "").strip():
                            missing.append("número de colaboradores da empresa")
                        if not (client_e2.commercial_activity or "").strip():
                            missing.append("status do cliente da empresa")

            if missing:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=(
                        f"Para avançar para '{target_list.name}', preencha: "
                        f"{', '.join(missing)}."
                    ),
                )

        # Etapa 4 — Reagendamento → Agendado:
        # o No Show marca a reunião anterior como concluída, então o card chega aqui
        # sem nenhuma task de reunião pendente. O SDR precisa criar uma nova.
        # Condição: task de reunião com is_completed = False (nova reunião agendada)
        elif source_list.board_id == 6 and source_index == 3:
            has_pending_meeting_task = (
                self.db.query(CardTask)
                .filter(
                    CardTask.card_id == card.id,
                    CardTask.task_type == TaskType.MEETING,
                    CardTask.is_completed == False,  # noqa: E712
                )
                .first()
            ) is not None

            if not has_pending_meeting_task:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=(
                        f"Para avançar para '{target_list.name}', crie uma nova tarefa "
                        "de reunião no card para reagendar o encontro."
                    ),
                )

        # ── Board 7 — Aquisição ────────────────────────────────────────────────
        # Fluxo sequencial: Reunião Agendada → Qualificação → Diagnóstico e Proposta
        #                   → Negociação → (Negócio Ganho/Perdido via botões)
        #
        # Transições permitidas (por índice na lista ordenada do board):
        #   0 → 1  Reunião Agendada  → Qualificação
        #   1 → 2  Qualificação      → Diagnóstico e Proposta
        #   2 → 3  Diagnóstico e Proposta → Negociação
        #   3 → 4  Negociação        → Negócio Ganho  (terminal, não passa por aqui)
        # Negócio Ganho e Negócio Perdido são excluídos antes de chegar neste método.
        elif source_list.board_id == 7:
            allowed_transitions_b7 = {
                0: [1],  # Reunião Agendada    → Qualificação
                1: [2],  # Qualificação        → Diagnóstico e Proposta
                2: [3],  # Diagnóstico e Proposta → Negociação
            }

            # Negociação (index 3) não possui próxima etapa pelo pipeline —
            # o encerramento do negócio é feito pelos botões dedicados Ganho/Perdido
            if source_index not in allowed_transitions_b7:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=(
                        f"A etapa '{source_list.name}' não possui próxima etapa no pipeline. "
                        "Para encerrar o negócio, use os botões 'Ganho' ou 'Perdido'."
                    ),
                )

            allowed_b7 = allowed_transitions_b7[source_index]

            if target_index not in allowed_b7:
                if target_index < source_index:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Não é permitido voltar etapas pelo pipeline.",
                    )
                correct_targets = ", ".join(
                    f"'{board_lists[i].name}'"
                    for i in allowed_b7
                    if i < len(board_lists)
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=(
                        f"Transição não permitida. "
                        f"De '{source_list.name}', o destino correto é: {correct_targets}."
                    ),
                )

            # Reunião Agendada → Qualificação:
            # nenhuma task de reunião pode estar pendente — prova que a reunião aconteceu
            if source_index == 0:
                has_pending_meeting = (
                    self.db.query(CardTask)
                    .filter(
                        CardTask.card_id == card.id,
                        CardTask.task_type == TaskType.MEETING,
                        CardTask.is_completed == False,  # noqa: E712
                    )
                    .first()
                ) is not None

                if has_pending_meeting:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=(
                            f"Para avançar para '{target_list.name}', a reunião agendada "
                            "precisa ser concluída primeiro. Se o lead não compareceu, "
                            "use o botão 'No Show'."
                        ),
                    )

            # Diagnóstico e Proposta → Negociação:
            # 1. Proposta Comercial em PDF deve estar anexada ao card
            # 2. Deve existir ao menos uma task de follow-up pendente (não concluída)
            elif source_index == 2:
                has_proposal = (
                    self.db.query(Attachment)
                    .filter(
                        Attachment.card_id == card.id,
                        Attachment.attachment_type == 'proposal',
                        Attachment.deleted_at.is_(None),
                    )
                    .first()
                ) is not None

                has_pending_followup = (
                    self.db.query(CardTask)
                    .filter(
                        CardTask.card_id == card.id,
                        CardTask.task_type == TaskType.FOLLOW_UP,
                        CardTask.is_completed == False,  # noqa: E712
                    )
                    .first()
                ) is not None

                missing = []
                if not has_proposal:
                    missing.append(
                        "anexar a Proposta Comercial em PDF (seção 'Resumo' do card)"
                    )
                if not has_pending_followup:
                    missing.append(
                        "criar uma tarefa de follow-up pendente no card"
                    )

                if missing:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=(
                            f"Para avançar para '{target_list.name}', é necessário: "
                            f"{'; '.join(missing)}."
                        ),
                    )

    def move_card(self, card_id: int, target_list_id: int, position: Optional[int], current_user: User) -> Card:
        """
        Move um card para outra lista.

        Args:
            card_id: ID do card
            target_list_id: ID da lista de destino
            position: Posição na lista de destino
            current_user: Usuário autenticado

        Returns:
            Card movido
        """
        from datetime import datetime

        # Busca e verifica acesso ao card (inclui verificação de role)
        card = self.get_card_by_id(card_id, current_user)

        # Verifica se a lista de destino existe e pertence à mesma conta
        target_list = self.list_repository.find_by_id(target_list_id)
        if not target_list:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lista de destino não encontrada"
            )

        target_board = self.board_repository.find_by_id(target_list.board_id)
        if not target_board:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Board não encontrado"
            )

        # Guarda lista de origem para parabenização
        source_list = self.list_repository.find_by_id(card.list_id)
        source_list_name = source_list.name if source_list else "Lista"
        source_board = self.board_repository.find_by_id(source_list.board_id) if source_list else None

        # Aplica regras de movimentação para usuários não privilegiados.
        # Admin e Manager passam livremente; demais roles seguem as regras de pipeline.
        is_privileged = (
            current_user.role and current_user.role.name in ("admin", "manager")
        )
        if not is_privileged and source_list and source_board:
            # Impede saída de estágios terminais (Negócio Ganho / Negócio Perdido).
            # Uma vez que o card chega lá, só Admin/Manager pode movê-lo.
            # Movimento para terminais (Ganho/Perdido) continua permitido — os botões
            # dedicados "Marcar como Ganho/Perdido" usam o mesmo move_card internamente.
            # O pipeline visual esconde essas etapas para usuários não privilegiados.
            if source_list.is_done_stage or source_list.is_lost_stage:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=(
                        f"O negócio está em '{source_list.name}' e não pode ser movido. "
                        "Solicite ao administrador caso precise reabrir."
                    ),
                )

            # Valida as regras de pipeline dentro do mesmo board,
            # exceto quando o destino é um estágio terminal (tratado pelos botões dedicados)
            target_is_terminal = target_list.is_done_stage or target_list.is_lost_stage
            if source_list.board_id == target_list.board_id and not target_is_terminal:
                self._validate_stage_advancement(card, source_list, target_list)

        # Preenche data de entrada no board se estiver mudando de board
        if source_board and source_board.id != target_board.id:
            now = datetime.now()

            # Só preenche se ainda não tiver data (evita sobrescrever)
            if target_board.id == 6 and not card.prospection_entry_date:  # Prospecção
                card.prospection_entry_date = now
            elif target_board.id == 7 and not card.acquisition_entry_date:  # Aquisição
                card.acquisition_entry_date = now
            elif target_board.id == 8 and not card.expansion_entry_date:  # Expansão (Pós Venda)
                card.expansion_entry_date = now

            self.db.commit()
            self.db.refresh(card)

        # Verifica se a lista de destino é uma lista "won" ou "lost"
        # e marca o card adequadamente
        points_awarded = 0
        if target_list.is_done_stage:
            card.is_won = 1  # 1 = ganho (Integer no banco)
            card.closed_at = datetime.now()  # won_at é uma property que usa closed_at
            points_awarded = 20  # Pontos por ganhar card
        elif target_list.is_lost_stage:
            card.is_won = -1  # -1 = perdido (Integer no banco)
            card.closed_at = datetime.now()  # lost_at é uma property que usa closed_at
        else:
            points_awarded = 2  # Pontos por mover card

        # Move o card
        moved_card = self.card_repository.move_to_list(card, target_list_id, position)

        # Registra movimentação no histórico de listas
        try:
            from app.models.card_list_history import CardListHistory
            from datetime import datetime as _dt
            history_now = _dt.utcnow()

            # Fecha o registro aberto anterior (se existir)
            open_entry = (
                self.db.query(CardListHistory)
                .filter(
                    CardListHistory.card_id == card_id,
                    CardListHistory.exited_at == None,  # noqa: E711
                )
                .first()
            )
            if open_entry:
                open_entry.exited_at = history_now

            # Cria novo registro de entrada na lista de destino
            new_entry = CardListHistory(
                card_id=card_id,
                list_id=target_list_id,
                board_id=target_board.id,
                entered_at=history_now,
            )
            self.db.add(new_entry)
            self.db.commit()
        except Exception as e:
            print(f"[CARD_LIST_HISTORY] Erro ao registrar movimentação: {e}")

        # Atribui pontos e cria parabenização (se card tiver responsável)
        if moved_card.assigned_to_id:
            try:
                # Import lazy para evitar importação circular
                from app.services.gamification_service import GamificationService
                gamification_service = GamificationService(self.db)

                # Atribui pontos
                reason = "card_won" if target_list.is_done_stage else "card_moved"
                gamification_service.award_points(
                    user_id=moved_card.assigned_to_id,
                    reason=reason,
                    description=f"Card '{moved_card.title}' movido de '{source_list_name}' para '{target_list.name}'",
                    custom_points=points_awarded
                )


            except Exception as e:
                # Log erro mas não quebra o fluxo principal
                print(f"Erro ao criar parabenização: {e}")

        # Dispara automações baseado no tipo de movimento
        try:
            AutomationService = get_automation_service()
            automation_service = AutomationService(self.db)

            # Sempre dispara card_moved
            automation_service.process_trigger(
                board_id=target_board.id,
                trigger_event="card_moved",
                card=moved_card,
                user=current_user,
                trigger_data={"to_list_id": target_list_id}
            )

            # Dispara eventos específicos se aplicável
            if target_list.is_done_stage:
                automation_service.process_trigger(
                    board_id=target_board.id,
                    trigger_event="card_won",
                    card=moved_card,
                    user=current_user,
                    trigger_data={}
                )
            elif target_list.is_lost_stage:
                automation_service.process_trigger(
                    board_id=target_board.id,
                    trigger_event="card_lost",
                    card=moved_card,
                    user=current_user,
                    trigger_data={}
                )
        except Exception as e:
            # Log do erro mas não falha o movimento do card
            print(f"Erro ao disparar automações: {e}")
            import traceback
            traceback.print_exc()

        # Registra no histórico de atividades do card
        try:
            if target_list.is_done_stage:
                act_type = "card_won"
                act_desc = f"Card ganho: movido para <strong>{target_list.name}</strong>"
            elif target_list.is_lost_stage:
                act_type = "card_lost"
                act_desc = f"Card perdido: movido para <strong>{target_list.name}</strong>"
            else:
                act_type = "card_moved"
                act_desc = f"Etapa alterada: <strong>{source_list_name}</strong> → <strong>{target_list.name}</strong>"

            self.activity_repository.create(
                card_id=card_id,
                user_id=current_user.id,
                activity_type=act_type,
                description=act_desc,
                activity_metadata={
                    "from_list": source_list_name,
                    "to_list": target_list.name,
                    # IDs incluídos para facilitar queries de relatório
                    "from_list_id": source_list.id if source_list else None,
                    "to_list_id": target_list.id,
                    "from_board_id": source_board.id if source_board else None,
                    "to_board_id": target_board.id,
                }
            )
        except Exception as e:
            print(f"[ACTIVITY] Erro ao registrar movimento de card no histórico: {e}")

        return moved_card

    def _generate_congratulation_message(
        self,
        card: Card,
        source_list_name: str,
        target_list_name: str,
        points_awarded: int,
        is_won: bool
    ) -> str:
        """
        Gera mensagem de parabenização personalizada.

        Args:
            card: Card movido
            source_list_name: Nome da lista de origem
            target_list_name: Nome da lista de destino
            points_awarded: Pontos ganhos
            is_won: Se o card foi ganho

        Returns:
            Mensagem de parabenização
        """
        if is_won:
            return (
                f"🎉 Você ganhou o card '{card.title}'! "
                f"Avançou de '{source_list_name}' para '{target_list_name}' "
                f"e ganhou +{points_awarded} pontos!"
            )
        else:
            return (
                f"✨ Card '{card.title}' avançou de '{source_list_name}' para '{target_list_name}'! "
                f"Continue assim e ganhe +{points_awarded} pontos!"
            )

    def assign_card(self, card_id: int, user_id: Optional[int], current_user: User) -> Card:
        """
        Atribui um card a um usuário ou desatribui se user_id for None.

        Args:
            card_id: ID do card
            user_id: ID do usuário (None para desatribuir)
            current_user: Usuário autenticado

        Returns:
            Card atualizado
        """
        # Busca e verifica acesso ao card (valida role do usuário)
        card = self.get_card_by_id(card_id, current_user)

        # Se user_id é None, desatribui o card
        if user_id is None:
            assigned_card = self.card_repository.assign_to_user(card, None)
            return assigned_card

        # Verifica se o usuário existe
        from app.models.user import User
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado"
            )

        # Atribui o card
        old_assigned_to_id = card.assigned_to_id
        assigned_card = self.card_repository.assign_to_user(card, user_id)

        # Notifica o novo responsável se a atribuição realmente mudou
        if old_assigned_to_id != user_id:
            try:
                self.notification_repository.create({
                    "user_id": user_id,
                    "notification_type": "card_assigned",
                    "title": "Card atribuído a você",
                    "message": f"O card '{assigned_card.title}' foi atribuído a você",
                    "icon": "bell",
                    "color": "info",
                    "notification_metadata": {
                        "card_id": assigned_card.id,
                        "card_title": assigned_card.title,
                        "url": f"/cards/{assigned_card.id}"
                    }
                })
            except Exception as e:
                print(f"[NOTIFICATION] Erro ao notificar atribuição de card: {e}")

        return assigned_card

    # ========== CAMPOS CUSTOMIZADOS ==========

    def add_or_update_field_value(
        self,
        card_id: int,
        field_data: CardFieldValueCreate,
        current_user: User
    ) -> CardFieldValueResponse:
        """
        Adiciona ou atualiza o valor de um campo customizado em um card.

        Args:
            card_id: ID do card
            field_data: Dados do campo (aceita dois formatos)
            current_user: Usuário autenticado

        Returns:
            CardFieldValueResponse
        """
        from app.schemas.field import FieldDefinitionCreate

        # Verifica acesso ao card (valida role do usuário)
        card = self.get_card_by_id(card_id, current_user)

        # Busca o board do card
        list_obj = self.list_repository.find_by_id(card.list_id)
        board_id = list_obj.board_id if list_obj else None

        if not board_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Board não encontrado"
            )

        # Determina qual formato foi usado e obtém/cria a field_definition
        field_def = None

        if field_data.field_name and field_data.field_type is not None:
            # Formato 2: Usando field_name (busca ou cria definição)
            field_def = self.field_repository.find_definition_by_name_and_board(
                field_data.field_name,
                board_id
            )

            if not field_def:
                # Cria nova definição
                new_def = FieldDefinitionCreate(
                    name=field_data.field_name,
                    field_type=field_data.field_type,
                    board_id=board_id,
                    is_required=False
                )
                field_def = self.field_repository.create_definition(new_def)

            # Converte para o formato esperado pelo repositório
            field_data.field_definition_id = field_def.id
            field_data.value = field_data.field_value

        elif field_data.field_definition_id:
            # Formato 1: Usando field_definition_id
            field_def = self.field_repository.find_definition_by_id(field_data.field_definition_id)
            if not field_def:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Definição de campo não encontrada"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Você deve fornecer field_definition_id ou (field_name + field_type)"
            )

        # Cria ou atualiza o valor
        field_value = self.field_repository.create_or_update_value(card_id, field_data)

        # Dispara trigger field_changed para automações
        try:
            AutomationService = get_automation_service()
            automation_service = AutomationService(self.db)
            automation_service.process_trigger(
                board_id=board_id,
                trigger_event="field_changed",
                card=card,
                user=current_user,
                trigger_data={
                    "field_definition_id": field_value.field_definition_id,
                    "field_name": field_def.name if field_def else None,
                    "new_value": field_value.value
                }
            )
        except Exception as e:
            # Log do erro mas não falha a atualização do campo
            print(f"[AUTOMATION] Erro ao disparar trigger field_changed: {e}")

        return CardFieldValueResponse(
            id=field_value.id,
            card_id=field_value.card_id,
            field_definition_id=field_value.field_definition_id,
            value=field_value.value,
            created_at=field_value.created_at,
            updated_at=field_value.updated_at,
            field_name=field_def.name,
            field_type=field_def.field_type
        )

    def get_card_field_values(self, card_id: int, current_user: User) -> List[CardFieldValueResponse]:
        """
        Lista todos os valores de campos customizados de um card.

        Args:
            card_id: ID do card
            current_user: Usuário autenticado

        Returns:
            Lista de CardFieldValueResponse
        """
        # Verifica acesso ao card
        card = self.get_card_by_id(card_id)

        # Busca valores
        field_values = self.field_repository.list_values_by_card(card_id)

        # Converte para response
        result = []
        for fv in field_values:
            field_def = self.field_repository.find_definition_by_id(fv.field_definition_id)
            result.append(
                CardFieldValueResponse(
                    id=fv.id,
                    card_id=fv.card_id,
                    field_definition_id=fv.field_definition_id,
                    value=fv.value,
                    created_at=fv.created_at,
                    updated_at=fv.updated_at,
                    field_name=field_def.name if field_def else None,
                    field_type=field_def.field_type if field_def else None
                )
            )

        return result

    def get_card_expanded(self, card_id: int, current_user: User) -> dict:
        """
        Busca um card com todos os relacionamentos carregados.
        Ideal para a página CardDetails.

        Args:
            card_id: ID do card
            current_user: Usuário atual

        Returns:
            Dict com card e relacionamentos

        Raises:
            HTTPException: Se não encontrado
        """
        from app.repositories.card_task_repository import CardTaskRepository
        from app.repositories.product_repository import ProductRepository

        # Busca o card (inclui verificação de role via current_user)
        card = self.get_card_by_id(card_id, current_user)

        # Busca relacionamentos
        card_task_repo = CardTaskRepository(self.db)
        product_repo = ProductRepository(self.db)

        # Custom field values
        custom_field_values = self.get_card_field_values(card_id, current_user)

        # Tarefas pendentes
        pending_tasks = card_task_repo.get_pending_by_card(card_id, limit=None)
        pending_tasks_count = len(pending_tasks)

        # Produtos
        card_products = product_repo.list_card_products(card_id)
        products_totals = product_repo.get_card_products_total(card_id)

        # Atividades recentes do histórico (últimas 50)
        activities_list = self.activity_repository.get_by_card(card_id, limit=50)
        recent_activities = [
            {
                "id": act.id,
                "activity_type": act.activity_type,
                "description": act.description,
                "activity_metadata": act.activity_metadata or {},
                "user": {"id": act.user.id, "name": act.user.name} if act.user else None,
                "created_at": act.created_at.isoformat() if act.created_at else None
            }
            for act in activities_list
        ]

        # Anotações (notes)
        from app.repositories.card_note_repository import CardNoteRepository
        note_repo = CardNoteRepository(self.db)
        card_notes = note_repo.get_by_card(card_id)
        notes = [
            {
                "id": note.id,
                "content": note.content,
                "note_type": note.note_type,
                "created_at": note.created_at.isoformat() if note.created_at else None,
                "updated_at": note.updated_at.isoformat() if note.updated_at else None,
                "user_name": note.user.name if note.user else None
            }
            for note in card_notes
        ]

        # Busca informações relacionadas
        list_obj = self.list_repository.find_by_id(card.list_id)
        board = self.board_repository.find_by_id(list_obj.board_id) if list_obj else None

        # Monta a resposta
        response_data = {
            # Dados básicos do card
            "id": card.id,
            "title": card.title,
            "description": card.description,
            "list_id": card.list_id,
            "client_id": card.client_id,
            "person_id": card.person_id,
            "assigned_to_id": card.assigned_to_id,
            "sdr_id": card.sdr_id,  # ✅ Incluído campo sdr_id
            "value": float(card.value) if card.value else None,
            "due_date": card.due_date,
            "payment_info": card.payment_info,
            "contact_info": card.contact_info,  # ✅ Incluído campo contact_info
            "is_won": card.is_won == 1,
            "is_lost": card.is_lost,
            "won_at": card.won_at,
            "lost_at": card.lost_at,
            "position": float(card.position),
            "created_at": card.created_at,
            "updated_at": card.updated_at,

            # Campos do blueprint da consultora
            "prospection_entry_date": card.prospection_entry_date,
            "acquisition_entry_date": card.acquisition_entry_date,
            "expansion_entry_date": card.expansion_entry_date,
            "deal_type": card.deal_type,
            "acquisition_channel": card.acquisition_channel,
            "acquisition_channel_detail": card.acquisition_channel_detail,
            "utm_params": card.utm_params,
            "loss_reason": card.loss_reason,
            "has_implementation": card.has_implementation,
            "has_personnel": card.has_personnel,

            # Campos de rastreamento de origem (integração n8n / RD Station)
            "origin": card.origin,
            "utm_campaign": card.utm_campaign,
            "utm_source": card.utm_source,
            "utm_term": card.utm_term,

            # Informações relacionadas
            "assigned_to_name": card.assigned_to.name if card.assigned_to else None,
            "sdr_name": card.sdr.name if card.sdr else None,  # ✅ Nome do SDR
            "list_name": list_obj.name if list_obj else None,
            "board_id": board.id if board else None,
            "client_name": card.client.name if card.client else None,
            "person_name": card.person.name if card.person else None,

            # Relacionamentos expandidos
            "custom_field_values": [
                {
                    "id": cfv.id,
                    "field_definition_id": cfv.field_definition_id,
                    "field_name": cfv.field_name,
                    "field_type": cfv.field_type,
                    "value": cfv.value
                }
                for cfv in custom_field_values
            ],
            "pending_tasks": [
                {
                    "id": task.id,
                    "title": task.title,
                    "description": task.description,
                    "task_type": task.task_type.value if hasattr(task.task_type, 'value') else task.task_type,
                    "priority": task.priority.value if hasattr(task.priority, 'value') else task.priority,
                    "due_date": task.due_date,
                    "duration_minutes": task.duration_minutes,
                    "location": task.location,
                    "video_link": task.video_link,
                    "notes": task.notes,
                    "contact_name": task.contact_name,
                    "status": task.status.value if hasattr(task.status, 'value') else task.status,
                    "assigned_to_name": task.assigned_to.name if task.assigned_to else None,
                    "is_overdue": task.is_overdue
                }
                for task in pending_tasks
            ],
            "pending_tasks_count": pending_tasks_count,
            "products": [
                {
                    "id": cp.id,
                    "product_id": cp.product_id,
                    "product_name": cp.product.name if cp.product else None,
                    "product_sku": cp.product.sku if cp.product else None,
                    "quantity": cp.quantity,
                    "unit_price": float(cp.unit_price),
                    "discount": float(cp.discount),
                    "subtotal": cp.subtotal,
                    "total": cp.total
                }
                for cp in card_products
            ],
            # Soma o frete ao total de produtos para refletir o valor real do negócio
            "products_total": products_totals["total"] + (float(card.shipping_cost) if card.shipping_cost else 0),
            "shipping_cost": float(card.shipping_cost) if card.shipping_cost else None,
            "recent_activities": recent_activities,
            "notes": notes
        }

        return response_data

    def reopen_card(self, card_id: int, reopen_data, current_user: User) -> Card:
        """
        Reabre um negócio perdido criando um clone na lista de destino (list_id=22, board_id=6).

        O card original permanece inalterado (continua perdido).
        O clone herda os dados completos do original:
        - Dados básicos: cliente, pessoa, responsável, SDR, valor, descrição, deal_type
        - Informações de contato (contact_info)
        - Campos customizados (card_field_values)
        - Tarefas/atividades (card_tasks)
        - Anotações (card_notes)
        - Arquivos/anexos (attachments - os registros apontam para os mesmos arquivos físicos)

        Canal de aquisição é sempre "Base" com detalhamento escolhido pelo vendedor.

        Args:
            card_id: ID do card perdido (original)
            reopen_data: CardReopenRequest com title e acquisition_channel_detail
            current_user: Usuário autenticado

        Returns:
            Novo card criado (clone)

        Raises:
            HTTPException: Se o card não existir ou não estiver perdido
        """
        from app.schemas.card import CardCreate
        from app.models.card_field_value import CardFieldValue
        from app.models.card_task import CardTask
        from app.models.card_note import CardNote
        from app.models.attachment import Attachment
        from app.models.card_product import CardProduct

        # ID fixo da lista de destino (Prospecção - board_id=6)
        TARGET_LIST_ID = 22

        # Busca e valida o card original
        original_card = self.get_card_by_id(card_id)

        if not original_card.is_lost:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Apenas negócios perdidos podem ser reabertos"
            )

        # Verifica se a lista de destino existe
        target_list = self.list_repository.find_by_id(TARGET_LIST_ID)
        if not target_list:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Lista de destino (ID {TARGET_LIST_ID}) não encontrada"
            )

        # Monta os dados do clone copiando campos relevantes do original.
        # client_id e person_id são intencionalmente omitidos aqui: o create_card
        # aplica validações rígidas de blueprint (sector, relationship_type, contato obrigatório)
        # que podem falhar para registros antigos importados do Pipedrive.
        # Eles serão vinculados diretamente no ORM após a criação.
        clone_data = CardCreate(
            title=reopen_data.title,
            list_id=TARGET_LIST_ID,
            assigned_to_id=original_card.assigned_to_id,
            sdr_id=original_card.sdr_id,
            value=float(original_card.value) if original_card.value else None,
            due_date=None,  # Zera o vencimento - o negócio está recomeçando
            description=original_card.description,
            deal_type=original_card.deal_type,
            # Canal de aquisição sempre "Base" na reabertura
            acquisition_channel="Base",
            acquisition_channel_detail=reopen_data.acquisition_channel_detail,
            has_implementation=original_card.has_implementation,
            has_personnel=original_card.has_personnel,
        )

        # Cria o clone (create_card já preenche prospection_entry_date automaticamente)
        new_card = self.create_card(clone_data, current_user)

        # Vincula client_id, person_id e contact_info diretamente no ORM, num único
        # commit, evitando as validações do blueprint que poderiam bloquear o reopen
        try:
            if original_card.client_id:
                new_card.client_id = original_card.client_id
            if original_card.person_id:
                new_card.person_id = original_card.person_id
            if original_card.contact_info:
                new_card.contact_info = original_card.contact_info
            self.db.commit()
            self.db.refresh(new_card)
        except Exception as e:
            self.db.rollback()
            print(f"[REOPEN] Aviso: erro ao vincular client_id/person_id/contact_info: {e}")

        # Copia os campos customizados do card original para o clone
        try:
            original_field_values = self.db.query(CardFieldValue).filter(
                CardFieldValue.card_id == card_id
            ).all()

            for fv in original_field_values:
                self.db.add(CardFieldValue(
                    card_id=new_card.id,
                    field_definition_id=fv.field_definition_id,
                    value=fv.value
                ))

            self.db.commit()
        except Exception as e:
            self.db.rollback()
            print(f"[REOPEN] Aviso: erro ao copiar campos customizados: {e}")

        # Copia as tarefas/atividades do card original para o clone
        # Preserva o histórico completo (inclusive tarefas já concluídas)
        try:
            original_tasks = self.db.query(CardTask).filter(
                CardTask.card_id == card_id
            ).all()

            for task in original_tasks:
                self.db.add(CardTask(
                    card_id=new_card.id,
                    assigned_to_id=task.assigned_to_id,
                    title=task.title,
                    description=task.description,
                    task_type=task.task_type,
                    priority=task.priority,
                    due_date=task.due_date,
                    duration_minutes=task.duration_minutes,
                    is_completed=task.is_completed,
                    completed_at=task.completed_at,
                    location=task.location,
                    video_link=task.video_link,
                    notes=task.notes,
                    contact_name=task.contact_name,
                    status=task.status,
                ))

            self.db.commit()
        except Exception as e:
            self.db.rollback()
            print(f"[REOPEN] Aviso: erro ao copiar tarefas: {e}")

        # Copia as anotações do card original para o clone
        try:
            original_notes = self.db.query(CardNote).filter(
                CardNote.card_id == card_id
            ).all()

            for note in original_notes:
                self.db.add(CardNote(
                    card_id=new_card.id,
                    user_id=note.user_id,
                    content=note.content,
                ))

            self.db.commit()
        except Exception as e:
            self.db.rollback()
            print(f"[REOPEN] Aviso: erro ao copiar anotações: {e}")

        # Copia os registros de anexos do card original para o clone
        # Filtra por deleted_at IS NULL (soft delete dos attachments usa deleted_at, não is_deleted)
        # Os registros apontam para os mesmos arquivos físicos em disco
        try:
            original_attachments = self.db.query(Attachment).filter(
                Attachment.card_id == card_id,
                Attachment.deleted_at.is_(None)
            ).all()

            for att in original_attachments:
                self.db.add(Attachment(
                    card_id=new_card.id,
                    uploaded_by_id=att.uploaded_by_id,
                    filename=att.filename,
                    original_filename=att.original_filename,
                    file_size=att.file_size,
                    mime_type=att.mime_type,
                    storage_path=att.storage_path,
                ))

            self.db.commit()
        except Exception as e:
            self.db.rollback()
            print(f"[REOPEN] Aviso: erro ao copiar anexos: {e}")

        # Copia os produtos do card original para o clone
        try:
            original_products = self.db.query(CardProduct).filter(
                CardProduct.card_id == card_id
            ).all()

            for cp in original_products:
                self.db.add(CardProduct(
                    card_id=new_card.id,
                    product_id=cp.product_id,
                    quantity=cp.quantity,
                    unit_price=cp.unit_price,
                    discount=cp.discount,
                    notes=cp.notes,
                ))

            self.db.commit()
        except Exception as e:
            self.db.rollback()
            print(f"[REOPEN] Aviso: erro ao copiar produtos: {e}")

        # Registra no histórico do card ORIGINAL que ele gerou uma reabertura
        try:
            self.activity_repository.create(
                card_id=card_id,
                user_id=current_user.id,
                activity_type="card_reopened",
                description=f"Negócio reaberto como card <strong>#{new_card.id}</strong>: \"{reopen_data.title}\"",
                activity_metadata={
                    "new_card_id": new_card.id,
                    "new_card_title": reopen_data.title,
                    "acquisition_channel_detail": reopen_data.acquisition_channel_detail
                }
            )
        except Exception as e:
            self.db.rollback()
            print(f"[REOPEN] Aviso: erro ao registrar histórico no card original: {e}")

        return new_card

    def link_person_to_card(self, card_id: int, person_id: int, current_user: User) -> Card:
        """
        Vincula uma pessoa a um card.

        Args:
            card_id: ID do card
            person_id: ID da pessoa
            current_user: Usuário atual

        Returns:
            Card atualizado

        Raises:
            HTTPException: Se card ou pessoa não forem encontrados
        """
        # Busca o card (valida role do usuário)
        card = self.get_card_by_id(card_id, current_user)

        # Verifica se a pessoa existe
        person = self.person_repository.find_by_id(person_id)
        if not person:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pessoa não encontrada"
            )

        # Vincula a pessoa ao card
        card.person_id = person_id
        self.db.commit()
        self.db.refresh(card)

        # Registra atividade
        self.activity_repository.create(
            card_id=card_id,
            user_id=current_user.id,
            activity_type="person_linked",
            description=f"Pessoa '{person.name}' vinculada ao card"
        )

        return card

    def unlink_person_from_card(self, card_id: int, current_user: User) -> Card:
        """
        Desvincula a pessoa de um card.

        Args:
            card_id: ID do card
            current_user: Usuário atual

        Returns:
            Card atualizado

        Raises:
            HTTPException: Se card não for encontrado
        """
        # Busca o card (valida role do usuário)
        card = self.get_card_by_id(card_id, current_user)

        # Guarda o nome da pessoa antes de desvincular (para o log)
        person_name = card.person.name if card.person else "Desconhecido"

        # Desvincula a pessoa
        card.person_id = None
        self.db.commit()
        self.db.refresh(card)

        # Registra atividade
        self.activity_repository.create(
            card_id=card_id,
            user_id=current_user.id,
            activity_type="person_unlinked",
            description=f"Pessoa '{person_name}' desvinculada do card"
        )

        return card
