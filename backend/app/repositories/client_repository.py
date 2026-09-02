"""
Client Repository - Operações de acesso a dados de clientes.
Implementa o padrão Repository para isolamento da camada de dados.
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from app.models.client import Client
from app.schemas.client import ClientCreate, ClientUpdate


class ClientRepository:
    """
    Repository para operações de banco de dados relacionadas a clientes.
    """

    def __init__(self, db: Session):
        self.db = db

    def find_by_id(self, client_id: int) -> Optional[Client]:
        """
        Busca um cliente por ID.

        Args:
            client_id: ID do cliente

        Returns:
            Client ou None se não encontrado
        """
        return self.db.query(Client).filter(
            Client.id == client_id,
            Client.is_deleted == False
        ).first()

    def find_by_email(self, email: str) -> Optional[Client]:
        """
        Busca um cliente por email.

        Args:
            email: Email do cliente

        Returns:
            Client ou None se não encontrado
        """
        return self.db.query(Client).filter(
            Client.email == email,
            Client.is_deleted == False
        ).first()

    def find_by_document(self, document: str) -> Optional[Client]:
        """
        Busca um cliente por documento (CPF/CNPJ).

        Args:
            document: Documento do cliente

        Returns:
            Client ou None se não encontrado
        """
        return self.db.query(Client).filter(
            Client.document == document,
            Client.is_deleted == False
        ).first()

    def list_all(
        self,
        skip: int = 0,
        limit: int = 100,
        is_active: Optional[bool] = None,
        search: Optional[str] = None,
        state: Optional[str] = None
    ) -> List[Client]:
        """
        Lista todos os clientes do sistema.

        Args:
            skip: Número de registros para pular (paginação)
            limit: Limite de registros a retornar
            is_active: Filtro por status ativo (opcional)
            search: Termo de busca (nome, email, empresa, telefone)
            state: Filtro por estado (UF)

        Returns:
            Lista de clientes
        """
        query = self.db.query(Client).filter(
            Client.is_deleted == False
        )

        # Filtro de status
        if is_active is not None:
            query = query.filter(Client.is_active == is_active)

        # Filtro de estado
        if state:
            query = query.filter(Client.state == state)

        # Busca por termo (nome, email, empresa, telefone, documento)
        if search:
            search_term = f"%{search}%"
            # Extrai só os dígitos do termo para busca por CPF/CNPJ formatado (ex: "08.857" → "08857")
            digits_only = "".join(c for c in search if c.isdigit())
            conditions = [
                Client.name.ilike(search_term),
                Client.email.ilike(search_term),
                Client.company_name.ilike(search_term),
                Client.phone.ilike(search_term),
                Client.document.ilike(search_term),
            ]
            if digits_only:
                conditions.append(Client.document.ilike(f"%{digits_only}%"))
            query = query.filter(or_(*conditions))

        # Ordenação: mais recentes primeiro
        query = query.order_by(Client.created_at.desc())

        return query.offset(skip).limit(limit).all()

    def count_all(
        self,
        is_active: Optional[bool] = None,
        search: Optional[str] = None,
        state: Optional[str] = None
    ) -> int:
        """
        Conta todos os clientes do sistema.

        Args:
            is_active: Filtro por status ativo (opcional)
            search: Termo de busca (nome, email, empresa, telefone)
            state: Filtro por estado (UF)

        Returns:
            Contagem de clientes
        """
        query = self.db.query(func.count(Client.id)).filter(
            Client.is_deleted == False
        )

        # Filtro de status
        if is_active is not None:
            query = query.filter(Client.is_active == is_active)

        # Filtro de estado
        if state:
            query = query.filter(Client.state == state)

        # Busca por termo
        if search:
            search_term = f"%{search}%"
            digits_only = "".join(c for c in search if c.isdigit())
            conditions = [
                Client.name.ilike(search_term),
                Client.email.ilike(search_term),
                Client.company_name.ilike(search_term),
                Client.phone.ilike(search_term),
                Client.document.ilike(search_term),
            ]
            if digits_only:
                conditions.append(Client.document.ilike(f"%{digits_only}%"))
            query = query.filter(or_(*conditions))

        return query.scalar()

    def exists_email(self, email: str, exclude_id: Optional[int] = None) -> bool:
        """
        Verifica se existe um cliente com o email informado.

        Args:
            email: Email a verificar
            exclude_id: ID para excluir da verificação (útil em updates)

        Returns:
            True se existe, False caso contrário
        """
        query = self.db.query(Client).filter(
            Client.email == email,
            Client.is_deleted == False
        )

        if exclude_id:
            query = query.filter(Client.id != exclude_id)

        return query.first() is not None

    def exists_document(self, document: str, exclude_id: Optional[int] = None) -> bool:
        """
        Verifica se existe um cliente com o mesmo documento, comparando apenas os
        DÍGITOS — assim "30.511.844/0001-68" e "30511844000168" são o mesmo CNPJ.
        Evita duplicados criados por diferença de formatação.

        Args:
            document: Documento a verificar
            exclude_id: ID para excluir da verificação (útil em updates)

        Returns:
            True se existe, False caso contrário
        """
        import re
        digits = re.sub(r"\D", "", document or "")
        if not digits:
            return False

        # Normaliza o documento gravado para só dígitos direto no SQL (Postgres).
        norm_stored = func.regexp_replace(Client.document, r"[^0-9]", "", "g")
        query = self.db.query(Client).filter(
            norm_stored == digits,
            Client.is_deleted == False
        )

        if exclude_id:
            query = query.filter(Client.id != exclude_id)

        return query.first() is not None

    def create(self, client_data: ClientCreate) -> Client:
        """
        Cria um novo cliente.

        Args:
            client_data: Dados do cliente

        Returns:
            Client criado
        """
        client = Client(**client_data.model_dump(exclude_unset=True))
        self.db.add(client)
        self.db.commit()
        self.db.refresh(client)
        return client

    def update(self, client: Client, client_data: ClientUpdate) -> Client:
        """
        Atualiza um cliente existente.

        Args:
            client: Cliente a ser atualizado
            client_data: Novos dados

        Returns:
            Client atualizado
        """
        update_data = client_data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(client, field, value)

        self.db.commit()
        self.db.refresh(client)
        return client

    def delete(self, client: Client) -> None:
        """
        Deleta um cliente (soft delete).

        Args:
            client: Cliente a ser deletado
        """
        from datetime import datetime

        client.is_deleted = True
        client.deleted_at = datetime.utcnow()
        self.db.commit()
