"""
Repository para Attachments - Gerenciamento de arquivos anexados aos cards.
"""
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
from typing import Optional, List
from datetime import datetime

from app.models.attachment import Attachment
from app.schemas.attachment import AttachmentCreate


class AttachmentRepository:
    """Repository para operações de Attachments"""

    def __init__(self, db: Session):
        self.db = db

    def create(self, attachment_data: AttachmentCreate) -> Attachment:
        """
        Cria um novo attachment no banco de dados.
        Deve ser chamado após o arquivo já estar salvo no disco.
        """
        attachment = Attachment(**attachment_data.model_dump())
        self.db.add(attachment)
        self.db.commit()
        self.db.refresh(attachment)
        return attachment

    def get_by_id(self, attachment_id: int, include_deleted: bool = False) -> Optional[Attachment]:
        """
        Busca um attachment por ID.
        Por padrão, não retorna registros deletados (soft delete).
        """
        query = self.db.query(Attachment).filter(Attachment.id == attachment_id)

        if not include_deleted:
            query = query.filter(Attachment.deleted_at.is_(None))

        # Eager load do uploader
        query = query.options(joinedload(Attachment.uploaded_by))

        return query.first()

    def get_by_card_id(
        self,
        card_id: int,
        include_deleted: bool = False
    ) -> List[Attachment]:
        """
        Lista todos os attachments de um card.
        Retorna ordenado por data de criação (mais recentes primeiro).
        """
        query = self.db.query(Attachment).filter(Attachment.card_id == card_id)

        if not include_deleted:
            query = query.filter(Attachment.deleted_at.is_(None))

        # Eager load do uploader
        query = query.options(joinedload(Attachment.uploaded_by))

        # Ordenação: mais recentes primeiro
        query = query.order_by(Attachment.created_at.desc())

        return query.all()

    def delete(self, attachment: Attachment) -> None:
        """
        Soft delete do attachment.
        Marca como deletado mas não remove do banco.
        """
        attachment.deleted_at = datetime.utcnow()
        self.db.commit()

    def hard_delete(self, attachment: Attachment) -> None:
        """
        Hard delete do attachment.
        Remove permanentemente do banco de dados.
        USAR COM CUIDADO! Preferir soft delete.
        """
        self.db.delete(attachment)
        self.db.commit()

    def get_total_size_by_card(self, card_id: int) -> int:
        """
        Retorna o tamanho total (em bytes) de todos os attachments de um card.
        Não conta arquivos deletados.
        """
        result = (
            self.db.query(Attachment)
            .filter(
                and_(
                    Attachment.card_id == card_id,
                    Attachment.deleted_at.is_(None)
                )
            )
            .with_entities(Attachment.file_size)
            .all()
        )

        total_size = sum([r[0] for r in result if r[0]])
        return total_size

    def count_by_card(self, card_id: int) -> int:
        """
        Conta quantos attachments um card possui.
        Não conta arquivos deletados.
        """
        return (
            self.db.query(Attachment)
            .filter(
                and_(
                    Attachment.card_id == card_id,
                    Attachment.deleted_at.is_(None)
                )
            )
            .count()
        )
