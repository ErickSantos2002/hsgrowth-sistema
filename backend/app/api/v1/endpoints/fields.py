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

@router.post(
    "/definitions",
    response_model=FieldDefinitionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar definição de campo personalizado",
    description="""
    Cria uma nova definição de campo personalizado para um board.

    **Tipos de campo disponíveis:**
    - `text`: Texto curto (até 255 caracteres)
    - `textarea`: Texto longo (sem limite)
    - `number`: Número (inteiro ou decimal)
    - `date`: Data (formato ISO 8601)
    - `datetime`: Data e hora
    - `select`: Seleção única (requer `options.choices`)
    - `multiselect`: Seleção múltipla (requer `options.choices`)
    - `boolean`: Sim/Não
    - `url`: URL válida
    - `email`: Endereço de email
    - `phone`: Número de telefone

    **Parâmetros:**
    - `name`: Nome do campo (exibido na interface)
    - `field_type`: Tipo do campo (ver lista acima)
    - `board_id`: ID do board onde o campo será disponibilizado
    - `is_required`: Se o campo é obrigatório (padrão: false)
    - `options`: Opções adicionais (ex: choices para select/multiselect)
    - `position`: Posição de ordenação do campo

    **Permissões:** Qualquer usuário autenticado
    """,
    responses={
        201: {
            "description": "Campo criado com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "name": "Segmento",
                        "field_type": "select",
                        "board_id": 1,
                        "is_required": True,
                        "options": {
                            "choices": ["Tecnologia", "Varejo", "Serviços", "Indústria"]
                        },
                        "position": 1,
                        "created_at": "2026-01-15T10:00:00"
                    }
                }
            }
        },
        404: {
            "description": "Board não encontrado",
            "content": {
                "application/json": {
                    "example": {"detail": "Board não encontrado"}
                }
            }
        },
        422: {
            "description": "Dados inválidos",
            "content": {
                "application/json": {
                    "example": {"detail": "Erro de validação nos dados enviados"}
                }
            }
        }
    }
)
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
    """
    service = FieldService(db)
    return service.create_field_definition(field_data, current_user)


@router.get(
    "/definitions/board/{board_id}",
    response_model=List[FieldDefinitionResponse],
    summary="Listar campos personalizados de um board",
    description="""
    Lista todas as definições de campos personalizados de um board específico.

    **Parâmetros:**
    - `board_id`: ID do board

    **Retorna:**
    - Lista de campos customizados disponíveis no board, ordenados por posição
    - Inclui as opções de cada campo (choices para select/multiselect)

    **Permissões:** Qualquer usuário autenticado
    """,
    responses={
        200: {
            "description": "Lista de campos do board",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "id": 1,
                            "name": "Segmento",
                            "field_type": "select",
                            "board_id": 1,
                            "is_required": True,
                            "options": {"choices": ["Tecnologia", "Varejo", "Serviços"]},
                            "position": 1
                        },
                        {
                            "id": 2,
                            "name": "Valor Estimado",
                            "field_type": "number",
                            "board_id": 1,
                            "is_required": False,
                            "options": None,
                            "position": 2
                        }
                    ]
                }
            }
        }
    }
)
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


@router.get(
    "/definitions/{field_definition_id}",
    response_model=FieldDefinitionResponse,
    summary="Buscar definição de campo por ID",
    description="""
    Busca uma definição de campo personalizado específica pelo seu ID.

    **Parâmetros:**
    - `field_definition_id`: ID da definição do campo

    **Retorna:**
    - Dados completos da definição do campo, incluindo opções

    **Permissões:** Qualquer usuário autenticado
    """,
    responses={
        200: {
            "description": "Campo encontrado",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "name": "Segmento",
                        "field_type": "select",
                        "board_id": 1,
                        "is_required": True,
                        "options": {"choices": ["Tecnologia", "Varejo", "Serviços"]},
                        "position": 1,
                        "created_at": "2026-01-15T10:00:00"
                    }
                }
            }
        },
        404: {
            "description": "Campo não encontrado",
            "content": {
                "application/json": {
                    "example": {"detail": "Campo não encontrado"}
                }
            }
        }
    }
)
def get_field_definition(
    field_definition_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Busca uma definição de campo por ID."""
    service = FieldService(db)
    return service.get_field_definition(field_definition_id)


@router.put(
    "/definitions/{field_definition_id}",
    response_model=FieldDefinitionResponse,
    summary="Atualizar definição de campo personalizado",
    description="""
    Atualiza uma definição de campo personalizado existente.

    **Parâmetros:**
    - `field_definition_id`: ID da definição do campo
    - Campos a atualizar (apenas campos fornecidos serão alterados)

    **Campos atualizáveis:**
    - `name`: Nome do campo
    - `field_type`: Tipo do campo
    - `is_required`: Se é obrigatório
    - `options`: Opções do campo (choices para select/multiselect)
    - `position`: Posição de ordenação

    **Atenção:** Alterar o tipo do campo pode causar incompatibilidade com valores já preenchidos nos cards.

    **Permissões:** Qualquer usuário autenticado
    """,
    responses={
        200: {
            "description": "Campo atualizado com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "name": "Segmento de Mercado",
                        "field_type": "select",
                        "board_id": 1,
                        "is_required": True,
                        "options": {"choices": ["Tecnologia", "Varejo", "Serviços", "Indústria", "Saúde"]},
                        "position": 1
                    }
                }
            }
        },
        404: {
            "description": "Campo não encontrado",
            "content": {
                "application/json": {
                    "example": {"detail": "Campo não encontrado"}
                }
            }
        },
        422: {
            "description": "Dados inválidos",
            "content": {
                "application/json": {
                    "example": {"detail": "Erro de validação nos dados enviados"}
                }
            }
        }
    }
)
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


