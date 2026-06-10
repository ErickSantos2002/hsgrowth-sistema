"""
Service para lógica de negócio da integração com API4COM.
"""
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone

from app.repositories.api4com_repository import API4ComRepository
from app.services.api4com_client import API4ComClient
from app.schemas.api4com import (
    API4ComConfigCreate,
    API4ComConfigUpdate,
    API4ComConfigResponse,
    UserExtensionCreate,
    UserExtensionUpdate,
    UserExtensionResponse,
    API4ComTestResponse,
    CallRequest,
    CallResponse,
    WebhookCallData
)
from app.models.user import User
from app.models.api4com import API4ComConfig, UserExtension


class API4ComService:
    """Service para gerenciar a integração com API4COM."""

    def __init__(self, db: Session):
        self.db = db
        self.repository = API4ComRepository(db)

    # ========== Config Methods ==========

    async def get_config(self) -> API4ComConfigResponse:
        """
        Retorna a configuração atual da API4COM.

        Returns:
            Configuração encontrada

        Raises:
            HTTPException: Se não houver configuração
        """
        config = self.repository.get_config()

        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Configuração da API4COM não encontrada"
            )

        # Verifica se o token está válido
        has_valid_token = False
        if config.api_token and config.token_expires_at:
            has_valid_token = config.token_expires_at > datetime.now(timezone.utc)

        # Monta response
        return API4ComConfigResponse(
            id=config.id,
            email=config.email,
            is_active=config.is_active,
            has_valid_token=has_valid_token,
            token_expires_at=config.token_expires_at,
            last_test_at=config.last_test_at,
            last_test_success=config.last_test_success,
            last_test_error=config.last_test_error,
            created_at=config.created_at,
            updated_at=config.updated_at
        )

    async def save_config(
        self,
        config_data: API4ComConfigCreate,
        current_user: User
    ) -> API4ComConfigResponse:
        """
        Salva ou atualiza configuração da API4COM e obtém token.

        Args:
            config_data: Dados da configuração (email e senha)
            current_user: Usuário que está salvando

        Returns:
            Configuração salva com token gerado

        Raises:
            HTTPException: Se falhar ao obter token
        """
        existing_config = self.repository.get_config()

        if existing_config:
            # Atualiza configuração existente
            update_data = API4ComConfigUpdate(
                email=config_data.email,
                password=config_data.password
            )
            config = self.repository.update_config(
                config=existing_config,
                config_data=update_data,
                user_id=current_user.id
            )
        else:
            # Cria nova configuração
            config = self.repository.create_config(
                config_data=config_data,
                user_id=current_user.id
            )

        # Tenta fazer login na API4COM para obter token
        try:
            client = API4ComClient()
            login_response = await client.login(
                email=config_data.email,
                password=config_data.password
            )

            # Extrai token e TTL
            token = login_response.get("id")
            ttl_seconds = int(login_response.get("ttl", 1209600))  # Default: 14 dias

            # Calcula data de expiração
            expires_at = datetime.now(timezone.utc) + timedelta(seconds=ttl_seconds)

            # Atualiza token no banco
            config = self.repository.update_token(
                config=config,
                token=token,
                expires_at=expires_at
            )

            # Marca teste como sucesso
            self.repository.update_test_result(config, success=True)

        except Exception as e:
            # Marca teste como falha
            error_msg = str(e)
            self.repository.update_test_result(
                config,
                success=False,
                error=error_msg
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Erro ao conectar com API4COM: {error_msg}"
            )

        return await self.get_config()

    async def test_connection(self) -> API4ComTestResponse:
        """
        Testa a conexão com a API4COM usando o token atual.

        Returns:
            Resultado do teste

        Raises:
            HTTPException: Se não houver configuração
        """
        config = self.repository.get_config()

        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Configuração não encontrada"
            )

        if not config.api_token:
            return API4ComTestResponse(
                success=False,
                message="Token não configurado",
                token_valid=False,
                error="Faça login primeiro para obter um token"
            )

        # Verifica expiração
        if config.token_expires_at and config.token_expires_at <= datetime.now(timezone.utc):
            return API4ComTestResponse(
                success=False,
                message="Token expirado",
                token_valid=False,
                error="Token expirou, faça login novamente"
            )

        # Testa conexão
        try:
            client = API4ComClient(token=config.api_token)
            is_valid = await client.test_connection()

            # Atualiza resultado do teste
            self.repository.update_test_result(
                config,
                success=is_valid,
                error=None if is_valid else "Token inválido"
            )

            if is_valid:
                return API4ComTestResponse(
                    success=True,
                    message="Conexão estabelecida com sucesso",
                    token_valid=True
                )
            else:
                return API4ComTestResponse(
                    success=False,
                    message="Token inválido",
                    token_valid=False,
                    error="Token rejeitado pela API4COM"
                )

        except Exception as e:
            error_msg = str(e)
            self.repository.update_test_result(config, success=False, error=error_msg)

            return API4ComTestResponse(
                success=False,
                message="Erro ao testar conexão",
                token_valid=False,
                error=error_msg
            )

    async def refresh_token(self) -> None:
        """
        Renova o token se estiver próximo de expirar (menos de 1 dia).

        Este método deve ser chamado periodicamente (ex: scheduler).
        """
        config = self.repository.get_config()

        if not config or not config.token_expires_at:
            return

        # Se faltar menos de 1 dia para expirar, renova
        time_until_expiration = config.token_expires_at - datetime.now(timezone.utc)
        if time_until_expiration.total_seconds() < 86400:  # 24 horas
            # Descriptografa senha usando método do repository
            try:
                decrypted_password = self.repository.get_decrypted_password(config)

                # Faz novo login
                client = API4ComClient()
                login_response = await client.login(
                    email=config.email,
                    password=decrypted_password
                )

                token = login_response.get("id")
                ttl_seconds = int(login_response.get("ttl", 1209600))
                expires_at = datetime.now(timezone.utc) + timedelta(seconds=ttl_seconds)

                # Atualiza token
                self.repository.update_token(config, token, expires_at)

            except Exception:
                # Falha silenciosa, será detectada no próximo test_connection
                pass

    # ========== Extension Methods ==========

    def list_extensions(self) -> List[UserExtensionResponse]:
        """
        Lista todos os ramais cadastrados.

        Returns:
            Lista de ramais com dados dos usuários
        """
        extensions = self.repository.list_extensions()

        # Monta response com dados do usuário
        result = []
        for ext in extensions:
            result.append(
                UserExtensionResponse(
                    id=ext.id,
                    user_id=ext.user_id,
                    extension=ext.extension,
                    is_active=ext.is_active,
                    created_at=ext.created_at,
                    user_name=ext.user.name if ext.user else None,
                    user_email=ext.user.email if ext.user else None
                )
            )

        return result

    def save_extension(
        self,
        extension_data: UserExtensionCreate,
        current_user: User
    ) -> UserExtensionResponse:
        """
        Cria ou atualiza ramal de um vendedor.

        Args:
            extension_data: Dados do ramal (user_id e extension)
            current_user: Usuário que está salvando

        Returns:
            Ramal criado/atualizado

        Raises:
            HTTPException: Se o usuário não for encontrado ou já tiver ramal
        """
        # Verifica se o usuário existe
        user = self.db.query(User).filter(User.id == extension_data.user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado"
            )

        # Verifica se já existe ramal para este usuário
        existing = self.repository.get_extension_by_user(extension_data.user_id)

        if existing:
            # Atualiza ramal existente
            update_data = UserExtensionUpdate(extension=extension_data.extension)
            extension = self.repository.update_extension(existing, update_data)
        else:
            # Cria novo ramal
            extension = self.repository.create_extension(extension_data)

        return UserExtensionResponse(
            id=extension.id,
            user_id=extension.user_id,
            extension=extension.extension,
            is_active=extension.is_active,
            created_at=extension.created_at,
            user_name=user.name,
            user_email=user.email
        )

    def delete_extension(self, user_id: int, current_user: User) -> None:
        """
        Remove ramal de um vendedor.

        Args:
            user_id: ID do usuário
            current_user: Usuário que está removendo

        Raises:
            HTTPException: Se o ramal não for encontrado
        """
        extension = self.repository.get_extension_by_user(user_id)

        if not extension:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ramal não encontrado para este usuário"
            )

        self.repository.delete_extension(extension)

    # ========== Call Methods ==========

    async def make_call(
        self,
        call_request: CallRequest,
        current_user: User
    ) -> CallResponse:
        """
        Realiza uma chamada telefônica via API4COM.

        Args:
            call_request: Dados da chamada (phone, card_id)
            current_user: Usuário que está fazendo a chamada

        Returns:
            Resultado da chamada

        Raises:
            HTTPException: Se não houver configuração, ramal ou token
        """
        # 1. Verifica se existe configuração ativa
        config = self.repository.get_config()
        if not config or not config.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="API4COM não está configurada ou ativa"
            )

        # 2. Verifica se o token é válido
        if not config.api_token or not config.token_expires_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token não configurado. Faça login primeiro"
            )

        if config.token_expires_at <= datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token expirado. Configure novamente a API4COM"
            )

        # 3. Verifica se o usuário tem ramal configurado
        extension = self.repository.get_extension_by_user(current_user.id)
        if not extension or not extension.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Você não tem ramal configurado. Contate o administrador"
            )

        # 4. Cria registro de chamada no banco
        call_log = self.repository.create_call_log(
            user_id=current_user.id,
            card_id=call_request.card_id,
            phone=call_request.phone,
            extension=extension.extension,
            service_card_id=call_request.service_card_id,
        )

        # 5. Chama a API4COM para iniciar a chamada
        try:
            client = API4ComClient(token=config.api_token)

            # Metadata personalizada para rastreamento
            metadata = {
                "gateway": "GrowthHS",
                "card_id": call_request.card_id,
                "service_card_id": call_request.service_card_id,
                "user_id": current_user.id,
                "call_log_id": call_log.id
            }

            # Faz a chamada via /dialer endpoint
            dialer_response = await client.make_call(
                extension=extension.extension,
                phone=call_request.phone,
                metadata=metadata
            )

            # 6. Atualiza call_log com ID da API4COM se retornado
            api4com_call_id = dialer_response.get("id") or dialer_response.get("call_id")
            if api4com_call_id:
                self.repository.update_call_log(
                    call_log,
                    status="ringing",
                    api4com_call_id=str(api4com_call_id)
                )

            return CallResponse(
                success=True,
                message="Chamada iniciada com sucesso",
                call_log_id=call_log.id
            )

        except Exception as e:
            # Marca chamada como falha
            error_msg = str(e)
            self.repository.update_call_log(
                call_log,
                status="failed",
                error_message=error_msg
            )

            return CallResponse(
                success=False,
                message="Erro ao iniciar chamada",
                call_log_id=call_log.id,
                error=error_msg
            )

    async def process_webhook(self, webhook_data: WebhookCallData) -> None:
        """
        Processa webhook da API4COM quando uma chamada termina.

        Args:
            webhook_data: Dados recebidos do webhook

        Note:
            Atualiza o call_log com duração, gravação, status final
        """
        # Tenta encontrar o call_log pelo ID da API4COM
        if not webhook_data.id:
            return

        call_log = self.repository.get_call_log_by_api4com_id(webhook_data.id)

        if not call_log:
            # Chamada não foi registrada pelo nosso sistema, ignora
            return

        # Atualiza informações da chamada
        import json
        self.repository.update_call_log(
            call_log,
            status=webhook_data.status or "completed",
            duration=webhook_data.duration,
            recording_url=webhook_data.recording_url,
            call_metadata=json.dumps(webhook_data.metadata) if webhook_data.metadata else None
        )
