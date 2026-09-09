"""
Integração com o Daily.co — reunião por vídeo dentro do CRM.

Cuida da sala e dos tokens de acesso. Regras de negócio e permissão ficam nos
endpoints; aqui é só a conversa com a API.

Segurança: a chave da API nunca sai deste módulo. Nenhum token do Daily é
devolvido ao frontend sem passar por validação de acesso no endpoint.
"""
import secrets
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.card_task import CardTask
from app.models.user import User

# Margem de validade da sala além do horário previsto. Cobre reunião que
# atrasa ou se estende, e garante que a sala não fica aberta indefinidamente
# (junto com eject_at_room_exp, evita gravação esquecida rodando).
ROOM_EXPIRY_MARGIN_HOURS = 4

# Duração assumida quando a tarefa não informa
DEFAULT_DURATION_MINUTES = 60

HTTP_TIMEOUT_SECONDS = 15.0

# Eventos que o webhook precisa receber. Mudar esta lista faz o webhook ser
# recriado no Daily na próxima chamada de garantir_webhook().
WEBHOOK_EVENTOS = [
    "recording.ready-to-download",
    "transcript.ready-to-download",
    "participant.joined",
    "meeting.ended",
]


class DailyService:
    def __init__(self, db: Session):
        self.db = db

    # ── infraestrutura ──────────────────────────────────────────────────────

    def _headers(self) -> dict:
        if not settings.DAILY_API_KEY:
            raise ValueError(
                "DAILY_API_KEY não configurada — reunião por vídeo indisponível."
            )
        return {"Authorization": f"Bearer {settings.DAILY_API_KEY}"}

    def _post(self, path: str, payload: dict) -> dict:
        """POST na API do Daily, com erro traduzido para mensagem utilizável."""
        headers = self._headers()
        url = f"{settings.DAILY_API_URL}{path}"

        try:
            with httpx.Client(timeout=HTTP_TIMEOUT_SECONDS) as client:
                resp = client.post(url, headers=headers, json=payload)
        except httpx.HTTPError as e:
            raise ValueError(f"Não foi possível falar com o Daily: {e}") from e

        if resp.status_code >= 400:
            raise ValueError(f"Daily retornou erro {resp.status_code}: {resp.text}")

        return resp.json()

    def _room_expiry(self, task: CardTask) -> int:
        """
        Timestamp unix de expiração da sala: fim previsto + margem.

        Usado tanto na sala quanto nos tokens, para que nenhum acesso
        sobreviva ao encerramento da reunião.
        """
        base = task.due_date or datetime.utcnow()
        if base.tzinfo is None:
            base = base.replace(tzinfo=timezone.utc)

        duracao = timedelta(minutes=task.duration_minutes or DEFAULT_DURATION_MINUTES)
        fim = base + duracao + timedelta(hours=ROOM_EXPIRY_MARGIN_HOURS)

        # Se a reunião já passou, ainda dá margem a partir de agora — evita
        # criar sala nascida expirada ao reagendar algo antigo.
        agora = datetime.now(timezone.utc)
        minimo = agora + timedelta(hours=ROOM_EXPIRY_MARGIN_HOURS)

        return int(max(fim, minimo).timestamp())

    # ── sala ────────────────────────────────────────────────────────────────

    def create_room(self, task: CardTask) -> dict:
        """
        Cria a sala no Daily e guarda os dados na tarefa.

        Também gera o token opaco do link público do convidado, se ainda não
        houver — ele é o que permite o cliente entrar sem login.
        """
        room_name = f"hsg-{task.id}"

        payload = {
            "name": room_name,
            "privacy": "private",
            "properties": {
                "enable_knocking": True,     # sala de espera: o anfitrião libera
                "enable_chat": True,
                "enable_screenshare": True,
                "lang": "pt",
                "exp": self._room_expiry(task),
                "eject_at_room_exp": True,   # não deixa sala aberta para sempre
            },
        }

        data = self._post("/rooms", payload)

        task.daily_room_name = data.get("name", room_name)
        task.daily_room_url = data.get("url", "")
        task.meeting_provider = "daily"
        if not task.public_access_token:
            task.public_access_token = secrets.token_urlsafe(32)

        self.db.commit()
        self.db.refresh(task)

        return {"name": task.daily_room_name, "url": task.daily_room_url}

    def delete_room(self, task: CardTask) -> None:
        """
        Apaga a sala no Daily.

        Falha aqui não impede o cancelamento local: a sala expira sozinha de
        qualquer forma, então não vale bloquear o usuário por isso.
        """
        if not task.daily_room_name:
            return

        url = f"{settings.DAILY_API_URL}/rooms/{task.daily_room_name}"
        try:
            with httpx.Client(timeout=HTTP_TIMEOUT_SECONDS) as client:
                client.delete(url, headers=self._headers())
        except Exception as e:
            print(f"[DAILY] Aviso: falha ao apagar sala {task.daily_room_name}: {e}")

    # ── tokens ──────────────────────────────────────────────────────────────

    def _create_token(self, task: CardTask, user_name: str, is_owner: bool) -> str:
        payload = {
            "properties": {
                "room_name": task.daily_room_name,
                "user_name": user_name,
                "is_owner": is_owner,
                "exp": self._room_expiry(task),
            }
        }

        data = self._post("/meeting-tokens", payload)

        token = data.get("token")
        if not token:
            raise ValueError("Daily não devolveu token de acesso à sala.")

        return token

    def create_host_token(self, task: CardTask, user: User) -> str:
        """Token do vendedor/SDR — dono da sala, libera quem está esperando."""
        return self._create_token(task, user.name or "Anfitrião", is_owner=True)

    def create_guest_token(self, task: CardTask, guest_name: str) -> str:
        """Token do convidado — nunca dono, não libera ninguém nem encerra a sala."""
        return self._create_token(task, guest_name or "Convidado", is_owner=False)

    # ── webhook ─────────────────────────────────────────────────────────────

    def garantir_webhook(self, url: str) -> dict:
        """
        Garante que existe na conta do Daily um webhook para esta URL com os
        eventos que precisamos.

        Registrar sem conferir os existentes acumula webhooks duplicados, e aí
        o mesmo evento chega várias vezes — cada gravação seria processada em
        duplicidade.

        Webhook de outra URL (outro ambiente na mesma conta) não é tocado.

        Returns:
            dict do webhook. Em criação, traz o campo `hmac` — o segredo que
            valida as chamadas. Guardar em DAILY_WEBHOOK_SECRET.
        """
        headers = self._headers()

        try:
            with httpx.Client(timeout=HTTP_TIMEOUT_SECONDS) as client:
                resp = client.get(f"{settings.DAILY_API_URL}/webhooks", headers=headers)
        except httpx.HTTPError as e:
            raise ValueError(f"Não foi possível consultar os webhooks do Daily: {e}") from e

        if resp.status_code >= 400:
            raise ValueError(f"Daily retornou erro {resp.status_code}: {resp.text}")

        dados = resp.json()
        existentes = dados if isinstance(dados, list) else (dados.get("data") or [])

        desejados = sorted(WEBHOOK_EVENTOS)

        for webhook in existentes:
            if (webhook.get("url") or "").rstrip("/") != url.rstrip("/"):
                continue  # webhook de outro ambiente

            if sorted(webhook.get("eventTypes") or []) == desejados:
                return webhook  # já está como queremos

            # Mesma URL com lista diferente: substitui
            try:
                with httpx.Client(timeout=HTTP_TIMEOUT_SECONDS) as client:
                    client.delete(
                        f"{settings.DAILY_API_URL}/webhooks/{webhook.get('uuid')}",
                        headers=headers,
                    )
            except Exception as e:
                print(f"[DAILY] Aviso: falha ao remover webhook antigo: {e}")

        payload = {"url": url, "eventTypes": WEBHOOK_EVENTOS}
        return self._post("/webhooks", payload)
