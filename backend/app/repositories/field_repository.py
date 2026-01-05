"""
Field Repository - Operações de acesso a dados de campos customizados.
Implementa o padrão Repository para isolamento da camada de dados.
"""
from typing import Optional, List
from sqlalchemy.orm import Session

from app.models.field_definition import FieldDefinition
from app.models.card_field_value import CardFieldValue
from app.schemas.field import FieldDefinitionCreate, FieldDefinitionUpdate, CardFieldValueCreate


class FieldRepository:
    """
    Repository para operações relacionadas a campos customizados.
    """

    def __init__(self, db: Session):
        self.db = db

    # ========== FIELD DEFINITIONS ==========

    def find_definition_by_id(self, field_definition_id: int) -> Optional[FieldDefinition]:
        """
        Busca uma definição de campo por ID.

        Args:
            field_definition_id: ID da definição

        Returns:
            FieldDefinition ou None
        """
        return self.db.query(FieldDefinition).filter(
            FieldDefinition.id == field_definition_id
        ).first()

    def list_definitions_by_board(self, board_id: int) -> List[FieldDefinition]:
        """
        Lista todas as definições de campos de um board.

        Args:
            board_id: ID do board

        Returns:
            Lista de definições de campos
        """
        return self.db.query(FieldDefinition).filter(
            FieldDefinition.board_id == board_id
        ).all()

    def create_definition(self, field_data: FieldDefinitionCreate) -> FieldDefinition:
        """
        Cria uma nova definição de campo.

        Args:
            field_data: Dados da definição

        Returns:
            FieldDefinition criada
        """
        field_definition = FieldDefinition(
            name=field_data.name,
            field_type=field_data.field_type,
            board_id=field_data.board_id,
            options=field_data.options or {},
            is_required=field_data.is_required
        )

        self.db.add(field_definition)
        self.db.commit()
        self.db.refresh(field_definition)

        return field_definition

    def update_definition(
        self,
        field_definition: FieldDefinition,
        field_data: FieldDefinitionUpdate
    ) -> FieldDefinition:
        """
        Atualiza uma definição de campo.

        Args:
            field_definition: Definição a ser atualizada
            field_data: Dados de atualização

        Returns:
            FieldDefinition atualizada
        """
        update_data = field_data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(field_definition, field, value)

        self.db.commit()
        self.db.refresh(field_definition)

        return field_definition

    def delete_definition(self, field_definition: FieldDefinition) -> None:
        """
        Deleta uma definição de campo (e todos os valores associados em cascade).

        Args:
            field_definition: Definição a ser deletada
        """
        self.db.delete(field_definition)
        self.db.commit()

    # ========== CARD FIELD VALUES ==========

    def find_value_by_id(self, value_id: int) -> Optional[CardFieldValue]:
        """
        Busca um valor de campo por ID.

        Args:
            value_id: ID do valor

        Returns:
            CardFieldValue ou None
        """
        return self.db.query(CardFieldValue).filter(
            CardFieldValue.id == value_id
        ).first()

    def find_value_by_card_and_field(
        self,
        card_id: int,
        field_definition_id: int
    ) -> Optional[CardFieldValue]:
        """
        Busca o valor de um campo específico de um card.

        Args:
            card_id: ID do card
            field_definition_id: ID da definição do campo

        Returns:
            CardFieldValue ou None
        """
        return self.db.query(CardFieldValue).filter(
            CardFieldValue.card_id == card_id,
            CardFieldValue.field_definition_id == field_definition_id
        ).first()

    def list_values_by_card(self, card_id: int) -> List[CardFieldValue]:
        """
        Lista todos os valores de campos de um card.

        Args:
            card_id: ID do card

        Returns:
            Lista de valores de campos
        """
        return self.db.query(CardFieldValue).filter(
            CardFieldValue.card_id == card_id
        ).all()

    def create_or_update_value(
        self,
        card_id: int,
        field_data: CardFieldValueCreate
    ) -> CardFieldValue:
        """
        Cria ou atualiza um valor de campo customizado.

        Args:
            card_id: ID do card
            field_data: Dados do valor

        Returns:
            CardFieldValue criado ou atualizado
        """
        # Verifica se já existe
        existing = self.find_value_by_card_and_field(
            card_id,
            field_data.field_definition_id
        )

        if existing:
            # Atualiza valor existente
            existing.value = field_data.value
            self.db.commit()
            self.db.refresh(existing)
            return existing
        else:
            # Cria novo valor
            new_value = CardFieldValue(
                card_id=card_id,
                field_definition_id=field_data.field_definition_id,
                value=field_data.value
            )

            self.db.add(new_value)
            self.db.commit()
            self.db.refresh(new_value)

            return new_value

    def delete_value(self, field_value: CardFieldValue) -> None:
        """
        Deleta um valor de campo.

        Args:
            field_value: Valor a ser deletado
        """
        self.db.delete(field_value)
        self.db.commit()
