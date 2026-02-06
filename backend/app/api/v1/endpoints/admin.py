"""
Endpoints Administrativos.
Rotas exclusivas para administradores do sistema.
"""
from typing import Any, Optional
from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.orm import Session
from sqlalchemy import text, func
import time
from loguru import logger

from app.api.deps import get_db, get_current_active_user, require_role
from app.schemas.admin import (
    AuditLogResponse,
    AuditLogListResponse,
    SQLQueryRequest,
    SQLQueryResponse,
    AutomationMonitorResponse,
    AutomationMonitorItem,
    SystemStatsResponse,
    AdminPasswordResetRequest,
    AdminPasswordResetResponse
)
from app.schemas.user import UserCreate, UserResponse
from app.models.user import User
from app.models.board import Board
from app.models.card import Card
from app.models.automation import Automation
from app.models.automation_execution import AutomationExecution
from app.models.card_transfer import CardTransfer
from app.models.notification import Notification
from app.models.audit_log import AuditLog
from app.repositories.user_repository import UserRepository
from app.services.user_service import UserService
from app.core.security import hash_password

router = APIRouter()


# ================== Gestão de Usuários ==================

@router.get(
    "/users",
    response_model=dict,
    summary="[Admin] Listar todos os usuários",
    responses={
        200: {
            "description": "Lista de usuários retornada com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "items": [
                            {
                                "id": 1,
                                "name": "Carlos Eduardo Silva",
                                "email": "carlos.silva@hsgrowth.com.br",
                                "role": "admin",
                                "is_active": True,
                                "created_at": "2025-06-15T10:30:00Z"
                            },
                            {
                                "id": 2,
                                "name": "Fernanda Oliveira",
                                "email": "fernanda.oliveira@hsgrowth.com.br",
                                "role": "user",
                                "is_active": True,
                                "created_at": "2025-07-20T14:00:00Z"
                            }
                        ],
                        "total": 25,
                        "page": 1,
                        "page_size": 50,
                        "total_pages": 1
                    }
                }
            },
        },
        403: {
            "description": "Acesso negado - apenas administradores",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Apenas administradores podem acessar esta rota"
                    }
                }
            },
        },
    },
)
async def list_all_users(
    page: int = Query(1, ge=1, description="Número da página"),
    page_size: int = Query(50, ge=1, le=100, description="Tamanho da página"),
    is_active: Optional[bool] = Query(None, description="Filtrar por status ativo"),
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
) -> Any:
    """
    **[ADMIN ONLY]** Lista todos os usuários do sistema com paginação.

    - **page**: Número da página (padrão: 1)
    - **page_size**: Tamanho da página (padrão: 50, máx: 100)
    - **is_active**: Filtrar por status ativo (opcional)

    **Requer:** Role de admin
    """
    query = db.query(User).filter(User.is_deleted == False)

    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    # Total
    total = query.count()

    # Paginação
    users = query.order_by(User.created_at.desc()).offset(
        (page - 1) * page_size
    ).limit(page_size).all()

    # Converte para response
    from app.schemas.user import UserResponse
    items = [UserResponse.model_validate(u) for u in users]

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }


@router.post(
    "/users",
    response_model=UserResponse,
    summary="[Admin] Criar usuário",
    status_code=201,
    responses={
        201: {
            "description": "Usuário criado com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "id": 3,
                        "name": "Juliana Martins",
                        "email": "juliana.martins@hsgrowth.com.br",
                        "role": "user",
                        "is_active": True,
                        "created_at": "2025-09-10T09:15:00Z"
                    }
                }
            },
        },
        400: {
            "description": "Dados inválidos ou e-mail já cadastrado",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Já existe um usuário cadastrado com este e-mail"
                    }
                }
            },
        },
        403: {
            "description": "Acesso negado - apenas administradores",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Apenas administradores podem acessar esta rota"
                    }
                }
            },
        },
        422: {
            "description": "Erro de validação nos dados enviados",
            "content": {
                "application/json": {
                    "example": {
                        "detail": [
                            {
                                "loc": ["body", "email"],
                                "msg": "value is not a valid email address",
                                "type": "value_error.email"
                            }
                        ]
                    }
                }
            },
        },
    },
)
async def admin_create_user(
    data: UserCreate,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
) -> Any:
    """
    **[ADMIN ONLY]** Cria um novo usuário.

    **Requer:** Role de admin
    """
    service = UserService(db)
    return service.create_user(data)


