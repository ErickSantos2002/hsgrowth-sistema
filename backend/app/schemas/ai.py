"""
Schemas Pydantic para o módulo de IA.
Define as estruturas de entrada e saída dos endpoints de inteligência artificial.
"""
from typing import Optional
from enum import Enum
from pydantic import BaseModel, Field


class TextGenerateType(str, Enum):
    """Tipos de texto que podem ser gerados pelo LLM"""
    EMAIL_FOLLOWUP = "email_followup"       # E-mail de follow-up para cliente
    EMAIL_PROPOSAL = "email_proposal"       # E-mail com proposta comercial
    EMAIL_CUSTOM = "email_custom"           # E-mail com instrução livre
    CARD_SUMMARY = "card_summary"           # Resumo narrativo do card


class AIHealthResponse(BaseModel):
    """Resposta do endpoint de verificação de saúde da integração com OpenAI"""
    status: str = Field(..., description="Status da conexão: 'ok' ou 'error'")
    model: str = Field(..., description="Modelo OpenAI configurado")
    message: str = Field(..., description="Mensagem descritiva do status")

    model_config = {
        "json_schema_extra": {
            "example": {
                "status": "ok",
                "model": "gpt-4o-mini",
                "message": "Conexão com OpenAI funcionando corretamente."
            }
        }
    }


class AICardSummaryResponse(BaseModel):
    """Resposta do endpoint de resumo de card"""
    card_id: int = Field(..., description="ID do card resumido")
    card_title: str = Field(..., description="Título do card")
    summary: str = Field(..., description="Resumo gerado pelo LLM")
    model_used: str = Field(..., description="Modelo OpenAI utilizado")
    tokens_used: int = Field(..., description="Total de tokens consumidos na requisição")

    model_config = {
        "json_schema_extra": {
            "example": {
                "card_id": 42,
                "card_title": "Empresa XYZ - Proposta de Software",
                "summary": "Negociação em andamento há 3 semanas. Cliente demonstrou interesse no plano Enterprise. Última nota registrada pelo vendedor João indica que o cliente solicitou desconto de 15% e aguarda aprovação da gerência. Próximo passo: retornar contato até sexta-feira.",
                "model_used": "gpt-4o-mini",
                "tokens_used": 620
            }
        }
    }


class AITextGenerateRequest(BaseModel):
    """
    Requisição para geração de texto livre.
    Permite ao vendedor gerar e-mails e mensagens personalizadas com base no contexto do negócio.
    """
    generate_type: TextGenerateType = Field(
        ...,
        description="Tipo de texto a ser gerado"
    )
    card_id: Optional[int] = Field(
        None,
        description="ID do card para buscar contexto automaticamente (opcional)"
    )
    client_name: Optional[str] = Field(
        None,
        max_length=255,
        description="Nome do cliente/empresa para personalizar o texto"
    )
    person_name: Optional[str] = Field(
        None,
        max_length=255,
        description="Nome da pessoa de contato para personalizar o texto"
    )
    extra_context: Optional[str] = Field(
        None,
        max_length=2000,
        description="Contexto adicional ou instrução livre para guiar a geração"
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "generate_type": "email_followup",
                "card_id": 42,
                "client_name": "Empresa XYZ",
                "person_name": "Carlos Silva",
                "extra_context": "Mencionar que a proposta tem validade até o final do mês."
            }
        }
    }


class AITextGenerateResponse(BaseModel):
    """Resposta do endpoint de geração de texto"""
    generated_text: str = Field(..., description="Texto gerado pelo LLM")
    generate_type: str = Field(..., description="Tipo de texto que foi gerado")
    model_used: str = Field(..., description="Modelo OpenAI utilizado")
    tokens_used: int = Field(..., description="Total de tokens consumidos na requisição")

    model_config = {
        "json_schema_extra": {
            "example": {
                "generated_text": "Assunto: Retomando nossa conversa - Proposta Empresa XYZ\n\nOlá Carlos,\n\nEspero que esteja bem! Passando para retomar nossa conversa sobre a proposta...",
                "generate_type": "email_followup",
                "model_used": "gpt-4o-mini",
                "tokens_used": 480
            }
        }
    }
