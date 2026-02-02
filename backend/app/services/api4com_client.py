"""
Cliente HTTP para comunicação com a API externa da API4COM.
"""
import httpx
from typing import Optional, Dict, Any
from datetime import datetime


class API4ComClient:
    """
    Cliente para interagir com a API externa da API4COM (VOIP).

    Endpoints documentados em: https://developers.api4com.com/
    """

    BASE_URL = "https://api.api4com.com/api/v1"
    TIMEOUT = 30.0  # Timeout em segundos

    def __init__(self, token: Optional[str] = None):
        """
        Inicializa o cliente.

        Args:
            token: Token de autenticação (opcional, obtido via login)
        """
        self.token = token

    async def login(self, email: str, password: str) -> Dict[str, Any]:
        """
        Faz login na API4COM e retorna o token de autenticação.

        Args:
            email: Email da conta API4COM
            password: Senha da conta

        Returns:
            {
                "id": "token_aqui",
                "ttl": 1209600,  # Tempo de vida em segundos
                "created": "2025-01-01T00:00:00.000Z",
                "userId": "user_id_aqui"
            }

        Raises:
            httpx.HTTPStatusError: Se a requisição falhar
        """
        async with httpx.AsyncClient(timeout=self.TIMEOUT) as client:
            response = await client.post(
                f"{self.BASE_URL}/users/login",
                json={
                    "email": email,
                    "password": password
                }
            )
            response.raise_for_status()
            return response.json()

    async def test_connection(self) -> bool:
        """
        Testa se o token está válido fazendo uma requisição à API.

        Returns:
            True se o token é válido, False caso contrário

        Note:
            Este método não lança exceções, apenas retorna True/False
        """
        if not self.token:
            return False

        try:
            async with httpx.AsyncClient(timeout=self.TIMEOUT) as client:
                response = await client.get(
                    f"{self.BASE_URL}/users/me",
                    headers={"Authorization": self.token}
                )
                return response.status_code == 200
        except Exception:
            return False

    async def get_user_info(self) -> Dict[str, Any]:
        """
        Retorna informações do usuário autenticado.

        Returns:
            Dados do usuário

        Raises:
            ValueError: Se o token não estiver configurado
            httpx.HTTPStatusError: Se a requisição falhar
        """
        if not self.token:
            raise ValueError("Token não configurado")

        async with httpx.AsyncClient(timeout=self.TIMEOUT) as client:
            response = await client.get(
                f"{self.BASE_URL}/users/me",
                headers={"Authorization": self.token}
            )
            response.raise_for_status()
            return response.json()

    async def make_call(
        self,
        extension: str,
        phone: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Realiza uma chamada telefônica via API4COM.

        Args:
            extension: Ramal do usuário que fará a chamada (ex: "1000")
            phone: Número de telefone do destinatário (ex: "11999999999")
            metadata: Dados adicionais para enviar com a chamada (opcional)

        Returns:
            {
                "id": "call_id_gerado",
                "message": "successfull",
                "extension": "1000",
                "phone": "11999999999"
            }

        Raises:
            ValueError: Se o token não estiver configurado
            httpx.HTTPStatusError: Se a requisição falhar
        """
        if not self.token:
            raise ValueError("Token não configurado")

        payload = {
            "extension": extension,
            "phone": phone
        }

        # Adiciona metadata se fornecido
        if metadata:
            payload["metadata"] = metadata

        async with httpx.AsyncClient(timeout=self.TIMEOUT) as client:
            response = await client.post(
                f"{self.BASE_URL}/dialer",
                headers={"Authorization": self.token},
                json=payload
            )
            response.raise_for_status()
            return response.json()

    async def get_call_status(self, call_id: str) -> Dict[str, Any]:
        """
        Busca o status de uma chamada específica.

        Args:
            call_id: ID da chamada retornado pelo make_call

        Returns:
            Status da chamada

        Raises:
            ValueError: Se o token não estiver configurado
            httpx.HTTPStatusError: Se a requisição falhar

        Note:
            Este endpoint pode não estar disponível na API4COM.
            Verificar documentação antes de usar.
        """
        if not self.token:
            raise ValueError("Token não configurado")

        async with httpx.AsyncClient(timeout=self.TIMEOUT) as client:
            response = await client.get(
                f"{self.BASE_URL}/calls/{call_id}",
                headers={"Authorization": self.token}
            )
            response.raise_for_status()
            return response.json()
