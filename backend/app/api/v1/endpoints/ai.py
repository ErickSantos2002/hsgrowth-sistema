"""
Endpoints do módulo de IA (Inteligência Artificial).
Fornece funcionalidades baseadas em LLM para auxiliar os vendedores no CRM.
"""
from typing import Any

from fastapi import APIRouter, Depends, Path, Body, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user
from app.models.user import User
from app.schemas.ai import (
    AIHealthResponse,
    AICardSummaryResponse,
    AITextGenerateRequest,
    AITextGenerateResponse,
    AgentChatRequest,
    AgentChatResponse,
    AgentRateLimitStatus,
)
from app.services.ai_service import AIService
from app.core.ai_rate_limiter import AIRateLimiter
from app.core.config import settings

router = APIRouter()


@router.get(
    "/health",
    response_model=AIHealthResponse,
    summary="Verificar conexão com OpenAI",
    description="""
Testa se a integração com a API da OpenAI está funcionando corretamente.

Útil para verificar se a **API key está configurada e válida** antes de usar
as funcionalidades de IA. Faz uma chamada mínima (1 token) para confirmar a conexão.
""",
    responses={
        200: {
            "description": "Status da conexão com a OpenAI",
            "content": {
                "application/json": {
                    "example": {
                        "status": "ok",
                        "model": "gpt-4o-mini",
                        "message": "Conexão com OpenAI funcionando corretamente."
                    }
                }
            }
        }
    }
)
async def check_ai_health(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """Verifica se a conexão com a OpenAI está ativa e a API key é válida."""
    service = AIService(db)
    return await service.check_connection()


@router.post(
    "/cards/{card_id}/summarize",
    response_model=AICardSummaryResponse,
    summary="Resumir card com IA",
    description="""
Gera um **resumo executivo** de um card com base nas suas notas e dados cadastrais.

O LLM analisa as últimas anotações do card, o status atual, responsável e informações
do cliente para produzir um parágrafo objetivo com:
- Situação atual do negócio
- Última interação relevante
- Ponto de atenção identificado
- Sugestão de próximo passo

Ideal para vendedores retomarem o contexto de um negócio rapidamente.
""",
    responses={
        200: {
            "description": "Resumo gerado com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "card_id": 42,
                        "card_title": "Empresa XYZ - Proposta Enterprise",
                        "summary": "Negociação em andamento há 3 semanas. Cliente solicitou desconto de 15% e aguarda resposta da gerência. Atenção: prazo de validade da proposta vence em 2 dias. Recomenda-se entrar em contato hoje para fechar o negócio.",
                        "model_used": "gpt-4o-mini",
                        "tokens_used": 620
                    }
                }
            }
        },
        404: {"description": "Card não encontrado"}
    }
)
async def summarize_card(
    card_id: int = Path(..., ge=1, description="ID do card a ser resumido"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """Gera um resumo executivo de um card usando IA."""
    service = AIService(db)
    return await service.summarize_card(card_id)


@router.post(
    "/generate-text",
    response_model=AITextGenerateResponse,
    summary="Gerar texto com IA",
    description="""
Gera textos personalizados para auxiliar na comunicação com clientes.

### Tipos disponíveis:
- **email_followup** — E-mail de follow-up para retomar contato
- **email_proposal** — E-mail de encaminhamento de proposta comercial
- **email_custom** — E-mail com instrução completamente livre
- **card_summary** — Resumo narrativo do negócio

### Contexto automático:
Se você fornecer um `card_id`, o sistema busca automaticamente os dados do card
(cliente, contato, notas, etapa do funil) para personalizar o texto gerado.

Você ainda pode complementar com `extra_context` para dar instruções específicas
ao LLM (ex: "mencionar que a proposta tem validade até sexta-feira").
""",
    responses={
        200: {
            "description": "Texto gerado com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "generated_text": "Assunto: Retomando nossa conversa - Proposta Empresa XYZ\n\nOlá Carlos,\n\nEspero que esteja bem! Gostaria de retomar nossa conversa sobre a proposta que enviamos...",
                        "generate_type": "email_followup",
                        "model_used": "gpt-4o-mini",
                        "tokens_used": 480
                    }
                }
            }
        },
        404: {"description": "Card não encontrado (se card_id foi fornecido)"}
    }
)
async def generate_text(
    request_data: AITextGenerateRequest = Body(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """Gera um texto personalizado (e-mail, resumo, etc.) usando IA."""
    service = AIService(db)
    return await service.generate_text(
        generate_type=request_data.generate_type,
        card_id=request_data.card_id,
        client_name=request_data.client_name,
        person_name=request_data.person_name,
        extra_context=request_data.extra_context
    )


@router.post(
    "/agent/chat",
    response_model=AgentChatResponse,
    summary="Interagir com o Agent Growth",
    description="""
Processa uma ação selecionada pelo usuário no widget **Agent Growth** e retorna
uma resposta gerada pelo LLM junto com sugestões de próximos chips.

### Rate Limiting
Cada usuário tem limite de **20 chamadas por hora** e **80 por dia**.
Exceder o limite retorna `HTTP 429` com mensagem explicativa.

### Ações disponíveis por contexto:
**Card Detail:** `summarize_card`, `email_followup`, `email_proposal`, `suggest_next_steps`, `objection_handling`

**Board:** `analyze_pipeline`, `quick_win_today`, `cold_call_tips`

**Geral:** `productivity_tips`
""",
    responses={
        200: {
            "description": "Resposta gerada com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "message": "Próximos passos recomendados: 1) Enviar proposta revisada até sexta...",
                        "action_id": "suggest_next_steps",
                        "suggestions": ["email_followup", "objection_handling", "email_proposal"],
                        "rate_limit_remaining_day": 75,
                        "tokens_used": 420
                    }
                }
            }
        },
        429: {"description": "Rate limit excedido — aguarde para fazer novas chamadas"},
        404: {"description": "Card não encontrado (se card_id foi fornecido)"},
    }
)
async def agent_chat(
    request_data: AgentChatRequest = Body(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """Processa uma ação do Agent Growth e retorna resposta do LLM."""
    rate_limiter = AIRateLimiter()
    result = await rate_limiter.check_and_increment(current_user.id)

    if not result.allowed:
        raise HTTPException(
            status_code=429,
            detail=(
                f"Limite de chamadas ao Agent Growth atingido. "
                f"Você usou todas as {settings.AI_RATE_LIMIT_PER_HOUR} chamadas desta hora "
                f"ou as {settings.AI_RATE_LIMIT_PER_DAY} do dia. "
                f"Restam {result.remaining_day} chamadas hoje."
            )
        )

    service = AIService(db)
    response = await service.agent_chat(
        action_id=request_data.action_id,
        card_id=request_data.card_id,
        page_context=request_data.page_context,
        extra_params=request_data.extra_params,
        user_id=current_user.id,
        # current_user.role é um relacionamento — extrai o nome da role como string
        user_role=current_user.role.name if current_user.role else "salesperson",
        user_name=current_user.name or "",
    )

    return AgentChatResponse(
        message=response["message"],
        action_id=request_data.action_id.value,
        suggestions=response["suggestions"],
        rate_limit_remaining_day=result.remaining_day,
        tokens_used=response["tokens_used"],
    )


@router.get(
    "/agent/rate-limit-status",
    response_model=AgentRateLimitStatus,
    summary="Consultar rate limit do Agent Growth",
    description="""
Retorna o status atual do rate limit para o usuário autenticado **sem incrementar os contadores**.

Use este endpoint para exibir ao usuário quantas chamadas ele ainda tem disponíveis
no widget Agent Growth antes de fazer uma nova requisição.
""",
    responses={
        200: {
            "description": "Status do rate limit retornado com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "remaining_hour": 18,
                        "remaining_day": 74,
                        "limit_hour": 20,
                        "limit_day": 80,
                        "is_limited": False
                    }
                }
            }
        }
    }
)
async def get_agent_rate_limit_status(
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Retorna o status do rate limit do Agent Growth para o usuário autenticado."""
    rate_limiter = AIRateLimiter()
    result = await rate_limiter.get_status(current_user.id)

    return AgentRateLimitStatus(
        remaining_hour=result.remaining_hour,
        remaining_day=result.remaining_day,
        limit_hour=settings.AI_RATE_LIMIT_PER_HOUR,
        limit_day=settings.AI_RATE_LIMIT_PER_DAY,
        is_limited=not result.allowed,
    )
