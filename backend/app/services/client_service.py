"""
Client Service - Lógica de negócio para clientes.
Implementa validações e regras de negócio.
"""
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories.client_repository import ClientRepository
from app.schemas.client import ClientCreate, ClientUpdate, ClientResponse, ClientListResponse
from app.models.client import Client
from app.models.user import User


class ClientService:
    """
    Service para lógica de negócio relacionada a clientes.
    """

    def __init__(self, db: Session):
        self.db = db
        self.repository = ClientRepository(db)

    def get_client_by_id(self, client_id: int) -> Client:
        """
        Busca um cliente por ID.

        Args:
            client_id: ID do cliente

        Returns:
            Client

        Raises:
            HTTPException: Se o cliente não for encontrado
        """
        client = self.repository.find_by_id(client_id)
        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cliente não encontrado"
            )
        return client

    def list_clients(
        self,
        page: int = 1,
        page_size: int = 50,
        is_active: Optional[bool] = None,
        search: Optional[str] = None,
        state: Optional[str] = None
    ) -> ClientListResponse:
        """
        Lista clientes do sistema com paginação.

        Args:
            page: Número da página (começa em 1)
            page_size: Tamanho da página
            is_active: Filtro por status ativo
            search: Termo de busca (nome, email, empresa, telefone)
            state: Filtro por estado (UF)

        Returns:
            ClientListResponse com lista paginada de clientes
        """
        # Calcula offset
        skip = (page - 1) * page_size

        # Busca clientes
        clients = self.repository.list_all(
            skip=skip,
            limit=page_size,
            is_active=is_active,
            search=search,
            state=state
        )

        # Conta total
        total = self.repository.count_all(
            is_active=is_active,
            search=search,
            state=state
        )

        # Calcula total de páginas
        total_pages = (total + page_size - 1) // page_size

        # Converte para response schema
        clients_response = [
            ClientResponse(
                id=client.id,
                name=client.name,
                email=client.email,
                phone=client.phone,
                company_name=client.company_name,
                document=client.document,
                address=client.address,
                city=client.city,
                state=client.state,
                country=client.country,
                website=client.website,
                notes=client.notes,
                source=client.source,
                is_active=client.is_active,
                created_at=client.created_at,
                updated_at=client.updated_at,
                is_deleted=client.is_deleted
            )
            for client in clients
        ]

        return ClientListResponse(
            clients=clients_response,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )

    def create_client(self, client_data: ClientCreate) -> Client:
        """
        Cria um novo cliente.

        Args:
            client_data: Dados do cliente

        Returns:
            Client criado

        Raises:
            HTTPException: Se email ou documento já existirem
        """
        # Valida se email já existe (se foi fornecido)
        if client_data.email and self.repository.exists_email(client_data.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email já cadastrado"
            )

        # Valida se documento já existe (se foi fornecido)
        if client_data.document and self.repository.exists_document(client_data.document):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Documento já cadastrado"
            )

        # Cria o cliente
        client = self.repository.create(client_data)
        return client

    def update_client(self, client_id: int, client_data: ClientUpdate) -> Client:
        """
        Atualiza um cliente existente.

        Args:
            client_id: ID do cliente
            client_data: Novos dados

        Returns:
            Client atualizado

        Raises:
            HTTPException: Se o cliente não for encontrado ou se houver conflito
        """
        # Busca o cliente
        client = self.get_client_by_id(client_id)

        # Valida email (se foi alterado)
        if client_data.email and client_data.email != client.email:
            if self.repository.exists_email(client_data.email, exclude_id=client_id):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email já cadastrado"
                )

        # Valida documento (se foi alterado)
        if client_data.document and client_data.document != client.document:
            if self.repository.exists_document(client_data.document, exclude_id=client_id):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Documento já cadastrado"
                )

        # Atualiza o cliente
        updated_client = self.repository.update(client, client_data)
        return updated_client

    def delete_client(self, client_id: int) -> None:
        """
        Deleta um cliente (soft delete).

        Args:
            client_id: ID do cliente

        Raises:
            HTTPException: Se o cliente não for encontrado
        """
        # Busca o cliente
        client = self.get_client_by_id(client_id)

        # Deleta (soft delete)
        self.repository.delete(client)
