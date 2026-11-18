"""
Cliente outbound do CRM para o GestorHS (Serviços).

Duas chamadas:
- `mover_caixa_ganho`: avisa que um card virou "Ganho" e move a caixa de Pós-Vendas
  (fase 6) para Financeiro (fase 10). Best-effort, em background.
- `trocar_proposta`: pede ao GestorHS que troque o número da proposta da caixa. É
  síncrona — o CRM só salva o card se o GestorHS aceitar.
 Ver docs/integracao-growthhs-inbound.md (contrato) e
docs/superpowers/specs/2026-07-29-fase2-ganho-move-caixa-gestorhs-design.md.

Gating por env, no mesmo padrão do webhook de Vendas (_send_automacao01_webhook):
se as envs estiverem vazias, é no-op. Em `mover_caixa_ganho` erros HTTP/rede são
propagados — quem trata o retry é `enviar_ganho_gestorhs`, chamado via
BackgroundTasks da API (não há worker Celery em produção). `trocar_proposta` traduz
os erros em `GestorHSRecusou` (4xx) e `GestorHSIndisponivel` (5xx/rede/timeout).
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
    Não faz retry — quem retenta é `enviar_ganho_gestorhs` (service_board_service),
    que roda em background no processo da API.
    """
    if not integracao_ativa():
        # WARNING, não INFO: com as envs vazias o Ganho é engolido em silêncio e a
        # caixa fica parada em Pós-Vendas sem ninguém perceber. Tem que aparecer.
        logger.warning(
            "integração GestorHS DESLIGADA (GESTORHS_INBOUND_URL/API_KEY vazias) — "
            "Ganho da caixa %s NAO foi enviado", caixa_id,
        )
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
    resp.raise_for_status()


class GestorHSRecusou(Exception):
    """O GestorHS respondeu 4xx: o número da proposta não foi aceito."""

    def __init__(self, detail: str):
        super().__init__(detail)
        self.detail = detail


class GestorHSIndisponivel(Exception):
    """O GestorHS não respondeu de forma utilizável (5xx, timeout ou erro de rede)."""


def trocar_proposta(caixa_id: str, numero: int, observacao: str) -> bool:
    """Pede ao GestorHS que troque o número da proposta da caixa.

    Retorna True se enviou e o GestorHS aceitou; False se a integração está
    desligada (no-op com warning). Levanta `GestorHSRecusou` em 4xx (com o
    `detail` do GestorHS quando houver) e `GestorHSIndisponivel` em 5xx,
    timeout ou erro de rede.
    """
    if not integracao_ativa():
        logger.warning(
            "integração GestorHS DESLIGADA (GESTORHS_INBOUND_URL/API_KEY vazias) — "
            "troca da proposta da caixa %s NAO foi enviada", caixa_id,
        )
        return False

    url = f"{settings.GESTORHS_INBOUND_URL.rstrip('/')}/integracao/growthhs/caixas/{caixa_id}/proposta"
    try:
        resp = httpx.put(
            url,
            json={"numero": numero, "observacao": observacao},
            headers={"X-API-Key": settings.GESTORHS_INBOUND_API_KEY},
            timeout=10,
        )
    except httpx.HTTPError as exc:
        raise GestorHSIndisponivel(f"GestorHS indisponível: {exc}") from exc

    if 400 <= resp.status_code < 500:
        detail = None
        try:
            corpo = resp.json()
            if isinstance(corpo, dict):
                detail = corpo.get("detail")
        except ValueError:
            pass
        if not isinstance(detail, str) or not detail:
            detail = f"O GestorHS recusou o número da proposta (HTTP {resp.status_code})."
        raise GestorHSRecusou(detail)
    if resp.status_code >= 500:
        raise GestorHSIndisponivel(f"GestorHS respondeu HTTP {resp.status_code}")
    return True
