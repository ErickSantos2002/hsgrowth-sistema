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
#
# Cada rota declara os PAPÉIS que a alcançam pelo agente. É a mesma regra das rotas
# (require_not_viewer, require_service_access, a tranca dos perfis do Programa de
# Parceiros) e mais uma, só do agente: Vendas é de quem vende, Serviços de quem
# atende — o Guardi do papel "service" não entra em Vendas, como a tela não deixa.
# Onde a regra depende do dado (agente só escreve em card do dono), a rota entra se
# o papel permite em algum caso; o detalhe é conferido na hora. A tabela é aplicada
# em deps._usuario_do_agente e responde GET /agente/capacidades; o teste
# tests/unit/test_capacidades_agente.py a confere contra as rotas, papel a papel.
QUALQUER_PAPEL = frozenset({
    "admin", "manager", "salesperson", "sdr", "service", "viewer",
    "finance", "partner", "partner_member", "hunter",
})
VENDAS_LER = frozenset({"admin", "manager", "salesperson", "sdr", "viewer"})
VENDAS_ESCREVER = VENDAS_LER - {"viewer"}
# Cliente, contato e a busca geral (Ctrl+K) também servem a Serviços.
CADASTRO_LER = VENDAS_LER | {"service"}
SERVICOS = frozenset({"admin", "manager", "service"})

_SB = "/service-boards/{board_id}/cards/{card_id}"
PAPEIS_AGENTE = {
    ("GET", "/users/me"): QUALQUER_PAPEL,
    ("GET", "/agente/capacidades"): QUALQUER_PAPEL,
    # --- Vendas: leitura -------------------------------------------------------
    ("GET", "/boards"): VENDAS_LER,
    ("GET", "/boards/{board_id}/lists"): VENDAS_LER,
    ("GET", "/cards"): VENDAS_LER,
    ("GET", "/cards/{card_id}/expanded"): VENDAS_LER,
    ("GET", "/cards/{card_id}/aviso-parcerias"): VENDAS_LER,
    ("GET", "/card-notes/card/{card_id}"): VENDAS_LER,
    ("GET", "/card-tasks"): VENDAS_LER,
    ("GET", "/card-tasks/overdue"): VENDAS_LER,
    ("GET", "/fields/definitions/board/{board_id}"): VENDAS_LER,
    ("GET", "/search/global"): CADASTRO_LER,
    ("GET", "/clients"): CADASTRO_LER,
    ("GET", "/clients/{client_id}"): CADASTRO_LER,
    ("GET", "/clients/cnpj/{cnpj}"): CADASTRO_LER,
    ("GET", "/persons"): CADASTRO_LER,
    # --- Vendas: escrita (sempre depois do cartão confirmado no HS.OS) ---------
    ("POST", "/cards"): VENDAS_ESCREVER,
    ("PUT", "/cards/{card_id}"): VENDAS_ESCREVER,
    ("PUT", "/cards/{card_id}/move"): VENDAS_ESCREVER,
    ("POST", "/cards/{card_id}/win"): VENDAS_ESCREVER,
    ("POST", "/cards/{card_id}/lose"): VENDAS_ESCREVER,
    ("POST", "/cards/{card_id}/fields"): VENDAS_ESCREVER,
    ("POST", "/cards/{card_id}/person"): VENDAS_ESCREVER,
    ("POST", "/card-notes"): VENDAS_ESCREVER,
    ("POST", "/card-tasks"): VENDAS_ESCREVER,
    ("PUT", "/card-tasks/{task_id}"): VENDAS_ESCREVER,
    ("PATCH", "/card-tasks/{task_id}/complete"): VENDAS_ESCREVER,
    ("PATCH", "/card-tasks/{task_id}/noshow"): VENDAS_ESCREVER,
    ("POST", "/clients"): VENDAS_ESCREVER,
    ("PUT", "/clients/{client_id}"): VENDAS_ESCREVER,
    ("POST", "/persons"): VENDAS_ESCREVER,
    ("PUT", "/persons/{person_id}"): VENDAS_ESCREVER,
    # --- Serviços: leitura -----------------------------------------------------
    ("GET", "/service-boards"): SERVICOS,
    ("GET", "/service-boards/{board_id}"): SERVICOS,
    ("GET", "/service-boards/{board_id}/lists"): SERVICOS,
    ("GET", "/service-boards/{board_id}/cards"): SERVICOS,
    ("GET", _SB): SERVICOS,
    ("GET", _SB + "/products"): SERVICOS,
    ("GET", _SB + "/services"): SERVICOS,
    ("GET", _SB + "/activities"): SERVICOS,
    ("GET", "/service-activities"): SERVICOS,
    ("GET", "/service-products"): SERVICOS,
    ("GET", "/services"): SERVICOS,
    ("GET", "/service-dashboard"): SERVICOS,
    # --- Serviços: escrita -----------------------------------------------------
    ("PUT", _SB): SERVICOS,
    ("PUT", _SB + "/move"): SERVICOS,
    ("POST", _SB + "/activities"): SERVICOS,
    ("PUT", _SB + "/activities/{activity_id}"): SERVICOS,
    ("PATCH", _SB + "/activities/{activity_id}/complete"): SERVICOS,
    ("POST", _SB + "/activities/files"): SERVICOS,
    ("POST", _SB + "/products"): SERVICOS,
    ("PUT", _SB + "/products/{item_id}"): SERVICOS,
    ("DELETE", _SB + "/products/{item_id}"): SERVICOS,
    ("POST", _SB + "/services"): SERVICOS,
    ("PUT", _SB + "/services/{item_id}"): SERVICOS,
    ("DELETE", _SB + "/services/{item_id}"): SERVICOS,
}
ROTAS_AGENTE = frozenset(PAPEIS_AGENTE)


def _compilar(template: str) -> "re.Pattern[str]":
    partes = re.split(r"(\{[^}]+\})", template)
    corpo = "".join(r"\d+" if p.startswith("{") else re.escape(p) for p in partes)
    return re.compile("^" + corpo.rstrip("/") + "/?$")


_ROTAS_COMPILADAS = tuple((metodo, t, _compilar(t)) for metodo, t in sorted(ROTAS_AGENTE))


def rota_do_agente(metodo: str, caminho: str) -> Optional[Tuple[str, str]]:
    """O par (método, template) da allowlist que casa o caminho REAL, ou None. Não
    usa scope["route"].path: ele muda entre versões do FastAPI (com/sem prefixo)."""
    if caminho.startswith(PREFIXO_API + "/"):
        caminho = caminho[len(PREFIXO_API):]
    metodo = metodo.upper()
    for m, template, padrao in _ROTAS_COMPILADAS:
        if m == metodo and padrao.match(caminho):
            return m, template
    return None


def agente_pode(metodo: str, caminho: str) -> bool:
    """O caminho está na allowlist (sem olhar o papel)."""
    return rota_do_agente(metodo, caminho) is not None


def papel_alcanca(rota: Tuple[str, str], papel: Optional[str]) -> bool:
    return papel in PAPEIS_AGENTE.get(rota, frozenset())


def rotas_do_papel(papel: Optional[str]) -> list:
    """GET /agente/capacidades: os pares [método, template] que o papel alcança."""
    return [[m, t] for m, t in sorted(ROTAS_AGENTE, key=lambda r: (r[1], r[0])) if papel_alcanca((m, t), papel)]


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
