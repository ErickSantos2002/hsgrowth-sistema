# Parcerias — Entrega 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a seção Parcerias do CRM (boards Aquisição de Parceiros e Pipeline de Parceiros), os perfis `partner` e `finance` e a tranca geral que prende esses perfis à seção.

**Architecture:** Módulo separado no molde de Serviço: tabelas próprias (`partners`, `partner_team_members`, `partner_opportunities`, `partner_opportunity_products`, `partner_activities`), regras em `app/services/parcerias/` (funções, não classes), rotas em `/api/v1/parcerias`. As etapas são constantes no código; as travas são "acumuladas" (para estar numa etapa, cumpre as exigências de todas as anteriores). A tranca geral fica em `get_current_active_user`: para `partner`/`finance`, tudo fora de uma lista curta de caminhos responde 403.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, pytest (SQLite em memória); React 19 + TypeScript + Vite + Tailwind; arrastar e soltar nativo do HTML5 no kanban.

**Spec:** `docs/superpowers/specs/2026-10-29-parcerias-entrega-1-design.md`

**Comandos:**
- Testes (rodar a partir de `backend/`): `MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest <arquivo> -q -p no:cacheprovider --color=no`
- Typecheck (a partir de `frontend/`): `npx tsc --noEmit -p tsconfig.json`
- Build (a partir de `frontend/`): `npm run build`

**Regras do projeto:** nunca commitar sem perguntar "posso commitar?" ao usuário; a migration só roda em produção com confirmação explícita; o container local aponta para o banco de PRODUÇÃO (não rodar `alembic upgrade` nele sem autorização).

---

## Mapa de arquivos

**Backend — criar**
- `backend/app/models/partner.py` — `Partner` (card do board 1) e `PartnerTeamMember` (Equipe).
- `backend/app/models/partner_opportunity.py` — `PartnerOpportunity` (card do board 2) e `PartnerOpportunityProduct`.
- `backend/app/models/partner_activity.py` — `PartnerActivity` (atividades e histórico dos dois boards).
- `backend/alembic/versions/2026_10_29_1000-1b2c3d4e5f6a_parcerias.py` — tabelas, `users.partner_id`, roles.
- `backend/app/services/parcerias/__init__.py` — pacote.
- `backend/app/services/parcerias/cnpj.py` — dígitos e validação de CNPJ.
- `backend/app/services/parcerias/etapas.py` — etapas fixas, `TravaError`, validação de mudança.
- `backend/app/services/parcerias/acesso.py` — quem vê o quê (filtros por `partner_id`).
- `backend/app/services/parcerias/atividades.py` — atividades e eventos do histórico.
- `backend/app/services/parcerias/ativacao.py` — Ativação → Ativado automático.
- `backend/app/services/parcerias/parceiros.py` — board 1, Equipe e Acessos.
- `backend/app/services/parcerias/oportunidades.py` — board 2, elegibilidade, produtos, catálogo.
- `backend/app/services/parcerias/respostas.py` — montagem das respostas da API.
- `backend/app/schemas/parcerias.py` — schemas Pydantic.
- `backend/app/api/v1/endpoints/parcerias.py` — rotas.
- Testes: `backend/tests/unit/apoio_parcerias.py` e `backend/tests/unit/test_parcerias_*.py`.

**Backend — modificar**
- `backend/app/models/user.py` — coluna `partner_id`.
- `backend/app/models/__init__.py` — importar os modelos novos.
- `backend/app/api/deps.py` — tranca geral e `require_parcerias_access()`.
- `backend/app/api/v1/__init__.py` — registrar o router.
- `backend/app/api/v1/endpoints/users.py` — `GET /users/roles` e recusa de role `partner`.

**Frontend — criar**
- `frontend/src/constants/parcerias.ts`, `frontend/src/services/parceriasService.ts`
- `frontend/src/components/parcerias/KanbanParcerias.tsx`, `ModalTrava.tsx`, `AtividadesParceria.tsx`, `NovoParceiroModal.tsx`, `NovaOportunidadeModal.tsx`
- `frontend/src/pages/parcerias/ParceriasHome.tsx`, `AquisicaoKanban.tsx`, `ParceiroDetalhe.tsx`, `OportunidadesKanban.tsx`, `OportunidadeDetalhe.tsx`

**Frontend — modificar**
- `frontend/src/types/index.ts`, `frontend/src/router.tsx`, `frontend/src/layouts/MainLayout.tsx`, `frontend/src/services/userService.ts`, `frontend/src/components/users/UserModal.tsx`, `frontend/src/pages/Users.tsx`
- Versão: `CHANGELOG.md`, `frontend/src/components/common/ChangelogModal.tsx`, rodapé de `MainLayout.tsx`.

---

### Task 1: Modelos e migration

**Files:**
- Create: `backend/app/models/partner.py`, `backend/app/models/partner_opportunity.py`, `backend/app/models/partner_activity.py`
- Create: `backend/alembic/versions/2026_10_29_1000-1b2c3d4e5f6a_parcerias.py`
- Modify: `backend/app/models/user.py`, `backend/app/models/__init__.py`
- Create: `backend/tests/unit/apoio_parcerias.py`
- Test: `backend/tests/unit/test_parcerias_modelos.py`

- [ ] **Step 1: Escrever o apoio dos testes**

`backend/tests/unit/apoio_parcerias.py`:

```python
"""Apoio dos testes de Parcerias: perfis, logins, parceiros e oportunidades."""
from datetime import date

from app.core.security import create_access_token, hash_password
from app.models.partner import Partner
from app.models.partner_opportunity import PartnerOpportunity
from app.models.role import Role
from app.models.user import User

# CNPJs com dígitos verificadores válidos.
CNPJ_A = "11222333000181"
CNPJ_B = "11444777000161"


def role(db, nome: str) -> Role:
    existente = db.query(Role).filter(Role.name == nome).first()
    if existente:
        return existente
    novo = Role(name=nome, display_name=nome, permissions=[], is_system_role=True)
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return novo


def usuario(db, nome_role: str, email: str, partner: Partner = None) -> User:
    user = User(
        name=email.split("@")[0],
        email=email,
        password_hash=hash_password("Senha@12345"),
        role_id=role(db, nome_role).id,
        partner_id=partner.id if partner else None,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def headers(user: User) -> dict:
    return {"Authorization": f"Bearer {create_access_token(data={'sub': str(user.id)})}"}


def parceiro(db, nome: str = "Dmap", **campos) -> Partner:
    p = Partner(name=nome, **campos)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


def parceiro_pronto(db, nome: str = "Dmap", stage: str = "ativacao") -> Partner:
    """Parceiro com todos os dados que as travas do board 1 pedem."""
    dono = usuario(db, "manager", f"dono-{nome.lower()}@hs.com")
    return parceiro(
        db, nome, stage=stage,
        main_contact_name="Carlos", main_contact_phone="11999990000",
        hs_owner_id=dono.id, qualification_status="aderente",
        onboarding_date=date(2026, 10, 1),
    )


def oportunidade(db, p: Partner, **campos) -> PartnerOpportunity:
    dados = dict(
        title="Etilômetros Empresa A", deal_type="Nova Venda",
        sector="Indústrias de Transformação", relationship_type="Prospect",
        context="Precisa de etilômetros para a frota", cnpj=CNPJ_A,
        company_name="Empresa A",
    )
    dados.update(campos)
    op = PartnerOpportunity(partner_id=p.id, **dados)
    db.add(op)
    db.commit()
    db.refresh(op)
    return op
```

- [ ] **Step 2: Escrever o teste que falha**

`backend/tests/unit/test_parcerias_modelos.py`:

```python
"""As tabelas de Parcerias: parceiro, Equipe, oportunidade, produtos e histórico."""
from app.models.partner import PartnerTeamMember
from app.models.partner_activity import PartnerActivity
from app.models.partner_opportunity import PartnerOpportunityProduct
from app.models.product import Product

from tests.unit.apoio_parcerias import oportunidade, parceiro, usuario


def test_parceiro_com_equipe_oportunidade_produto_e_historico(db):
    p = parceiro(db)
    db.add(PartnerTeamMember(partner_id=p.id, name="Ana"))
    db.commit()
    op = oportunidade(db, p)
    produto = Product(name="Etilômetro", unit_price=1500)
    db.add(produto)
    db.commit()
    db.add(PartnerOpportunityProduct(opportunity_id=op.id, product_id=produto.id, quantity=2, unit_price=1500))
    db.add(PartnerActivity(opportunity_id=op.id, type="nota", description="Primeiro contato"))
    db.commit()
    db.refresh(p)
    db.refresh(op)

    assert p.stage == "potencial"
    assert [m.name for m in p.team] == ["Ana"]
    assert op.partner.name == "Dmap"
    assert op.stage == "novo_lead"
    assert op.eligibility_status == "em_analise"
    assert op.products[0].product.name == "Etilômetro"


def test_login_fica_ligado_ao_parceiro(db):
    p = parceiro(db)
    user = usuario(db, "partner", "contato@dmap.com", p)

    assert user.partner_id == p.id
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest tests/unit/test_parcerias_modelos.py -q -p no:cacheprovider --color=no`
Expected: FAIL com `ModuleNotFoundError: No module named 'app.models.partner'`.

- [ ] **Step 4: Criar os modelos**

`backend/app/models/partner.py`:

```python
"""
Programa de Parceiros — o parceiro e a Equipe dele.

O parceiro (ex.: Dmap) é ao mesmo tempo o canal de aquisição e o card do board
"Aquisição de Parceiros". Tabelas separadas de Vendas e de Serviço: o parceiro
é gente de fora e não pode cruzar com os dados do CRM.
"""
from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.mixins import SoftDeleteMixin, TimestampMixin


class Partner(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "partners"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    cnpj = Column(String(14), nullable=True, index=True)

    main_contact_name = Column(String(255), nullable=True)
    main_contact_phone = Column(String(30), nullable=True)
    main_contact_email = Column(String(255), nullable=True)

    # Texto livre até a H&S definir as opções.
    partner_type = Column(String(100), nullable=True)
    origin = Column(String(100), nullable=True)
    segment = Column(String(255), nullable=True)
    region = Column(String(255), nullable=True)

    hs_owner_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    # aderente | parcialmente_aderente | nao_aderente
    qualification_status = Column(String(30), nullable=True)
    onboarding_date = Column(Date, nullable=True)

    # Primeira evidência de uso do canal: oportunidade_validada | proposta_enviada | primeira_venda
    activation_evidence = Column(String(30), nullable=True)
    activated_at = Column(DateTime, nullable=True)
    # Sem FK de propósito: partner_opportunities já aponta para partners.
    activation_opportunity_id = Column(Integer, nullable=True)

    # Código da etapa (app/services/parcerias/etapas.py) e ordem na coluna.
    stage = Column(String(30), nullable=False, default="potencial", index=True)
    position = Column(Numeric(12, 2), nullable=False, default=0)

    loss_reason = Column(String(255), nullable=True)
    loss_detail = Column(Text, nullable=True)
    lost_at = Column(DateTime, nullable=True)

    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    hs_owner = relationship("User", foreign_keys=[hs_owner_id])
    team = relationship("PartnerTeamMember", back_populates="partner", order_by="PartnerTeamMember.name")

    def __repr__(self):
        return f"<Partner(id={self.id}, name='{self.name}')>"


class PartnerTeamMember(Base, TimestampMixin):
    """Vendedor da equipe do parceiro. O login dele vem numa entrega futura (user_id)."""
    __tablename__ = "partner_team_members"

    id = Column(Integer, primary_key=True, index=True)
    partner_id = Column(Integer, ForeignKey("partners.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    phone = Column(String(30), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    partner = relationship("Partner", back_populates="team")
```

`backend/app/models/partner_opportunity.py`:

```python
"""
Programa de Parceiros — a oportunidade que o parceiro registra (card do board
"Pipeline de Parceiros") e os produtos dela.

Empresa e contato ficam dentro do card: o parceiro não enxerga Clientes nem
Pessoas do CRM. O canal de aquisição é sempre "Parceiros".
"""
from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.mixins import SoftDeleteMixin, TimestampMixin


class PartnerOpportunity(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "partner_opportunities"

    id = Column(Integer, primary_key=True, index=True)
    partner_id = Column(Integer, ForeignKey("partners.id", ondelete="CASCADE"), nullable=False, index=True)
    seller_member_id = Column(Integer, ForeignKey("partner_team_members.id", ondelete="SET NULL"), nullable=True)

    title = Column(String(500), nullable=False)
    deal_type = Column(String(100), nullable=False)
    sector = Column(String(100), nullable=False)
    relationship_type = Column(String(100), nullable=False)
    # Contexto da indicação e necessidade identificada (regra 9 do documento).
    context = Column(Text, nullable=False)

    # Empresa — CNPJ só com dígitos; a Consulta de CNPJ (Entrega 2) busca por ele.
    cnpj = Column(String(14), nullable=False, index=True)
    company_name = Column(String(255), nullable=False)
    company_segment = Column(String(255), nullable=True)
    company_city = Column(String(255), nullable=True)
    company_state = Column(String(2), nullable=True)

    contact_name = Column(String(255), nullable=True)
    contact_role = Column(String(255), nullable=True)
    contact_phone = Column(String(30), nullable=True)
    contact_email = Column(String(255), nullable=True)

    # em_analise | validada | rejeitada — quem valida é o Financeiro (ou admin/gerente).
    eligibility_status = Column(String(20), nullable=False, default="em_analise")
    eligibility_note = Column(Text, nullable=True)
    eligibility_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    eligibility_at = Column(DateTime, nullable=True)

    expected_close_date = Column(Date, nullable=True)
    # venda | locacao
    modality = Column(String(10), nullable=True)
    loss_reason = Column(String(255), nullable=True)
    loss_detail = Column(Text, nullable=True)

    stage = Column(String(30), nullable=False, default="novo_lead", index=True)
    position = Column(Numeric(12, 2), nullable=False, default=0)
    # Criar/concluir atividade e mudar de etapa atualizam. A Entrega 2 usa no semáforo.
    last_activity_at = Column(DateTime, nullable=True, index=True)
    won_at = Column(DateTime, nullable=True)
    lost_at = Column(DateTime, nullable=True)

    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    partner = relationship("Partner")
    seller = relationship("PartnerTeamMember")
    eligibility_by = relationship("User", foreign_keys=[eligibility_by_id])
    products = relationship(
        "PartnerOpportunityProduct",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self):
        return f"<PartnerOpportunity(id={self.id}, title='{self.title}')>"


class PartnerOpportunityProduct(Base, TimestampMixin):
    __tablename__ = "partner_opportunity_products"

    id = Column(Integer, primary_key=True, index=True)
    opportunity_id = Column(
        Integer, ForeignKey("partner_opportunities.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id = Column(Integer, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Numeric(12, 2), nullable=False, default=0)

    product = relationship("Product")
```

`backend/app/models/partner_activity.py`:

```python
"""
Programa de Parceiros — atividades e histórico dos dois boards.

Um registro pertence ao parceiro (board 1) ou à oportunidade (board 2).
O tipo "evento" é gravado pelo sistema (criação, etapa, elegibilidade, ativação).
"""
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class PartnerActivity(Base, TimestampMixin):
    __tablename__ = "partner_activities"

    id = Column(Integer, primary_key=True, index=True)
    partner_id = Column(Integer, ForeignKey("partners.id", ondelete="CASCADE"), nullable=True, index=True)
    opportunity_id = Column(
        Integer, ForeignKey("partner_opportunities.id", ondelete="CASCADE"), nullable=True, index=True
    )
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # nota | ligacao | whatsapp | email | reuniao | tarefa | evento
    type = Column(String(20), nullable=False)
    description = Column(Text, nullable=False)
    due_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", foreign_keys=[user_id])
```

Em `backend/app/models/user.py`, logo depois de `phone = Column(String(20), nullable=True)`:

```python
    # Login de parceiro (role 'partner'): a qual parceiro do Programa de Parceiros pertence.
    # use_alter: partners também aponta para users (hs_owner_id).
    partner_id = Column(
        Integer,
        ForeignKey("partners.id", ondelete="SET NULL", use_alter=True, name="fk_users_partner_id"),
        nullable=True,
        index=True,
    )
```

Em `backend/app/models/__init__.py`, depois do bloco `# Bolinha "concluído" ...`:

```python
# Programa de Parceiros (tabelas independentes de Vendas e de Serviço)
from app.models.partner import Partner, PartnerTeamMember  # noqa
from app.models.partner_opportunity import PartnerOpportunity, PartnerOpportunityProduct  # noqa
from app.models.partner_activity import PartnerActivity  # noqa
```

- [ ] **Step 5: Rodar e ver passar**

Run: `MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest tests/unit/test_parcerias_modelos.py -q -p no:cacheprovider --color=no`
Expected: `2 passed`.

- [ ] **Step 6: Escrever a migration**

`backend/alembic/versions/2026_10_29_1000-1b2c3d4e5f6a_parcerias.py`:

```python
"""Programa de Parceiros: tabelas, users.partner_id e roles partner/finance

Revision ID: 1b2c3d4e5f6a
Revises: 0a1b2c3d4e5f
Create Date: 2026-10-29 10:00:00

Somente acréscimos: nenhuma coluna existente é alterada.
"""
from alembic import op
import sqlalchemy as sa


revision = '1b2c3d4e5f6a'
down_revision = '0a1b2c3d4e5f'
branch_labels = None
depends_on = None


def _timestamps():
    return [
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    ]


def _soft_delete():
    return [
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.false()),
    ]


def upgrade():
    op.execute("""
        INSERT INTO roles (name, display_name, description, permissions, is_system_role, created_at, updated_at)
        VALUES
            ('partner', 'Parceiro',
             'Parceiro do Programa de Parceiros: só a seção Parcerias, com as próprias oportunidades',
             '[]', true, now(), now()),
            ('finance', 'Financeiro',
             'Acompanha a seção Parcerias e valida a elegibilidade das oportunidades',
             '[]', true, now(), now())
        ON CONFLICT (name) DO NOTHING;
    """)

    op.create_table(
        'partners',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('cnpj', sa.String(14), nullable=True),
        sa.Column('main_contact_name', sa.String(255), nullable=True),
        sa.Column('main_contact_phone', sa.String(30), nullable=True),
        sa.Column('main_contact_email', sa.String(255), nullable=True),
        sa.Column('partner_type', sa.String(100), nullable=True),
        sa.Column('origin', sa.String(100), nullable=True),
        sa.Column('segment', sa.String(255), nullable=True),
        sa.Column('region', sa.String(255), nullable=True),
        sa.Column('hs_owner_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('qualification_status', sa.String(30), nullable=True),
        sa.Column('onboarding_date', sa.Date(), nullable=True),
        sa.Column('activation_evidence', sa.String(30), nullable=True),
        sa.Column('activated_at', sa.DateTime(), nullable=True),
        sa.Column('activation_opportunity_id', sa.Integer(), nullable=True),
        sa.Column('stage', sa.String(30), nullable=False, server_default='potencial'),
        sa.Column('position', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('loss_reason', sa.String(255), nullable=True),
        sa.Column('loss_detail', sa.Text(), nullable=True),
        sa.Column('lost_at', sa.DateTime(), nullable=True),
        sa.Column('created_by_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        *_timestamps(),
        *_soft_delete(),
    )
    op.create_index('ix_partners_id', 'partners', ['id'])
    op.create_index('ix_partners_name', 'partners', ['name'])
    op.create_index('ix_partners_cnpj', 'partners', ['cnpj'])
    op.create_index('ix_partners_hs_owner_id', 'partners', ['hs_owner_id'])
    op.create_index('ix_partners_stage', 'partners', ['stage'])

    op.create_table(
        'partner_team_members',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('partner_id', sa.Integer(), sa.ForeignKey('partners.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('phone', sa.String(30), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        *_timestamps(),
    )
    op.create_index('ix_partner_team_members_id', 'partner_team_members', ['id'])
    op.create_index('ix_partner_team_members_partner_id', 'partner_team_members', ['partner_id'])

    op.create_table(
        'partner_opportunities',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('partner_id', sa.Integer(), sa.ForeignKey('partners.id', ondelete='CASCADE'), nullable=False),
        sa.Column('seller_member_id', sa.Integer(),
                  sa.ForeignKey('partner_team_members.id', ondelete='SET NULL'), nullable=True),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('deal_type', sa.String(100), nullable=False),
        sa.Column('sector', sa.String(100), nullable=False),
        sa.Column('relationship_type', sa.String(100), nullable=False),
        sa.Column('context', sa.Text(), nullable=False),
        sa.Column('cnpj', sa.String(14), nullable=False),
        sa.Column('company_name', sa.String(255), nullable=False),
        sa.Column('company_segment', sa.String(255), nullable=True),
        sa.Column('company_city', sa.String(255), nullable=True),
        sa.Column('company_state', sa.String(2), nullable=True),
        sa.Column('contact_name', sa.String(255), nullable=True),
        sa.Column('contact_role', sa.String(255), nullable=True),
        sa.Column('contact_phone', sa.String(30), nullable=True),
        sa.Column('contact_email', sa.String(255), nullable=True),
        sa.Column('eligibility_status', sa.String(20), nullable=False, server_default='em_analise'),
        sa.Column('eligibility_note', sa.Text(), nullable=True),
        sa.Column('eligibility_by_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('eligibility_at', sa.DateTime(), nullable=True),
        sa.Column('expected_close_date', sa.Date(), nullable=True),
        sa.Column('modality', sa.String(10), nullable=True),
        sa.Column('loss_reason', sa.String(255), nullable=True),
        sa.Column('loss_detail', sa.Text(), nullable=True),
        sa.Column('stage', sa.String(30), nullable=False, server_default='novo_lead'),
        sa.Column('position', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('last_activity_at', sa.DateTime(), nullable=True),
        sa.Column('won_at', sa.DateTime(), nullable=True),
        sa.Column('lost_at', sa.DateTime(), nullable=True),
        sa.Column('created_by_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        *_timestamps(),
        *_soft_delete(),
    )
    op.create_index('ix_partner_opportunities_id', 'partner_opportunities', ['id'])
    op.create_index('ix_partner_opportunities_partner_id', 'partner_opportunities', ['partner_id'])
    op.create_index('ix_partner_opportunities_cnpj', 'partner_opportunities', ['cnpj'])
    op.create_index('ix_partner_opportunities_stage', 'partner_opportunities', ['stage'])
    op.create_index('ix_partner_opportunities_last_activity_at', 'partner_opportunities', ['last_activity_at'])

    op.create_table(
        'partner_opportunity_products',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('opportunity_id', sa.Integer(),
                  sa.ForeignKey('partner_opportunities.id', ondelete='CASCADE'), nullable=False),
        sa.Column('product_id', sa.Integer(), sa.ForeignKey('products.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('unit_price', sa.Numeric(12, 2), nullable=False, server_default='0'),
        *_timestamps(),
    )
    op.create_index('ix_partner_opportunity_products_id', 'partner_opportunity_products', ['id'])
    op.create_index('ix_partner_opportunity_products_opportunity_id', 'partner_opportunity_products',
                    ['opportunity_id'])

    op.create_table(
        'partner_activities',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('partner_id', sa.Integer(), sa.ForeignKey('partners.id', ondelete='CASCADE'), nullable=True),
        sa.Column('opportunity_id', sa.Integer(),
                  sa.ForeignKey('partner_opportunities.id', ondelete='CASCADE'), nullable=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('type', sa.String(20), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('due_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        *_timestamps(),
    )
    op.create_index('ix_partner_activities_id', 'partner_activities', ['id'])
    op.create_index('ix_partner_activities_partner_id', 'partner_activities', ['partner_id'])
    op.create_index('ix_partner_activities_opportunity_id', 'partner_activities', ['opportunity_id'])

    op.add_column('users', sa.Column('partner_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_users_partner_id', 'users', 'partners', ['partner_id'], ['id'], ondelete='SET NULL')
    op.create_index('ix_users_partner_id', 'users', ['partner_id'])


def downgrade():
    op.drop_index('ix_users_partner_id', table_name='users')
    op.drop_constraint('fk_users_partner_id', 'users', type_='foreignkey')
    op.drop_column('users', 'partner_id')
    op.drop_table('partner_activities')
    op.drop_table('partner_opportunity_products')
    op.drop_table('partner_opportunities')
    op.drop_table('partner_team_members')
    op.drop_table('partners')
    # Falha se ainda houver usuário com essas roles — de propósito.
    op.execute("DELETE FROM roles WHERE name IN ('partner', 'finance');")
```

- [ ] **Step 7: Conferir a cadeia de migrations (sem aplicar)**

Run: `MSYS_NO_PATHCONV=1 docker exec -w /app hsgrowth-api-local alembic heads`
Expected: uma única cabeça, `1b2c3d4e5f6a (head)`. **Não rodar `alembic upgrade`** — o container aponta para o banco de produção.

- [ ] **Step 8: Commit (perguntar antes: "posso commitar?")**

```bash
git add backend/app/models/partner.py backend/app/models/partner_opportunity.py backend/app/models/partner_activity.py backend/app/models/user.py backend/app/models/__init__.py backend/alembic/versions/2026_10_29_1000-1b2c3d4e5f6a_parcerias.py backend/tests/unit/apoio_parcerias.py backend/tests/unit/test_parcerias_modelos.py
git commit -m "feat(parcerias): tabelas do Programa de Parceiros e roles partner/finance"
```

