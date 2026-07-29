"""
Cliente outbound que avisa o GestorHS quando um card de Serviços vira "Ganho".

Chama o endpoint inbound do GestorHS para mover a caixa de Pós-Vendas (fase 6)
para Financeiro (fase 10). Ver docs/integracao-growthhs-inbound.md (contrato) e
docs/superpowers/specs/2026-07-29-fase2-ganho-move-caixa-gestorhs-design.md.

Best-effort e gating por env, no mesmo padrão do webhook de Vendas
(_send_automacao01_webhook): se as envs estiverem vazias, é no-op. Erros HTTP/rede
são propagados — quem trata o retry é a task Celery que chama este cliente.
"""
import logging
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


def integracao_ativa() -> bool:
    return bool(settings.GESTORHS_INBOUND_URL and settings.GESTORHS_INBOUND_API_KEY)


def mover_caixa_ganho(caixa_id: str, numero_proposta: Optional[int], observacao: str) -> None:
    """Move a caixa do GestorHS de Pós-Vendas para Financeiro.

    `caixa_id` é o `external_id` cru do card (o `caixa.id` do GestorHS).
    `numero_proposta` só entra no corpo quando não-nulo (é opcional no contrato).
    Não faz retry — o chamador (task Celery) trata falha.
    """
    if not integracao_ativa():
        logger.info("integração GestorHS desligada (envs vazias) — no-op para caixa %s", caixa_id)
        return

    url = f"{settings.GESTORHS_INBOUND_URL.rstrip('/')}/integracao/growthhs/caixas/{caixa_id}/ganho"
    body: dict = {"observacao": observacao}
    if numero_proposta is not None:
        body["numero_proposta"] = numero_proposta

    resp = httpx.post(
        url,
        json=body,
        headers={"X-API-Key": settings.GESTORHS_INBOUND_API_KEY},
        timeout=10,
    )
    if resp.status_code >= 400:
        resp.raise_for_status()
