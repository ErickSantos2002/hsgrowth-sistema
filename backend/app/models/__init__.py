"""
Importa todos os modelos para facilitar a descoberta pelo Alembic.
Importante: todos os modelos devem ser importados aqui para que o
Alembic possa detectá-los no autogenerate.
"""
from app.db.base import Base

# Modelos base
from app.models.account import Account
from app.models.role import Role
from app.models.user import User
from app.models.board import Board
from app.models.list import List
from app.models.field_definition import FieldDefinition
from app.models.card import Card
from app.models.card_field_value import CardFieldValue

# Modelos de auditoria
from app.models.activity import Activity
from app.models.audit_log import AuditLog

# Modelos de gamificação
from app.models.gamification_point import GamificationPoint
from app.models.gamification_badge import GamificationBadge
from app.models.user_badge import UserBadge
from app.models.gamification_ranking import GamificationRanking

# Modelos de automações
from app.models.automation import Automation
from app.models.automation_execution import AutomationExecution

# Modelos de transferências
from app.models.card_transfer import CardTransfer
from app.models.transfer_approval import TransferApproval

# Modelos de notificações
from app.models.notification import Notification

# Lista de todos os modelos (útil para imports)
__all__ = [
    "Base",
    "Account",
    "Role",
    "User",
    "Board",
    "List",
    "FieldDefinition",
    "Card",
    "CardFieldValue",
    "Activity",
    "AuditLog",
    "GamificationPoint",
    "GamificationBadge",
    "UserBadge",
    "GamificationRanking",
    "Automation",
    "AutomationExecution",
    "CardTransfer",
    "TransferApproval",
    "Notification",
]
