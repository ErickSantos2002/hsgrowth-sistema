"""
Dependencies do FastAPI.
Funções reutilizáveis como dependencies em rotas.
"""
import calendar
import ipaddress
import logging
from datetime import datetime, timezone
from typing import Generator, Optional
from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session, joinedload

from app.db.session import SessionLocal
from app.core.security import decode_token, verify_token_type, hash_api_key
from app.core.config import settings
from app.core.agente import (
    TokenDeAgenteInvalido,
    agente_atual,
    papel_alcanca,
    rota_do_agente,
    eh_token_de_agente,
    validar_token_de_agente,
)
from app.core.redis_sessions import session_manager
from app.models.user import User
from app.models.role import Role
from app.models.integration_client import IntegrationClient

# Security scheme para JWT (Bearer token)
# auto_error=False para permitir tratamento manual e retornar 401 ao invés de 403
security = HTTPBearer(auto_error=False)

# Perfis presos ao Programa de Parceiros. Para eles o CRM é negado por padrão:
# só os caminhos abaixo respondem. Rota nova fica trancada sozinha.
PERFIS_TRANCADOS = ("partner", "partner_member", "hunter", "finance")
# Com a troca de senha pendente só respondem estes caminhos (comparação exata) e o link de senha.
CAMINHOS_COM_SENHA_PENDENTE = (
    "/api/v1/users/me",
    "/api/v1/users/me/change-password",
    "/api/v1/auth/login",
    "/api/v1/auth/logout",
    "/api/v1/auth/refresh",
    "/api/v1/auth/definir-senha",
    "/api/v1/auth/forgot-password",
    "/api/v1/auth/reset-password",
)
PREFIXOS_COM_SENHA_PENDENTE = ("/api/v1/auth/token/",)

# Com termos do Programa pendentes, dono e hunter só alcançam isto.
PREFIXOS_COM_TERMOS_PENDENTES = ("/api/v1/auth/", "/api/v1/users/me", "/api/v1/parcerias/termos")


def _caminho_liberado_com_termos_pendentes(caminho: str) -> bool:
    return any(
        caminho == p or caminho.startswith(p if p.endswith("/") else p + "/")
        for p in PREFIXOS_COM_TERMOS_PENDENTES
    )


def ip_do_cliente(request: Request) -> str:
    """IP do cliente. Há um proxy confiável (Traefik) que acrescenta o IP real À DIREITA de
    X-Forwarded-For; o que vem à esquerda o cliente pode forjar, então só vale o ÚLTIMO
    valor (e só se for um IP). Sem ele, o IP da conexão; X-Real-IP não conta."""
    ultimo = request.headers.get("X-Forwarded-For", "").split(",")[-1].strip()
    for candidato in (ultimo, request.client.host if request.client else ""):
        if not candidato:
            continue
        try:
            ipaddress.ip_address(candidato)
        except ValueError:
            continue
        return candidato[:64]
    return "unknown"

CAMINHOS_DOS_TRANCADOS = (
    "/api/v1/auth/",
    "/api/v1/users/me",
    "/api/v1/notifications",
    "/api/v1/parcerias",
)


def caminho_liberado_para_trancado(path: str) -> bool:
    return path.startswith(CAMINHOS_DOS_TRANCADOS)


