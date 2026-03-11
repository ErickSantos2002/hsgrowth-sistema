"""
Schemas Pydantic para o módulo de IA.
Define as estruturas de entrada e saída dos endpoints de inteligência artificial.
"""
from typing import Optional, List, Dict, Any
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


# =============================================================================
# Schemas do Agent Growth (widget de chat com IA)
# =============================================================================


class AgentActionId(str, Enum):
    """IDs das ações disponíveis no widget Agent Growth"""
    # Contexto de card — ações sobre um negócio específico
    SUMMARIZE_CARD = "summarize_card"
    EMAIL_FOLLOWUP = "email_followup"
    EMAIL_PROPOSAL = "email_proposal"
    SUGGEST_NEXT_STEPS = "suggest_next_steps"
    OBJECTION_HANDLING = "objection_handling"
    # Contexto de board — análises do pipeline como um todo
    ANALYZE_PIPELINE = "analyze_pipeline"
    QUICK_WIN_TODAY = "quick_win_today"
    COLD_CALL_TIPS = "cold_call_tips"
    # Contexto geral — dicas independentes de contexto
    PRODUCTIVITY_TIPS = "productivity_tips"
    # Rotina pessoal — disponível em todos os contextos
    MY_DAY_TASKS = "my_day_tasks"
    HOW_WAS_MY_DAY = "how_was_my_day"


class AgentPageContext(str, Enum):
    """Contexto da página onde o Agent Growth está sendo usado"""
    CARD_DETAIL = "card_detail"   # Página de detalhes de um card
    BOARD = "board"               # Página de um board Kanban
    CLIENTS = "clients"           # Página de clientes
    GENERAL = "general"           # Qualquer outra página


class AgentChatRequest(BaseModel):
    """Requisição de interação com o Agent Growth"""
    action_id: AgentActionId = Field(
        ...,
        description="ID da ação selecionada pelo usuário via chip"
    )
    card_id: Optional[int] = Field(
        None,
        description="ID do card atual (obrigatório para ações de contexto card_detail)"
    )
    page_context: AgentPageContext = Field(
        AgentPageContext.GENERAL,
        description="Contexto da página para personalizar a resposta"
    )
    extra_params: Optional[Dict[str, Any]] = Field(
        None,
        description="Parâmetros extras como board_id para análises de pipeline"
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "action_id": "suggest_next_steps",
                "card_id": 42,
                "page_context": "card_detail",
                "extra_params": None
            }
        }
    }


class AgentChatResponse(BaseModel):
    """Resposta do Agent Growth após processar uma ação"""
    message: str = Field(..., description="Texto de resposta gerado pelo LLM")
    action_id: str = Field(..., description="ID da ação que originou esta resposta")
    suggestions: List[str] = Field(
        ...,
        description="Lista de action_ids sugeridos como próximos chips a exibir"
    )
    rate_limit_remaining_day: int = Field(
        ...,
        description="Chamadas restantes hoje para este usuário"
    )
    tokens_used: int = Field(..., description="Total de tokens consumidos na chamada")

    model_config = {
        "json_schema_extra": {
            "example": {
                "message": "Com base nas notas do card, sugiro como próximos passos: 1) Enviar proposta revisada com desconto de 10% até sexta...",
                "action_id": "suggest_next_steps",
                "suggestions": ["email_followup", "objection_handling", "email_proposal"],
                "rate_limit_remaining_day": 75,
                "tokens_used": 420
            }
        }
    }


class AgentRateLimitStatus(BaseModel):
    """Status atual do rate limit do Agent Growth para o usuário autenticado"""
    remaining_hour: int = Field(..., description="Chamadas restantes na hora atual")
    remaining_day: int = Field(..., description="Chamadas restantes no dia atual")
    limit_hour: int = Field(..., description="Limite máximo de chamadas por hora")
    limit_day: int = Field(..., description="Limite máximo de chamadas por dia")
    is_limited: bool = Field(..., description="True se o usuário está com rate limit ativo")

    model_config = {
        "json_schema_extra": {
            "example": {
                "remaining_hour": 18,
                "remaining_day": 74,
                "limit_hour": 20,
                "limit_day": 80,
                "is_limited": False
            }
        }
    }
