"""
Endpoints da API para Custom Fields (Campos Personalizados).
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.services.field_service import FieldService
from app.schemas.field import (
    FieldDefinitionCreate,
    FieldDefinitionUpdate,
    FieldDefinitionResponse,
    CardFieldValueCreate,
    CardFieldValueResponse
)
from app.models.user import User
from app.api.deps import get_current_active_user

router = APIRouter()


# ========== FIELD DEFINITIONS ==========

@router.post("/definitions", response_model=FieldDefinitionResponse, status_code=status.HTTP_201_CREATED)
def create_field_definition(
    field_data: FieldDefinitionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Cria uma nova definição de campo personalizado para um board.

    **Tipos de campo disponíveis:**
    - text: Texto curto
    - textarea: Texto longo
    - number: Número
    - date: Data
    - datetime: Data e hora
    - select: Seleção única
    - multiselect: Seleção múltipla
    - boolean: Sim/Não
    - url: URL
    - email: Email
    - phone: Telefone

    **Exemplo:**
    ```json
    {
      "name": "Segmento",
      "field_type": "select",
      "board_id": 1,
      "is_required": true,
      "options": {
        "choices": ["Tecnologia", "Varejo", "Serviços"]
      }
    }
    ```
    """
    service = FieldService(db)
    return service.create_field_definition(field_data, current_user)


@router.get("/definitions/board/{board_id}", response_model=List[FieldDefinitionResponse])
def list_field_definitions_by_board(
    board_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Lista todas as definições de campos personalizados de um board.

    Retorna todos os campos customizados disponíveis no board especificado,
    ordenados por posição.
    """
    service = FieldService(db)
    return service.list_field_definitions_by_board(board_id)


@router.get("/definitions/{field_definition_id}", response_model=FieldDefinitionResponse)
def get_field_definition(
    field_definition_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Busca uma definição de campo por ID"""
    service = FieldService(db)
    return service.get_field_definition(field_definition_id)


@router.put("/definitions/{field_definition_id}", response_model=FieldDefinitionResponse)
def update_field_definition(
    field_definition_id: int,
    field_data: FieldDefinitionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Atualiza uma definição de campo personalizado.

    Apenas campos fornecidos serão atualizados.
    """
    service = FieldService(db)
    return service.update_field_definition(field_definition_id, field_data, current_user)


@router.delete("/definitions/{field_definition_id}", status_code=status.HTTP_200_OK)
def delete_field_definition(
    field_definition_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Deleta uma definição de campo personalizado.

    **Atenção:** Todos os valores associados a este campo em todos os cards serão deletados.
    """
    service = FieldService(db)
    return service.delete_field_definition(field_definition_id, current_user)


# ========== CARD FIELD VALUES ==========

@router.put("/cards/{card_id}/values", response_model=CardFieldValueResponse)
def set_card_field_value(
    card_id: int,
    field_data: CardFieldValueCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Define ou atualiza o valor de um campo personalizado de um card.

    Se o valor já existir, será atualizado. Caso contrário, será criado.

    **Exemplo:**
    ```json
    {
      "field_definition_id": 1,
      "value": "Tecnologia"
    }
    ```
    """
    service = FieldService(db)
    return service.set_card_field_value(card_id, field_data, current_user)


@router.get("/cards/{card_id}/values", response_model=List[CardFieldValueResponse])
def get_card_field_values(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Lista todos os valores de campos personalizados de um card.

    Retorna todos os campos customizados preenchidos no card,
    incluindo nome e tipo do campo.
    """
    service = FieldService(db)
    return service.get_card_field_values(card_id)


@router.delete("/cards/{card_id}/values/{field_definition_id}", status_code=status.HTTP_200_OK)
def delete_card_field_value(
    card_id: int,
    field_definition_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Deleta o valor de um campo personalizado de um card.

    Remove apenas o valor, a definição do campo permanece disponível no board.
    """
    service = FieldService(db)
    return service.delete_card_field_value(card_id, field_definition_id, current_user)