---

### Task 2: Tranca geral para `partner` e `finance`

**Files:**
- Modify: `backend/app/api/deps.py`
- Test: `backend/tests/unit/test_parcerias_tranca.py`

- [ ] **Step 1: Escrever o teste que falha**

`backend/tests/unit/test_parcerias_tranca.py`:

```python
"""
Tranca geral: parceiro e Financeiro só alcançam Parcerias, login, o próprio
perfil e as próprias notificações. Qualquer outra rota — inclusive as que
ainda vão ser criadas — responde 403 sem ninguém precisar lembrar de proteger.
"""
import re

import pytest
from fastapi.routing import APIRoute

from app.api.deps import caminho_liberado_para_trancado, get_current_active_user
from app.main import app

from tests.unit.apoio_parcerias import headers, parceiro, usuario


def _usa_usuario_ativo(dependant) -> bool:
    for dep in dependant.dependencies:
        if dep.call is get_current_active_user or _usa_usuario_ativo(dep):
            return True
    return False


def _rotas_trancadas():
    for rota in app.routes:
        if (
            isinstance(rota, APIRoute)
            and rota.path.startswith("/api/v1")
            and not caminho_liberado_para_trancado(rota.path)
            and _usa_usuario_ativo(rota.dependant)
        ):
            yield rota


@pytest.mark.parametrize("perfil", ["partner", "finance"])
def test_perfil_trancado_recebe_403_fora_da_lista(client, db, perfil):
    p = parceiro(db) if perfil == "partner" else None
    h = headers(usuario(db, perfil, f"{perfil}@teste.com", p))

    falhas = []
    for rota in _rotas_trancadas():
        metodo = sorted(rota.methods)[0]
        url = re.sub(r"\{[^}]+\}", "1", rota.path)
        resposta = client.request(metodo, url, headers=h)
        if resposta.status_code != 403:
            falhas.append(f"{metodo} {rota.path} -> {resposta.status_code}")

    assert not falhas, "\n".join(falhas)


def test_perfil_trancado_ve_o_proprio_perfil(client, db):
    h = headers(usuario(db, "partner", "contato@dmap.com", parceiro(db)))

    resposta = client.get("/api/v1/users/me", headers=h)

    assert resposta.status_code == 200
    assert resposta.json()["role"] == "partner"


def test_vendedor_continua_com_o_crm(client, salesperson_headers):
    assert client.get("/api/v1/boards", headers=salesperson_headers).status_code == 200


def test_lista_liberada():
    assert caminho_liberado_para_trancado("/api/v1/parcerias/oportunidades")
    assert caminho_liberado_para_trancado("/api/v1/users/me/change-password")
    assert not caminho_liberado_para_trancado("/api/v1/users/1")
    assert not caminho_liberado_para_trancado("/api/v1/cards")
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest tests/unit/test_parcerias_tranca.py -q -p no:cacheprovider --color=no`
Expected: FAIL com `ImportError: cannot import name 'caminho_liberado_para_trancado'`.

- [ ] **Step 3: Implementar a tranca**

Em `backend/app/api/deps.py`, trocar o import do FastAPI:

```python
from fastapi import Depends, Header, HTTPException, Request, status
```

Logo depois de `security = HTTPBearer(auto_error=False)`:

```python
# Perfis presos ao Programa de Parceiros. Para eles o CRM é negado por padrão:
# só os caminhos abaixo respondem. Rota nova fica trancada sozinha.
PERFIS_TRANCADOS = ("partner", "finance")
CAMINHOS_DOS_TRANCADOS = (
    "/api/v1/auth/",
    "/api/v1/users/me",
    "/api/v1/notifications",
    "/api/v1/parcerias",
)


def caminho_liberado_para_trancado(path: str) -> bool:
    return path.startswith(CAMINHOS_DOS_TRANCADOS)
```

Substituir `get_current_active_user` inteiro por:

```python
async def get_current_active_user(
    request: Request,
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency para obter usuário autenticado e ativo.
    Verifica se o usuário está com status is_active=True e aplica a tranca
    geral dos perfis do Programa de Parceiros (PERFIS_TRANCADOS).

    Raises:
        HTTPException: Se o usuário estiver inativo ou fora da área liberada
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário inativo"
        )

    papel = current_user.role.name if current_user.role else None
    if papel in PERFIS_TRANCADOS and not caminho_liberado_para_trancado(request.url.path):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito ao Programa de Parceiros."
        )
    return current_user
```

- [ ] **Step 4: Rodar e ver passar**

Run: `MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest tests/unit/test_parcerias_tranca.py -q -p no:cacheprovider --color=no`
Expected: `5 passed`. Se alguma rota aparecer na lista de falhas com 401/422, é uma dependência resolvida antes do usuário: investigar a rota (não afrouxar o teste).

- [ ] **Step 5: Rodar a suíte inteira (a tranca mexe numa dependência de quase todas as rotas)**

Run: `MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest tests -q -p no:cacheprovider --color=no`
Expected: o mesmo número de falhas de antes da mudança (anotar o número antes de começar a Task 2 rodando o mesmo comando), nenhuma falha nova.

- [ ] **Step 6: Commit (perguntar antes)**

```bash
git add backend/app/api/deps.py backend/tests/unit/test_parcerias_tranca.py
git commit -m "feat(parcerias): tranca geral prende parceiro e Financeiro a Parcerias"
```

---

### Task 3: CNPJ, etapas e travas

**Files:**
- Create: `backend/app/services/parcerias/__init__.py`, `backend/app/services/parcerias/cnpj.py`, `backend/app/services/parcerias/etapas.py`
- Test: `backend/tests/unit/test_parcerias_etapas.py`

- [ ] **Step 1: Escrever o teste que falha**

`backend/tests/unit/test_parcerias_etapas.py`:

```python
"""Etapas fixas e travas dos dois boards de Parcerias."""
from datetime import date
from types import SimpleNamespace

import pytest

from app.services.parcerias.cnpj import cnpj_valido, so_digitos
from app.services.parcerias.etapas import (
    TravaError,
    validar_mudanca_oportunidade,
    validar_mudanca_parceiro,
)


def _parceiro(**campos):
    base = dict(
        stage="potencial", main_contact_name=None, main_contact_phone=None,
        main_contact_email=None, hs_owner_id=None, qualification_status=None,
        onboarding_date=None, loss_reason=None,
    )
    base.update(campos)
    return SimpleNamespace(**base)


PRONTO = dict(
    main_contact_name="Carlos", main_contact_phone="11999990000", hs_owner_id=1,
    qualification_status="aderente", onboarding_date=date(2026, 10, 1),
)


def _oportunidade(**campos):
    base = dict(
        stage="novo_lead", eligibility_status="em_analise",
        expected_close_date=None, modality=None, loss_reason=None,
    )
    base.update(campos)
    return SimpleNamespace(**base)


# ── CNPJ ─────────────────────────────────────────────────────────────────────

def test_cnpj():
    assert so_digitos("11.222.333/0001-81") == "11222333000181"
    assert cnpj_valido("11.222.333/0001-81")
    assert not cnpj_valido("11222333000182")
    assert not cnpj_valido("11111111111111")
    assert not cnpj_valido("123")


# ── Board 1 ──────────────────────────────────────────────────────────────────

def test_sair_de_potencial_pede_contato_e_responsavel():
    with pytest.raises(TravaError, match="contato principal"):
        validar_mudanca_parceiro(_parceiro(), "qualificacao", "partner")

    validar_mudanca_parceiro(_parceiro(**PRONTO), "qualificacao", "partner")


def test_pular_etapa_nao_fura_a_trava_da_qualificacao():
    p = _parceiro(**{**PRONTO, "qualification_status": "nao_aderente"})
    with pytest.raises(TravaError, match="Aderente"):
        validar_mudanca_parceiro(p, "proposta", "admin")


def test_ativacao_pede_data_de_onboarding():
    p = _parceiro(**{**PRONTO, "stage": "onboarding", "onboarding_date": None})
    with pytest.raises(TravaError, match="onboarding"):
        validar_mudanca_parceiro(p, "ativacao", "partner")


def test_ativado_so_automatico():
    p = _parceiro(**{**PRONTO, "stage": "ativacao"})
    with pytest.raises(TravaError, match="sozinho"):
        validar_mudanca_parceiro(p, "ativado", "admin")

    validar_mudanca_parceiro(p, "ativado", "sistema", automatico=True)


def test_perdido_do_parceiro_so_gestao_e_com_motivo():
    with pytest.raises(TravaError, match="Só admin ou gerente"):
        validar_mudanca_parceiro(_parceiro(loss_reason="Sem interesse"), "perdido", "partner")
    with pytest.raises(TravaError, match="motivo"):
        validar_mudanca_parceiro(_parceiro(), "perdido", "admin")

    validar_mudanca_parceiro(_parceiro(loss_reason="Sem interesse"), "perdido", "manager")


def test_parceiro_nao_sai_de_perdido_nem_de_ativado():
    for origem in ("perdido", "ativado"):
        with pytest.raises(TravaError, match="tiram o parceiro"):
            validar_mudanca_parceiro(_parceiro(**{**PRONTO, "stage": origem}), "onboarding", "partner")


def test_etapa_desconhecida():
    with pytest.raises(TravaError, match="desconhecida"):
        validar_mudanca_parceiro(_parceiro(), "xyz", "admin")


# ── Board 2 ──────────────────────────────────────────────────────────────────

def test_sair_de_novo_lead_pede_elegibilidade_validada():
    with pytest.raises(TravaError, match="Validada"):
        validar_mudanca_oportunidade(_oportunidade(), "oportunidade", "partner")

    validar_mudanca_oportunidade(_oportunidade(eligibility_status="validada"), "oportunidade", "partner")


def test_negociacao_pede_data_mesmo_pulando_proposta():
    op = _oportunidade(stage="oportunidade", eligibility_status="validada")
    with pytest.raises(TravaError, match="data esperada"):
        validar_mudanca_oportunidade(op, "negociacao", "partner")


def test_ganho_pede_venda_ou_locacao():
    op = _oportunidade(stage="aguardando_pedido", eligibility_status="validada",
                       expected_close_date=date(2026, 11, 30))
    with pytest.raises(TravaError, match="venda ou locação"):
        validar_mudanca_oportunidade(op, "ganho", "partner")

    op.modality = "locacao"
    validar_mudanca_oportunidade(op, "ganho", "partner")


def test_perdido_pede_motivo_e_vale_ate_em_novo_lead():
    with pytest.raises(TravaError, match="motivo"):
        validar_mudanca_oportunidade(_oportunidade(), "perdido", "partner")

    validar_mudanca_oportunidade(_oportunidade(loss_reason="Preço / orçamento"), "perdido", "partner")


def test_so_gestao_reabre_ganho_ou_perdido():
    op = _oportunidade(stage="ganho", eligibility_status="validada",
                       expected_close_date=date(2026, 11, 30), modality="venda")
    with pytest.raises(TravaError, match="reabrem"):
        validar_mudanca_oportunidade(op, "negociacao", "partner")

    validar_mudanca_oportunidade(op, "negociacao", "admin")
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest tests/unit/test_parcerias_etapas.py -q -p no:cacheprovider --color=no`
Expected: FAIL com `ModuleNotFoundError: No module named 'app.services.parcerias'`.

- [ ] **Step 3: Implementar**

`backend/app/services/parcerias/__init__.py`:

```python
"""Programa de Parceiros: regras dos boards Aquisição de Parceiros e Pipeline de Parceiros."""
```

`backend/app/services/parcerias/cnpj.py`:

```python
"""CNPJ guardado só com dígitos e conferido pelos dígitos verificadores."""
import re

_PESOS_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
_PESOS_2 = [6] + _PESOS_1


def so_digitos(valor) -> str:
    return re.sub(r"\D", "", valor or "")


def _digito(base: str, pesos) -> str:
    resto = sum(int(n) * p for n, p in zip(base, pesos)) % 11
    return "0" if resto < 2 else str(11 - resto)


def cnpj_valido(valor) -> bool:
    d = so_digitos(valor)
    if len(d) != 14 or d == d[0] * 14:
        return False
    return d[12] == _digito(d[:12], _PESOS_1) and d[13] == _digito(d[:13], _PESOS_2)
```

`backend/app/services/parcerias/etapas.py`:

```python
"""
Etapas fixas dos dois boards de Parcerias e as travas para avançar.

As etapas ficam no código, não em listas editáveis: as travas dependem delas,
e renomear ou reordenar uma lista pela tela quebraria a regra.

A trava é acumulada: para estar numa etapa, o card cumpre as exigências de
todas as etapas anteriores. Assim pular etapa não fura a trava.
"""
from dataclasses import dataclass
from typing import Dict, Optional, Sequence


@dataclass(frozen=True)
class Etapa:
    codigo: str
    nome: str


ETAPAS_AQUISICAO = (
    Etapa("potencial", "Potencial Parceiro"),
    Etapa("qualificacao", "Qualificação"),
    Etapa("proposta", "Proposta"),
    Etapa("formalizacao", "Formalização"),
    Etapa("onboarding", "Onboarding"),
    Etapa("ativacao", "Ativação"),
    Etapa("ativado", "Ativado"),
    Etapa("perdido", "Perdido"),
)

ETAPAS_OPORTUNIDADE = (
    Etapa("novo_lead", "Novo Lead"),
    Etapa("oportunidade", "Oportunidade"),
    Etapa("proposta", "Proposta"),
    Etapa("negociacao", "Negociação"),
    Etapa("aguardando_pedido", "Aguardando Pedido"),
    Etapa("ganho", "Ganho"),
    Etapa("perdido", "Perdido"),
)

GESTAO = ("admin", "manager")


class TravaError(Exception):
    """Mudança de etapa barrada. A mensagem vai para a tela (422)."""


def nome_da_etapa(etapas: Sequence[Etapa], codigo: str) -> str:
    for etapa in etapas:
        if etapa.codigo == codigo:
            return etapa.nome
    return codigo


def _conferir_destino(etapas: Sequence[Etapa], destino: str) -> None:
    if destino not in [e.codigo for e in etapas]:
        raise TravaError(f"Etapa desconhecida: {destino}")


def _checar(etapas: Sequence[Etapa], exigencias: Dict[str, Optional[str]], destino: str) -> None:
    """Percorre as etapas anteriores ao destino; a primeira exigência faltando barra."""
    for etapa in etapas:
        if etapa.codigo == destino:
            return
        falta = exigencias.get(etapa.codigo)
        if falta:
            raise TravaError(falta)


def _exigencias_do_parceiro(p) -> Dict[str, Optional[str]]:
    """Etapa → o que falta para sair dela (None = nada)."""
    tem_contato = bool((p.main_contact_name or "").strip()) and bool(
        (p.main_contact_phone or "").strip() or (p.main_contact_email or "").strip()
    )
    return {
        "potencial": None if tem_contato and p.hs_owner_id else (
            "Preencha o contato principal (nome e telefone ou e-mail) e o Responsável H&S "
            "antes de ir para Qualificação."
        ),
        "qualificacao": None if p.qualification_status in ("aderente", "parcialmente_aderente") else (
            "O parceiro precisa estar Aderente ou Parcialmente aderente para seguir além da Qualificação."
        ),
        "onboarding": None if p.onboarding_date else (
            "Preencha a data de onboarding antes de ir para Ativação."
        ),
    }


def _exigencias_da_oportunidade(o) -> Dict[str, Optional[str]]:
    return {
        "novo_lead": None if o.eligibility_status == "validada" else (
            "A elegibilidade precisa estar Validada para sair de Novo Lead."
        ),
        "proposta": None if o.expected_close_date else (
            "Preencha a data esperada de fechamento antes de ir para Negociação."
        ),
        "aguardando_pedido": None if o.modality in ("venda", "locacao") else (
            "Informe se é venda ou locação antes de marcar como Ganho."
        ),
    }


def validar_mudanca_parceiro(parceiro, destino: str, perfil: str, automatico: bool = False) -> None:
    _conferir_destino(ETAPAS_AQUISICAO, destino)
    origem = parceiro.stage
    if destino == origem:
        return
    if origem in ("ativado", "perdido") and perfil not in GESTAO and not automatico:
        raise TravaError("Só admin ou gerente tiram o parceiro de Ativado ou de Perdido.")
    if destino == "perdido":
        if perfil not in GESTAO:
            raise TravaError("Só admin ou gerente marcam o parceiro como Perdido.")
        if not (parceiro.loss_reason or "").strip():
            raise TravaError("Informe o motivo da perda.")
        return
    if destino == "ativado" and not automatico:
        raise TravaError(
            "O parceiro vai para Ativado sozinho, quando uma oportunidade dele for validada, "
            "chegar em Proposta ou for ganha."
        )
    progressao = [e for e in ETAPAS_AQUISICAO if e.codigo != "perdido"]
    _checar(progressao, _exigencias_do_parceiro(parceiro), destino)


def validar_mudanca_oportunidade(oportunidade, destino: str, perfil: str) -> None:
    _conferir_destino(ETAPAS_OPORTUNIDADE, destino)
    origem = oportunidade.stage
    if destino == origem:
        return
    if origem in ("ganho", "perdido") and perfil not in GESTAO:
        raise TravaError("Só admin ou gerente reabrem uma oportunidade ganha ou perdida.")
    if destino == "perdido":
        if not (oportunidade.loss_reason or "").strip():
            raise TravaError("Informe o motivo da perda.")
        return
    progressao = [e for e in ETAPAS_OPORTUNIDADE if e.codigo != "perdido"]
    _checar(progressao, _exigencias_da_oportunidade(oportunidade), destino)
```

- [ ] **Step 4: Rodar e ver passar**

Run: `MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest tests/unit/test_parcerias_etapas.py -q -p no:cacheprovider --color=no`
Expected: `13 passed`.

- [ ] **Step 5: Commit (perguntar antes)**

```bash
git add backend/app/services/parcerias/__init__.py backend/app/services/parcerias/cnpj.py backend/app/services/parcerias/etapas.py backend/tests/unit/test_parcerias_etapas.py
git commit -m "feat(parcerias): etapas fixas e travas dos dois boards"
```

---

### Task 4: Schemas, acesso, atividades e respostas

**Files:**
- Create: `backend/app/schemas/parcerias.py`, `backend/app/services/parcerias/acesso.py`, `backend/app/services/parcerias/atividades.py`, `backend/app/services/parcerias/respostas.py`
- Modify: `backend/app/api/deps.py` (adicionar `require_parcerias_access`)
- Test: `backend/tests/unit/test_parcerias_acesso.py`

- [ ] **Step 1: Escrever o teste que falha**

`backend/tests/unit/test_parcerias_acesso.py`:

```python
"""Quem enxerga o quê em Parcerias. Parceiro nunca vê dado de outro parceiro."""
import pytest
from fastapi import HTTPException

from app.models.partner_activity import PartnerActivity
from app.services.parcerias import acesso, atividades

from tests.unit.apoio_parcerias import oportunidade, parceiro, usuario


def test_parceiro_nao_enxerga_oportunidade_de_outro(db):
    a, b = parceiro(db, "Dmap"), parceiro(db, "Outro")
    user_a = usuario(db, "partner", "a@dmap.com", a)
    op_b = oportunidade(db, b)

    with pytest.raises(HTTPException) as erro:
        acesso.buscar_oportunidade(db, user_a, op_b.id)
    assert erro.value.status_code == 404
    assert acesso.oportunidades_visiveis(db, user_a).count() == 0


def test_parceiro_nao_abre_card_de_outro_parceiro(db):
    a, b = parceiro(db, "Dmap"), parceiro(db, "Outro")
    user_a = usuario(db, "partner", "a@dmap.com", a)

    with pytest.raises(HTTPException) as erro:
        acesso.buscar_parceiro(db, user_a, b.id)
    assert erro.value.status_code == 404
    assert acesso.buscar_parceiro(db, user_a, a.id).id == a.id


def test_financeiro_enxerga_todas(db):
    a, b = parceiro(db, "Dmap"), parceiro(db, "Outro")
    oportunidade(db, a)
    oportunidade(db, b)
    financeiro = usuario(db, "finance", "fin@hs.com")

    assert acesso.oportunidades_visiveis(db, financeiro).count() == 2


def test_login_de_parceiro_sem_vinculo_e_barrado(db):
    solto = usuario(db, "partner", "solto@x.com")

    with pytest.raises(HTTPException) as erro:
        acesso.oportunidades_visiveis(db, solto)
    assert erro.value.status_code == 403


def test_financeiro_nao_altera_cards(db):
    with pytest.raises(HTTPException) as erro:
        acesso.exigir_escrita(usuario(db, "finance", "fin@hs.com"))
    assert erro.value.status_code == 403


def test_evento_vai_para_o_historico(db):
    p = parceiro(db)
    atividades.registrar_evento(db, None, "Parceiro cadastrado", partner_id=p.id)
    db.commit()

    [evento] = db.query(PartnerActivity).filter(PartnerActivity.partner_id == p.id).all()
    assert evento.type == "evento"
    assert evento.description == "Parceiro cadastrado"
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest tests/unit/test_parcerias_acesso.py -q -p no:cacheprovider --color=no`
Expected: FAIL com `ImportError: cannot import name 'acesso'`.

- [ ] **Step 3: Schemas**

`backend/app/schemas/parcerias.py`:

