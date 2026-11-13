"""Token de agente do HS.OS (JWT EdDSA): o Guardi age no HSGrowth como o dono.

Sem config e sem banco: quem chama passa a chave e o caminho. Mesmo desenho do
GestorHS (app/core/agente.py de lá). Specs no repo HS.OS:
docs/superpowers/specs/2026-11-12-guardi-hsgrowth-vendas-design.md e
docs/superpowers/specs/2026-11-12-guardi-hsgrowth-servicos-design.md.
"""
import re
import time
from contextvars import ContextVar
from typing import Optional, Tuple

import jwt
from sqlalchemy import event

# O HS.OS emite tokens de 5 min; a folga cobre diferença de relógio.
VIDA_MAXIMA_SEGUNDOS = 600

PREFIXO_API = "/api/v1"

# Allowlist, não lista negra: rota nova nasce FORA. Rota nova só chega ao Guardi
# entrando nos DOIS catálogos: aqui e no HS.OS. Templates sem o prefixo /api/v1,
# exatamente como nos routers; todo parâmetro é casado como \d+ (ids, e o CNPJ que
# o HS.OS manda em dígitos), o que também impede /cards/{id} de casar /cards/import.
_SB = "/service-boards/{board_id}/cards/{card_id}"
ROTAS_AGENTE = frozenset({
    # --- Vendas: leitura -------------------------------------------------------
    ("GET", "/users/me"),
    ("GET", "/boards"),
    ("GET", "/boards/{board_id}/lists"),
    ("GET", "/cards"),
    ("GET", "/cards/{card_id}/expanded"),
    ("GET", "/cards/{card_id}/aviso-parcerias"),
    ("GET", "/search/global"),
    ("GET", "/card-notes/card/{card_id}"),
    ("GET", "/card-tasks"),
    ("GET", "/card-tasks/overdue"),
    ("GET", "/fields/definitions/board/{board_id}"),
    ("GET", "/clients"),
    ("GET", "/clients/{client_id}"),
    ("GET", "/clients/cnpj/{cnpj}"),
    ("GET", "/persons"),
    # --- Vendas: escrita (sempre depois do cartão confirmado no HS.OS) ---------
    ("POST", "/cards"),
    ("PUT", "/cards/{card_id}"),
    ("PUT", "/cards/{card_id}/move"),
    ("POST", "/cards/{card_id}/win"),
    ("POST", "/cards/{card_id}/lose"),
    ("POST", "/cards/{card_id}/fields"),
    ("POST", "/cards/{card_id}/person"),
    ("POST", "/card-notes"),
    ("POST", "/card-tasks"),
    ("PUT", "/card-tasks/{task_id}"),
    ("PATCH", "/card-tasks/{task_id}/complete"),
    ("PATCH", "/card-tasks/{task_id}/noshow"),
    ("POST", "/clients"),
    ("PUT", "/clients/{client_id}"),
    ("POST", "/persons"),
    ("PUT", "/persons/{person_id}"),
    # --- Serviços: leitura -----------------------------------------------------
    ("GET", "/service-boards"),
    ("GET", "/service-boards/{board_id}"),
    ("GET", "/service-boards/{board_id}/lists"),
    ("GET", "/service-boards/{board_id}/cards"),
    ("GET", _SB),
    ("GET", _SB + "/products"),
    ("GET", _SB + "/services"),
    ("GET", _SB + "/activities"),
    ("GET", "/service-activities"),
    ("GET", "/service-products"),
    ("GET", "/services"),
    ("GET", "/service-dashboard"),
    # --- Serviços: escrita -----------------------------------------------------
    ("PUT", _SB),
    ("PUT", _SB + "/move"),
    ("POST", _SB + "/activities"),
    ("PUT", _SB + "/activities/{activity_id}"),
    ("PATCH", _SB + "/activities/{activity_id}/complete"),
    ("POST", _SB + "/activities/files"),
    ("POST", _SB + "/products"),
    ("PUT", _SB + "/products/{item_id}"),
    ("DELETE", _SB + "/products/{item_id}"),
    ("POST", _SB + "/services"),
    ("PUT", _SB + "/services/{item_id}"),
    ("DELETE", _SB + "/services/{item_id}"),
})


