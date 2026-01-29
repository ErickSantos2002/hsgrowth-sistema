"""
Person Repository - Operações de acesso a dados de pessoas/contatos.
Implementa o padrão Repository para isolamento da camada de dados.
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from app.models.person import Person
from app.schemas.person import PersonCreate, PersonUpdate


class PersonRepository:
    """
    Repository para operações de banco de dados relacionadas a pessoas.
    """

    def __init__(self, db: Session):
        self.db = db

    def find_by_id(self, person_id: int) -> Optional[Person]:
        """
        Busca uma pessoa por ID.

        Args:
            person_id: ID da pessoa

        Returns:
            Person ou None se não encontrado
        """
        return self.db.query(Person).filter(
            Person.id == person_id
        ).first()

    def find_by_email(self, email: str) -> Optional[Person]:
        """
        Busca uma pessoa por email (busca em todos os campos de email).

        Args:
            email: Email da pessoa

        Returns:
            Person ou None se não encontrado
        """
        email_clean = email.strip().lower() if email else None
        if not email_clean:
            return None

        return self.db.query(Person).filter(
            or_(
                Person.email == email_clean,
                Person.email_commercial == email_clean,
                Person.email_personal == email_clean,
                Person.email_alternative == email_clean
            )
        ).first()

    def find_by_organization(self, organization_id: int) -> List[Person]:
        """
        Busca todas as pessoas de uma organização.

        Args:
            organization_id: ID da organização (cliente)

        Returns:
            Lista de pessoas
        """
        return self.db.query(Person).filter(
            Person.organization_id == organization_id,
            Person.is_active == True
        ).order_by(Person.name).all()

    def list_all(
        self,
        skip: int = 0,
        limit: int = 100,
        is_active: Optional[bool] = None,
        search: Optional[str] = None,
        organization_id: Optional[int] = None,
        owner_id: Optional[int] = None
    ) -> List[Person]:
        """
        Lista todas as pessoas do sistema.

        Args:
            skip: Número de registros para pular (paginação)
            limit: Limite de registros a retornar
            is_active: Filtro por status ativo (opcional)
            search: Termo de busca (nome, email, telefone, cargo)
            organization_id: Filtro por organização
            owner_id: Filtro por responsável

        Returns:
            Lista de pessoas
        """
        query = self.db.query(Person)

        # Filtro de status
        if is_active is not None:
            query = query.filter(Person.is_active == is_active)

        # Filtro de organização
        if organization_id:
            query = query.filter(Person.organization_id == organization_id)

        # Filtro de responsável
        if owner_id:
            query = query.filter(Person.owner_id == owner_id)

        # Busca por termo (nome, email, telefone, cargo)
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Person.name.ilike(search_term),
                    Person.first_name.ilike(search_term),
                    Person.last_name.ilike(search_term),
                    Person.email.ilike(search_term),
                    Person.email_commercial.ilike(search_term),
                    Person.email_personal.ilike(search_term),
                    Person.phone.ilike(search_term),
                    Person.phone_commercial.ilike(search_term),
                    Person.phone_whatsapp.ilike(search_term),
                    Person.position.ilike(search_term)
                )
            )

        # Ordenação: alfabética por nome
        query = query.order_by(Person.name)

        return query.offset(skip).limit(limit).all()

    def count_all(
        self,
        is_active: Optional[bool] = None,
        search: Optional[str] = None,
        organization_id: Optional[int] = None,
        owner_id: Optional[int] = None
    ) -> int:
        """
        Conta todas as pessoas do sistema.

        Args:
            is_active: Filtro por status ativo (opcional)
            search: Termo de busca (nome, email, telefone, cargo)
            organization_id: Filtro por organização
            owner_id: Filtro por responsável

        Returns:
            Contagem de pessoas
        """
        query = self.db.query(func.count(Person.id))

        # Filtro de status
        if is_active is not None:
            query = query.filter(Person.is_active == is_active)

        # Filtro de organização
        if organization_id:
            query = query.filter(Person.organization_id == organization_id)

        # Filtro de responsável
        if owner_id:
            query = query.filter(Person.owner_id == owner_id)

        # Busca por termo
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Person.name.ilike(search_term),
                    Person.first_name.ilike(search_term),
                    Person.last_name.ilike(search_term),
                    Person.email.ilike(search_term),
                    Person.email_commercial.ilike(search_term),
                    Person.email_personal.ilike(search_term),
                    Person.phone.ilike(search_term),
                    Person.phone_commercial.ilike(search_term),
                    Person.phone_whatsapp.ilike(search_term),
                    Person.position.ilike(search_term)
                )
            )

        return query.scalar()

    def exists_email(self, email: str, exclude_id: Optional[int] = None) -> bool:
        """
        Verifica se existe uma pessoa com o email informado (em qualquer campo de email).

        Args:
            email: Email a verificar
            exclude_id: ID para excluir da verificação (útil em updates)

        Returns:
            True se existe, False caso contrário
        """
        email_clean = email.strip().lower() if email else None
        if not email_clean:
            return False

        query = self.db.query(Person).filter(
            or_(
                Person.email == email_clean,
                Person.email_commercial == email_clean,
                Person.email_personal == email_clean,
                Person.email_alternative == email_clean
            )
        )

        if exclude_id:
            query = query.filter(Person.id != exclude_id)

        return query.first() is not None

    def create(self, person_data: PersonCreate) -> Person:
        """
        Cria uma nova pessoa.

        Args:
            person_data: Dados da pessoa

        Returns:
            Person criado
        """
        person = Person(**person_data.model_dump(exclude_unset=True))
        self.db.add(person)
        self.db.commit()
        self.db.refresh(person)
        return person

    def update(self, person: Person, person_data: PersonUpdate) -> Person:
        """
        Atualiza uma pessoa existente.

        Args:
            person: Pessoa a ser atualizada
            person_data: Novos dados

        Returns:
            Person atualizado
        """
        update_data = person_data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(person, field, value)

        self.db.commit()
        self.db.refresh(person)
        return person

    def delete(self, person: Person) -> None:
        """
        Deleta uma pessoa (hard delete).

        Args:
            person: Pessoa a ser deletada
        """
        self.db.delete(person)
        self.db.commit()

    def set_active_status(self, person: Person, is_active: bool) -> Person:
        """
        Ativa ou desativa uma pessoa.

        Args:
            person: Pessoa a ser atualizada
            is_active: Novo status

        Returns:
            Person atualizado
        """
        person.is_active = is_active
        self.db.commit()
        self.db.refresh(person)
        return person