```python
"""Schemas Pydantic do Programa de Parceiros (boards Aquisição e Pipeline)."""
from datetime import date, datetime
from decimal import Decimal
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field, field_validator

from app.services.parcerias.cnpj import cnpj_valido, so_digitos

Qualificacao = Literal["aderente", "parcialmente_aderente", "nao_aderente"]
TipoAtividade = Literal["nota", "ligacao", "whatsapp", "email", "reuniao", "tarefa"]


def _cnpj_opcional(valor: Optional[str]) -> Optional[str]:
    if valor in (None, ""):
        return None
    if not cnpj_valido(valor):
        raise ValueError("CNPJ inválido")
    return so_digitos(valor)


# ─── Etapas ──────────────────────────────────────────────────────────────────

class EtapaOut(BaseModel):
    codigo: str
    nome: str


class EtapasResponse(BaseModel):
    aquisicao: List[EtapaOut]
    oportunidades: List[EtapaOut]


class MoverRequest(BaseModel):
    stage: str
    position: Optional[float] = None
    loss_reason: Optional[str] = Field(None, max_length=255)
    loss_detail: Optional[str] = None
    # Campos que a tela pede no modal da trava do board 2.
    expected_close_date: Optional[date] = None
    modality: Optional[Literal["venda", "locacao"]] = None


# ─── Board 1: parceiro ───────────────────────────────────────────────────────

class ParceiroCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    cnpj: Optional[str] = None
    main_contact_name: Optional[str] = Field(None, max_length=255)
    main_contact_phone: Optional[str] = Field(None, max_length=30)
    main_contact_email: Optional[str] = Field(None, max_length=255)
    partner_type: Optional[str] = Field(None, max_length=100)
    origin: Optional[str] = Field(None, max_length=100)
    segment: Optional[str] = Field(None, max_length=255)
    region: Optional[str] = Field(None, max_length=255)
    hs_owner_id: Optional[int] = None
    qualification_status: Optional[Qualificacao] = None
    onboarding_date: Optional[date] = None

    @field_validator("cnpj")
    @classmethod
    def _validar_cnpj(cls, valor):
        return _cnpj_opcional(valor)


class ParceiroUpdate(ParceiroCreate):
    name: Optional[str] = Field(None, min_length=1, max_length=255)


class ParceiroResponse(BaseModel):
    id: int
    name: str
    cnpj: Optional[str] = None
    main_contact_name: Optional[str] = None
    main_contact_phone: Optional[str] = None
    main_contact_email: Optional[str] = None
    partner_type: Optional[str] = None
    origin: Optional[str] = None
    segment: Optional[str] = None
    region: Optional[str] = None
    hs_owner_id: Optional[int] = None
    hs_owner_name: Optional[str] = None
    qualification_status: Optional[str] = None
    onboarding_date: Optional[date] = None
    activation_evidence: Optional[str] = None
    activated_at: Optional[datetime] = None
    activation_opportunity_id: Optional[int] = None
    stage: str
    position: float = 0
    loss_reason: Optional[str] = None
    loss_detail: Optional[str] = None
    lost_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    oportunidades_por_etapa: Dict[str, int] = {}

    model_config = {"from_attributes": True}


class MembroCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=30)


class MembroUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=30)
    is_active: Optional[bool] = None


class MembroResponse(BaseModel):
    id: int
    partner_id: int
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool

    model_config = {"from_attributes": True}


class AcessoCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def _validar_email(cls, valor: str) -> str:
        valor = valor.strip().lower()
        if "@" not in valor or "." not in valor.split("@")[-1]:
            raise ValueError("E-mail inválido")
        return valor


class AcessoUpdate(BaseModel):
    is_active: bool


class AcessoResponse(BaseModel):
    id: int
    name: str
    email: str
    is_active: bool
    last_login_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ─── Board 2: oportunidade ───────────────────────────────────────────────────

class OportunidadeCreate(BaseModel):
    # Admin/gerente escolhem; para o parceiro é sempre o próprio canal.
    partner_id: Optional[int] = None
    seller_member_id: Optional[int] = None
    title: str = Field(..., min_length=1, max_length=500)
    deal_type: str = Field(..., min_length=1, max_length=100)
    sector: str = Field(..., min_length=1, max_length=100)
    relationship_type: str = Field(..., min_length=1, max_length=100)
    context: str = Field(..., min_length=1)
    cnpj: str
    company_name: str = Field(..., min_length=1, max_length=255)
    company_segment: Optional[str] = Field(None, max_length=255)
    company_city: Optional[str] = Field(None, max_length=255)
    company_state: Optional[str] = Field(None, max_length=2)
    contact_name: Optional[str] = Field(None, max_length=255)
    contact_role: Optional[str] = Field(None, max_length=255)
    contact_phone: Optional[str] = Field(None, max_length=30)
    contact_email: Optional[str] = Field(None, max_length=255)

    @field_validator("cnpj")
    @classmethod
    def _validar_cnpj(cls, valor):
        if not cnpj_valido(valor):
            raise ValueError("CNPJ inválido")
        return so_digitos(valor)


class OportunidadeUpdate(BaseModel):
    seller_member_id: Optional[int] = None
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    deal_type: Optional[str] = Field(None, min_length=1, max_length=100)
    sector: Optional[str] = Field(None, min_length=1, max_length=100)
    relationship_type: Optional[str] = Field(None, min_length=1, max_length=100)
    context: Optional[str] = Field(None, min_length=1)
    cnpj: Optional[str] = None
    company_name: Optional[str] = Field(None, min_length=1, max_length=255)
    company_segment: Optional[str] = Field(None, max_length=255)
    company_city: Optional[str] = Field(None, max_length=255)
    company_state: Optional[str] = Field(None, max_length=2)
    contact_name: Optional[str] = Field(None, max_length=255)
    contact_role: Optional[str] = Field(None, max_length=255)
    contact_phone: Optional[str] = Field(None, max_length=30)
    contact_email: Optional[str] = Field(None, max_length=255)
    expected_close_date: Optional[date] = None
    modality: Optional[Literal["venda", "locacao"]] = None

    @field_validator("cnpj")
    @classmethod
    def _validar_cnpj(cls, valor):
        return _cnpj_opcional(valor)


class ElegibilidadeRequest(BaseModel):
    status: Literal["em_analise", "validada", "rejeitada"]
    note: Optional[str] = None


class OportunidadeResponse(BaseModel):
    id: int
    partner_id: int
    partner_name: Optional[str] = None
    acquisition_channel: str = "Parceiros"
    seller_member_id: Optional[int] = None
    seller_name: Optional[str] = None
    title: str
    deal_type: str
    sector: str
    relationship_type: str
    context: str
    cnpj: str
    company_name: str
    company_segment: Optional[str] = None
    company_city: Optional[str] = None
    company_state: Optional[str] = None
    contact_name: Optional[str] = None
    contact_role: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    eligibility_status: str
    eligibility_note: Optional[str] = None
    eligibility_by_name: Optional[str] = None
    eligibility_at: Optional[datetime] = None
    expected_close_date: Optional[date] = None
    modality: Optional[str] = None
    loss_reason: Optional[str] = None
    loss_detail: Optional[str] = None
    stage: str
    position: float = 0
    last_activity_at: Optional[datetime] = None
    won_at: Optional[datetime] = None
    lost_at: Optional[datetime] = None
    total_value: float = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProdutoItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(1, ge=1)
    unit_price: Optional[Decimal] = Field(None, ge=0)


class ProdutoItemUpdate(BaseModel):
    quantity: Optional[int] = Field(None, ge=1)
    unit_price: Optional[Decimal] = Field(None, ge=0)


class ProdutoItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: str
    quantity: int
    unit_price: float
    total: float


class ProdutoCatalogo(BaseModel):
    id: int
    name: str
    sku: Optional[str] = None
    unit_price: float


# ─── Atividades ──────────────────────────────────────────────────────────────

class AtividadeCreate(BaseModel):
    type: TipoAtividade
    description: str = Field(..., min_length=1)
    due_at: Optional[datetime] = None


class ConcluirRequest(BaseModel):
    is_completed: bool


class AtividadeResponse(BaseModel):
    id: int
    partner_id: Optional[int] = None
    opportunity_id: Optional[int] = None
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    type: str
    description: str
    due_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}
```

- [ ] **Step 4: Acesso, atividades e respostas**

`backend/app/services/parcerias/acesso.py`:

```python
"""
Quem enxerga o quê em Parcerias.

Toda consulta de parceiro passa por aqui e filtra pelo partner_id do login no
backend — nunca só na tela. Card de outro parceiro responde 404, como se não
existisse.
"""
from fastapi import HTTPException, status
from sqlalchemy.orm import Query, Session

from app.models.partner import Partner
from app.models.partner_opportunity import PartnerOpportunity
from app.models.user import User

GESTAO = ("admin", "manager")
VALIDAM_ELEGIBILIDADE = ("admin", "manager", "finance")


def perfil(user: User) -> str:
    return user.role.name if user and user.role else ""


def eh_gestao(user: User) -> bool:
    return perfil(user) in GESTAO


def eh_parceiro(user: User) -> bool:
    return perfil(user) == "partner"


def exigir_gestao(user: User) -> None:
    if not eh_gestao(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Só admin ou gerente.")


def exigir_escrita(user: User) -> None:
    if perfil(user) == "finance":
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "O Financeiro acompanha e valida a elegibilidade, mas não altera os cards.",
        )


def parceiro_do_login(user: User) -> int:
    if not user.partner_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Login de parceiro sem parceiro vinculado.")
    return user.partner_id


def parceiros_visiveis(db: Session, user: User) -> Query:
    q = db.query(Partner).filter(Partner.is_deleted.is_(False))
    if eh_parceiro(user):
        q = q.filter(Partner.id == parceiro_do_login(user))
    return q


def buscar_parceiro(db: Session, user: User, partner_id: int) -> Partner:
    p = parceiros_visiveis(db, user).filter(Partner.id == partner_id).first()
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Parceiro não encontrado.")
    return p


def oportunidades_visiveis(db: Session, user: User) -> Query:
    q = db.query(PartnerOpportunity).filter(PartnerOpportunity.is_deleted.is_(False))
    if eh_parceiro(user):
        q = q.filter(PartnerOpportunity.partner_id == parceiro_do_login(user))
    return q


def buscar_oportunidade(db: Session, user: User, opportunity_id: int) -> PartnerOpportunity:
    op = oportunidades_visiveis(db, user).filter(PartnerOpportunity.id == opportunity_id).first()
    if not op:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Oportunidade não encontrada.")
    return op
```

`backend/app/services/parcerias/atividades.py`:

```python
"""
Atividades e histórico dos dois boards de Parcerias.

Criar ou concluir atividade de uma oportunidade atualiza last_activity_at
(a Consulta de CNPJ usa para saber se a negociação está viva).
"""
from datetime import datetime
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.partner_activity import PartnerActivity
from app.models.partner_opportunity import PartnerOpportunity
from app.models.user import User
from app.schemas.parcerias import AtividadeCreate
from app.services.parcerias import acesso


def registrar_evento(db: Session, user: Optional[User], descricao: str,
                     partner_id: Optional[int] = None, opportunity_id: Optional[int] = None) -> None:
    """Linha do histórico gravada pelo sistema. Quem chama faz o commit."""
    db.add(PartnerActivity(
        partner_id=partner_id,
        opportunity_id=opportunity_id,
        user_id=user.id if user else None,
        type="evento",
        description=descricao,
    ))


def tocar(oportunidade: PartnerOpportunity) -> None:
    oportunidade.last_activity_at = datetime.utcnow()


def listar(db: Session, partner_id: Optional[int] = None,
           opportunity_id: Optional[int] = None) -> List[PartnerActivity]:
    q = db.query(PartnerActivity)
    if opportunity_id is not None:
        q = q.filter(PartnerActivity.opportunity_id == opportunity_id)
    else:
        q = q.filter(PartnerActivity.partner_id == partner_id)
    return q.order_by(PartnerActivity.created_at.desc(), PartnerActivity.id.desc()).all()


def criar(db: Session, user: User, dados: AtividadeCreate, partner_id: Optional[int] = None,
          oportunidade: Optional[PartnerOpportunity] = None) -> PartnerActivity:
    acesso.exigir_escrita(user)
    atividade = PartnerActivity(
        partner_id=partner_id,
        opportunity_id=oportunidade.id if oportunidade else None,
        user_id=user.id,
        type=dados.type,
        description=dados.description.strip(),
        due_at=dados.due_at,
    )
    db.add(atividade)
    if oportunidade:
        tocar(oportunidade)
    db.commit()
    db.refresh(atividade)
    return atividade


def _buscar_visivel(db: Session, user: User, atividade_id: int) -> PartnerActivity:
    atividade = db.query(PartnerActivity).filter(PartnerActivity.id == atividade_id).first()
    if not atividade:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Atividade não encontrada.")
    if atividade.opportunity_id:
        acesso.buscar_oportunidade(db, user, atividade.opportunity_id)
    else:
        acesso.buscar_parceiro(db, user, atividade.partner_id)
    return atividade


def concluir(db: Session, user: User, atividade_id: int, concluida: bool) -> PartnerActivity:
    acesso.exigir_escrita(user)
    atividade = _buscar_visivel(db, user, atividade_id)
    if atividade.type == "evento":
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Evento do histórico não se conclui.")
    atividade.completed_at = datetime.utcnow() if concluida else None
    if concluida and atividade.opportunity_id:
        tocar(db.get(PartnerOpportunity, atividade.opportunity_id))
    db.commit()
    db.refresh(atividade)
    return atividade


def excluir(db: Session, user: User, atividade_id: int) -> None:
    acesso.exigir_escrita(user)
    atividade = _buscar_visivel(db, user, atividade_id)
    if atividade.type == "evento":
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Evento do histórico não se exclui.")
    if atividade.user_id != user.id and not acesso.eh_gestao(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Só quem criou a atividade, admin ou gerente excluem.")
    db.delete(atividade)
    db.commit()
```

`backend/app/services/parcerias/respostas.py`:

```python
"""Montagem das respostas da API de Parcerias (nomes e totais que a tela mostra)."""
from typing import Dict, Iterable, List

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.partner import Partner
from app.models.partner_activity import PartnerActivity
from app.models.partner_opportunity import PartnerOpportunity, PartnerOpportunityProduct
from app.schemas.parcerias import (
    AtividadeResponse,
    OportunidadeResponse,
    ParceiroResponse,
    ProdutoItemResponse,
)


def contagem_por_etapa(db: Session, partner_id: int) -> Dict[str, int]:
    linhas = (
        db.query(PartnerOpportunity.stage, func.count(PartnerOpportunity.id))
        .filter(PartnerOpportunity.partner_id == partner_id, PartnerOpportunity.is_deleted.is_(False))
        .group_by(PartnerOpportunity.stage)
        .all()
    )
    return {etapa: total for etapa, total in linhas}


def parceiro_out(db: Session, p: Partner) -> ParceiroResponse:
    return ParceiroResponse.model_validate(p).model_copy(update={
        "hs_owner_name": p.hs_owner.name if p.hs_owner else None,
        "oportunidades_por_etapa": contagem_por_etapa(db, p.id),
    })


def valores_por_oportunidade(db: Session, ids: Iterable[int]) -> Dict[int, float]:
    ids = list(ids)
    if not ids:
        return {}
    linhas = (
        db.query(
            PartnerOpportunityProduct.opportunity_id,
            func.sum(PartnerOpportunityProduct.quantity * PartnerOpportunityProduct.unit_price),
        )
        .filter(PartnerOpportunityProduct.opportunity_id.in_(ids))
        .group_by(PartnerOpportunityProduct.opportunity_id)
        .all()
    )
    return {op_id: float(total or 0) for op_id, total in linhas}


def oportunidade_out(op: PartnerOpportunity, total: float = 0) -> OportunidadeResponse:
    return OportunidadeResponse.model_validate(op).model_copy(update={
        "partner_name": op.partner.name if op.partner else None,
        "seller_name": op.seller.name if op.seller else None,
        "eligibility_by_name": op.eligibility_by.name if op.eligibility_by else None,
        "total_value": total,
    })


def oportunidades_out(db: Session, ops: List[PartnerOpportunity]) -> List[OportunidadeResponse]:
    totais = valores_por_oportunidade(db, [op.id for op in ops])
    return [oportunidade_out(op, totais.get(op.id, 0)) for op in ops]


def item_out(item: PartnerOpportunityProduct) -> ProdutoItemResponse:
    preco = float(item.unit_price or 0)
    return ProdutoItemResponse(
        id=item.id,
        product_id=item.product_id,
        product_name=item.product.name if item.product else "",
        quantity=item.quantity,
        unit_price=preco,
        total=preco * item.quantity,
    )


def atividade_out(a: PartnerActivity) -> AtividadeResponse:
    return AtividadeResponse.model_validate(a).model_copy(update={
        "user_name": a.user.name if a.user else None,
    })
```

Em `backend/app/api/deps.py`, depois de `require_service_access`:

```python
def require_parcerias_access():
    """
    Dependency do Programa de Parceiros: admin, gerente, Financeiro e parceiro.
    Vendedor, SDR, serviço e visualizador não acessam (403).
    """
    async def checker(
        current_user: User = Depends(get_current_active_user)
    ) -> User:
        allowed_roles = ("admin", "manager", "finance", "partner")
        if not current_user.role or current_user.role.name not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso restrito ao Programa de Parceiros."
            )
        return current_user

    return checker
```

- [ ] **Step 5: Rodar e ver passar**

Run: `MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest tests/unit/test_parcerias_acesso.py -q -p no:cacheprovider --color=no`
Expected: `6 passed`.

- [ ] **Step 6: Commit (perguntar antes)**

```bash
git add backend/app/schemas/parcerias.py backend/app/services/parcerias/acesso.py backend/app/services/parcerias/atividades.py backend/app/services/parcerias/respostas.py backend/app/api/deps.py backend/tests/unit/test_parcerias_acesso.py
git commit -m "feat(parcerias): schemas, visibilidade por parceiro e historico"
```

---

### Task 5: Ativação automática

**Files:**
- Create: `backend/app/services/parcerias/ativacao.py`
- Test: `backend/tests/unit/test_parcerias_ativacao.py`

- [ ] **Step 1: Escrever o teste que falha**

`backend/tests/unit/test_parcerias_ativacao.py`:

```python
"""Ativação → Ativado sozinho, na primeira evidência de uso do canal."""
from app.models.partner_activity import PartnerActivity
from app.services.parcerias import ativacao

from tests.unit.apoio_parcerias import oportunidade, parceiro_pronto


def test_evidencia_com_parceiro_em_ativacao_ativa_na_hora(db):
    p = parceiro_pronto(db, stage="ativacao")
    op = oportunidade(db, p)

    ativacao.registrar_evidencia(db, op, "oportunidade_validada", None)
    db.commit()
    db.refresh(p)

    assert p.stage == "ativado"
    assert p.activation_evidence == "oportunidade_validada"
    assert p.activation_opportunity_id == op.id
    assert p.activated_at is not None
    eventos = [a.description for a in db.query(PartnerActivity).filter(PartnerActivity.partner_id == p.id)]
    assert any("ativado automaticamente" in e for e in eventos)


def test_evidencia_antes_da_ativacao_fica_guardada(db):
    p = parceiro_pronto(db, stage="onboarding")
    op = oportunidade(db, p)

    ativacao.registrar_evidencia(db, op, "proposta_enviada", None)
    db.commit()
    assert p.stage == "onboarding"
    assert p.activation_evidence == "proposta_enviada"

    p.stage = "ativacao"
    assert ativacao.promover_se_ativo(db, p, None) is True
    assert p.stage == "ativado"


def test_a_primeira_evidencia_vale(db):
    p = parceiro_pronto(db, stage="onboarding")
    primeira, segunda = oportunidade(db, p), oportunidade(db, p, title="Outra")

    ativacao.registrar_evidencia(db, primeira, "oportunidade_validada", None)
    ativacao.registrar_evidencia(db, segunda, "primeira_venda", None)
    db.commit()

    assert p.activation_evidence == "oportunidade_validada"
    assert p.activation_opportunity_id == primeira.id


def test_sem_evidencia_fica_em_ativacao(db):
    p = parceiro_pronto(db, stage="ativacao")

    assert ativacao.promover_se_ativo(db, p, None) is False
    assert p.stage == "ativacao"
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest tests/unit/test_parcerias_ativacao.py -q -p no:cacheprovider --color=no`
Expected: FAIL com `ImportError: cannot import name 'ativacao'`.

- [ ] **Step 3: Implementar**

`backend/app/services/parcerias/ativacao.py`:

```python
"""
Ativação automática do parceiro (seção 3.1 do documento).

Onboarding concluído não é parceiro ativado: precisa de evidência prática de uso
do canal. A primeira evidência fica gravada (qual, quando e de qual
oportunidade); o card passa de Ativação para Ativado na hora, ou quando entrar
em Ativação, se a evidência veio antes.
"""
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.models.partner import Partner
from app.models.partner_opportunity import PartnerOpportunity
from app.models.user import User
from app.services.parcerias import atividades
from app.services.parcerias.etapas import TravaError, validar_mudanca_parceiro

EVIDENCIAS = {
    "oportunidade_validada": "Oportunidade validada",
    "proposta_enviada": "Proposta enviada",
    "primeira_venda": "Primeira venda",
}


def registrar_evidencia(db: Session, oportunidade: PartnerOpportunity, evidencia: str,
                        user: Optional[User]) -> None:
    """Quem chama faz o commit."""
    parceiro = oportunidade.partner
    if parceiro.activation_evidence is None:
        parceiro.activation_evidence = evidencia
        parceiro.activation_opportunity_id = oportunidade.id
        parceiro.activated_at = datetime.utcnow()
        atividades.registrar_evento(
            db, user,
            f"Critério de ativação cumprido: {EVIDENCIAS[evidencia]} ({oportunidade.title})",
            partner_id=parceiro.id,
        )
    promover_se_ativo(db, parceiro, user)


def promover_se_ativo(db: Session, parceiro: Partner, user: Optional[User]) -> bool:
    if parceiro.stage != "ativacao" or not parceiro.activation_evidence:
        return False
    try:
        validar_mudanca_parceiro(parceiro, "ativado", "sistema", automatico=True)
    except TravaError:
        return False
    parceiro.stage = "ativado"
    atividades.registrar_evento(db, user, "Parceiro ativado automaticamente", partner_id=parceiro.id)
    return True
```

- [ ] **Step 4: Rodar e ver passar**

Run: `MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest tests/unit/test_parcerias_ativacao.py -q -p no:cacheprovider --color=no`
Expected: `4 passed`.

- [ ] **Step 5: Commit (perguntar antes)**

```bash
git add backend/app/services/parcerias/ativacao.py backend/tests/unit/test_parcerias_ativacao.py
git commit -m "feat(parcerias): ativacao automatica do parceiro"
```

---

### Task 6: Board 1 — parceiros, Equipe e Acessos (serviço e rotas)

**Files:**
- Create: `backend/app/services/parcerias/parceiros.py`, `backend/app/api/v1/endpoints/parcerias.py`
- Modify: `backend/app/api/v1/__init__.py`
- Test: `backend/tests/unit/test_parcerias_aquisicao.py`

- [ ] **Step 1: Escrever o teste que falha**

`backend/tests/unit/test_parcerias_aquisicao.py`:

```python
"""Board 1 — Aquisição de Parceiros: cadastro, travas, Equipe e Acessos."""
from app.models.user import User

from tests.unit.apoio_parcerias import headers, parceiro, parceiro_pronto, role, usuario

URL = "/api/v1/parcerias"


def test_vendedor_nao_entra_em_parcerias(client, salesperson_headers):
    assert client.get(f"{URL}/etapas", headers=salesperson_headers).status_code == 403


def test_etapas_dos_dois_boards(client, admin_headers):
    resposta = client.get(f"{URL}/etapas", headers=admin_headers)

    assert resposta.status_code == 200
    assert resposta.json()["aquisicao"][0] == {"codigo": "potencial", "nome": "Potencial Parceiro"}
    assert resposta.json()["oportunidades"][-1]["codigo"] == "perdido"


def test_admin_cadastra_parceiro(client, admin_headers):
    resposta = client.post(f"{URL}/parceiros", json={"name": "Dmap"}, headers=admin_headers)

    assert resposta.status_code == 201
    assert resposta.json()["stage"] == "potencial"


def test_parceiro_nao_cadastra_parceiro(client, db):
    h = headers(usuario(db, "partner", "a@dmap.com", parceiro(db)))

    assert client.post(f"{URL}/parceiros", json={"name": "Outro"}, headers=h).status_code == 403


def test_parceiro_so_ve_o_proprio_card(client, db):
    a, b = parceiro(db, "Dmap"), parceiro(db, "Outro")
    h = headers(usuario(db, "partner", "a@dmap.com", a))

    lista = client.get(f"{URL}/parceiros", headers=h).json()

    assert [p["name"] for p in lista] == ["Dmap"]
    assert client.get(f"{URL}/parceiros/{b.id}", headers=h).status_code == 404


def test_trava_ao_sair_de_potencial(client, db, admin_headers, test_admin_user):
    p = parceiro(db)
    h = headers(usuario(db, "partner", "a@dmap.com", p))

    barrado = client.put(f"{URL}/parceiros/{p.id}/mover", json={"stage": "qualificacao"}, headers=h)
    assert barrado.status_code == 422
    assert "contato principal" in barrado.json()["detail"]

    client.put(f"{URL}/parceiros/{p.id}", json={
        "main_contact_name": "Carlos", "main_contact_phone": "11999990000",
        "hs_owner_id": test_admin_user.id,
    }, headers=admin_headers)
    assert client.put(f"{URL}/parceiros/{p.id}/mover", json={"stage": "qualificacao"}, headers=h).status_code == 200


def test_parceiro_nao_troca_o_responsavel_hs(client, db, test_admin_user):
    p = parceiro(db)
    h = headers(usuario(db, "partner", "a@dmap.com", p))

    resposta = client.put(f"{URL}/parceiros/{p.id}", json={"hs_owner_id": test_admin_user.id, "region": "SP"}, headers=h)

    assert resposta.status_code == 200
    assert resposta.json()["hs_owner_id"] is None
    assert resposta.json()["region"] == "SP"


def test_financeiro_nao_move(client, db):
    p = parceiro_pronto(db, stage="potencial")
    h = headers(usuario(db, "finance", "fin@hs.com"))

    assert client.put(f"{URL}/parceiros/{p.id}/mover", json={"stage": "qualificacao"}, headers=h).status_code == 403


def test_perdido_com_motivo(client, db, admin_headers):
    p = parceiro(db)

    sem_motivo = client.put(f"{URL}/parceiros/{p.id}/mover", json={"stage": "perdido"}, headers=admin_headers)
    assert sem_motivo.status_code == 422

    resposta = client.put(f"{URL}/parceiros/{p.id}/mover",
                          json={"stage": "perdido", "loss_reason": "Sem interesse"}, headers=admin_headers)
    assert resposta.status_code == 200
    assert resposta.json()["lost_at"] is not None


def test_entrar_em_ativacao_com_evidencia_ja_ativa(client, db, admin_headers):
    p = parceiro_pronto(db, stage="onboarding")
    p.activation_evidence = "oportunidade_validada"
    db.commit()

    resposta = client.put(f"{URL}/parceiros/{p.id}/mover", json={"stage": "ativacao"}, headers=admin_headers)

    assert resposta.json()["stage"] == "ativado"


def test_equipe_do_proprio_parceiro(client, db):
    a, b = parceiro(db, "Dmap"), parceiro(db, "Outro")
    h = headers(usuario(db, "partner", "a@dmap.com", a))

    criado = client.post(f"{URL}/parceiros/{a.id}/equipe", json={"name": "Ana"}, headers=h)
    assert criado.status_code == 201
    assert client.post(f"{URL}/parceiros/{b.id}/equipe", json={"name": "Intrusa"}, headers=h).status_code == 404

    desativado = client.put(f"{URL}/parceiros/{a.id}/equipe/{criado.json()['id']}",
                            json={"is_active": False}, headers=h)
    assert desativado.json()["is_active"] is False


def test_admin_cria_e_desativa_acesso(client, db, admin_headers):
    role(db, "partner")  # em produção vem da migration
    p = parceiro(db)
    dados = {"name": "Contato Dmap", "email": "Contato@Dmap.com", "password": "Senha@12345"}

    criado = client.post(f"{URL}/parceiros/{p.id}/acessos", json=dados, headers=admin_headers)
    assert criado.status_code == 201
    login = db.query(User).filter(User.email == "contato@dmap.com").one()
    assert login.partner_id == p.id
    assert login.role.name == "partner"

    assert client.post(f"{URL}/parceiros/{p.id}/acessos", json=dados, headers=admin_headers).status_code == 400

    desativado = client.put(f"{URL}/parceiros/{p.id}/acessos/{login.id}",
                            json={"is_active": False}, headers=admin_headers)
    assert desativado.json()["is_active"] is False


def test_parceiro_nao_cria_acesso(client, db):
    p = parceiro(db)
    h = headers(usuario(db, "partner", "a@dmap.com", p))
    dados = {"name": "X", "email": "x@dmap.com", "password": "Senha@12345"}

    assert client.post(f"{URL}/parceiros/{p.id}/acessos", json=dados, headers=h).status_code == 403
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest tests/unit/test_parcerias_aquisicao.py -q -p no:cacheprovider --color=no`
Expected: FAIL — rotas inexistentes (404 nos asserts de status).

