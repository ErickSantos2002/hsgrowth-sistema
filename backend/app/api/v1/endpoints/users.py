"""
Endpoints de Usuários.
Rotas para gerenciamento de usuários (CRUD).
"""
from typing import Any, Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user, require_role, require_manager_or_admin
from app.services.user_service import UserService
from app.services.user_notification_service import UserNotificationService
from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserListResponse, ChangePasswordRequest
from app.schemas.user_notification_setting import (
    UserNotificationSettingResponse,
    UserNotificationSettingUpdate,
)
from app.models.user import User
from app.models.audit_log import AuditLog

router = APIRouter()


@router.get(
    "",
    response_model=UserListResponse,
    summary="Listar usuários",
    description="""
    Lista todos os usuários do sistema com paginação.

    **Filtros disponíveis:**
    - `page`: Número da página (padrão: 1, mínimo: 1)
    - `page_size`: Quantidade de usuários por página (padrão: 50, máximo: 100)
    - `is_active`: Filtrar por status ativo (true/false, opcional)

    **Resposta:**
    - Lista de usuários com dados básicos e relacionamentos (role)
    - Metadados de paginação (total, páginas, página atual)
    - Usuários deletados (soft delete) não são retornados

    **Ordenação:**
    - Por padrão ordenado por `created_at` (mais recentes primeiro)
    """,
    responses={
        200: {
            "description": "Lista de usuários retornada com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "users": [
                            {
                                "id": 1,
                                "email": "joao@exemplo.com",
                                "username": "joao",
                                "name": "João Silva",
                                "role_name": "Vendedor",
                                "is_active": True,
                                "created_at": "2026-01-06T10:00:00"
                            }
                        ],
                        "total": 15,
                        "page": 1,
                        "page_size": 50,
                        "total_pages": 1
                    }
                }
            }
        },
        401: {
            "description": "Não autenticado",
            "content": {"application/json": {"example": {"detail": "Not authenticated"}}}
        }
    }
)
async def list_users(
    page: int = Query(1, ge=1, description="Número da página"),
    page_size: int = Query(50, ge=1, le=100, description="Tamanho da página"),
    is_active: Optional[bool] = Query(None, description="Filtrar por status ativo"),
    role: Optional[str] = Query(None, description="Filtrar por role (admin/manager/salesperson)"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Endpoint de listagem de usuários.
    """
    service = UserService(db)
    return service.list_users(
        page=page,
        page_size=page_size,
        is_active=is_active,
        role=role,
        current_user=current_user
    )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Dados do usuário logado",
    description="""
    Retorna todos os dados do usuário atualmente autenticado.

    **Use este endpoint para:**
    - Obter informações do perfil do usuário logado
    - Verificar permissões e role
    - Exibir dados no frontend (header, perfil, etc)

    **Dados retornados:**
    - Informações básicas (id, email, username, nome completo)
    - Dados de role (role_name)
    - Metadados (last_login_at, created_at, updated_at)
    - Avatar e telefone (se preenchidos)

    **Autenticação:**
    - Requer token JWT válido no header Authorization
    - Bearer token deve estar ativo e não expirado
    """,
    responses={
        200: {
            "description": "Dados do usuário retornados com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "email": "joao@exemplo.com",
                        "username": "joao",
                        "name": "João Silva",
                        "avatar_url": "https://exemplo.com/avatar.jpg",
                        "phone": "+55 11 98765-4321",
                        "role_id": 2,
                        "role_name": "Vendedor",
                        "is_active": True,
                        "last_login_at": "2026-01-06T14:30:00",
                        "created_at": "2025-12-01T10:00:00",
                        "updated_at": "2026-01-06T14:30:00"
                    }
                }
            }
        },
        401: {
            "description": "Não autenticado ou token inválido",
            "content": {"application/json": {"example": {"detail": "Not authenticated"}}}
        }
    }
)
async def get_current_user_data(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Endpoint de dados do usuário autenticado.
    """
    # Converte para response schema
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        name=current_user.name,
        avatar_url=current_user.avatar_url,
        phone=getattr(current_user, 'phone', None),
        email_signature=getattr(current_user, 'email_signature', None),
        role_id=current_user.role_id,
        is_active=current_user.is_active,
        last_login_at=current_user.last_login_at,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
        role=current_user.role.name if current_user.role else None,
        role_name=current_user.role.display_name if current_user.role else None,
    )


@router.get(
    "/active",
    response_model=List[UserResponse],
    summary="Listar usuários ativos",
    description="""
    Lista todos os usuários ativos do sistema.

    **Disponível para:** Todos os usuários autenticados

    Este endpoint foi criado para permitir que vendedores possam listar
    outros usuários ao criar transferências de cards. Diferente do endpoint
    principal de listagem, este não tem restrição de role.

    **Retorna:**
    - Lista de todos os usuários ativos (is_active=true, is_deleted=false)
    - Ordenado por nome alfabeticamente
    - Sem paginação (retorna todos de uma vez)

    **Campos retornados:**
    - Informações básicas do usuário (id, name, email, username)
    - Role do usuário (role_name)
    - Metadados (created_at, updated_at)
    """,
    responses={
        200: {
            "description": "Lista de usuários ativos retornada com sucesso",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "id": 1,
                            "email": "joao@exemplo.com",
                            "username": "joao",
                            "name": "João Silva",
                            "role_name": "Vendedor",
                            "is_active": True,
                            "created_at": "2026-01-06T10:00:00"
                        },
                        {
                            "id": 2,
                            "email": "maria@exemplo.com",
                            "username": "maria",
                            "name": "Maria Santos",
                            "role_name": "Gerente",
                            "is_active": True,
                            "created_at": "2026-01-05T14:00:00"
                        }
                    ]
                }
            }
        },
        401: {
            "description": "Não autenticado",
            "content": {"application/json": {"example": {"detail": "Not authenticated"}}}
        }
    }
)
async def list_active_users(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Endpoint público (autenticado) para listar usuários ativos.
    Usado principalmente para selects de transferência de cards.
    """
    from app.repositories.user_repository import UserRepository

    user_repo = UserRepository(db)
    users = user_repo.find_all_active()

    # Converte para response schema
    return [
        UserResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            name=user.name,
            avatar_url=user.avatar_url,
            phone=getattr(user, 'phone', None),
            email_signature=getattr(user, 'email_signature', None),
            role_id=user.role_id,
            is_active=user.is_active,
            last_login_at=user.last_login_at,
            created_at=user.created_at,
            updated_at=user.updated_at,
            role=user.role.name if user.role else None,
            role_name=user.role.display_name if user.role else None,
        )
        for user in users
    ]


@router.get(
    "/sdrs",
    response_model=List[UserResponse],
    summary="Usuários que atuam ou já atuaram como SDR",
    description="""
    Lista os usuários que devem aparecer nos filtros e seletores de SDR.

    Inclui:
    - quem tem o cargo SDR hoje;
    - quem já está vinculado como SDR em pelo menos um card (ex-SDR que mudou
      de cargo) — sem isso o histórico dessa pessoa sumiria dos filtros. Ver RN-037.

    Apenas usuários ativos, ordenados por nome.
    """,
)
async def list_sdr_users(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    from sqlalchemy import or_
    from sqlalchemy.orm import joinedload
    from app.models.role import Role
    from app.models.card import Card

    sdr_role_ids = [r.id for r in db.query(Role).filter(Role.name.ilike("sdr")).all()]
    sdr_card_user_ids = [
        row[0] for row in db.query(Card.sdr_id).filter(Card.sdr_id.isnot(None)).distinct().all()
    ]

    if not sdr_role_ids and not sdr_card_user_ids:
        return []

    users = (
        db.query(User)
        .options(joinedload(User.role))
        .filter(
            User.is_active == True,
            User.is_deleted == False,
            or_(User.role_id.in_(sdr_role_ids), User.id.in_(sdr_card_user_ids)),
        )
        .order_by(User.name)
        .all()
    )

    return [
        UserResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            name=user.name,
            avatar_url=user.avatar_url,
            phone=getattr(user, 'phone', None),
            email_signature=getattr(user, 'email_signature', None),
            role_id=user.role_id,
            is_active=user.is_active,
            last_login_at=user.last_login_at,
            created_at=user.created_at,
            updated_at=user.updated_at,
            role=user.role.name if user.role else None,
            role_name=user.role.display_name if user.role else None,
        )
        for user in users
    ]


@router.get(
    "/online",
    summary="Usuários online (sessões ativas)",
    description="""
    Lista todos os usuários com sessão ativa no Redis (últimos 15 minutos de atividade).

    **Disponível para:** admin e manager

    **Retorna:**
    - Lista de usuários com sessão ativa, agrupados por usuário
    - last_activity: timestamp da última ação
    - ip: endereço IP da sessão
    - active_sessions: número de abas/sessões abertas pelo mesmo usuário

    **Nota:** Se o Redis estiver offline, retorna lista vazia (graceful degradation).
    """,
    responses={
        200: {
            "description": "Lista de usuários online retornada com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "total": 2,
                        "users": [
                            {
                                "user_id": 1,
                                "name": "João Silva",
                                "email": "joao@exemplo.com",
                                "last_activity": "2026-03-05T14:30:00",
                                "ip": "192.168.1.10",
                                "active_sessions": 2
                            }
                        ]
                    }
                }
            }
        }
    }
)
async def get_online_users_route(
    current_user: User = Depends(require_manager_or_admin()),
    db: Session = Depends(get_db)
) -> Any:
    """
    Endpoint de usuários com sessão ativa no Redis.
    Agrupa por user_id (um usuário pode ter múltiplas abas abertas).
    Precisa estar antes de /{user_id} para evitar conflito de rota.
    """
    from app.core.redis_sessions import session_manager

    # Busca todas as sessões ativas no Redis
    active_sessions = await session_manager.get_active_sessions()

    if not active_sessions:
        return {"total": 0, "users": []}

    # Agrupa sessões por user_id
    sessions_by_user: dict = {}
    for session in active_sessions:
        uid = session.get("user_id")
        if not uid:
            continue
        if uid not in sessions_by_user:
            sessions_by_user[uid] = {
                "last_activity": session.get("last_activity", ""),
                "created_at": session.get("created_at", ""),  # Hora do login (primeira sessão)
                "ip": session.get("ip", ""),
                "count": 0,
            }
        sessions_by_user[uid]["count"] += 1
        # Mantém a atividade mais recente (ISO string — comparação lexicográfica funciona)
        if session.get("last_activity", "") > sessions_by_user[uid]["last_activity"]:
            sessions_by_user[uid]["last_activity"] = session.get("last_activity", "")
            sessions_by_user[uid]["ip"] = session.get("ip", "")
        # Mantém o created_at mais antigo (primeiro login do usuário)
        if session.get("created_at", "") < sessions_by_user[uid]["created_at"]:
            sessions_by_user[uid]["created_at"] = session.get("created_at", "")

    if not sessions_by_user:
        return {"total": 0, "users": []}

    # Busca os usuários no banco para obter nome e email
    user_ids = [int(uid) for uid in sessions_by_user.keys()]
    users_in_db = (
        db.query(User)
        .filter(User.id.in_(user_ids), User.is_deleted == False)
        .all()
    )
    user_map = {u.id: u for u in users_in_db}

    result = []
    for uid_str, data in sessions_by_user.items():
        uid = int(uid_str)
        user = user_map.get(uid)
        if not user:
            continue
        result.append({
            "user_id": uid,
            "name": user.name,
            "email": user.email,
            "last_activity": data["last_activity"],
            "created_at": data["created_at"],  # Hora do login mais antigo ativo
            "ip": data["ip"],
            "active_sessions": data["count"],
        })

    # Ordena por last_activity decrescente (mais recente primeiro)
    result.sort(key=lambda x: x["last_activity"], reverse=True)

    return {"total": len(result), "users": result}


@router.get("/{user_id}", response_model=UserResponse, summary="Buscar usuário")
async def get_user(
    user_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Busca um usuário por ID.

    - **user_id**: ID do usuário
    """
    service = UserService(db)
    user = service.get_user_by_id(user_id)

    # Converte para response schema
    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        name=user.name,
        avatar_url=user.avatar_url,
        phone=getattr(user, 'phone', None),
            email_signature=getattr(user, 'email_signature', None),
        role_id=user.role_id,
        is_active=user.is_active,
        last_login_at=user.last_login_at,
        created_at=user.created_at,
        updated_at=user.updated_at,
        role=user.role.name if user.role else None,
        role_name=user.role.display_name if user.role else None,
    )


