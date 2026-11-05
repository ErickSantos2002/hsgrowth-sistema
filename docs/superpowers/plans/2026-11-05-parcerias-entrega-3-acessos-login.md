# Parcerias Entrega 3 — Acessos e login · Plano de implementação

> **Para agentes:** use superpowers:subagent-driven-development (recomendado) ou
> superpowers:executing-plans para seguir este plano tarefa por tarefa. Os passos usam
> checkbox (`- [ ]`).

**Objetivo:** dar login próprio ao parceiro, à equipe do parceiro (perfil novo
`partner_member`) e ao Financeiro, com convite por e-mail, senha inicial com troca
obrigatória e "Esqueci minha senha" — valendo para o CRM todo.

**Spec (leia antes):** `docs/superpowers/specs/2026-11-05-parcerias-entrega-3-acessos-login-design.md`

**Arquitetura:** um serviço de tokens de uso único (convite 7 dias / redefinição 1 h,
guardados como hash) e um serviço único de "criar login" (modo convite ou senha) usados
pelas 3 telas (Usuários, Acessos ao CRM, Equipe). Envio de e-mail num ponto só
(`envio_email.enviar_email`), plugável no provedor. Troca obrigatória de senha barrada
no backend, em `get_current_active_user`.

**Stack:** FastAPI + SQLAlchemy + Alembic + pytest (SQLite em memória) · React + TypeScript + Vite + Tailwind.

---

## Antes de começar (regras do projeto)

- **O Docker local (`hsgrowth-api-local`) aponta para o banco de PRODUÇÃO.** Os testes
  usam SQLite em memória (seguro). **Nunca rode `alembic upgrade` local.** A migration
  roda só no **homo**. `alembic heads` (só lê os scripts) pode.
- Rodar os testes:
  `cd backend && MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest tests -q -p no:cacheprovider --color=no`
  (um arquivo: troque `tests` pelo caminho). Hoje passam **1094**.
- Front: `cd frontend && npx tsc --noEmit -p . && npm run build`.
- Armadilha: a rota `/api/v1/products` usa outro `get_db` que os testes não trocam —
  não teste por ela (não é usada aqui).
- Versão em 3 lugares: `CHANGELOG.md`, `frontend/src/components/common/ChangelogModal.tsx`
  e o rodapé em `frontend/src/layouts/MainLayout.tsx` ("HSGrowth CRM v1.11.15" → v1.11.16).
