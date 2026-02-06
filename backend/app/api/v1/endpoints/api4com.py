"""
Endpoints REST para gerenciar integração com API4COM (VOIP).
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List

from app.api.deps import get_db, get_current_active_user
from app.models.user import User
from app.models.audit_log import AuditLog
from app.services.api4com_service import API4ComService
from app.schemas.api4com import (
    API4ComConfigCreate,
    API4ComConfigResponse,
    UserExtensionCreate,
    UserExtensionResponse,
    API4ComTestResponse,
    CallRequest,
    CallResponse,
    WebhookCallData
)


router = APIRouter()


# ========== Config Endpoints ==========

@router.get(
    "/config",
    response_model=API4ComConfigResponse,
    summary="Obter configuração API4COM",
    responses={
        200: {
            "description": "Configuração atual da API4COM",
            "content": {"application/json": {"example": {
                "id": 1,
                "email": "admin@minhaempresa.com",
                "is_active": True,
                "has_valid_token": True,
                "token_expires_at": "2026-01-16T10:00:00",
                "last_test_at": "2026-01-15T10:00:00",
                "last_test_success": True,
                "last_test_error": None,
                "created_at": "2026-01-01T10:00:00",
                "updated_at": "2026-01-15T10:00:00"
            }}}
        },
        403: {
            "description": "Acesso negado - apenas admin/gerente",
            "content": {"application/json": {"example": {
                "detail": "Apenas admin e gerente podem acessar configurações"
            }}}
        }
    }
)
async def get_api4com_config(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Retorna a configuração atual da API4COM.

    **Permissões:** Admin ou Gerente

    Returns:
        Configuração da API4COM com status do token
    """
    # Valida permissão
    if current_user.role.name not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas admin e gerente podem acessar configurações"
        )

    service = API4ComService(db)
    return await service.get_config()


@router.post(
    "/config",
    response_model=API4ComConfigResponse,
    summary="Salvar configuração API4COM",
    responses={
        200: {
            "description": "Configuração salva/atualizada com sucesso",
            "content": {"application/json": {"example": {
                "id": 1,
                "email": "admin@minhaempresa.com",
                "is_active": True,
                "has_valid_token": True,
                "token_expires_at": "2026-01-16T10:00:00",
                "last_test_at": None,
                "last_test_success": None,
                "last_test_error": None,
                "created_at": "2026-01-15T10:00:00",
                "updated_at": "2026-01-15T10:00:00"
            }}}
        },
        400: {
            "description": "Falha ao conectar com API4COM",
            "content": {"application/json": {"example": {
                "detail": "Falha ao autenticar na API4COM. Verifique email e senha."
            }}}
        },
        403: {
            "description": "Acesso negado - apenas admin",
            "content": {"application/json": {"example": {
                "detail": "Apenas admin pode configurar credenciais"
            }}}
        },
        422: {
            "description": "Dados inválidos na requisição",
            "content": {"application/json": {"example": {
                "detail": [{"loc": ["body", "email"], "msg": "value is not a valid email address", "type": "value_error.email"}]
            }}}
        }
    }
)
async def save_api4com_config(
    request: Request,
    config_data: API4ComConfigCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Salva ou atualiza a configuração da API4COM.

    Ao salvar, faz login na API4COM para obter e armazenar o token de autenticação.

    **Permissões:** Apenas Admin

    Args:
        config_data: Email e senha da conta API4COM

    Returns:
        Configuração salva com token gerado

    Raises:
        403: Se usuário não for admin
        400: Se falhar ao conectar com API4COM
    """
    # Valida permissão (apenas admin pode salvar credenciais)
    if current_user.role.name != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas admin pode configurar credenciais"
        )

    # Verifica se já existe configuração
    from app.models.api4com import API4ComConfig
    existing_config = db.query(API4ComConfig).filter(API4ComConfig.is_deleted == False).first()
    is_update = existing_config is not None

    service = API4ComService(db)
    config = await service.save_config(config_data, current_user)

    # Registra no audit log
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    action = "CONFIG_UPDATE" if is_update else "CONFIG_CREATE"
    action_desc = "atualizada" if is_update else "criada"

    audit_log = AuditLog(
        user_id=current_user.id,
        action=action,
        entity_type="API4ComConfig",
        entity_id=config.id,
        description=f"Configuração API4Com {action_desc}: {config.email}",
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(audit_log)
    db.commit()

    return config


@router.post(
    "/test",
    response_model=API4ComTestResponse,
    summary="Testar conexão API4COM",
    responses={
        200: {
            "description": "Resultado do teste de conexão",
            "content": {"application/json": {"examples": {
                "sucesso": {
                    "summary": "Conexão bem-sucedida",
                    "value": {
                        "success": True,
                        "message": "Conexão com API4COM estabelecida com sucesso",
                        "token_valid": True,
                        "error": None
                    }
                },
                "falha": {
                    "summary": "Conexão falhou",
                    "value": {
                        "success": False,
                        "message": "Falha ao conectar com API4COM",
                        "token_valid": False,
                        "error": "Token expirado. Reconfigure as credenciais."
                    }
                }
            }}}
        },
        403: {
            "description": "Acesso negado - apenas admin/gerente",
            "content": {"application/json": {"example": {
                "detail": "Apenas admin e gerente podem testar conexão"
            }}}
        },
        404: {
            "description": "Configuração não encontrada",
            "content": {"application/json": {"example": {
                "detail": "Configuração da API4COM não encontrada. Configure primeiro."
            }}}
        }
    }
)
async def test_api4com_connection(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Testa a conexão com a API4COM usando o token atual.

    **Permissões:** Admin ou Gerente

    Returns:
        Resultado do teste (sucesso/falha e detalhes)

    Raises:
        403: Se usuário não tiver permissão
        404: Se configuração não existir
    """
    # Valida permissão
    if current_user.role.name not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas admin e gerente podem testar conexão"
        )

    service = API4ComService(db)
    return await service.test_connection()


