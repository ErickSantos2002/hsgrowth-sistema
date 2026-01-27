"""
API v1 Router.
Agrega todos os endpoints da versão 1 da API.
"""
from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, boards, cards, clients, gamification, automations, transfers, reports, notifications, admin, card_tasks, fields, products

api_router = APIRouter()

# Inclui routers de cada módulo
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(boards.router, prefix="/boards", tags=["Boards"])
api_router.include_router(cards.router, prefix="/cards", tags=["Cards"])
api_router.include_router(card_tasks.router, prefix="/card-tasks", tags=["Card Tasks"])
api_router.include_router(fields.router, prefix="/fields", tags=["Custom Fields"])
api_router.include_router(products.router, prefix="/products", tags=["Products"])
api_router.include_router(clients.router, prefix="/clients", tags=["Clients"])
api_router.include_router(gamification.router, prefix="/gamification", tags=["Gamification"])
api_router.include_router(automations.router, prefix="/automations", tags=["Automations"])
api_router.include_router(transfers.router, prefix="/transfers", tags=["Transfers"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])

# Futuramente adicionar outros routers:
# (Todos os principais já foram adicionados!)
# etc.