@router.put(
    "/users/{user_id}/reset-password",
    response_model=AdminPasswordResetResponse,
    summary="[Admin] Resetar senha de usuário",
    responses={
        200: {
            "description": "Senha resetada com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "message": "Senha resetada com sucesso",
                        "user_id": 5,
                        "temporary_password": "aB3$kLm9xQ1!"
                    }
                }
            },
        },
        403: {
            "description": "Acesso negado - apenas administradores",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Apenas administradores podem acessar esta rota"
                    }
                }
            },
        },
        404: {
            "description": "Usuário não encontrado",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Usuário não encontrado"
                    }
                }
            },
        },
    },
)
async def admin_reset_user_password(
    user_id: int = Path(..., description="ID do usuário"),
    data: AdminPasswordResetRequest = None,
    generate_temp: bool = Query(False, description="Gerar senha temporária"),
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
) -> Any:
    """
    **[ADMIN ONLY]** Reseta a senha de um usuário.

    - **user_id**: ID do usuário
    - **generate_temp**: Se True, gera uma senha temporária aleatória

    **Requer:** Role de admin
    """
    user_repo = UserRepository(db)
    user = user_repo.find_by_id(user_id)

    if not user:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )

    # Gera senha temporária ou usa a fornecida
    if generate_temp:
        import secrets
        import string
        alphabet = string.ascii_letters + string.digits + "!@#$%"
        temp_password = ''.join(secrets.choice(alphabet) for _ in range(12))
    else:
        if not data or not data.new_password:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nova senha é obrigatória"
            )
        temp_password = data.new_password

    # Atualiza senha
    user.password_hash = hash_password(temp_password)
    db.commit()

    logger.info(f"Admin {current_user.id} resetou senha do usuário {user_id}")

    return AdminPasswordResetResponse(
        message="Senha resetada com sucesso",
        user_id=user_id,
        temporary_password=temp_password if generate_temp else None
    )


# ================== Logs de Auditoria ==================

@router.get(
    "/logs",
    response_model=AuditLogListResponse,
    summary="[Admin] Visualizar logs de auditoria",
    responses={
        200: {
            "description": "Logs de auditoria retornados com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "items": [
                            {
                                "id": 142,
                                "user_id": 1,
                                "user_name": "Carlos Eduardo Silva",
                                "action": "UPDATE",
                                "entity_type": "Card",
                                "entity_id": 87,
                                "details": "Moveu card 'Proposta Comercial - Empresa ABC Ltda' para coluna 'Fechamento'",
                                "ip_address": "192.168.1.50",
                                "user_agent": "Mozilla/5.0",
                                "created_at": "2025-09-10T16:45:00Z"
                            },
                            {
                                "id": 141,
                                "user_id": 2,
                                "user_name": "Fernanda Oliveira",
                                "action": "CREATE",
                                "entity_type": "Board",
                                "entity_id": 12,
                                "details": "Criou board 'Pipeline Vendas Q4 2025'",
                                "ip_address": "10.0.0.15",
                                "user_agent": "Mozilla/5.0",
                                "created_at": "2025-09-10T14:20:00Z"
                            }
                        ],
                        "total": 1420,
                        "page": 1,
                        "page_size": 50,
                        "total_pages": 29
                    }
                }
            },
        },
        403: {
            "description": "Acesso negado - apenas administradores",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Apenas administradores podem acessar esta rota"
                    }
                }
            },
        },
    },
)
async def get_audit_logs(
    page: int = Query(1, ge=1, description="Número da página"),
    page_size: int = Query(50, ge=1, le=200, description="Tamanho da página"),
    user_id: Optional[int] = Query(None, description="Filtrar por usuário"),
    action: Optional[str] = Query(None, description="Filtrar por ação"),
    entity_type: Optional[str] = Query(None, description="Filtrar por tipo de entidade"),
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
) -> Any:
    """
    **[ADMIN ONLY]** Visualiza logs de auditoria do sistema.

    - **page**: Número da página (padrão: 1)
    - **page_size**: Tamanho da página (padrão: 50, máx: 200)
    - **user_id**: Filtrar por usuário (opcional)
    - **action**: Filtrar por ação (opcional)
    - **entity_type**: Filtrar por tipo de entidade (opcional)

    **Requer:** Role de admin
    """
    query = db.query(AuditLog)

    if user_id:
        query = query.filter(AuditLog.user_id == user_id)

    if action:
        query = query.filter(AuditLog.action == action)

    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)

    # Total
    total = query.count()

    # Paginação (mais recentes primeiro)
    logs = query.order_by(AuditLog.created_at.desc()).offset(
        (page - 1) * page_size
    ).limit(page_size).all()

    # Adiciona nome do usuário
    items = []
    for log in logs:
        log_dict = {
            "id": log.id,
            "user_id": log.user_id,
            "user_name": None,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "details": log.details,
            "ip_address": log.ip_address,
            "user_agent": log.user_agent,
            "created_at": log.created_at
        }

        # Busca nome do usuário
        if log.user_id:
            user = db.query(User).filter(User.id == log.user_id).first()
            if user:
                log_dict["user_name"] = user.name

        items.append(AuditLogResponse(**log_dict))

    return AuditLogListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


