"""
Service para gerenciar Integration Clients (autenticação via client_credentials)
"""

import secrets
import hashlib
from datetime import datetime
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.integration_client import IntegrationClient
from app.core.security import verify_password, hash_password


class IntegrationClientService:
    """Service para gerenciar integration clients"""

    def __init__(self, db: Session):
        self.db = db

    def generate_client_credentials(self) -> Tuple[str, str]:
        """
        Gera um novo par de client_id e client_secret.

        Returns:
            Tuple[client_id, client_secret]: Par de credenciais geradas
        """
        # Gera client_id: prefixo + 32 caracteres aleatórios
        client_id = f"hsg_{secrets.token_urlsafe(24)}"

        # Gera client_secret: 48 caracteres aleatórios
        client_secret = secrets.token_urlsafe(48)

        return client_id, client_secret

    def create_client(
        self,
        name: str,
        description: Optional[str] = None,
        impersonate_user_id: Optional[int] = None
    ) -> Tuple[IntegrationClient, str]:
        """
        Cria um novo integration client.

        Args:
            name: Nome descritivo do client
            description: Descrição opcional
            impersonate_user_id: ID do usuário que será usado como criador nas ações

        Returns:
            Tuple[IntegrationClient, client_secret]: Client criado e o secret (retorna apenas uma vez!)
        """
        # Gera credenciais
        client_id, client_secret = self.generate_client_credentials()

        # Hash do secret (NUNCA armazena plain text)
        client_secret_hash = hash_password(client_secret)

        # Cria o client
        client = IntegrationClient(
            name=name,
            description=description,
            client_id=client_id,
            client_secret_hash=client_secret_hash,
            impersonate_user_id=impersonate_user_id,
            is_active=True
        )

        self.db.add(client)
        self.db.commit()
        self.db.refresh(client)

        # Retorna o client e o secret plain (única vez que será mostrado!)
        return client, client_secret

    def authenticate(self, client_id: str, client_secret: str) -> Optional[IntegrationClient]:
        """
        Autentica um integration client.

        Args:
            client_id: ID do client
            client_secret: Secret do client

        Returns:
            IntegrationClient se autenticado, None caso contrário
        """
        # Busca o client
        client = self.db.query(IntegrationClient).filter(
            IntegrationClient.client_id == client_id,
            IntegrationClient.is_active == True
        ).first()

        if not client:
            return None

        # Verifica o secret
        if not verify_password(client_secret, client.client_secret_hash):
            return None

        # Atualiza last_used_at
        client.last_used_at = datetime.utcnow()
        self.db.commit()

        return client

    def get_by_id(self, client_id: int) -> Optional[IntegrationClient]:
        """Busca client por ID"""
        return self.db.query(IntegrationClient).filter(
            IntegrationClient.id == client_id
        ).first()

    def get_by_client_id(self, client_id: str) -> Optional[IntegrationClient]:
        """Busca client por client_id"""
        return self.db.query(IntegrationClient).filter(
            IntegrationClient.client_id == client_id
        ).first()

    def list_all(self) -> list[IntegrationClient]:
        """Lista todos os integration clients"""
        return self.db.query(IntegrationClient).order_by(
            IntegrationClient.created_at.desc()
        ).all()

    def deactivate(self, client_id: int) -> IntegrationClient:
        """Desativa um integration client"""
        client = self.get_by_id(client_id)
        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Integration client não encontrado"
            )

        client.is_active = False
        self.db.commit()
        self.db.refresh(client)

        return client

    def activate(self, client_id: int) -> IntegrationClient:
        """Ativa um integration client"""
        client = self.get_by_id(client_id)
        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Integration client não encontrado"
            )

        client.is_active = True
        self.db.commit()
        self.db.refresh(client)

        return client

    def delete(self, client_id: int) -> None:
        """
        Deleta um integration client permanentemente.
        Use com cuidado! Prefira desativar ao invés de deletar.
        """
        client = self.get_by_id(client_id)
        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Integration client não encontrado"
            )

        self.db.delete(client)
        self.db.commit()