def get_db() -> Generator[Session, None, None]:
    """
    Dependency para obter sessão do banco de dados.
    Cria uma sessão por request e fecha automaticamente no final.

    Yields:
        Session do SQLAlchemy
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def token_anterior_a_senha(payload: dict, user: User) -> bool:
    """True se o token foi emitido antes da última troca/definição de senha (sessão antiga)."""
    trocada_em = getattr(user, "password_changed_at", None)
    iat = payload.get("iat")
    if not trocada_em or iat is None:
        return False
    return int(iat) < calendar.timegm(trocada_em.utctimetuple())


logger = logging.getLogger(__name__)

# Mesma mensagem para toda recusa do token de agente: não diz o que falhou.
_MSG_AGENTE_401 = "Token inválido ou expirado"
MSG_AGENTE_403 = "Ação não permitida para o agente"
MSG_AGENTE_PAPEL_403 = "Ação não permitida para o seu papel pelo agente"


def _usuario_do_agente(request: Request, token: str, db: Session) -> User:
    """Token de agente do HS.OS (o Guardi agindo como o dono). Só nas rotas de
    ROTAS_AGENTE (allowlist em core/agente.py). Sem blacklist/sessão do Redis e sem
    password_changed_at: não há sessão, o token vive 5 min. NÃO vira is_integracao
    (a trava de CNPJ de parceiro vale)."""
    try:
        email, bot = validar_token_de_agente(token, settings.HSOS_AGENTE_CHAVE_PUBLICA)
    except TokenDeAgenteInvalido as exc:
        logger.warning("token de agente recusado: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=_MSG_AGENTE_401,
            headers={"WWW-Authenticate": "Bearer"},
        )
    # E-mail EXATO, sem normalizar: o sub é o e-mail que o HS.OS tem do dono.
    user = db.query(User).options(joinedload(User.role)).filter(
        User.email == email,
        User.is_deleted == False,  # noqa: E712
    ).first()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=_MSG_AGENTE_401,
            headers={"WWW-Authenticate": "Bearer"},
        )
    # O caminho que o ROTEADOR casou (scope["path"], já decodificado), não o
    # request.url.path remontado da URL: com %3F/%23 no caminho os dois divergem.
    caminho = request.scope.get("path", "")
    root_path = request.scope.get("root_path", "")
    if root_path and caminho.startswith(root_path):
        caminho = caminho[len(root_path):]
    rota = rota_do_agente(request.method, caminho)
    if rota is None:
        logger.warning("token de agente fora da allowlist: %s %s via %s", request.method, caminho, bot)
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=MSG_AGENTE_403)
    # Papéis de cada rota (PAPEIS_AGENTE): a mesma tabela responde /agente/capacidades.
    papel = user.role.name if user.role else None
    if not papel_alcanca(rota, papel):
        logger.warning("token de agente fora do papel %s: %s %s via %s", papel, request.method, caminho, bot)
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=MSG_AGENTE_PAPEL_403)
    request.state.agente = bot
    # Atributo transitório: quem não tem o request à mão lê daqui. O caminho normal zera.
    user.via_agente = bot
    # "via <bot>" no histórico (listeners before_insert em core/agente.py).
    agente_atual.set((user.id, bot))
    logger.info("token de agente: %s via %s em %s %s", email, bot, request.method, caminho)
    return user


def via_agente(user: Optional[User]) -> Optional[str]:
    """O bot do HS.OS (act.sub) quando o usuário entrou por token de agente; senão None."""
    return getattr(user, "via_agente", None)


def eh_agente(request: Request) -> bool:
    """A requisição veio com token de agente do HS.OS (só depois de get_current_user)."""
    return getattr(request.state, "agente", None) is not None


# --- Vendas: o agente só escreve no que é do dono -------------------------------
# Valem também para admin/gerente via agente: o Guardi age como o vendedor, nunca
# com o alcance de gestão da pessoa. Usuário humano não passa por nenhuma delas.
MSG_AGENTE_CARD_DE_OUTRO = "O agente só escreve em card seu (vendedor ou SDR)"
MSG_AGENTE_CADASTRO_SEM_CARD = (
    "O agente só altera cliente ou contato ligado a um card aberto seu (vendedor ou SDR)"
)


def _eh_dono_do_card(card, user: User) -> bool:
    return user.id is not None and user.id in (card.assigned_to_id, card.sdr_id)


def exigir_card_do_dono_se_agente(db: Session, user: User, card_id: Optional[int]) -> None:
    """Token de agente: 403 se o card não for do dono (vendedor ou SDR). Sem agente,
    ou card inexistente (o fluxo normal dá o 404), não faz nada."""
    if via_agente(user) is None or card_id is None:
        return
    from app.models.card import Card
    card = db.query(Card).filter(Card.id == card_id).first()
    if card is None:
        return
    if not _eh_dono_do_card(card, user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=MSG_AGENTE_CARD_DE_OUTRO)


def exigir_card_aberto_do_dono_se_agente(
    db: Session,
    user: User,
    client_id: Optional[int] = None,
    person_id: Optional[int] = None,
) -> None:
    """Token de agente: cliente/contato só se ligado (Card.client_id / Card.person_id)
    a um card aberto (nem ganho nem perdido, não apagado) do dono; senão 403."""
    if via_agente(user) is None:
        return
    from sqlalchemy import or_
    from app.models.card import Card
    query = db.query(Card.id).filter(
        Card.is_won == 0,
        Card.is_deleted == False,  # noqa: E712
        or_(Card.assigned_to_id == user.id, Card.sdr_id == user.id),
    )
    if client_id is not None:
        query = query.filter(Card.client_id == client_id)
    elif person_id is not None:
        query = query.filter(Card.person_id == person_id)
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=MSG_AGENTE_CADASTRO_SEM_CARD)
    if query.first() is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=MSG_AGENTE_CADASTRO_SEM_CARD)


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency para obter o usuário autenticado a partir do JWT.
    Extrai o token do header Authorization, decodifica e busca o usuário no banco.

    Args:
        credentials: Credenciais HTTP Bearer (token JWT)
        db: Sessão do banco de dados

    Returns:
        Usuário autenticado

    Raises:
        HTTPException: Se o token for inválido ou o usuário não for encontrado
    """
    # Verifica se credentials foram fornecidas
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Não autenticado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Extrai o token
    token = credentials.credentials

    # Token de agente do HS.OS: caminho próprio, ANTES da blacklist e do decode HS256.
    if eh_token_de_agente(token):
        return _usuario_do_agente(request, token, db)
    agente_atual.set(None)

    # Verifica se o token está na blacklist do Redis (logout/revogação)
    # Graceful: se Redis estiver offline, não bloqueia (retorna False)
    if await session_manager.is_blacklisted(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token revogado. Faça login novamente.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Decodifica o token
    payload = decode_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verifica se é um access token ou integration token
    token_type = payload.get("type")
    if token_type not in ["access", "integration"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tipo de token inválido. Use um access token ou integration token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Extrai o subject do payload
    sub = payload.get("sub")
    if sub is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verifica se é um token de integração
    if sub.startswith("client:"):
        # Token de integração - busca o integration client
        client_id = payload.get("client_id")
        if not client_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token de integração inválido",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Busca o integration client
        integration_client = db.query(IntegrationClient).filter(
            IntegrationClient.client_id == client_id,
            IntegrationClient.is_active == True
        ).first()

        if not integration_client:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Integration client não encontrado ou inativo",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Se tiver impersonate_user_id, usa esse usuário
        if integration_client.impersonate_user_id:
            user = db.query(User).options(joinedload(User.role)).filter(
                User.id == integration_client.impersonate_user_id,
                User.is_deleted == False
            ).first()
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Usuário de impersonação não encontrado",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            user.via_agente = None
            return user
        else:
            # Sem impersonate_user_id - retorna erro
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Integration client sem usuário de impersonação configurado. Configure um impersonate_user_id.",
                headers={"WWW-Authenticate": "Bearer"},
            )
    else:
        # Token de usuário normal
        user_id: int = int(sub)

        # Busca o usuário no banco com eager loading do role
        user = db.query(User).options(joinedload(User.role)).filter(
            User.id == user_id,
            User.is_deleted == False
        ).first()
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuário não encontrado",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if token_anterior_a_senha(payload, user):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Sessão expirada. Entre novamente.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user.via_agente = None
        return user


async def get_current_active_user(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    """
    Dependency para obter usuário autenticado e ativo.
    Verifica se o usuário está com status is_active=True e aplica a tranca
    geral dos perfis do Programa de Parceiros (PERFIS_TRANCADOS).

    Args:
        request: Request atual (o caminho decide a tranca)
        current_user: Usuário autenticado (obtido de get_current_user)

    Returns:
        Usuário autenticado e ativo

    Raises:
        HTTPException: Se o usuário estiver inativo ou fora da área liberada
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário inativo"
        )

    # Senha definida por outra pessoa: até trocar, só login/logout, /users/me e a troca.
    if getattr(current_user, "must_change_password", False):
        caminho = request.url.path
        if not (caminho in CAMINHOS_COM_SENHA_PENDENTE or caminho.startswith(PREFIXOS_COM_SENHA_PENDENTE)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Troque a sua senha para continuar.",
            )

    papel = current_user.role.name if current_user.role else None
    if papel in PERFIS_TRANCADOS and not caminho_liberado_para_trancado(request.url.path):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito ao Programa de Parceiros."
        )

    # Dono/hunter sem o aceite da versão vigente dos termos: só auth, /users/me e os termos.
    if papel in ("partner", "hunter") and not _caminho_liberado_com_termos_pendentes(request.url.path):
        from app.services.parcerias import termos  # import tardio: evita ciclo

        if termos.pendente(db, current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Aceite os termos do Programa de Parceiros para continuar.",
            )
    return current_user


def require_role(required_role: str):
    """
    Factory de dependency para verificar se o usuário tem um role específico.

    Args:
        required_role: Nome do role necessário (ex: "admin", "manager", "salesperson")

    Returns:
        Dependency function que verifica o role

    Example:
        @app.get("/admin/users", dependencies=[Depends(require_role("admin"))])
        async def list_all_users():
            ...
    """
    async def role_checker(
        current_user: User = Depends(get_current_active_user)
    ) -> User:
        """
        Verifica se o usuário tem o role necessário.
        """
        # Acessa o role que já foi carregado via eager loading em get_current_user
        if not current_user.role or current_user.role.name != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acesso negado. Role necessário: {required_role}"
            )

        return current_user

    return role_checker


def require_manager_or_admin():
    """
    Dependency que permite acesso a usuários com role 'manager' ou 'admin'.
    Útil para endpoints que managers e admins compartilham, já que require_role()
    faz verificação exata de um único role.

    Returns:
        Dependency function que verifica se o role é manager ou admin
    """
    async def checker(
        current_user: User = Depends(get_current_active_user)
    ) -> User:
        """Verifica se o usuário é manager ou admin."""
        allowed_roles = ("manager", "admin")
        if not current_user.role or current_user.role.name not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado. Role necessário: manager ou admin"
            )
        return current_user

    return checker


def require_service_access():
    """
    Dependency que restringe o módulo de Serviços a admin, gerente e role 'service'.
    Vendedor, SDR e visualizador não têm acesso (403).

    Returns:
        Dependency function que verifica se o role pode acessar o módulo de Serviços
    """
    async def checker(
        current_user: User = Depends(get_current_active_user)
    ) -> User:
        allowed_roles = ("admin", "manager", "service")
        if not current_user.role or current_user.role.name not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso restrito ao módulo de Serviços (admin, gerente ou serviço)."
            )
        return current_user

    return checker


def require_parcerias_access():
    """
    Dependency do Programa de Parceiros: admin, gerente, Financeiro, parceiro (dono
    e vendedor da equipe dele), hunter e vendedor da H&S (este só vê os parceiros dos quais
    é o Responsável H&S).
    SDR, serviço e visualizador não acessam (403).
    """
    async def checker(
        current_user: User = Depends(get_current_active_user)
    ) -> User:
        allowed_roles = ("admin", "manager", "finance", "partner", "partner_member", "hunter", "salesperson")
        if not current_user.role or current_user.role.name not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso restrito ao Programa de Parceiros."
            )
        return current_user

    return checker


def require_consulta_cnpj():
    """
    Consulta de CNPJ (Parcerias, Entrega 2): parceiro (dono e vendedor da equipe),
    hunter, vendedor, SDR, admin e gerente. O Financeiro, o serviço e o visualizador não consultam (403).
    """
    async def checker(
        current_user: User = Depends(get_current_active_user)
    ) -> User:
        allowed_roles = ("admin", "manager", "salesperson", "sdr", "partner", "partner_member", "hunter")
        if not current_user.role or current_user.role.name not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso restrito à Consulta de CNPJ."
            )
        return current_user

    return checker


def require_integracao():
    """
    Dependency que restringe a rota a usuários de integração (`is_integracao`).

    Usada pelas rotas que outros sistemas chamam com o token do client-credentials
    (`POST /auth/client-credentials`), que resolve para o usuário de impersonação
    do integration client. Usuário humano recebe 403.
    """
    async def checker(
        current_user: User = Depends(get_current_active_user)
    ) -> User:
        if not current_user.is_integracao:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Rota exclusiva de integrações."
            )
        return current_user

    return checker


def require_not_viewer():
    """
    Dependency que bloqueia acesso de usuários com role 'viewer' a endpoints de escrita.
    Viewers têm acesso somente leitura: podem ver dados, mas não criar, editar ou deletar.

    Returns:
        Dependency function que verifica se o usuário NÃO é viewer

    Raises:
        HTTPException 403: Se o usuário tiver role 'viewer'
    """
    async def checker(
        current_user: User = Depends(get_current_active_user)
    ) -> User:
        """Verifica se o usuário não é viewer antes de permitir ação de escrita."""
        if current_user.role and current_user.role.name == "viewer":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado. Visualizadores não podem modificar dados."
            )
        return current_user

    return checker


def require_permission(required_permission: str):
    """
    Factory de dependency para verificar se o usuário tem uma permissão específica.
    As permissões são armazenadas no campo JSON 'permissions' do modelo Role.

    Args:
        required_permission: Nome da permissão necessária (ex: "users.create", "cards.delete")

    Returns:
        Dependency function que verifica a permissão

    Example:
        @app.delete("/cards/{card_id}", dependencies=[Depends(require_permission("cards.delete"))])
        async def delete_card(card_id: int):
            ...
    """
    async def permission_checker(
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db)
    ) -> User:
        """
        Verifica se o usuário tem a permissão necessária.
        """
        # Busca o role do usuário
        role = db.query(Role).filter(Role.id == current_user.role_id).first()

        if role is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Role não encontrado"
            )

        # Verifica se a permissão está no array de permissões
        permissions = role.permissions or []
        if required_permission not in permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acesso negado. Permissão necessária: {required_permission}"
            )

        return current_user

    return permission_checker


def require_api_scope(required_scope: str):
    """
    Dependency de autenticação por chave de API estática (header X-API-Key).

    Caminho separado do JWT de usuário: não passa por blacklist, sessão nem role.
    O controle de raio de dano é o escopo — a chave não expira, então ele não é opcional.

    Retorna o User de impersonate_user_id, que vira o autor dos eventos gerados.
    """
    async def checker(
        x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
        db: Session = Depends(get_db),
    ) -> User:
        if not x_api_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Chave de API ausente (header X-API-Key).",
            )

        client = (
            db.query(IntegrationClient)
            .filter(
                IntegrationClient.api_key_hash == hash_api_key(x_api_key),
                IntegrationClient.is_active.is_(True),
            )
            .first()
        )
        if not client:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Chave de API inválida ou inativa.",
            )

        if required_scope not in (client.scopes or []):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Chave de API sem o escopo necessário: {required_scope}",
            )

        if not client.impersonate_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Client de integração sem usuário associado.",
            )

        user = (
            db.query(User)
            .options(joinedload(User.role))
            .filter(
                User.id == client.impersonate_user_id,
                User.is_active.is_(True),
                User.is_deleted.is_(False),
            )
            .first()
        )
        if not user:
            # 403, não 401: nesse ponto a chave já foi provada válida, ativa e
            # com o escopo correto — a falha é de configuração do integration
            # client (usuário de impersonação ausente/inativo/excluído), não de
            # autenticação do chamador. Diverge de propósito do 401 usado no
            # fluxo de impersonação por JWT logo acima neste arquivo.
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuário de integração inválido ou inativo.",
            )

        client.last_used_at = datetime.now(timezone.utc)
        # Commita a sessão inteira (não só last_used_at) porque last_used_at é
        # trilha de auditoria de uso da chave e precisa persistir mesmo que o
        # corpo da rota levante exceção depois. Por isso não usar flush() aqui.
        # Efeito colateral: esse commit fecha a transação do request neste ponto.
        # Não componha esta dependency com outras que empilhem writes antes dela
        # esperando que só sejam persistidos no fim do request.
        db.commit()

        return user

    return checker