def _compilar(template: str) -> "re.Pattern[str]":
    partes = re.split(r"(\{[^}]+\})", template)
    corpo = "".join(r"\d+" if p.startswith("{") else re.escape(p) for p in partes)
    return re.compile("^" + corpo.rstrip("/") + "/?$")


_ROTAS_COMPILADAS = tuple((metodo, _compilar(t)) for metodo, t in ROTAS_AGENTE)


def agente_pode(metodo: str, caminho: str) -> bool:
    """Casa o caminho REAL (request.url.path) contra a allowlist. Não usa
    scope["route"].path: ele muda entre versões do FastAPI (com/sem prefixo)."""
    if caminho.startswith(PREFIXO_API + "/"):
        caminho = caminho[len(PREFIXO_API):]
    metodo = metodo.upper()
    return any(m == metodo and padrao.match(caminho) for m, padrao in _ROTAS_COMPILADAS)


class TokenDeAgenteInvalido(Exception):
    pass


def eh_token_de_agente(token: str) -> bool:
    """Olha o payload SEM verificar: só decide o caminho (agente ou login normal)."""
    try:
        payload = jwt.decode(token, options={"verify_signature": False})
    except Exception:
        return False
    return isinstance(payload, dict) and payload.get("iss") == "hsos"


def validar_token_de_agente(token: str, chave_pem: str) -> Tuple[str, str]:
    """-> (email, bot). Qualquer falha lança TokenDeAgenteInvalido."""
    chave = (chave_pem or "").replace("\\n", "\n").strip()
    if not chave:
        raise TokenDeAgenteInvalido("chave pública não configurada")
    try:
        payload = jwt.decode(
            token,
            chave,
            algorithms=["EdDSA"],
            audience="hsgrowth",
            issuer="hsos",
            options={"require": ["exp", "sub", "iss", "aud"]},
        )
    except (jwt.PyJWTError, ValueError, TypeError) as exc:
        raise TokenDeAgenteInvalido(str(exc)) from exc
    if payload["exp"] - time.time() > VIDA_MAXIMA_SEGUNDOS:
        raise TokenDeAgenteInvalido("exp longe demais")
    email = payload.get("sub")
    act = payload.get("act")
    bot = act.get("sub") if isinstance(act, dict) else None
    if not isinstance(email, str) or not email or not isinstance(bot, str) or not bot:
        raise TokenDeAgenteInvalido("sub ou act.sub ausente")
    return email, bot


# --- "via <bot>" no histórico ------------------------------------------------
# get_current_user (async) seta (user_id, bot) no request do agente e zera no login
# normal. Os listeners abaixo acrescentam " (via <bot>)" na description das linhas de
# histórico inseridas no request cujo user_id é o do dono do token — linhas de outro
# autor (automação, sistema) ficam como estão. Não há choke point para AuditLog
# (dezenas de construções diretas), por isso o before_insert.
TEXTOS_SEM_MARCA = ("Motivo da perda:",)

agente_atual: ContextVar[Optional[Tuple[int, str]]] = ContextVar("agente_atual", default=None)


def _marcar_via_agente(mapper, connection, target) -> None:
    atual = agente_atual.get()
    if not atual:
        return
    user_id, bot = atual
    if getattr(target, "user_id", None) != user_id:
        return
    marca = f"via {bot}"
    descricao = getattr(target, "description", None) or ""
    if marca in descricao:
        return
    # Texto que outro código LÊ como dado não ganha a marca: o motivo de perda de
    # Serviços ("Motivo da perda: X") alimenta o filtro do kanban e o dashboard.
    # A marca vai para o activity_metadata.
    if descricao.startswith(TEXTOS_SEM_MARCA):
        if hasattr(target, "activity_metadata"):
            target.activity_metadata = {**(target.activity_metadata or {}), "via_agente": bot}
        return
    target.description = f"{descricao} ({marca})" if descricao else marca


def registrar_marcacao_via_agente(*modelos) -> None:
    """Chamado em app/models/__init__.py (sempre importado) com Activity, AuditLog e
    ServiceCardActivity. Idempotente."""
    for modelo in modelos:
        if not event.contains(modelo, "before_insert", _marcar_via_agente):
            event.listen(modelo, "before_insert", _marcar_via_agente)