# ================== Execução de Query SQL ==================

@router.post(
    "/database/query",
    response_model=SQLQueryResponse,
    summary="[Admin] Executar query SQL",
    responses={
        200: {
            "description": "Query executada com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "columns": ["id", "name", "email", "role"],
                        "rows": [
                            [1, "Carlos Eduardo Silva", "carlos.silva@hsgrowth.com.br", "admin"],
                            [2, "Fernanda Oliveira", "fernanda.oliveira@hsgrowth.com.br", "user"],
                            [3, "Ricardo Mendes", "ricardo.mendes@hsgrowth.com.br", "user"]
                        ],
                        "row_count": 3,
                        "execution_time_ms": 12.45
                    }
                }
            },
        },
        400: {
            "description": "Erro de sintaxe ou execução da query SQL",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Erro ao executar query: (psycopg2.errors.UndefinedTable) relation \"tabela_inexistente\" does not exist"
                    }
                }
            },
        },
        403: {
            "description": "Acesso negado ou query não permitida",
            "content": {
                "application/json": {
                    "examples": {
                        "acesso_negado": {
                            "summary": "Usuário sem permissão de admin",
                            "value": {
                                "detail": "Apenas administradores podem acessar esta rota"
                            }
                        },
                        "query_proibida": {
                            "summary": "Query com palavra-chave proibida",
                            "value": {
                                "detail": "Query não permitida. Apenas SELECT é permitido. Palavra proibida: DELETE"
                            }
                        },
                        "query_nao_select": {
                            "summary": "Query que não começa com SELECT",
                            "value": {
                                "detail": "Query deve começar com SELECT"
                            }
                        }
                    }
                }
            },
        },
    },
)
async def execute_sql_query(
    request: SQLQueryRequest,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
) -> Any:
    """
    **[ADMIN ONLY]** Executa uma query SQL no banco de dados.

    **IMPORTANTE:**
    - Apenas queries SELECT são permitidas
    - Queries de modificação (INSERT, UPDATE, DELETE, DROP, etc) serão bloqueadas
    - Use com cuidado e apenas para consultas

    **Requer:** Role de admin
    """
    from fastapi import HTTPException, status

    # Valida que é apenas SELECT
    query_lower = request.query.strip().lower()
    dangerous_keywords = ["insert", "update", "delete", "drop", "alter", "create", "truncate", "grant", "revoke"]

    for keyword in dangerous_keywords:
        if keyword in query_lower:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Query não permitida. Apenas SELECT é permitido. Palavra proibida: {keyword.upper()}"
            )

    if not query_lower.startswith("select"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Query deve começar com SELECT"
        )

    try:
        # Executa query
        start_time = time.time()
        result = db.execute(text(request.query))
        execution_time_ms = (time.time() - start_time) * 1000

        # Extrai colunas e linhas
        columns = list(result.keys())
        rows = [list(row) for row in result.fetchall()]

        logger.info(f"Admin {current_user.id} executou query SQL: {request.query[:100]}...")

        return SQLQueryResponse(
            columns=columns,
            rows=rows,
            row_count=len(rows),
            execution_time_ms=round(execution_time_ms, 2)
        )

    except Exception as e:
        logger.error(f"Erro ao executar query SQL: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao executar query: {str(e)}"
        )


# ================== Monitoramento de Automações ==================