@router.post(
    "",
    response_model=UserResponse,
    summary="Criar usuário",
    description="""
    Cria um novo usuário no sistema.

    **Campos obrigatórios:**
    - `email`: Email único (formato válido)
    - `username`: Nome de usuário único (3-30 caracteres)
    - `password`: Senha forte (mínimo 6 caracteres)
    - `name`: Nome completo do usuário

    **Campos opcionais:**
    - `role_id`: ID do role (padrão: 2 - salesperson)
    - `avatar_url`: URL do avatar
    - `phone`: Telefone de contato

    **Validações:**
    - Email deve ser único no sistema
    - Username deve ser único no sistema
    - Senha é automaticamente criptografada com bcrypt
    - Email deve ter formato válido

    **Permissões:**
    - Apenas admins podem criar usuários

    **Segurança:**
    - Senha nunca é retornada na resposta
    - Hash bcrypt com salt automático
    """,
    status_code=201,
    responses={
        201: {
            "description": "Usuário criado com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "id": 10,
                        "email": "maria@exemplo.com",
                        "username": "maria",
                        "name": "Maria Santos",
                        "role_id": 2,
                        "role_name": "Vendedor",
                        "is_active": True,
                        "created_at": "2026-01-06T15:30:00"
                    }
                }
            }
        },
        400: {
            "description": "Email ou username já existe",
            "content": {
                "application/json": {
                    "examples": {
                        "email_exists": {"value": {"detail": "Email já cadastrado"}},
                        "username_exists": {"value": {"detail": "Nome de usuário já cadastrado"}}
                    }
                }
            }
        },
        401: {
            "description": "Não autenticado",
            "content": {"application/json": {"example": {"detail": "Not authenticated"}}}
        }
    }
)
async def create_user(
    request: Request,
    user_data: UserCreate,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
) -> Any:
    """
    Endpoint de criação de usuário.
    """
    service = UserService(db)
    user = service.create_user(user_data)

    # Registra no audit log
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    data_after = {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "username": user.username,
        "role_id": user.role_id,
        "is_active": user.is_active,
    }

    audit_log = AuditLog(
        user_id=current_user.id,
        action="CREATE",
        entity_type="User",
        entity_id=user.id,
        description=f"Usuário criado: {user.name} ({user.email})",
        data_after=data_after,
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(audit_log)
    db.commit()

    # Converte para response schema
    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        name=user.name,
        avatar_url=user.avatar_url,
        phone=getattr(user, 'phone', None),
            email_signature=getattr(user, 'email_signature', None),
        role_id=user.role_id,
        is_active=user.is_active,
        last_login_at=user.last_login_at,
        created_at=user.created_at,
        updated_at=user.updated_at,
        role=user.role.name if user.role else None,
        role_name=user.role.display_name if user.role else None,
    )


