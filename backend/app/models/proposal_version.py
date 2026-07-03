"""Histórico de versões de uma Proposta (snapshot a cada edição salva)."""
from sqlalchemy import Column, Integer, String, ForeignKey, JSON
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class ProposalVersion(Base, TimestampMixin):
    """Estado anterior arquivado de uma proposta (dados + caminho do PDF)."""
    __tablename__ = "proposal_versions"

    id = Column(Integer, primary_key=True, index=True)
    proposal_id = Column(Integer, ForeignKey("proposals.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    snapshot = Column(JSON, nullable=True)              # campos + itens no momento do arquivamento
    pdf_path = Column(String(500), nullable=True)       # relativo a UPLOAD_DIR
    changed_by = Column(String(255), nullable=True)     # nome do usuário que salvou a edição

    proposal = relationship("Proposal", back_populates="versions")

    def __repr__(self):
        return f"<ProposalVersion(proposal={self.proposal_id}, v={self.version_number})>"