@router.delete(
    "/definitions/{field_definition_id}",
    status_code=status.HTTP_200_OK,
    summary="Deletar definição de campo personalizado",
    description="""
    Deleta permanentemente uma definição de campo personalizado.

    **Parâmetros:**
    - `field_definition_id`: ID da definição do campo

    **Atenção:** Todos os valores associados a este campo em **todos os cards** do board serão deletados permanentemente. Esta ação é irreversível.

    **Permissões:** Qualquer usuário autenticado
    """,
    responses={
        200: {
            "description": "Campo deletado com sucesso",
            "content": {
                "application/json": {
                    "example": {"message": "Campo deletado com sucesso"}
                }
            }
        },
        404: {
            "description": "Campo não encontrado",
            "content": {
                "application/json": {
                    "example": {"detail": "Campo não encontrado"}
                }
            }
        }
    }
)
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

@router.put(
    "/cards/{card_id}/values",
    response_model=CardFieldValueResponse,
    summary="Definir valor de campo personalizado",
    description="""
    Define ou atualiza o valor de um campo personalizado de um card.

    **Parâmetros:**
    - `card_id`: ID do card
    - `field_definition_id`: ID da definição do campo
    - `value`: Valor do campo (tipo depende da definição)

    **Comportamento:**
    - Se o valor já existir para o campo/card, será **atualizado** (upsert)
    - Se não existir, será **criado**
    - O valor é validado de acordo com o tipo do campo

    **Permissões:** Qualquer usuário autenticado
    """,
    responses={
        200: {
            "description": "Valor definido/atualizado com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "card_id": 42,
                        "field_definition_id": 1,
                        "field_name": "Segmento",
                        "field_type": "select",
                        "value": "Tecnologia",
                        "updated_at": "2026-01-15T14:30:00"
                    }
                }
            }
        },
        404: {
            "description": "Card ou campo não encontrado",
            "content": {
                "application/json": {
                    "examples": {
                        "card": {"value": {"detail": "Card não encontrado"}},
                        "field": {"value": {"detail": "Campo não encontrado"}}
                    }
                }
            }
        },
        422: {
            "description": "Valor inválido para o tipo de campo",
            "content": {
                "application/json": {
                    "example": {"detail": "Valor inválido para o tipo de campo 'select'"}
                }
            }
        }
    }
)
def set_card_field_value(
    card_id: int,
    field_data: CardFieldValueCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Define ou atualiza o valor de um campo personalizado de um card.

    Se o valor já existir, será atualizado. Caso contrário, será criado.
    """
    service = FieldService(db)
    return service.set_card_field_value(card_id, field_data, current_user)


@router.get(
    "/cards/{card_id}/values",
    response_model=List[CardFieldValueResponse],
    summary="Listar valores dos campos de um card",
    description="""
    Lista todos os valores de campos personalizados preenchidos em um card.

    **Parâmetros:**
    - `card_id`: ID do card

    **Retorna:**
    - Lista de valores preenchidos, incluindo nome e tipo de cada campo
    - Apenas campos que possuem valores são retornados

    **Permissões:** Qualquer usuário autenticado
    """,
    responses={
        200: {
            "description": "Lista de valores dos campos do card",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "id": 1,
                            "card_id": 42,
                            "field_definition_id": 1,
                            "field_name": "Segmento",
                            "field_type": "select",
                            "value": "Tecnologia"
                        },
                        {
                            "id": 2,
                            "card_id": 42,
                            "field_definition_id": 2,
                            "field_name": "Valor Estimado",
                            "field_type": "number",
                            "value": "150000"
                        }
                    ]
                }
            }
        },
        404: {
            "description": "Card não encontrado",
            "content": {
                "application/json": {
                    "example": {"detail": "Card não encontrado"}
                }
            }
        }
    }
)
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


@router.delete(
    "/cards/{card_id}/values/{field_definition_id}",
    status_code=status.HTTP_200_OK,
    summary="Remover valor de campo personalizado",
    description="""
    Remove o valor de um campo personalizado de um card específico.

    **Parâmetros:**
    - `card_id`: ID do card
    - `field_definition_id`: ID da definição do campo

    **Comportamento:**
    - Remove apenas o **valor** preenchido no card
    - A definição do campo permanece disponível no board para outros cards

    **Permissões:** Qualquer usuário autenticado
    """,
    responses={
        200: {
            "description": "Valor removido com sucesso",
            "content": {
                "application/json": {
                    "example": {"message": "Valor do campo removido com sucesso"}
                }
            }
        },
        404: {
            "description": "Valor não encontrado",
            "content": {
                "application/json": {
                    "example": {"detail": "Valor do campo não encontrado para este card"}
                }
            }
        }
    }
)
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
