"""
Serviço Microsoft Graph API — envio de e-mail em nome do usuário.

Requer que o usuário tenha autenticado via SSO e tenha ms_access_token salvo.
Permissão necessária no Azure: Mail.Send (Delegated).
"""
import httpx
import base64
from datetime import datetime, timezone, timedelta
from typing import Optional
from sqlalchemy.orm import Session

from app.models.user import User
from app.services.microsoft_auth_service import microsoft_auth_service

GRAPH_SEND_MAIL_URL = "https://graph.microsoft.com/v1.0/users/{email}/sendMail"


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

        # Token ainda válido
        if expires_at and expires_at > now:
            return user.ms_access_token

        # Token expirado — tenta renovar com refresh token
        if not user.ms_refresh_token:
            return None

        try:
            msal_app = microsoft_auth_service._get_msal_app()
            result = msal_app.acquire_token_by_refresh_token(
                refresh_token=user.ms_refresh_token,
                scopes=["Mail.Send", "User.Read"],
            )
            if "error" in result:
                return None

            expires_in = result.get("expires_in", 3600)
            user.ms_access_token = result["access_token"]
            user.ms_refresh_token = result.get("refresh_token", user.ms_refresh_token)
            user.ms_token_expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(seconds=expires_in - 60)
            db.commit()

            return user.ms_access_token
        except Exception as e:
            print(f"[GraphService] Erro ao renovar token MS: {e}")
            return None

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
        Envia e-mail em nome do usuário via Microsoft Graph.

        Args:
            user: Usuário remetente (precisa ter ms_access_token)
            db: Sessão do banco para renovação de token
            to_addresses: Lista de endereços de destino
            subject: Assunto do e-mail
            body: Corpo do e-mail (HTML) — já deve incluir a assinatura se houver
            attachments: Lista de dicts com keys: name (str), content_type (str), data_base64 (str)

        Returns:
            dict com success=True ou success=False + error message

        Raises:
            ValueError: Se o usuário não tiver tokens MS (não logou via SSO)
        """
        access_token = self._get_valid_token(user, db)
        if not access_token:
            raise ValueError(
                "Este usuário não possui conexão com Microsoft 365. "
                "Faça login pelo botão 'Entrar com Microsoft' para habilitar o envio de e-mails."
            )

        # Monta destinatários
        recipients = [
            {"emailAddress": {"address": addr.strip()}}
            for addr in to_addresses
            if addr and addr.strip()
        ]
        if not recipients:
            raise ValueError("Nenhum endereço de e-mail de destino válido informado.")

        message: dict = {
            "subject": subject,
            "body": {
                "contentType": "HTML",
                "content": body,
            },
            "toRecipients": recipients,
            "from": {
                "emailAddress": {"address": user.email}
            },
        }

        # Anexos
        if attachments:
            message["attachments"] = [
                {
                    "@odata.type": "#microsoft.graph.fileAttachment",
                    "name": att["name"],
                    "contentType": att["content_type"],
                    "contentBytes": att["data_base64"],
                }
                for att in attachments
            ]

        payload = {
            "message": message,
            "saveToSentItems": True,
        }

        url = GRAPH_SEND_MAIL_URL.format(email=user.email)
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

        try:
            with httpx.Client(timeout=30) as client:
                resp = client.post(url, json=payload, headers=headers)

            if resp.status_code == 202:
                return {"success": True}

            error_data = resp.json() if resp.content else {}
            error_msg = error_data.get("error", {}).get("message", f"HTTP {resp.status_code}")
            return {"success": False, "error": error_msg}

        except Exception as e:
            return {"success": False, "error": str(e)}


microsoft_graph_service = MicrosoftGraphService()
