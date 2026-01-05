"""
Mixins comuns para os modelos SQLAlchemy.
Incluem timestamps, soft delete, etc.
"""
from datetime import datetime
from sqlalchemy import Column, DateTime, Boolean


class TimestampMixin:
    """
    Mixin para adicionar campos de timestamp (created_at, updated_at) aos modelos.
    """
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class SoftDeleteMixin:
    """
    Mixin para soft delete (deleted_at).
    Registros não são deletados fisicamente, apenas marcados como deletados.
    """
    deleted_at = Column(DateTime, nullable=True)
    is_deleted = Column(Boolean, default=False, nullable=False)
