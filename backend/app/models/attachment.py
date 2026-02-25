"""
Modelo de Attachment (Arquivo Anexado).
Representa um arquivo anexado a um card.
"""
from sqlalchemy import Column, Integer, String, ForeignKey, BigInteger
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin, SoftDeleteMixin


class Attachment(Base, TimestampMixin, SoftDeleteMixin):
    """
    Representa um arquivo anexado a um card.
    """
    __tablename__ = "attachments"

    id = Column(Integer, primary_key=True, index=True)

    # Relacionamento com Card
    card_id = Column(Integer, ForeignKey("cards.id", ondelete="CASCADE"), nullable=False, index=True)

    # Relacionamento com User (quem fez upload)
    uploaded_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    # Informações do arquivo
    filename = Column(String(255), nullable=False)  # Nome único gerado pelo sistema (ex: abc123.pdf)
    original_filename = Column(String(500), nullable=False)  # Nome original do arquivo
    file_size = Column(BigInteger, nullable=False)  # Tamanho em bytes
    mime_type = Column(String(100), nullable=False)  # Tipo MIME (application/pdf, image/jpeg, etc)

    # Caminho de armazenamento
    storage_path = Column(String(1000), nullable=False)  # Caminho relativo: cards/123/abc123.pdf

    # Tipo de anexo (general, proposal, etc.)
    attachment_type = Column(String(50), nullable=False, default='general', index=True)

    # Relacionamentos
    card = relationship("Card", back_populates="attachments")
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])

    def __repr__(self):
        return f"<Attachment(id={self.id}, filename='{self.original_filename}')>"

    @property
    def file_size_mb(self) -> float:
        """Retorna o tamanho do arquivo em MB"""
        return round(self.file_size / (1024 * 1024), 2)

    @property
    def file_extension(self) -> str:
        """Retorna a extensão do arquivo"""
        if '.' in self.original_filename:
            return self.original_filename.rsplit('.', 1)[1].lower()
        return ''

    @property
    def is_image(self) -> bool:
        """Verifica se o arquivo é uma imagem"""
        image_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
        return self.mime_type in image_types

    @property
    def is_pdf(self) -> bool:
        """Verifica se o arquivo é um PDF"""
        return self.mime_type == 'application/pdf'

    @property
    def is_document(self) -> bool:
        """Verifica se o arquivo é um documento (Word, Excel, etc)"""
        doc_types = [
            'application/msword',  # .doc
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  # .docx
            'application/vnd.ms-excel',  # .xls
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',  # .xlsx
            'text/plain',  # .txt
        ]
        return self.mime_type in doc_types
