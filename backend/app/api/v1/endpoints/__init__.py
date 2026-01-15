"""
Endpoints da API v1.
Centraliza imports de todos os routers.
"""
from app.api.v1.endpoints import auth, users, boards, cards, clients, gamification, automations, transfers, reports, notifications, admin

__all__ = ["auth", "users", "boards", "cards", "clients", "gamification", "automations", "transfers", "reports", "notifications", "admin"]