- [ ] **Step 3: Serviço do board 1**

`backend/app/services/parcerias/parceiros.py`:

```python
"""Board 1 — Aquisição de Parceiros: o card do parceiro, a Equipe e os Acessos."""
from datetime import datetime
from typing import List

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.partner import Partner, PartnerTeamMember
from app.models.role import Role
from app.models.user import User
from app.schemas.parcerias import (
    AcessoCreate,
    MembroCreate,
    MembroUpdate,
    MoverRequest,
    ParceiroCreate,
    ParceiroUpdate,
)
from app.services.parcerias import acesso, ativacao, atividades
from app.services.parcerias.etapas import ETAPAS_AQUISICAO, TravaError, nome_da_etapa, validar_mudanca_parceiro


def listar(db: Session, user: User) -> List[Partner]:
    return acesso.parceiros_visiveis(db, user).order_by(Partner.position, Partner.id).all()


def criar(db: Session, user: User, dados: ParceiroCreate) -> Partner:
    acesso.exigir_gestao(user)
    p = Partner(**dados.model_dump(), stage="potencial", position=0, created_by_id=user.id)
    db.add(p)
    db.flush()
    atividades.registrar_evento(db, user, "Parceiro cadastrado", partner_id=p.id)
    db.commit()
    db.refresh(p)
    return p


def atualizar(db: Session, user: User, partner_id: int, dados: ParceiroUpdate) -> Partner:
    acesso.exigir_escrita(user)
    p = acesso.buscar_parceiro(db, user, partner_id)
    campos = dados.model_dump(exclude_unset=True)
    if not acesso.eh_gestao(user):
        # O responsável H&S é escolha da H&S.
        campos.pop("hs_owner_id", None)
    for campo, valor in campos.items():
        setattr(p, campo, valor)
    db.commit()
    db.refresh(p)
    return p


def mover(db: Session, user: User, partner_id: int, req: MoverRequest) -> Partner:
    acesso.exigir_escrita(user)
    p = acesso.buscar_parceiro(db, user, partner_id)
    origem = p.stage
    if req.stage == "perdido":
        p.loss_reason = (req.loss_reason or "").strip() or None
        p.loss_detail = req.loss_detail
    try:
        validar_mudanca_parceiro(p, req.stage, acesso.perfil(user))
    except TravaError as erro:
        db.rollback()
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(erro))

    if origem != req.stage:
        p.stage = req.stage
        if req.stage == "perdido":
            p.lost_at = datetime.utcnow()
        elif origem == "perdido":
            p.lost_at = p.loss_reason = p.loss_detail = None
        atividades.registrar_evento(
            db, user,
            f"Etapa: {nome_da_etapa(ETAPAS_AQUISICAO, origem)} → {nome_da_etapa(ETAPAS_AQUISICAO, req.stage)}",
            partner_id=p.id,
        )
    if req.position is not None:
        p.position = req.position
    if p.stage == "ativacao":
        ativacao.promover_se_ativo(db, p, user)
    db.commit()
    db.refresh(p)
    return p


# ─── Equipe ──────────────────────────────────────────────────────────────────

def listar_equipe(db: Session, user: User, partner_id: int) -> List[PartnerTeamMember]:
    p = acesso.buscar_parceiro(db, user, partner_id)
    return db.query(PartnerTeamMember).filter(PartnerTeamMember.partner_id == p.id) \
        .order_by(PartnerTeamMember.name).all()


def criar_membro(db: Session, user: User, partner_id: int, dados: MembroCreate) -> PartnerTeamMember:
    acesso.exigir_escrita(user)
    p = acesso.buscar_parceiro(db, user, partner_id)
    membro = PartnerTeamMember(partner_id=p.id, **dados.model_dump())
    db.add(membro)
    db.commit()
    db.refresh(membro)
    return membro


def atualizar_membro(db: Session, user: User, partner_id: int, membro_id: int,
                     dados: MembroUpdate) -> PartnerTeamMember:
    acesso.exigir_escrita(user)
    p = acesso.buscar_parceiro(db, user, partner_id)
    membro = db.query(PartnerTeamMember).filter(
        PartnerTeamMember.id == membro_id, PartnerTeamMember.partner_id == p.id
    ).first()
    if not membro:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Vendedor não encontrado.")
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(membro, campo, valor)
    db.commit()
    db.refresh(membro)
    return membro


# ─── Acessos (logins do parceiro) ────────────────────────────────────────────

def listar_acessos(db: Session, user: User, partner_id: int) -> List[User]:
    acesso.exigir_gestao(user)
    p = acesso.buscar_parceiro(db, user, partner_id)
    return db.query(User).filter(User.partner_id == p.id, User.is_deleted.is_(False)).order_by(User.name).all()


def criar_acesso(db: Session, user: User, partner_id: int, dados: AcessoCreate) -> User:
    acesso.exigir_gestao(user)
    p = acesso.buscar_parceiro(db, user, partner_id)
    if db.query(User).filter(func.lower(User.email) == dados.email).first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Email já cadastrado")
    papel = db.query(Role).filter(Role.name == "partner").first()
    if not papel:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Role 'partner' não existe. Rode as migrations.")
    login = User(
        name=dados.name.strip(),
        email=dados.email,
        password_hash=hash_password(dados.password),
        role_id=papel.id,
        partner_id=p.id,
        is_active=True,
        is_verified=True,
    )
    db.add(login)
    atividades.registrar_evento(db, user, f"Acesso criado para {dados.email}", partner_id=p.id)
    db.commit()
    db.refresh(login)
    return login


def alterar_acesso(db: Session, user: User, partner_id: int, user_id: int, ativo: bool) -> User:
    acesso.exigir_gestao(user)
    p = acesso.buscar_parceiro(db, user, partner_id)
    login = db.query(User).filter(User.id == user_id, User.partner_id == p.id).first()
    if not login:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Acesso não encontrado.")
    login.is_active = ativo
    atividades.registrar_evento(
        db, user, f"Acesso de {login.email} {'reativado' if ativo else 'desativado'}", partner_id=p.id
    )
    db.commit()
    db.refresh(login)
    return login
```

- [ ] **Step 4: Rotas do board 1 e registro do router**

`backend/app/api/v1/endpoints/parcerias.py`:

```python
"""
Endpoints do Programa de Parceiros (seção Parcerias).

Board 1 — Aquisição de Parceiros: /parceiros
Board 2 — Pipeline de Parceiros: /oportunidades
O router inteiro passa por require_parcerias_access (admin, gerente, Financeiro
e parceiro); quem vê o quê fica em app/services/parcerias/acesso.py.
"""
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.models.user import User
from app.schemas.parcerias import (
    AcessoCreate,
    AcessoResponse,
    AcessoUpdate,
    EtapaOut,
    EtapasResponse,
    MembroCreate,
    MembroResponse,
    MembroUpdate,
    MoverRequest,
    ParceiroCreate,
    ParceiroResponse,
    ParceiroUpdate,
)
from app.services.parcerias import parceiros, respostas
from app.services.parcerias.etapas import ETAPAS_AQUISICAO, ETAPAS_OPORTUNIDADE

router = APIRouter()


@router.get("/etapas", response_model=EtapasResponse, summary="Etapas dos dois boards")
def etapas_dos_boards():
    return EtapasResponse(
        aquisicao=[EtapaOut(codigo=e.codigo, nome=e.nome) for e in ETAPAS_AQUISICAO],
        oportunidades=[EtapaOut(codigo=e.codigo, nome=e.nome) for e in ETAPAS_OPORTUNIDADE],
    )


# ─── Board 1: Aquisição de Parceiros ─────────────────────────────────────────

@router.get("/parceiros", response_model=List[ParceiroResponse])
def listar_parceiros(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return [respostas.parceiro_out(db, p) for p in parceiros.listar(db, current_user)]


@router.post("/parceiros", response_model=ParceiroResponse, status_code=201)
def criar_parceiro(dados: ParceiroCreate, db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_active_user)):
    return respostas.parceiro_out(db, parceiros.criar(db, current_user, dados))


@router.get("/parceiros/{partner_id}", response_model=ParceiroResponse)
def buscar_parceiro(partner_id: int, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_active_user)):
    from app.services.parcerias import acesso
    return respostas.parceiro_out(db, acesso.buscar_parceiro(db, current_user, partner_id))


@router.put("/parceiros/{partner_id}", response_model=ParceiroResponse)
def atualizar_parceiro(partner_id: int, dados: ParceiroUpdate, db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_active_user)):
    return respostas.parceiro_out(db, parceiros.atualizar(db, current_user, partner_id, dados))


@router.put("/parceiros/{partner_id}/mover", response_model=ParceiroResponse)
def mover_parceiro(partner_id: int, req: MoverRequest, db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_active_user)):
    return respostas.parceiro_out(db, parceiros.mover(db, current_user, partner_id, req))


@router.get("/parceiros/{partner_id}/equipe", response_model=List[MembroResponse])
def listar_equipe(partner_id: int, db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_active_user)):
    return parceiros.listar_equipe(db, current_user, partner_id)


@router.post("/parceiros/{partner_id}/equipe", response_model=MembroResponse, status_code=201)
def criar_membro(partner_id: int, dados: MembroCreate, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_active_user)):
    return parceiros.criar_membro(db, current_user, partner_id, dados)


@router.put("/parceiros/{partner_id}/equipe/{membro_id}", response_model=MembroResponse)
def atualizar_membro(partner_id: int, membro_id: int, dados: MembroUpdate, db: Session = Depends(get_db),
                     current_user: User = Depends(get_current_active_user)):
    return parceiros.atualizar_membro(db, current_user, partner_id, membro_id, dados)


@router.get("/parceiros/{partner_id}/acessos", response_model=List[AcessoResponse])
def listar_acessos(partner_id: int, db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_active_user)):
    return parceiros.listar_acessos(db, current_user, partner_id)


@router.post("/parceiros/{partner_id}/acessos", response_model=AcessoResponse, status_code=201)
def criar_acesso(partner_id: int, dados: AcessoCreate, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_active_user)):
    return parceiros.criar_acesso(db, current_user, partner_id, dados)


@router.put("/parceiros/{partner_id}/acessos/{user_id}", response_model=AcessoResponse)
def alterar_acesso(partner_id: int, user_id: int, dados: AcessoUpdate, db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_active_user)):
    return parceiros.alterar_acesso(db, current_user, partner_id, user_id, dados.is_active)
```

Trocar o import local do `buscar_parceiro` por um import no topo: adicionar `acesso` em `from app.services.parcerias import parceiros, respostas` → `from app.services.parcerias import acesso, parceiros, respostas` e remover a linha `from app.services.parcerias import acesso` de dentro da função.

Em `backend/app/api/v1/__init__.py`: incluir `parcerias` no import dos endpoints (mesma linha/estilo dos outros módulos) e, depois do `service_products`:

```python
api_router.include_router(parcerias.router, prefix="/parcerias", tags=["Parcerias"], dependencies=[Depends(require_parcerias_access())])
```

e acrescentar `require_parcerias_access` no import de `app.api.deps` desse arquivo.

- [ ] **Step 5: Rodar e ver passar**

Run: `MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest tests/unit/test_parcerias_aquisicao.py tests/unit/test_parcerias_tranca.py -q -p no:cacheprovider --color=no`
Expected: tudo passa (`13 passed` + `5 passed`). A tranca continua verde: `/api/v1/parcerias` está na lista liberada.

- [ ] **Step 6: Commit (perguntar antes)**

```bash
git add backend/app/services/parcerias/parceiros.py backend/app/api/v1/endpoints/parcerias.py backend/app/api/v1/__init__.py backend/tests/unit/test_parcerias_aquisicao.py
git commit -m "feat(parcerias): board Aquisicao de Parceiros com Equipe e Acessos"
```

---

### Task 7: Board 2 — oportunidades, elegibilidade, produtos

**Files:**
- Create: `backend/app/services/parcerias/oportunidades.py`
- Modify: `backend/app/api/v1/endpoints/parcerias.py`
- Test: `backend/tests/unit/test_parcerias_oportunidades.py`

- [ ] **Step 1: Escrever o teste que falha**

`backend/tests/unit/test_parcerias_oportunidades.py`:

```python
"""Board 2 — Pipeline de Parceiros: cadastro, isolamento, travas, elegibilidade, produtos, ativação."""
from app.models.partner import PartnerTeamMember
from app.models.product import Product

from tests.unit.apoio_parcerias import (
    CNPJ_A,
    CNPJ_B,
    headers,
    oportunidade,
    parceiro,
    parceiro_pronto,
    usuario,
)

URL = "/api/v1/parcerias/oportunidades"

NOVA = {
    "title": "Etilômetros Empresa A", "deal_type": "Nova Venda",
    "sector": "Indústrias de Transformação", "relationship_type": "Prospect",
    "context": "Frota de 40 caminhões", "cnpj": "11.222.333/0001-81", "company_name": "Empresa A",
}


def _login_parceiro(db, p, email="a@dmap.com"):
    return headers(usuario(db, "partner", email, p))


def test_parceiro_cria_no_proprio_canal(client, db):
    a, b = parceiro(db, "Dmap"), parceiro(db, "Outro")

    resposta = client.post(URL, json={**NOVA, "partner_id": b.id}, headers=_login_parceiro(db, a))

    assert resposta.status_code == 201
    corpo = resposta.json()
    assert corpo["partner_id"] == a.id
    assert corpo["partner_name"] == "Dmap"
    assert corpo["acquisition_channel"] == "Parceiros"
    assert corpo["stage"] == "novo_lead"
    assert corpo["eligibility_status"] == "em_analise"
    assert corpo["cnpj"] == CNPJ_A
    assert corpo["last_activity_at"] is not None


def test_dados_minimos(client, db):
    h = _login_parceiro(db, parceiro(db))

    assert client.post(URL, json={**NOVA, "context": ""}, headers=h).status_code == 422
    assert client.post(URL, json={**NOVA, "cnpj": "11222333000182"}, headers=h).status_code == 422


def test_admin_escolhe_o_parceiro(client, db, admin_headers):
    sem = client.post(URL, json=NOVA, headers=admin_headers)
    assert sem.status_code == 422
    assert "Escolha o parceiro" in sem.json()["detail"]

    p = parceiro(db)
    assert client.post(URL, json={**NOVA, "partner_id": p.id}, headers=admin_headers).status_code == 201


def test_vendedor_tem_que_ser_da_equipe(client, db):
    a, b = parceiro(db, "Dmap"), parceiro(db, "Outro")
    de_fora = PartnerTeamMember(partner_id=b.id, name="Bia")
    db.add(de_fora)
    db.commit()

    resposta = client.post(URL, json={**NOVA, "seller_member_id": de_fora.id}, headers=_login_parceiro(db, a))

    assert resposta.status_code == 422


def test_isolamento_entre_parceiros(client, db):
    a, b = parceiro(db, "Dmap"), parceiro(db, "Outro")
    oportunidade(db, a)
    op_b = oportunidade(db, b, cnpj=CNPJ_B)
    h = _login_parceiro(db, a)

    assert [o["partner_id"] for o in client.get(URL, headers=h).json()] == [a.id]
    assert client.get(f"{URL}/{op_b.id}", headers=h).status_code == 404
    assert client.put(f"{URL}/{op_b.id}", json={"title": "x"}, headers=h).status_code == 404
    assert client.put(f"{URL}/{op_b.id}/mover", json={"stage": "perdido", "loss_reason": "x"},
                      headers=h).status_code == 404


def test_novo_lead_so_sai_validado(client, db):
    p = parceiro(db)
    op = oportunidade(db, p)
    h = _login_parceiro(db, p)

    barrado = client.put(f"{URL}/{op.id}/mover", json={"stage": "oportunidade"}, headers=h)

    assert barrado.status_code == 422
    assert "Validada" in barrado.json()["detail"]


def test_elegibilidade(client, db):
    p = parceiro(db)
    op = oportunidade(db, p)
    financeiro = headers(usuario(db, "finance", "fin@hs.com"))

    assert client.put(f"{URL}/{op.id}/elegibilidade", json={"status": "validada"},
                      headers=_login_parceiro(db, p)).status_code == 403
    assert client.put(f"{URL}/{op.id}/elegibilidade", json={"status": "rejeitada"},
                      headers=financeiro).status_code == 422

    validada = client.put(f"{URL}/{op.id}/elegibilidade", json={"status": "validada"}, headers=financeiro)
    assert validada.status_code == 200
    assert validada.json()["eligibility_by_name"] == "fin"


def test_elegibilidade_so_em_novo_lead(client, db):
    op = oportunidade(db, parceiro(db), stage="oportunidade", eligibility_status="validada")
    financeiro = headers(usuario(db, "finance", "fin@hs.com"))

    resposta = client.put(f"{URL}/{op.id}/elegibilidade", json={"status": "rejeitada", "note": "x"},
                          headers=financeiro)

    assert resposta.status_code == 422


def test_negociacao_pede_data_e_ganho_pede_modalidade(client, db):
    p = parceiro(db)
    op = oportunidade(db, p, stage="proposta", eligibility_status="validada")
    h = _login_parceiro(db, p)

    assert client.put(f"{URL}/{op.id}/mover", json={"stage": "negociacao"}, headers=h).status_code == 422
    com_data = client.put(f"{URL}/{op.id}/mover",
                          json={"stage": "negociacao", "expected_close_date": "2026-11-30"}, headers=h)
    assert com_data.status_code == 200

    assert client.put(f"{URL}/{op.id}/mover", json={"stage": "ganho"}, headers=h).status_code == 422
    ganho = client.put(f"{URL}/{op.id}/mover", json={"stage": "ganho", "modality": "venda"}, headers=h)
    assert ganho.status_code == 200
    assert ganho.json()["won_at"] is not None

    reabrir = client.put(f"{URL}/{op.id}/mover", json={"stage": "negociacao"}, headers=h)
    assert reabrir.status_code == 422


def test_cnpj_nao_muda_depois_de_validado(client, db):
    p = parceiro(db)
    op = oportunidade(db, p, eligibility_status="validada")

    resposta = client.put(f"{URL}/{op.id}", json={"cnpj": CNPJ_B}, headers=_login_parceiro(db, p))

    assert resposta.status_code == 422


def test_financeiro_nao_cria_oportunidade(client, db):
    p = parceiro(db)
    financeiro = headers(usuario(db, "finance", "fin@hs.com"))

    assert client.post(URL, json={**NOVA, "partner_id": p.id}, headers=financeiro).status_code == 403


def test_produtos_e_valor(client, db):
    p = parceiro(db)
    op = oportunidade(db, p)
    h = _login_parceiro(db, p)
    ativo = Product(name="Etilômetro", sku="ETL-1", unit_price=1500)
    inativo = Product(name="Antigo", unit_price=10, is_active=False)
    db.add_all([ativo, inativo])
    db.commit()

    catalogo = client.get("/api/v1/parcerias/produtos", params={"busca": "etil"}, headers=h).json()
    assert [c["name"] for c in catalogo] == ["Etilômetro"]

    item = client.post(f"{URL}/{op.id}/produtos", json={"product_id": ativo.id, "quantity": 2}, headers=h)
    assert item.status_code == 201
    assert item.json()["total"] == 3000
    assert client.get(f"{URL}/{op.id}", headers=h).json()["total_value"] == 3000

    assert client.post(f"{URL}/{op.id}/produtos", json={"product_id": inativo.id}, headers=h).status_code == 422

    assert client.delete(f"{URL}/{op.id}/produtos/{item.json()['id']}", headers=h).status_code == 200
    assert client.get(f"{URL}/{op.id}/produtos", headers=h).json() == []


def test_validar_ativa_o_parceiro(client, db):
    p = parceiro_pronto(db, stage="ativacao")
    op = oportunidade(db, p)
    financeiro = headers(usuario(db, "finance", "fin@hs.com"))

    client.put(f"{URL}/{op.id}/elegibilidade", json={"status": "validada"}, headers=financeiro)

    parceiro_depois = client.get(f"/api/v1/parcerias/parceiros/{p.id}", headers=financeiro).json()
    assert parceiro_depois["stage"] == "ativado"
    assert parceiro_depois["activation_evidence"] == "oportunidade_validada"


def test_proposta_conta_como_evidencia(client, db):
    p = parceiro_pronto(db, stage="ativacao")
    op = oportunidade(db, p, stage="oportunidade", eligibility_status="validada")
    p.activation_evidence = None
    db.commit()

    client.put(f"{URL}/{op.id}/mover", json={"stage": "proposta"}, headers=_login_parceiro(db, p))

    db.refresh(p)
    assert p.activation_evidence == "proposta_enviada"
    assert p.stage == "ativado"
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest tests/unit/test_parcerias_oportunidades.py -q -p no:cacheprovider --color=no`
Expected: FAIL — rotas `/oportunidades` inexistentes.

- [ ] **Step 3: Serviço do board 2**

`backend/app/services/parcerias/oportunidades.py`:

