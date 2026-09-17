"""
Integração com o Daily.co — reunião por vídeo dentro do CRM.

Cuida da sala e dos tokens de acesso. Regras de negócio e permissão ficam nos
endpoints; aqui é só a conversa com a API.

Segurança: a chave da API nunca sai deste módulo. Nenhum token do Daily é
devolvido ao frontend sem passar por validação de acesso no endpoint.
"""
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

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

# Começo do `user_id` de quem entra pelo CRM. A sala usa isso para saber que a
# fala é do time, e não do cliente.
PREFIXO_DO_TIME = "time-"

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
        room_name = f"{settings.DAILY_ROOM_PREFIX}-{task.id}"

        payload = {
            "name": room_name,
            "privacy": "private",
            "properties": {
                "enable_knocking": True,     # sala de espera: o anfitrião libera
                "enable_chat": True,
                "enable_screenshare": True,
                "lang": "pt",
                # Permite gravar. Não começa sozinho: o Daily mostra o botão
                # para o dono da sala e gravar é decisão do vendedor.
                "enable_recording": "cloud",
                # Salva o VTT da transcrição — sem isso o arquivo não é
                # guardado e o webhook de transcrição nunca chega.
                "enable_transcription_storage": True,
                # Sem isto, o padrão do Daily deixa QUALQUER participante
                # iniciar e parar a gravação — o convidado fez isso na
                # homologação de 14/09. O anfitrião não é afetado: ele entra
                # com token de dono.
                "permissions": {
                    "hasPresence": True,
                    "canSend": True,
                    "canAdmin": False,
                },
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

    def atualizar_expiracao(self, task: CardTask) -> None:
        """
        Estende o prazo da sala quando a reunião é reagendada.

        A sala nasce válida até o fim previsto mais a margem. Reagendar sem
        mexer nisso deixa o convite apontando para uma sala que expira antes da
        nova data — e o vendedor só descobre na hora, com o cliente esperando.

        Sala que o Daily já removeu (prazo vencido) é recriada com o mesmo
        nome, para o link já enviado ao cliente continuar valendo.
        """
        if not task.daily_room_name:
            return

        url = f"{settings.DAILY_API_URL}/rooms/{task.daily_room_name}"
        payload = {"properties": {"exp": self._room_expiry(task)}}

        try:
            with httpx.Client(timeout=HTTP_TIMEOUT_SECONDS) as client:
                resp = client.post(url, headers=self._headers(), json=payload)
        except httpx.HTTPError as e:
            raise ValueError(f"Não foi possível falar com o Daily: {e}") from e

        if resp.status_code == 404:
            # O Daily apaga a sala depois do prazo. Recriar com o mesmo nome
            # devolve o mesmo endereço — o convite já enviado continua válido.
            self.create_room(task)
            return

        if resp.status_code >= 400:
            raise ValueError(f"Daily retornou erro {resp.status_code}: {resp.text}")

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

    def _create_token(
        self,
        task: CardTask,
        user_name: str,
        is_owner: bool,
        permissions: Optional[dict] = None,
        user_id: Optional[str] = None,
    ) -> str:
        propriedades = {
            "room_name": task.daily_room_name,
            "user_name": user_name,
            "is_owner": is_owner,
            "exp": self._room_expiry(task),
        }

        if permissions:
            propriedades["permissions"] = permissions

        if user_id:
            propriedades["user_id"] = user_id

        payload = {"properties": propriedades}

        data = self._post("/meeting-tokens", payload)

        token = data.get("token")
        if not token:
            raise ValueError("Daily não devolveu token de acesso à sala.")

        return token

    def _e_anfitriao(self, task: CardTask, user: User) -> bool:
        """
        Diz se a pessoa conduz esta reunião.

        É quem responde pela atividade; sem responsável definido, o vendedor do
        negócio. Os demais do time entram como acompanhantes.
        """
        if task.assigned_to_id:
            return task.assigned_to_id == user.id

        from app.models.card import Card

        card = self.db.query(Card).filter(Card.id == task.card_id).first()
        return bool(card and card.assigned_to_id == user.id)

    def create_host_token(self, task: CardTask, user: User) -> str:
        """
        Token de quem entra pelo CRM.

        **Só o anfitrião pode gravar.** Dono de sala no Daily é sempre
        administrador de tudo, inclusive da gravação — por isso qualquer pessoa
        do time que entrasse pelo CRM conseguia iniciar e parar a gravação
        (visto na homologação de 16/09). Quem acompanha entra sem ser dono, mas
        com permissão de liberar a sala de espera e de manter a transcrição:
        precisa disso para a reunião funcionar, e nada disso mexe na gravação.

        A transcrição não começa pelo token. O início automático do Daily usa o
        modelo padrão, em inglês: na homologação de 14/09 uma conversa em
        português virou "Have on the ip key". Quem inicia é a página da sala,
        pedindo pt-BR explicitamente.
        """
        nome = user.name or "Anfitrião"

        # Quem entra pelo CRM é do time. A sala usa essa marca para separar a
        # fala do time da fala do cliente na transcrição ao vivo — antes isso
        # vinha de "é dono da sala", que deixou de valer para os acompanhantes.
        # O token do Daily não aceita dados livres; `user_id` é o campo que
        # chega ao participante na sala.
        marca_do_time = f"{PREFIXO_DO_TIME}{user.id}"

        if self._e_anfitriao(task, user):
            return self._create_token(task, nome, is_owner=True, user_id=marca_do_time)

        return self._create_token(
            task,
            nome,
            is_owner=False,
            user_id=marca_do_time,
            permissions={
                "hasPresence": True,
                "canSend": True,
                # sem "streaming": não grava
                "canAdmin": ["participants", "transcription"],
            },
        )

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

    # ── gravações ───────────────────────────────────────────────────────────

    def _get(self, path: str) -> dict:
        """GET na API do Daily."""
        try:
            with httpx.Client(timeout=HTTP_TIMEOUT_SECONDS) as client:
                resp = client.get(f"{settings.DAILY_API_URL}{path}", headers=self._headers())
        except httpx.HTTPError as e:
            raise ValueError(f"Não foi possível falar com o Daily: {e}") from e

        if resp.status_code >= 400:
            raise ValueError(f"Daily retornou erro {resp.status_code}: {resp.text}")

        return resp.json()

    def listar_gravacoes(self, task: CardTask) -> list:
        """
        Gravações que o Daily tem para esta sala.

        Usado quando o webhook não chega: dá para buscar a gravação em vez de
        esperar um aviso que ficou pelo caminho.
        """
        if not task.daily_room_name:
            return []

        dados = self._get(f"/recordings?room_name={task.daily_room_name}")
        return dados.get("data") or []

    def link_download_gravacao(self, recording_id: str) -> str:
        """URL temporária para baixar a gravação do Daily."""
        dados = self._get(f"/recordings/{recording_id}/access-link")
        return dados.get("download_link") or dados.get("link") or ""

    # ── transcrição ─────────────────────────────────────────────────────────

    def link_download_transcricao(self, transcript_id: str) -> str:
        """
        URL temporária do arquivo .vtt.

        Como na gravação, o aviso do Daily não traz link: traz identificador.
        E o link vale poucos minutos, então é pedido na hora de baixar.
        """
        dados = self._get(f"/transcript/{transcript_id}/access-link")
        return dados.get("link") or dados.get("download_link") or ""

    def transcricao_da_sala(self, room_name: str) -> Optional[str]:
        """
        Última transcrição desta sala.

        A API do Daily não aceita filtro por sala, então a lista vem inteira e
        o filtro é nosso. É o caminho usado quando o aviso se perdeu e não há
        identificador de sessão guardado.
        """
        dados = self._get("/transcript?limit=100")
        daqui = [
            t for t in (dados.get("data") or [])
            if (t.get("roomName") or "") == room_name
        ]
        if not daqui:
            return None

        daqui.sort(key=lambda t: t.get("created_at") or "", reverse=True)
        return daqui[0].get("transcriptId")

    def transcricao_da_sessao(self, mtg_session_id: str) -> Optional[str]:
        """
        Acha a transcrição pela sessão da reunião.

        O aviso nem sempre traz o identificador da transcrição, mas sempre traz
        o da sessão — este é o caminho de recuperação.
        """
        dados = self._get(f"/transcript?mtgSessionId={mtg_session_id}")
        itens = dados.get("data") or []
        return itens[0].get("transcriptId") if itens else None

    def apagar_gravacao(self, recording_id: str) -> None:
        """
        Remove a gravação do Daily.

        Chamado depois que a cópia está guardada no nosso bucket: lá o arquivo
        ficaria para sempre, cobrando armazenamento, sem servir para nada.
        """
        try:
            with httpx.Client(timeout=HTTP_TIMEOUT_SECONDS) as client:
                resp = client.delete(
                    f"{settings.DAILY_API_URL}/recordings/{recording_id}",
                    headers=self._headers(),
                )
            if resp.status_code >= 400:
                print(f"[DAILY] Aviso: nao foi possivel apagar a gravacao {recording_id}: {resp.text}")
        except Exception as e:
            print(f"[DAILY] Aviso: falha ao apagar a gravacao {recording_id}: {e}")
