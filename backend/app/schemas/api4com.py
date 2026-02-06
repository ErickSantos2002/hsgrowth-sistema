"""
Schemas Pydantic para API4COM (VOIP).
"""
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing import Optional
from datetime import datetime


# ========== Config Schemas ==========

class API4ComConfigCreate(BaseModel):
    """Cria a configuração de integração com a API4COM (VOIP)."""
    email: EmailStr = Field(..., description="Email de login na conta API4COM")
    password: str = Field(..., min_length=6, description="Senha da conta API4COM")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "admin@minhaempresa.com",
                "password": "senhaSegura123"
            }
        }
    )


class API4ComConfigUpdate(BaseModel):
    """Atualiza configuração da API4COM. Apenas campos fornecidos serão alterados."""
    email: Optional[EmailStr] = Field(None, description="Novo email de login na API4COM")
    password: Optional[str] = Field(None, min_length=6, description="Nova senha da conta API4COM")
    is_active: Optional[bool] = Field(None, description="Se a integração está ativa")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "novo-admin@minhaempresa.com",
                "is_active": True
            }
        }
    )


class API4ComConfigResponse(BaseModel):
    """Dados da configuração da API4COM."""
    id: int = Field(..., description="ID da configuração")
    email: str = Field(..., description="Email de login configurado")
    is_active: bool = Field(..., description="Se a integração está ativa")
    has_valid_token: bool = Field(..., description="Se possui token válido e não expirado")
    token_expires_at: Optional[datetime] = Field(None, description="Data de expiração do token atual")
    last_test_at: Optional[datetime] = Field(None, description="Data do último teste de conexão")
    last_test_success: Optional[bool] = Field(None, description="Se o último teste foi bem-sucedido")
    last_test_error: Optional[str] = Field(None, description="Mensagem de erro do último teste")
    created_at: datetime = Field(..., description="Data de criação da configuração")
    updated_at: datetime = Field(..., description="Data da última atualização")

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 1,
                "email": "admin@minhaempresa.com",
                "is_active": True,
                "has_valid_token": True,
                "token_expires_at": "2026-01-16T10:00:00",
                "last_test_at": "2026-01-15T10:00:00",
                "last_test_success": True,
                "last_test_error": None,
                "created_at": "2026-01-01T10:00:00",
                "updated_at": "2026-01-15T10:00:00"
            }
        }
    )


# ========== Extension Schemas ==========

class UserExtensionCreate(BaseModel):
    """Vincula um ramal telefônico a um usuário (vendedor)."""
    user_id: int = Field(..., description="ID do usuário (vendedor) que usará o ramal")
    extension: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Número do ramal do vendedor (ex: '1000', '2001')"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "user_id": 5,
                "extension": "1000"
            }
        }
    )


class UserExtensionUpdate(BaseModel):
    """Atualiza ramal de um usuário. Apenas campos fornecidos serão alterados."""
    extension: Optional[str] = Field(
        None,
        min_length=1,
        max_length=50,
        description="Novo número do ramal"
    )
    is_active: Optional[bool] = Field(None, description="Se o ramal está ativo")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "extension": "2001",
                "is_active": True
            }
        }
    )


class UserExtensionResponse(BaseModel):
    """Dados de um ramal vinculado a um usuário."""
    id: int = Field(..., description="ID do registro")
    user_id: int = Field(..., description="ID do usuário")
    extension: str = Field(..., description="Número do ramal")
    is_active: bool = Field(..., description="Se o ramal está ativo")
    created_at: datetime = Field(..., description="Data de criação")

    # Dados do usuário (para exibição na listagem)
    user_name: Optional[str] = Field(None, description="Nome do usuário")
    user_email: Optional[str] = Field(None, description="Email do usuário")

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 1,
                "user_id": 5,
                "extension": "1000",
                "is_active": True,
                "created_at": "2026-01-15T10:00:00",
                "user_name": "João Silva",
                "user_email": "joao@minhaempresa.com"
            }
        }
    )


# ========== Test Connection ==========