- Parcerias vai **só para o homo** (https://homo-hsgrowth.healthsafetytech.com).
- O plano da Cadência de Serviço (`docs/superpowers/plans/` + memória) tem uma migration
  futura: quando for feita, o `down_revision` dela passa a ser `7b8c9d0e1f2a`.
- Um commit por tarefa. Textos de tela e mensagens de erro em português.

## Mapa de arquivos

**Criar (backend)**
- `backend/alembic/versions/2026_11_05_1400-7b8c9d0e1f2a_acessos_convite_senha.py` — migration.
- `backend/app/models/user_access_token.py` — tabela de tokens (convite/redefinir).
- `backend/app/schemas/acessos.py` — schemas comuns (modo, convite, definir senha, respostas).
- `backend/app/services/envio_email.py` — ponto único de envio (provedor plugável).
- `backend/app/services/emails_de_acesso.py` — modelos de e-mail Convite e Redefinir senha.
- `backend/app/services/tokens_de_acesso.py` — criar/validar/usar tokens e status do acesso.
- `backend/app/services/criacao_de_login.py` — criar login (convite|senha) e (re)enviar convite.
- Testes: `backend/tests/unit/test_acessos_tokens.py`, `test_acessos_senha.py`,
  `test_acessos_usuarios.py`, `test_parcerias_acessos_convite.py`,
  `test_parcerias_vendedor_parceiro.py`.

**Modificar (backend)**
- `backend/app/models/user.py` (campo `must_change_password`), `backend/app/models/__init__.py` (import do model novo).
- `backend/app/core/config.py` (`EMAIL_PROVIDER`).
- `backend/app/api/deps.py` (tranca do `partner_member`, troca obrigatória).
- `backend/app/api/v1/endpoints/auth.py` (login, token, definir-senha, forgot/reset).
- `backend/app/schemas/auth.py`, `backend/app/schemas/user.py`.
- `backend/app/api/v1/endpoints/users.py`, `backend/app/services/user_service.py`, `backend/app/api/v1/endpoints/admin.py`.
- `backend/app/services/parcerias/acesso.py`, `parceiros.py`, `oportunidades.py`,
  `atividades.py`, `consultas.py`, `respostas.py`; `backend/app/schemas/parcerias.py`;
  `backend/app/api/v1/endpoints/parcerias.py`.

**Criar (front)**
- `frontend/src/services/acessosService.ts`
- `frontend/src/components/acessos/FormularioDeAcesso.tsx`, `StatusDoAcesso.tsx`, `AcoesDoConvite.tsx`
- `frontend/src/pages/DefinirSenha.tsx`, `EsqueciSenha.tsx`, `TrocarSenha.tsx`

**Modificar (front)**
- `frontend/src/router.tsx`, `frontend/src/pages/Login.tsx`, `frontend/src/layouts/MainLayout.tsx`,
  `frontend/src/types/index.ts`, `frontend/src/services/authService.ts`, `frontend/src/services/userService.ts`,
  `frontend/src/pages/Settings.tsx`, `frontend/src/pages/Users.tsx`, `frontend/src/components/users/UserModal.tsx`,
  `frontend/src/constants/parcerias.ts`, `frontend/src/services/parceriasService.ts`,
  `frontend/src/pages/parcerias/ParceiroDetalhe.tsx`, `ParceriasHome.tsx`, `OportunidadesKanban.tsx`,
  `OportunidadeDetalhe.tsx`, `frontend/src/components/parcerias/NovaOportunidadeModal.tsx`.

---

## Task 1: Banco — migration, model do token, campo e role novos

**Files:**
- Create: `backend/alembic/versions/2026_11_05_1400-7b8c9d0e1f2a_acessos_convite_senha.py`
- Create: `backend/app/models/user_access_token.py`
- Modify: `backend/app/models/user.py` (bloco "Status"), `backend/app/models/__init__.py`

- [ ] **Step 1: Migration**

```python
"""Acessos: convite por e-mail, troca obrigatória de senha e vendedor do parceiro

Revision ID: 7b8c9d0e1f2a
Revises: 6a7b8c9d0e1f
Create Date: 2026-11-05 14:00:00

- users.must_change_password: senha definida por outra pessoa obriga a trocar no 1º login.
- user_access_tokens: links de uso único (convite 7 dias, redefinição 1 hora); só o hash.
- role partner_member: vendedor da equipe do parceiro (vê só as próprias oportunidades).
"""
from alembic import op
import sqlalchemy as sa


revision = '7b8c9d0e1f2a'
down_revision = '6a7b8c9d0e1f'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('must_change_password', sa.Boolean(), nullable=False,
                                     server_default=sa.false()))
    op.create_table(
        'user_access_tokens',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('kind', sa.String(20), nullable=False),
        sa.Column('token_hash', sa.String(64), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('used_at', sa.DateTime(), nullable=True),
        sa.Column('created_by_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_user_access_tokens_user_id', 'user_access_tokens', ['user_id'])
    op.create_index('ix_user_access_tokens_token_hash', 'user_access_tokens', ['token_hash'], unique=True)
    op.execute("""
        INSERT INTO roles (name, display_name, description, permissions, is_system_role, created_at, updated_at)
        VALUES ('partner_member', 'Vendedor do parceiro',
                'Vendedor da equipe de um parceiro: só as próprias oportunidades e a Consulta de CNPJ',
                '[]', true, now(), now())
        ON CONFLICT (name) DO NOTHING;
    """)


def downgrade():
    op.execute("DELETE FROM roles WHERE name = 'partner_member' "
               "AND NOT EXISTS (SELECT 1 FROM users WHERE users.role_id = roles.id)")
    op.drop_index('ix_user_access_tokens_token_hash', table_name='user_access_tokens')
    op.drop_index('ix_user_access_tokens_user_id', table_name='user_access_tokens')
    op.drop_table('user_access_tokens')
    op.drop_column('users', 'must_change_password')
```

- [ ] **Step 2: Model do token** (`backend/app/models/user_access_token.py`)

```python
"""Link de uso único para criar ou redefinir a senha (o banco guarda só o hash)."""
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.db.base import Base


class UserAccessToken(Base):
    __tablename__ = "user_access_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    kind = Column(String(20), nullable=False)  # "convite" | "redefinir"
    token_hash = Column(String(64), nullable=False, unique=True, index=True)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])
```

- [ ] **Step 3: Campo no User** — em `backend/app/models/user.py`, logo depois de `is_verified`:

```python
    # Senha definida por outra pessoa (admin, gerente, dono do parceiro): troca no 1º login.
    must_change_password = Column(Boolean, default=False, nullable=False)
```

- [ ] **Step 4: Registrar o model** — em `backend/app/models/__init__.py`, junto dos outros imports
de model: `from app.models.user_access_token import UserAccessToken` (e no `__all__`, se houver).

- [ ] **Step 5: Conferir**

Run: `MSYS_NO_PATHCONV=1 docker exec -w /app hsgrowth-api-local alembic heads` → `7b8c9d0e1f2a (head)`
Run a suíte inteira → continua 1094 passando.

- [ ] **Step 6: Commit** — `feat(acessos): migration de convite, troca obrigatória e role partner_member`

---

## Task 2: Envio de e-mail plugável e modelos de e-mail

**Files:**
- Create: `backend/app/services/envio_email.py`, `backend/app/services/emails_de_acesso.py`
- Modify: `backend/app/core/config.py` (perto dos `SMTP_*`)
- Test: `backend/tests/unit/test_acessos_tokens.py` (parte de e-mail)

> **Decisão do Erick:** qual provedor usar. O plano traz o `smtp` pronto (usa o
> `EmailService._send_email` e as variáveis `SMTP_*` que já existem). Para usar a
> plataforma de disparo, escreva `_plataforma(para, assunto, html, texto)` com a mesma
> assinatura (levanta exceção se falhar) e ligue em `_PROVEDORES`. O resto do sistema
> não muda.

- [ ] **Step 1: Config** — em `backend/app/core/config.py`, abaixo de `SMTP_FROM_NAME`:

```python
    # Provedor do envio de e-mail do CRM (convite, redefinir senha): "smtp", "plataforma"
    # ou vazio (não envia; só registra no log — a tela oferece "Copiar link").
    EMAIL_PROVIDER: str = ""
```

- [ ] **Step 2: `backend/app/services/envio_email.py`**

```python
"""
Ponto único de envio de e-mail do CRM (convite, redefinir senha).

Quem chama não sabe qual provedor está ligado: troque em settings.EMAIL_PROVIDER.
Nunca levanta exceção: devolve False se não enviou (a tela oferece "Copiar link").
"""
import logging
from typing import Callable, Dict, Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

Provedor = Callable[[str, str, str, Optional[str]], None]


def _smtp(para: str, assunto: str, html: str, texto: Optional[str]) -> None:
    from app.services.email_service import EmailService
    if not EmailService()._send_email(para, assunto, html, texto):
        raise RuntimeError("SMTP não enviou (veja o log do EmailService)")


_PROVEDORES: Dict[str, Provedor] = {
    "smtp": _smtp,
    # "plataforma": _plataforma,  ← o Erick liga aqui a plataforma de disparo
}


def enviar_email(para: str, assunto: str, html: str, texto: Optional[str] = None) -> bool:
    provedor = _PROVEDORES.get((settings.EMAIL_PROVIDER or "").strip().lower())
    if provedor is None:
        logger.warning(f"[E-MAIL NÃO ENVIADO] sem provedor configurado. Para: {para} | {assunto}")
        return False
    try:
        provedor(para, assunto, html, texto)
        return True
    except Exception:
        logger.exception(f"Falha ao enviar e-mail para {para} ({assunto})")
        return False
```

- [ ] **Step 3: `backend/app/services/emails_de_acesso.py`**

```python
"""Textos dos e-mails de acesso: Convite e Redefinir senha (HTML simples e texto puro)."""
from datetime import datetime
from html import escape
from typing import Tuple


def _moldura(titulo: str, corpo: str) -> str:
    return f"""<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f4f6f8;padding:24px">
<div style="max-width:560px;margin:auto;background:#fff;border-radius:8px;padding:28px">
<h2 style="color:#0f172a;margin-top:0">{escape(titulo)}</h2>{corpo}
<p style="color:#94a3b8;font-size:12px;margin-top:32px">Health &amp; Safety · HSGrowth CRM</p>
</div></body></html>"""


def _botao(link: str, texto: str) -> str:
    return (f'<p style="margin:28px 0"><a href="{escape(link)}" style="background:#059669;color:#fff;'
            f'padding:12px 22px;border-radius:6px;text-decoration:none">{escape(texto)}</a></p>'
            f'<p style="color:#64748b;font-size:13px">Se o botão não abrir, copie este endereço no navegador:<br>'
            f'{escape(link)}</p>')


def convite(nome: str, quem_convidou: str, link: str, expira_em: datetime) -> Tuple[str, str, str]:
    """(assunto, html, texto)"""
    validade = expira_em.strftime("%d/%m/%Y")
    assunto = "Seu acesso ao HSGrowth CRM"
    html = _moldura("Você foi convidado para o HSGrowth CRM", (
        f"<p>Olá, {escape(nome)}.</p>"
        f"<p>{escape(quem_convidou)} criou o seu acesso ao CRM da Health &amp; Safety. "
        f"Clique no botão para criar a sua senha.</p>"
        + _botao(link, "Criar minha senha")
        + f"<p>O link vale até {validade} e só pode ser usado uma vez.</p>"
          "<p>Se você não esperava este e-mail, pode ignorar.</p>"))
    texto = (f"Olá, {nome}.\n{quem_convidou} criou o seu acesso ao HSGrowth CRM.\n"
             f"Crie a sua senha em: {link}\nO link vale até {validade} e só pode ser usado uma vez.")
    return assunto, html, texto


def redefinir(nome: str, link: str) -> Tuple[str, str, str]:
    assunto = "Redefinir sua senha do HSGrowth CRM"
    html = _moldura("Redefinir senha", (
        f"<p>Olá, {escape(nome)}.</p><p>Recebemos um pedido para redefinir a sua senha.</p>"
        + _botao(link, "Criar nova senha")
        + "<p>O link vale por 1 hora. Se não foi você, ignore este e-mail: a senha atual continua valendo.</p>"))
    texto = f"Olá, {nome}.\nPara criar uma nova senha, acesse: {link}\nO link vale por 1 hora."
    return assunto, html, texto
```

- [ ] **Step 4: Teste** — crie `backend/tests/unit/test_acessos_tokens.py` com:

```python
"""Tokens de acesso (convite/redefinir) e envio de e-mail."""
from app.core.config import settings
from app.services import envio_email


def test_sem_provedor_nao_envia_e_nao_quebra(monkeypatch):
    monkeypatch.setattr(settings, "EMAIL_PROVIDER", "")
    assert envio_email.enviar_email("a@b.com", "x", "<p>x</p>") is False


def test_provedor_que_falha_devolve_false(monkeypatch):
    def quebra(*_):
        raise RuntimeError("fora do ar")
    monkeypatch.setattr(settings, "EMAIL_PROVIDER", "smtp")
    monkeypatch.setitem(envio_email._PROVEDORES, "smtp", quebra)
    assert envio_email.enviar_email("a@b.com", "x", "<p>x</p>") is False
```

Run: `... python -m pytest tests/unit/test_acessos_tokens.py -q ...` → 2 passed.

- [ ] **Step 5: Commit** — `feat(acessos): envio de e-mail plugável e modelos de convite e redefinição`

---

## Task 3: Serviço de tokens de acesso

**Files:**
- Create: `backend/app/services/tokens_de_acesso.py`
- Test: `backend/tests/unit/test_acessos_tokens.py` (acrescentar)

- [ ] **Step 1: Testes que falham** — acrescente em `test_acessos_tokens.py`:

```python
from datetime import datetime, timedelta

from app.models.user_access_token import UserAccessToken
from app.services import tokens_de_acesso as tokens
from tests.unit.apoio_parcerias import usuario


def test_token_guarda_so_o_hash_e_vale_uma_vez(db):
    u = usuario(db, "salesperson", "v@hs.com")
    t = tokens.criar(db, u, "convite")
    db.commit()

    salvo = db.query(UserAccessToken).one()
    assert salvo.token_hash != t and len(salvo.token_hash) == 64
    assert tokens.buscar_valido(db, t).user_id == u.id
    tokens.usar(db, tokens.buscar_valido(db, t))
    db.commit()
    assert tokens.buscar_valido(db, t) is None


def test_novo_token_invalida_o_anterior_do_mesmo_tipo(db):
    u = usuario(db, "salesperson", "v@hs.com")
    velho = tokens.criar(db, u, "convite"); db.commit()
    novo = tokens.criar(db, u, "convite"); db.commit()
    assert tokens.buscar_valido(db, velho) is None
    assert tokens.buscar_valido(db, novo) is not None


def test_expirado_ou_usuario_inativo_nao_vale(db):
    u = usuario(db, "salesperson", "v@hs.com")
    t = tokens.criar(db, u, "redefinir"); db.commit()
    db.query(UserAccessToken).update({"expires_at": datetime.utcnow() - timedelta(minutes=1)})
    db.commit()
    assert tokens.buscar_valido(db, t) is None

    t2 = tokens.criar(db, u, "redefinir"); u.is_active = False; db.commit()
    assert tokens.buscar_valido(db, t2) is None


def test_status_do_acesso(db):
    u = usuario(db, "partner", "p@dmap.com")
    assert tokens.status_do_acesso(db, u) == "ativo"
    tokens.criar(db, u, "convite"); db.commit()
    assert tokens.status_do_acesso(db, u) == "convite_pendente"
    db.query(UserAccessToken).update({"expires_at": datetime.utcnow() - timedelta(days=1)}); db.commit()
    assert tokens.status_do_acesso(db, u) == "convite_expirado"
    u.last_login_at = datetime.utcnow(); db.commit()
    assert tokens.status_do_acesso(db, u) == "ativo"
    u.is_active = False; db.commit()
    assert tokens.status_do_acesso(db, u) == "desativado"
```

Run → FAIL (`tokens_de_acesso` não existe).

- [ ] **Step 2: Implementar `backend/app/services/tokens_de_acesso.py`**

```python
"""
Links de uso único para criar (convite) ou redefinir a senha.

O token em claro só existe no link enviado/copiado; o banco guarda o sha256. Gerar um
token novo invalida os pendentes do mesmo tipo. Quem chama faz o commit.
"""
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import User
from app.models.user_access_token import UserAccessToken

VALIDADE = {"convite": timedelta(days=7), "redefinir": timedelta(hours=1)}


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _pendentes(db: Session, user: User, kind: Optional[str] = None):
    q = db.query(UserAccessToken).filter(UserAccessToken.user_id == user.id, UserAccessToken.used_at.is_(None))
    return q.filter(UserAccessToken.kind == kind) if kind else q


def invalidar_pendentes(db: Session, user: User, kind: Optional[str] = None) -> None:
    agora = datetime.utcnow()
    for t in _pendentes(db, user, kind):
        t.used_at = agora


def criar(db: Session, user: User, kind: str, autor: Optional[User] = None) -> str:
    invalidar_pendentes(db, user, kind)
    token = secrets.token_urlsafe(32)
    db.add(UserAccessToken(
        user_id=user.id, kind=kind, token_hash=_hash(token),
        expires_at=datetime.utcnow() + VALIDADE[kind],
        created_by_id=autor.id if autor else None,
    ))
    db.flush()
    return token


def link(token: str) -> str:
    return f"{settings.FRONTEND_URL.rstrip('/')}/definir-senha?token={token}"


def buscar_valido(db: Session, token: str) -> Optional[UserAccessToken]:
    t = db.query(UserAccessToken).filter(UserAccessToken.token_hash == _hash(token or "")).first()
    if not t or t.used_at or t.expires_at < datetime.utcnow():
        return None
    if not t.user or t.user.is_deleted or not t.user.is_active:
        return None
    return t


def usar(db: Session, t: UserAccessToken) -> None:
    t.used_at = datetime.utcnow()


def ultimo_convite(db: Session, user: User) -> Optional[UserAccessToken]:
    return (_pendentes(db, user, "convite").order_by(UserAccessToken.id.desc()).first())


def status_do_acesso(db: Session, user: User) -> str:
    """ativo | convite_pendente | convite_expirado | desativado"""
    if not user.is_active:
        return "desativado"
    if user.last_login_at:
        return "ativo"
    convite = ultimo_convite(db, user)
    if convite is None:
        return "ativo"
    return "convite_pendente" if convite.expires_at >= datetime.utcnow() else "convite_expirado"
```

- [ ] **Step 3:** Run → todos os testes de `test_acessos_tokens.py` passam.
- [ ] **Step 4: Commit** — `feat(acessos): tokens de uso único para convite e redefinição`

---

## Task 4: Criar login (convite ou senha) — serviço único

**Files:**
- Create: `backend/app/schemas/acessos.py`, `backend/app/services/criacao_de_login.py`
- Test: `backend/tests/unit/test_acessos_tokens.py` (acrescentar)

- [ ] **Step 1: Schemas comuns** (`backend/app/schemas/acessos.py`)

```python
"""Schemas de acesso (convite por e-mail, senha inicial, definir senha) usados no CRM todo."""
from typing import Literal, Optional

from pydantic import BaseModel, Field, model_validator

Modo = Literal["convite", "senha"]
Status = Literal["ativo", "convite_pendente", "convite_expirado", "desativado"]


class ModoDeAcesso(BaseModel):
    """Convite (a pessoa cria a senha pelo link) ou senha inicial (troca no 1º login)."""
    modo: Modo = "convite"
    password: Optional[str] = Field(None, min_length=8, max_length=128)

    @model_validator(mode="after")
    def _senha_quando_precisa(self):
        if self.modo == "senha" and not self.password:
            raise ValueError("Informe a senha inicial (mínimo 8 caracteres).")
        return self


class ConviteRequest(BaseModel):
    enviar: bool = True  # False = só gerar o link para "Copiar link"


class ConviteResponse(BaseModel):
    status_acesso: Status
    link: Optional[str] = None
    email_enviado: bool = False


class DefinirSenhaRequest(BaseModel):
    token: str = Field(..., min_length=10)
    nova_senha: str = Field(..., min_length=8, max_length=128)


class TokenInfoResponse(BaseModel):
    valido: bool
    kind: Optional[Literal["convite", "redefinir"]] = None
    nome: Optional[str] = None
    email: Optional[str] = None
```

- [ ] **Step 2: Testes que falham** — acrescente em `test_acessos_tokens.py`:

```python
import pytest
from fastapi import HTTPException

from app.services import criacao_de_login


@pytest.fixture
def emails(monkeypatch):
    enviados = []
    monkeypatch.setattr(envio_email, "enviar_email",
                        lambda para, assunto, html, texto=None: enviados.append((para, assunto)) or True)
    return enviados


def test_criar_por_convite_envia_email_e_nao_tem_senha_conhecida(db, emails):
    autor = usuario(db, "admin", "adm@hs.com")
    r = criacao_de_login.criar_login(db, autor, nome="Ana", email="Ana@Dmap.com", papel="partner", modo="convite")

    assert r.user.email == "ana@dmap.com" and r.email_enviado and r.link is None
    assert emails == [("ana@dmap.com", "Seu acesso ao HSGrowth CRM")]
    assert r.user.must_change_password is False
    assert tokens.status_do_acesso(db, r.user) == "convite_pendente"


def test_criar_com_senha_obriga_trocar(db, emails):
    autor = usuario(db, "admin", "adm@hs.com")
    r = criacao_de_login.criar_login(db, autor, nome="Bia", email="bia@hs.com", papel="finance",
                                     modo="senha", senha="Senha@123")
    assert r.user.must_change_password is True and emails == []


def test_email_repetido_recusa(db, emails):
    autor = usuario(db, "admin", "adm@hs.com")
    with pytest.raises(HTTPException) as e:
        criacao_de_login.criar_login(db, autor, nome="X", email="ADM@hs.com", papel="finance", modo="convite")
    assert e.value.status_code == 400


def test_copiar_link_nao_envia_email(db, emails):
    autor = usuario(db, "admin", "adm@hs.com")
    r = criacao_de_login.criar_login(db, autor, nome="Ana", email="ana@dmap.com", papel="partner", modo="convite")
    emails.clear()
    r2 = criacao_de_login.enviar_convite(db, autor, r.user, enviar=False)
    assert r2.link.startswith(settings.FRONTEND_URL.rstrip("/") + "/definir-senha?token=") and emails == []
```

Run → FAIL.

- [ ] **Step 3: Implementar `backend/app/services/criacao_de_login.py`**

```python
"""
Criação de login no CRM, igual nas 3 telas (Usuários, Acessos ao CRM, Equipe do parceiro).

- modo "convite": senha aleatória que ninguém conhece + link de 7 dias por e-mail;
- modo "senha": quem cria define a senha e a pessoa troca no 1º login.
Faz o commit (o e-mail só sai depois que o convite está gravado).
"""
import secrets
from dataclasses import dataclass
from typing import Any, Dict, Optional

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.role import Role
from app.models.user import User
from app.services import emails_de_acesso, envio_email
from app.services import tokens_de_acesso as tokens


@dataclass
class Resultado:
    user: User
    link: Optional[str]
    email_enviado: bool


def criar_login(db: Session, autor: Optional[User], *, nome: str, email: str, papel: str, modo: str,
                senha: Optional[str] = None, partner_id: Optional[int] = None,
                extras: Optional[Dict[str, Any]] = None) -> Resultado:
    email = email.strip().lower()
    if db.query(User).filter(func.lower(User.email) == email).first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Email já cadastrado")
    role = db.query(Role).filter(Role.name == papel).first()
    if not role:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Role '{papel}' não existe. Rode as migrations.")
    if modo == "senha" and not senha:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Informe a senha inicial.")

    user = User(
        name=nome.strip(), email=email, role_id=role.id, partner_id=partner_id, is_active=True,
        password_hash=hash_password(senha if modo == "senha" else secrets.token_urlsafe(24)),
        is_verified=modo == "senha", must_change_password=modo == "senha",
        **(extras or {}),
    )
    db.add(user)
    db.flush()
    if modo == "senha":
        db.commit()
        db.refresh(user)
        return Resultado(user, None, False)
    return enviar_convite(db, autor, user, enviar=True)


def enviar_convite(db: Session, autor: Optional[User], user: User, enviar: bool) -> Resultado:
    """Gera um convite novo (o anterior deixa de valer). enviar=False só devolve o link."""
    if user.last_login_at:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                            "Esta pessoa já entrou no CRM. Use \"Esqueci minha senha\".")
    if not user.is_active:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Acesso desativado. Reative antes de convidar.")
    token = tokens.criar(db, user, "convite", autor)
    expira_em = tokens.ultimo_convite(db, user).expires_at
    db.commit()
    db.refresh(user)
    url = tokens.link(token)
    if not enviar:
        return Resultado(user, url, False)
    assunto, html, texto = emails_de_acesso.convite(
        user.name, autor.name if autor else "A Health & Safety", url, expira_em)
    return Resultado(user, None, envio_email.enviar_email(user.email, assunto, html, texto))
```

- [ ] **Step 4:** Run → passam.
- [ ] **Step 5: Commit** — `feat(acessos): serviço único de criação de login por convite ou senha`

---

## Task 5: Auth — login, definir senha, esqueci senha, troca obrigatória

**Files:**
- Modify: `backend/app/api/v1/endpoints/auth.py` (`login` ~94-201, `forgot_password` ~560-595, `reset_password` ~647-719)
- Modify: `backend/app/api/deps.py` (`get_current_active_user` ~180-211)
- Modify: `backend/app/schemas/user.py` (`UserResponse`, `ChangePasswordRequest`), `backend/app/api/v1/endpoints/users.py` (`get_current_user_data` ~146-170)
- Modify: `backend/app/services/user_service.py` (`change_password` ~248-281), `backend/app/api/v1/endpoints/admin.py` (reset ~205-294)
- Test: `backend/tests/unit/test_acessos_senha.py`

- [ ] **Step 1: Testes que falham** (`backend/tests/unit/test_acessos_senha.py`)

```python
"""Login, troca obrigatória, definir senha (convite/redefinição) e esqueci minha senha."""
import pytest

from app.core.security import hash_password
from app.services import envio_email
from app.services import tokens_de_acesso as tokens
from tests.unit.apoio_parcerias import headers, usuario

AUTH = "/api/v1/auth"


@pytest.fixture
def emails(monkeypatch):
    enviados = []
    monkeypatch.setattr(envio_email, "enviar_email",
                        lambda para, assunto, html, texto=None: enviados.append((para, assunto, html)) or True)
    return enviados


def _entrar(client, email, senha="Senha@12345"):
    return client.post(f"{AUTH}/login", json={"email": email, "password": senha})


def test_login_sem_diferenca_de_maiusculas(client, db):
    usuario(db, "salesperson", "ana@hs.com")
    assert _entrar(client, "ANA@hs.com").status_code == 200


def test_senha_definida_por_outro_obriga_trocar(client, db):
    u = usuario(db, "partner", "p@dmap.com")
    u.must_change_password = True
    db.commit()
    h = headers(u)

    r = _entrar(client, "p@dmap.com")
    assert r.json()["user"]["must_change_password"] is True
    assert client.get("/api/v1/users/me", headers=h).json()["must_change_password"] is True
    assert client.get("/api/v1/parcerias/parceiros", headers=h).status_code == 403

    troca = client.post("/api/v1/users/me/change-password", headers=h,
                        json={"current_password": "Senha@12345", "new_password": "Nova@12345"})
    assert troca.status_code == 200
    db.refresh(u)
    assert u.must_change_password is False


def test_definir_senha_pelo_convite(client, db):
    u = usuario(db, "partner", "p@dmap.com")
    t = tokens.criar(db, u, "convite"); db.commit()

    info = client.get(f"{AUTH}/token/{t}").json()
    assert info == {"valido": True, "kind": "convite", "nome": "p", "email": "p@dmap.com"}

    assert client.post(f"{AUTH}/definir-senha", json={"token": t, "nova_senha": "Minha@123"}).status_code == 200
    assert _entrar(client, "p@dmap.com", "Minha@123").status_code == 200
    assert client.post(f"{AUTH}/definir-senha", json={"token": t, "nova_senha": "Outra@123"}).status_code == 400
    assert client.get(f"{AUTH}/token/{t}").json()["valido"] is False


def test_esqueci_minha_senha(client, db, emails):
    usuario(db, "salesperson", "ana@hs.com")

    ok = client.post(f"{AUTH}/forgot-password", json={"email": "ana@hs.com"})
    nada = client.post(f"{AUTH}/forgot-password", json={"email": "ninguem@hs.com"})

    assert ok.json() == nada.json()  # não revela quem tem cadastro
    assert [e[0] for e in emails] == ["ana@hs.com"]
    token = emails[0][2].split("definir-senha?token=")[1].split('"')[0]
    assert client.post(f"{AUTH}/definir-senha", json={"token": token, "nova_senha": "Nova@1234"}).status_code == 200


def test_reset_do_admin_obriga_trocar(client, db, admin_headers):
    u = usuario(db, "salesperson", "ana@hs.com")
    r = client.put(f"/api/v1/admin/users/{u.id}/reset-password?generate_temp=true", headers=admin_headers)
    assert r.status_code == 200
    db.refresh(u)
    assert u.must_change_password is True
```

> Confira a rota exata do reset do admin em `backend/app/api/v1/endpoints/admin.py` (~205)
> e ajuste a URL/corpo do último teste se necessário.

Run → FAIL.

- [ ] **Step 2: Login** — em `auth.py` (`login`): busca sem diferença de maiúsculas e
devolve o campo:

```python
    from sqlalchemy import func  # no topo do arquivo, se ainda não houver
    user = db.query(User).filter(
        func.lower(User.email) == login_data.email.strip().lower(),
        User.is_deleted == False
    ).first()
```

e no `user_data`: `"must_change_password": bool(user.must_change_password),`.

- [ ] **Step 3: Definir senha (convite e redefinição)** — em `auth.py`, novas rotas e uma
função comum; troque o corpo do `reset_password` para chamar a mesma função:

```python
from app.schemas.acessos import DefinirSenhaRequest, TokenInfoResponse
from app.services import emails_de_acesso, envio_email
from app.services import tokens_de_acesso as tokens


def _definir_senha(db: Session, token: str, nova_senha: str, request: Request) -> None:
    t = tokens.buscar_valido(db, token)
    if t is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Link inválido ou expirado. Peça um novo.")
    user = t.user
    user.password_hash = hash_password(nova_senha)
    user.password_changed_at = datetime.utcnow()
    user.must_change_password = False
    user.is_verified = True
    tokens.invalidar_pendentes(db, user)  # inclui o próprio token
    db.add(AuditLog(user_id=user.id, action="PASSWORD_SET", entity_type="User", entity_id=user.id,
                    description=f"Senha definida pelo link ({t.kind}): {user.email}",
                    ip_address=request.client.host if request.client else None,
                    user_agent=request.headers.get("user-agent")))
    db.commit()


@router.get("/token/{token}", response_model=TokenInfoResponse, summary="Conferir link de senha")
async def conferir_token(token: str, db: Session = Depends(get_db)) -> Any:
    t = tokens.buscar_valido(db, token)
    if t is None:
        return TokenInfoResponse(valido=False)
    return TokenInfoResponse(valido=True, kind=t.kind, nome=t.user.name, email=t.user.email)


@router.post("/definir-senha", summary="Criar ou redefinir a senha pelo link")
async def definir_senha(request: Request, dados: DefinirSenhaRequest, db: Session = Depends(get_db)) -> Any:
    _definir_senha(db, dados.token, dados.nova_senha, request)
    return {"message": "Senha definida. Já pode entrar no CRM."}
```

`reset_password` passa a ser:

```python
    _definir_senha(db, reset_data.token, reset_data.new_password, request)
    return {"message": "Senha alterada com sucesso"}
```

- [ ] **Step 4: Esqueci minha senha** — no `forgot_password`, troque do `# Gera token de reset`
até o `return` por:

```python
    user = db.query(User).filter(
        func.lower(User.email) == request_data.email.strip().lower(), User.is_deleted == False
    ).first()
    resposta = {"message": "Se o email existir, você receberá instruções para reset de senha."}
    if not user or not user.is_active:
        return resposta
    token = tokens.criar(db, user, "redefinir")
    db.commit()
    assunto, html, texto = emails_de_acesso.redefinir(user.name, tokens.link(token))
    envio_email.enviar_email(user.email, assunto, html, texto)
    return resposta
```

- [ ] **Step 5: Troca obrigatória no backend** — em `deps.py`, `get_current_active_user`,
depois da checagem de `is_active`:

```python
    # Senha definida por outra pessoa: até trocar, só login/logout, /users/me e a troca.
    if getattr(current_user, "must_change_password", False):
        caminho = request.url.path
        if not (caminho.startswith("/api/v1/auth/") or caminho in CAMINHOS_COM_SENHA_PENDENTE):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Troque a sua senha para continuar.",
            )
```

e no topo do arquivo, perto de `CAMINHOS_DOS_TRANCADOS`:

```python
CAMINHOS_COM_SENHA_PENDENTE = ("/api/v1/users/me", "/api/v1/users/me/change-password")
```

- [ ] **Step 6: `/users/me` e troca de senha**
  - `schemas/user.py` → `UserResponse` ganha
    `must_change_password: bool = Field(False, ...)` e `partner_id: Optional[int] = Field(None, ...)`;
    `ChangePasswordRequest.new_password` passa a `min_length=8`.
  - `users.py` → `get_current_user_data` passa `must_change_password=current_user.must_change_password`
    e `partner_id=current_user.partner_id`.
  - `user_service.change_password`, depois de gravar o hash novo:
    `user.must_change_password = False` e `tokens_de_acesso.invalidar_pendentes(self.db, user)`.
  - `admin.py` (reset de senha pelo admin): depois de trocar o hash,
    `user.must_change_password = True` e `user.password_changed_at = datetime.utcnow()`.

- [ ] **Step 7:** Run `test_acessos_senha.py` → passa. Run a suíte inteira (algum teste que
troque senha com 6–7 caracteres precisa subir para 8).
- [ ] **Step 8: Commit** — `feat(auth): definir senha por link, esqueci minha senha e troca obrigatória`

---

## Task 6: Tela de Usuários (admin) — convite ou senha, para o CRM todo

**Files:**
- Modify: `backend/app/api/v1/endpoints/users.py` (`POST ""` ~565-620, `_recusar_login_de_parceiro` ~450-462, nova rota de convite, lista)
- Modify: `backend/app/schemas/user.py` (schema de criação com modo)
- Modify: `backend/app/api/v1/endpoints/admin.py` (`POST /admin/users` ~132-202)
- Test: `backend/tests/unit/test_acessos_usuarios.py`

- [ ] **Step 1: Testes que falham**

```python
"""Tela de Usuários: criar por convite ou senha e reenviar convite."""
import pytest

from app.services import envio_email
from tests.unit.apoio_parcerias import role

URL = "/api/v1/users"


@pytest.fixture
def emails(monkeypatch):
    enviados = []
    monkeypatch.setattr(envio_email, "enviar_email", lambda para, *a, **k: enviados.append(para) or True)
    return enviados


def test_admin_convida_o_financeiro(client, db, admin_headers, emails):
    fin = role(db, "finance")
    r = client.post(URL, headers=admin_headers,
                    json={"email": "fin@hs.com", "name": "Fin", "role_id": fin.id, "modo": "convite"})
    assert r.status_code == 201
    assert r.json()["status_acesso"] == "convite_pendente" and r.json()["email_enviado"] is True
    assert emails == ["fin@hs.com"]


def test_admin_cria_com_senha_e_obriga_trocar(client, db, admin_headers):
    fin = role(db, "finance")
    r = client.post(URL, headers=admin_headers, json={
        "email": "fin@hs.com", "name": "Fin", "role_id": fin.id, "modo": "senha", "password": "Senha@123"})
    assert r.status_code == 201 and r.json()["must_change_password"] is True


def test_copiar_link_do_convite(client, db, admin_headers, emails):
    fin = role(db, "finance")
    novo = client.post(URL, headers=admin_headers,
                       json={"email": "fin@hs.com", "name": "Fin", "role_id": fin.id, "modo": "convite"}).json()
    r = client.post(f"{URL}/{novo['id']}/convite", headers=admin_headers, json={"enviar": False})
    assert "/definir-senha?token=" in r.json()["link"]


@pytest.mark.parametrize("papel", ["partner", "partner_member"])
def test_login_de_parceiro_nao_nasce_na_tela_de_usuarios(client, db, admin_headers, papel):
    r = client.post(URL, headers=admin_headers, json={
        "email": "x@dmap.com", "name": "X", "role_id": role(db, papel).id, "modo": "senha", "password": "Senha@123"})
    assert r.status_code == 422
    r2 = client.post("/api/v1/admin/users", headers=admin_headers, json={
        "email": "y@dmap.com", "name": "Y", "role_id": role(db, papel).id, "password": "Senha@123"})
    assert r2.status_code == 422
```

Run → FAIL.

- [ ] **Step 2: Schema** — em `schemas/user.py`:

```python
class UserCreateComModo(BaseModel):
    """Novo usuário pela tela de Usuários: convite por e-mail (padrão) ou senha inicial."""
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=255)
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    phone: Optional[str] = Field(None, max_length=20)
    role_id: int
    modo: Literal["convite", "senha"] = "convite"
    password: Optional[str] = Field(None, min_length=8, max_length=128)


class UsuarioCriadoResponse(UserResponse):
    status_acesso: Optional[str] = None
    email_enviado: bool = False
```

(e `status_acesso: Optional[str] = None` também em `UserResponse`, para a lista.)

- [ ] **Step 3: Endpoint** — em `users.py`, o `POST ""` passa a receber `UserCreateComModo`:

```python
    _recusar_login_de_parceiro(db, user_data.role_id)
    papel = db.query(Role).filter(Role.id == user_data.role_id).first()
    if not papel:
        raise HTTPException(status_code=422, detail="Perfil inválido.")
    r = criacao_de_login.criar_login(
        db, current_user, nome=user_data.name, email=user_data.email, papel=papel.name,
        modo=user_data.modo, senha=user_data.password,
        extras={"username": user_data.username, "phone": user_data.phone},
    )
    # (manter aqui o AuditLog "CREATE" que o endpoint já gravava)
    return UsuarioCriadoResponse(**_user_response(r.user).model_dump(),
                                 status_acesso=tokens_de_acesso.status_do_acesso(db, r.user),
                                 email_enviado=r.email_enviado)
```

> `_user_response(user)` = o mesmo `UserResponse(...)` que o arquivo já monta (extraia para
> uma função e use também em `get_current_user_data`, com `must_change_password` e `partner_id`).

`_recusar_login_de_parceiro`: recusar `papel.name in ("partner", "partner_member")`, com a
mesma mensagem. Chamar também no `POST /admin/users` de `admin.py`.

Nova rota:

```python
@router.post("/{user_id}/convite", response_model=ConviteResponse, summary="Reenviar convite ou copiar o link")
async def convite_usuario(user_id: int, dados: ConviteRequest,
                          current_user: User = Depends(require_role("admin")), db: Session = Depends(get_db)) -> Any:
    alvo = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if not alvo:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    r = criacao_de_login.enviar_convite(db, current_user, alvo, enviar=dados.enviar)
    return ConviteResponse(status_acesso=tokens_de_acesso.status_do_acesso(db, alvo),
                           link=r.link, email_enviado=r.email_enviado)
```

Na listagem de usuários (GET ""), preencher `status_acesso` de cada usuário com
`tokens_de_acesso.status_do_acesso(db, u)`.

- [ ] **Step 4:** Run → passa; suíte inteira (os testes atuais de `POST /users` mandam
`password` sem `modo`: como o padrão é `convite`, ajuste-os para `"modo": "senha"` quando
eles dependem de entrar com a senha).
- [ ] **Step 5: Commit** — `feat(usuarios): criar usuário por convite ou senha e reenviar convite`

---

## Task 7: Parcerias — acesso do dono do parceiro por convite ou senha

**Files:**
- Modify: `backend/app/schemas/parcerias.py` (`AcessoCreate` ~233, `AcessoResponse` ~251)
- Modify: `backend/app/services/parcerias/parceiros.py` (`listar_acessos`, `criar_acesso`, `alterar_acesso` ~142-184)
- Modify: `backend/app/services/parcerias/respostas.py` (novo `acesso_out`)
- Modify: `backend/app/api/v1/endpoints/parcerias.py` (~113-128 + rota de convite)
- Test: `backend/tests/unit/test_parcerias_acessos_convite.py`

- [ ] **Step 1: Testes que falham**

```python
"""Acessos ao CRM do dono do parceiro: convite ou senha (Entrega 3)."""
import pytest

from app.services import envio_email
from tests.unit.apoio_parcerias import headers, parceiro, usuario

URL = "/api/v1/parcerias/parceiros"


@pytest.fixture
def emails(monkeypatch):
    enviados = []
    monkeypatch.setattr(envio_email, "enviar_email", lambda para, *a, **k: enviados.append(para) or True)
    return enviados


def test_gestao_convida_o_dono(client, db, manager_headers, emails):
    p = parceiro(db)
    r = client.post(f"{URL}/{p.id}/acessos", headers=manager_headers,
                    json={"name": "Carlos", "email": "carlos@dmap.com", "modo": "convite"})
    assert r.status_code == 201
    assert r.json()["status_acesso"] == "convite_pendente" and r.json()["email_enviado"] is True
    assert emails == ["carlos@dmap.com"]


def test_gestao_cria_o_dono_com_senha(client, db, manager_headers):
    p = parceiro(db)
    r = client.post(f"{URL}/{p.id}/acessos", headers=manager_headers, json={
        "name": "Carlos", "email": "carlos@dmap.com", "modo": "senha", "password": "Senha@123"})
    assert r.status_code == 201 and r.json()["status_acesso"] == "ativo"


def test_reenviar_e_copiar_link(client, db, manager_headers, emails):
    p = parceiro(db)
    novo = client.post(f"{URL}/{p.id}/acessos", headers=manager_headers,
                       json={"name": "Carlos", "email": "carlos@dmap.com"}).json()
    link = client.post(f"{URL}/{p.id}/acessos/{novo['id']}/convite", headers=manager_headers,
                       json={"enviar": False}).json()["link"]
    assert "/definir-senha?token=" in link


def test_parceiro_nao_cria_acesso_de_dono(client, db):
    p = parceiro(db)
    h = headers(usuario(db, "partner", "a@dmap.com", p))
    assert client.post(f"{URL}/{p.id}/acessos", headers=h,
                       json={"name": "X", "email": "x@dmap.com"}).status_code == 403


def test_lista_de_acessos_mostra_so_os_donos(client, db, manager_headers):
    p = parceiro(db)
    usuario(db, "partner", "dono@dmap.com", p)
    usuario(db, "partner_member", "vend@dmap.com", p)
    emails_lista = [a["email"] for a in client.get(f"{URL}/{p.id}/acessos", headers=manager_headers).json()]
    assert emails_lista == ["dono@dmap.com"]
```

Run → FAIL.

- [ ] **Step 2: Schemas** (`schemas/parcerias.py`) — `AcessoCreate` passa a herdar o modo:

```python
from app.schemas.acessos import ModoDeAcesso


class AcessoCreate(ModoDeAcesso):
    name: str = Field(..., min_length=1, max_length=255)
    email: str = Field(..., min_length=3, max_length=255)

    @field_validator("email")
    @classmethod
    def _validar_email(cls, valor: str) -> str:
        valor = (valor or "").strip().lower()
        if not email_aceito(valor):
            raise ValueError("E-mail inválido")
        return valor


class AcessoResponse(BaseModel):
    id: int
    name: str
    email: str
    is_active: bool
    last_login_at: Optional[datetime] = None
    status_acesso: str = "ativo"

    model_config = {"from_attributes": True}


class AcessoCriadoResponse(AcessoResponse):
    email_enviado: bool = False
```

- [ ] **Step 3: Serviço** (`parceiros.py`) — `criar_acesso` usa o serviço único;
`listar_acessos` mostra só os donos:

```python
from app.services import criacao_de_login


def listar_acessos(db: Session, user: User, partner_id: int) -> List[User]:
    acesso.exigir_gestao(user)
    p = acesso.buscar_parceiro(db, user, partner_id)
    return (db.query(User).join(Role, User.role_id == Role.id)
            .filter(User.partner_id == p.id, User.is_deleted.is_(False), Role.name == "partner")
            .order_by(User.name).all())


def criar_acesso(db: Session, user: User, partner_id: int, dados: AcessoCreate) -> criacao_de_login.Resultado:
    acesso.exigir_gestao(user)
    p = acesso.buscar_parceiro(db, user, partner_id)
    atividades.registrar_evento(db, user, f"Acesso criado para {dados.email}", partner_id=p.id)
    return criacao_de_login.criar_login(db, user, nome=dados.name, email=dados.email, papel="partner",
                                        modo=dados.modo, senha=dados.password, partner_id=p.id)


def convidar_acesso(db: Session, user: User, partner_id: int, user_id: int,
                    enviar: bool) -> criacao_de_login.Resultado:
    acesso.exigir_gestao(user)
    p = acesso.buscar_parceiro(db, user, partner_id)
    login = db.query(User).filter(User.id == user_id, User.partner_id == p.id).first()
    if not login:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Acesso não encontrado.")
    return criacao_de_login.enviar_convite(db, user, login, enviar)
```

(apague o `hash_password`/`Role` antigos de `criar_acesso` que ficarem sem uso.)

- [ ] **Step 4: Resposta** (`respostas.py`):

```python
from app.services import tokens_de_acesso


def acesso_out(db: Session, login: User, email_enviado: bool = False) -> AcessoCriadoResponse:
    return AcessoCriadoResponse.model_validate(login).model_copy(update={
        "status_acesso": tokens_de_acesso.status_do_acesso(db, login), "email_enviado": email_enviado,
    })
```

- [ ] **Step 5: Endpoints** (`endpoints/parcerias.py`):

```python
@router.get("/parceiros/{partner_id}/acessos", response_model=List[AcessoResponse])
def listar_acessos(partner_id: int, db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_active_user)):
    return [respostas.acesso_out(db, u) for u in parceiros.listar_acessos(db, current_user, partner_id)]


@router.post("/parceiros/{partner_id}/acessos", response_model=AcessoCriadoResponse, status_code=201)
def criar_acesso(partner_id: int, dados: AcessoCreate, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_active_user)):
    r = parceiros.criar_acesso(db, current_user, partner_id, dados)
    return respostas.acesso_out(db, r.user, r.email_enviado)


@router.post("/parceiros/{partner_id}/acessos/{user_id}/convite", response_model=ConviteResponse)
def convidar_acesso(partner_id: int, user_id: int, dados: ConviteRequest, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_active_user)):
    r = parceiros.convidar_acesso(db, current_user, partner_id, user_id, dados.enviar)
    return ConviteResponse(status_acesso=tokens_de_acesso.status_do_acesso(db, r.user),
                           link=r.link, email_enviado=r.email_enviado)
```

O `PUT .../acessos/{user_id}` passa a devolver `respostas.acesso_out(db, ...)`.

- [ ] **Step 6:** Run `test_parcerias_acessos_convite.py` e os testes antigos de acessos
(`grep -rl "acessos" backend/tests/unit`) — os antigos mandam `password` sem `modo`:
acrescente `"modo": "senha"`.
- [ ] **Step 7: Commit** — `feat(parcerias): acesso do dono do parceiro por convite ou senha`

---

## Task 8: Perfil novo `partner_member` — regras no backend

**Files:**
- Modify: `backend/app/api/deps.py` (`PERFIS_TRANCADOS`, `require_parcerias_access`, `require_consulta_cnpj`)
- Modify: `backend/app/services/parcerias/acesso.py`, `oportunidades.py` (`criar` ~98, `atualizar` ~133),
  `atividades.py` (~101), `consultas.py` (~37, 56, 64), `respostas.py` (~107, 154)
- Test: `backend/tests/unit/test_parcerias_vendedor_parceiro.py`

- [ ] **Step 1: Testes que falham**

```python
"""Vendedor do parceiro (partner_member): só as próprias oportunidades (Entrega 3)."""
from app.models.partner import PartnerTeamMember
from tests.unit.apoio_parcerias import CNPJ_B, headers, oportunidade, parceiro, usuario

URL = "/api/v1/parcerias"
NOVA = {
    "title": "Etilômetros", "deal_type": "Nova Venda", "sector": "Indústrias de Transformação",
    "relationship_type": "Prospect", "context": "Frota", "cnpj": CNPJ_B, "company_name": "Empresa B",
}


def _vendedor(db, p, email="v1@dmap.com"):
    login = usuario(db, "partner_member", email, p)
    membro = PartnerTeamMember(partner_id=p.id, name=email.split("@")[0], email=email, user_id=login.id)
    db.add(membro); db.commit(); db.refresh(membro)
    return login, membro


def test_ve_so_as_proprias(client, db):
    p = parceiro(db)
    eu, meu = _vendedor(db, p)
    _, outro = _vendedor(db, p, "v2@dmap.com")
    minha = oportunidade(db, p, seller_member_id=meu.id)
    dele = oportunidade(db, p, seller_member_id=outro.id, title="Outra")
    h = headers(eu)

    ids = [o["id"] for o in client.get(f"{URL}/oportunidades", headers=h).json()]
    assert ids == [minha.id]
    assert client.get(f"{URL}/oportunidades/{dele.id}", headers=h).status_code == 404


def test_cria_e_nasce_como_vendedor(client, db):
    p = parceiro(db)
    eu, meu = _vendedor(db, p)
    r = client.post(f"{URL}/oportunidades", headers=headers(eu), json=NOVA)
    assert r.status_code == 201
    assert (r.json()["partner_id"], r.json()["seller_member_id"]) == (p.id, meu.id)


def test_nao_troca_o_vendedor(client, db):
    p = parceiro(db)
    eu, meu = _vendedor(db, p)
    _, outro = _vendedor(db, p, "v2@dmap.com")
    op = oportunidade(db, p, seller_member_id=meu.id)
    r = client.put(f"{URL}/oportunidades/{op.id}", headers=headers(eu), json={"seller_member_id": outro.id})
    assert r.status_code == 422


def test_dono_troca_o_vendedor_e_o_antigo_perde_a_visao(client, db):
    p = parceiro(db)
    dono = usuario(db, "partner", "dono@dmap.com", p)
    eu, meu = _vendedor(db, p)
    _, outro = _vendedor(db, p, "v2@dmap.com")
    op = oportunidade(db, p, seller_member_id=meu.id)
    assert client.put(f"{URL}/oportunidades/{op.id}", headers=headers(dono),
                      json={"seller_member_id": outro.id}).status_code == 200
    assert client.get(f"{URL}/oportunidades/{op.id}", headers=headers(eu)).status_code == 404


def test_nao_ve_aquisicao_nem_equipe(client, db):
    p = parceiro(db)
    eu, _ = _vendedor(db, p)
    h = headers(eu)
    assert client.get(f"{URL}/parceiros/{p.id}", headers=h).status_code == 404
    assert client.get(f"{URL}/parceiros/{p.id}/equipe", headers=h).status_code == 404
    assert client.get(f"{URL}/parceiros", headers=h).json() == []


def test_trancado_fora_de_parcerias_e_usa_consulta_cnpj(client, db):
    p = parceiro(db)
    eu, _ = _vendedor(db, p)
    h = headers(eu)
    assert client.get("/api/v1/clients", headers=h).status_code == 403
    assert client.get(f"{URL}/consulta-cnpj/resumo", headers=h).status_code == 200
```

> Confira o caminho exato do resumo da Consulta de CNPJ em `endpoints/` (prefixo
> `/parcerias/consulta-cnpj`) e ajuste o último assert se necessário.

Run → FAIL.

- [ ] **Step 2: `deps.py`**

```python
PERFIS_TRANCADOS = ("partner", "partner_member", "finance")
```

e acrescente `"partner_member"` em `allowed_roles` de `require_parcerias_access` e de
`require_consulta_cnpj`.

- [ ] **Step 3: `acesso.py`** — perfis externos e o filtro do vendedor:

```python
from app.models.partner import Partner, PartnerTeamMember

PARCEIRO_DONO = "partner"
PARCEIRO_VENDEDOR = "partner_member"


def eh_parceiro(user: User) -> bool:
    """Login do lado do parceiro (dono ou vendedor da equipe)."""
    return perfil(user) in (PARCEIRO_DONO, PARCEIRO_VENDEDOR)


def eh_dono_do_parceiro(user: User) -> bool:
    return perfil(user) == PARCEIRO_DONO


def eh_vendedor_do_parceiro(user: User) -> bool:
    return perfil(user) == PARCEIRO_VENDEDOR


def membro_do_login(db: Session, user: User) -> PartnerTeamMember:
    m = db.query(PartnerTeamMember).filter(
        PartnerTeamMember.user_id == user.id, PartnerTeamMember.partner_id == parceiro_do_login(user)
    ).first()
    if not m:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Login de vendedor sem cadastro na equipe do parceiro.")
    return m
```

Em `parceiros_visiveis`, antes do `if eh_parceiro(user)`:

```python
    if eh_vendedor_do_parceiro(user):
        return q.filter(Partner.id == -1)  # o vendedor não vê o card de Aquisição
```

Em `oportunidades_visiveis`, antes do `if eh_parceiro(user)`:

```python
    if eh_vendedor_do_parceiro(user):
        return q.filter(PartnerOpportunity.partner_id == parceiro_do_login(user),
                        PartnerOpportunity.seller_member_id == membro_do_login(db, user).id)
```

> `eh_parceiro` passa a valer para os dois. Os usos atuais (`atividades.py:101`,
> `consultas.py:37/56/64`, `oportunidades.py:100`, `respostas.py:107/154`) significam "lado
> do parceiro" e continuam certos com a nova definição — revise um por um para confirmar.

- [ ] **Step 4: `oportunidades.py`**
  - `criar`: logo depois de `partner_id = acesso.parceiro_do_login(user)`:

```python
        if acesso.eh_vendedor_do_parceiro(user):
            dados = dados.model_copy(update={"seller_member_id": acesso.membro_do_login(db, user).id})
```

  - `atualizar`: antes do `if "seller_member_id" in campos:` existente:

```python
    if "seller_member_id" in campos and acesso.eh_vendedor_do_parceiro(user) \
            and campos["seller_member_id"] != op.seller_member_id:
        raise _422("Só o dono do parceiro ou a H&S trocam o vendedor da oportunidade.")
```

- [ ] **Step 5:** Run `test_parcerias_vendedor_parceiro.py` → passa; suíte inteira.
- [ ] **Step 6: Commit** — `feat(parcerias): perfil vendedor do parceiro vê só as próprias oportunidades`

---

## Task 9: Equipe → Dar acesso ao vendedor (dono ou gestão)

**Files:**
- Modify: `backend/app/schemas/parcerias.py` (`MembroResponse` ~222 + `AcessoMembroCreate`)
- Modify: `backend/app/services/parcerias/parceiros.py` (equipe ~108-137)
- Modify: `backend/app/services/parcerias/respostas.py` (`membro_out`)
- Modify: `backend/app/api/v1/endpoints/parcerias.py` (equipe ~95-110)
- Test: `backend/tests/unit/test_parcerias_vendedor_parceiro.py` (acrescentar)

- [ ] **Step 1: Testes que falham** — acrescente:

```python
import pytest
from app.services import envio_email


@pytest.fixture
def emails(monkeypatch):
    enviados = []
    monkeypatch.setattr(envio_email, "enviar_email", lambda para, *a, **k: enviados.append(para) or True)
    return enviados


def test_dono_da_acesso_ao_vendedor_por_convite(client, db, emails):
    p = parceiro(db)
    h = headers(usuario(db, "partner", "dono@dmap.com", p))
    m = client.post(f"{URL}/parceiros/{p.id}/equipe", headers=h,
                    json={"name": "Vini", "email": "vini@dmap.com"}).json()

    r = client.post(f"{URL}/parceiros/{p.id}/equipe/{m['id']}/acesso", headers=h, json={"modo": "convite"})

    assert r.status_code == 201
    assert r.json()["status_acesso"] == "convite_pendente" and emails == ["vini@dmap.com"]
    equipe = client.get(f"{URL}/parceiros/{p.id}/equipe", headers=h).json()
    assert equipe[0]["user_id"] and equipe[0]["status_acesso"] == "convite_pendente"


def test_vendedor_sem_email_nao_ganha_acesso(client, db):
    p = parceiro(db)
    h = headers(usuario(db, "partner", "dono@dmap.com", p))
    m = client.post(f"{URL}/parceiros/{p.id}/equipe", headers=h, json={"name": "Sem email"}).json()
    r = client.post(f"{URL}/parceiros/{p.id}/equipe/{m['id']}/acesso", headers=h,
                    json={"modo": "senha", "password": "Senha@123"})
    assert r.status_code == 422


def test_desativar_o_membro_desativa_o_login(client, db):
    p = parceiro(db)
    h = headers(usuario(db, "partner", "dono@dmap.com", p))
    eu, meu = _vendedor(db, p)
    client.put(f"{URL}/parceiros/{p.id}/equipe/{meu.id}", headers=h, json={"is_active": False})
    db.refresh(eu)
    assert eu.is_active is False
    assert client.get(f"{URL}/oportunidades", headers=headers(eu)).status_code == 403
```

Run → FAIL.

- [ ] **Step 2: Schemas**

```python
class AcessoMembroCreate(ModoDeAcesso):
    """Login do vendedor da equipe: usa o nome e o e-mail cadastrados no membro."""


class MembroResponse(BaseModel):
    id: int
    partner_id: int
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool
    user_id: Optional[int] = None
    status_acesso: Optional[str] = None  # None = sem login

    model_config = {"from_attributes": True}
```

- [ ] **Step 3: Serviço** (`parceiros.py`)

```python
def _membro(db: Session, p: Partner, membro_id: int) -> PartnerTeamMember:
    membro = db.query(PartnerTeamMember).filter(
        PartnerTeamMember.id == membro_id, PartnerTeamMember.partner_id == p.id).first()
    if not membro:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Vendedor não encontrado.")
    return membro


def dar_acesso_ao_membro(db: Session, user: User, partner_id: int, membro_id: int,
                         dados: AcessoMembroCreate) -> criacao_de_login.Resultado:
    acesso.exigir_escrita(user)
    p = acesso.buscar_parceiro(db, user, partner_id)  # vendedor do parceiro recebe 404
    membro = _membro(db, p, membro_id)
    if membro.user_id:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Este vendedor já tem acesso.")
    if not membro.email:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Cadastre o e-mail do vendedor antes.")
    if not membro.is_active:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Reative o vendedor antes de dar acesso.")
    r = criacao_de_login.criar_login(db, user, nome=membro.name, email=membro.email, papel="partner_member",
                                     modo=dados.modo, senha=dados.password, partner_id=p.id)
    membro.user_id = r.user.id
    atividades.registrar_evento(db, user, f"Acesso criado para o vendedor {membro.name}", partner_id=p.id)
    db.commit()
    return r


def convidar_membro(db: Session, user: User, partner_id: int, membro_id: int,
                    enviar: bool) -> criacao_de_login.Resultado:
    acesso.exigir_escrita(user)
    p = acesso.buscar_parceiro(db, user, partner_id)
    membro = _membro(db, p, membro_id)
    if not membro.user_id:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Este vendedor ainda não tem acesso.")
    login = db.query(User).filter(User.id == membro.user_id).first()
    return criacao_de_login.enviar_convite(db, user, login, enviar)
```

Em `atualizar_membro`, depois do `for campo, valor ...`: se `"is_active"` veio e o membro
tem `user_id`, sincronize o login:

```python
    if "is_active" in mudancas and membro.user_id:
        login = db.query(User).filter(User.id == membro.user_id).first()
        if login:
            login.is_active = membro.is_active
```

(`mudancas = dados.model_dump(exclude_unset=True)` — use no `for` também.)

- [ ] **Step 4: Resposta e endpoints**

`respostas.py`:

```python
def membro_out(db: Session, m: PartnerTeamMember) -> MembroResponse:
    status_acesso = None
    if m.user_id:
        login = db.query(User).filter(User.id == m.user_id).first()
        status_acesso = tokens_de_acesso.status_do_acesso(db, login) if login else None
    return MembroResponse.model_validate(m).model_copy(update={"status_acesso": status_acesso})
```

`endpoints/parcerias.py`: as 3 rotas de equipe passam a devolver `membro_out`; novas:

```python
@router.post("/parceiros/{partner_id}/equipe/{membro_id}/acesso", response_model=ConviteResponse, status_code=201)
def dar_acesso_ao_membro(partner_id: int, membro_id: int, dados: AcessoMembroCreate,
                         db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    r = parceiros.dar_acesso_ao_membro(db, current_user, partner_id, membro_id, dados)
    return ConviteResponse(status_acesso=tokens_de_acesso.status_do_acesso(db, r.user),
                           link=r.link, email_enviado=r.email_enviado)


@router.post("/parceiros/{partner_id}/equipe/{membro_id}/acesso/convite", response_model=ConviteResponse)
def convidar_membro(partner_id: int, membro_id: int, dados: ConviteRequest,
                    db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    r = parceiros.convidar_membro(db, current_user, partner_id, membro_id, dados.enviar)
    return ConviteResponse(status_acesso=tokens_de_acesso.status_do_acesso(db, r.user),
                           link=r.link, email_enviado=r.email_enviado)
```

- [ ] **Step 5:** Run → passa; suíte inteira.
- [ ] **Step 6: Commit** — `feat(parcerias): dono do parceiro dá acesso aos vendedores da equipe`

---

## Task 10: `PUT /users/me` (perfil do próprio usuário)

**Files:**
- Modify: `backend/app/api/v1/endpoints/users.py`, `backend/app/schemas/user.py`
- Test: `backend/tests/unit/test_acessos_senha.py` (acrescentar)

- [ ] **Step 1: Teste**

```python
def test_parceiro_salva_o_proprio_perfil(client, db):
    from tests.unit.apoio_parcerias import parceiro
    u = usuario(db, "partner", "p@dmap.com", parceiro(db))
    r = client.put("/api/v1/users/me", headers=headers(u), json={"name": "Paulo", "phone": "11999990000"})
    assert r.status_code == 200 and r.json()["name"] == "Paulo"
```

- [ ] **Step 2: Implementar** — schema `UserMeUpdate(name?, phone?, avatar_url?, email_signature?)`
e a rota (declare **antes** de `@router.put("/{user_id}")`):

```python
@router.put("/me", response_model=UserResponse, summary="Atualizar o próprio perfil")
async def update_me(dados: UserMeUpdate, current_user: User = Depends(get_current_active_user),
                    db: Session = Depends(get_db)) -> Any:
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(current_user, campo, valor)
    db.commit()
    db.refresh(current_user)
    return _user_response(current_user)
```

- [ ] **Step 3:** Run → passa. **Commit** — `feat(usuarios): rota para o próprio usuário salvar o perfil`

---

## Task 11: Front — telas de senha (definir, esqueci, trocar) e login

**Files:**
- Create: `frontend/src/pages/DefinirSenha.tsx`, `EsqueciSenha.tsx`, `TrocarSenha.tsx`
- Modify: `frontend/src/services/authService.ts`, `frontend/src/types/index.ts`, `frontend/src/router.tsx`,
  `frontend/src/pages/Login.tsx`, `frontend/src/layouts/MainLayout.tsx`

- [ ] **Step 1: Tipos e serviço**
  - `types/index.ts` → `User` ganha `must_change_password?: boolean; partner_id?: number | null;`
    e `"partner_member"` na união de `role` (as duas ocorrências, linhas ~13 e ~773).
  - `authService.ts` — substitua `forgotPassword`, `resetPassword` e `changePassword` por:

```ts
  async conferirToken(token: string) {
    return (await api.get<{ valido: boolean; kind?: "convite" | "redefinir"; nome?: string; email?: string }>(
      `/api/v1/auth/token/${encodeURIComponent(token)}`)).data;
  },
  async definirSenha(token: string, novaSenha: string) {
    await api.post("/api/v1/auth/definir-senha", { token, nova_senha: novaSenha });
  },
  async esqueciSenha(email: string) {
    await api.post("/api/v1/auth/forgot-password", { email });
  },
  async trocarSenha(senhaAtual: string, novaSenha: string) {
    await api.post("/api/v1/users/me/change-password", { current_password: senhaAtual, new_password: novaSenha });
  },
```

  (e remova `userService.changePassword`, que chama uma rota que não existe.)

- [ ] **Step 2: `DefinirSenha.tsx`** — página pública, mesma moldura visual do `Login.tsx`:
  - lê `token` de `useSearchParams`; chama `conferirToken` ao abrir;
  - inválido → "Este link expirou ou já foi usado." + link "Pedir um novo" (→ `/esqueci-senha`);
  - válido → "Olá, {nome}" + e-mail (somente leitura) + Nova senha + Confirmar (mín. 8, iguais);
  - envia `definirSenha` → toast "Senha criada. Faça o login." → `navigate("/login")`.
- [ ] **Step 3: `EsqueciSenha.tsx`** — campo e-mail + "Enviar link"; depois de enviar mostra
  sempre "Se o e-mail estiver cadastrado, enviamos um link válido por 1 hora." + "Voltar ao login".
- [ ] **Step 4: `TrocarSenha.tsx`** — usada pela troca obrigatória (logado): Senha atual
  (a que recebeu), Nova, Confirmar → `trocarSenha` → `getMe()` atualiza o usuário (via
  `updateUser` do `AuthContext`) → `navigate("/")`. Botão "Sair" (logout).
- [ ] **Step 5: Rotas** (`router.tsx`): públicas `/definir-senha`, `/esqueci-senha`
  (junto de `/login`); `/trocar-senha` dentro do `ProtectedRoute`, **fora** do `MainLayout`.
- [ ] **Step 6: Login.tsx** — link "Esqueci minha senha" (→ `/esqueci-senha`) abaixo do botão
  Entrar; ler `?error=` com `useSearchParams` e mostrar:
  `user_not_found` → "Seu e-mail Microsoft não está cadastrado no CRM.",
  `user_inactive` → "Seu usuário está inativo. Fale com o administrador.",
  `microsoft_auth_failed` → "Não foi possível entrar com a Microsoft. Tente de novo."
- [ ] **Step 7: Troca obrigatória** — em `MainLayout.tsx`, antes do redirect dos trancados:

```tsx
  if (user?.must_change_password) return <Navigate to="/trocar-senha" replace />;
```

  e, depois do login com senha (`AuthContext.login`), se `response.user.must_change_password`
  → ir para `/trocar-senha`.
- [ ] **Step 8:** `npx tsc --noEmit -p . && npm run build` → ok. **Commit** —
  `feat(front): definir senha, esqueci minha senha e troca obrigatória`

---

## Task 12: Front — Configurações (trocar senha e salvar perfil)

**Files:** Modify: `frontend/src/pages/Settings.tsx` (aba Perfil; `userService.update` em ~218 e ~378), `frontend/src/services/userService.ts`

- [ ] **Step 1:** `userService.updateMe(dados)` → `PUT /api/v1/users/me`; trocar as chamadas
  de salvar o próprio perfil e a assinatura (`userService.update(user.id, ...)`) por `updateMe`.
- [ ] **Step 2:** Na aba Perfil, seção "Alterar senha" (Senha atual, Nova, Confirmar; mín. 8)
  usando `authService.trocarSenha`; mostrar só para quem entra com senha (para quem entra só
  com Microsoft a seção pode ficar, a troca vale para o login por e-mail e senha).
- [ ] **Step 3:** build ok. **Commit** — `fix(configuracoes): trocar senha e salvar perfil para todos os perfis`

---

## Task 13: Front — componentes de acesso e as 3 telas

**Files:**
- Create: `frontend/src/services/acessosService.ts`, `frontend/src/components/acessos/FormularioDeAcesso.tsx`,
  `StatusDoAcesso.tsx`, `AcoesDoConvite.tsx`
- Modify: `frontend/src/services/parceriasService.ts` (tipos `Acesso`, `Membro`; `criarAcesso`), `pages/parcerias/ParceiroDetalhe.tsx` (Equipe ~287-321, Acessos ~323-357),
  `frontend/src/pages/Users.tsx`, `frontend/src/components/users/UserModal.tsx`, `frontend/src/services/userService.ts`

- [ ] **Step 1: Tipos e serviço comum** (`acessosService.ts`):

```ts
import api from "./api";

export type StatusAcesso = "ativo" | "convite_pendente" | "convite_expirado" | "desativado";
export type ModoAcesso = "convite" | "senha";
export interface ConviteResposta { status_acesso: StatusAcesso; link?: string | null; email_enviado: boolean }

/** Reenviar (enviar=true) ou só gerar o link para copiar (enviar=false). */
export async function convite(url: string, enviar: boolean) {
  return (await api.post<ConviteResposta>(url, { enviar })).data;
}
```

  `parceriasService.ts`: `Acesso` ganha `status_acesso: StatusAcesso`; `Membro` ganha
  `user_id?: number | null; status_acesso?: StatusAcesso | null`; `criarAcesso(id, { name, email, modo, password? })`;
  novos `darAcessoAoMembro(id, membroId, { modo, password? })`, `urlConviteAcesso(id, userId)` e
  `urlConviteMembro(id, membroId)` (montam as URLs das rotas de convite).

- [ ] **Step 2: `StatusDoAcesso.tsx`** — selo: Ativo (verde), Convite pendente (amarelo),
  Convite expirado (vermelho), Desativado (cinza). Mesmo estilo dos selos já usados nos cards.

- [ ] **Step 3: `FormularioDeAcesso.tsx`** — usado nas 3 telas:
  - props: `pedirNomeEmail: boolean` (Equipe usa os dados do membro), `onEnviar({ name?, email?, modo, password? })`;
  - escolha "Enviar convite por e-mail" (padrão) / "Definir senha inicial";
  - no modo senha: campo senha (mín. 8) + aviso "A pessoa troca a senha no 1º login".
- [ ] **Step 4: `AcoesDoConvite.tsx`** — para status `convite_pendente`/`convite_expirado`:
  botões **Reenviar** (`convite(url, true)` → toast "Convite reenviado" ou, se
  `email_enviado` falso, "Não conseguimos enviar o e-mail. Use Copiar link.") e **Copiar link**
  (`convite(url, false)` → `navigator.clipboard.writeText(link)` → toast "Link copiado. Ele
  vale 7 dias e só pode ser usado uma vez.").
- [ ] **Step 5: ParceiroDetalhe.tsx**
  - **Acessos ao CRM** (só gestão): troque o formulário atual por `FormularioDeAcesso`; cada
    linha mostra `StatusDoAcesso` + `AcoesDoConvite` + Desativar/Reativar (já existe).
    Depois de criar por convite sem e-mail enviado, mostre o aviso de "Copiar link".
  - **Equipe** (dono do parceiro e gestão): cada vendedor com e-mail e sem login ganha
    "Dar acesso" (abre `FormularioDeAcesso` com `pedirNomeEmail=false`); com login mostra
    `StatusDoAcesso` + `AcoesDoConvite`. Desativar o vendedor avisa "O acesso dele ao CRM
    também será desativado."
- [ ] **Step 6: Usuários** — `UserModal.tsx` (criação): `FormularioDeAcesso` no lugar dos campos
  de senha (a edição continua igual); a opção "Vendedor do parceiro" **não** entra na lista de
  funções. `Users.tsx`: coluna/selo `StatusDoAcesso` e `AcoesDoConvite` (URL `/api/v1/users/{id}/convite`);
  filtro por função ganha `partner_member` ("Vendedor do parceiro") e o `switch` de rótulos (~219) também.
- [ ] **Step 7:** build ok. **Commit** — `feat(front): convite e senha inicial em Usuários, Acessos ao CRM e Equipe`

---

## Task 14: Front — perfil `partner_member`

**Files:** `frontend/src/constants/parcerias.ts`, `frontend/src/layouts/MainLayout.tsx` (~369),
`pages/parcerias/ParceriasHome.tsx` (~69), `OportunidadesKanban.tsx` (~39), `OportunidadeDetalhe.tsx` (~49, 229),
`components/parcerias/NovaOportunidadeModal.tsx` (~141-148), `frontend/src/router.tsx` (rotas de Aquisição)

- [ ] **Step 1: Constantes**

```ts
export const PERFIS_TRANCADOS = ["partner", "partner_member", "finance"];
export const PERFIS_PARCERIAS = ["admin", "manager", "finance", "partner", "partner_member", "salesperson"];
export const PERFIS_QUE_EDITAM = ["admin", "manager", "partner", "partner_member", "salesperson"];
export const PERFIS_CONSULTA_CNPJ = ["admin", "manager", "salesperson", "sdr", "partner", "partner_member"];
/** Lado do parceiro (dono ou vendedor da equipe). */
export const PERFIS_DO_PARCEIRO = ["partner", "partner_member"];
```

- [ ] **Step 2:** troque as checagens `user?.role === "partner"` que significam "lado do
  parceiro" por `PERFIS_DO_PARCEIRO.includes(user?.role ?? "")` (OportunidadesKanban,
  OportunidadeDetalhe ~49 e ~229, ParceriasHome, MainLayout ~369).
- [ ] **Step 3:** `ParceriasHome`: `partner_member` vai direto para `/parcerias/oportunidades`.
  Rotas `/parcerias/aquisicao*`: guard que manda o `partner_member` para `/parcerias/oportunidades`
  (o backend já devolve 404).
- [ ] **Step 4:** Responsável da oportunidade (`NovaOportunidadeModal` e `OportunidadeDetalhe`):
  para `partner_member`, o campo aparece **desabilitado** com o nome dele (o backend preenche);
  o dono e a gestão continuam escolhendo.
- [ ] **Step 5:** build ok. **Commit** — `feat(front): perfil vendedor do parceiro`

---

## Task 15: Versão, verificação final e homo

- [ ] **Step 1:** versão **1.11.16** nos 3 lugares (CHANGELOG com "### Banco: migration
  `7b8c9d0e1f2a`" e a variável `EMAIL_PROVIDER`).
- [ ] **Step 2:** suíte inteira do backend passando; `npx tsc --noEmit -p . && npm run build`.
- [ ] **Step 3: Commit** — `chore: versão 1.11.16 (Entrega 3 — acessos e login)`
- [ ] **Step 4: Homo** (quem faz o deploy):
  1. variáveis: `EMAIL_PROVIDER` (+ as do provedor escolhido) e conferir `FRONTEND_URL` =
     `https://homo-hsgrowth.healthsafetytech.com` (vai dentro dos links);
  2. subir; no container do homo: `alembic upgrade head` → `alembic current` = `7b8c9d0e1f2a (head)`;
  3. passar pelos **critérios de aceite** da spec (seção 11), com um parceiro de teste.
