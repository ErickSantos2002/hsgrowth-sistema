"""
Importa todos os modelos para facilitar a descoberta pelo Alembic.
Importante: todos os modelos devem ser importados aqui para que o
Alembic possa detectá-los no autogenerate.
"""
from app.db.base import Base

# Modelos base
from app.models.role import Role
from app.models.user import User
from app.models.client import Client
from app.models.person import Person
from app.models.lead import Lead
from app.models.integration_client import IntegrationClient
from app.models.board import Board
from app.models.list import List
from app.models.field_definition import FieldDefinition
from app.models.card import Card
from app.models.card_field_value import CardFieldValue
from app.models.card_note import CardNote

# Modelos de auditoria e atividades
from app.models.activity import Activity
from app.models.audit_log import AuditLog
from app.models.card_task import CardTask

# Modelos de produtos
from app.models.product import Product
from app.models.card_product import CardProduct

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
    "Role",
    "User",
    "Client",
    "Person",
    "Lead",
    "IntegrationClient",
    "Board",
    "List",
    "FieldDefinition",
    "Card",
    "CardFieldValue",
    "CardNote",
    "Activity",
    "AuditLog",
    "CardTask",
    "Product",
    "CardProduct",
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
