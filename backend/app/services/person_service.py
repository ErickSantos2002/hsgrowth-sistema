"""
Person Service - Lógica de negócio para pessoas/contatos.
Implementa validações e regras de negócio.
"""
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories.person_repository import PersonRepository
from app.schemas.person import PersonCreate, PersonUpdate, PersonResponse, PersonListResponse
from app.models.person import Person


class PersonService:
    """
    Service para lógica de negócio relacionada a pessoas.
    """

    def __init__(self, db: Session):
        self.db = db
        self.repository = PersonRepository(db)

    def get_person_by_id(self, person_id: int) -> Person:
        """
        Busca uma pessoa por ID.

        Args:
            person_id: ID da pessoa

        Returns:
            Person

        Raises:
            HTTPException: Se a pessoa não for encontrada
        """
        person = self.repository.find_by_id(person_id)
        if not person:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pessoa não encontrada"
            )
        return person

    def list_persons(
        self,
        page: int = 1,
        page_size: int = 50,
        is_active: Optional[bool] = None,
        search: Optional[str] = None,
        organization_id: Optional[int] = None,
        owner_id: Optional[int] = None
    ) -> PersonListResponse:
        """
        Lista pessoas do sistema com paginação.

        Args:
            page: Número da página (começa em 1)
            page_size: Tamanho da página
            is_active: Filtro por status ativo
            search: Termo de busca (nome, email, telefone, cargo)
            organization_id: Filtro por organização
            owner_id: Filtro por responsável

        Returns:
            PersonListResponse com lista paginada de pessoas
        """
        # Calcula offset
        skip = (page - 1) * page_size

        # Busca pessoas
        persons = self.repository.list_all(
            skip=skip,
            limit=page_size,
            is_active=is_active,
            search=search,
            organization_id=organization_id,
            owner_id=owner_id
        )

        # Conta total
        total = self.repository.count_all(
            is_active=is_active,
            search=search,
            organization_id=organization_id,
            owner_id=owner_id
        )

        # Calcula total de páginas
        total_pages = (total + page_size - 1) // page_size

        # Converte para response schema
        persons_response = [
            PersonResponse.model_validate(person)
            for person in persons
        ]

        return PersonListResponse(
            persons=persons_response,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )

    def create_person(self, person_data: PersonCreate) -> Person:
        """
        Cria uma nova pessoa.

        Args:
            person_data: Dados da pessoa

        Returns:
            Person criado

        Raises:
            HTTPException: Se email já existir
        """
        # Valida se algum email já existe (verifica todos os campos de email fornecidos)
        emails_to_check = [
            person_data.email,
            person_data.email_commercial,
            person_data.email_personal,
            person_data.email_alternative
        ]

        for email in emails_to_check:
            if email and self.repository.exists_email(email):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Email {email} já cadastrado"
                )

        # Cria a pessoa
        person = self.repository.create(person_data)
        return person

    def update_person(self, person_id: int, person_data: PersonUpdate) -> Person:
        """
        Atualiza uma pessoa existente.

        Args:
            person_id: ID da pessoa
            person_data: Novos dados

        Returns:
            Person atualizado

        Raises:
            HTTPException: Se a pessoa não for encontrada ou se houver conflito
        """
        # Busca a pessoa
        person = self.get_person_by_id(person_id)

        # Valida emails (se foram alterados)
        emails_to_check = [
            ('email', person_data.email, person.email),
            ('email_commercial', person_data.email_commercial, person.email_commercial),
            ('email_personal', person_data.email_personal, person.email_personal),
            ('email_alternative', person_data.email_alternative, person.email_alternative),
        ]

        for field_name, new_email, current_email in emails_to_check:
            if new_email and new_email != current_email:
                if self.repository.exists_email(new_email, exclude_id=person_id):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Email {new_email} já cadastrado"
                    )

        # Atualiza a pessoa
        updated_person = self.repository.update(person, person_data)
        return updated_person

    def delete_person(self, person_id: int) -> None:
        """
        Deleta uma pessoa.

        Args:
            person_id: ID da pessoa

        Raises:
            HTTPException: Se a pessoa não for encontrada
        """
        # Busca a pessoa
        person = self.get_person_by_id(person_id)

        # Deleta (hard delete)
        self.repository.delete(person)

    def set_active_status(self, person_id: int, is_active: bool) -> Person:
        """
        Ativa ou desativa uma pessoa.

        Args:
            person_id: ID da pessoa
            is_active: Novo status

        Returns:
            Person atualizado

        Raises:
            HTTPException: Se a pessoa não for encontrada
        """
        # Busca a pessoa
        person = self.get_person_by_id(person_id)

        # Atualiza status
        updated_person = self.repository.set_active_status(person, is_active)
        return updated_person

    def get_persons_by_organization(self, organization_id: int) -> list[Person]:
        """
        Busca todas as pessoas de uma organização.

        Args:
            organization_id: ID da organização

        Returns:
            Lista de pessoas
        """
        return self.repository.find_by_organization(organization_id)
