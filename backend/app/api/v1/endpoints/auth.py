"""
Endpoints de Autenticação.
Rotas para login, refresh token, logout, reset de senha, etc.
"""
from datetime import datetime, timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, get_current_active_user
from app.core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_token_type,
    hash_password,
    create_password_reset_token,
    verify_password_reset_token,
)
from app.core.config import settings
from app.core.redis_sessions import session_manager
from app.models.user import User
from app.models.audit_log import AuditLog
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    RegisterRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ClientCredentialsRequest,
)
from app.schemas.user import UserResponse

router = APIRouter()


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login de usuário",
    description="""
    Autentica um usuário no sistema usando email e senha.

    **Retorna:**
    - `access_token`: Token JWT para autenticação (válido por 8 horas)
    - `refresh_token`: Token para renovar o access_token (válido por 7 dias)
    - `token_type`: Sempre "bearer"
    - `expires_in`: Tempo de expiração do access_token em segundos

    **Validações:**
    - Email deve existir no sistema
    - Senha deve estar correta
    - Usuário deve estar ativo
    - Usuário não pode estar deletado

    **Atualiza:**
    - Campo `last_login_at` do usuário com timestamp atual
    """,
    responses={
        200: {
            "description": "Login realizado com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                        "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                        "token_type": "bearer",
                        "expires_in": 28800
                    }
                }
            }
        },
        401: {
            "description": "Email ou senha incorretos",
            "content": {
                "application/json": {
                    "example": {"detail": "Email ou senha incorretos"}
                }
            }
        },
        403: {
            "description": "Usuário inativo",
            "content": {
                "application/json": {
                    "example": {"detail": "Usuário inativo. Entre em contato com o administrador."}
                }
            }
        }
    }
)
async def login(
    request: Request,
    login_data: LoginRequest,
    db: Session = Depends(get_db)
) -> Any:
    """
    Endpoint de login.
    """
    # Busca o usuário por email
    user = db.query(User).filter(
        User.email == login_data.email,
        User.is_deleted == False
    ).first()

    # Captura informações da requisição para possível log de falha
    # X-Forwarded-For é preenchido pelo proxy reverso (Traefik/Nginx) com o IP real do cliente
    client_ip = (
        request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        or request.headers.get("X-Real-IP", "")
        or (request.client.host if request.client else "unknown")
    )
    user_agent = request.headers.get("user-agent", "unknown")

    # Verifica se o usuário existe e a senha está correta
    if not user or not verify_password(login_data.password, user.password_hash):
        # Registra tentativa de login falhada
        audit_log = AuditLog(
            user_id=user.id if user else None,
            action="FAILED_LOGIN",
            entity_type="User",
            entity_id=user.id if user else None,
            description=f"Tentativa de login falhada: {login_data.email}",
            ip_address=client_ip,
            user_agent=user_agent
        )
        db.add(audit_log)
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verifica se o usuário está ativo
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário inativo. Entre em contato com o administrador."
        )

    # Atualiza o last_login_at
    user.last_login_at = datetime.utcnow()
    db.commit()

    # Registra o login no audit log
    audit_log = AuditLog(
        user_id=user.id,
        action="LOGIN",
        entity_type="User",
        entity_id=user.id,
        description=f"Login realizado: {user.email}",
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(audit_log)
    db.commit()

    # Cria o access token sem session_id por enquanto (precisamos do token para criar a sessão)
    # e depois cria a sessão passando o token
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    # Cria sessão no Redis e obtém o session_id
    # Se Redis estiver offline, session_id será None (graceful degradation)
    session_id = await session_manager.create_session(
        user_id=user.id,
        token=access_token,
        ip=client_ip,
        user_agent=user_agent,
    )

    # Se criou sessão, regera o token incluindo session_id no payload
    # Isso permite ao middleware rastrear qual sessão atualizar a cada request
    if session_id:
        access_token = create_access_token(
            data={"sub": str(user.id), "session_id": session_id}
        )

    # Prepara dados do usuário para resposta
    user_data = {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "username": user.username,
        "role_id": user.role_id,
        "is_active": user.is_active,
        "avatar_url": user.avatar_url,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # Converte para segundos
        user=user_data
    )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Renovar access token",
    description="""
    Renova o access_token usando um refresh_token válido.

    **Use este endpoint quando:**
    - O access_token expirou (após 8 horas)
    - Você quer renovar a sessão sem fazer login novamente

    **Retorna:**
    - Novo `access_token` e `refresh_token`
    - Tokens antigos se tornam inválidos

    **Validações:**
    - Refresh token deve ser válido e não expirado
    - Token deve ser do tipo "refresh" (não "access")
    - Usuário deve existir e estar ativo
    """,
    responses={
        200: {
            "description": "Tokens renovados com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                        "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                        "token_type": "bearer",
                        "expires_in": 28800
                    }
                }
            }
        },
        401: {
            "description": "Refresh token inválido ou expirado",
            "content": {
                "application/json": {
                    "examples": {
                        "expired": {"value": {"detail": "Refresh token inválido ou expirado"}},
                        "wrong_type": {"value": {"detail": "Tipo de token inválido. Use um refresh token."}},
                        "user_not_found": {"value": {"detail": "Usuário não encontrado ou inativo"}}
                    }
                }
            }
        }
    }
)
async def refresh_token(
    refresh_data: RefreshTokenRequest,
    db: Session = Depends(get_db)
) -> Any:
    """
    Endpoint de refresh token.
    """
    # Decodifica o refresh token
    payload = decode_token(refresh_data.refresh_token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido ou expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verifica se é um refresh token
    if not verify_token_type(payload, "refresh"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tipo de token inválido. Use um refresh token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Extrai o user_id
    user_id_str = payload.get("sub")
    if user_id_str is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: int = int(user_id_str)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Busca o usuário
    user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não encontrado ou inativo",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Cria novos tokens
    new_access_token = create_access_token(data={"sub": str(user.id)})
    new_refresh_token = create_refresh_token(data={"sub": str(user.id)})

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.post("/logout", summary="Logout de usuário")
async def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Realiza logout do usuário autenticado.
    Blacklista o token no Redis para invalidação imediata (sem esperar expiração natural).
    Remove a sessão ativa do usuário.
    """
    from datetime import datetime, timezone
    from app.core.security import decode_token

    # Registra no audit log
    # X-Forwarded-For é preenchido pelo proxy reverso (Traefik/Nginx) com o IP real do cliente
    client_ip = (
        request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        or request.headers.get("X-Real-IP", "")
        or (request.client.host if request.client else "unknown")
    )
    user_agent = request.headers.get("user-agent", "unknown")

    audit_log = AuditLog(
        user_id=current_user.id,
        action="LOGOUT",
        entity_type="User",
        entity_id=current_user.id,
        description=f"Logout realizado: {current_user.name} ({current_user.email})",
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(audit_log)
    db.commit()

    # Extrai o token do header para blacklistar e remover a sessão
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]

        # Calcula o TTL restante para definir quanto tempo o token fica na blacklist
        payload = decode_token(token)
        if payload:
            exp = payload.get("exp")
            if exp:
                remaining_ttl = max(int(exp - datetime.now(timezone.utc).timestamp()), 0)
            else:
                # Sem exp definido — usa o TTL padrão do access token
                remaining_ttl = settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60

            # Adiciona o token à blacklist (token não poderá mais ser usado)
            await session_manager.blacklist_token(token, remaining_ttl)

            # Remove a sessão ativa do Redis
            session_id = payload.get("session_id")
            if session_id:
                await session_manager.remove_session(current_user.id, session_id)

    return {
        "message": "Logout realizado com sucesso",
        "user_id": current_user.id
    }


@router.post(
    "/register",
    response_model=TokenResponse,
    summary="Registrar novo usuário",
    description="""
    Registra um novo usuário no sistema HSGrowth CRM.

    **Campos obrigatórios:**
    - `email`: Email único (será usado para login)
    - `username`: Nome de usuário único (opcional)
    - `password`: Senha forte (mínimo 6 caracteres)
    - `name`: Nome completo do usuário

    **Campos opcionais:**
    - `role_id`: ID do role (padrão: 2 - salesperson)

    **Validações:**
    - Email deve ser único no sistema
    - Username deve ser único no sistema
    - Senha deve ter no mínimo 6 caracteres
    - Senha é criptografada com bcrypt antes de salvar

    **Nota de Segurança:**
    Este endpoint pode ser protegido para que apenas admins possam criar usuários.
    Em ambientes com auto-registro, considere adicionar confirmação por email.
    """,
    status_code=status.HTTP_201_CREATED,
    responses={
        201: {
            "description": "Usuário criado com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "email": "joao@exemplo.com",
                        "username": "joao",
                        "name": "João Silva",
                        "role_id": 2,
                        "is_active": True,
                        "created_at": "2026-01-06T10:00:00"
                    }
                }
            }
        },
        400: {
            "description": "Email ou username já cadastrado",
            "content": {
                "application/json": {
                    "examples": {
                        "email_exists": {"value": {"detail": "Email já cadastrado"}},
                        "username_exists": {"value": {"detail": "Nome de usuário já cadastrado"}}
                    }
                }
            }
        }
    }
)
async def register(
    user_data: RegisterRequest,
    db: Session = Depends(get_db)
) -> Any:
    """
    Endpoint de registro de usuário.
    """
    # Verifica se email já existe
    existing_email = db.query(User).filter(
        User.email == user_data.email,
        User.is_deleted == False
    ).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já cadastrado"
        )

    # Verifica se username já existe
    existing_username = db.query(User).filter(
        User.username == user_data.username,
        User.is_deleted == False
    ).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nome de usuário já cadastrado"
        )

    # Hash da senha
    password_hash = hash_password(user_data.password)

    # Cria o novo usuário
    new_user = User(
        email=user_data.email,
        username=user_data.username,
        password_hash=password_hash,
        name=user_data.name,
        role_id=user_data.role_id or 2,  # Padrão: salesperson
        is_active=True
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Cria os tokens
    access_token = create_access_token(data={"sub": str(new_user.id)})
    refresh_token = create_refresh_token(data={"sub": str(new_user.id)})

    # Prepara dados do usuário para resposta
    user_data = {
        "id": new_user.id,
        "email": new_user.email,
        "name": new_user.name,
        "username": new_user.username,
        "role_id": new_user.role_id,
        "is_active": new_user.is_active,
        "avatar_url": new_user.avatar_url,
        "created_at": new_user.created_at.isoformat() if new_user.created_at else None,
    }

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=user_data
    )


@router.post(
    "/forgot-password",
    summary="Solicitar reset de senha",
    description="""
    Inicia o processo de recuperação de senha enviando um token de reset para o email.

    **Fluxo de recuperação:**
    1. Usuário fornece seu email
    2. Sistema gera um token de reset (válido por 30 minutos)
    3. Email é enviado com link contendo o token
    4. Usuário acessa o link e usa o endpoint `/reset-password`

    **Segurança:**
    - Sempre retorna sucesso, mesmo se o email não existir (não vaza informações)
    - Token expira em 30 minutos
    - Token é de uso único

    **Nota de Desenvolvimento:**
    O token é retornado na resposta apenas em desenvolvimento. Em produção,
    o token deve ser enviado apenas por email.
    """,
    responses={
        200: {
            "description": "Requisição processada (não indica se email existe)",
            "content": {
                "application/json": {
                    "example": {
                        "message": "Se o email existir, você receberá instruções para reset de senha.",
                        "reset_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    }
                }
            }
        }
    }
)
async def forgot_password(
    request_data: ForgotPasswordRequest,
    db: Session = Depends(get_db)
) -> Any:
    """
    Endpoint de solicitação de reset de senha.
    """
    # Busca o usuário por email
    user = db.query(User).filter(
        User.email == request_data.email,
        User.is_deleted == False
    ).first()

    # Sempre retorna sucesso (segurança - não vaza se o email existe)
    if not user:
        return {
            "message": "Se o email existir, você receberá instruções para reset de senha."
        }

    # Gera token de reset
    reset_token = create_password_reset_token(user.email)

    # Salva o token no banco de dados
    user.reset_token = reset_token
    user.reset_token_expires_at = datetime.utcnow() + timedelta(minutes=30)
    db.commit()

    # TODO: Enviar email com o token
    # Exemplo de URL: http://frontend.com/reset-password?token={reset_token}
    # Por enquanto, apenas retorna o token (REMOVER EM PRODUÇÃO)
    return {
        "message": "Se o email existir, você receberá instruções para reset de senha.",
        "reset_token": reset_token  # REMOVER EM PRODUÇÃO - apenas para desenvolvimento
    }


@router.post(
    "/reset-password",
    summary="Resetar senha com token",
    description="""
    Completa o processo de recuperação de senha usando o token recebido por email.

    **Campos obrigatórios:**
    - `token`: Token de reset recebido por email (válido por 30 minutos)
    - `new_password`: Nova senha (mínimo 6 caracteres)

    **Validações:**
    - Token deve ser válido e não expirado
    - Nova senha deve ter no mínimo 6 caracteres
    - Usuário deve existir e não estar deletado

    **Após sucesso:**
    - Senha é atualizada e criptografada com bcrypt
    - Usuário deve fazer login novamente com a nova senha
    - Token se torna inválido
    """,
    responses={
        200: {
            "description": "Senha alterada com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "message": "Senha alterada com sucesso"
                    }
                }
            }
        },
        400: {
            "description": "Token inválido ou expirado",
            "content": {
                "application/json": {
                    "example": {"detail": "Token inválido ou expirado"}
                }
            }
        },
        404: {
            "description": "Usuário não encontrado",
            "content": {
                "application/json": {
                    "example": {"detail": "Usuário não encontrado"}
                }
            }
        }
    }
)
async def reset_password(
    request: Request,
    reset_data: ResetPasswordRequest,
    db: Session = Depends(get_db)
) -> Any:
    """
    Endpoint de reset de senha.
    """
    # Verifica o token
    email = verify_password_reset_token(reset_data.token)
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token inválido ou expirado"
        )

    # Busca o usuário
    user = db.query(User).filter(
        User.email == email,
        User.is_deleted == False
    ).first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )

    # Verifica se o token no banco está expirado
    if user.reset_token_expires_at and user.reset_token_expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token expirado"
        )

    # Verifica se o token no banco corresponde ao fornecido
    if user.reset_token != reset_data.token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token inválido"
        )

    # Atualiza a senha e limpa o token de reset
    user.password_hash = hash_password(reset_data.new_password)
    user.reset_token = None
    user.reset_token_expires_at = None
    user.password_changed_at = datetime.utcnow()
    db.commit()

    # Registra no audit log
    # X-Forwarded-For é preenchido pelo proxy reverso (Traefik/Nginx) com o IP real do cliente
    client_ip = (
        request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        or request.headers.get("X-Real-IP", "")
        or (request.client.host if request.client else "unknown")
    )
    user_agent = request.headers.get("user-agent", "unknown")

    audit_log = AuditLog(
        user_id=user.id,
        action="PASSWORD_RESET",
        entity_type="User",
        entity_id=user.id,
        description=f"Senha resetada via email: {user.name} ({user.email})",
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(audit_log)
    db.commit()

    return {
        "message": "Senha alterada com sucesso"
    }


@router.post("/client-credentials", response_model=TokenResponse)
async def client_credentials_auth(
    credentials: ClientCredentialsRequest,
    db: Session = Depends(get_db)
):
    """
    Autenticação para sistemas externos usando client_id e client_secret.

    **Uso:**
    - Sistemas externos (N8N, Zapier, etc) usam este endpoint para obter um token de acesso
    - O client_id e client_secret são gerados via comando ou endpoint de gerenciamento
    - O token retornado pode ser usado como Bearer token em todas as requisições da API

    **Segurança:**
    - Client secrets nunca são armazenados em plain text (apenas hash)
    - Tokens têm validade de 8 horas
    - Cada autenticação registra last_used_at para auditoria

    **Exemplo N8N:**
    ```
    POST /api/v1/auth/client-credentials
    {
      "client_id": "hsg_abc123...",
      "client_secret": "secret_xyz789...",
      "grant_type": "client_credentials"
    }
    ```
    """
    from app.services.integration_client_service import IntegrationClientService
    from app.core.security import create_access_token, create_refresh_token
    from app.core.config import settings

    # Valida grant_type
    if credentials.grant_type != "client_credentials":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="grant_type inválido. Use 'client_credentials'"
        )

    # Autentica o client
    client_service = IntegrationClientService(db)
    client = client_service.authenticate(credentials.client_id, credentials.client_secret)

    if not client:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Cria os tokens JWT
    # Para integration clients, usamos o client_id como subject
    access_token = create_access_token(
        data={
            "sub": f"client:{client.client_id}",
            "type": "integration",
            "client_id": client.client_id,
            "impersonate_user_id": client.impersonate_user_id
        }
    )

    refresh_token = create_refresh_token(
        data={
            "sub": f"client:{client.client_id}",
            "type": "integration"
        }
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # Converte minutos para segundos
        "user": {
            "id": None,
            "email": None,
            "name": client.name,
            "role": "integration",
            "client_id": client.client_id
        }
    }


@router.get(
    "/login-history",
    summary="Histórico de logins do sistema",
    description="Retorna todos os logins do sistema. Endpoint usado apenas na aba Segurança (Admin/Manager)."
)
async def get_login_history(
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retorna todos os logins do sistema.
    Como a aba de Segurança só é acessível para Admin e Manager,
    não há filtro por usuário - mostra todos os logins.
    """
    # Busca todos os logins (sem filtro por usuário)
    # Faz join com User para pegar nome e email
    logins = db.query(AuditLog, User).join(
        User, AuditLog.user_id == User.id
    ).filter(
        AuditLog.action == "LOGIN"
    ).order_by(
        AuditLog.created_at.desc()
    ).limit(limit).all()

    return {
        "total": len(logins),
        "logins": [
            {
                "id": log.id,
                "user_name": user.name,
                "user_email": user.email,
                "ip_address": log.ip_address,
                "user_agent": log.user_agent,
                # Adiciona 'Z' para indicar UTC explicitamente
                "created_at": log.created_at.isoformat() + 'Z' if log.created_at else None
            }
            for log, user in logins
        ]
    }


@router.get("/microsoft", summary="Iniciar login com Microsoft 365")
async def microsoft_login():
    """
    Redireciona o usuário para a página de login da Microsoft (Entra ID).
    Após autenticação, o Microsoft redireciona para /auth/microsoft/callback.
    """
    from app.services.microsoft_auth_service import microsoft_auth_service
    auth_url = microsoft_auth_service.get_authorization_url()
    return RedirectResponse(url=auth_url, status_code=302)


@router.get("/microsoft/callback", summary="Callback do SSO Microsoft 365")
async def microsoft_callback(
    request: Request,
    code: str = None,
    error: str = None,
    db: Session = Depends(get_db),
):
    """
    Recebe o código de autorização da Microsoft, troca por token,
    localiza o usuário pelo email e gera o JWT interno do sistema.
    """
    from app.services.microsoft_auth_service import microsoft_auth_service

    frontend_url = settings.FRONTEND_URL

    # Erro retornado pela Microsoft (ex: usuário cancelou)
    if error:
        return RedirectResponse(url=f"{frontend_url}/login?error=microsoft_auth_failed", status_code=302)

    if not code:
        return RedirectResponse(url=f"{frontend_url}/login?error=microsoft_auth_failed", status_code=302)

    # Troca o code por token Microsoft
    try:
        token_result = microsoft_auth_service.exchange_code_for_token(code)
        ms_access_token = token_result.get("access_token")
        profile = microsoft_auth_service.get_user_profile(ms_access_token)
    except Exception as e:
        print(f"[SSO Microsoft] Erro ao trocar código: {e}")
        return RedirectResponse(url=f"{frontend_url}/login?error=microsoft_auth_failed", status_code=302)

    email = profile.get("email", "")
    if not email:
        return RedirectResponse(url=f"{frontend_url}/login?error=microsoft_auth_failed", status_code=302)

    # Busca o usuário pelo email
    user = db.query(User).filter(
        User.email == email,
        User.is_deleted == False,
    ).first()

    if not user:
        return RedirectResponse(url=f"{frontend_url}/login?error=user_not_found", status_code=302)

    if not user.is_active:
        return RedirectResponse(url=f"{frontend_url}/login?error=user_inactive", status_code=302)

    # Atualiza last_login_at e salva tokens Microsoft para uso posterior (Graph API)
    from datetime import timezone
    ms_expires_in = token_result.get("expires_in", 3600)
    user.last_login_at = datetime.utcnow()
    user.ms_access_token = token_result.get("access_token")
    user.ms_refresh_token = token_result.get("refresh_token")
    user.ms_token_expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(seconds=ms_expires_in - 60)
    db.commit()

    # Registra no audit log
    client_ip = (
        request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        or request.headers.get("X-Real-IP", "")
        or (request.client.host if request.client else "unknown")
    )
    user_agent = request.headers.get("user-agent", "unknown")

    audit_log = AuditLog(
        user_id=user.id,
        action="LOGIN_SSO_MICROSOFT",
        entity_type="User",
        entity_id=user.id,
        description=f"Login via SSO Microsoft: {user.email}",
        ip_address=client_ip,
        user_agent=user_agent,
    )
    db.add(audit_log)
    db.commit()

    # Gera tokens internos
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    # Cria sessão no Redis
    session_id = await session_manager.create_session(
        user_id=user.id,
        token=access_token,
        ip=client_ip,
        user_agent=user_agent,
    )
    if session_id:
        access_token = create_access_token(
            data={"sub": str(user.id), "session_id": session_id}
        )

    # Redireciona para o frontend com os tokens na query string
    redirect_url = (
        f"{frontend_url}/auth/callback"
        f"?access_token={access_token}"
        f"&refresh_token={refresh_token}"
        f"&expires_in={settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60}"
    )
    return RedirectResponse(url=redirect_url, status_code=302)


@router.get("/me/calendar-events", summary="Buscar eventos do calendário Outlook")
async def get_calendar_events(
    start: str,
    end: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Retorna eventos do calendário do usuário no período informado.
    start e end devem ser datas no formato YYYY-MM-DD.
    Requer autenticação Microsoft (SSO).
    """
    from app.services.microsoft_graph_service import microsoft_graph_service

    try:
        start_dt = datetime.strptime(start, "%Y-%m-%d").replace(tzinfo=None)
        end_dt = datetime.strptime(end, "%Y-%m-%d").replace(hour=23, minute=59, second=59, tzinfo=None)
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de data inválido. Use YYYY-MM-DD.")

    try:
        events = microsoft_graph_service.get_calendar_events(
            user=current_user,
            db=db,
            start_dt=start_dt,
            end_dt=end_dt,
        )
        return {"events": events}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/me/seller-schedule", summary="Buscar disponibilidade do Vendedor")
async def get_seller_schedule(
    email: str,
    start: str,
    end: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Retorna os blocos de livre/ocupado do Vendedor (assigned_to) via Microsoft getSchedule.
    Permite que o SDR veja a disponibilidade do Vendedor ao agendar reuniões.

    Parâmetros:
        email: Email corporativo do Vendedor (@healthsafetytech.com)
        start: Data inicial no formato YYYY-MM-DD
        end: Data final no formato YYYY-MM-DD
    """
    from app.services.microsoft_graph_service import microsoft_graph_service

    try:
        start_dt = datetime.strptime(start, "%Y-%m-%d").replace(hour=0, minute=0, second=0)
        end_dt = datetime.strptime(end, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de data inválido. Use YYYY-MM-DD.")

    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Email inválido.")

    try:
        slots = microsoft_graph_service.get_schedule(
            user=current_user,
            db=db,
            emails=[email],
            start_dt=start_dt,
            end_dt=end_dt,
        )
        return {"slots": slots, "seller_email": email}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/debug-token")
async def debug_token(current_user: User = Depends(get_current_user)):
    """
    Endpoint temporário de debug para verificar se a autenticação está funcionando.
    """
    return {
        "message": "Token validado com sucesso!",
        "user_id": current_user.id,
        "user_email": current_user.email,
        "user_name": current_user.name,
        "user_role": current_user.role.name if current_user.role else None
    }