```python
"""Board 2 — Pipeline de Parceiros: oportunidade, elegibilidade, produtos e catálogo."""
from datetime import datetime
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.partner import PartnerTeamMember
from app.models.partner_opportunity import PartnerOpportunity, PartnerOpportunityProduct
from app.models.product import Product
from app.models.user import User
from app.schemas.parcerias import (
    ElegibilidadeRequest,
    MoverRequest,
    OportunidadeCreate,
    OportunidadeUpdate,
    ProdutoItemCreate,
    ProdutoItemUpdate,
)
from app.services.parcerias import acesso, ativacao, atividades
from app.services.parcerias.etapas import (
    ETAPAS_OPORTUNIDADE,
    TravaError,
    nome_da_etapa,
    validar_mudanca_oportunidade,
)

ELEGIBILIDADE = {"em_analise": "Em análise", "validada": "Validada", "rejeitada": "Rejeitada"}
# Etapas que contam como "proposta enviada" para a ativação do parceiro.
ETAPAS_COM_PROPOSTA = ("proposta", "negociacao", "aguardando_pedido")


def _422(mensagem: str) -> HTTPException:
    return HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, mensagem)


def _conferir_vendedor(db: Session, partner_id: int, membro_id: Optional[int]) -> None:
    if membro_id is None:
        return
    membro = db.query(PartnerTeamMember).filter(
        PartnerTeamMember.id == membro_id,
        PartnerTeamMember.partner_id == partner_id,
        PartnerTeamMember.is_active.is_(True),
    ).first()
    if not membro:
        raise _422("O vendedor escolhido não é da equipe deste parceiro.")


def listar(db: Session, user: User, partner_id: Optional[int] = None) -> List[PartnerOpportunity]:
    q = acesso.oportunidades_visiveis(db, user)
    if partner_id is not None:
        q = q.filter(PartnerOpportunity.partner_id == partner_id)
    return q.order_by(PartnerOpportunity.position, PartnerOpportunity.id.desc()).all()


def criar(db: Session, user: User, dados: OportunidadeCreate) -> PartnerOpportunity:
    acesso.exigir_escrita(user)
    if acesso.eh_parceiro(user):
        partner_id = acesso.parceiro_do_login(user)
    else:
        if not dados.partner_id:
            raise _422("Escolha o parceiro da oportunidade.")
        partner_id = acesso.buscar_parceiro(db, user, dados.partner_id).id
    _conferir_vendedor(db, partner_id, dados.seller_member_id)

    agora = datetime.utcnow()
    op = PartnerOpportunity(
        **dados.model_dump(exclude={"partner_id"}),
        partner_id=partner_id,
        stage="novo_lead",
        eligibility_status="em_analise",
        position=0,
        last_activity_at=agora,
        created_by_id=user.id,
    )
    db.add(op)
    db.flush()
    atividades.registrar_evento(db, user, "Oportunidade cadastrada", opportunity_id=op.id)
    db.commit()
    db.refresh(op)
    return op


def atualizar(db: Session, user: User, opportunity_id: int, dados: OportunidadeUpdate) -> PartnerOpportunity:
    acesso.exigir_escrita(user)
    op = acesso.buscar_oportunidade(db, user, opportunity_id)
    campos = dados.model_dump(exclude_unset=True)
    if "seller_member_id" in campos:
        _conferir_vendedor(db, op.partner_id, campos["seller_member_id"])
    novo_cnpj = campos.get("cnpj")
    if novo_cnpj and novo_cnpj != op.cnpj and op.eligibility_status != "em_analise" and not acesso.eh_gestao(user):
        raise _422("O CNPJ não muda depois da validação da elegibilidade.")
    for campo, valor in campos.items():
        setattr(op, campo, valor)
    db.commit()
    db.refresh(op)
    return op


def mover(db: Session, user: User, opportunity_id: int, req: MoverRequest) -> PartnerOpportunity:
    acesso.exigir_escrita(user)
    op = acesso.buscar_oportunidade(db, user, opportunity_id)
    origem = op.stage
    if req.expected_close_date:
        op.expected_close_date = req.expected_close_date
    if req.modality:
        op.modality = req.modality
    if req.stage == "perdido":
        op.loss_reason = (req.loss_reason or "").strip() or None
        op.loss_detail = req.loss_detail
    try:
        validar_mudanca_oportunidade(op, req.stage, acesso.perfil(user))
    except TravaError as erro:
        db.rollback()
        raise _422(str(erro))

    if origem != req.stage:
        agora = datetime.utcnow()
        op.stage = req.stage
        op.won_at = agora if req.stage == "ganho" else None
        op.lost_at = agora if req.stage == "perdido" else None
        if origem == "perdido":
            op.loss_reason = op.loss_detail = None
        atividades.registrar_evento(
            db, user,
            f"Etapa: {nome_da_etapa(ETAPAS_OPORTUNIDADE, origem)} → {nome_da_etapa(ETAPAS_OPORTUNIDADE, req.stage)}",
            opportunity_id=op.id,
        )
        atividades.tocar(op)
        if req.stage == "ganho":
            ativacao.registrar_evidencia(db, op, "primeira_venda", user)
        elif req.stage in ETAPAS_COM_PROPOSTA:
            ativacao.registrar_evidencia(db, op, "proposta_enviada", user)
    if req.position is not None:
        op.position = req.position
    db.commit()
    db.refresh(op)
    return op


def definir_elegibilidade(db: Session, user: User, opportunity_id: int,
                          req: ElegibilidadeRequest) -> PartnerOpportunity:
    if acesso.perfil(user) not in acesso.VALIDAM_ELEGIBILIDADE:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Só o Financeiro, admin ou gerente validam a elegibilidade.")
    op = acesso.buscar_oportunidade(db, user, opportunity_id)
    if op.stage != "novo_lead":
        raise _422("A elegibilidade só muda enquanto a oportunidade está em Novo Lead.")
    nota = (req.note or "").strip() or None
    if req.status == "rejeitada" and not nota:
        raise _422("Explique por que a oportunidade foi rejeitada.")

    op.eligibility_status = req.status
    op.eligibility_note = nota
    op.eligibility_by_id = user.id
    op.eligibility_at = datetime.utcnow()
    descricao = f"Elegibilidade: {ELEGIBILIDADE[req.status]}"
    if nota:
        descricao += f" — {nota}"
    atividades.registrar_evento(db, user, descricao, opportunity_id=op.id)
    if req.status == "validada":
        ativacao.registrar_evidencia(db, op, "oportunidade_validada", user)
    db.commit()
    db.refresh(op)
    return op


# ─── Produtos ────────────────────────────────────────────────────────────────

def _produto_do_catalogo(db: Session, product_id: int) -> Product:
    produto = db.query(Product).filter(
        Product.id == product_id, Product.is_active.is_(True), Product.is_deleted.is_(False)
    ).first()
    if not produto:
        raise _422("Produto não encontrado no catálogo.")
    return produto


def _buscar_item(db: Session, op: PartnerOpportunity, item_id: int) -> PartnerOpportunityProduct:
    item = db.query(PartnerOpportunityProduct).filter(
        PartnerOpportunityProduct.id == item_id, PartnerOpportunityProduct.opportunity_id == op.id
    ).first()
    if not item:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Produto não encontrado na oportunidade.")
    return item


def listar_produtos(db: Session, user: User, opportunity_id: int) -> List[PartnerOpportunityProduct]:
    op = acesso.buscar_oportunidade(db, user, opportunity_id)
    return db.query(PartnerOpportunityProduct).filter(
        PartnerOpportunityProduct.opportunity_id == op.id
    ).order_by(PartnerOpportunityProduct.id).all()


def adicionar_produto(db: Session, user: User, opportunity_id: int,
                      dados: ProdutoItemCreate) -> PartnerOpportunityProduct:
    acesso.exigir_escrita(user)
    op = acesso.buscar_oportunidade(db, user, opportunity_id)
    produto = _produto_do_catalogo(db, dados.product_id)
    item = PartnerOpportunityProduct(
        opportunity_id=op.id,
        product_id=produto.id,
        quantity=dados.quantity,
        unit_price=dados.unit_price if dados.unit_price is not None else produto.unit_price,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def atualizar_produto(db: Session, user: User, opportunity_id: int, item_id: int,
                      dados: ProdutoItemUpdate) -> PartnerOpportunityProduct:
    acesso.exigir_escrita(user)
    op = acesso.buscar_oportunidade(db, user, opportunity_id)
    item = _buscar_item(db, op, item_id)
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(item, campo, valor)
    db.commit()
    db.refresh(item)
    return item


def remover_produto(db: Session, user: User, opportunity_id: int, item_id: int) -> None:
    acesso.exigir_escrita(user)
    op = acesso.buscar_oportunidade(db, user, opportunity_id)
    db.delete(_buscar_item(db, op, item_id))
    db.commit()


def catalogo(db: Session, busca: str = "", limite: int = 20) -> List[Product]:
    q = db.query(Product).filter(Product.is_active.is_(True), Product.is_deleted.is_(False))
    termo = busca.strip()
    if termo:
        like = f"%{termo}%"
        q = q.filter(or_(Product.name.ilike(like), Product.sku.ilike(like)))
    return q.order_by(Product.name).limit(limite).all()
```

- [ ] **Step 4: Rotas do board 2**

Em `backend/app/api/v1/endpoints/parcerias.py`:

Trocar o import do FastAPI por `from fastapi import APIRouter, Depends, Query`, acrescentar `from typing import List, Optional`, acrescentar ao import de schemas:

```python
    ElegibilidadeRequest,
    OportunidadeCreate,
    OportunidadeResponse,
    OportunidadeUpdate,
    ProdutoCatalogo,
    ProdutoItemCreate,
    ProdutoItemResponse,
    ProdutoItemUpdate,
```

e trocar `from app.services.parcerias import acesso, parceiros, respostas` por `from app.services.parcerias import acesso, oportunidades, parceiros, respostas`. No fim do arquivo:

```python
# ─── Board 2: Pipeline de Parceiros ──────────────────────────────────────────

def _uma(db: Session, op) -> OportunidadeResponse:
    return respostas.oportunidade_out(op, respostas.valores_por_oportunidade(db, [op.id]).get(op.id, 0))


@router.get("/oportunidades", response_model=List[OportunidadeResponse])
def listar_oportunidades(partner_id: Optional[int] = None, db: Session = Depends(get_db),
                         current_user: User = Depends(get_current_active_user)):
    return respostas.oportunidades_out(db, oportunidades.listar(db, current_user, partner_id))


@router.post("/oportunidades", response_model=OportunidadeResponse, status_code=201)
def criar_oportunidade(dados: OportunidadeCreate, db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_active_user)):
    return _uma(db, oportunidades.criar(db, current_user, dados))


@router.get("/oportunidades/{opportunity_id}", response_model=OportunidadeResponse)
def buscar_oportunidade(opportunity_id: int, db: Session = Depends(get_db),
                        current_user: User = Depends(get_current_active_user)):
    return _uma(db, acesso.buscar_oportunidade(db, current_user, opportunity_id))


@router.put("/oportunidades/{opportunity_id}", response_model=OportunidadeResponse)
def atualizar_oportunidade(opportunity_id: int, dados: OportunidadeUpdate, db: Session = Depends(get_db),
                           current_user: User = Depends(get_current_active_user)):
    return _uma(db, oportunidades.atualizar(db, current_user, opportunity_id, dados))


@router.put("/oportunidades/{opportunity_id}/mover", response_model=OportunidadeResponse)
def mover_oportunidade(opportunity_id: int, req: MoverRequest, db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_active_user)):
    return _uma(db, oportunidades.mover(db, current_user, opportunity_id, req))


@router.put("/oportunidades/{opportunity_id}/elegibilidade", response_model=OportunidadeResponse)
def definir_elegibilidade(opportunity_id: int, req: ElegibilidadeRequest, db: Session = Depends(get_db),
                          current_user: User = Depends(get_current_active_user)):
    return _uma(db, oportunidades.definir_elegibilidade(db, current_user, opportunity_id, req))


@router.get("/oportunidades/{opportunity_id}/produtos", response_model=List[ProdutoItemResponse])
def listar_produtos(opportunity_id: int, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_active_user)):
    return [respostas.item_out(i) for i in oportunidades.listar_produtos(db, current_user, opportunity_id)]


@router.post("/oportunidades/{opportunity_id}/produtos", response_model=ProdutoItemResponse, status_code=201)
def adicionar_produto(opportunity_id: int, dados: ProdutoItemCreate, db: Session = Depends(get_db),
                      current_user: User = Depends(get_current_active_user)):
    return respostas.item_out(oportunidades.adicionar_produto(db, current_user, opportunity_id, dados))


@router.put("/oportunidades/{opportunity_id}/produtos/{item_id}", response_model=ProdutoItemResponse)
def atualizar_produto(opportunity_id: int, item_id: int, dados: ProdutoItemUpdate,
                      db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return respostas.item_out(oportunidades.atualizar_produto(db, current_user, opportunity_id, item_id, dados))


@router.delete("/oportunidades/{opportunity_id}/produtos/{item_id}")
def remover_produto(opportunity_id: int, item_id: int, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_active_user)):
    oportunidades.remover_produto(db, current_user, opportunity_id, item_id)
    return {"ok": True}


@router.get("/produtos", response_model=List[ProdutoCatalogo], summary="Catálogo resumido para o parceiro")
def catalogo(busca: str = Query("", max_length=100), db: Session = Depends(get_db)):
    return [
        ProdutoCatalogo(id=p.id, name=p.name, sku=p.sku, unit_price=float(p.unit_price or 0))
        for p in oportunidades.catalogo(db, busca)
    ]
```

- [ ] **Step 5: Rodar e ver passar**

Run: `MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest tests/unit/test_parcerias_oportunidades.py -q -p no:cacheprovider --color=no`
Expected: `14 passed`.

- [ ] **Step 6: Commit (perguntar antes)**

```bash
git add backend/app/services/parcerias/oportunidades.py backend/app/api/v1/endpoints/parcerias.py backend/tests/unit/test_parcerias_oportunidades.py
git commit -m "feat(parcerias): board Pipeline de Parceiros com elegibilidade e produtos"
```

---

### Task 8: Rotas de atividades

**Files:**
- Modify: `backend/app/api/v1/endpoints/parcerias.py`
- Test: `backend/tests/unit/test_parcerias_atividades.py`

- [ ] **Step 1: Escrever o teste que falha**

`backend/tests/unit/test_parcerias_atividades.py`:

```python
"""Atividades dos dois boards: criar, concluir, excluir e o histórico."""
from datetime import datetime, timedelta

from tests.unit.apoio_parcerias import headers, oportunidade, parceiro, usuario

URL = "/api/v1/parcerias"


def test_atividade_na_oportunidade_atualiza_a_ultima_atividade(client, db):
    p = parceiro(db)
    op = oportunidade(db, p, last_activity_at=datetime.utcnow() - timedelta(days=20))
    h = headers(usuario(db, "partner", "a@dmap.com", p))

    criada = client.post(f"{URL}/oportunidades/{op.id}/atividades",
                         json={"type": "ligacao", "description": "Liguei para o comprador"}, headers=h)

    assert criada.status_code == 201
    assert criada.json()["user_name"] == "a"
    db.refresh(op)
    assert op.last_activity_at > datetime.utcnow() - timedelta(minutes=1)


def test_concluir_e_excluir(client, db):
    p = parceiro(db)
    h = headers(usuario(db, "partner", "a@dmap.com", p))
    tarefa = client.post(f"{URL}/parceiros/{p.id}/atividades",
                         json={"type": "tarefa", "description": "Enviar contrato",
                               "due_at": "2026-11-05T10:00:00"}, headers=h).json()

    concluida = client.patch(f"{URL}/atividades/{tarefa['id']}/concluir", json={"is_completed": True}, headers=h)
    assert concluida.json()["completed_at"] is not None

    assert client.delete(f"{URL}/atividades/{tarefa['id']}", headers=h).status_code == 200
    assert client.get(f"{URL}/parceiros/{p.id}/atividades", headers=h).json() == []


def test_evento_nao_se_exclui(client, db, admin_headers):
    criado = client.post(f"{URL}/parceiros", json={"name": "Dmap"}, headers=admin_headers).json()
    [evento] = client.get(f"{URL}/parceiros/{criado['id']}/atividades", headers=admin_headers).json()

    assert evento["type"] == "evento"
    assert client.delete(f"{URL}/atividades/{evento['id']}", headers=admin_headers).status_code == 422


def test_parceiro_nao_mexe_em_atividade_de_outro(client, db):
    a, b = parceiro(db, "Dmap"), parceiro(db, "Outro")
    op_b = oportunidade(db, b)
    h_b = headers(usuario(db, "partner", "b@outro.com", b))
    atividade = client.post(f"{URL}/oportunidades/{op_b.id}/atividades",
                            json={"type": "nota", "description": "x"}, headers=h_b).json()
    h_a = headers(usuario(db, "partner", "a@dmap.com", a))

    assert client.get(f"{URL}/oportunidades/{op_b.id}/atividades", headers=h_a).status_code == 404
    assert client.delete(f"{URL}/atividades/{atividade['id']}", headers=h_a).status_code == 404


def test_financeiro_so_le(client, db):
    p = parceiro(db)
    financeiro = headers(usuario(db, "finance", "fin@hs.com"))

    assert client.get(f"{URL}/parceiros/{p.id}/atividades", headers=financeiro).status_code == 200
    assert client.post(f"{URL}/parceiros/{p.id}/atividades", json={"type": "nota", "description": "x"},
                       headers=financeiro).status_code == 403
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest tests/unit/test_parcerias_atividades.py -q -p no:cacheprovider --color=no`
Expected: FAIL — rotas de atividades inexistentes.

- [ ] **Step 3: Rotas**

Em `backend/app/api/v1/endpoints/parcerias.py`, acrescentar ao import de schemas `AtividadeCreate, AtividadeResponse, ConcluirRequest`, trocar o import dos serviços por `from app.services.parcerias import acesso, atividades, oportunidades, parceiros, respostas` e acrescentar no fim:

```python
# ─── Atividades (os dois boards) ─────────────────────────────────────────────

@router.get("/parceiros/{partner_id}/atividades", response_model=List[AtividadeResponse])
def atividades_do_parceiro(partner_id: int, db: Session = Depends(get_db),
                           current_user: User = Depends(get_current_active_user)):
    p = acesso.buscar_parceiro(db, current_user, partner_id)
    return [respostas.atividade_out(a) for a in atividades.listar(db, partner_id=p.id)]


@router.post("/parceiros/{partner_id}/atividades", response_model=AtividadeResponse, status_code=201)
def criar_atividade_do_parceiro(partner_id: int, dados: AtividadeCreate, db: Session = Depends(get_db),
                                current_user: User = Depends(get_current_active_user)):
    p = acesso.buscar_parceiro(db, current_user, partner_id)
    return respostas.atividade_out(atividades.criar(db, current_user, dados, partner_id=p.id))


@router.get("/oportunidades/{opportunity_id}/atividades", response_model=List[AtividadeResponse])
def atividades_da_oportunidade(opportunity_id: int, db: Session = Depends(get_db),
                               current_user: User = Depends(get_current_active_user)):
    op = acesso.buscar_oportunidade(db, current_user, opportunity_id)
    return [respostas.atividade_out(a) for a in atividades.listar(db, opportunity_id=op.id)]


@router.post("/oportunidades/{opportunity_id}/atividades", response_model=AtividadeResponse, status_code=201)
def criar_atividade_da_oportunidade(opportunity_id: int, dados: AtividadeCreate, db: Session = Depends(get_db),
                                    current_user: User = Depends(get_current_active_user)):
    op = acesso.buscar_oportunidade(db, current_user, opportunity_id)
    return respostas.atividade_out(atividades.criar(db, current_user, dados, oportunidade=op))


@router.patch("/atividades/{atividade_id}/concluir", response_model=AtividadeResponse)
def concluir_atividade(atividade_id: int, req: ConcluirRequest, db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_active_user)):
    return respostas.atividade_out(atividades.concluir(db, current_user, atividade_id, req.is_completed))


@router.delete("/atividades/{atividade_id}")
def excluir_atividade(atividade_id: int, db: Session = Depends(get_db),
                      current_user: User = Depends(get_current_active_user)):
    atividades.excluir(db, current_user, atividade_id)
    return {"ok": True}
```

- [ ] **Step 4: Rodar todos os testes de Parcerias**

Run: `MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest tests/unit -k parcerias -q -p no:cacheprovider --color=no`
Expected: tudo passa (2 + 5 + 13 + 6 + 4 + 13 + 14 + 5 = 62).

- [ ] **Step 5: Commit (perguntar antes)**

```bash
git add backend/app/api/v1/endpoints/parcerias.py backend/tests/unit/test_parcerias_atividades.py
git commit -m "feat(parcerias): atividades e historico dos dois boards"
```

---

### Task 9: Usuários — lista de perfis e recusa de login de parceiro pela tela de Usuários

**Files:**
- Modify: `backend/app/api/v1/endpoints/users.py`
- Test: `backend/tests/unit/test_parcerias_usuarios.py`

- [ ] **Step 1: Escrever o teste que falha**

`backend/tests/unit/test_parcerias_usuarios.py`:

```python
"""Tela de Usuários: Financeiro entra pelo cadastro normal; parceiro só pelo card dele."""
from tests.unit.apoio_parcerias import role, usuario


def test_lista_os_perfis(client, db, admin_headers):
    role(db, "finance")
    role(db, "partner")

    resposta = client.get("/api/v1/users/roles", headers=admin_headers)

    assert resposta.status_code == 200
    assert {"admin", "finance", "partner"} <= {r["name"] for r in resposta.json()}


def test_vendedor_nao_lista_perfis(client, salesperson_headers):
    assert client.get("/api/v1/users/roles", headers=salesperson_headers).status_code == 403


def test_nao_cria_login_de_parceiro_pela_tela_de_usuarios(client, db, admin_headers):
    papel = role(db, "partner")
    dados = {"name": "X", "email": "x@dmap.com", "password": "Senha@12345", "role_id": papel.id}

    resposta = client.post("/api/v1/users", json=dados, headers=admin_headers)

    assert resposta.status_code == 422
    assert "card do parceiro" in resposta.json()["detail"]


def test_nao_vira_parceiro_pela_edicao(client, db, admin_headers):
    alvo = usuario(db, "salesperson", "vend@hs.com")
    papel = role(db, "partner")

    resposta = client.put(f"/api/v1/users/{alvo.id}", json={"role_id": papel.id}, headers=admin_headers)

    assert resposta.status_code == 422


def test_cria_financeiro(client, db, admin_headers):
    papel = role(db, "finance")
    dados = {"name": "Fin", "email": "fin@hs.com", "password": "Senha@12345", "role_id": papel.id}

    # A rota de criação de usuário responde 200 (não declara status_code).
    assert client.post("/api/v1/users", json=dados, headers=admin_headers).status_code == 200
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest tests/unit/test_parcerias_usuarios.py -q -p no:cacheprovider --color=no`
Expected: FAIL — `/users/roles` cai em `/{user_id}` (422) e a criação de parceiro passa (201).

- [ ] **Step 3: Implementar**

Em `backend/app/api/v1/endpoints/users.py`, garantir `from app.models.role import Role` nos imports e, **antes** de `@router.get("/{user_id}", ...)` (a rota com parâmetro pegaria `/roles`):

```python
@router.get("/roles", summary="Perfis disponíveis para o cadastro de usuários")
async def listar_perfis(
    current_user: User = Depends(require_manager_or_admin()),
    db: Session = Depends(get_db)
) -> Any:
    perfis = db.query(Role).order_by(Role.id).all()
    return [{"id": r.id, "name": r.name, "display_name": r.display_name} for r in perfis]


def _recusar_login_de_parceiro(db: Session, role_id: Optional[int]) -> None:
    """Login de parceiro nasce no card do parceiro, que liga o usuário ao partner_id."""
    if role_id is None:
        return
    papel = db.query(Role).filter(Role.id == role_id).first()
    if papel and papel.name == "partner":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Login de parceiro se cria no card do parceiro, em Parcerias > Aquisição de Parceiros.",
        )
```

No início do corpo de `create_user` (antes de `service = UserService(db)`):

```python
    _recusar_login_de_parceiro(db, user_data.role_id)
```

No início do corpo de `update_user` (antes de `# Captura estado anterior ANTES de atualizar`):

```python
    _recusar_login_de_parceiro(db, user_data.role_id)
```

Conferir que `Optional`, `HTTPException` e `status` já estão importados no arquivo; acrescentar o que faltar.

- [ ] **Step 4: Rodar e ver passar**

Run: `MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest tests/unit/test_parcerias_usuarios.py tests/unit/test_parcerias_tranca.py -q -p no:cacheprovider --color=no`
Expected: `5 passed` + `5 passed`.

- [ ] **Step 5: Commit (perguntar antes)**

```bash
git add backend/app/api/v1/endpoints/users.py backend/tests/unit/test_parcerias_usuarios.py
git commit -m "feat(parcerias): perfil Financeiro no cadastro e login de parceiro so pelo card"
```

---

### Task 10: Frontend — tipos, constantes e serviço

**Files:**
- Modify: `frontend/src/types/index.ts` (linhas 13 e 773)
- Create: `frontend/src/constants/parcerias.ts`, `frontend/src/services/parceriasService.ts`
- Modify: `frontend/src/services/userService.ts`

- [ ] **Step 1: Tipos de perfil**

Em `frontend/src/types/index.ts`, nas duas uniões de `role` (linha 13 e linha 773), acrescentar `| "partner" | "finance"`:

```ts
  role: "admin" | "manager" | "salesperson" | "sdr" | "viewer" | "service" | "partner" | "finance"; // Role do usuário
```

```ts
  role?: "admin" | "manager" | "salesperson" | "sdr" | "viewer" | "service" | "partner" | "finance";
```

- [ ] **Step 2: Constantes**

`frontend/src/constants/parcerias.ts`:

```ts
// Perfis presos à seção Parcerias — o backend nega o resto do CRM a eles.
export const PERFIS_TRANCADOS = ["partner", "finance"];
export const PERFIS_PARCERIAS = ["admin", "manager", "finance", "partner"];
export const PERFIS_GESTAO = ["admin", "manager"];

export const QUALIFICACAO_OPCOES = [
  { value: "aderente", label: "Aderente" },
  { value: "parcialmente_aderente", label: "Parcialmente aderente" },
  { value: "nao_aderente", label: "Não aderente" },
];

export const EVIDENCIA_LABEL: Record<string, string> = {
  oportunidade_validada: "Oportunidade validada",
  proposta_enviada: "Proposta enviada",
  primeira_venda: "Primeira venda",
};

export const ELEGIBILIDADE_LABEL: Record<string, string> = {
  em_analise: "Em análise",
  validada: "Validada",
  rejeitada: "Rejeitada",
};

export const ELEGIBILIDADE_COR: Record<string, string> = {
  em_analise: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  validada: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  rejeitada: "bg-red-500/15 text-red-700 dark:text-red-400",
};

export const TIPOS_ATIVIDADE = [
  { value: "nota", label: "Nota" },
  { value: "ligacao", label: "Ligação" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "E-mail" },
  { value: "reuniao", label: "Reunião" },
  { value: "tarefa", label: "Tarefa" },
];

export const formatarMoeda = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const formatarCnpj = (cnpj?: string | null) =>
  cnpj && cnpj.length === 14
    ? cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
    : cnpj || "";
```

- [ ] **Step 3: Serviço**

`frontend/src/services/parceriasService.ts`:

