"""
Modelo de CustomReport (Relatório Customizado).
Persiste as configurações de dashboards criados pelo usuário.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship

from app.db.base import Base


class CustomReport(Base):
    """
    Representa um relatório customizado salvo por um usuário.
    Armazena a configuração completa dos gráficos no campo config (JSON).
    """
    __tablename__ = "custom_reports"

    id = Column(Integer, primary_key=True, index=True)

    # Nome do relatório (editável pelo usuário)
    name = Column(String(255), nullable=False)

    # Usuário que criou o relatório
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Configuração completa do relatório em JSON (CustomReportConfig do frontend)
    config = Column(JSON, nullable=False)

    # Contador de gráficos (desnormalizado para exibição na listagem)
    charts_count = Column(Integer, default=0)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relacionamento com o criador
    created_by = relationship("User")

    def __repr__(self):
        return f"<CustomReport(id={self.id}, name='{self.name}', created_by_id={self.created_by_id})>"
