"""
Serviço de autenticação Microsoft 365 via MSAL (OAuth2 / OpenID Connect).

Fluxo:
  1. get_authorization_url() → redireciona usuário para login.microsoftonline.com
  2. exchange_code_for_token(code) → troca code por token
  3. get_user_profile(access_token) → lê email/nome via Microsoft Graph
"""
import msal
from app.core.config import settings


class MicrosoftAuthService:
    SCOPES = [
        "User.Read",
        "Mail.Send",
        "OnlineMeetings.ReadWrite",
        "OnlineMeetingTranscript.Read.All",
        "Calendars.ReadWrite",
    ]
    GRAPH_ME_URL = "https://graph.microsoft.com/v1.0/me"

    def _get_msal_app(self) -> msal.ConfidentialClientApplication:
        authority = f"https://login.microsoftonline.com/{settings.MS_TENANT_ID}"
        return msal.ConfidentialClientApplication(
            client_id=settings.MS_CLIENT_ID,
            client_credential=settings.MS_CLIENT_SECRET,
            authority=authority,
        )

    def get_authorization_url(self) -> str:
        """
        Monta e retorna a URL de autorização do Microsoft para redirecionar o usuário.
        """
        app = self._get_msal_app()
        result = app.get_authorization_request_url(
            scopes=self.SCOPES,
            redirect_uri=settings.MS_REDIRECT_URI,
            prompt="select_account",
        )
        return result

    def exchange_code_for_token(self, code: str) -> dict:
        """
        Troca o authorization code por access_token + id_token.
        Retorna o dict completo retornado pelo MSAL.
        Lança ValueError se a troca falhar.
        """
        app = self._get_msal_app()
        result = app.acquire_token_by_authorization_code(
            code=code,
            scopes=self.SCOPES,
            redirect_uri=settings.MS_REDIRECT_URI,
        )
        if "error" in result:
            raise ValueError(
                f"Erro ao trocar código Microsoft: {result.get('error_description', result.get('error'))}"
            )
        return result

    def get_user_profile(self, access_token: str) -> dict:
        """
        Busca o perfil do usuário autenticado via Microsoft Graph.
        Retorna dict com: id, displayName, mail, userPrincipalName.
        Lança ValueError em caso de falha.
        """
        import httpx

        headers = {"Authorization": f"Bearer {access_token}"}
        with httpx.Client(timeout=10) as client:
            resp = client.get(self.GRAPH_ME_URL, headers=headers)

        if resp.status_code != 200:
            raise ValueError(f"Erro ao buscar perfil Microsoft Graph: {resp.status_code} — {resp.text}")

        data = resp.json()
        # O campo 'mail' pode ser None em contas corporativas — fallback para userPrincipalName
        email = data.get("mail") or data.get("userPrincipalName") or ""
        return {
            "microsoft_id": data.get("id"),
            "name": data.get("displayName"),
            "email": email.lower().strip(),
        }


microsoft_auth_service = MicrosoftAuthService()
