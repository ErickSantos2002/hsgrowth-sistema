"""
Repository para operações de banco de dados relacionadas à API4COM.
"""
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
from datetime import datetime, timezone
from cryptography.fernet import Fernet
import os

from app.models.api4com import API4ComConfig, UserExtension, CallLog
from app.models.user import User
from app.schemas.api4com import (
    API4ComConfigCreate,
    API4ComConfigUpdate,
    UserExtensionCreate,
    UserExtensionUpdate
)


# Chave para criptografia reversível da senha da API4COM
# IMPORTANTE: Em produção, usar variável de ambiente
ENCRYPTION_KEY = os.getenv("API4COM_ENCRYPTION_KEY", Fernet.generate_key())
cipher_suite = Fernet(ENCRYPTION_KEY)


class API4ComRepository:
    """Repository para gerenciar dados da API4COM no banco."""

    def __init__(self, db: Session):
        self.db = db

    # ========== Config Methods ==========

    def get_config(self) -> Optional[API4ComConfig]:
        """
        Retorna a configuração ativa da API4COM.

        Deve existir apenas uma configuração no sistema.
        """
        return self.db.query(API4ComConfig).first()

    def create_config(
        self,
        config_data: API4ComConfigCreate,
        user_id: int
    ) -> API4ComConfig:
        """
        Cria uma nova configuração da API4COM.

        Args:
            config_data: Dados da configuração (email e senha)
            user_id: ID do usuário que está criando

        Returns:
            Configuração criada
        """
        # Criptografa a senha antes de salvar (Fernet - reversível)
        password_encrypted = cipher_suite.encrypt(config_data.password.encode()).decode()

        config = API4ComConfig(
            email=config_data.email,
            password_encrypted=password_encrypted,
            is_active=False,  # Inicia desativada até obter token
            created_by_id=user_id,
            updated_by_id=user_id
        )

        self.db.add(config)
        self.db.commit()
        self.db.refresh(config)

        return config

    def update_config(
        self,
        config: API4ComConfig,
        config_data: API4ComConfigUpdate,
        user_id: int
    ) -> API4ComConfig:
        """
        Atualiza uma configuração existente.

        Args:
            config: Configuração a ser atualizada
            config_data: Novos dados
            user_id: ID do usuário que está atualizando

        Returns:
            Configuração atualizada
        """
        update_data = config_data.model_dump(exclude_unset=True)

        # Se estiver atualizando a senha, criptografa com Fernet
        if "password" in update_data:
            password_encrypted = cipher_suite.encrypt(update_data.pop("password").encode()).decode()
            update_data["password_encrypted"] = password_encrypted

        # Atualiza campos
        for field, value in update_data.items():
            setattr(config, field, value)

        config.updated_by_id = user_id
        config.updated_at = datetime.now(timezone.utc)

        self.db.commit()
        self.db.refresh(config)

        return config

    def update_token(
        self,
        config: API4ComConfig,
        token: str,
        expires_at: datetime
    ) -> API4ComConfig:
        """
        Atualiza o token de autenticação da configuração.

        Args:
            config: Configuração a atualizar
            token: Novo token recebido da API
            expires_at: Data de expiração do token

        Returns:
            Configuração atualizada
        """
        config.api_token = token
        config.token_expires_at = expires_at
        config.is_active = True
        config.last_sync_at = datetime.now(timezone.utc)

        self.db.commit()
        self.db.refresh(config)

        return config

    def update_test_result(
        self,
        config: API4ComConfig,
        success: bool,
        error: Optional[str] = None
    ) -> API4ComConfig:
        """
        Atualiza o resultado do último teste de conexão.

        Args:
            config: Configuração a atualizar
            success: Se o teste foi bem-sucedido
            error: Mensagem de erro, se houver

        Returns:
            Configuração atualizada
        """
        config.last_test_at = datetime.now(timezone.utc)
        config.last_test_success = success
        config.last_test_error = error

        self.db.commit()
        self.db.refresh(config)

        return config

    def get_decrypted_password(self, config: API4ComConfig) -> str:
        """
        Retorna a senha descriptografada usando Fernet.

        Args:
            config: Configuração com senha criptografada

        Returns:
            Senha em texto plano (para fazer login na API4COM)
        """
        # Descriptografa a senha usando Fernet
        decrypted_password = cipher_suite.decrypt(config.password_encrypted.encode()).decode()
        return decrypted_password

    # ========== Extension Methods ==========

    def list_extensions(self) -> List[UserExtension]:
        """
        Lista todos os ramais cadastrados.

        Returns:
            Lista de ramais com dados dos usuários
        """
        return (
            self.db.query(UserExtension)
            .options(joinedload(UserExtension.user))
            .order_by(UserExtension.user_id)
            .all()
        )

    def get_extension_by_user(self, user_id: int) -> Optional[UserExtension]:
        """
        Busca ramal por user_id.

        Args:
            user_id: ID do usuário

        Returns:
            Ramal encontrado ou None
        """
        return (
            self.db.query(UserExtension)
            .filter(UserExtension.user_id == user_id)
            .first()
        )

    def get_extension_by_id(self, extension_id: int) -> Optional[UserExtension]:
        """
        Busca ramal por ID.

        Args:
            extension_id: ID do ramal

        Returns:
            Ramal encontrado ou None
        """
        return (
            self.db.query(UserExtension)
            .filter(UserExtension.id == extension_id)
            .first()
        )

    def create_extension(
        self,
        extension_data: UserExtensionCreate
    ) -> UserExtension:
        """
        Cria ramal para um usuário.

        Args:
            extension_data: Dados do ramal (user_id e extension)

        Returns:
            Ramal criado
        """
        extension = UserExtension(
            user_id=extension_data.user_id,
            extension=extension_data.extension,
            is_active=True
        )

        self.db.add(extension)
        self.db.commit()
        self.db.refresh(extension)

        return extension

    def update_extension(
        self,
        extension: UserExtension,
        extension_data: UserExtensionUpdate
    ) -> UserExtension:
        """
        Atualiza ramal existente.

        Args:
            extension: Ramal a ser atualizado
            extension_data: Novos dados

        Returns:
            Ramal atualizado
        """
        update_data = extension_data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(extension, field, value)

        extension.updated_at = datetime.now(timezone.utc)

        self.db.commit()
        self.db.refresh(extension)

        return extension

    def delete_extension(self, extension: UserExtension) -> None:
        """
        Remove ramal.

        Args:
            extension: Ramal a ser removido
        """
        self.db.delete(extension)
        self.db.commit()

    # ========== Call Log Methods ==========

    def create_call_log(
        self,
        user_id: int,
        card_id: Optional[int],
        phone: str,
        extension: str,
        service_card_id: Optional[int] = None,
    ) -> CallLog:
        """
        Cria registro de chamada telefônica.

        Args:
            user_id: ID do vendedor que está fazendo a chamada
            card_id: ID do card de vendas de origem (opcional)
            phone: Telefone para onde está ligando
            extension: Ramal usado para fazer a chamada
            service_card_id: ID do card de serviços de origem (opcional)

        Returns:
            Registro de chamada criado
        """
        call_log = CallLog(
            user_id=user_id,
            card_id=card_id,
            service_card_id=service_card_id,
            phone=phone,
            extension=extension,
            status="pending"  # Status inicial
        )

        self.db.add(call_log)
        self.db.commit()
        self.db.refresh(call_log)

        return call_log

    def get_call_log_by_id(self, call_log_id: int) -> Optional[CallLog]:
        """
        Busca chamada por ID.

        Args:
            call_log_id: ID do registro de chamada

        Returns:
            Registro encontrado ou None
        """
        return (
            self.db.query(CallLog)
            .filter(CallLog.id == call_log_id)
            .first()
        )

    def get_call_log_by_api4com_id(self, api4com_call_id: str) -> Optional[CallLog]:
        """
        Busca chamada pelo ID retornado pela API4COM.

        Args:
            api4com_call_id: ID da chamada na API4COM

        Returns:
            Registro encontrado ou None
        """
        return (
            self.db.query(CallLog)
            .filter(CallLog.api4com_call_id == api4com_call_id)
            .first()
        )

    def update_call_log(
        self,
        call_log: CallLog,
        status: Optional[str] = None,
        duration: Optional[int] = None,
        recording_url: Optional[str] = None,
        api4com_call_id: Optional[str] = None,
        error_message: Optional[str] = None,
        call_metadata: Optional[str] = None
    ) -> CallLog:
        """
        Atualiza dados da chamada.

        Args:
            call_log: Registro a ser atualizado
            status: Novo status da chamada
            duration: Duração em segundos
            recording_url: URL da gravação
            api4com_call_id: ID da chamada na API4COM
            error_message: Mensagem de erro
            call_metadata: Metadata adicional (JSON string)

        Returns:
            Registro atualizado
        """
        if status is not None:
            call_log.status = status
        if duration is not None:
            call_log.duration = duration
        if recording_url is not None:
            call_log.recording_url = recording_url
        if api4com_call_id is not None:
            call_log.api4com_call_id = api4com_call_id
        if error_message is not None:
            call_log.error_message = error_message
        if call_metadata is not None:
            call_log.call_metadata = call_metadata

        call_log.updated_at = datetime.now(timezone.utc)

        self.db.commit()
        self.db.refresh(call_log)

        return call_log

    def list_call_logs_by_card(self, card_id: int) -> List[CallLog]:
        """
        Lista todas as chamadas de um card específico.

        Args:
            card_id: ID do card

        Returns:
            Lista de chamadas do card
        """
        return (
            self.db.query(CallLog)
            .filter(CallLog.card_id == card_id)
            .order_by(CallLog.created_at.desc())
            .all()
        )

    def list_call_logs_by_user(self, user_id: int) -> List[CallLog]:
        """
        Lista todas as chamadas de um usuário específico.

        Args:
            user_id: ID do usuário

        Returns:
            Lista de chamadas do usuário
        """
        return (
            self.db.query(CallLog)
            .filter(CallLog.user_id == user_id)
            .order_by(CallLog.created_at.desc())
            .all()
        )
