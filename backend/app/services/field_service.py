"""
Service para Custom Fields - Lógica de negócio para campos personalizados.
"""
from sqlalchemy.orm import Session
from typing import List, Optional
from fastapi import HTTPException, status

from app.repositories.field_repository import FieldRepository
from app.models.field_definition import FieldDefinition
from app.models.card_field_value import CardFieldValue
from app.models.user import User
from app.schemas.field import (
    FieldDefinitionCreate,
    FieldDefinitionUpdate,
    FieldDefinitionResponse,
    CardFieldValueCreate,
    CardFieldValueResponse
)


class FieldService:
    """Service para operações de Custom Fields"""

    def __init__(self, db: Session):
        self.db = db
        self.repository = FieldRepository(db)

    # ========== FIELD DEFINITIONS ==========

    def create_field_definition(
        self,
        field_data: FieldDefinitionCreate,
        current_user: User
    ) -> FieldDefinitionResponse:
        """Cria uma nova definição de campo personalizado"""
        # TODO: Verificar se o usuário tem permissão para criar campos no board

        # Verifica se já existe um campo com o mesmo nome no board
        existing = self.repository.find_definition_by_name_and_board(
            field_data.name,
            field_data.board_id
        )

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Já existe um campo com o nome '{field_data.name}' neste board"
            )

        field_definition = self.repository.create_definition(field_data)

        # TODO: Criar evento de auditoria (Activity)

        return self._build_definition_response(field_definition)

    def get_field_definition(self, field_definition_id: int) -> FieldDefinitionResponse:
        """Busca uma definição de campo por ID"""
        field_definition = self.repository.find_definition_by_id(field_definition_id)

        if not field_definition:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Definição de campo {field_definition_id} não encontrada"
            )

        return self._build_definition_response(field_definition)

    def list_field_definitions_by_board(self, board_id: int) -> List[FieldDefinitionResponse]:
        """Lista todas as definições de campos de um board"""
        # TODO: Verificar se o usuário tem acesso ao board

        field_definitions = self.repository.list_definitions_by_board(board_id)

        return [self._build_definition_response(fd) for fd in field_definitions]

    def update_field_definition(
        self,
        field_definition_id: int,
        field_data: FieldDefinitionUpdate,
        current_user: User
    ) -> FieldDefinitionResponse:
        """Atualiza uma definição de campo"""
        field_definition = self.repository.find_definition_by_id(field_definition_id)

        if not field_definition:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Definição de campo {field_definition_id} não encontrada"
            )

        # TODO: Verificar permissões (apenas admin do board pode editar)

        # Se está mudando o nome, verifica se já existe outro campo com esse nome
        if field_data.name and field_data.name != field_definition.name:
            existing = self.repository.find_definition_by_name_and_board(
                field_data.name,
                field_definition.board_id
            )
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Já existe um campo com o nome '{field_data.name}' neste board"
                )

        updated_field = self.repository.update_definition(field_definition, field_data)

        # TODO: Criar evento de auditoria

        return self._build_definition_response(updated_field)

    def delete_field_definition(
        self,
        field_definition_id: int,
        current_user: User
    ) -> dict:
        """Deleta uma definição de campo"""
        field_definition = self.repository.find_definition_by_id(field_definition_id)

        if not field_definition:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Definição de campo {field_definition_id} não encontrada"
            )

        # TODO: Verificar permissões

        self.repository.delete_definition(field_definition)

        # TODO: Criar evento de auditoria

        return {"message": "Definição de campo deletada com sucesso"}

    # ========== CARD FIELD VALUES ==========

    def set_card_field_value(
        self,
        card_id: int,
        field_data: CardFieldValueCreate,
        current_user: User
    ) -> CardFieldValueResponse:
        """Define ou atualiza o valor de um campo customizado de um card"""
        # TODO: Verificar se o card existe e se o usuário tem permissão

        # Verifica se a definição do campo existe
        field_definition = self.repository.find_definition_by_id(
            field_data.field_definition_id
        )

        if not field_definition:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Definição de campo {field_data.field_definition_id} não encontrada"
            )

        # Cria ou atualiza o valor
        field_value = self.repository.create_or_update_value(card_id, field_data)

        # TODO: Criar evento de auditoria

        return self._build_value_response(field_value)

    def get_card_field_values(self, card_id: int) -> List[CardFieldValueResponse]:
        """Lista todos os valores de campos customizados de um card"""
        # TODO: Verificar se o usuário tem acesso ao card

        field_values = self.repository.list_values_by_card(card_id)

        return [self._build_value_response(fv) for fv in field_values]

    def delete_card_field_value(
        self,
        card_id: int,
        field_definition_id: int,
        current_user: User
    ) -> dict:
        """Deleta o valor de um campo customizado de um card"""
        field_value = self.repository.find_value_by_card_and_field(
            card_id,
            field_definition_id
        )

        if not field_value:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Valor de campo não encontrado para card {card_id} e campo {field_definition_id}"
            )

        # TODO: Verificar permissões

        self.repository.delete_value(field_value)

        # TODO: Criar evento de auditoria

        return {"message": "Valor de campo deletado com sucesso"}

    # ========== HELPER METHODS ==========

    def _build_definition_response(self, field_definition: FieldDefinition) -> FieldDefinitionResponse:
        """Constrói o schema de resposta de definição de campo"""
        return FieldDefinitionResponse(
            id=field_definition.id,
            board_id=field_definition.board_id,
            name=field_definition.name,
            field_type=field_definition.field_type,
            is_required=field_definition.is_required,
            options=field_definition.options or {},
            created_at=field_definition.created_at,
            updated_at=field_definition.updated_at
        )

    def _build_value_response(self, field_value: CardFieldValue) -> CardFieldValueResponse:
        """Constrói o schema de resposta de valor de campo"""
        response_data = {
            "id": field_value.id,
            "card_id": field_value.card_id,
            "field_definition_id": field_value.field_definition_id,
            "value": field_value.value,
            "created_at": field_value.created_at,
            "updated_at": field_value.updated_at
        }

        # Adiciona informações da definição se disponível
        if hasattr(field_value, 'field_definition') and field_value.field_definition:
            response_data["field_name"] = field_value.field_definition.name
            response_data["field_type"] = field_value.field_definition.field_type

        return CardFieldValueResponse(**response_data)
