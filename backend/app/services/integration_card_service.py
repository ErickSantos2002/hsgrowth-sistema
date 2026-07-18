"""
Criação de cards de serviço vindos de sistemas externos.

Semântica: create-or-return, NÃO upsert. Depois que o card nasce, quem manda é o
vendedor no hsgrowth — reenviar o mesmo (source, external_id) devolve o card
existente sem alterar nada. Ver seção 4 do spec.
"""
from typing import Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.client import Client
from app.models.external_client_ref import ExternalClientRef
from app.models.person import Person
from app.models.service_card import ServiceCard
from app.models.user import User
from app.repositories.service_board_repository import ServiceBoardRepository
from app.schemas.integration import (
    IntegrationCardClient,
    IntegrationCardContact,
    IntegrationServiceCardCreate,
)
from app.services.service_board_service import ServiceBoardService

# O vínculo de cliente não leva sufixo de entidade: o mesmo cliente do GestorHS é
# compartilhado pelos boards de Serviços e de Cobrança.
CLIENT_REF_SOURCE = "gestorhs"


class IntegrationCardService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ServiceBoardRepository(db)

    def create_or_return(
        self, data: IntegrationServiceCardCreate, user: User
    ) -> Tuple[ServiceCard, bool]:
        """Retorna (card, created). created=False significa que já existia e nada mudou."""
        existente = self._find_by_external_ref(data.source, data.external_id)
        if existente:
            return existente, False

        entry_list = self.repo.find_entry_list(data.board_id)
        if not entry_list:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=(
                    f"Board {data.board_id} não existe ou não tem etapa de entrada "
                    f"configurada (nenhuma lista com is_entry_stage)."
                ),
            )

        client = self._resolve_client(data.client)
        person = self._resolve_person(data.contact, client) if data.contact else None

        business_info = dict(data.business_info or {})
        if data.devices:
            business_info["equipamentos"] = [d.model_dump() for d in data.devices]

        card = ServiceCard(
            list_id=entry_list.id,
            title=data.title,
            description=data.description,
            due_date=data.due_date,
            client_id=client.id,
            person_id=person.id if person else None,
            business_info=business_info or None,
            external_source=data.source,
            external_id=data.external_id,
            position=self.repo.next_position(entry_list.id),
        )
        self.db.add(card)

        try:
            self.db.commit()
        except IntegrityError:
            # Corrida: outro request criou o mesmo par entre a consulta e o commit.
            # A restrição de unicidade fez o seu trabalho — devolve o vencedor.
            self.db.rollback()
            vencedor = self._find_by_external_ref(data.source, data.external_id)
            if vencedor:
                return vencedor, False
            raise

        self.db.refresh(card)
        ServiceBoardService(self.db).log_event(
            card.id, user, "card_created", f"Card criado pela integração ({data.source})"
        )
        return card, True

    # ── internos ──────────────────────────────────────────────────────────────

    def _find_by_external_ref(self, source: str, external_id: str) -> Optional[ServiceCard]:
        return (
            self.db.query(ServiceCard)
            .filter(
                ServiceCard.external_source == source,
                ServiceCard.external_id == external_id,
            )
            .first()
        )

    def _resolve_client(self, payload: IntegrationCardClient) -> Client:
        """Dedup pelo id do sistema de origem, nunca por documento (ver docstring do model)."""
        ref = (
            self.db.query(ExternalClientRef)
            .filter(
                ExternalClientRef.source == CLIENT_REF_SOURCE,
                ExternalClientRef.external_id == payload.external_id,
            )
            .first()
        )
        if ref:
            client = self.db.query(Client).filter(Client.id == ref.client_id).first()
            if client:
                return client

        # Criado direto pelo model, sem passar por ClientService: aquele caminho rejeita
        # documento/email duplicado com 400, e o legado do GestorHS tem duplicatas que
        # não podem travar a criação do card. A unicidade aqui é a do vínculo externo.
        client = Client(
            name=payload.name,
            company_name=payload.name,
            document=payload.document,
            email=payload.email,
            phone=payload.phone,
            address=payload.address,
            city=payload.city,
            state=payload.state,
            source=CLIENT_REF_SOURCE,
        )
        self.db.add(client)
        self.db.flush()

        self.db.add(
            ExternalClientRef(
                source=CLIENT_REF_SOURCE,
                external_id=payload.external_id,
                client_id=client.id,
            )
        )
        self.db.flush()
        return client

    def _resolve_person(self, payload: IntegrationCardContact, client: Client) -> Person:
        """Reaproveita a pessoa pelo nome dentro do mesmo cliente; cria se não houver."""
        existente = (
            self.db.query(Person)
            .filter(Person.organization_id == client.id, Person.name == payload.name)
            .first()
        )
        if existente:
            return existente

        person = Person(
            name=payload.name,
            email=payload.email,
            phone=payload.phone,
            organization_id=client.id,
        )
        self.db.add(person)
        self.db.flush()
        return person