@router.get(
    "/automations/monitor",
    response_model=AutomationMonitorResponse,
    summary="[Admin] Monitorar automações",
    responses={
        200: {
            "description": "Dados de monitoramento das automações",
            "content": {
                "application/json": {
                    "example": {
                        "total_automations": 8,
                        "active_automations": 6,
                        "inactive_automations": 2,
                        "total_executions_today": 47,
                        "failed_executions_today": 3,
                        "automations": [
                            {
                                "automation_id": 1,
                                "automation_name": "Enviar e-mail de boas-vindas ao novo lead",
                                "is_active": True,
                                "total_executions": 320,
                                "successful_executions": 315,
                                "failed_executions": 5,
                                "last_execution_at": "2025-09-10T17:30:00Z",
                                "last_execution_status": "success",
                                "average_execution_time_ms": None
                            },
                            {
                                "automation_id": 2,
                                "automation_name": "Notificar vendedor quando card muda de coluna",
                                "is_active": True,
                                "total_executions": 1580,
                                "successful_executions": 1575,
                                "failed_executions": 5,
                                "last_execution_at": "2025-09-10T17:25:00Z",
                                "last_execution_status": "success",
                                "average_execution_time_ms": None
                            }
                        ]
                    }
                }
            },
        },
        403: {
            "description": "Acesso negado - apenas administradores",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Apenas administradores podem acessar esta rota"
                    }
                }
            },
        },
    },
)
async def monitor_automations(
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
) -> Any:
    """
    **[ADMIN ONLY]** Monitora o status e desempenho de todas as automações.

    **Retorna:**
    - Total de automações (ativas/inativas)
    - Estatísticas de execuções (hoje)
    - Detalhes de cada automação com métricas

    **Requer:** Role de admin
    """
    from datetime import date

    # Estatísticas gerais
    total_automations = db.query(func.count(Automation.id)).scalar() or 0
    active_automations = db.query(func.count(Automation.id)).filter(
        Automation.is_active == True
    ).scalar() or 0
    inactive_automations = total_automations - active_automations

    # Execuções de hoje
    today = date.today()
    total_executions_today = db.query(func.count(AutomationExecution.id)).filter(
        func.date(AutomationExecution.executed_at) == today
    ).scalar() or 0

    failed_executions_today = db.query(func.count(AutomationExecution.id)).filter(
        func.date(AutomationExecution.executed_at) == today,
        AutomationExecution.status == "failed"
    ).scalar() or 0

    # Detalhes de cada automação
    automations = db.query(Automation).all()
    automation_items = []

    for automation in automations:
        # Estatísticas de execuções
        total_execs = db.query(func.count(AutomationExecution.id)).filter(
            AutomationExecution.automation_id == automation.id
        ).scalar() or 0

        successful_execs = db.query(func.count(AutomationExecution.id)).filter(
            AutomationExecution.automation_id == automation.id,
            AutomationExecution.status == "success"
        ).scalar() or 0

        failed_execs = total_execs - successful_execs

        # Última execução
        last_execution = db.query(AutomationExecution).filter(
            AutomationExecution.automation_id == automation.id
        ).order_by(AutomationExecution.executed_at.desc()).first()

        automation_items.append(AutomationMonitorItem(
            automation_id=automation.id,
            automation_name=automation.name,
            is_active=automation.is_active,
            total_executions=total_execs,
            successful_executions=successful_execs,
            failed_executions=failed_execs,
            last_execution_at=last_execution.executed_at if last_execution else None,
            last_execution_status=last_execution.status if last_execution else None,
            average_execution_time_ms=None  # TODO: Calcular média de tempo
        ))

    return AutomationMonitorResponse(
        total_automations=total_automations,
        active_automations=active_automations,
        inactive_automations=inactive_automations,
        total_executions_today=total_executions_today,
        failed_executions_today=failed_executions_today,
        automations=automation_items
    )


# ================== Estatísticas do Sistema ==================

@router.get(
    "/stats",
    response_model=SystemStatsResponse,
    summary="[Admin] Estatísticas do sistema",
    responses={
        200: {
            "description": "Estatísticas gerais do sistema",
            "content": {
                "application/json": {
                    "example": {
                        "total_users": 25,
                        "active_users": 22,
                        "total_boards": 12,
                        "total_cards": 487,
                        "total_automations": 8,
                        "total_transfers": 1320,
                        "total_notifications": 5640,
                        "database_size_mb": 156.78
                    }
                }
            },
        },
        403: {
            "description": "Acesso negado - apenas administradores",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Apenas administradores podem acessar esta rota"
                    }
                }
            },
        },
    },
)
async def get_system_stats(
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
) -> Any:
    """
    **[ADMIN ONLY]** Retorna estatísticas gerais do sistema.

    **Retorna:**
    - Total de usuários, boards, cards, etc
    - Tamanho do banco de dados (se disponível)

    **Requer:** Role de admin
    """
    # Conta entidades
    total_users = db.query(func.count(User.id)).filter(User.is_deleted == False).scalar() or 0
    active_users = db.query(func.count(User.id)).filter(
        User.is_deleted == False,
        User.is_active == True
    ).scalar() or 0
    total_boards = db.query(func.count(Board.id)).scalar() or 0
    total_cards = db.query(func.count(Card.id)).scalar() or 0
    total_automations = db.query(func.count(Automation.id)).scalar() or 0
    total_transfers = db.query(func.count(CardTransfer.id)).scalar() or 0
    total_notifications = db.query(func.count(Notification.id)).scalar() or 0

    # Tamanho do banco (PostgreSQL específico)
    try:
        db_size_query = text("SELECT pg_database_size(current_database()) / 1024.0 / 1024.0 AS size_mb")
        result = db.execute(db_size_query).fetchone()
        database_size_mb = round(float(result[0]), 2) if result else None
    except Exception as e:
        logger.warning(f"Não foi possível obter tamanho do banco: {e}")
        database_size_mb = None

    return SystemStatsResponse(
        total_users=total_users,
        active_users=active_users,
        total_boards=total_boards,
        total_cards=total_cards,
        total_automations=total_automations,
        total_transfers=total_transfers,
        total_notifications=total_notifications,
        database_size_mb=database_size_mb
    )
