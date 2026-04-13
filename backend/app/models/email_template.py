"""
Model EmailTemplate - Templates de e-mail compartilhados.
Gerenciados por admin/gerente, disponíveis para todos os usuários.
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.db.base import Base


class EmailTemplate(Base):
    """
    Template de e-mail reutilizável.
    Suporta variáveis dinâmicas: {{nome_contato}}, {{empresa}}, {{nome_vendedor}},
    {{titulo_card}}, {{valor_card}}.
    """
    __tablename__ = "email_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, comment="Nome do template (exibido na lista)")
    subject = Column(String(500), nullable=False, comment="Assunto do e-mail (pode conter variáveis)")
    body = Column(Text, nullable=False, comment="Corpo do e-mail (pode conter variáveis)")
    is_active = Column(Boolean, nullable=False, default=True, comment="Se falso, não aparece na lista de seleção")

    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True, comment="Soft delete")

    # Relacionamentos
    created_by = relationship("User", foreign_keys=[created_by_id])

    def __repr__(self):
        return f"<EmailTemplate(id={self.id}, name='{self.name}')>"
