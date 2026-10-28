"""
Agenda dos vendedores para integrações (agendamento de reunião pelo MarketingHS).

Ver docs/superpowers/specs/2026-10-28-agendamento-integracao.md
"""
from datetime import datetime

from sqlalchemy.orm import Session

from app.repositories.user_repository import UserRepository
from app.services.microsoft_graph_service import microsoft_graph_service


class IntegrationAgendaService:

    def __init__(self, db: Session):
        self.user_repository = UserRepository(db)

    def listar_vendedores(self) -> list[dict]:
        """Usuários com papel salesperson, ativos e inativos (o campo diz qual)."""
        return [
            {"id": u.id, "nome": u.name, "email": u.email, "ativo": bool(u.is_active)}
            for u in self.user_repository.list_by_role_name("salesperson")
            if not u.is_integracao
        ]

    def livre_ocupado(self, user_ids: list[int], inicio: datetime, fim: datetime) -> dict:
        """
        Blocos não-livres de cada usuário pedido, lidos com token de aplicativo.

        Um vendedor que falha (inexistente, sem caixa, fora do grupo com
        permissão na Microsoft) vai para `erros` e não derruba os outros.

        Raises:
            ValueError: o token do aplicativo não pôde ser obtido — aí nenhuma
                agenda seria lida, então falha a resposta inteira.
        """
        # Falha de credencial é geral: melhor um erro só do que N iguais.
        microsoft_graph_service._get_app_token()

        vendedores, erros = [], []
        for user_id in dict.fromkeys(user_ids):
            user = self.user_repository.find_by_id(user_id)
            email = (user.email or "").strip() if user else ""
            if not user or not user.is_active:
                erros.append({"user_id": user_id, "motivo": "usuário não encontrado ou inativo"})
                continue
            if not email:
                erros.append({"user_id": user_id, "motivo": "usuário sem e-mail"})
                continue
            try:
                ocupado = microsoft_graph_service.get_ocupado_como_aplicativo(email, inicio, fim)
            except ValueError as e:
                erros.append({"user_id": user_id, "motivo": str(e)})
                continue
            vendedores.append({"user_id": user_id, "email": email, "ocupado": ocupado})

        return {"vendedores": vendedores, "erros": erros}
