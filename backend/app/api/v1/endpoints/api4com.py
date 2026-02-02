"""
Endpoints REST para gerenciar integração com API4COM (VOIP).
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.api.deps import get_db, get_current_active_user
from app.models.user import User
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

@router.get("/config", response_model=API4ComConfigResponse)
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


@router.post("/config", response_model=API4ComConfigResponse)
async def save_api4com_config(
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

    service = API4ComService(db)
    return await service.save_config(config_data, current_user)


@router.post("/test", response_model=API4ComTestResponse)
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

@router.get("/extensions", response_model=List[UserExtensionResponse])
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


@router.post("/extensions", response_model=UserExtensionResponse)
def save_extension(
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

    service = API4ComService(db)
    return service.save_extension(extension_data, current_user)


@router.delete("/extensions/{user_id}")
def delete_extension(
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

    service = API4ComService(db)
    service.delete_extension(user_id, current_user)

    return {
        "message": "Ramal removido com sucesso",
        "user_id": user_id
    }


# ========== Call Endpoints ==========

@router.post("/call", response_model=CallResponse)
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


@router.post("/webhook")
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