```ts
import api from "./api";

const BASE = "/api/v1/parcerias";

export interface Etapa {
  codigo: string;
  nome: string;
}

export interface EtapasParcerias {
  aquisicao: Etapa[];
  oportunidades: Etapa[];
}

export interface ParceiroForm {
  name?: string;
  cnpj?: string | null;
  main_contact_name?: string | null;
  main_contact_phone?: string | null;
  main_contact_email?: string | null;
  partner_type?: string | null;
  origin?: string | null;
  segment?: string | null;
  region?: string | null;
  hs_owner_id?: number | null;
  qualification_status?: string | null;
  onboarding_date?: string | null;
}

export interface Parceiro extends ParceiroForm {
  id: number;
  name: string;
  hs_owner_name?: string | null;
  activation_evidence?: string | null;
  activated_at?: string | null;
  activation_opportunity_id?: number | null;
  stage: string;
  position: number;
  loss_reason?: string | null;
  loss_detail?: string | null;
  lost_at?: string | null;
  created_at: string;
  updated_at: string;
  oportunidades_por_etapa: Record<string, number>;
}

export interface Membro {
  id: number;
  partner_id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  is_active: boolean;
}

export interface Acesso {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  last_login_at?: string | null;
}

export interface OportunidadeForm {
  partner_id?: number | null;
  seller_member_id?: number | null;
  title?: string;
  deal_type?: string;
  sector?: string;
  relationship_type?: string;
  context?: string;
  cnpj?: string;
  company_name?: string;
  company_segment?: string | null;
  company_city?: string | null;
  company_state?: string | null;
  contact_name?: string | null;
  contact_role?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  expected_close_date?: string | null;
  modality?: "venda" | "locacao" | null;
}

export interface Oportunidade {
  id: number;
  partner_id: number;
  partner_name?: string | null;
  acquisition_channel: string;
  seller_member_id?: number | null;
  seller_name?: string | null;
  title: string;
  deal_type: string;
  sector: string;
  relationship_type: string;
  context: string;
  cnpj: string;
  company_name: string;
  company_segment?: string | null;
  company_city?: string | null;
  company_state?: string | null;
  contact_name?: string | null;
  contact_role?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  eligibility_status: string;
  eligibility_note?: string | null;
  eligibility_by_name?: string | null;
  eligibility_at?: string | null;
  expected_close_date?: string | null;
  modality?: "venda" | "locacao" | null;
  loss_reason?: string | null;
  loss_detail?: string | null;
  stage: string;
  position: number;
  last_activity_at?: string | null;
  won_at?: string | null;
  lost_at?: string | null;
  total_value: number;
  created_at: string;
  updated_at: string;
}

export interface ItemProduto {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface ProdutoCatalogo {
  id: number;
  name: string;
  sku?: string | null;
  unit_price: number;
}

export interface Atividade {
  id: number;
  partner_id?: number | null;
  opportunity_id?: number | null;
  user_id?: number | null;
  user_name?: string | null;
  type: string;
  description: string;
  due_at?: string | null;
  completed_at?: string | null;
  created_at: string;
}

export interface NovaAtividade {
  type: string;
  description: string;
  due_at?: string;
}

export interface MoverPayload {
  stage: string;
  position?: number;
  loss_reason?: string;
  loss_detail?: string;
  expected_close_date?: string;
  modality?: "venda" | "locacao";
}

/** Mensagem do backend (trava 422, 403, validação do Pydantic) para o toast. */
export function mensagemDeErro(err: any, padrao: string): string {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg).replace(/^Value error, /, "");
  return padrao;
}

const parceriasService = {
  async etapas() {
    return (await api.get<EtapasParcerias>(`${BASE}/etapas`)).data;
  },

  // Board 1
  async listarParceiros() {
    return (await api.get<Parceiro[]>(`${BASE}/parceiros`)).data;
  },
  async buscarParceiro(id: number) {
    return (await api.get<Parceiro>(`${BASE}/parceiros/${id}`)).data;
  },
  async criarParceiro(dados: ParceiroForm) {
    return (await api.post<Parceiro>(`${BASE}/parceiros`, dados)).data;
  },
  async atualizarParceiro(id: number, dados: ParceiroForm) {
    return (await api.put<Parceiro>(`${BASE}/parceiros/${id}`, dados)).data;
  },
  async moverParceiro(id: number, payload: MoverPayload) {
    return (await api.put<Parceiro>(`${BASE}/parceiros/${id}/mover`, payload)).data;
  },
  async listarEquipe(id: number) {
    return (await api.get<Membro[]>(`${BASE}/parceiros/${id}/equipe`)).data;
  },
  async criarMembro(id: number, dados: { name: string; email?: string; phone?: string }) {
    return (await api.post<Membro>(`${BASE}/parceiros/${id}/equipe`, dados)).data;
  },
  async atualizarMembro(id: number, membroId: number, dados: Partial<Membro>) {
    return (await api.put<Membro>(`${BASE}/parceiros/${id}/equipe/${membroId}`, dados)).data;
  },
  async listarAcessos(id: number) {
    return (await api.get<Acesso[]>(`${BASE}/parceiros/${id}/acessos`)).data;
  },
  async criarAcesso(id: number, dados: { name: string; email: string; password: string }) {
    return (await api.post<Acesso>(`${BASE}/parceiros/${id}/acessos`, dados)).data;
  },
  async alterarAcesso(id: number, userId: number, isActive: boolean) {
    return (await api.put<Acesso>(`${BASE}/parceiros/${id}/acessos/${userId}`, { is_active: isActive })).data;
  },

  // Board 2
  async listarOportunidades(partnerId?: number) {
    const params = partnerId ? { partner_id: partnerId } : undefined;
    return (await api.get<Oportunidade[]>(`${BASE}/oportunidades`, { params })).data;
  },
  async buscarOportunidade(id: number) {
    return (await api.get<Oportunidade>(`${BASE}/oportunidades/${id}`)).data;
  },
  async criarOportunidade(dados: OportunidadeForm) {
    return (await api.post<Oportunidade>(`${BASE}/oportunidades`, dados)).data;
  },
  async atualizarOportunidade(id: number, dados: OportunidadeForm) {
    return (await api.put<Oportunidade>(`${BASE}/oportunidades/${id}`, dados)).data;
  },
  async moverOportunidade(id: number, payload: MoverPayload) {
    return (await api.put<Oportunidade>(`${BASE}/oportunidades/${id}/mover`, payload)).data;
  },
  async definirElegibilidade(id: number, status: string, note?: string) {
    return (await api.put<Oportunidade>(`${BASE}/oportunidades/${id}/elegibilidade`, { status, note })).data;
  },
  async listarProdutos(id: number) {
    return (await api.get<ItemProduto[]>(`${BASE}/oportunidades/${id}/produtos`)).data;
  },
  async adicionarProduto(id: number, dados: { product_id: number; quantity: number; unit_price?: number }) {
    return (await api.post<ItemProduto>(`${BASE}/oportunidades/${id}/produtos`, dados)).data;
  },
  async atualizarProduto(id: number, itemId: number, dados: { quantity?: number; unit_price?: number }) {
    return (await api.put<ItemProduto>(`${BASE}/oportunidades/${id}/produtos/${itemId}`, dados)).data;
  },
  async removerProduto(id: number, itemId: number) {
    await api.delete(`${BASE}/oportunidades/${id}/produtos/${itemId}`);
  },
  async catalogo(busca: string) {
    return (await api.get<ProdutoCatalogo[]>(`${BASE}/produtos`, { params: { busca } })).data;
  },

  // Atividades
  async atividadesDoParceiro(id: number) {
    return (await api.get<Atividade[]>(`${BASE}/parceiros/${id}/atividades`)).data;
  },
  async criarAtividadeDoParceiro(id: number, dados: NovaAtividade) {
    return (await api.post<Atividade>(`${BASE}/parceiros/${id}/atividades`, dados)).data;
  },
  async atividadesDaOportunidade(id: number) {
    return (await api.get<Atividade[]>(`${BASE}/oportunidades/${id}/atividades`)).data;
  },
  async criarAtividadeDaOportunidade(id: number, dados: NovaAtividade) {
    return (await api.post<Atividade>(`${BASE}/oportunidades/${id}/atividades`, dados)).data;
  },
  async concluirAtividade(id: number, isCompleted: boolean) {
    return (await api.patch<Atividade>(`${BASE}/atividades/${id}/concluir`, { is_completed: isCompleted })).data;
  },
  async excluirAtividade(id: number) {
    await api.delete(`${BASE}/atividades/${id}`);
  },
};

export default parceriasService;
```

Em `frontend/src/services/userService.ts`, depois de `listActive()`:

```ts
  async listarPerfis(): Promise<{ id: number; name: string; display_name: string }[]> {
    const response = await api.get("/api/v1/users/roles");
    return response.data;
  }
```

(Seguir a sintaxe do arquivo: se os métodos forem separados por vírgula num objeto literal, colocar a vírgula.)

- [ ] **Step 4: Typecheck**

Run (em `frontend/`): `npx tsc --noEmit -p tsconfig.json`
Expected: sem erros novos. Se aparecerem erros por `switch` exaustivo sobre `role` em outros arquivos, acrescentar os dois perfis nesses `switch` com o mesmo rótulo do `default`.

- [ ] **Step 5: Commit (perguntar antes)**

```bash
git add frontend/src/types/index.ts frontend/src/constants/parcerias.ts frontend/src/services/parceriasService.ts frontend/src/services/userService.ts
git commit -m "feat(parcerias): tipos, constantes e servico do frontend"
```

---

### Task 11: Frontend — componentes do kanban, trava e atividades

**Files:**
- Create: `frontend/src/components/parcerias/KanbanParcerias.tsx`, `frontend/src/components/parcerias/ModalTrava.tsx`, `frontend/src/components/parcerias/AtividadesParceria.tsx`

- [ ] **Step 1: Kanban genérico (arrastar nativo do HTML5)**

`frontend/src/components/parcerias/KanbanParcerias.tsx`:

```tsx
import React, { useState } from "react";
import type { Etapa } from "../../services/parceriasService";

interface Props<T> {
  etapas: Etapa[];
  itens: T[];
  idDe: (item: T) => number;
  etapaDe: (item: T) => string;
  renderCard: (item: T) => React.ReactNode;
  onAbrir: (item: T) => void;
  /** Ausente = só leitura (Financeiro). */
  onMover?: (item: T, destino: string) => void;
}

export default function KanbanParcerias<T>({ etapas, itens, idDe, etapaDe, renderCard, onAbrir, onMover }: Props<T>) {
  const [arrastando, setArrastando] = useState<number | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);

  const soltar = (destino: string) => {
    const item = itens.find((i) => idDe(i) === arrastando);
    setArrastando(null);
    setSobre(null);
    if (item && onMover && etapaDe(item) !== destino) onMover(item, destino);
  };

  return (
    <div className="flex h-full gap-4 overflow-x-auto pb-4">
      {etapas.map((etapa) => {
        const daEtapa = itens.filter((i) => etapaDe(i) === etapa.codigo);
        return (
          <div
            key={etapa.codigo}
            onDragOver={(e) => {
              if (onMover && arrastando !== null) {
                e.preventDefault();
                setSobre(etapa.codigo);
              }
            }}
            onDragLeave={() => setSobre((s) => (s === etapa.codigo ? null : s))}
            onDrop={(e) => {
              e.preventDefault();
              soltar(etapa.codigo);
            }}
            className={`flex w-72 flex-shrink-0 flex-col rounded-xl border bg-gray-100/60 dark:bg-slate-800/40 ${
              sobre === etapa.codigo ? "border-emerald-500" : "border-gray-200 dark:border-slate-700/50"
            }`}
          >
            <div className="flex items-center justify-between px-3 py-2.5">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{etapa.nome}</h3>
              <span className="rounded-full bg-gray-200 px-2 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                {daEtapa.length}
              </span>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto px-2 pb-2">
              {daEtapa.map((item) => (
                <div
                  key={idDe(item)}
                  draggable={!!onMover}
                  onDragStart={() => setArrastando(idDe(item))}
                  onDragEnd={() => {
                    setArrastando(null);
                    setSobre(null);
                  }}
                  onClick={() => onAbrir(item)}
                  className="cursor-pointer rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition hover:border-emerald-400 dark:border-slate-700 dark:bg-slate-900"
                >
                  {renderCard(item)}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Modal da trava**

`frontend/src/components/parcerias/ModalTrava.tsx`:

```tsx
import { useEffect, useState } from "react";
import { BaseModal, Button, FormField, Input, SelectMenu, Textarea } from "../common";
import type { MoverPayload } from "../../services/parceriasService";

export interface Faltas {
  motivo: boolean;
  data: boolean;
  modalidade: boolean;
}

/** O que a tela precisa pedir antes de mover uma oportunidade (board 2). */
export function faltasParaMover(
  destino: string,
  op?: { expected_close_date?: string | null; modality?: string | null }
): Faltas {
  return {
    motivo: destino === "perdido",
    data: !!op && ["negociacao", "aguardando_pedido", "ganho"].includes(destino) && !op.expected_close_date,
    modalidade: !!op && destino === "ganho" && !op.modality,
  };
}

export const temFalta = (f: Faltas) => f.motivo || f.data || f.modalidade;

interface Props {
  isOpen: boolean;
  destinoNome: string;
  faltas: Faltas;
  /** Lista de motivos (board 2). Sem lista, o motivo é texto livre (board 1). */
  motivos?: string[];
  onConfirmar: (extras: Partial<MoverPayload>) => void;
  onClose: () => void;
}

export default function ModalTrava({ isOpen, destinoNome, faltas, motivos, onConfirmar, onClose }: Props) {
  const [motivo, setMotivo] = useState("");
  const [detalhe, setDetalhe] = useState("");
  const [data, setData] = useState("");
  const [modalidade, setModalidade] = useState("");

  useEffect(() => {
    if (isOpen) {
      setMotivo("");
      setDetalhe("");
      setData("");
      setModalidade("");
    }
  }, [isOpen]);

  const pronto =
    (!faltas.motivo || motivo.trim() !== "") && (!faltas.data || data !== "") && (!faltas.modalidade || modalidade !== "");

  const confirmar = () => {
    const extras: Partial<MoverPayload> = {};
    if (faltas.motivo) {
      extras.loss_reason = motivo.trim();
      if (detalhe.trim()) extras.loss_detail = detalhe.trim();
    }
    if (faltas.data) extras.expected_close_date = data;
    if (faltas.modalidade) extras.modality = modalidade as "venda" | "locacao";
    onConfirmar(extras);
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Mover para ${destinoNome}`}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={confirmar} disabled={!pronto}>Mover</Button>
        </div>
      }
    >
      <div className="space-y-4">
        {faltas.motivo && (
          <FormField label="Motivo da perda" required>
            {motivos ? (
              <SelectMenu
                value={motivo}
                placeholder="Escolha o motivo"
                options={motivos.map((m) => ({ value: m, label: m }))}
                onChange={setMotivo}
              />
            ) : (
              <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={255} />
            )}
          </FormField>
        )}
        {faltas.motivo && (
          <FormField label="Detalhe">
            <Textarea value={detalhe} onChange={(e) => setDetalhe(e.target.value)} rows={2} />
          </FormField>
        )}
        {faltas.data && (
          <FormField label="Data esperada de fechamento" required>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </FormField>
        )}
        {faltas.modalidade && (
          <FormField label="É venda ou locação?" required>
            <SelectMenu
              value={modalidade}
              placeholder="Escolha"
              options={[
                { value: "venda", label: "Venda" },
                { value: "locacao", label: "Locação" },
              ]}
              onChange={setModalidade}
            />
          </FormField>
        )}
      </div>
    </BaseModal>
  );
}
```

- [ ] **Step 3: Atividades e histórico**

`frontend/src/components/parcerias/AtividadesParceria.tsx`:

```tsx
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Circle, Trash2 } from "lucide-react";
import { Button, SelectMenu, Textarea, Input } from "../common";
import { showError } from "../../utils/toast";
import { useConfirm } from "../../contexts/ConfirmContext";
import { TIPOS_ATIVIDADE } from "../../constants/parcerias";
import parceriasService, { Atividade, mensagemDeErro } from "../../services/parceriasService";

interface Props {
  alvo: { tipo: "parceiro" | "oportunidade"; id: number };
  somenteLeitura: boolean;
}

const rotulo = (tipo: string) =>
  tipo === "evento" ? "Histórico" : TIPOS_ATIVIDADE.find((t) => t.value === tipo)?.label ?? tipo;

const dataHora = (valor?: string | null) =>
  valor ? new Date(valor).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "";

export default function AtividadesParceria({ alvo, somenteLeitura }: Props) {
  const { confirm } = useConfirm();
  const [itens, setItens] = useState<Atividade[]>([]);
  const [tipo, setTipo] = useState("nota");
  const [texto, setTexto] = useState("");
  const [prazo, setPrazo] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    const lista =
      alvo.tipo === "parceiro"
        ? await parceriasService.atividadesDoParceiro(alvo.id)
        : await parceriasService.atividadesDaOportunidade(alvo.id);
    setItens(lista);
  }, [alvo.tipo, alvo.id]);

  useEffect(() => {
    carregar().catch((e) => showError(mensagemDeErro(e, "Erro ao carregar o histórico.")));
  }, [carregar]);

  const salvar = async () => {
    if (!texto.trim()) return;
    setSalvando(true);
    try {
      // Data/hora local, sem fuso — o mesmo formato que volta para a tela.
      const dados = { type: tipo, description: texto.trim(), due_at: tipo === "tarefa" && prazo ? prazo : undefined };
      if (alvo.tipo === "parceiro") await parceriasService.criarAtividadeDoParceiro(alvo.id, dados);
      else await parceriasService.criarAtividadeDaOportunidade(alvo.id, dados);
      setTexto("");
      setPrazo("");
      await carregar();
    } catch (e) {
      showError(mensagemDeErro(e, "Erro ao salvar a atividade."));
    } finally {
      setSalvando(false);
    }
  };

  const alternar = async (a: Atividade) => {
    try {
      await parceriasService.concluirAtividade(a.id, !a.completed_at);
      await carregar();
    } catch (e) {
      showError(mensagemDeErro(e, "Erro ao concluir a atividade."));
    }
  };

  const excluir = async (a: Atividade) => {
    const ok = await confirm({ title: "Excluir atividade", message: "Excluir esta atividade?", isDanger: true });
    if (!ok) return;
    try {
      await parceriasService.excluirAtividade(a.id);
      await carregar();
    } catch (e) {
      showError(mensagemDeErro(e, "Erro ao excluir a atividade."));
    }
  };

  return (
    <div className="space-y-4">
      {!somenteLeitura && (
        <div className="space-y-2 rounded-lg border border-gray-200 p-3 dark:border-slate-700">
          <div className="flex gap-2">
            <div className="w-40">
              <SelectMenu value={tipo} options={TIPOS_ATIVIDADE} onChange={setTipo} size="sm" />
            </div>
            {tipo === "tarefa" && (
              <Input type="datetime-local" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
            )}
          </div>
          <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={2} placeholder="O que aconteceu?" />
          <div className="flex justify-end">
            <Button size="sm" onClick={salvar} loading={salvando} disabled={!texto.trim()}>Registrar</Button>
          </div>
        </div>
      )}

      <ul className="space-y-2">
        {itens.map((a) => (
          <li key={a.id} className="flex gap-3 rounded-lg border border-gray-200 p-3 text-sm dark:border-slate-700">
            {a.type === "tarefa" ? (
              <button onClick={() => !somenteLeitura && alternar(a)} className="mt-0.5 text-emerald-600">
                {a.completed_at ? <CheckCircle2 size={18} /> : <Circle size={18} />}
              </button>
            ) : (
              <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-slate-400" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {rotulo(a.type)} · {a.user_name || "Sistema"} · {dataHora(a.created_at)}
                {a.due_at && ` · prazo ${dataHora(a.due_at)}`}
              </p>
              <p className={`whitespace-pre-wrap text-slate-800 dark:text-slate-200 ${a.completed_at ? "line-through opacity-60" : ""}`}>
                {a.description}
              </p>
            </div>
            {!somenteLeitura && a.type !== "evento" && (
              <button onClick={() => excluir(a)} className="text-slate-400 hover:text-red-500" title="Excluir">
                <Trash2 size={16} />
              </button>
            )}
          </li>
        ))}
        {itens.length === 0 && <li className="text-sm text-slate-500">Nada registrado ainda.</li>}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

Run (em `frontend/`): `npx tsc --noEmit -p tsconfig.json`
Expected: sem erros.

- [ ] **Step 5: Commit (perguntar antes)**

```bash
git add frontend/src/components/parcerias/KanbanParcerias.tsx frontend/src/components/parcerias/ModalTrava.tsx frontend/src/components/parcerias/AtividadesParceria.tsx
git commit -m "feat(parcerias): kanban, modal de trava e historico (frontend)"
```

---

### Task 12: Frontend — board Aquisição de Parceiros

**Files:**
- Create: `frontend/src/components/parcerias/NovoParceiroModal.tsx`, `frontend/src/pages/parcerias/AquisicaoKanban.tsx`, `frontend/src/pages/parcerias/ParceiroDetalhe.tsx`

- [ ] **Step 1: Modal de novo parceiro**

`frontend/src/components/parcerias/NovoParceiroModal.tsx`:

```tsx
import { useEffect, useState } from "react";
import { BaseModal, Button, FormField, Input } from "../common";
import { showError } from "../../utils/toast";
import parceriasService, { Parceiro, ParceiroForm, mensagemDeErro } from "../../services/parceriasService";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCriado: (parceiro: Parceiro) => void;
}

const VAZIO: ParceiroForm = {
  name: "", cnpj: "", main_contact_name: "", main_contact_phone: "", main_contact_email: "",
  partner_type: "", origin: "", segment: "", region: "",
};

export default function NovoParceiroModal({ isOpen, onClose, onCriado }: Props) {
  const [form, setForm] = useState<ParceiroForm>(VAZIO);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (isOpen) setForm(VAZIO);
  }, [isOpen]);

  const campo = (nome: keyof ParceiroForm) => ({
    value: (form[nome] as string) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [nome]: e.target.value }),
  });

  const salvar = async () => {
    setSalvando(true);
    try {
      // Campo vazio vai como null para não gravar texto em branco.
      const dados = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, typeof v === "string" && v.trim() === "" ? null : v])
      ) as ParceiroForm;
      onCriado(await parceriasService.criarParceiro(dados));
    } catch (e) {
      showError(mensagemDeErro(e, "Erro ao cadastrar o parceiro."));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Novo parceiro"
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} loading={salvando} disabled={!form.name?.trim()}>Cadastrar</Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Parceiro / empresa" required className="sm:col-span-2"><Input {...campo("name")} /></FormField>
        <FormField label="CNPJ"><Input {...campo("cnpj")} /></FormField>
        <FormField label="Tipo de parceiro"><Input {...campo("partner_type")} /></FormField>
        <FormField label="Contato principal"><Input {...campo("main_contact_name")} /></FormField>
        <FormField label="Telefone do contato"><Input {...campo("main_contact_phone")} /></FormField>
        <FormField label="E-mail do contato"><Input type="email" {...campo("main_contact_email")} /></FormField>
        <FormField label="Origem do parceiro"><Input {...campo("origin")} /></FormField>
        <FormField label="Segmento"><Input {...campo("segment")} /></FormField>
        <FormField label="Região"><Input {...campo("region")} /></FormField>
      </div>
    </BaseModal>
  );
}
```

- [ ] **Step 2: Kanban do board 1**

`frontend/src/pages/parcerias/AquisicaoKanban.tsx`:

```tsx
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button, LoadingSpinner } from "../../components/common";
import KanbanParcerias from "../../components/parcerias/KanbanParcerias";
import ModalTrava from "../../components/parcerias/ModalTrava";
import NovoParceiroModal from "../../components/parcerias/NovoParceiroModal";
import { useAuth } from "../../hooks/useAuth";
import { showError } from "../../utils/toast";
import { EVIDENCIA_LABEL, PERFIS_GESTAO } from "../../constants/parcerias";
import parceriasService, { Etapa, MoverPayload, Parceiro, mensagemDeErro } from "../../services/parceriasService";

export default function AquisicaoKanban() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const gestao = PERFIS_GESTAO.includes(user?.role ?? "");
  const podeMover = gestao || user?.role === "partner";

  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [novo, setNovo] = useState(false);
  const [perdendo, setPerdendo] = useState<Parceiro | null>(null);

  const carregar = useCallback(async () => {
    try {
      const [e, p] = await Promise.all([parceriasService.etapas(), parceriasService.listarParceiros()]);
      setEtapas(e.aquisicao);
      setParceiros(p);
    } catch (err) {
      showError(mensagemDeErro(err, "Erro ao carregar os parceiros."));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const mover = async (parceiro: Parceiro, destino: string, extras: Partial<MoverPayload> = {}) => {
    try {
      await parceriasService.moverParceiro(parceiro.id, { stage: destino, ...extras });
    } catch (err) {
      showError(mensagemDeErro(err, "Não foi possível mover o parceiro."));
    }
    await carregar();
  };

  if (carregando) return <LoadingSpinner />;

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Aquisição de Parceiros</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Da prospecção até a ativação do parceiro.</p>
        </div>
        {gestao && (
          <Button icon={<Plus size={16} />} onClick={() => setNovo(true)}>Novo parceiro</Button>
        )}
      </div>

      <div className="min-h-0 flex-1">
        <KanbanParcerias
          etapas={etapas}
          itens={parceiros}
          idDe={(p) => p.id}
          etapaDe={(p) => p.stage}
          onAbrir={(p) => navigate(`/parcerias/aquisicao/${p.id}`)}
          onMover={podeMover ? (p, destino) => (destino === "perdido" ? setPerdendo(p) : mover(p, destino)) : undefined}
          renderCard={(p) => (
            <>
              <p className="text-sm font-medium text-slate-900 dark:text-white">{p.name}</p>
              {p.main_contact_name && <p className="text-xs text-slate-500">{p.main_contact_name}</p>}
              {p.hs_owner_name && <p className="mt-1 text-xs text-slate-400">H&S: {p.hs_owner_name}</p>}
              {p.activation_evidence && (
                <span className="mt-2 inline-block rounded bg-emerald-500/15 px-1.5 py-0.5 text-[11px] text-emerald-700 dark:text-emerald-400">
                  {EVIDENCIA_LABEL[p.activation_evidence]}
                </span>
              )}
            </>
          )}
        />
      </div>

      <NovoParceiroModal
        isOpen={novo}
        onClose={() => setNovo(false)}
        onCriado={(p) => {
          setNovo(false);
          navigate(`/parcerias/aquisicao/${p.id}`);
        }}
      />
      <ModalTrava
        isOpen={!!perdendo}
        destinoNome="Perdido"
        faltas={{ motivo: true, data: false, modalidade: false }}
        onClose={() => setPerdendo(null)}
        onConfirmar={(extras) => {
          if (perdendo) mover(perdendo, "perdido", extras);
          setPerdendo(null);
        }}
      />
    </div>
  );
}
```

- [ ] **Step 3: Detalhe do parceiro (dados, Equipe, Acessos, histórico)**

`frontend/src/pages/parcerias/ParceiroDetalhe.tsx`:

```tsx
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button, FormField, Input, LoadingSpinner, SelectMenu } from "../../components/common";
import AtividadesParceria from "../../components/parcerias/AtividadesParceria";
import ModalTrava from "../../components/parcerias/ModalTrava";
import { useAuth } from "../../hooks/useAuth";
import { showError, showSuccess } from "../../utils/toast";
import userService from "../../services/userService";
import { EVIDENCIA_LABEL, PERFIS_GESTAO, QUALIFICACAO_OPCOES } from "../../constants/parcerias";
import parceriasService, {
  Acesso, Etapa, Membro, MoverPayload, Parceiro, ParceiroForm, mensagemDeErro,
} from "../../services/parceriasService";

