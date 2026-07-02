"""
API v1 Router.
Agrega todos os endpoints da versão 1 da API.
"""
from fastapi import APIRouter, Depends
from app.api.deps import require_service_access
from app.api.v1.endpoints import auth, users, boards, cards, clients, persons, gamification, automations, transfers, reports, notifications, admin, card_tasks, card_notes, fields, products, integration_clients, api4com, audit_logs, attachments, user_avatar, custom_reports, ai, call_evaluations, cadencias, email_templates, cadences, service_boards, service_dashboard, service_activities, proposals

api_router = APIRouter()

# Inclui routers de cada módulo
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(boards.router, prefix="/boards", tags=["Boards"])
api_router.include_router(cards.router, prefix="/cards", tags=["Cards"])
api_router.include_router(card_tasks.router, prefix="/card-tasks", tags=["Card Tasks"])
api_router.include_router(card_notes.router, prefix="/card-notes", tags=["Card Notes"])
api_router.include_router(fields.router, prefix="/fields", tags=["Custom Fields"])
api_router.include_router(products.router, prefix="/products", tags=["Products"])
api_router.include_router(proposals.router, prefix="/proposals", tags=["Proposals"], dependencies=[Depends(require_service_access())])
api_router.include_router(clients.router, prefix="/clients", tags=["Clients"])
api_router.include_router(persons.router, prefix="/persons", tags=["Persons"])
api_router.include_router(gamification.router, prefix="/gamification", tags=["Gamification"])
api_router.include_router(automations.router, prefix="/automations", tags=["Automations"])
api_router.include_router(transfers.router, prefix="/transfers", tags=["Transfers"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(custom_reports.router, prefix="/reports", tags=["Custom Reports"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
api_router.include_router(integration_clients.router, prefix="/integration-clients", tags=["Integration Clients"])
api_router.include_router(api4com.router, prefix="/api4com", tags=["API4COM"])
api_router.include_router(audit_logs.router, prefix="/audit-logs", tags=["Audit Logs"])
api_router.include_router(attachments.router, prefix="", tags=["Attachments"])  # Sem prefix pois usa /cards/{id}/attachments e /attachments/{id}
api_router.include_router(user_avatar.router, prefix="", tags=["Users"])  # Sem prefix pois usa /users/me/avatar e /users/{id}/avatar

api_router.include_router(ai.router, prefix="/ai", tags=["AI"])
api_router.include_router(call_evaluations.router, prefix="/call-evaluations", tags=["Call Evaluations"])
api_router.include_router(cadencias.router, prefix="/cadencias", tags=["Cadências"])
api_router.include_router(cadences.router, prefix="/cadences", tags=["Cadências por Lead"])
api_router.include_router(email_templates.router, prefix="/email-templates", tags=["Email Templates"])
api_router.include_router(service_boards.router, prefix="/service-boards", tags=["Service Boards"], dependencies=[Depends(require_service_access())])
api_router.include_router(service_dashboard.router, prefix="/service-dashboard", tags=["Service Dashboard"], dependencies=[Depends(require_service_access())])
api_router.include_router(service_activities.router, prefix="/service-activities", tags=["Service Activities"], dependencies=[Depends(require_service_access())])

# Futuramente adicionar outros routers:
# (Todos os principais já foram adicionados!)
# etc.
