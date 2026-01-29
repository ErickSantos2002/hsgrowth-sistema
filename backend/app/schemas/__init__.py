"""
Schemas Pydantic do sistema.
Centraliza imports de todos os schemas.
"""
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    RegisterRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ClientCredentialsRequest,
)

from app.schemas.user import (
    UserBase,
    UserCreate,
    UserUpdate,
    UserResponse,
    UserListResponse,
    ChangePasswordRequest,
)

from app.schemas.board import (
    BoardBase,
    BoardCreate,
    BoardUpdate,
    BoardResponse,
    BoardListResponse,
    BoardDuplicateRequest,
)

from app.schemas.list import (
    ListBase,
    ListCreate,
    ListUpdate,
    ListResponse,
    ListMoveRequest,
)

from app.schemas.card import (
    CardBase,
    CardCreate,
    CardUpdate,
    CardResponse,
    CardListResponse,
    CardMoveRequest,
    CardAssignRequest,
)

from app.schemas.field import (
    FieldDefinitionBase,
    FieldDefinitionCreate,
    FieldDefinitionUpdate,
    FieldDefinitionResponse,
    CardFieldValueCreate,
    CardFieldValueResponse,
)

from app.schemas.person import (
    PersonBase,
    PersonCreate,
    PersonUpdate,
    PersonResponse,
    PersonListResponse,
)

__all__ = [
    # Auth schemas
    "LoginRequest",
    "TokenResponse",
    "RefreshTokenRequest",
    "RegisterRequest",
    "ForgotPasswordRequest",
    "ResetPasswordRequest",
    "ClientCredentialsRequest",
    # User schemas
    "UserBase",
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "UserListResponse",
    "ChangePasswordRequest",
    # Board schemas
    "BoardBase",
    "BoardCreate",
    "BoardUpdate",
    "BoardResponse",
    "BoardListResponse",
    "BoardDuplicateRequest",
    # List schemas
    "ListBase",
    "ListCreate",
    "ListUpdate",
    "ListResponse",
    "ListMoveRequest",
    # Card schemas
    "CardBase",
    "CardCreate",
    "CardUpdate",
    "CardResponse",
    "CardListResponse",
    "CardMoveRequest",
    "CardAssignRequest",
    # Field schemas
    "FieldDefinitionBase",
    "FieldDefinitionCreate",
    "FieldDefinitionUpdate",
    "FieldDefinitionResponse",
    "CardFieldValueCreate",
    "CardFieldValueResponse",
    # Person schemas
    "PersonBase",
    "PersonCreate",
    "PersonUpdate",
    "PersonResponse",
    "PersonListResponse",
]