const CAMPOS_TEXTO: { nome: keyof ParceiroForm; label: string }[] = [
  { nome: "name", label: "Parceiro / empresa" },
  { nome: "cnpj", label: "CNPJ" },
  { nome: "main_contact_name", label: "Contato principal" },
  { nome: "main_contact_phone", label: "Telefone do contato" },
  { nome: "main_contact_email", label: "E-mail do contato" },
  { nome: "partner_type", label: "Tipo de parceiro" },
  { nome: "origin", label: "Origem do parceiro" },
  { nome: "segment", label: "Segmento" },
  { nome: "region", label: "Região" },
];

export default function ParceiroDetalhe() {
  const { partnerId } = useParams();
  const id = Number(partnerId);
  const navigate = useNavigate();
  const { user } = useAuth();
  const gestao = PERFIS_GESTAO.includes(user?.role ?? "");
  const podeEditar = gestao || user?.role === "partner";

  const [parceiro, setParceiro] = useState<Parceiro | null>(null);
  const [form, setForm] = useState<ParceiroForm>({});
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [etapasOp, setEtapasOp] = useState<Etapa[]>([]);
  const [equipe, setEquipe] = useState<Membro[]>([]);
  const [acessos, setAcessos] = useState<Acesso[]>([]);
  const [usuariosHs, setUsuariosHs] = useState<{ value: string; label: string }[]>([]);
  const [novoMembro, setNovoMembro] = useState({ name: "", email: "", phone: "" });
  const [novoAcesso, setNovoAcesso] = useState({ name: "", email: "", password: "" });
  const [perdendo, setPerdendo] = useState(false);

  const preencher = (p: Parceiro) => {
    setParceiro(p);
    setForm({
      name: p.name, cnpj: p.cnpj ?? "", main_contact_name: p.main_contact_name ?? "",
      main_contact_phone: p.main_contact_phone ?? "", main_contact_email: p.main_contact_email ?? "",
      partner_type: p.partner_type ?? "", origin: p.origin ?? "", segment: p.segment ?? "", region: p.region ?? "",
      hs_owner_id: p.hs_owner_id ?? null, qualification_status: p.qualification_status ?? null,
      onboarding_date: p.onboarding_date ?? "",
    });
  };

  const carregar = useCallback(async () => {
    try {
      const [p, e, eq] = await Promise.all([
        parceriasService.buscarParceiro(id),
        parceriasService.etapas(),
        parceriasService.listarEquipe(id),
      ]);
      preencher(p);
      setEtapas(e.aquisicao);
      setEtapasOp(e.oportunidades);
      setEquipe(eq);
      if (gestao) {
        setAcessos(await parceriasService.listarAcessos(id));
        const usuarios = await userService.listActive();
        setUsuariosHs(
          usuarios.filter((u) => u.role !== "partner").map((u) => ({ value: String(u.id), label: u.name }))
        );
      }
    } catch (err) {
      showError(mensagemDeErro(err, "Erro ao carregar o parceiro."));
      navigate("/parcerias/aquisicao");
    }
  }, [id, gestao, navigate]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (!parceiro) return <LoadingSpinner />;

  const salvar = async () => {
    try {
      const dados = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, typeof v === "string" && v.trim() === "" ? null : v])
      ) as ParceiroForm;
      preencher(await parceriasService.atualizarParceiro(id, dados));
      showSuccess("Parceiro salvo.");
    } catch (err) {
      showError(mensagemDeErro(err, "Erro ao salvar o parceiro."));
    }
  };

  const mover = async (destino: string, extras: Partial<MoverPayload> = {}) => {
    try {
      preencher(await parceriasService.moverParceiro(id, { stage: destino, ...extras }));
    } catch (err) {
      showError(mensagemDeErro(err, "Não foi possível mover o parceiro."));
    }
  };

  const adicionarMembro = async () => {
    try {
      await parceriasService.criarMembro(id, {
        name: novoMembro.name.trim(),
        email: novoMembro.email.trim() || undefined,
        phone: novoMembro.phone.trim() || undefined,
      });
      setNovoMembro({ name: "", email: "", phone: "" });
      setEquipe(await parceriasService.listarEquipe(id));
    } catch (err) {
      showError(mensagemDeErro(err, "Erro ao cadastrar o vendedor."));
    }
  };

  const alternarMembro = async (m: Membro) => {
    try {
      await parceriasService.atualizarMembro(id, m.id, { is_active: !m.is_active });
      setEquipe(await parceriasService.listarEquipe(id));
    } catch (err) {
      showError(mensagemDeErro(err, "Erro ao alterar o vendedor."));
    }
  };

  const criarAcesso = async () => {
    try {
      await parceriasService.criarAcesso(id, novoAcesso);
      setNovoAcesso({ name: "", email: "", password: "" });
      setAcessos(await parceriasService.listarAcessos(id));
      showSuccess("Acesso criado. Passe o e-mail e a senha ao parceiro.");
    } catch (err) {
      showError(mensagemDeErro(err, "Erro ao criar o acesso."));
    }
  };

  const alternarAcesso = async (a: Acesso) => {
    try {
      await parceriasService.alterarAcesso(id, a.id, !a.is_active);
      setAcessos(await parceriasService.listarAcessos(id));
    } catch (err) {
      showError(mensagemDeErro(err, "Erro ao alterar o acesso."));
    }
  };

  const caixa = "rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700/50 dark:bg-slate-800/40";
  const titulo = "mb-3 text-sm font-semibold text-slate-800 dark:text-slate-200";

  return (
    <div className="p-6">
      <button onClick={() => navigate("/parcerias/aquisicao")} className="mb-4 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-white">
        <ArrowLeft size={16} /> Aquisição de Parceiros
      </button>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{parceiro.name}</h1>
          {parceiro.activation_evidence && (
            <p className="text-sm text-emerald-600">
              Critério de ativação: {EVIDENCIA_LABEL[parceiro.activation_evidence]}
              {parceiro.activated_at && ` em ${new Date(parceiro.activated_at).toLocaleDateString("pt-BR")}`}
            </p>
          )}
          {parceiro.stage === "perdido" && parceiro.loss_reason && (
            <p className="text-sm text-red-500">Perdido: {parceiro.loss_reason}</p>
          )}
        </div>
        <div className="w-56">
          <SelectMenu
            value={parceiro.stage}
            disabled={!podeEditar}
            options={etapas.map((e) => ({ value: e.codigo, label: e.nome }))}
            onChange={(destino) => (destino === "perdido" ? setPerdendo(true) : mover(destino))}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <div className={caixa}>
            <h2 className={titulo}>Dados do parceiro</h2>
            <div className="space-y-3">
              {CAMPOS_TEXTO.map(({ nome, label }) => (
                <FormField key={nome} label={label} required={nome === "name"}>
                  <Input
                    value={(form[nome] as string) ?? ""}
                    disabled={!podeEditar}
                    onChange={(e) => setForm({ ...form, [nome]: e.target.value })}
                  />
                </FormField>
              ))}
              <FormField label="Responsável H&S">
                {gestao ? (
                  <SelectMenu
                    value={form.hs_owner_id ? String(form.hs_owner_id) : ""}
                    placeholder="Escolha"
                    options={usuariosHs}
                    onChange={(v) => setForm({ ...form, hs_owner_id: Number(v) })}
                  />
                ) : (
                  <Input value={parceiro.hs_owner_name ?? ""} disabled />
                )}
              </FormField>
              <FormField label="Status de qualificação">
                <SelectMenu
                  value={form.qualification_status ?? ""}
                  placeholder="Escolha"
                  disabled={!podeEditar}
                  options={QUALIFICACAO_OPCOES}
                  onChange={(v) => setForm({ ...form, qualification_status: v })}
                />
              </FormField>
              <FormField label="Data de onboarding">
                <Input
                  type="date"
                  value={form.onboarding_date ?? ""}
                  disabled={!podeEditar}
                  onChange={(e) => setForm({ ...form, onboarding_date: e.target.value })}
                />
              </FormField>
              {podeEditar && <Button onClick={salvar} fullWidth>Salvar</Button>}
            </div>
          </div>

          <div className={caixa}>
            <h2 className={titulo}>Equipe</h2>
            <ul className="mb-3 space-y-2">
              {equipe.map((m) => (
                <li key={m.id} className="flex items-center justify-between text-sm">
                  <span className={m.is_active ? "text-slate-800 dark:text-slate-200" : "text-slate-400 line-through"}>
                    {m.name} {m.email && <span className="text-xs text-slate-500">· {m.email}</span>}
                  </span>
                  {podeEditar && (
                    <button onClick={() => alternarMembro(m)} className="text-xs text-slate-500 hover:text-emerald-600">
                      {m.is_active ? "Desativar" : "Reativar"}
                    </button>
                  )}
                </li>
              ))}
              {equipe.length === 0 && <li className="text-sm text-slate-500">Nenhum vendedor cadastrado.</li>}
            </ul>
            {podeEditar && (
              <div className="space-y-2">
                <Input placeholder="Nome" value={novoMembro.name} onChange={(e) => setNovoMembro({ ...novoMembro, name: e.target.value })} />
                <Input placeholder="E-mail" value={novoMembro.email} onChange={(e) => setNovoMembro({ ...novoMembro, email: e.target.value })} />
                <Input placeholder="Telefone" value={novoMembro.phone} onChange={(e) => setNovoMembro({ ...novoMembro, phone: e.target.value })} />
                <Button size="sm" onClick={adicionarMembro} disabled={!novoMembro.name.trim()}>Adicionar vendedor</Button>
              </div>
            )}
          </div>

          {gestao && (
            <div className={caixa}>
              <h2 className={titulo}>Acessos ao CRM</h2>
              <ul className="mb-3 space-y-2">
                {acessos.map((a) => (
                  <li key={a.id} className="flex items-center justify-between text-sm">
                    <span className={a.is_active ? "text-slate-800 dark:text-slate-200" : "text-slate-400 line-through"}>
                      {a.email}
                    </span>
                    <button onClick={() => alternarAcesso(a)} className="text-xs text-slate-500 hover:text-emerald-600">
                      {a.is_active ? "Desativar" : "Reativar"}
                    </button>
                  </li>
                ))}
                {acessos.length === 0 && <li className="text-sm text-slate-500">Nenhum acesso criado.</li>}
              </ul>
              <div className="space-y-2">
                <Input placeholder="Nome" value={novoAcesso.name} onChange={(e) => setNovoAcesso({ ...novoAcesso, name: e.target.value })} />
                <Input placeholder="E-mail" type="email" value={novoAcesso.email} onChange={(e) => setNovoAcesso({ ...novoAcesso, email: e.target.value })} />
                <Input placeholder="Senha inicial (mín. 8)" type="password" value={novoAcesso.password} onChange={(e) => setNovoAcesso({ ...novoAcesso, password: e.target.value })} />
                <Button
                  size="sm"
                  onClick={criarAcesso}
                  disabled={!novoAcesso.name.trim() || !novoAcesso.email.trim() || novoAcesso.password.length < 8}
                >
                  Criar acesso
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6 lg:col-span-2">
          <div className={caixa}>
            <h2 className={titulo}>Oportunidades do parceiro</h2>
            <div className="flex flex-wrap gap-2">
              {etapasOp.map((e) => (
                <span key={e.codigo} className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-slate-700 dark:bg-slate-700/50 dark:text-slate-300">
                  {e.nome}: <strong>{parceiro.oportunidades_por_etapa[e.codigo] ?? 0}</strong>
                </span>
              ))}
            </div>
          </div>
          <div className={caixa}>
            <h2 className={titulo}>Atividades e histórico</h2>
            <AtividadesParceria alvo={{ tipo: "parceiro", id }} somenteLeitura={!podeEditar} />
          </div>
        </div>
      </div>

      <ModalTrava
        isOpen={perdendo}
        destinoNome="Perdido"
        faltas={{ motivo: true, data: false, modalidade: false }}
        onClose={() => setPerdendo(false)}
        onConfirmar={(extras) => {
          setPerdendo(false);
          mover("perdido", extras);
        }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

Run (em `frontend/`): `npx tsc --noEmit -p tsconfig.json`
Expected: sem erros. (`u.name` vem do tipo `User` de `types/index.ts`; se o campo do nome tiver outro nome lá, usar o mesmo que `Users.tsx` usa para exibir o nome.)

- [ ] **Step 5: Commit (perguntar antes)**

```bash
git add frontend/src/components/parcerias/NovoParceiroModal.tsx frontend/src/pages/parcerias/AquisicaoKanban.tsx frontend/src/pages/parcerias/ParceiroDetalhe.tsx
git commit -m "feat(parcerias): telas do board Aquisicao de Parceiros"
```

---

### Task 13: Frontend — board Pipeline de Parceiros

**Files:**
- Create: `frontend/src/components/parcerias/NovaOportunidadeModal.tsx`, `frontend/src/pages/parcerias/OportunidadesKanban.tsx`, `frontend/src/pages/parcerias/OportunidadeDetalhe.tsx`

- [ ] **Step 1: Modal de nova oportunidade**

`frontend/src/components/parcerias/NovaOportunidadeModal.tsx`:

```tsx
import { useEffect, useState } from "react";
import { BaseModal, Button, FormField, Input, SelectMenu, Textarea } from "../common";
import { showError } from "../../utils/toast";
import { DEAL_TYPES, RELATIONSHIP_TYPES, SECTORS } from "../../constants/blueprintOptions";
import parceriasService, {
  Membro, Oportunidade, OportunidadeForm, Parceiro, mensagemDeErro,
} from "../../services/parceriasService";

interface Props {
  isOpen: boolean;
  /** Parceiros que o usuário enxerga: o parceiro vê só o dele (um). */
  parceiros: Parceiro[];
  /** Admin/gerente escolhem o parceiro; o parceiro cria sempre no próprio canal. */
  escolheParceiro: boolean;
  onClose: () => void;
  onCriada: (op: Oportunidade) => void;
}

const opcoes = (lista: string[]) => lista.map((v) => ({ value: v, label: v }));

const VAZIO: OportunidadeForm = {
  title: "", deal_type: "", sector: "", relationship_type: "", context: "", cnpj: "", company_name: "",
  company_city: "", company_state: "", contact_name: "", contact_role: "", contact_phone: "", contact_email: "",
};

export default function NovaOportunidadeModal({ isOpen, parceiros, escolheParceiro, onClose, onCriada }: Props) {
  const [form, setForm] = useState<OportunidadeForm>(VAZIO);
  const [equipe, setEquipe] = useState<Membro[]>([]);
  const [salvando, setSalvando] = useState(false);

  const partnerId = escolheParceiro ? form.partner_id : parceiros[0]?.id;

  useEffect(() => {
    if (isOpen) setForm(VAZIO);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !partnerId) {
      setEquipe([]);
      return;
    }
    parceriasService.listarEquipe(partnerId).then((m) => setEquipe(m.filter((x) => x.is_active))).catch(() => setEquipe([]));
  }, [isOpen, partnerId]);

  const texto = (nome: keyof OportunidadeForm) => ({
    value: (form[nome] as string) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [nome]: e.target.value }),
  });

  const obrigatorios = [form.title, form.deal_type, form.sector, form.relationship_type, form.context, form.cnpj, form.company_name];
  const pronto = obrigatorios.every((v) => (v ?? "").toString().trim() !== "") && (!escolheParceiro || !!form.partner_id);

  const salvar = async () => {
    setSalvando(true);
    try {
      const dados = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, typeof v === "string" && v.trim() === "" ? null : v])
      ) as OportunidadeForm;
      onCriada(await parceriasService.criarOportunidade(dados));
    } catch (e) {
      showError(mensagemDeErro(e, "Erro ao cadastrar a oportunidade."));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Nova oportunidade"
      subtitle="Entra em Novo Lead com a elegibilidade Em análise."
      size="xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} loading={salvando} disabled={!pronto}>Cadastrar</Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {escolheParceiro && (
          <FormField label="Parceiro" required>
            <SelectMenu
              value={form.partner_id ? String(form.partner_id) : ""}
              placeholder="Escolha o parceiro"
              options={parceiros.map((p) => ({ value: String(p.id), label: p.name }))}
              onChange={(v) => setForm({ ...form, partner_id: Number(v), seller_member_id: null })}
            />
          </FormField>
        )}
        <FormField label="Vendedor responsável">
          <SelectMenu
            value={form.seller_member_id ? String(form.seller_member_id) : ""}
            placeholder={equipe.length ? "Escolha" : "Cadastre a equipe no card do parceiro"}
            disabled={!equipe.length}
            options={equipe.map((m) => ({ value: String(m.id), label: m.name }))}
            onChange={(v) => setForm({ ...form, seller_member_id: Number(v) })}
          />
        </FormField>
        <FormField label="Título do card" required className="sm:col-span-2"><Input {...texto("title")} /></FormField>
        <FormField label="Tipo de negócio" required>
          <SelectMenu value={form.deal_type ?? ""} placeholder="Escolha" options={opcoes(DEAL_TYPES)} onChange={(v) => setForm({ ...form, deal_type: v })} />
        </FormField>
        <FormField label="Tipo de relacionamento" required>
          <SelectMenu value={form.relationship_type ?? ""} placeholder="Escolha" options={opcoes(RELATIONSHIP_TYPES)} onChange={(v) => setForm({ ...form, relationship_type: v })} />
        </FormField>
        <FormField label="Setor da empresa" required className="sm:col-span-2">
          <SelectMenu value={form.sector ?? ""} placeholder="Escolha" options={opcoes(SECTORS)} onChange={(v) => setForm({ ...form, sector: v })} />
        </FormField>
        <FormField label="CNPJ" required><Input {...texto("cnpj")} placeholder="00.000.000/0000-00" /></FormField>
        <FormField label="Razão social / nome" required><Input {...texto("company_name")} /></FormField>
        <FormField label="Cidade"><Input {...texto("company_city")} /></FormField>
        <FormField label="UF"><Input {...texto("company_state")} maxLength={2} /></FormField>
        <FormField label="Contexto da indicação e necessidade" required className="sm:col-span-2">
          <Textarea {...texto("context")} rows={3} />
        </FormField>
        <FormField label="Contato"><Input {...texto("contact_name")} /></FormField>
        <FormField label="Cargo"><Input {...texto("contact_role")} /></FormField>
        <FormField label="Telefone"><Input {...texto("contact_phone")} /></FormField>
        <FormField label="E-mail"><Input type="email" {...texto("contact_email")} /></FormField>
      </div>
    </BaseModal>
  );
}
```

- [ ] **Step 2: Kanban do board 2**

`frontend/src/pages/parcerias/OportunidadesKanban.tsx`:

```tsx
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button, LoadingSpinner, SelectMenu } from "../../components/common";
import KanbanParcerias from "../../components/parcerias/KanbanParcerias";
import ModalTrava, { faltasParaMover, temFalta } from "../../components/parcerias/ModalTrava";
import NovaOportunidadeModal from "../../components/parcerias/NovaOportunidadeModal";
import { useAuth } from "../../hooks/useAuth";
import { showError } from "../../utils/toast";
import { LOSS_REASONS_ACQUISITION } from "../../constants/blueprintOptions";
import { ELEGIBILIDADE_COR, ELEGIBILIDADE_LABEL, PERFIS_GESTAO, formatarMoeda } from "../../constants/parcerias";
import parceriasService, {
  Etapa, MoverPayload, Oportunidade, Parceiro, mensagemDeErro,
} from "../../services/parceriasService";

export default function OportunidadesKanban() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const gestao = PERFIS_GESTAO.includes(user?.role ?? "");
  const ehParceiro = user?.role === "partner";
  const podeMover = gestao || ehParceiro;

  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [ops, setOps] = useState<Oportunidade[]>([]);
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [filtro, setFiltro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [nova, setNova] = useState(false);
  const [pendente, setPendente] = useState<{ op: Oportunidade; destino: string } | null>(null);

  const carregar = useCallback(async () => {
    try {
      const [e, o, p] = await Promise.all([
        parceriasService.etapas(),
        parceriasService.listarOportunidades(filtro ? Number(filtro) : undefined),
        parceriasService.listarParceiros(),
      ]);
      setEtapas(e.oportunidades);
      setOps(o);
      setParceiros(p);
    } catch (err) {
      showError(mensagemDeErro(err, "Erro ao carregar as oportunidades."));
    } finally {
      setCarregando(false);
    }
  }, [filtro]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const mover = async (op: Oportunidade, destino: string, extras: Partial<MoverPayload> = {}) => {
    try {
      await parceriasService.moverOportunidade(op.id, { stage: destino, ...extras });
    } catch (err) {
      showError(mensagemDeErro(err, "Não foi possível mover a oportunidade."));
    }
    await carregar();
  };

  const aoMover = (op: Oportunidade, destino: string) => {
    if (temFalta(faltasParaMover(destino, op))) setPendente({ op, destino });
    else mover(op, destino);
  };

  if (carregando) return <LoadingSpinner />;

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pipeline de Parceiros</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Oportunidades registradas pelos parceiros.</p>
        </div>
        <div className="flex items-center gap-3">
          {!ehParceiro && (
            <div className="w-56">
              <SelectMenu
                value={filtro}
                options={[{ value: "", label: "Todos os parceiros" }, ...parceiros.map((p) => ({ value: String(p.id), label: p.name }))]}
                onChange={setFiltro}
              />
            </div>
          )}
          {podeMover && (
            <Button icon={<Plus size={16} />} onClick={() => setNova(true)}>Nova oportunidade</Button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <KanbanParcerias
          etapas={etapas}
          itens={ops}
          idDe={(o) => o.id}
          etapaDe={(o) => o.stage}
          onAbrir={(o) => navigate(`/parcerias/oportunidades/${o.id}`)}
          onMover={podeMover ? aoMover : undefined}
          renderCard={(o) => (
            <>
              <p className="text-sm font-medium text-slate-900 dark:text-white">{o.title}</p>
              <p className="text-xs text-slate-500">{o.company_name}</p>
              {!ehParceiro && <p className="text-xs text-slate-400">{o.partner_name}</p>}
              {o.seller_name && <p className="text-xs text-slate-400">Vendedor: {o.seller_name}</p>}
              <div className="mt-2 flex items-center justify-between">
                <span className={`rounded px-1.5 py-0.5 text-[11px] ${ELEGIBILIDADE_COR[o.eligibility_status]}`}>
                  {ELEGIBILIDADE_LABEL[o.eligibility_status]}
                </span>
                {o.total_value > 0 && (
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{formatarMoeda(o.total_value)}</span>
                )}
              </div>
            </>
          )}
        />
      </div>

      <NovaOportunidadeModal
        isOpen={nova}
        parceiros={parceiros}
        escolheParceiro={!ehParceiro}
        onClose={() => setNova(false)}
        onCriada={(o) => {
          setNova(false);
          navigate(`/parcerias/oportunidades/${o.id}`);
        }}
      />
      <ModalTrava
        isOpen={!!pendente}
        destinoNome={etapas.find((e) => e.codigo === pendente?.destino)?.nome ?? ""}
        faltas={pendente ? faltasParaMover(pendente.destino, pendente.op) : { motivo: false, data: false, modalidade: false }}
        motivos={LOSS_REASONS_ACQUISITION}
        onClose={() => setPendente(null)}
        onConfirmar={(extras) => {
          if (pendente) mover(pendente.op, pendente.destino, extras);
          setPendente(null);
        }}
      />
    </div>
  );
}
```

- [ ] **Step 3: Detalhe da oportunidade (dados, elegibilidade, produtos, histórico)**

`frontend/src/pages/parcerias/OportunidadeDetalhe.tsx`:

```tsx
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button, FormField, Input, LoadingSpinner, SelectMenu, Textarea } from "../../components/common";
import AtividadesParceria from "../../components/parcerias/AtividadesParceria";
import ModalTrava, { faltasParaMover, temFalta } from "../../components/parcerias/ModalTrava";
import { useAuth } from "../../hooks/useAuth";
import { showError, showSuccess } from "../../utils/toast";
import { DEAL_TYPES, LOSS_REASONS_ACQUISITION, RELATIONSHIP_TYPES, SECTORS } from "../../constants/blueprintOptions";
import {
  ELEGIBILIDADE_COR, ELEGIBILIDADE_LABEL, PERFIS_GESTAO, formatarCnpj, formatarMoeda,
} from "../../constants/parcerias";
import parceriasService, {
  Etapa, ItemProduto, Membro, MoverPayload, Oportunidade, OportunidadeForm, ProdutoCatalogo, mensagemDeErro,
} from "../../services/parceriasService";

const opcoes = (lista: string[]) => lista.map((v) => ({ value: v, label: v }));

export default function OportunidadeDetalhe() {
  const { opportunityId } = useParams();
  const id = Number(opportunityId);
  const navigate = useNavigate();
  const { user } = useAuth();
  const gestao = PERFIS_GESTAO.includes(user?.role ?? "");
  const podeEditar = gestao || user?.role === "partner";
  const validaElegibilidade = gestao || user?.role === "finance";

  const [op, setOp] = useState<Oportunidade | null>(null);
  const [form, setForm] = useState<OportunidadeForm>({});
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [equipe, setEquipe] = useState<Membro[]>([]);
  const [itens, setItens] = useState<ItemProduto[]>([]);
  const [busca, setBusca] = useState("");
  const [catalogo, setCatalogo] = useState<ProdutoCatalogo[]>([]);
  const [nota, setNota] = useState("");
  const [destinoPendente, setDestinoPendente] = useState<string | null>(null);

  const preencher = (o: Oportunidade) => {
    setOp(o);
    setForm({
      seller_member_id: o.seller_member_id ?? null, title: o.title, deal_type: o.deal_type, sector: o.sector,
      relationship_type: o.relationship_type, context: o.context, cnpj: formatarCnpj(o.cnpj),
      company_name: o.company_name, company_segment: o.company_segment ?? "", company_city: o.company_city ?? "",
      company_state: o.company_state ?? "", contact_name: o.contact_name ?? "", contact_role: o.contact_role ?? "",
      contact_phone: o.contact_phone ?? "", contact_email: o.contact_email ?? "",
      expected_close_date: o.expected_close_date ?? "", modality: o.modality ?? null,
    });
  };

  const carregar = useCallback(async () => {
    try {
      const [o, e, produtos] = await Promise.all([
        parceriasService.buscarOportunidade(id),
        parceriasService.etapas(),
        parceriasService.listarProdutos(id),
      ]);
      preencher(o);
      setEtapas(e.oportunidades);
      setItens(produtos);
      setEquipe(await parceriasService.listarEquipe(o.partner_id));
    } catch (err) {
      showError(mensagemDeErro(err, "Erro ao carregar a oportunidade."));
      navigate("/parcerias/oportunidades");
    }
  }, [id, navigate]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    if (!podeEditar || busca.trim().length < 2) {
      setCatalogo([]);
      return;
    }
    const t = setTimeout(() => parceriasService.catalogo(busca).then(setCatalogo).catch(() => setCatalogo([])), 300);
    return () => clearTimeout(t);
  }, [busca, podeEditar]);

  if (!op) return <LoadingSpinner />;

  const salvar = async () => {
    try {
      const dados = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, typeof v === "string" && v.trim() === "" ? null : v])
      ) as OportunidadeForm;
      preencher(await parceriasService.atualizarOportunidade(id, dados));
      showSuccess("Oportunidade salva.");
    } catch (err) {
      showError(mensagemDeErro(err, "Erro ao salvar a oportunidade."));
    }
  };

  const mover = async (destino: string, extras: Partial<MoverPayload> = {}) => {
    try {
      preencher(await parceriasService.moverOportunidade(id, { stage: destino, ...extras }));
    } catch (err) {
      showError(mensagemDeErro(err, "Não foi possível mover a oportunidade."));
    }
  };

  const pedirMover = (destino: string) => {
    if (temFalta(faltasParaMover(destino, op))) setDestinoPendente(destino);
    else mover(destino);
  };

  const elegibilidade = async (status: string) => {
    try {
      preencher(await parceriasService.definirElegibilidade(id, status, nota.trim() || undefined));
      setNota("");
    } catch (err) {
      showError(mensagemDeErro(err, "Erro ao registrar a elegibilidade."));
    }
  };

  const recarregarProdutos = async () => {
    setItens(await parceriasService.listarProdutos(id));
    setOp(await parceriasService.buscarOportunidade(id));
  };

  const adicionar = async (p: ProdutoCatalogo) => {
    try {
      await parceriasService.adicionarProduto(id, { product_id: p.id, quantity: 1 });
      setBusca("");
      await recarregarProdutos();
    } catch (err) {
      showError(mensagemDeErro(err, "Erro ao adicionar o produto."));
    }
  };

  const mudarQuantidade = async (item: ItemProduto, quantidade: number) => {
    if (quantidade < 1) return;
    try {
      await parceriasService.atualizarProduto(id, item.id, { quantity: quantidade });
      await recarregarProdutos();
    } catch (err) {
      showError(mensagemDeErro(err, "Erro ao alterar a quantidade."));
    }
  };

  const remover = async (item: ItemProduto) => {
    try {
      await parceriasService.removerProduto(id, item.id);
      await recarregarProdutos();
    } catch (err) {
      showError(mensagemDeErro(err, "Erro ao remover o produto."));
    }
  };

  const texto = (nome: keyof OportunidadeForm) => ({
    value: (form[nome] as string) ?? "",
    disabled: !podeEditar,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [nome]: e.target.value }),
  });

  const caixa = "rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700/50 dark:bg-slate-800/40";
  const titulo = "mb-3 text-sm font-semibold text-slate-800 dark:text-slate-200";

  return (
    <div className="p-6">
      <button onClick={() => navigate("/parcerias/oportunidades")} className="mb-4 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-white">
        <ArrowLeft size={16} /> Pipeline de Parceiros
      </button>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{op.title}</h1>
          <p className="text-sm text-slate-500">
            {op.company_name} · Canal: {op.acquisition_channel} · Parceiro: {op.partner_name}
            {op.total_value > 0 && ` · ${formatarMoeda(op.total_value)}`}
          </p>
        </div>
        <div className="w-56">
          <SelectMenu
            value={op.stage}
            disabled={!podeEditar}
            options={etapas.map((e) => ({ value: e.codigo, label: e.nome }))}
            onChange={pedirMover}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <div className={caixa}>
            <h2 className={titulo}>Elegibilidade</h2>
            <span className={`rounded px-2 py-1 text-xs ${ELEGIBILIDADE_COR[op.eligibility_status]}`}>
              {ELEGIBILIDADE_LABEL[op.eligibility_status]}
            </span>
            {op.eligibility_by_name && (
              <p className="mt-2 text-xs text-slate-500">
                por {op.eligibility_by_name}
                {op.eligibility_at && ` em ${new Date(op.eligibility_at).toLocaleDateString("pt-BR")}`}
              </p>
            )}
            {op.eligibility_note && <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{op.eligibility_note}</p>}
            {validaElegibilidade && op.stage === "novo_lead" && (
              <div className="mt-3 space-y-2">
                <Textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={2} placeholder="Justificativa (obrigatória para rejeitar)" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => elegibilidade("validada")}>Validar</Button>
                  <Button size="sm" variant="danger" onClick={() => elegibilidade("rejeitada")} disabled={!nota.trim()}>Rejeitar</Button>
                </div>
              </div>
            )}
          </div>

          <div className={caixa}>
            <h2 className={titulo}>Negócio</h2>
            <div className="space-y-3">
              <FormField label="Título" required><Input {...texto("title")} /></FormField>
              <FormField label="Tipo de negócio" required>
                <SelectMenu value={form.deal_type ?? ""} disabled={!podeEditar} options={opcoes(DEAL_TYPES)} onChange={(v) => setForm({ ...form, deal_type: v })} />
              </FormField>
              <FormField label="Setor" required>
                <SelectMenu value={form.sector ?? ""} disabled={!podeEditar} options={opcoes(SECTORS)} onChange={(v) => setForm({ ...form, sector: v })} />
              </FormField>
              <FormField label="Tipo de relacionamento" required>
                <SelectMenu value={form.relationship_type ?? ""} disabled={!podeEditar} options={opcoes(RELATIONSHIP_TYPES)} onChange={(v) => setForm({ ...form, relationship_type: v })} />
              </FormField>
              <FormField label="Vendedor responsável">
                <SelectMenu
                  value={form.seller_member_id ? String(form.seller_member_id) : ""}
                  placeholder="Sem vendedor"
                  disabled={!podeEditar}
                  options={equipe.filter((m) => m.is_active || m.id === op.seller_member_id).map((m) => ({ value: String(m.id), label: m.name }))}
                  onChange={(v) => setForm({ ...form, seller_member_id: Number(v) })}
                />
              </FormField>
              <FormField label="Data esperada de fechamento">
                <Input type="date" {...texto("expected_close_date")} />
              </FormField>
              <FormField label="É venda ou locação?">
                <SelectMenu
                  value={form.modality ?? ""}
                  placeholder="Escolha"
                  disabled={!podeEditar}
                  options={[{ value: "venda", label: "Venda" }, { value: "locacao", label: "Locação" }]}
                  onChange={(v) => setForm({ ...form, modality: v as "venda" | "locacao" })}
                />
              </FormField>
              <FormField label="Contexto da indicação" required><Textarea {...texto("context")} rows={3} /></FormField>
            </div>
          </div>

          <div className={caixa}>
            <h2 className={titulo}>Empresa e contato</h2>
            <div className="space-y-3">
              <FormField label="CNPJ" required><Input {...texto("cnpj")} /></FormField>
              <FormField label="Razão social / nome" required><Input {...texto("company_name")} /></FormField>
              <FormField label="Segmento"><Input {...texto("company_segment")} /></FormField>
              <FormField label="Cidade"><Input {...texto("company_city")} /></FormField>
              <FormField label="UF"><Input {...texto("company_state")} maxLength={2} /></FormField>
              <FormField label="Contato"><Input {...texto("contact_name")} /></FormField>
              <FormField label="Cargo"><Input {...texto("contact_role")} /></FormField>
              <FormField label="Telefone"><Input {...texto("contact_phone")} /></FormField>
              <FormField label="E-mail"><Input {...texto("contact_email")} /></FormField>
              {podeEditar && <Button onClick={salvar} fullWidth>Salvar</Button>}
            </div>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-2">
          {op.stage === "perdido" && op.loss_reason && (
            <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              Perdida: {op.loss_reason}{op.loss_detail && ` — ${op.loss_detail}`}
            </div>
          )}

          <div className={caixa}>
            <h2 className={titulo}>Produtos</h2>
            {podeEditar && (
              <div className="relative mb-3">
                <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar produto por nome ou código" />
                {catalogo.length > 0 && (
                  <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                    {catalogo.map((p) => (
                      <li key={p.id}>
                        <button onClick={() => adicionar(p)} className="flex w-full justify-between px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-800">
                          <span>{p.name}{p.sku && <span className="text-xs text-slate-500"> · {p.sku}</span>}</span>
                          <span className="text-xs text-slate-500">{formatarMoeda(p.unit_price)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <table className="w-full text-sm">
              <tbody>
                {itens.map((item) => (
                  <tr key={item.id} className="border-t border-gray-100 dark:border-slate-700/50">
                    <td className="py-2 text-slate-800 dark:text-slate-200">{item.product_name}</td>
                    <td className="w-24 py-2">
                      <Input
                        type="number"
                        min={1}
                        defaultValue={item.quantity}
                        disabled={!podeEditar}
                        onBlur={(e) => Number(e.target.value) !== item.quantity && mudarQuantidade(item, Number(e.target.value))}
                      />
                    </td>
                    <td className="py-2 text-right text-slate-600 dark:text-slate-400">{formatarMoeda(item.unit_price)}</td>
                    <td className="py-2 text-right font-medium text-slate-800 dark:text-slate-200">{formatarMoeda(item.total)}</td>
                    <td className="w-8 py-2 text-right">
                      {podeEditar && (
                        <button onClick={() => remover(item)} className="text-slate-400 hover:text-red-500" title="Remover">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {itens.length === 0 && (
                  <tr><td className="py-2 text-slate-500">Nenhum produto.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className={caixa}>
            <h2 className={titulo}>Atividades e histórico</h2>
            <AtividadesParceria alvo={{ tipo: "oportunidade", id }} somenteLeitura={!podeEditar} />
          </div>
        </div>
      </div>

      <ModalTrava
        isOpen={!!destinoPendente}
        destinoNome={etapas.find((e) => e.codigo === destinoPendente)?.nome ?? ""}
        faltas={destinoPendente ? faltasParaMover(destinoPendente, op) : { motivo: false, data: false, modalidade: false }}
        motivos={LOSS_REASONS_ACQUISITION}
        onClose={() => setDestinoPendente(null)}
        onConfirmar={(extras) => {
          const destino = destinoPendente;
          setDestinoPendente(null);
          if (destino) mover(destino, extras);
        }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

Run (em `frontend/`): `npx tsc --noEmit -p tsconfig.json`
Expected: sem erros.

- [ ] **Step 5: Commit (perguntar antes)**

```bash
git add frontend/src/components/parcerias/NovaOportunidadeModal.tsx frontend/src/pages/parcerias/OportunidadesKanban.tsx frontend/src/pages/parcerias/OportunidadeDetalhe.tsx
git commit -m "feat(parcerias): telas do board Pipeline de Parceiros"
```

---

### Task 14: Frontend — entrada, rotas, menu e tranca na tela

**Files:**
- Create: `frontend/src/pages/parcerias/ParceriasHome.tsx`
- Modify: `frontend/src/router.tsx`, `frontend/src/layouts/MainLayout.tsx`

- [ ] **Step 1: Página de entrada**

`frontend/src/pages/parcerias/ParceriasHome.tsx`:

```tsx
import { Link, Navigate } from "react-router-dom";
import { Handshake, Trello } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

export default function ParceriasHome() {
  const { user } = useAuth();
  // O parceiro trabalha no Pipeline; o card dele no board 1 abre pelo menu do board.
  if (user?.role === "partner") return <Navigate to="/parcerias/oportunidades" replace />;

  const cartao = "flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-6 transition hover:border-emerald-400 dark:border-slate-700/50 dark:bg-slate-800/40";

  return (
    <div className="p-6">
      <h1 className="mb-1 text-2xl font-bold text-slate-900 dark:text-white">Parcerias</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">Programa de Parceiros da Health &amp; Safety.</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Link to="/parcerias/aquisicao" className={cartao}>
          <Handshake className="text-emerald-500" size={28} />
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">Aquisição de Parceiros</h2>
            <p className="text-sm text-slate-500">Da prospecção até a ativação de cada parceiro.</p>
          </div>
        </Link>
        <Link to="/parcerias/oportunidades" className={cartao}>
          <Trello className="text-emerald-500" size={28} />
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">Pipeline de Parceiros</h2>
            <p className="text-sm text-slate-500">As oportunidades que os parceiros registram.</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Rotas**

Em `frontend/src/router.tsx`, acrescentar aos imports:

```tsx
import ParceriasHome from './pages/parcerias/ParceriasHome';
import AquisicaoKanban from './pages/parcerias/AquisicaoKanban';
import ParceiroDetalhe from './pages/parcerias/ParceiroDetalhe';
import OportunidadesKanban from './pages/parcerias/OportunidadesKanban';
import OportunidadeDetalhe from './pages/parcerias/OportunidadeDetalhe';
import { PERFIS_PARCERIAS } from './constants/parcerias';
```

Depois de `ServiceTeamGuard`:

```tsx
/**
 * Protege a seção Parcerias: admin, gerente, Financeiro e parceiro.
 * Os demais perfis voltam para a Dashboard.
 */
const ParceriasGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    if (user && !PERFIS_PARCERIAS.includes(user.role)) {
        return <Navigate to="/" replace />;
    }
    return <>{children}</>;
};
```

Dentro do grupo com `MainLayout`, depois da rota `/servicos/:boardId/cards/:cardId`:

```tsx
      <Route path="/parcerias" element={<ParceriasGuard><ParceriasHome /></ParceriasGuard>} />
      <Route path="/parcerias/aquisicao" element={<ParceriasGuard><AquisicaoKanban /></ParceriasGuard>} />
      <Route path="/parcerias/aquisicao/:partnerId" element={<ParceriasGuard><ParceiroDetalhe /></ParceriasGuard>} />
      <Route path="/parcerias/oportunidades" element={<ParceriasGuard><OportunidadesKanban /></ParceriasGuard>} />
      <Route path="/parcerias/oportunidades/:opportunityId" element={<ParceriasGuard><OportunidadeDetalhe /></ParceriasGuard>} />
```

- [ ] **Step 3: Menu e tranca no layout**

Em `frontend/src/layouts/MainLayout.tsx`:

1. Import: `import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";`, acrescentar `Handshake` ao import do `lucide-react` e `import { PERFIS_PARCERIAS, PERFIS_TRANCADOS } from "../constants/parcerias";`.

2. Em `menuItems`, depois do item `/servicos`:

```tsx
    { path: "/parcerias", icon: Handshake, label: "Parcerias", adminOnly: false, managerOrAdminOnly: false, viewerAllowed: false },
```

3. Logo depois de `const [changelogOpen, setChangelogOpen] = useState(false);`:

```tsx
    // Parceiro e Financeiro: só Parcerias e Configurações (o backend tranca o resto).
    const trancado = PERFIS_TRANCADOS.includes(user?.role ?? "");
```

4. Imediatamente antes do `return (` principal do componente (depois de `handleLogout`):

```tsx
    if (trancado && !location.pathname.startsWith("/parcerias") && location.pathname !== "/settings") {
        return <Navigate to="/parcerias" replace />;
    }
```

5. Dentro de `menuItems.map`, logo depois do bloco do `"/servicos", "/service-catalog"`:

```tsx
                                if (item.path === "/parcerias" && !PERFIS_PARCERIAS.includes(user?.role ?? "")) {
                                    return null;
                                }
                                if (trancado && !["/parcerias", "/settings"].includes(item.path)) {
                                    return null;
                                }
```

6. No rótulo do perfil (cadeia `user?.role === "viewer" ? "Visualizador"`), antes do `: "Usuário"`:

```tsx
                                            : user?.role === "partner"
                                            ? "Parceiro"
                                            : user?.role === "finance"
                                            ? "Financeiro"
```

7. Trocar `<GlobalSearch />` por `{!trancado && <GlobalSearch />}` e `{user?.role !== "viewer" && <AgentGrowthWidget />}` por `{user?.role !== "viewer" && !trancado && <AgentGrowthWidget />}`.

- [ ] **Step 4: Typecheck e build**

Run (em `frontend/`): `npx tsc --noEmit -p tsconfig.json` e depois `npm run build`
Expected: sem erros; build conclui.

- [ ] **Step 5: Conferir na tela (backend local rodando)**

Com o container local apontando para produção, **não** criar dados. Conferir só com admin: o menu mostra "Parcerias"; `/parcerias` abre os dois cartões; os boards abrem vazios com as etapas certas. O fluxo completo (parceiro, Financeiro, travas) já está coberto pelos testes do backend; o teste de ponta a ponta com logins de parceiro fica para homologação, depois da migration.

- [ ] **Step 6: Commit (perguntar antes)**

```bash
git add frontend/src/pages/parcerias/ParceriasHome.tsx frontend/src/router.tsx frontend/src/layouts/MainLayout.tsx
git commit -m "feat(parcerias): menu, rotas e tranca da secao Parcerias no frontend"
```

---

### Task 15: Frontend — Financeiro na tela de Usuários

**Files:**
- Modify: `frontend/src/components/users/UserModal.tsx`, `frontend/src/pages/Users.tsx`

- [ ] **Step 1: Opção Financeiro no cadastro**

Em `frontend/src/components/users/UserModal.tsx`:

1. Garantir `import userService from "../../services/userService";` (se o arquivo já importa, reaproveitar) e `useEffect`/`useState` no import do React.
2. Junto dos outros `useState` do componente:

```tsx
  // O id da role Financeiro depende do banco; vem da API.
  const [idFinanceiro, setIdFinanceiro] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    userService
      .listarPerfis()
      .then((perfis) => setIdFinanceiro(perfis.find((p) => p.name === "finance")?.id ?? null))
      .catch(() => setIdFinanceiro(null));
  }, [isOpen]);
```

(Se a prop de abertura do modal tiver outro nome que `isOpen`, usar o nome do arquivo.)

3. No `options` da Função, depois de `{ value: "6", label: "Serviço" },`:

```tsx
                  ...(idFinanceiro ? [{ value: String(idFinanceiro), label: "Financeiro" }] : []),
```

4. Na lista de descrições abaixo do select, acrescentar:

```tsx
                {idFinanceiro !== null && roleId === idFinanceiro && "Acompanha Parcerias e valida a elegibilidade das oportunidades"}
```

- [ ] **Step 2: Filtro e selo na lista**

Em `frontend/src/pages/Users.tsx`:
- No `options` do filtro de função, depois de `{ value: "service", label: "Serviço" },` acrescentar `{ value: "finance", label: "Financeiro" },` e `{ value: "partner", label: "Parceiro" },`.
- Em `getRoleBadgeColor`, antes do `default`:

```tsx
      case "finance":
        return "bg-cyan-500/20 text-slate-900 dark:text-cyan-400";
      case "partner":
        return "bg-orange-500/20 text-slate-900 dark:text-orange-400";
```

- [ ] **Step 3: Typecheck**

Run (em `frontend/`): `npx tsc --noEmit -p tsconfig.json`
Expected: sem erros.

- [ ] **Step 4: Commit (perguntar antes)**

```bash
git add frontend/src/components/users/UserModal.tsx frontend/src/pages/Users.tsx
git commit -m "feat(parcerias): perfil Financeiro no cadastro de usuarios"
```

---

### Task 16: Versão, changelog e verificação final

**Files:**
- Modify: `CHANGELOG.md`, `frontend/src/components/common/ChangelogModal.tsx`, `frontend/src/layouts/MainLayout.tsx` (rodapé)

- [ ] **Step 1: Versão 1.10.24 nos 3 lugares**

Usar a data do dia da implementação (DD/MM/AAAA).

`CHANGELOG.md`, acima de `## [1.10.23]`:

```markdown
## [1.10.24] — DD/MM/2026

### Adicionado
- **Seção Parcerias (Programa de Parceiros), Entrega 1:** dois boards separados de Vendas e de Serviço. **Aquisição de Parceiros** (Potencial Parceiro → Qualificação → Proposta → Formalização → Onboarding → Ativação → Ativado, e Perdido): um card por parceiro, com a Equipe (vendedores do parceiro) e os acessos ao CRM criados pela H&S. A passagem para Ativado é automática na primeira oportunidade validada, proposta ou venda do parceiro. **Pipeline de Parceiros** (Novo Lead → Oportunidade → Proposta → Negociação → Aguardando Pedido → Ganho/Perdido): título, tipo de negócio, setor, tipo de relacionamento, CNPJ, empresa e contexto obrigatórios; só sai de Novo Lead com elegibilidade Validada; data esperada de fechamento a partir de Negociação; venda ou locação no Ganho; motivo no Perdido. Etapas fixas no código.
- **Perfis Parceiro e Financeiro:** o parceiro vê só o próprio card e as oportunidades do próprio canal; o Financeiro vê tudo em Parcerias e valida ou rejeita a elegibilidade. Login de parceiro nasce no card do parceiro; a tela de Usuários recusa.

### Segurança
- **Tranca geral para Parceiro e Financeiro:** no backend, esses perfis só alcançam Parcerias, login, o próprio perfil e as próprias notificações — qualquer outra rota responde 403, inclusive as que forem criadas depois. Um parceiro nunca recebe dado de outro parceiro: o filtro por parceiro é feito no backend.

### Banco
- Migration `1b2c3d4e5f6a`: tabelas `partners`, `partner_team_members`, `partner_opportunities`, `partner_opportunity_products`, `partner_activities`, coluna `users.partner_id` e roles `partner`/`finance`. Rodar antes do deploy.

---
```

`frontend/src/components/common/ChangelogModal.tsx`, no topo da lista (antes do objeto da `1.10.23`):

```tsx
  {
    version: "1.10.24",
    date: "DD/MM/2026",
    entries: [
      {
        type: "feature",
        text: "Nova seção Parcerias: boards Aquisição de Parceiros e Pipeline de Parceiros, com a Equipe de cada parceiro e a ativação automática.",
      },
      {
        type: "feature",
        text: "Perfis Parceiro e Financeiro: o parceiro vê só as próprias oportunidades; o Financeiro acompanha e valida a elegibilidade.",
      },
    ],
  },
```

`frontend/src/layouts/MainLayout.tsx`: `HSGrowth CRM v1.10.23` → `HSGrowth CRM v1.10.24`.

- [ ] **Step 2: Suíte completa do backend**

Run: `MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest tests -q -p no:cacheprovider --color=no`
Expected: as 62 de Parcerias + as 5 de usuários passam; nenhuma falha nova em relação à contagem anotada na Task 2.

- [ ] **Step 3: Typecheck e build do frontend**

Run (em `frontend/`): `npx tsc --noEmit -p tsconfig.json` e `npm run build`
Expected: sem erros.

- [ ] **Step 4: Commit (perguntar antes)**

```bash
git add CHANGELOG.md frontend/src/components/common/ChangelogModal.tsx frontend/src/layouts/MainLayout.tsx
git commit -m "chore: versao 1.10.24 - Parcerias (Entrega 1)"
```

- [ ] **Step 5: Avisar o usuário do deploy**

Passar ao usuário: (1) a migration `1b2c3d4e5f6a` precisa rodar em produção **antes** do deploy, e só com confirmação dele; (2) depois do deploy, criar um usuário Financeiro pela tela de Usuários e um parceiro de teste com acesso, para conferir a tranca com um login real; (3) o plano da cadência de Serviço ainda aponta `down_revision = 'f0a1b2c3d4e5'` e precisa ir para `1b2c3d4e5f6a` quando for implementado.
