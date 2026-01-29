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
from app.schemas.card import CardCreate, CardUpdate, CardResponse, CardListResponse
from app.schemas.field import CardFieldValueCreate, CardFieldValueResponse
from app.models.card import Card
from app.models.user import User


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

    def get_card_by_id(self, card_id: int) -> Card:
        """
        Busca um card por ID.

        Args:
            card_id: ID do card

        Returns:
            Card

        Raises:
            HTTPException: Se não encontrado
        """
        card = self.card_repository.find_by_id(card_id)

        if not card:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Card não encontrado"
            )

        # Verifica acesso
        self._verify_card_access(card)

        return card

    def list_cards(
        self,
        board_id: int,
        page: int = 1,
        page_size: int = 50,
        all: bool = False,
        minimal: bool = False,
        assigned_to_id: Optional[int] = None,
        is_won: Optional[bool] = None,
        is_lost: Optional[bool] = None
    ):
        """
        Lista cards de um board com paginação e filtros.

        Args:
            board_id: ID do board
            page: Número da página
            page_size: Tamanho da página
            all: Se True, retorna TODOS os cards sem paginação
            minimal: Se True, retorna apenas campos essenciais (otimizado)
            assigned_to_id: Filtro por responsável
            is_won: Filtro por cards ganhos
            is_lost: Filtro por cards perdidos

        Returns:
            CardListResponse ou CardMinimalListResponse
        """
        from app.schemas.card import CardMinimalResponse, CardMinimalListResponse

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
            is_won=is_won,
            is_lost=is_lost
        )

        # Conta total
        total = self.card_repository.count_by_board(
            board_id=board_id,
            assigned_to_id=assigned_to_id,
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
            for card in cards:
                # Usa o usuário já carregado via eager loading (sem query adicional)
                assigned_to_name = None
                if card.assigned_to:
                    assigned_to_name = card.assigned_to.name

                cards_response.append(
                    CardMinimalResponse(
                        id=card.id,
                        title=card.title,
                        list_id=card.list_id,
                        position=card.position,
                        assigned_to_id=card.assigned_to_id,
                        assigned_to_name=assigned_to_name,
                        value=card.value,
                        due_date=card.due_date,
                        is_won=card.is_won,
                        is_lost=card.is_lost,
                        contact_info=card.contact_info  # Será filtrado pelo validator
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
        cards_response = []
        for card in cards:
            # Usa o usuário já carregado via eager loading (sem query adicional)
            assigned_to_name = None
            if card.assigned_to:
                assigned_to_name = card.assigned_to.name

            list_obj = self.list_repository.find_by_id(card.list_id)
            list_name = list_obj.name if list_obj else None

            cards_response.append(
                CardResponse(
                    id=card.id,
                    title=card.title,
                    description=card.description,
                    list_id=card.list_id,
                    assigned_to_id=card.assigned_to_id,
                    value=card.value,
                    due_date=card.due_date,
                    contact_info=card.contact_info,
                    is_won=card.is_won,
                    is_lost=card.is_lost,
                    won_at=card.won_at,
                    lost_at=card.lost_at,
                    position=card.position,
                    created_at=card.created_at,
                    updated_at=card.updated_at,
                    assigned_to_name=assigned_to_name,
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

        # Cria o card
        card = self.card_repository.create(card_data)

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
        # Busca e verifica acesso
        card = self.get_card_by_id(card_id)

        # Atualiza o card
        updated_card = self.card_repository.update(card, card_data)

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

        # Busca e verifica acesso
        card = self.get_card_by_id(card_id)

        # Deleta o card
        self.card_repository.delete(card)

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

        # Busca e verifica acesso ao card
        card = self.get_card_by_id(card_id)

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

                # Cria notificação de parabenização
                congratulation_message = self._generate_congratulation_message(
                    card=moved_card,
                    source_list_name=source_list_name,
                    target_list_name=target_list.name,
                    points_awarded=points_awarded,
                    is_won=target_list.is_done_stage
                )

                notification_data = {
                    "user_id": moved_card.assigned_to_id,
                    "notification_type": "card_won" if target_list.is_done_stage else "card_moved",
                    "title": "Parabéns! Card avançou",
                    "message": congratulation_message,
                    "icon": "trophy" if target_list.is_done_stage else "arrow-right",
                    "color": "success",
                    "notification_metadata": {
                        "card_id": moved_card.id,
                        "card_title": moved_card.title,
                        "source_list": source_list_name,
                        "target_list": target_list.name,
                        "points_awarded": points_awarded,
                        "url": f"/cards/{moved_card.id}"
                    }
                }
                self.notification_repository.create(notification_data)

            except Exception as e:
                # Log erro mas não quebra o fluxo principal
                print(f"Erro ao criar parabenização: {e}")

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
        # Busca e verifica acesso ao card
        card = self.get_card_by_id(card_id)

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
        assigned_card = self.card_repository.assign_to_user(card, user_id)

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

        # Verifica acesso ao card
        card = self.get_card_by_id(card_id)

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

        # Busca o card
        card = self.get_card_by_id(card_id)

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
            "value": float(card.value) if card.value else None,
            "due_date": card.due_date,
            "contact_info": card.contact_info,
            "payment_info": card.payment_info,
            "is_won": card.is_won == 1,
            "is_lost": card.is_lost,
            "won_at": card.won_at,
            "lost_at": card.lost_at,
            "position": float(card.position),
            "created_at": card.created_at,
            "updated_at": card.updated_at,

            # Informações relacionadas
            "assigned_to_name": card.assigned_to.name if card.assigned_to else None,
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
            "products_total": products_totals["total"],
            "recent_activities": recent_activities,
            "notes": notes
        }

        return response_data

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
        # Busca o card
        card = self.get_card_by_id(card_id)

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
        self.activity_repository.create_activity(
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
        # Busca o card
        card = self.get_card_by_id(card_id)

        # Guarda o nome da pessoa antes de desvincular (para o log)
        person_name = card.person.name if card.person else "Desconhecido"

        # Desvincula a pessoa
        card.person_id = None
        self.db.commit()
        self.db.refresh(card)

        # Registra atividade
        self.activity_repository.create_activity(
            card_id=card_id,
            user_id=current_user.id,
            activity_type="person_unlinked",
            description=f"Pessoa '{person_name}' desvinculada do card"
        )

        return card
