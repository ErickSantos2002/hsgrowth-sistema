"""
Pedido de liberação de CNPJ em Vendas (1.11.32).

O vendedor ou SDR barrado pela trava de CNPJ (`parcerias/vendas.py`) pede a
liberação. O card só nasce quando admin ou gerente libera: até lá, os dados
que ele preencheu ficam em `payload`.
"""
from datetime import datetime

from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.db.base import Base


class CnpjReleaseRequest(Base):
    __tablename__ = "cnpj_release_requests"

    id = Column(Integer, primary_key=True, index=True)
    # criar_card | vincular_empresa | reabrir_card | clonar_card (os dois últimos desde a 1.11.35)
    kind = Column(String(20), nullable=False)
    # pendente | liberado | recusado | cancelado
    status = Column(String(20), nullable=False, default="pendente", index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="SET NULL"), nullable=True)
    cnpj = Column(String(14), nullable=False, index=True)
    # Vincular: o card alvo. Criar: o card criado ao liberar.
    # Reabrir/clonar: o card de origem até liberar; depois, o card novo.
    card_id = Column(Integer, ForeignKey("cards.id", ondelete="SET NULL"), nullable=True)
    # Criar: os dados do CardCreate. Vincular: {}.
    payload = Column(JSON, nullable=False, default=dict)
    reason = Column(String(500), nullable=False)
    # Com quem o CNPJ estava no momento do pedido (texto da trava).
    blocked_with = Column(String(500), nullable=False)
    requested_by_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    decided_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    decided_at = Column(DateTime, nullable=True)
    # Observação de quem liberou, ou o motivo da recusa.
    decision_note = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    client = relationship("Client")
    card = relationship("Card")
    requested_by = relationship("User", foreign_keys=[requested_by_id])
    decided_by = relationship("User", foreign_keys=[decided_by_id])
