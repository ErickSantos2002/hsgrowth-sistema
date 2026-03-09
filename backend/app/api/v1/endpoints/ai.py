"""
Endpoints do módulo de IA (Inteligência Artificial).
Fornece funcionalidades baseadas em LLM para auxiliar os vendedores no CRM.
"""
from typing import Any

from fastapi import APIRouter, Depends, Path, Body
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user
from app.models.user import User
from app.schemas.ai import (
    AIHealthResponse,
    AICardSummaryResponse,
    AITextGenerateRequest,
    AITextGenerateResponse,
)
from app.services.ai_service import AIService

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
