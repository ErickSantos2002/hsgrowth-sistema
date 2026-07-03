"""Vínculo N:N entre Proposta e Card de Serviço."""
from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class ProposalServiceCard(Base, TimestampMixin):
    """Uma proposta pode estar vinculada a vários cards (e vice-versa)."""
    __tablename__ = "proposal_service_cards"
    __table_args__ = (
        UniqueConstraint("proposal_id", "service_card_id", name="uq_proposal_card"),
    )

    id = Column(Integer, primary_key=True, index=True)
    proposal_id = Column(Integer, ForeignKey("proposals.id", ondelete="CASCADE"), nullable=False, index=True)
    service_card_id = Column(Integer, ForeignKey("service_cards.id", ondelete="CASCADE"), nullable=False, index=True)

    proposal = relationship("Proposal", back_populates="card_links")
    service_card = relationship("ServiceCard")

    def __repr__(self):
        return f"<ProposalServiceCard(proposal={self.proposal_id}, card={self.service_card_id})>"
