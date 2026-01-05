"""
API v1 Router.
Agrega todos os endpoints da versão 1 da API.
"""
from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, boards, cards, gamification, automations, transfers

api_router = APIRouter()

# Inclui routers de cada módulo
api_router.include_router(auth.router, prefix="/auth", tags=["Autenticação"])
api_router.include_router(users.router, prefix="/users", tags=["Usuários"])
api_router.include_router(boards.router, prefix="/boards", tags=["Boards"])
api_router.include_router(cards.router, prefix="/cards", tags=["Cards"])
api_router.include_router(gamification.router, prefix="/gamification", tags=["Gamificação"])
api_router.include_router(automations.router, prefix="/automations", tags=["Automações"])
api_router.include_router(transfers.router, prefix="/transfers", tags=["Transferências"])

# Futuramente adicionar outros routers:
# api_router.include_router(reports.router, prefix="/reports", tags=["Relatórios"])
# etc.