@router.put("/{user_id}", response_model=UserResponse, summary="Atualizar usuário")
async def update_user(
    request: Request,
    user_id: int,
    user_data: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Atualiza um usuário existente.

    - **user_id**: ID do usuário
    - Todos os campos são opcionais
    """
    # Captura estado anterior ANTES de atualizar
    user_before_obj = db.query(User).filter(User.id == user_id).first()
    data_before = None
    if user_before_obj:
        data_before = {
            "name": user_before_obj.name,
            "email": user_before_obj.email,
            "phone": getattr(user_before_obj, "phone", None),
            "role_id": user_before_obj.role_id,
            "is_active": user_before_obj.is_active,
        }

    service = UserService(db)
    user = service.update_user(user_id, user_data, current_user)

    # Registra no audit log
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    # Constrói descrição com campos alterados
    changed_fields = []
    if user_data.name is not None:
        changed_fields.append("nome")
    if user_data.email is not None:
        changed_fields.append("email")
    if user_data.phone is not None:
        changed_fields.append("telefone")
    if user_data.role_id is not None:
        changed_fields.append("role")
    if user_data.is_active is not None:
        changed_fields.append("status")

    fields_str = ", ".join(changed_fields) if changed_fields else "dados"

    data_after = {
        "name": user.name,
        "email": user.email,
        "phone": getattr(user, "phone", None),
        "role_id": user.role_id,
        "is_active": user.is_active,
    }

    audit_log = AuditLog(
        user_id=current_user.id,
        action="UPDATE",
        entity_type="User",
        entity_id=user.id,
        description=f"Usuário atualizado: {user.name} - Campos alterados: {fields_str}",
        data_before=data_before,
        data_after=data_after,
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(audit_log)
    db.commit()

    # Converte para response schema
    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        name=user.name,
        avatar_url=user.avatar_url,
        phone=getattr(user, 'phone', None),
            email_signature=getattr(user, 'email_signature', None),
        role_id=user.role_id,
        is_active=user.is_active,
        last_login_at=user.last_login_at,
        created_at=user.created_at,
        updated_at=user.updated_at,
        role=user.role.name if user.role else None,
        role_name=user.role.display_name if user.role else None,
    )


@router.delete("/{user_id}", summary="Deletar usuário")
async def delete_user(
    request: Request,
    user_id: int,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
) -> Any:
    """
    Deleta um usuário (soft delete).

    - **user_id**: ID do usuário
    """
    # Captura estado do usuário ANTES de deletar para registrar no log
    user = db.query(User).filter(User.id == user_id).first()
    user_name = user.name if user else f"ID {user_id}"
    user_email = user.email if user else "unknown"

    data_before = None
    if user:
        data_before = {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "username": user.username,
            "phone": getattr(user, "phone", None),
            "role_id": user.role_id,
            "is_active": user.is_active,
        }

    service = UserService(db)
    service.delete_user(user_id, current_user)

    # Registra no audit log
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    audit_log = AuditLog(
        user_id=current_user.id,
        action="DELETE",
        entity_type="User",
        entity_id=user_id,
        description=f"Usuário deletado: {user_name} ({user_email})",
        data_before=data_before,
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(audit_log)
    db.commit()

    return {"message": "Usuário deletado com sucesso"}


@router.post("/me/change-password", summary="Alterar senha")
async def change_password(
    request: Request,
    password_data: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Altera a senha do usuário autenticado.

    - **current_password**: Senha atual
    - **new_password**: Nova senha (mínimo 6 caracteres)
    """
    service = UserService(db)
    service.change_password(
        user_id=current_user.id,
        current_password=password_data.current_password,
        new_password=password_data.new_password
    )

    # Registra no audit log
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    audit_log = AuditLog(
        user_id=current_user.id,
        action="PASSWORD_CHANGE",
        entity_type="User",
        entity_id=current_user.id,
        description=f"Senha alterada pelo usuário: {current_user.name}",
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(audit_log)
    db.commit()

    return {"message": "Senha alterada com sucesso"}


@router.get(
    "/me/notification-settings",
    response_model=UserNotificationSettingResponse,
    summary="Configurações de notificação do usuário logado",
    description="""
    Retorna as configurações de notificação in-app do usuário autenticado.
    Se o usuário ainda não configurou as preferências, cria automaticamente com todos os tipos ativos.

    **Tipos de notificação disponíveis:**
    - `task_assigned`: Tarefa atribuída ao usuário
    - `task_due_soon`: Tarefa com prazo próximo (< 24h)
    - `card_moved`: Card movido para outra lista
    - `card_product_changed`: Produto do card alterado
    - `achievement_unlocked`: Conquista/badge desbloqueada (gamificação)
    """,
    responses={
        200: {
            "description": "Configurações retornadas com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "user_id": 1,
                        "task_assigned": True,
                        "task_due_soon": True,
                        "card_moved": False,
                        "card_product_changed": True,
                        "achievement_unlocked": True,
                        "created_at": "2026-03-05T10:00:00",
                        "updated_at": "2026-03-05T14:30:00"
                    }
                }
            }
        }
    }
)
async def get_notification_settings(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Retorna (ou cria com defaults) as configurações de notificação do usuário.
    """
    service = UserNotificationService(db)
    return service.get_or_create(current_user.id)


@router.put(
    "/me/notification-settings",
    response_model=UserNotificationSettingResponse,
    summary="Atualizar configurações de notificação",
    description="""
    Atualiza as preferências de notificação in-app do usuário autenticado.
    Apenas os campos enviados serão alterados (demais permanecem com valor atual).

    **Exemplo:** Para desativar apenas notificações de card movido:
    ```json
    { "card_moved": false }
    ```
    """,
    responses={
        200: {
            "description": "Configurações atualizadas com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "user_id": 1,
                        "task_assigned": True,
                        "task_due_soon": True,
                        "card_moved": False,
                        "card_product_changed": True,
                        "achievement_unlocked": True,
                        "created_at": "2026-03-05T10:00:00",
                        "updated_at": "2026-03-05T15:00:00"
                    }
                }
            }
        }
    }
)
async def update_notification_settings(
    data: UserNotificationSettingUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Atualiza as configurações de notificação do usuário.
    Cria o registro se ainda não existir.
    """
    service = UserNotificationService(db)
    return service.update(current_user.id, data)