class API4ComTestResponse(BaseModel):
    """Resultado do teste de conexão com a API4COM."""
    success: bool = Field(..., description="Se o teste foi bem-sucedido")
    message: str = Field(..., description="Mensagem descritiva do resultado")
    token_valid: bool = Field(..., description="Se o token de autenticação está válido")
    error: Optional[str] = Field(None, description="Detalhes do erro, se houver")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "success": True,
                "message": "Conexão com API4COM estabelecida com sucesso",
                "token_valid": True,
                "error": None
            }
        }
    )


# ========== Call Schemas ==========

class CallRequest(BaseModel):
    """Inicia uma chamada telefônica via API4COM."""
    phone: str = Field(..., description="Número de telefone para ligar (com DDI, ex: +5548999999999)")
    card_id: int = Field(..., description="ID do card que originou a chamada (para rastreabilidade)")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "phone": "+5548999887766",
                "card_id": 42
            }
        }
    )


class CallResponse(BaseModel):
    """Resultado de iniciar uma chamada via API4COM."""
    success: bool = Field(..., description="Se a chamada foi iniciada com sucesso")
    message: str = Field(..., description="Mensagem descritiva do resultado")
    call_log_id: Optional[int] = Field(None, description="ID do registro de chamada criado no sistema")
    error: Optional[str] = Field(None, description="Detalhes do erro, se houver")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "success": True,
                "message": "Chamada iniciada com sucesso para +5548999887766",
                "call_log_id": 15,
                "error": None
            }
        }
    )


class WebhookCallData(BaseModel):
    """
    Dados recebidos do webhook da API4COM quando uma chamada termina.
    Baseado na documentação da API4COM.
    """
    id: Optional[str] = Field(None, description="ID da chamada na API4COM")
    caller: Optional[str] = Field(None, description="Número de quem ligou (ramal)")
    called: Optional[str] = Field(None, description="Número que foi chamado (destino)")
    duration: Optional[int] = Field(None, description="Duração da chamada em segundos")
    recording_url: Optional[str] = Field(None, description="URL da gravação da chamada")
    status: Optional[str] = Field(None, description="Status da chamada (completed, failed, no_answer, busy)")
    metadata: Optional[dict] = Field(None, description="Metadata personalizada enviada na chamada original")
    started_at: Optional[str] = Field(None, description="Timestamp ISO de início da chamada")
    ended_at: Optional[str] = Field(None, description="Timestamp ISO de fim da chamada")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "call_abc123",
                "caller": "1000",
                "called": "+5548999887766",
                "duration": 180,
                "recording_url": "https://api4com.com/recordings/call_abc123.mp3",
                "status": "completed",
                "metadata": {"card_id": 42, "user_id": 5},
                "started_at": "2026-01-15T14:30:00Z",
                "ended_at": "2026-01-15T14:33:00Z"
            }
        }
    )


class CallLogResponse(BaseModel):
    """Dados de um registro no histórico de chamadas."""
    id: int = Field(..., description="ID do registro de chamada")
    user_id: int = Field(..., description="ID do vendedor que fez a chamada")
    card_id: int = Field(..., description="ID do card vinculado")
    phone: str = Field(..., description="Número discado")
    extension: str = Field(..., description="Ramal utilizado")
    status: str = Field(..., description="Status da chamada (initiated, completed, failed, no_answer)")
    duration: Optional[int] = Field(None, description="Duração em segundos")
    recording_url: Optional[str] = Field(None, description="URL da gravação")
    api4com_call_id: Optional[str] = Field(None, description="ID da chamada na API4COM")
    error_message: Optional[str] = Field(None, description="Mensagem de erro (se falhou)")
    created_at: datetime = Field(..., description="Data/hora de criação do registro")
    updated_at: datetime = Field(..., description="Data/hora da última atualização")

    # Dados relacionados
    user_name: Optional[str] = Field(None, description="Nome do vendedor")
    card_title: Optional[str] = Field(None, description="Título do card vinculado")

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 15,
                "user_id": 5,
                "card_id": 42,
                "phone": "+5548999887766",
                "extension": "1000",
                "status": "completed",
                "duration": 180,
                "recording_url": "https://api4com.com/recordings/call_abc123.mp3",
                "api4com_call_id": "call_abc123",
                "error_message": None,
                "created_at": "2026-01-15T14:30:00",
                "updated_at": "2026-01-15T14:33:00",
                "user_name": "João Silva",
                "card_title": "Projeto Alpha - Empresa XYZ"
            }
        }
    )
