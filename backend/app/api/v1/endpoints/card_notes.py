"""
Endpoints da API para CardNotes (Anotações dos Cards).
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.services.card_note_service import CardNoteService
from app.schemas.card_note import CardNoteCreate, CardNoteUpdate, CardNoteResponse
from app.models.user import User
from app.api.deps import get_current_active_user

router = APIRouter()


@router.post(
    "",
    response_model=CardNoteResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar anotação em um card",
    description="""
    Cria uma nova anotação para um card específico.

    **Parâmetros:**
    - `card_id`: ID do card onde a anotação será criada
    - `content`: Conteúdo da anotação (texto livre)

    **Comportamento:**
    - A anotação é vinculada ao card e ao usuário que a criou
    - Registra automaticamente no histórico do card

    **Permissões:** Qualquer usuário autenticado
    """,
    responses={
        201: {
            "description": "Anotação criada com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "card_id": 42,
                        "content": "Cliente demonstrou interesse no plano premium. Agendar reunião para próxima semana.",
                        "created_by_id": 5,
                        "created_by_name": "João Silva",
                        "created_at": "2026-01-15T14:30:00",
                        "updated_at": None
                    }
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
def create_note(
    note_data: CardNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Cria uma nova anotação para um card.

    Também registra automaticamente no histórico do card.
    """
    service = CardNoteService(db)
    return service.create_note(note_data, current_user)


@router.get(
    "/card/{card_id}",
    response_model=List[CardNoteResponse],
    summary="Listar anotações de um card",
    description="""
    Busca todas as anotações de um card específico.

    **Parâmetros:**
    - `card_id`: ID do card para buscar as anotações

    **Retorna:**
    - Lista de anotações ordenadas por data de criação (mais recente primeiro)
    - Cada anotação inclui dados do autor (nome)

    **Permissões:** Qualquer usuário autenticado
    """,
    responses={
        200: {
            "description": "Lista de anotações do card",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "id": 2,
                            "card_id": 42,
                            "content": "Proposta enviada por email. Aguardando retorno.",
                            "created_by_id": 5,
                            "created_by_name": "João Silva",
                            "created_at": "2026-01-16T09:00:00",
                            "updated_at": None
                        },
                        {
                            "id": 1,
                            "card_id": 42,
                            "content": "Cliente demonstrou interesse no plano premium.",
                            "created_by_id": 5,
                            "created_by_name": "João Silva",
                            "created_at": "2026-01-15T14:30:00",
                            "updated_at": None
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
def get_notes_by_card(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Busca todas as anotações de um card específico.

    Ordenadas por data de criação (mais recente primeiro).
    """
    service = CardNoteService(db)
    return service.get_notes_by_card(card_id)


@router.get(
    "/{note_id}",
    response_model=CardNoteResponse,
    summary="Buscar anotação por ID",
    description="""
    Busca uma anotação específica pelo seu ID.

    **Parâmetros:**
    - `note_id`: ID da anotação

    **Retorna:**
    - Dados completos da anotação, incluindo nome do autor

    **Permissões:** Qualquer usuário autenticado
    """,
    responses={
        200: {
            "description": "Anotação encontrada",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "card_id": 42,
                        "content": "Cliente demonstrou interesse no plano premium.",
                        "created_by_id": 5,
                        "created_by_name": "João Silva",
                        "created_at": "2026-01-15T14:30:00",
                        "updated_at": None
                    }
                }
            }
        },
        404: {
            "description": "Anotação não encontrada",
            "content": {
                "application/json": {
                    "example": {"detail": "Anotação não encontrada"}
                }
            }
        }
    }
)
def get_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Busca uma anotação por ID."""
    service = CardNoteService(db)
    return service.get_note(note_id)


@router.put(
    "/{note_id}",
    response_model=CardNoteResponse,
    summary="Atualizar anotação",
    description="""
    Atualiza o conteúdo de uma anotação existente.

    **Parâmetros:**
    - `note_id`: ID da anotação a ser atualizada
    - `content`: Novo conteúdo da anotação

    **Validações:**
    - Apenas o autor da anotação ou usuários com role admin/manager podem editar
    - Registra a alteração no histórico do card

    **Permissões:** Autor da anotação, Admin ou Manager
    """,
    responses={
        200: {
            "description": "Anotação atualizada com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "card_id": 42,
                        "content": "Cliente confirmou interesse no plano premium. Reunião agendada para 20/01.",
                        "created_by_id": 5,
                        "created_by_name": "João Silva",
                        "created_at": "2026-01-15T14:30:00",
                        "updated_at": "2026-01-17T10:15:00"
                    }
                }
            }
        },
        403: {
            "description": "Sem permissão para editar",
            "content": {
                "application/json": {
                    "example": {"detail": "Apenas o autor ou admin/manager podem editar esta anotação"}
                }
            }
        },
        404: {
            "description": "Anotação não encontrada",
            "content": {
                "application/json": {
                    "example": {"detail": "Anotação não encontrada"}
                }
            }
        }
    }
)
def update_note(
    note_id: int,
    note_data: CardNoteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Atualiza uma anotação existente.

    Apenas o autor da anotação ou admin/manager podem editar.
    Também registra a alteração no histórico.
    """
    service = CardNoteService(db)
    return service.update_note(note_id, note_data, current_user)


@router.delete(
    "/{note_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Deletar anotação",
    description="""
    Deleta permanentemente uma anotação de um card.

    **Parâmetros:**
    - `note_id`: ID da anotação a ser deletada

    **Validações:**
    - Apenas o autor da anotação ou usuários com role admin/manager podem deletar
    - Registra a deleção no histórico do card

    **Permissões:** Autor da anotação, Admin ou Manager
    """,
    responses={
        204: {
            "description": "Anotação deletada com sucesso"
        },
        403: {
            "description": "Sem permissão para deletar",
            "content": {
                "application/json": {
                    "example": {"detail": "Apenas o autor ou admin/manager podem deletar esta anotação"}
                }
            }
        },
        404: {
            "description": "Anotação não encontrada",
            "content": {
                "application/json": {
                    "example": {"detail": "Anotação não encontrada"}
                }
            }
        }
    }
)
def delete_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Deleta uma anotação.

    Apenas o autor da anotação ou admin/manager podem deletar.
    Também registra a deleção no histórico.
    """
    service = CardNoteService(db)
    service.delete_note(note_id, current_user)
    return None