# ========== Extension Endpoints ==========

@router.get(
    "/extensions",
    response_model=List[UserExtensionResponse],
    summary="Listar ramais",
    responses={
        200: {
            "description": "Lista de ramais cadastrados com dados dos vendedores",
            "content": {"application/json": {"example": [
                {
                    "id": 1,
                    "user_id": 5,
                    "extension": "1000",
                    "is_active": True,
                    "created_at": "2026-01-15T10:00:00",
                    "user_name": "João Silva",
                    "user_email": "joao@minhaempresa.com"
                },
                {
                    "id": 2,
                    "user_id": 8,
                    "extension": "1001",
                    "is_active": True,
                    "created_at": "2026-01-15T11:00:00",
                    "user_name": "Carlos Oliveira",
                    "user_email": "carlos@minhaempresa.com"
                }
            ]}}
        },
        403: {
            "description": "Acesso negado - apenas admin/gerente",
            "content": {"application/json": {"example": {
                "detail": "Apenas admin e gerente podem listar ramais"
            }}}
        }
    }
)
def list_extensions(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Lista todos os ramais cadastrados.

    **Permissões:** Admin ou Gerente

    Returns:
        Lista de ramais com dados dos vendedores vinculados

    Raises:
        403: Se usuário não tiver permissão
    """
    # Valida permissão
    if current_user.role.name not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas admin e gerente podem listar ramais"
        )

    service = API4ComService(db)
    return service.list_extensions()


@router.post(
    "/extensions",
    response_model=UserExtensionResponse,
    summary="Criar/atualizar ramal",
    responses={
        200: {
            "description": "Ramal criado ou atualizado com sucesso",
            "content": {"application/json": {"example": {
                "id": 1,
                "user_id": 5,
                "extension": "1000",
                "is_active": True,
                "created_at": "2026-01-15T10:00:00",
                "user_name": "João Silva",
                "user_email": "joao@minhaempresa.com"
            }}}
        },
        403: {
            "description": "Acesso negado - apenas admin/gerente",
            "content": {"application/json": {"example": {
                "detail": "Apenas admin e gerente podem gerenciar ramais"
            }}}
        },
        404: {
            "description": "Vendedor não encontrado",
            "content": {"application/json": {"example": {
                "detail": "Usuário com ID 99 não encontrado"
            }}}
        },
        422: {
            "description": "Dados inválidos na requisição",
            "content": {"application/json": {"example": {
                "detail": [{"loc": ["body", "extension"], "msg": "field required", "type": "value_error.missing"}]
            }}}
        }
    }
)
def save_extension(
    request: Request,
    extension_data: UserExtensionCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Cria ou atualiza ramal de um vendedor.

    Se o vendedor já tiver ramal, atualiza. Caso contrário, cria um novo.

    **Permissões:** Admin ou Gerente

    Args:
        extension_data: user_id e extension (número do ramal)

    Returns:
        Ramal criado/atualizado

    Raises:
        403: Se usuário não tiver permissão
        404: Se o vendedor não existir
    """
    # Valida permissão
    if current_user.role.name not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas admin e gerente podem gerenciar ramais"
        )

    # Verifica se já existe extension para esse usuário
    from app.models.api4com import UserExtension
    existing_extension = db.query(UserExtension).filter(
        UserExtension.user_id == extension_data.user_id,
        UserExtension.is_deleted == False
    ).first()
    is_update = existing_extension is not None

    service = API4ComService(db)
    user_extension = service.save_extension(extension_data, current_user)

    # Busca o nome do usuário para o log
    user = db.query(User).filter(User.id == extension_data.user_id).first()
    user_name = user.name if user else f"Usuário ID {extension_data.user_id}"

    # Registra no audit log
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    action = "EXTENSION_UPDATE" if is_update else "EXTENSION_CREATE"
    action_desc = "atualizado" if is_update else "criado"

    audit_log = AuditLog(
        user_id=current_user.id,
        action=action,
        entity_type="UserExtension",
        entity_id=user_extension.id,
        description=f"Ramal {action_desc}: {user_name} → Ramal {user_extension.extension}",
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(audit_log)
    db.commit()

    return user_extension


@router.delete(
    "/extensions/{user_id}",
    summary="Remover ramal",
    responses={
        200: {
            "description": "Ramal removido com sucesso",
            "content": {"application/json": {"example": {
                "message": "Ramal removido com sucesso",
                "user_id": 5
            }}}
        },
        403: {
            "description": "Acesso negado - apenas admin/gerente",
            "content": {"application/json": {"example": {
                "detail": "Apenas admin e gerente podem remover ramais"
            }}}
        },
        404: {
            "description": "Ramal não encontrado para o usuário",
            "content": {"application/json": {"example": {
                "detail": "Ramal não encontrado para o usuário com ID 99"
            }}}
        }
    }
)
def delete_extension(
    request: Request,
    user_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Remove ramal de um vendedor.

    **Permissões:** Admin ou Gerente

    Args:
        user_id: ID do usuário (vendedor)

    Returns:
        Mensagem de sucesso

    Raises:
        403: Se usuário não tiver permissão
        404: Se ramal não for encontrado
    """
    # Valida permissão
    if current_user.role.name not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas admin e gerente podem remover ramais"
        )

    # Busca informações antes de deletar para o log
    from app.models.api4com import UserExtension
    user_extension = db.query(UserExtension).filter(
        UserExtension.user_id == user_id,
        UserExtension.is_deleted == False
    ).first()

    extension_number = user_extension.extension if user_extension else "desconhecido"

    user = db.query(User).filter(User.id == user_id).first()
    user_name = user.name if user else f"Usuário ID {user_id}"

    service = API4ComService(db)
    service.delete_extension(user_id, current_user)

    # Registra no audit log
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    audit_log = AuditLog(
        user_id=current_user.id,
        action="EXTENSION_DELETE",
        entity_type="UserExtension",
        entity_id=user_extension.id if user_extension else None,
        description=f"Ramal removido: {user_name} - Ramal {extension_number}",
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(audit_log)
    db.commit()

    return {
        "message": "Ramal removido com sucesso",
        "user_id": user_id
    }


# ========== Call Endpoints ==========

@router.post(
    "/call",
    response_model=CallResponse,
    summary="Realizar chamada telefônica",
    responses={
        200: {
            "description": "Chamada iniciada com sucesso",
            "content": {"application/json": {"example": {
                "success": True,
                "message": "Chamada iniciada com sucesso para +5548999887766",
                "call_log_id": 15,
                "error": None
            }}}
        },
        400: {
            "description": "API4COM não configurada ou usuário sem ramal",
            "content": {"application/json": {"examples": {
                "sem_config": {
                    "summary": "API4COM não configurada",
                    "value": {
                        "detail": "API4COM não está configurada. Peça ao administrador para configurar."
                    }
                },
                "sem_ramal": {
                    "summary": "Usuário sem ramal",
                    "value": {
                        "detail": "Você não possui ramal configurado. Solicite ao gerente."
                    }
                }
            }}}
        },
        422: {
            "description": "Dados inválidos na requisição",
            "content": {"application/json": {"example": {
                "detail": [{"loc": ["body", "phone"], "msg": "field required", "type": "value_error.missing"}]
            }}}
        }
    }
)
async def make_call(
    call_request: CallRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Realiza uma chamada telefônica via API4COM.

    **Funcionamento:**
    1. Verifica se usuário tem ramal configurado
    2. Verifica se API4COM está configurada e ativa
    3. Cria registro da chamada no banco (call_log)
    4. Envia requisição para API4COM com metadata personalizada
    5. Webphone do usuário abrirá automaticamente para realizar a chamada

    **Permissões:** Qualquer usuário autenticado com ramal configurado

    Args:
        call_request: Telefone e card_id da chamada

    Returns:
        Resultado da operação (sucesso/falha)

    Raises:
        400: Se API4COM não estiver configurada ou usuário não tiver ramal
        401: Se usuário não estiver autenticado
    """
    service = API4ComService(db)
    return await service.make_call(call_request, current_user)


@router.post(
    "/webhook",
    summary="Webhook da API4COM",
    responses={
        200: {
            "description": "Webhook processado com sucesso",
            "content": {"application/json": {"example": {
                "message": "Webhook processado com sucesso",
                "call_id": "call_abc123"
            }}}
        }
    }
)
async def receive_webhook(
    webhook_data: WebhookCallData,
    db: Session = Depends(get_db)
):
    """
    Recebe webhook da API4COM quando uma chamada termina.

    **Importante:**
    - Este endpoint é chamado pela API4COM, não por usuários
    - Não requer autenticação (webhook público)
    - Atualiza o call_log com dados finais da chamada

    **Dados recebidos:**
    - ID da chamada
    - Duração
    - Status final (completed, failed, no_answer, etc)
    - URL da gravação
    - Metadata (gateway, card_id, etc)

    Args:
        webhook_data: Dados da chamada finalizada

    Returns:
        Confirmação de recebimento
    """
    service = API4ComService(db)
    await service.process_webhook(webhook_data)

    return {
        "message": "Webhook processado com sucesso",
        "call_id": webhook_data.id
    }
