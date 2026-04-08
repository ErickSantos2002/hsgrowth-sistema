"""
Modelos de Cadência.
Cadência permite ao SDR/Vendedor definir metas de atividades por tipo
e disparar a criação automática dessas atividades nos cards mais antigos.
"""
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class Cadencia(Base):
    """
    Define uma cadência: conjunto de metas de atividades que o usuário quer executar.
    Exemplo: 20 Ligações + 10 E-mails por disparo.
    """
    __tablename__ = "cadencias"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    # Relacionamentos
    user = relationship("User", back_populates="cadencias")
    itens = relationship("CadenciaItem", back_populates="cadencia", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Cadencia(id={self.id}, name='{self.name}', user_id={self.user_id})>"


class CadenciaItem(Base):
    """
    Item de uma cadência: tipo de atividade + quantidade a criar.
    Exemplo: activity_type='ligacao', quantity=20
    """
    __tablename__ = "cadencia_itens"

    id = Column(Integer, primary_key=True, index=True)
    cadencia_id = Column(Integer, ForeignKey("cadencias.id", ondelete="CASCADE"), nullable=False, index=True)
    activity_type = Column(String(50), nullable=False)
    quantity = Column(Integer, nullable=False)

    # Relacionamentos
    cadencia = relationship("Cadencia", back_populates="itens")

    def __repr__(self):
        return f"<CadenciaItem(id={self.id}, type='{self.activity_type}', qty={self.quantity})>"
