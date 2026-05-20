"""
Serviço Microsoft Graph API.

Funcionalidades:
- Envio de e-mail em nome do usuário (Mail.Send)
- Criação de reuniões no Microsoft Teams (OnlineMeetings.ReadWrite)
- Leitura de transcrições de reuniões (OnlineMeetingTranscript.Read.All)

Requer que o usuário tenha autenticado via SSO e tenha ms_access_token salvo.
"""
import httpx
import base64
from datetime import datetime, timezone, timedelta
from typing import Optional
from sqlalchemy.orm import Session

from app.models.user import User
from app.services.microsoft_auth_service import microsoft_auth_service

GRAPH_BASE = "https://graph.microsoft.com/v1.0"
GRAPH_SEND_MAIL_URL = f"{GRAPH_BASE}/users/{{email}}/sendMail"
GRAPH_MEETINGS_URL = f"{GRAPH_BASE}/me/onlineMeetings"
GRAPH_EVENTS_URL = f"{GRAPH_BASE}/me/events"

# Todos os escopos necessários para o serviço completo
ALL_SCOPES = [
    "User.Read",
    "Mail.Send",
    "OnlineMeetings.ReadWrite",
    "OnlineMeetingTranscript.Read.All",
    "Calendars.ReadWrite",
]


class MicrosoftGraphService:

    def _get_valid_token(self, user: User, db: Session) -> str | None:
        """
        Retorna um access token válido para o usuário.
        Renova automaticamente via refresh token se estiver expirado.
        Retorna None se o usuário não tiver tokens MS.
        """
        if not user.ms_access_token:
            return None

        now = datetime.now(timezone.utc).replace(tzinfo=None)
        expires_at = user.ms_token_expires_at

        if expires_at and expires_at > now:
            return user.ms_access_token

        if not user.ms_refresh_token:
            return None

        try:
            msal_app = microsoft_auth_service._get_msal_app()
            result = msal_app.acquire_token_by_refresh_token(
                refresh_token=user.ms_refresh_token,
                scopes=ALL_SCOPES,
            )
            if "error" in result:
                return None

            expires_in = result.get("expires_in", 3600)
            user.ms_access_token = result["access_token"]
            user.ms_refresh_token = result.get("refresh_token", user.ms_refresh_token)
            user.ms_token_expires_at = (
                datetime.now(timezone.utc).replace(tzinfo=None)
                + timedelta(seconds=expires_in - 60)
            )
            db.commit()
            return user.ms_access_token
        except Exception as e:
            print(f"[GraphService] Erro ao renovar token MS: {e}")
            return None

    def _auth_headers(self, token: str) -> dict:
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    def _require_token(self, user: User, db: Session) -> str:
        token = self._get_valid_token(user, db)
        if not token:
            raise ValueError(
                "Este usuário não possui conexão com Microsoft 365. "
                "Faça logout e entre novamente pelo botão 'Entrar com Microsoft'."
            )
        return token

    # ==================== E-MAIL ====================

    def send_email(
        self,
        user: User,
        db: Session,
        to_addresses: list[str],
        subject: str,
        body: str,
        attachments: Optional[list[dict]] = None,
    ) -> dict:
        """
        Envia um e-mail individual para cada destinatário via Microsoft Graph (mala direta).
        Cada pessoa recebe seu próprio e-mail sem ver os demais destinatários.

        Args:
            attachments: Lista de dicts com keys: name, content_type, data_base64
        """
        access_token = self._require_token(user, db)

        valid_addresses = [addr.strip() for addr in to_addresses if addr and addr.strip()]
        if not valid_addresses:
            raise ValueError("Nenhum endereço de e-mail de destino válido informado.")

        graph_attachments = [
            {
                "@odata.type": "#microsoft.graph.fileAttachment",
                "name": att["name"],
                "contentType": att["content_type"],
                "contentBytes": att["data_base64"],
            }
            for att in attachments
        ] if attachments else None

        url = GRAPH_SEND_MAIL_URL.format(email=user.email)
        errors = []

        with httpx.Client(timeout=30) as client:
            for addr in valid_addresses:
                message: dict = {
                    "subject": subject,
                    "body": {"contentType": "HTML", "content": body},
                    "toRecipients": [{"emailAddress": {"address": addr}}],
                    "from": {"emailAddress": {"address": user.email}},
                }
                if graph_attachments:
                    message["attachments"] = graph_attachments

                try:
                    resp = client.post(
                        url,
                        json={"message": message, "saveToSentItems": True},
                        headers=self._auth_headers(access_token),
                    )
                    if resp.status_code != 202:
                        error_data = resp.json() if resp.content else {}
                        error_msg = error_data.get("error", {}).get("message", f"HTTP {resp.status_code}")
                        errors.append(f"{addr}: {error_msg}")
                except Exception as e:
                    errors.append(f"{addr}: {str(e)}")

        if errors:
            # Se houve falhas parciais, informa quais falharam
            failed = "; ".join(errors)
            sent = len(valid_addresses) - len(errors)
            if sent == 0:
                return {"success": False, "error": failed}
            return {"success": True, "partial_errors": failed, "sent": sent, "failed": len(errors)}

        return {"success": True}

    # ==================== CALENDÁRIO + TEAMS ====================

    def create_calendar_event(
        self,
        user: User,
        db: Session,
        title: str,
        start_dt: datetime,
        end_dt: Optional[datetime] = None,
        attendee_emails: Optional[list[str]] = None,
    ) -> dict:
        """
        Cria um evento no calendário do Outlook/Teams com link de reunião Teams.
        O evento aparece no calendário do organizador e envia convites aos participantes.

        Returns:
            dict com: meeting_id (online meeting ID para transcrições), join_url (str)

        Raises:
            ValueError: Se o usuário não tiver token MS válido ou a chamada falhar
        """
        access_token = self._require_token(user, db)

        if end_dt is None:
            end_dt = start_dt + timedelta(hours=1)

        def to_iso(dt: datetime) -> str:
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.strftime("%Y-%m-%dT%H:%M:%S")

        payload: dict = {
            "subject": title,
            "start": {"dateTime": to_iso(start_dt), "timeZone": "UTC"},
            "end": {"dateTime": to_iso(end_dt), "timeZone": "UTC"},
            "isOnlineMeeting": True,
            "onlineMeetingProvider": "teamsForBusiness",
        }

        if attendee_emails:
            payload["attendees"] = [
                {"emailAddress": {"address": email}, "type": "required"}
                for email in attendee_emails
                if email and email.strip()
            ]

        try:
            with httpx.Client(timeout=15) as client:
                resp = client.post(
                    GRAPH_EVENTS_URL,
                    json=payload,
                    headers=self._auth_headers(access_token),
                )

            if resp.status_code not in (200, 201):
                error_msg = resp.json().get("error", {}).get("message", f"HTTP {resp.status_code}")
                raise ValueError(f"Erro ao criar evento no calendário: {error_msg}")

            data = resp.json()
            join_url = data.get("onlineMeeting", {}).get("joinUrl", "")

            if not join_url:
                raise ValueError("Evento criado mas link Teams não gerado. Verifique as permissões.")

            # Resolve o online meeting ID a partir do join URL (necessário para transcrições)
            meeting_id = self._resolve_meeting_id_by_join_url(access_token, join_url)

            return {
                "meeting_id": meeting_id,
                "join_url": join_url,
                "event_id": data.get("id", ""),
            }
        except ValueError:
            raise
        except Exception as e:
            raise ValueError(f"Erro ao criar evento no calendário: {e}")

    def update_calendar_event(
        self,
        user: User,
        db: Session,
        event_id: str,
        start_dt: datetime,
        end_dt: Optional[datetime] = None,
    ) -> None:
        """
        Atualiza o horário de um evento existente no calendário do Outlook via PATCH.

        Raises:
            ValueError: Se o usuário não tiver token MS válido ou a chamada falhar
        """
        access_token = self._require_token(user, db)

        if end_dt is None:
            end_dt = start_dt + timedelta(hours=1)

        def to_iso(dt: datetime) -> str:
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.strftime("%Y-%m-%dT%H:%M:%S")

        payload = {
            "start": {"dateTime": to_iso(start_dt), "timeZone": "UTC"},
            "end": {"dateTime": to_iso(end_dt), "timeZone": "UTC"},
        }

        try:
            with httpx.Client(timeout=15) as client:
                resp = client.patch(
                    f"{GRAPH_EVENTS_URL}/{event_id}",
                    json=payload,
                    headers=self._auth_headers(access_token),
                )
            if resp.status_code not in (200, 201):
                error_msg = resp.json().get("error", {}).get("message", f"HTTP {resp.status_code}")
                raise ValueError(f"Erro ao atualizar evento no calendário: {error_msg}")
        except ValueError:
            raise
        except Exception as e:
            raise ValueError(f"Erro ao atualizar evento no calendário: {e}")

    def delete_calendar_event(
        self,
        user: User,
        db: Session,
        event_id: str,
    ) -> None:
        """
        Cancela/exclui um evento do calendário do Outlook via DELETE.

        Raises:
            ValueError: Se o usuário não tiver token MS válido ou a chamada falhar
        """
        access_token = self._require_token(user, db)

        try:
            with httpx.Client(timeout=15) as client:
                resp = client.delete(
                    f"{GRAPH_EVENTS_URL}/{event_id}",
                    headers=self._auth_headers(access_token),
                )
            if resp.status_code not in (204, 200):
                error_msg = resp.json().get("error", {}).get("message", f"HTTP {resp.status_code}")
                raise ValueError(f"Erro ao cancelar evento no calendário: {error_msg}")
        except ValueError:
            raise
        except Exception as e:
            raise ValueError(f"Erro ao cancelar evento no calendário: {e}")

    def _resolve_meeting_id_by_join_url(self, access_token: str, join_url: str) -> str:
        """
        Resolve o ID do online meeting a partir do join URL.
        Necessário para buscar transcrições via Graph API.
        Retorna o join_url como fallback se não conseguir resolver.
        """
        try:
            import urllib.parse
            encoded_url = urllib.parse.quote(join_url)
            url = f"{GRAPH_MEETINGS_URL}?$filter=JoinWebUrl eq '{join_url}'"
            headers = {"Authorization": f"Bearer {access_token}"}
            with httpx.Client(timeout=10) as client:
                resp = client.get(url, headers=headers)
            if resp.status_code == 200:
                meetings = resp.json().get("value", [])
                if meetings:
                    return meetings[0]["id"]
        except Exception as e:
            print(f"[GraphService] Aviso: não foi possível resolver meeting ID: {e}")
        # Fallback: retorna o join_url como marcador — fetch-transcript vai tentar resolver novamente
        return f"join_url:{join_url}"

    def get_calendar_events(
        self,
        user: User,
        db: Session,
        start_dt: datetime,
        end_dt: datetime,
    ) -> list[dict]:
        """
        Busca eventos do calendário do usuário no período informado.

        Returns:
            Lista de dicts com: id, subject, start, end, isOnlineMeeting, joinUrl, organizer
        """
        access_token = self._require_token(user, db)

        def to_iso(dt: datetime) -> str:
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.strftime("%Y-%m-%dT%H:%M:%SZ")

        params = {
            "$filter": f"start/dateTime ge '{to_iso(start_dt)}' and end/dateTime le '{to_iso(end_dt)}'",
            "$select": "id,subject,start,end,isOnlineMeeting,onlineMeeting,organizer,location",
            "$orderby": "start/dateTime",
            "$top": "100",
        }

        try:
            with httpx.Client(timeout=15) as client:
                resp = client.get(
                    GRAPH_EVENTS_URL,
                    params=params,
                    headers=self._auth_headers(access_token),
                )

            if resp.status_code != 200:
                error_msg = resp.json().get("error", {}).get("message", f"HTTP {resp.status_code}")
                raise ValueError(f"Erro ao buscar eventos do calendário: {error_msg}")

            events = resp.json().get("value", [])
            return [
                {
                    "id": e["id"],
                    "subject": e.get("subject", ""),
                    "start": e.get("start", {}).get("dateTime", ""),
                    "end": e.get("end", {}).get("dateTime", ""),
                    "is_online_meeting": e.get("isOnlineMeeting", False),
                    "join_url": e.get("onlineMeeting", {}).get("joinUrl", "") if e.get("onlineMeeting") else "",
                    "organizer": e.get("organizer", {}).get("emailAddress", {}).get("name", ""),
                    "location": e.get("location", {}).get("displayName", ""),
                }
                for e in events
            ]
        except ValueError:
            raise
        except Exception as e:
            raise ValueError(f"Erro ao buscar eventos do calendário: {e}")

    # ==================== TEAMS MEETINGS (legado) ====================

    def create_teams_meeting(
        self,
        user: User,
        db: Session,
        title: str,
        start_dt: datetime,
        end_dt: Optional[datetime] = None,
    ) -> dict:
        """
        Cria uma reunião no Microsoft Teams em nome do usuário.

        Returns:
            dict com: meeting_id (str), join_url (str)

        Raises:
            ValueError: Se o usuário não tiver token MS válido ou a chamada falhar
        """
        access_token = self._require_token(user, db)

        if end_dt is None:
            end_dt = start_dt + timedelta(hours=1)

        # Graph API espera ISO 8601 com timezone
        def to_iso(dt: datetime) -> str:
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.strftime("%Y-%m-%dT%H:%M:%S") + "Z"

        payload = {
            "subject": title,
            "startDateTime": to_iso(start_dt),
            "endDateTime": to_iso(end_dt),
        }

        try:
            with httpx.Client(timeout=15) as client:
                resp = client.post(
                    GRAPH_MEETINGS_URL,
                    json=payload,
                    headers=self._auth_headers(access_token),
                )

            if resp.status_code not in (200, 201):
                error_msg = resp.json().get("error", {}).get("message", f"HTTP {resp.status_code}")
                raise ValueError(f"Erro ao criar reunião no Teams: {error_msg}")

            data = resp.json()
            return {
                "meeting_id": data["id"],
                "join_url": data["joinWebUrl"],
            }
        except ValueError:
            raise
        except Exception as e:
            raise ValueError(f"Erro ao criar reunião no Teams: {e}")

    def get_meeting_transcripts(
        self,
        user: User,
        db: Session,
        meeting_id: str,
    ) -> list[dict]:
        """
        Lista as transcrições disponíveis para uma reunião.

        Returns:
            Lista de dicts com: id, createdDateTime
        """
        access_token = self._require_token(user, db)
        url = f"{GRAPH_BASE}/me/onlineMeetings/{meeting_id}/transcripts"

        try:
            with httpx.Client(timeout=15) as client:
                resp = client.get(url, headers=self._auth_headers(access_token))

            if resp.status_code == 404:
                return []

            if resp.status_code != 200:
                error_msg = resp.json().get("error", {}).get("message", f"HTTP {resp.status_code}")
                raise ValueError(f"Erro ao buscar transcrições: {error_msg}")

            return resp.json().get("value", [])
        except ValueError:
            raise
        except Exception as e:
            raise ValueError(f"Erro ao buscar transcrições: {e}")

    def get_transcript_content(
        self,
        user: User,
        db: Session,
        meeting_id: str,
        transcript_id: str,
    ) -> str:
        """
        Baixa o conteúdo de uma transcrição em formato VTT (texto com timestamps).

        Returns:
            String com conteúdo VTT da transcrição
        """
        access_token = self._require_token(user, db)
        url = (
            f"{GRAPH_BASE}/me/onlineMeetings/{meeting_id}"
            f"/transcripts/{transcript_id}/content?$format=text/vtt"
        )

        try:
            headers = {"Authorization": f"Bearer {access_token}"}
            with httpx.Client(timeout=30) as client:
                resp = client.get(url, headers=headers)

            if resp.status_code != 200:
                error_msg = f"HTTP {resp.status_code}"
                raise ValueError(f"Erro ao baixar transcrição: {error_msg}")

            return resp.text
        except ValueError:
            raise
        except Exception as e:
            raise ValueError(f"Erro ao baixar transcrição: {e}")


    # ==================== DISPONIBILIDADE (getSchedule) ====================

    def get_schedule(
        self,
        user: User,
        db: Session,
        emails: list[str],
        start_dt: datetime,
        end_dt: datetime,
        interval_minutes: int = 30,
    ) -> list[dict]:
        """
        Busca blocos de livre/ocupado de outros usuários do mesmo tenant via getSchedule.
        Usado para o SDR visualizar a disponibilidade do Vendedor ao agendar reuniões.

        Returns:
            Lista de dicts com: email, status, subject, start, end, is_private
        """
        access_token = self._require_token(user, db)

        def to_graph_dt(dt: datetime) -> dict:
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return {"dateTime": dt.strftime("%Y-%m-%dT%H:%M:%S"), "timeZone": "UTC"}

        payload = {
            "schedules": emails,
            "startTime": to_graph_dt(start_dt),
            "endTime": to_graph_dt(end_dt),
            "availabilityViewInterval": interval_minutes,
        }

        url = f"{GRAPH_BASE}/me/calendar/getSchedule"

        try:
            with httpx.Client(timeout=15) as client:
                resp = client.post(url, json=payload, headers=self._auth_headers(access_token))

            if resp.status_code != 200:
                error_data = resp.json() if resp.content else {}
                error_msg = error_data.get("error", {}).get("message", f"HTTP {resp.status_code}")
                raise ValueError(f"Erro ao buscar disponibilidade: {error_msg}")

            results = []
            for schedule in resp.json().get("value", []):
                schedule_email = schedule.get("scheduleId", "")
                for item in schedule.get("scheduleItems", []):
                    is_private = item.get("isPrivate", False)
                    results.append({
                        "email": schedule_email,
                        "status": item.get("status", "busy"),
                        "subject": "(Compromisso particular)" if is_private else item.get("subject", ""),
                        "start": item.get("start", {}).get("dateTime", ""),
                        "end": item.get("end", {}).get("dateTime", ""),
                        "is_private": is_private,
                    })
            return results
        except ValueError:
            raise
        except Exception as e:
            raise ValueError(f"Erro ao buscar disponibilidade: {e}")


microsoft_graph_service = MicrosoftGraphService()
