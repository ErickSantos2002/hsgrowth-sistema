"""
Histórico da Consulta de CNPJ (Parcerias, Entrega 2).

Cada consulta feita pela página ou pelo passo 1 do cadastro vira uma linha:
quem consultou, de qual parceiro (nulo para a H&S), o CNPJ e a cor. Serve
para o limite diário do parceiro e para admin/gerente verem quem consulta.
"""
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.db.base import Base


class CnpjConsulta(Base):
    __tablename__ = "cnpj_consultas"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    partner_id = Column(Integer, ForeignKey("partners.id", ondelete="SET NULL"), nullable=True, index=True)
    cnpj = Column(String(14), nullable=False, index=True)
    # verde | amarelo | vermelho
    resultado = Column(String(10), nullable=False)
    # livre | em_negociacao | compra_recente | perdida_recente | outra_unidade
    motivo = Column(String(30), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    user = relationship("User")
    partner = relationship("Partner")
