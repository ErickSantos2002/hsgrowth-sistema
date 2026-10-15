# Notificações que chegam a quem precisa — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer as notificações do CRM chegarem a quem precisa — sem aviso da própria ação, com lead do site destacado, lembretes funcionando sem Celery, avisos para o time de Serviço e preferências que valem de verdade.

**Architecture:** Toda notificação passa por `notificar()` (`app/services/notificacoes/enviar.py`), que aplica as regras (própria ação, inativo, obrigatório, preferência, já enviado) a partir de um catálogo único de tipos (`tipos.py`). Os lembretes são funções puras `f(db, agora_utc) -> int` chamadas pelo APScheduler que já roda dentro da API. A tela de Configurações é montada pelo mesmo catálogo.

**Tech Stack:** FastAPI + SQLAlchemy + Alembic + APScheduler (backend), pytest com SQLite em memória (testes), React + TypeScript + Vite + lucide-react (frontend).

**Spec:** `docs/superpowers/specs/2026-10-14-notificacoes-design.md`

---

## Como rodar os testes

O banco local aponta para produção — **nunca** rode `alembic upgrade` no container local sem confirmação. Os testes usam SQLite em memória e não tocam em banco nenhum.

```bash
cd backend
MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest tests/unit/<arquivo>.py -q -p no:cacheprovider --color=no
```

Suíte completa: troque o caminho por `tests/`. Em 13/10/2026 eram 732 testes passando.

Frontend: `cd frontend && npx tsc --noEmit -p tsconfig.json` (sem saída = ok).

**Acentos:** edite arquivos com o editor (Edit/Write), não com scripts colados no terminal — o terminal do Windows corrompe acentos.

## Estrutura de arquivos

**Criar (backend):**
- `backend/app/services/notificacoes/__init__.py` — pacote
- `backend/app/services/notificacoes/tipos.py` — catálogo dos tipos de aviso
- `backend/app/services/notificacoes/enviar.py` — `notificar()`, o único caminho para criar notificação
- `backend/app/services/notificacoes/atribuicao.py` — `avisar_atribuicao()`: lead do site ou card atribuído
- `backend/app/services/notificacoes/horario.py` — fuso de Brasília e limites do dia
- `backend/app/services/notificacoes/resumo.py` — resumo da manhã
- `backend/app/services/notificacoes/reunioes.py` — reunião em 15 minutos
- `backend/app/services/notificacoes/servico.py` — card novo nos boards de Serviço
- `backend/app/services/notificacoes/limpeza.py` — apaga lidas com mais de 30 dias
- `backend/alembic/versions/2026_10_14_1000-e9f0a1b2c3d4_notificacoes.py` — migration
- `backend/tests/unit/apoio_notificacoes.py` — ajudantes dos testes
- `backend/tests/unit/test_notificacoes_*.py` — um arquivo por unidade

**Modificar (backend):** `app/models/notification.py`, `app/models/user_notification_setting.py`, `app/models/card.py`, `app/models/user.py`, `app/models/service_card.py`, `app/schemas/user_notification_setting.py`, `app/services/user_notification_service.py`, `app/api/v1/endpoints/users.py`, `app/services/card_service.py`, `app/services/automation_service.py`, `app/services/card_task_service.py`, `app/services/product_service.py`, `app/services/recording_service.py`, `app/services/gamification_service.py`, `app/api/v1/endpoints/cards.py`, `app/workers/scheduler.py`.

**Criar (frontend):** `frontend/src/utils/avisos.tsx` (ícone/cor/rótulo por tipo), `frontend/src/components/settings/NotificacoesConfig.tsx` (aba de Configurações).

**Modificar (frontend):** `src/types/index.ts`, `src/services/notificationService.ts`, `src/components/NotificationDropdown.tsx`, `src/pages/Notifications.tsx`, `src/pages/Settings.tsx`.

## Mudanças em relação ao spec (decididas ao escrever o plano)

- "Já avisei" fica em colunas simples em vez de `notification_metadata`: `notifications.referencia` (resumo, reunião, lead) e `service_cards.avisado_em` (card novo). Os testes rodam em SQLite e consulta em JSON se comporta diferente do Postgres.
- Continuam existindo, como tipos obrigatórios e invisíveis em Configurações: `reuniao_falha` (falha ao processar gravação — donos da reunião + admins, como hoje) e `automacao` (ação "enviar notificação" das automações, configurada de propósito por alguém).
- Datas: `card_tasks.due_date` é gravado em UTC (o front converte com `convertBrazilToUTC`); `service_card_activities.due_date` é gravado no horário de Brasília, sem fuso (o front manda `YYYY-MM-DDTHH:MM:00`). O resumo trata cada um no seu fuso. Brasília sem horário de verão desde 2019: UTC−3 fixo.
- O resumo da manhã leva para `/activities` nos dois mundos: a rota já mostra a tela de Serviço para quem é de Serviço (`router.tsx`).

---

### Task 1: Migration e modelos

**Files:**
- Create: `backend/alembic/versions/2026_10_14_1000-e9f0a1b2c3d4_notificacoes.py`
- Modify: `backend/app/models/notification.py`, `backend/app/models/user_notification_setting.py`, `backend/app/models/card.py`, `backend/app/models/user.py`, `backend/app/models/service_card.py`
- Create: `backend/tests/unit/apoio_notificacoes.py`
- Test: `backend/tests/unit/test_notificacoes_modelos.py`

- [ ] **Step 1: Conferir que o id da migration está livre**

Run: `cd backend && grep -rh "^revision = " alembic/versions/*.py | grep -c e9f0a1b2c3d4`
Expected: `0`

E que o head atual é `d8e9f0a1b2c3`:
Run: `grep -rh "^down_revision = 'd8e9f0a1b2c3'" alembic/versions/*.py | wc -l`
Expected: `0` (ninguém depende dele ainda)

- [ ] **Step 2: Criar os ajudantes de teste**

`backend/tests/unit/apoio_notificacoes.py`:

```python
"""
Ajudantes dos testes de notificações.

O `test_roles` do conftest não tem o papel de Serviço, e vários testes daqui
precisam de um usuário de Serviço, de um usuário de integração e dos dois
boards de Serviço.
"""
from types import SimpleNamespace

from app.core.security import create_access_token, hash_password
from app.models.notification import Notification
from app.models.role import Role
from app.models.service_board import ServiceBoard
from app.models.service_list import ServiceList
from app.models.user import User


def papel(db, nome: str) -> Role:
    existente = db.query(Role).filter(Role.name == nome).first()
    if existente:
        return existente
    r = Role(name=nome, display_name=nome.title(), description=nome,
             permissions=[], is_system_role=True)
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


def usuario(db, nome: str, papel_nome: str = "salesperson", **extra) -> User:
    u = User(
        name=nome,
        email=f"{nome.lower().replace(' ', '.')}@teste.com",
        password_hash=hash_password("senha12345"),
        role_id=papel(db, papel_nome).id,
        is_active=True,
        is_deleted=False,
        **extra,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


def cabecalho(user: User) -> dict:
    return {"Authorization": f"Bearer {create_access_token(data={'sub': str(user.id)})}"}


def boards_de_servico(db) -> SimpleNamespace:
    servicos = ServiceBoard(name="Serviços")
    cobranca = ServiceBoard(name="Cobrança")
    db.add_all([servicos, cobranca])
    db.commit()
    lista_servicos = ServiceList(board_id=servicos.id, name="Entrada", position=0)
    lista_cobranca = ServiceList(board_id=cobranca.id, name="Entrada", position=0)
    db.add_all([lista_servicos, lista_cobranca])
    db.commit()
    return SimpleNamespace(servicos=servicos, cobranca=cobranca,
                           lista_servicos=lista_servicos, lista_cobranca=lista_cobranca)


def avisos(db, user_id: int, tipo: str = None) -> list:
    q = db.query(Notification).filter(Notification.user_id == user_id)
    if tipo:
        q = q.filter(Notification.notification_type == tipo)
    return q.order_by(Notification.id).all()
```

- [ ] **Step 3: Escrever o teste que falha**

`backend/tests/unit/test_notificacoes_modelos.py`:

```python
"""
As colunas novas das notificações.

`referencia` e `avisado_em` existem para o agendador nunca avisar duas vezes;
`created_by_id` e `is_integracao` para reconhecer o lead do site.
"""
from datetime import datetime

from app.models.card import Card
from app.models.notification import Notification
from app.models.service_card import ServiceCard
from app.models.user_notification_setting import UserNotificationSetting
from tests.unit.apoio_notificacoes import boards_de_servico, usuario


def test_notificacao_guarda_a_referencia(db, test_salesperson_user):
    n = Notification(user_id=test_salesperson_user.id, notification_type="resumo_manha",
                     title="t", message="m", notification_metadata={},
                     referencia="resumo:2026-10-15")
    db.add(n)
    db.commit()

    assert db.query(Notification).one().referencia == "resumo:2026-10-15"


def test_card_guarda_quem_criou(db, test_lists, test_salesperson_user):
    card = Card(title="Lead", list_id=test_lists[0].id, position=0,
                created_by_id=test_salesperson_user.id)
    db.add(card)
    db.commit()

    assert db.query(Card).one().created_by_id == test_salesperson_user.id


def test_usuario_de_integracao(db):
    integ = usuario(db, "integracao", "manager", is_integracao=True)
    pessoa = usuario(db, "Sandra", "salesperson")

    assert integ.is_integracao is True
    assert pessoa.is_integracao is False


def test_card_de_servico_nasce_sem_aviso(db):
    b = boards_de_servico(db)
    c = ServiceCard(list_id=b.lista_servicos.id, title="OS 1")
    db.add(c)
    db.commit()

    assert c.avisado_em is None
    c.avisado_em = datetime(2026, 10, 14, 12, 0)
    db.commit()
    assert db.query(ServiceCard).one().avisado_em == datetime(2026, 10, 14, 12, 0)


def test_preferencias_novas_nascem_ligadas(db, test_salesperson_user):
    p = UserNotificationSetting(user_id=test_salesperson_user.id)
    db.add(p)
    db.commit()
    db.refresh(p)

    assert p.task_assigned and p.card_product_changed
    assert p.reuniao_pronta and p.resumo_manha and p.reuniao_15min and p.popup_navegador
    assert p.quadros_servico is None
    assert not hasattr(p, "card_moved")
    assert not hasattr(p, "achievement_unlocked")
    assert not hasattr(p, "task_due_soon")
```

- [ ] **Step 4: Rodar e ver falhar**

Run: `... python -m pytest tests/unit/test_notificacoes_modelos.py -q -p no:cacheprovider --color=no`
Expected: FAIL — `TypeError: 'referencia' is an invalid keyword argument for Notification` (e equivalentes).

- [ ] **Step 5: Modelos**

`backend/app/models/notification.py` — depois de `read_at = Column(DateTime, nullable=True)`:

```python
    # A que o aviso se refere ("resumo:2026-10-15", "reuniao:41973"). O
    # agendador confere antes de criar: reiniciar a API não repete aviso.
    referencia = Column(String(120), nullable=True)
```

E acrescentar no fim da classe, antes de `user = relationship(...)`:

```python
    __table_args__ = (
        Index("ix_notifications_dedupe", "user_id", "notification_type", "referencia"),
    )
```

com `Index` importado: `from sqlalchemy import Column, Integer, ForeignKey, String, Text, Boolean, JSON, DateTime, Index`.

`backend/app/models/user_notification_setting.py` — trocar o bloco `# --- Configurações de notificação ---` inteiro (de `task_assigned` até `achievement_unlocked`) por:

```python
    # --- Configurações de notificação ---
    # Os avisos obrigatórios (lead do site, card atribuído) não têm coluna:
    # não existe como desligar. Ver app/services/notificacoes/tipos.py.

    # Tarefa criada por outra pessoa para o usuário
    task_assigned = Column(Boolean, default=True, nullable=False)

    # Produto adicionado/removido por outra pessoa num card do usuário
    card_product_changed = Column(Boolean, default=True, nullable=False)

    # Gravação ou análise de reunião pronta
    reuniao_pronta = Column(Boolean, default=True, nullable=False)

    # Resumo das 8h (seg a sex)
    resumo_manha = Column(Boolean, default=True, nullable=False)

    # Aviso 15 minutos antes de reunião
    reuniao_15min = Column(Boolean, default=True, nullable=False)

    # Pop-up do navegador além do sino
    popup_navegador = Column(Boolean, default=True, nullable=False)

    # Boards de Serviço acompanhados (ids). None = ainda não calculado: o
    # padrão sai do histórico de atividades (UserNotificationService).
    quadros_servico = Column(JSON, nullable=True)
```

E o `import` no topo: `from sqlalchemy import Column, Integer, Boolean, ForeignKey, UniqueConstraint, JSON`.

`backend/app/models/card.py` — logo depois da linha `sdr_id = Column(...)`:

```python
    # Quem criou o card. Usuário de integração = lead que chegou sozinho
    # (site, RD Station). Cards anteriores a 14/10/2026 ficam nulos.
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
```

`backend/app/models/user.py` — logo depois de `is_active = Column(...)`:

```python
    # Usuário técnico das integrações (site, GestorHS). Card criado por ele
    # é lead que chegou sozinho, e ele nunca recebe aviso.
    is_integracao = Column(Boolean, default=False, nullable=False)
```

`backend/app/models/service_card.py` — junto das colunas do card (depois de `due_date`):

```python
    # Quando o time foi avisado de que o card chegou. Nulo = ainda não avisado.
    avisado_em = Column(DateTime, nullable=True)
```

(conferir que `DateTime` está no `from sqlalchemy import ...` do arquivo; se não, acrescentar).

- [ ] **Step 6: Migration**

`backend/alembic/versions/2026_10_14_1000-e9f0a1b2c3d4_notificacoes.py`:

```python
"""notificacoes: preferencias de verdade, lead do site e controle de repeticao

Revision ID: e9f0a1b2c3d4
Revises: d8e9f0a1b2c3
Create Date: 2026-10-14 10:00:00

- notifications.referencia: a que o aviso se refere (o agendador confere
  antes de criar e nunca repete).
- user_notification_settings: entram reuniao_pronta, resumo_manha,
  reuniao_15min, popup_navegador e quadros_servico; saem card_moved,
  achievement_unlocked e task_due_soon (avisos que nao existem mais).
- cards.created_by_id e users.is_integracao: reconhecer o lead do site.
- service_cards.avisado_em: card de Servico ja avisado ao time. Os que ja
  existem nascem marcados, senao o primeiro ciclo avisaria 1.300 cards.
- Todas as notificacoes existentes viram lidas: o sino recomeca limpo.
"""
from alembic import op
import sqlalchemy as sa


revision = 'e9f0a1b2c3d4'
down_revision = 'd8e9f0a1b2c3'
branch_labels = None
depends_on = None

INTEGRACOES = ('integracao@healthsafetytech.com', 'gestorhs.integracao@healthsafetytech.com')


def upgrade():
    op.add_column('notifications', sa.Column(
        'referencia', sa.String(120), nullable=True,
        comment='A que o aviso se refere; evita repetir lembrete'))
    op.create_index('ix_notifications_dedupe', 'notifications',
                    ['user_id', 'notification_type', 'referencia'])

    for coluna in ('reuniao_pronta', 'resumo_manha', 'reuniao_15min', 'popup_navegador'):
        op.add_column('user_notification_settings', sa.Column(
            coluna, sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column('user_notification_settings', sa.Column(
        'quadros_servico', sa.JSON(), nullable=True,
        comment='Boards de Servico acompanhados; nulo = calcular pelo historico'))
    for coluna in ('card_moved', 'achievement_unlocked', 'task_due_soon'):
        op.drop_column('user_notification_settings', coluna)

    op.add_column('cards', sa.Column(
        'created_by_id', sa.Integer(),
        sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True,
        comment='Quem criou o card'))
    op.create_index('ix_cards_created_by_id', 'cards', ['created_by_id'])

    op.add_column('users', sa.Column(
        'is_integracao', sa.Boolean(), nullable=False, server_default=sa.false(),
        comment='Usuario tecnico de integracao'))
    op.execute(
        "UPDATE users SET is_integracao = true WHERE email IN ('%s', '%s')" % INTEGRACOES
    )

    op.add_column('service_cards', sa.Column(
        'avisado_em', sa.DateTime(), nullable=True,
        comment='Quando o time foi avisado do card novo'))
    op.execute("UPDATE service_cards SET avisado_em = now()")

    op.execute("UPDATE notifications SET is_read = true, read_at = now() WHERE is_read = false")


def downgrade():
    op.drop_column('service_cards', 'avisado_em')
    op.drop_column('users', 'is_integracao')
    op.drop_index('ix_cards_created_by_id', table_name='cards')
    op.drop_column('cards', 'created_by_id')
    for coluna in ('card_moved', 'achievement_unlocked', 'task_due_soon'):
        op.add_column('user_notification_settings', sa.Column(
            coluna, sa.Boolean(), nullable=False, server_default=sa.true()))
    op.drop_column('user_notification_settings', 'quadros_servico')
    for coluna in ('reuniao_pronta', 'resumo_manha', 'reuniao_15min', 'popup_navegador'):
        op.drop_column('user_notification_settings', coluna)
    op.drop_index('ix_notifications_dedupe', table_name='notifications')
    op.drop_column('notifications', 'referencia')
```

- [ ] **Step 7: Rodar e ver passar**

Run: `... python -m pytest tests/unit/test_notificacoes_modelos.py -q -p no:cacheprovider --color=no`
Expected: `5 passed`

Conferir que o Alembic enxerga um head só:
Run: `MSYS_NO_PATHCONV=1 docker exec hsgrowth-api-local alembic heads`
Expected: `e9f0a1b2c3d4 (head)` — **não** rodar `upgrade`.

- [ ] **Step 8: Commit** (perguntar ao usuário antes — regra do projeto)

```bash
git add backend/alembic/versions/2026_10_14_1000-e9f0a1b2c3d4_notificacoes.py backend/app/models/notification.py backend/app/models/user_notification_setting.py backend/app/models/card.py backend/app/models/user.py backend/app/models/service_card.py backend/tests/unit/apoio_notificacoes.py backend/tests/unit/test_notificacoes_modelos.py
git commit -m "feat(notificacoes): colunas de preferencia, lead do site e controle de repeticao"
```

---

### Task 2: Catálogo dos tipos de aviso

**Files:**
- Create: `backend/app/services/notificacoes/__init__.py`, `backend/app/services/notificacoes/tipos.py`
- Test: `backend/tests/unit/test_notificacoes_tipos.py`

- [ ] **Step 1: Teste que falha**

`backend/tests/unit/test_notificacoes_tipos.py`:

```python
"""O catálogo é a fonte única: notificar() e a tela de Configurações leem dele."""
from app.models.user_notification_setting import UserNotificationSetting
from app.services.notificacoes.tipos import TIPOS, tipo_por_id


def test_ids_unicos():
    ids = [t.id for t in TIPOS]
    assert len(ids) == len(set(ids))


def test_obrigatorios_visiveis_sao_lead_e_card_atribuido():
    """Decisão de 14/10: os dois que deixam o cliente esperando se ignorados."""
    assert {t.id for t in TIPOS if t.obrigatorio and t.visivel} == {"lead_site", "card_atribuido"}


def test_obrigatorio_nao_tem_coluna_de_preferencia():
    assert all(t.coluna is None for t in TIPOS if t.obrigatorio)


def test_toda_coluna_existe_no_modelo():
    for t in TIPOS:
        if t.coluna:
            assert hasattr(UserNotificationSetting, t.coluna), t.id


def test_tipo_desconhecido():
    assert tipo_por_id("card_overdue") is None
    assert tipo_por_id("lead_site").rotulo == "Novo lead do site"
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `... pytest tests/unit/test_notificacoes_tipos.py ...`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.services.notificacoes'`

- [ ] **Step 3: Implementar**

`backend/app/services/notificacoes/__init__.py`:

```python
"""Notificações do CRM: um catálogo, um caminho de envio, lembretes do agendador."""
```

`backend/app/services/notificacoes/tipos.py`:

```python
"""
Os tipos de aviso do CRM.

Fonte única: `notificar()` decide por aqui e a tela de Configurações é montada
daqui. Até 14/10/2026 a tela oferecia avisos que nunca existiram (e-mail,
badge, transferência) e salvava num console.log.

- `obrigatorio`: não dá para desligar e não tem coluna de preferência.
- `coluna`: a preferência em `user_notification_settings`. Sem coluna e sem
  ser obrigatório, quem chama decide os destinatários (card novo de Serviço
  vai para quem acompanha o board).
- `visivel`: aparece em Configurações.
"""
from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class TipoDeAviso:
    id: str
    rotulo: str
    descricao: str
    icone: str
    cor: str
    obrigatorio: bool = False
    coluna: Optional[str] = None
    visivel: bool = True


TIPOS = (
    TipoDeAviso("lead_site", "Novo lead do site",
                "Quando um lead chega pelo site e é distribuído para você",
                "target", "success", obrigatorio=True),
    TipoDeAviso("card_atribuido", "Card atribuído a mim",
                "Quando outra pessoa, ou a distribuição automática, coloca você no card",
                "user-check", "info", obrigatorio=True),
    TipoDeAviso("tarefa_para_mim", "Tarefa criada para mim",
                "Quando outra pessoa cria ou passa uma tarefa para você",
                "check-square", "info", coluna="task_assigned"),
    TipoDeAviso("produto_no_card", "Produto no meu card",
                "Quando outra pessoa adiciona ou remove produto de um card seu",
                "package", "info", coluna="card_product_changed"),
    TipoDeAviso("reuniao_pronta", "Gravação e análise da reunião",
                "Quando a gravação ou a análise de uma reunião sua fica pronta",
                "video", "info", coluna="reuniao_pronta"),
    TipoDeAviso("resumo_manha", "Resumo da manhã",
                "Às 8h, de segunda a sexta: o que você tem para hoje e o que está atrasado",
                "sun", "info", coluna="resumo_manha"),
    TipoDeAviso("reuniao_15min", "Reunião em 15 minutos",
                "Aviso 15 minutos antes de cada reunião sua",
                "alarm-clock", "warning", coluna="reuniao_15min"),
    TipoDeAviso("card_novo_servico", "Card novo no board",
                "Quando chega card novo nos boards de Serviço que você acompanha",
                "inbox", "info"),
    TipoDeAviso("reuniao_falha", "Falha na gravação da reunião",
                "Quando a gravação de uma reunião não pôde ser processada",
                "alert-triangle", "danger", obrigatorio=True, visivel=False),
    TipoDeAviso("automacao", "Aviso de automação",
                "Enviado por uma automação configurada no board",
                "zap", "info", obrigatorio=True, visivel=False),
)

_POR_ID = {t.id: t for t in TIPOS}


def tipo_por_id(tipo_id: Optional[str]) -> Optional[TipoDeAviso]:
    return _POR_ID.get(tipo_id)
```

- [ ] **Step 4: Rodar e ver passar** — Expected: `5 passed`

- [ ] **Step 5: Commit** (perguntar antes)

```bash
git add backend/app/services/notificacoes/__init__.py backend/app/services/notificacoes/tipos.py backend/tests/unit/test_notificacoes_tipos.py
git commit -m "feat(notificacoes): catalogo unico dos tipos de aviso"
```

---

### Task 3: `notificar()` — o único caminho

**Files:**
- Create: `backend/app/services/notificacoes/enviar.py`
- Test: `backend/tests/unit/test_notificacoes_enviar.py`

- [ ] **Step 1: Teste que falha**

`backend/tests/unit/test_notificacoes_enviar.py`:

```python
"""
As regras de quem recebe, em ordem: própria ação, inativo, obrigatório,
preferência, já enviado.

A primeira é a que mais pesa: em 30 dias, dos "Card atribuído" rastreáveis,
81 eram a pessoa sendo avisada do que ela mesma tinha feito e 4 vinham de
outra pessoa.
"""
import pytest

from app.models.user_notification_setting import UserNotificationSetting
from app.services.notificacoes.enviar import notificar
from tests.unit.apoio_notificacoes import avisos


def _enviar(db, destinatario, tipo="tarefa_para_mim", **kw):
    return notificar(db, destinatario.id, tipo, "Título", "Mensagem", **kw)


def test_avisa_e_grava_o_link_e_o_estilo_do_catalogo(db, test_salesperson_user):
    n = _enviar(db, test_salesperson_user, link="/cards/7", metadata={"card_id": 7})

    assert n is not None
    assert n.notification_type == "tarefa_para_mim"
    assert n.notification_metadata == {"card_id": 7, "url": "/cards/7"}
    assert n.icon == "check-square"


def test_nao_avisa_a_propria_acao(db, test_salesperson_user):
    assert _enviar(db, test_salesperson_user, autor_id=test_salesperson_user.id) is None
    assert avisos(db, test_salesperson_user.id) == []


def test_nao_avisa_nem_obrigatorio_da_propria_acao(db, test_salesperson_user):
    """Obrigatório quer dizer 'não dá para desligar', não 'avisa até de si mesmo'."""
    assert _enviar(db, test_salesperson_user, "card_atribuido",
                   autor_id=test_salesperson_user.id) is None


def test_nao_avisa_inativo(db, test_salesperson_user):
    test_salesperson_user.is_active = False
    db.commit()

    assert _enviar(db, test_salesperson_user) is None


def test_preferencia_desligada_nao_avisa(db, test_salesperson_user):
    db.add(UserNotificationSetting(user_id=test_salesperson_user.id, task_assigned=False))
    db.commit()

    assert _enviar(db, test_salesperson_user) is None


def test_obrigatorio_passa_mesmo_sem_preferencia(db, test_salesperson_user):
    db.add(UserNotificationSetting(user_id=test_salesperson_user.id, task_assigned=False))
    db.commit()

    assert _enviar(db, test_salesperson_user, "lead_site") is not None


def test_sem_linha_de_preferencia_vale_ligado(db, test_salesperson_user):
    assert _enviar(db, test_salesperson_user) is not None


def test_mesma_referencia_nao_repete(db, test_salesperson_user):
    assert _enviar(db, test_salesperson_user, "resumo_manha", referencia="resumo:2026-10-15")
    assert _enviar(db, test_salesperson_user, "resumo_manha", referencia="resumo:2026-10-15") is None
    assert _enviar(db, test_salesperson_user, "resumo_manha", referencia="resumo:2026-10-16")
    assert len(avisos(db, test_salesperson_user.id)) == 2


def test_tipo_fora_do_catalogo_e_erro_de_programacao(db, test_salesperson_user):
    with pytest.raises(ValueError):
        _enviar(db, test_salesperson_user, "card_overdue")


def test_sem_destinatario_nao_faz_nada(db):
    assert notificar(db, None, "tarefa_para_mim", "t", "m") is None
```

- [ ] **Step 2: Rodar e ver falhar** — Expected: `ModuleNotFoundError ... enviar`

- [ ] **Step 3: Implementar**

`backend/app/services/notificacoes/enviar.py`:

```python
"""
O único caminho para criar notificação.

Até 14/10/2026 cada serviço gravava direto no banco, e cada um esquecia uma
regra diferente: o "Card atribuído" avisava a pessoa da própria ação, e
nenhum consultava as preferências. Aqui as regras moram num lugar só.
"""
from typing import Optional

from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.models.user import User
from app.models.user_notification_setting import UserNotificationSetting
from app.services.notificacoes.tipos import tipo_por_id


def notificar(
    db: Session,
    destinatario_id: Optional[int],
    tipo: str,
    titulo: str,
    mensagem: str,
    link: Optional[str] = None,
    metadata: Optional[dict] = None,
    autor_id: Optional[int] = None,
    referencia: Optional[str] = None,
) -> Optional[Notification]:
    """
    Cria o aviso se as regras deixarem, nesta ordem:

    1. quem fez a ação é o próprio destinatário → não avisa;
    2. destinatário inativo ou excluído → não avisa;
    3. tipo obrigatório → avisa;
    4. preferência do tipo desligada → não avisa;
    5. já existe aviso desse tipo com a mesma `referencia` → não avisa.

    Nunca levanta por falha de banco: quem chama está no meio de uma ação que
    já deu certo (criar card, salvar tarefa) e não pode perdê-la por causa do
    aviso. Tipo fora do catálogo levanta — é erro de programação.

    Returns:
        A notificação criada, ou None quando não avisou.
    """
    info = tipo_por_id(tipo)
    if info is None:
        raise ValueError(f"Tipo de aviso fora do catálogo: {tipo}")

    if not destinatario_id:
        return None
    if autor_id is not None and autor_id == destinatario_id:
        return None

    try:
        destinatario = db.query(User).filter(User.id == destinatario_id).first()
        if not destinatario or not destinatario.is_active or destinatario.is_deleted:
            return None

        if not info.obrigatorio and info.coluna:
            preferencia = (
                db.query(UserNotificationSetting)
                .filter(UserNotificationSetting.user_id == destinatario_id)
                .first()
            )
            if preferencia is not None and not getattr(preferencia, info.coluna):
                return None

        if referencia and (
            db.query(Notification.id)
            .filter(
                Notification.user_id == destinatario_id,
                Notification.notification_type == tipo,
                Notification.referencia == referencia,
            )
            .first()
        ):
            return None

        dados = dict(metadata or {})
        if link:
            dados["url"] = link

        aviso = Notification(
            user_id=destinatario_id,
            notification_type=tipo,
            title=titulo[:255],
            message=mensagem,
            icon=info.icone,
            color=info.cor,
            notification_metadata=dados,
            referencia=referencia,
        )
        db.add(aviso)
        db.commit()
        db.refresh(aviso)
        return aviso
    except Exception as e:
        db.rollback()
        print(f"[NOTIFICACAO] Falha ao avisar usuário {destinatario_id} ({tipo}): {e}")
        return None
```

- [ ] **Step 4: Rodar e ver passar** — Expected: `10 passed`

- [ ] **Step 5: Commit** (perguntar antes)

```bash
git add backend/app/services/notificacoes/enviar.py backend/tests/unit/test_notificacoes_enviar.py
git commit -m "feat(notificacoes): notificar() aplica as regras num lugar so"
```

---

### Task 4: Preferências — padrão pelo histórico e API

**Files:**
- Modify: `backend/app/schemas/user_notification_setting.py` (arquivo inteiro), `backend/app/services/user_notification_service.py:18-42`, `backend/app/api/v1/endpoints/users.py:777-880` (só as descrições e exemplos)
- Test: `backend/tests/unit/test_notificacoes_preferencias.py`

- [ ] **Step 1: Teste que falha**

`backend/tests/unit/test_notificacoes_preferencias.py`:

```python
"""
Preferências de notificação valendo de verdade.

Os boards de Serviço acompanhados começam pelo que a pessoa já trabalha: com
os dados de 14/10/2026 isso dá André → Cobrança, Ellen → Serviços, Letícia →
os dois, sem nenhum nome no código.
"""
from datetime import datetime, timedelta

from app.models.service_card import ServiceCard
from app.models.service_card_activity import ServiceCardActivity
from app.services.user_notification_service import UserNotificationService
from tests.unit.apoio_notificacoes import boards_de_servico, cabecalho, usuario

URL = "/api/v1/users/me/notification-settings"


def _atividade(db, quem, lista, dias_atras=1):
    card = ServiceCard(list_id=lista.id, title=f"Card {quem.name}")
    db.add(card)
    db.commit()
    db.add(ServiceCardActivity(
        service_card_id=card.id, user_id=quem.id, category="atividade",
        activity_type="follow_up", created_at=datetime.utcnow() - timedelta(days=dias_atras),
    ))
    db.commit()


class TestQuadrosPadrao:

    def test_segue_o_board_onde_trabalhou(self, db):
        b = boards_de_servico(db)
        andre = usuario(db, "Andre", "service")
        _atividade(db, andre, b.lista_cobranca)

        assert UserNotificationService(db).get_or_create(andre.id).quadros_servico == [b.cobranca.id]

    def test_trabalhou_nos_dois(self, db):
        b = boards_de_servico(db)
        leticia = usuario(db, "Leticia", "service")
        _atividade(db, leticia, b.lista_cobranca)
        _atividade(db, leticia, b.lista_servicos)

        assert sorted(UserNotificationService(db).get_or_create(leticia.id).quadros_servico) == sorted(
            [b.servicos.id, b.cobranca.id])

    def test_atividade_antiga_nao_conta(self, db):
        b = boards_de_servico(db)
        andre = usuario(db, "Andre", "service")
        _atividade(db, andre, b.lista_cobranca, dias_atras=90)

        # sem histórico recente, Serviço acompanha os dois
        assert len(UserNotificationService(db).get_or_create(andre.id).quadros_servico) == 2

    def test_vendedor_sem_historico_nao_acompanha_nada(self, db, test_salesperson_user):
        boards_de_servico(db)

        assert UserNotificationService(db).get_or_create(test_salesperson_user.id).quadros_servico == []


class TestApi:

    def test_le_os_campos_novos(self, client, salesperson_headers):
        corpo = client.get(URL, headers=salesperson_headers).json()

        for campo in ("task_assigned", "card_product_changed", "reuniao_pronta",
                      "resumo_manha", "reuniao_15min", "popup_navegador", "quadros_servico"):
            assert campo in corpo
        assert "card_moved" not in corpo

    def test_desliga_um_aviso(self, client, salesperson_headers):
        r = client.put(URL, json={"resumo_manha": False}, headers=salesperson_headers)

        assert r.status_code == 200
        assert r.json()["resumo_manha"] is False
        assert client.get(URL, headers=salesperson_headers).json()["resumo_manha"] is False

    def test_obrigatorio_nao_desliga_nem_pela_api(self, client, salesperson_headers):
        for campo in ("lead_site", "card_atribuido"):
            r = client.put(URL, json={campo: False}, headers=salesperson_headers)
            assert r.status_code == 422, campo

    def test_escolhe_os_boards(self, client, db):
        b = boards_de_servico(db)
        ellen = usuario(db, "Ellen", "service")

        r = client.put(URL, json={"quadros_servico": [b.servicos.id]}, headers=cabecalho(ellen))

        assert r.status_code == 200
        assert r.json()["quadros_servico"] == [b.servicos.id]
```

- [ ] **Step 2: Rodar e ver falhar** — Expected: falhas em `quadros_servico` (None) e nos campos novos ausentes.

- [ ] **Step 3: Schemas**

Substituir `backend/app/schemas/user_notification_setting.py` inteiro por:

```python
"""
Schemas das preferências de notificação.

Os avisos obrigatórios (lead do site, card atribuído) não aparecem aqui: não
há como desligá-los. O `extra="forbid"` faz a API recusar quem tentar.
"""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class UserNotificationSettingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    task_assigned: bool = Field(description="Tarefa criada por outra pessoa para mim")
    card_product_changed: bool = Field(description="Produto adicionado/removido no meu card")
    reuniao_pronta: bool = Field(description="Gravação e análise da reunião prontas")
    resumo_manha: bool = Field(description="Resumo das 8h, seg a sex")
    reuniao_15min: bool = Field(description="Aviso 15 minutos antes de reunião")
    popup_navegador: bool = Field(description="Pop-up do navegador além do sino")
    quadros_servico: List[int] = Field(default_factory=list, description="Boards de Serviço acompanhados")
    created_at: datetime
    updated_at: datetime


class UserNotificationSettingUpdate(BaseModel):
    """Só os campos enviados mudam. Campo desconhecido (inclusive obrigatório) → 422."""

    model_config = ConfigDict(extra="forbid")

    task_assigned: Optional[bool] = None
    card_product_changed: Optional[bool] = None
    reuniao_pronta: Optional[bool] = None
    resumo_manha: Optional[bool] = None
    reuniao_15min: Optional[bool] = None
    popup_navegador: Optional[bool] = None
    quadros_servico: Optional[List[int]] = None
```

- [ ] **Step 4: Padrão pelo histórico**

Em `backend/app/services/user_notification_service.py`, acrescentar os imports no topo:

```python
from datetime import datetime, timedelta

from app.models.role import Role
from app.models.service_board import ServiceBoard
from app.models.service_card import ServiceCard
from app.models.service_card_activity import ServiceCardActivity
from app.models.service_list import ServiceList
from app.models.user import User

# Janela do histórico que define os boards acompanhados por padrão
DIAS_DE_HISTORICO = 60
```

Acrescentar a função antes da classe:

```python
def quadros_padrao(db: Session, user_id: int) -> list:
    """
    Boards de Serviço onde a pessoa registrou atividade ou anotação nos
    últimos 60 dias. Sem histórico: quem é de Serviço acompanha todos; os
    demais, nenhum.
    """
    desde = datetime.utcnow() - timedelta(days=DIAS_DE_HISTORICO)
    ids = {
        board_id
        for (board_id,) in (
            db.query(ServiceList.board_id)
            .join(ServiceCard, ServiceCard.list_id == ServiceList.id)
            .join(ServiceCardActivity, ServiceCardActivity.service_card_id == ServiceCard.id)
            .filter(
                ServiceCardActivity.user_id == user_id,
                ServiceCardActivity.category.in_(("atividade", "anotacao")),
                ServiceCardActivity.created_at >= desde,
            )
            .distinct()
        )
    }
    if ids:
        return sorted(ids)

    papel = (
        db.query(Role.name)
        .join(User, User.role_id == Role.id)
        .filter(User.id == user_id)
        .scalar()
    )
    if papel == "service":
        return sorted(
            b.id for b in db.query(ServiceBoard).filter(ServiceBoard.is_deleted == False)  # noqa: E712
        )
    return []
```

No `get_or_create`, trocar o trecho a partir de `if setting is None:` até o `return setting` por:

```python
        if setting is None:
            setting = UserNotificationSetting(user_id=user_id)
            self.db.add(setting)
            self.db.commit()
            self.db.refresh(setting)

        if setting.quadros_servico is None:
            setting.quadros_servico = quadros_padrao(self.db, user_id)
            self.db.commit()
            self.db.refresh(setting)

        return setting
```

- [ ] **Step 5: Documentação da rota**

Em `backend/app/api/v1/endpoints/users.py`, nas duas rotas `/me/notification-settings`, trocar a lista "**Tipos de notificação disponíveis:**" e os exemplos JSON pelos campos novos. Descrição do GET:

```python
    description="""
    Preferências de notificação do usuário logado. Cria com tudo ligado no
    primeiro acesso; os boards de Serviço acompanhados começam pelo histórico.

    Obrigatórios, fora daqui: novo lead do site e card atribuído a mim.

    - `task_assigned`: tarefa criada por outra pessoa para mim
    - `card_product_changed`: produto no meu card
    - `reuniao_pronta`: gravação e análise da reunião
    - `resumo_manha`: resumo das 8h (seg a sex)
    - `reuniao_15min`: aviso 15 min antes de reunião
    - `popup_navegador`: pop-up do navegador além do sino
    - `quadros_servico`: ids dos boards de Serviço acompanhados
    """,
```

Exemplo do `responses` (nos dois): `{"id": 1, "user_id": 1, "task_assigned": True, "card_product_changed": True, "reuniao_pronta": True, "resumo_manha": True, "reuniao_15min": True, "popup_navegador": True, "quadros_servico": [2], "created_at": "2026-10-14T10:00:00", "updated_at": "2026-10-14T10:00:00"}`. Exemplo do PUT na descrição: `{ "resumo_manha": false }`.

- [ ] **Step 6: Rodar e ver passar** — Expected: `8 passed`

- [ ] **Step 7: Commit** (perguntar antes)

```bash
git add backend/app/schemas/user_notification_setting.py backend/app/services/user_notification_service.py backend/app/api/v1/endpoints/users.py backend/tests/unit/test_notificacoes_preferencias.py
git commit -m "feat(notificacoes): preferencias novas, obrigatorios fora da API e boards pelo historico"
```

---

### Task 5: Lead do site e card atribuído

**Files:**
- Create: `backend/app/services/notificacoes/atribuicao.py`
- Test: `backend/tests/unit/test_notificacoes_atribuicao.py`

- [ ] **Step 1: Teste que falha**

`backend/tests/unit/test_notificacoes_atribuicao.py`:

```python
"""
Lead do site sai como aviso próprio, uma vez só.

Os leads do site entram pelo usuário "integracao" e vão justamente para quem
não lia o sino (14/10: Gislayne, Adriana e Eduardo com 0% de leitura). Com o
mesmo título genérico de "Card atribuído", sumiam no meio do resto.
"""
from app.models.card import Card
from app.services.notificacoes.atribuicao import avisar_atribuicao, e_lead_do_site
from tests.unit.apoio_notificacoes import avisos, usuario


def _card(db, lista, criador=None, **kw):
    c = Card(title="Lead RD Station - Marcelo", list_id=lista.id, position=0,
             created_by_id=criador.id if criador else None, **kw)
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


def test_card_da_integracao_e_lead(db, test_lists):
    integ = usuario(db, "integracao", "manager", is_integracao=True)
    assert e_lead_do_site(db, _card(db, test_lists[0], integ)) is True


def test_card_de_pessoa_nao_e_lead(db, test_lists, test_salesperson_user):
    assert e_lead_do_site(db, _card(db, test_lists[0], test_salesperson_user)) is False


def test_card_antigo_sem_criador_nao_e_lead(db, test_lists):
    assert e_lead_do_site(db, _card(db, test_lists[0])) is False


def test_vendedor_do_lead_recebe_lead_site(db, test_lists, test_salesperson_user):
    integ = usuario(db, "integracao", "manager", is_integracao=True)
    card = _card(db, test_lists[0], integ, origin="Contato pelo Site")

    avisar_atribuicao(db, card, test_salesperson_user.id, "vendedor", autor_id=None)

    [aviso] = avisos(db, test_salesperson_user.id)
    assert aviso.notification_type == "lead_site"
    assert aviso.title == "Novo lead do site: Lead RD Station - Marcelo"
    assert "Contato pelo Site" in aviso.message


def test_lead_nao_repete(db, test_lists, test_salesperson_user):
    """Criação e distribuição podem avisar o mesmo vendedor; o lead sai uma vez."""
    integ = usuario(db, "integracao", "manager", is_integracao=True)
    card = _card(db, test_lists[0], integ)

    avisar_atribuicao(db, card, test_salesperson_user.id, "vendedor", autor_id=integ.id)
    avisar_atribuicao(db, card, test_salesperson_user.id, "vendedor", autor_id=None)

    assert len(avisos(db, test_salesperson_user.id)) == 1


def test_card_de_pessoa_sai_como_card_atribuido(db, test_lists, test_salesperson_user, test_manager_user):
    card = _card(db, test_lists[0], test_manager_user)

    avisar_atribuicao(db, card, test_salesperson_user.id, "vendedor", autor_id=test_manager_user.id)

    [aviso] = avisos(db, test_salesperson_user.id)
    assert aviso.notification_type == "card_atribuido"


def test_sdr_recebe_card_atribuido_com_o_papel(db, test_lists, test_sdr_user, test_manager_user):
    card = _card(db, test_lists[0], test_manager_user)

    avisar_atribuicao(db, card, test_sdr_user.id, "sdr", autor_id=test_manager_user.id)

    [aviso] = avisos(db, test_sdr_user.id)
    assert aviso.notification_type == "card_atribuido"
    assert aviso.message.endswith("como SDR")


def test_quem_se_atribui_nao_e_avisado(db, test_lists, test_salesperson_user):
    card = _card(db, test_lists[0], test_salesperson_user)

    avisar_atribuicao(db, card, test_salesperson_user.id, "vendedor", autor_id=test_salesperson_user.id)

    assert avisos(db, test_salesperson_user.id) == []
```

- [ ] **Step 2: Rodar e ver falhar** — Expected: `ModuleNotFoundError ... atribuicao`

- [ ] **Step 3: Implementar**

`backend/app/services/notificacoes/atribuicao.py`:

```python
"""
Aviso de quem foi colocado num card de Vendas.

Lead que chegou sozinho (card criado por usuário de integração) sai como
"Novo lead do site", uma vez só; o resto sai como "Card atribuído a você".
"""
from sqlalchemy.orm import Session

from app.models.card import Card
from app.models.user import User
from app.services.notificacoes.enviar import notificar


def e_lead_do_site(db: Session, card: Card) -> bool:
    """Card criado por usuário de integração. Cards de antes de 14/10/2026 não têm criador."""
    if not card or not card.created_by_id:
        return False
    return bool(
        db.query(User.is_integracao).filter(User.id == card.created_by_id).scalar()
    )


def avisar_atribuicao(db: Session, card: Card, destinatario_id: int, papel: str, autor_id) -> None:
    """
    Args:
        papel: "vendedor" ou "sdr".
        autor_id: quem fez a atribuição; None quando foi o sistema (rodízio).
    """
    if papel == "vendedor" and e_lead_do_site(db, card):
        notificar(
            db, destinatario_id, "lead_site",
            f"Novo lead do site: {card.title}",
            f"Chegou pelo site ({card.origin or 'origem não informada'}) e foi distribuído para você.",
            link=f"/cards/{card.id}",
            metadata={"card_id": card.id, "card_title": card.title},
            autor_id=autor_id,
            referencia=f"lead:{card.id}",
        )
        return

    sufixo = " como SDR" if papel == "sdr" else ""
    notificar(
        db, destinatario_id, "card_atribuido",
        "Card atribuído a você",
        f"O card '{card.title}' foi atribuído a você{sufixo}",
        link=f"/cards/{card.id}",
        metadata={"card_id": card.id, "card_title": card.title},
        autor_id=autor_id,
    )
```

- [ ] **Step 4: Rodar e ver passar** — Expected: `8 passed`

- [ ] **Step 5: Commit** (perguntar antes)

```bash
git add backend/app/services/notificacoes/atribuicao.py backend/tests/unit/test_notificacoes_atribuicao.py
git commit -m "feat(notificacoes): lead do site destacado e card atribuido sem aviso da propria acao"
```

---

### Task 6: Cards de Vendas usam o caminho novo

**Files:**
- Modify: `backend/app/services/card_service.py` (criação ~l.855-920, atualização ~l.1080-1125, `assign_card` ~l.2273-2290)
- Test: `backend/tests/unit/test_notificacoes_cards.py`

- [ ] **Step 1: Teste que falha**

`backend/tests/unit/test_notificacoes_cards.py`:

```python
"""Os três lugares que atribuem card de Vendas: criação, edição e /assign."""
from app.models.card import Card
from tests.unit.apoio_notificacoes import avisos, cabecalho, usuario


def test_card_guarda_quem_criou(client, db, admin_headers, test_lists, test_admin_user):
    r = client.post("/api/v1/cards", headers=admin_headers,
                    json={"title": "Novo", "list_id": test_lists[0].id})

    assert r.status_code == 201
    assert db.query(Card).filter(Card.id == r.json()["id"]).one().created_by_id == test_admin_user.id


def test_vendedor_criando_o_proprio_card_nao_e_avisado(client, db, salesperson_headers, test_lists, test_salesperson_user):
    client.post("/api/v1/cards", headers=salesperson_headers,
                json={"title": "Meu card", "list_id": test_lists[0].id})

    assert avisos(db, test_salesperson_user.id) == []


def test_admin_criando_para_o_vendedor_avisa(client, db, admin_headers, test_lists, test_salesperson_user):
    client.post("/api/v1/cards", headers=admin_headers,
                json={"title": "Para a Sandra", "list_id": test_lists[0].id,
                      "assigned_to_id": test_salesperson_user.id})

    [aviso] = avisos(db, test_salesperson_user.id)
    assert aviso.notification_type == "card_atribuido"


def test_integracao_criando_lead_avisa_como_lead(client, db, test_lists, test_salesperson_user):
    integ = usuario(db, "integracao", "manager", is_integracao=True)

    r = client.post("/api/v1/cards", headers=cabecalho(integ),
                    json={"title": "Lead do site", "list_id": test_lists[0].id,
                          "assigned_to_id": test_salesperson_user.id,
                          "origin": "Contato pelo Site"})

    assert db.query(Card).filter(Card.id == r.json()["id"]).one().created_by_id == integ.id
    [aviso] = avisos(db, test_salesperson_user.id)
    assert aviso.notification_type == "lead_site"


def test_assign_por_outra_pessoa_avisa(client, db, manager_headers, test_card, test_sdr_user, test_salesperson_user):
    client.put(f"/api/v1/cards/{test_card.id}/assign", headers=manager_headers,
               json={"assigned_to_id": test_sdr_user.id})

    [aviso] = avisos(db, test_sdr_user.id)
    assert aviso.notification_type == "card_atribuido"


def test_assign_para_si_mesmo_nao_avisa(client, db, manager_headers, test_card, test_manager_user):
    client.put(f"/api/v1/cards/{test_card.id}/assign", headers=manager_headers,
               json={"assigned_to_id": test_manager_user.id})

    assert avisos(db, test_manager_user.id) == []
```

- [ ] **Step 2: Rodar e ver falhar**

Expected: `test_integracao_criando_lead_avisa_como_lead` falha (`created_by_id` None / tipo `card_assigned`), `test_assign_para_si_mesmo_nao_avisa` falha (avisa hoje), `test_admin_criando_para_o_vendedor_avisa` falha (tipo `card_assigned`).

- [ ] **Step 3: Criação** — em `create_card`, logo depois do bloco que preenche `prospection_entry_date`/`acquisition_entry_date`/`expansion_entry_date` e **antes** do `self.db.commit()`:

```python
        # Quem criou: usuário de integração = lead que chegou sozinho
        card.created_by_id = current_user.id
```

E trocar os dois blocos `# Notifica responsável e SDR se já vieram definidos na criação do card` (o `if card.assigned_to_id:` com `notification_repository.create` e o `if card.sdr_id:` seguinte) por:

```python
        # Avisa vendedor e SDR definidos na criação. Lead do site sai como
        # "Novo lead do site"; quem se colocou no próprio card não é avisado.
        from app.services.notificacoes.atribuicao import avisar_atribuicao

        if card.assigned_to_id:
            avisar_atribuicao(self.db, card, card.assigned_to_id, "vendedor", autor_id=current_user.id)
        if card.sdr_id:
            avisar_atribuicao(self.db, card, card.sdr_id, "sdr", autor_id=current_user.id)
```

- [ ] **Step 4: Edição** — em `update_card`, trocar os dois blocos `# Envia notificação ao novo responsável se o vendedor foi alterado` e `# Envia notificação ao novo SDR se o sdr_id foi alterado` (cada `try:` com `notification_repository.create` dentro do `if`) por:

```python
        from app.services.notificacoes.atribuicao import avisar_atribuicao

        if (
            "assigned_to_id" in update_data_fields
            and old_assigned_to_id != updated_card.assigned_to_id
            and updated_card.assigned_to_id is not None
        ):
            avisar_atribuicao(self.db, updated_card, updated_card.assigned_to_id, "vendedor",
                              autor_id=current_user.id)

        if (
            "sdr_id" in update_data_fields
            and old_sdr_id != updated_card.sdr_id
            and updated_card.sdr_id is not None
        ):
            avisar_atribuicao(self.db, updated_card, updated_card.sdr_id, "sdr",
                              autor_id=current_user.id)
```

- [ ] **Step 5: `/assign`** — em `assign_card`, trocar o bloco `# Notifica o novo responsável` (o `try:` com `notification_repository.create` e o `except` dele) por:

```python
            # Notifica o novo responsável (não quando foi ele mesmo)
            from app.services.notificacoes.atribuicao import avisar_atribuicao

            avisar_atribuicao(self.db, assigned_card, user_id, "vendedor", autor_id=current_user.id)
```

- [ ] **Step 6: Conferir que não sobrou gravação direta**

Run: `grep -n "card_assigned" backend/app/services/card_service.py`
Expected: nenhuma linha com `"notification_type": "card_assigned"` (sobram só `card_assigned_changed`, que é histórico de atividade).

- [ ] **Step 7: Rodar e ver passar**

Run: `... pytest tests/unit/test_notificacoes_cards.py tests/unit/test_cards.py ...`
Expected: tudo passa.

- [ ] **Step 8: Commit** (perguntar antes)

```bash
git add backend/app/services/card_service.py backend/tests/unit/test_notificacoes_cards.py
git commit -m "feat(notificacoes): cards de Vendas guardam quem criou e avisam pelo caminho novo"
```

---

### Task 7: Automações (rodízio, atribuir, enviar notificação)

**Files:**
- Modify: `backend/app/services/automation_service.py` (~l.610-635, ~l.771-790, ~l.896-915, ~l.969-1005)
- Test: `backend/tests/unit/test_notificacoes_automacao.py`

- [ ] **Step 1: Teste que falha**

`backend/tests/unit/test_notificacoes_automacao.py`:

```python
"""
O rodízio é quem distribui os leads do site. Até 14/10 ele avisava com o
título genérico; agora o lead sai como lead.
"""
from app.models.automation import Automation
from app.models.card import Card
from app.services.automation_service import AutomationService
from tests.unit.apoio_notificacoes import avisos, usuario


def _rodizio(db, board, vendedor):
    a = Automation(board_id=board.id, name="Rodízio", automation_type="trigger",
                   actions=[{"type": "assign_round_robin", "params": {"user_ids": [vendedor.id]}}],
                   state={})
    db.add(a)
    db.commit()
    return a


def test_rodizio_de_lead_do_site_avisa_como_lead(db, test_board, test_lists, test_salesperson_user):
    integ = usuario(db, "integracao", "manager", is_integracao=True)
    card = Card(title="Lead site", list_id=test_lists[0].id, position=0, created_by_id=integ.id)
    db.add(card)
    db.commit()

    AutomationService(db)._assign_round_robin(_rodizio(db, test_board, test_salesperson_user), card)

    [aviso] = avisos(db, test_salesperson_user.id)
    assert aviso.notification_type == "lead_site"


def test_rodizio_de_card_comum_avisa_como_card_atribuido(db, test_board, test_lists, test_salesperson_user, test_manager_user):
    card = Card(title="Card", list_id=test_lists[0].id, position=0, created_by_id=test_manager_user.id)
    db.add(card)
    db.commit()

    AutomationService(db)._assign_round_robin(_rodizio(db, test_board, test_salesperson_user), card)

    [aviso] = avisos(db, test_salesperson_user.id)
    assert aviso.notification_type == "card_atribuido"


def test_acao_enviar_notificacao_usa_o_tipo_automacao(db, test_card, test_salesperson_user):
    AutomationService(db)._send_notification_action(
        test_card, {"user_ids": [test_salesperson_user.id], "title": "Olhe isto", "message": "m"})

    [aviso] = avisos(db, test_salesperson_user.id)
    assert aviso.notification_type == "automacao"
    assert aviso.title == "Olhe isto"
```

- [ ] **Step 2: Rodar e ver falhar** — Expected: tipos `card_assigned` e `automation` em vez dos novos.

- [ ] **Step 3: Ação `assign_card`** — trocar o bloco `# Notifica o novo responsável se a atribuição realmente mudou` (o `if old_assigned_id != user_id:` com o `try`/`except` dentro) por:

```python
                    # Notifica o novo responsável se a atribuição realmente mudou
                    if old_assigned_id != user_id:
                        from app.services.notificacoes.atribuicao import avisar_atribuicao

                        avisar_atribuicao(self.db, card, user_id, "vendedor", autor_id=None)
```

- [ ] **Step 4: Rodízio de vendedor** — trocar o bloco `# Notifica o vendedor atribuído pelo rodízio` (o `try`/`except` com `notification_repo.create`) por:

```python
        # Notifica o vendedor atribuído pelo rodízio (lead do site sai como lead)
        from app.services.notificacoes.atribuicao import avisar_atribuicao

        avisar_atribuicao(self.db, card, next_user.id, "vendedor", autor_id=None)
```

- [ ] **Step 5: Rodízio de SDR** — trocar o bloco `# Notifica o SDR atribuído pelo rodízio` por:

```python
        # Notifica o SDR atribuído pelo rodízio
        from app.services.notificacoes.atribuicao import avisar_atribuicao

        avisar_atribuicao(self.db, card, next_sdr.id, "sdr", autor_id=None)
```

- [ ] **Step 6: Ação `send_notification`** — em `_send_notification_action`, apagar as linhas `from app.repositories.notification_repository import NotificationRepository` e `notification_repo = NotificationRepository(self.db)`, e trocar o laço `for user_id in user_ids:` inteiro por:

```python
        from app.services.notificacoes.enviar import notificar

        for user_id in user_ids:
            notificar(
                self.db, user_id, "automacao", title, message,
                link=f"/cards/{card.id}" if card else None,
                metadata={"card_id": card.id if card else None},
            )
```

- [ ] **Step 7: Conferir**

Run: `grep -n "notification_repo.create\|\"card_assigned\"" backend/app/services/automation_service.py`
Expected: nenhuma linha.

- [ ] **Step 8: Rodar e ver passar** — Expected: `3 passed`

- [ ] **Step 9: Commit** (perguntar antes)

```bash
git add backend/app/services/automation_service.py backend/tests/unit/test_notificacoes_automacao.py
git commit -m "feat(notificacoes): rodizio avisa lead do site como lead; automacoes pelo caminho novo"
```

---

### Task 8: Tarefa, produto, reunião; fim dos avisos mortos

**Files:**
- Modify: `backend/app/services/card_task_service.py` (~l.187-205 e ~l.285-305), `backend/app/services/product_service.py` (~l.210-230 e ~l.322-342), `backend/app/services/recording_service.py:69-114`, `backend/app/services/gamification_service.py:55-78`, `backend/app/api/v1/endpoints/cards.py` (~l.1409-1427)
- Test: `backend/tests/unit/test_notificacoes_emissores.py`

- [ ] **Step 1: Teste que falha**

`backend/tests/unit/test_notificacoes_emissores.py`:

```python
"""Os outros avisos que já existiam passam a usar os tipos novos e as preferências."""
from datetime import datetime

from app.models.card_task import CardTask
from app.models.user_notification_setting import UserNotificationSetting
from app.services.recording_service import _notificar
from tests.unit.apoio_notificacoes import avisos


def test_tarefa_criada_por_outra_pessoa(client, db, manager_headers, test_card, test_salesperson_user):
    client.post("/api/v1/card-tasks", headers=manager_headers, json={
        "card_id": test_card.id, "title": "Ligar", "task_type": "call",
        "assigned_to_id": test_salesperson_user.id, "due_date": "2026-10-20T13:00:00",
    })

    [aviso] = avisos(db, test_salesperson_user.id)
    assert aviso.notification_type == "tarefa_para_mim"


def test_tarefa_respeita_a_preferencia(client, db, manager_headers, test_card, test_salesperson_user):
    db.add(UserNotificationSetting(user_id=test_salesperson_user.id, task_assigned=False))
    db.commit()

    client.post("/api/v1/card-tasks", headers=manager_headers, json={
        "card_id": test_card.id, "title": "Ligar", "task_type": "call",
        "assigned_to_id": test_salesperson_user.id, "due_date": "2026-10-20T13:00:00",
    })

    assert avisos(db, test_salesperson_user.id) == []


def test_reuniao_pronta_e_falha(db, test_card, test_salesperson_user):
    task = CardTask(card_id=test_card.id, title="Apresentação", task_type="meeting",
                    assigned_to_id=test_salesperson_user.id, due_date=datetime(2026, 10, 20, 13))
    db.add(task)
    db.commit()

    _notificar(db, [test_salesperson_user.id], "Gravacao disponivel", "m", task)
    _notificar(db, [test_salesperson_user.id], "Falha", "m", task, tipo="reuniao_falha")

    tipos = [a.notification_type for a in avisos(db, test_salesperson_user.id)]
    assert tipos == ["reuniao_pronta", "reuniao_falha"]
```

Antes de rodar, conferir no endpoint de tarefas o caminho e os campos obrigatórios:
Run: `grep -n "@router.post" -A3 backend/app/api/v1/endpoints/card_tasks.py | head -8`
Se a rota de criação não for `POST /api/v1/card-tasks` ou exigir outro campo, ajustar só o `json=` dos dois testes.

- [ ] **Step 2: Rodar e ver falhar** — Expected: tipos `task_assigned`/`meeting_recording`; `_notificar` sem parâmetro `tipo`.

- [ ] **Step 3: Tarefas** — em `card_task_service.py`, trocar os dois blocos `self.notification_repo.create({... "notification_type": "task_assigned" ...})` (na criação e na edição, cada um dentro do seu `try`) por, respectivamente:

Criação:
```python
        # Notifica o responsável (não quando foi ele mesmo que criou)
        if task.assigned_to_id:
            from app.services.notificacoes.enviar import notificar

            notificar(
                self.db, task.assigned_to_id, "tarefa_para_mim",
                "Nova tarefa atribuída a você",
                f"{current_user.name} atribuiu a você: \"{task.title}\"",
                link=f"/cards/{task.card_id}",
                metadata={"task_id": task.id, "card_id": task.card_id,
                          "assigned_by_id": current_user.id, "assigned_by_name": current_user.name},
                autor_id=current_user.id,
            )
```

Edição:
```python
        # Notifica o novo responsável se a tarefa mudou de mãos
        new_assigned_to_id = task_data.assigned_to_id if task_data.assigned_to_id is not None else old_assigned_to_id
        if new_assigned_to_id and new_assigned_to_id != old_assigned_to_id:
            from app.services.notificacoes.enviar import notificar

            notificar(
                self.db, new_assigned_to_id, "tarefa_para_mim",
                "Nova tarefa atribuída a você",
                f"{current_user.name} atribuiu a você: \"{updated_task.title}\"",
                link=f"/cards/{updated_task.card_id}",
                metadata={"task_id": updated_task.id, "card_id": updated_task.card_id,
                          "assigned_by_id": current_user.id, "assigned_by_name": current_user.name},
                autor_id=current_user.id,
            )
```

(o bloco inteiro da criação começa em `# Notifica o responsável se for diferente de quem criou a tarefa` e o da edição em `# Notifica o novo responsável se o assigned_to mudou`; os `try/except` em volta saem — `notificar` não levanta.)

- [ ] **Step 4: Produtos** — em `product_service.py`, trocar o bloco `# Notifica o responsável do card se for diferente de quem adicionou o produto` (o `try`/`except` inteiro) por:

```python
        # Notifica o vendedor do card (não quando foi ele mesmo)
        card = CardRepository(self.db).find_by_id(card_id)
        if card and card.assigned_to_id:
            from app.services.notificacoes.enviar import notificar

            notificar(
                self.db, card.assigned_to_id, "produto_no_card",
                "Produto adicionado ao card",
                f"{current_user.name} adicionou \"{product.name}\" ao card \"{card.title}\"",
                link=f"/cards/{card_id}",
                metadata={"card_id": card_id, "product_id": product.id, "product_name": product.name,
                          "added_by_id": current_user.id, "added_by_name": current_user.name},
                autor_id=current_user.id,
            )
```

e o bloco `# Notifica o responsável do card se for diferente de quem removeu o produto` por:

```python
        # Notifica o vendedor do card (não quando foi ele mesmo)
        card = CardRepository(self.db).find_by_id(card_id)
        if card and card.assigned_to_id:
            from app.services.notificacoes.enviar import notificar

            notificar(
                self.db, card.assigned_to_id, "produto_no_card",
                "Produto removido do card",
                f"{current_user.name} removeu \"{product_name_for_log}\" do card \"{card.title}\"",
                link=f"/cards/{card_id}",
                metadata={"card_id": card_id, "product_name": product_name_for_log,
                          "removed_by_id": current_user.id, "removed_by_name": current_user.name},
                autor_id=current_user.id,
            )
```

- [ ] **Step 5: Reunião** — em `recording_service.py`, substituir a função `_notificar` inteira por:

```python
def _notificar(db, user_ids: List[int], titulo: str, mensagem: str, task: CardTask,
               tipo: str = "reuniao_pronta") -> None:
    """Aviso no sino. Falha aqui não pode derrubar o processamento (notificar não levanta)."""
    from app.services.notificacoes.enviar import notificar

    for user_id in user_ids:
        notificar(
            db, user_id, tipo, titulo, mensagem,
            link=f"/cards/{task.card_id}",
            metadata={"card_id": task.card_id, "card_task_id": task.id},
        )
```

Em `_marcar_falha`, na chamada `_notificar(...)`, trocar o argumento `cor="danger",` por `tipo="reuniao_falha",`.

Run: `grep -n "cor=" backend/app/services/recording_service.py`
Expected: nenhuma linha (se aparecer outra chamada com `cor=`, trocar do mesmo jeito).

- [ ] **Step 6: Gamificação deixa de avisar** — em `gamification_service.py`, trocar o corpo de `_create_gamification_notification` por:

```python
        """
        Gamificação não avisa mais no sino (decisão de 14/10/2026): pontos e
        badges pararam em 11/03 e o aviso não está no catálogo de tipos.
        Os chamadores continuam; o método só não faz nada.
        """
        return None
```

- [ ] **Step 7: "Cliente demonstrou interesse" sai** — em `endpoints/cards.py`, apagar o bloco que começa em `# Notifica o SDR e/ou Vendedor do card` até o fim do laço `for user_id in recipients:` (inclui `notification_repo = NotificationRepository(db)`, `recipients` e o `try/except`). Depois:

Run: `grep -n "NotificationRepository" backend/app/api/v1/endpoints/cards.py`
Expected: se sobrou só o `import` sem uso, apagar o import também.

- [ ] **Step 8: Rodar e ver passar**

Run: `... pytest tests/unit/test_notificacoes_emissores.py tests/unit/test_recording_service.py tests/unit/test_card_tasks*.py tests/unit/test_products*.py ...`
(use os nomes que existirem: `ls backend/tests/unit | grep -i "task\|product"`)
Expected: tudo passa.

- [ ] **Step 9: Commit** (perguntar antes)

```bash
git add backend/app/services/card_task_service.py backend/app/services/product_service.py backend/app/services/recording_service.py backend/app/services/gamification_service.py backend/app/api/v1/endpoints/cards.py backend/tests/unit/test_notificacoes_emissores.py
git commit -m "feat(notificacoes): tarefa, produto e reuniao pelo caminho novo; fim dos avisos que nunca funcionaram"
```

---

### Task 9: Horário de Brasília e resumo da manhã

**Files:**
- Create: `backend/app/services/notificacoes/horario.py`, `backend/app/services/notificacoes/resumo.py`
- Test: `backend/tests/unit/test_notificacoes_resumo.py`

- [ ] **Step 1: Teste que falha**

`backend/tests/unit/test_notificacoes_resumo.py`:

```python
"""
Resumo das 8h: o dia de cada um, num aviso só.

Lembrete tarefa a tarefa viraria spam — em 14/10 a Gislayne tinha 274
tarefas atrasadas e o Eduardo 190. Datas: tarefas de Vendas são gravadas em
UTC; atividades de Serviço, no horário de Brasília.
"""
from datetime import datetime

from app.models.card_task import CardTask, TaskType
from app.models.service_card import ServiceCard
from app.models.service_card_activity import ServiceCardActivity
from app.models.user_notification_setting import UserNotificationSetting
from app.services.notificacoes.resumo import enviar_resumos_da_manha
from tests.unit.apoio_notificacoes import avisos, boards_de_servico, usuario

# 15/10/2026 08:00 em Brasília = 11:00 UTC
AGORA = datetime(2026, 10, 15, 11, 0)


def _tarefa(db, card, quem, tipo, quando_utc, **kw):
    t = CardTask(card_id=card.id, title="t", task_type=tipo, assigned_to_id=quem.id,
                 due_date=quando_utc, **kw)
    db.add(t)
    db.commit()


def test_conta_o_dia_e_os_atrasados(db, test_card, test_salesperson_user):
    _tarefa(db, test_card, test_salesperson_user, TaskType.CALL, datetime(2026, 10, 15, 13))
    _tarefa(db, test_card, test_salesperson_user, TaskType.CALL, datetime(2026, 10, 15, 17))
    _tarefa(db, test_card, test_salesperson_user, TaskType.MEETING, datetime(2026, 10, 15, 19))
    _tarefa(db, test_card, test_salesperson_user, TaskType.EMAIL, datetime(2026, 10, 10, 12))

    assert enviar_resumos_da_manha(db, AGORA) == 1

    [aviso] = avisos(db, test_salesperson_user.id, "resumo_manha")
    assert aviso.message == "Hoje: 2 ligações, 1 reunião · 1 atrasada"
    assert aviso.notification_metadata["url"] == "/activities"


def test_virada_do_dia_e_em_brasilia(db, test_card, test_salesperson_user):
    """02:30 UTC de 16/10 ainda é 15/10 em Brasília (23:30)."""
    _tarefa(db, test_card, test_salesperson_user, TaskType.CALL, datetime(2026, 10, 16, 2, 30))

    enviar_resumos_da_manha(db, AGORA)

    assert avisos(db, test_salesperson_user.id)[0].message == "Hoje: 1 ligação"


def test_concluida_e_cancelada_nao_contam(db, test_card, test_salesperson_user):
    _tarefa(db, test_card, test_salesperson_user, TaskType.CALL, datetime(2026, 10, 15, 13), is_completed=True)
    _tarefa(db, test_card, test_salesperson_user, TaskType.CALL, datetime(2026, 10, 15, 13), is_cancelled=True)

    assert enviar_resumos_da_manha(db, AGORA) == 0


def test_so_atrasadas(db, test_card, test_salesperson_user):
    _tarefa(db, test_card, test_salesperson_user, TaskType.CALL, datetime(2026, 10, 1, 13))
    _tarefa(db, test_card, test_salesperson_user, TaskType.CALL, datetime(2026, 10, 2, 13))

    enviar_resumos_da_manha(db, AGORA)

    assert avisos(db, test_salesperson_user.id)[0].message == "Nada agendado para hoje · 2 atrasadas"


def test_nao_repete_no_mesmo_dia(db, test_card, test_salesperson_user):
    _tarefa(db, test_card, test_salesperson_user, TaskType.CALL, datetime(2026, 10, 15, 13))

    enviar_resumos_da_manha(db, AGORA)
    enviar_resumos_da_manha(db, AGORA)

    assert len(avisos(db, test_salesperson_user.id)) == 1


def test_respeita_a_preferencia(db, test_card, test_salesperson_user):
    db.add(UserNotificationSetting(user_id=test_salesperson_user.id, resumo_manha=False))
    db.commit()
    _tarefa(db, test_card, test_salesperson_user, TaskType.CALL, datetime(2026, 10, 15, 13))

    assert enviar_resumos_da_manha(db, AGORA) == 0


def test_atividades_de_servico_em_horario_de_brasilia(db):
    b = boards_de_servico(db)
    andre = usuario(db, "Andre", "service")
    card = ServiceCard(list_id=b.lista_cobranca.id, title="Cobrança 1")
    db.add(card)
    db.commit()
    for quando in (datetime(2026, 10, 15, 16), datetime(2026, 10, 15, 23, 30), datetime(2026, 10, 14, 16)):
        db.add(ServiceCardActivity(service_card_id=card.id, user_id=andre.id, category="atividade",
                                   activity_type="follow_up", due_date=quando, is_completed=False))
    db.commit()

    enviar_resumos_da_manha(db, AGORA)

    assert avisos(db, andre.id)[0].message == "Hoje: 2 follow-ups · 1 atrasada"
```

- [ ] **Step 2: Rodar e ver falhar** — Expected: `ModuleNotFoundError ... resumo`

- [ ] **Step 3: Horário**

`backend/app/services/notificacoes/horario.py`:

```python
"""
O dia em Brasília.

O Brasil não tem horário de verão desde 2019: UTC−3 fixo, sem depender de
base de fusos no servidor. As tarefas de Vendas são gravadas em UTC (o front
converte); as atividades de Serviço, no horário de Brasília, sem fuso.
"""
from dataclasses import dataclass
from datetime import date, datetime, timedelta

BRASILIA = timedelta(hours=-3)


@dataclass(frozen=True)
class Dia:
    data: date
    inicio_utc: datetime
    fim_utc: datetime
    inicio_local: datetime
    fim_local: datetime


def dia_em_brasilia(agora_utc: datetime) -> Dia:
    """Limites do dia de Brasília que contém `agora_utc` (UTC sem fuso)."""
    local = agora_utc + BRASILIA
    inicio_local = datetime(local.year, local.month, local.day)
    fim_local = inicio_local + timedelta(days=1)
    return Dia(
        data=inicio_local.date(),
        inicio_utc=inicio_local - BRASILIA,
        fim_utc=fim_local - BRASILIA,
        inicio_local=inicio_local,
        fim_local=fim_local,
    )


def hora_em_brasilia(quando_utc: datetime) -> str:
    return (quando_utc + BRASILIA).strftime("%H:%M")
```

- [ ] **Step 4: Resumo**

`backend/app/services/notificacoes/resumo.py`:

```python
"""
Resumo da manhã: seg a sex, 8h, um aviso por pessoa com o dia dela.

Vendas conta as tarefas pelo responsável; Serviço conta as atividades por
quem criou. Quem trabalha nos dois recebe um resumo só. Quem não tem nada
para hoje nem atrasado não recebe.
"""
from collections import Counter, defaultdict
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.card_task import CardTask
from app.models.service_card import ServiceCard
from app.models.service_card_activity import ServiceCardActivity
from app.services.notificacoes.enviar import notificar
from app.services.notificacoes.horario import dia_em_brasilia

NOMES = {
    "call": ("ligação", "ligações"),
    "meeting": ("reunião", "reuniões"),
    "email": ("e-mail", "e-mails"),
    "whatsapp": ("WhatsApp", "WhatsApps"),
    "linkedin": ("LinkedIn", "LinkedIns"),
    "follow_up": ("follow-up", "follow-ups"),
    "task": ("tarefa", "tarefas"),
}
OUTRA = ("outra", "outras")


def _tipo(valor) -> str:
    return getattr(valor, "value", valor) or "other"


def _contagem(n: int, tipo: str) -> str:
    singular, plural = NOMES.get(tipo, OUTRA)
    return f"{n} {singular if n == 1 else plural}"


def montar_mensagem(hoje: Counter, atrasadas: int) -> str:
    partes = [_contagem(n, t) for t, n in sorted(hoje.items(), key=lambda x: (-x[1], x[0]))]
    texto = f"Hoje: {', '.join(partes)}" if partes else "Nada agendado para hoje"
    if atrasadas:
        texto += f" · {atrasadas} atrasada{'' if atrasadas == 1 else 's'}"
    return texto


def enviar_resumos_da_manha(db: Session, agora_utc: datetime) -> int:
    """Returns: quantos resumos foram enviados."""
    dia = dia_em_brasilia(agora_utc)
    hoje = defaultdict(Counter)
    atrasadas = Counter()

    tarefas = (
        db.query(CardTask.assigned_to_id, CardTask.task_type, CardTask.due_date)
        .filter(
            CardTask.assigned_to_id.isnot(None),
            CardTask.is_completed == False,  # noqa: E712
            CardTask.is_cancelled == False,  # noqa: E712
            CardTask.due_date.isnot(None),
            CardTask.due_date < dia.fim_utc,
        )
    )
    for pessoa, tipo, quando in tarefas:
        if quando >= dia.inicio_utc:
            hoje[pessoa][_tipo(tipo)] += 1
        else:
            atrasadas[pessoa] += 1

    atividades = (
        db.query(ServiceCardActivity.user_id, ServiceCardActivity.activity_type,
                 ServiceCardActivity.due_date)
        .join(ServiceCard, ServiceCard.id == ServiceCardActivity.service_card_id)
        .filter(
            ServiceCardActivity.user_id.isnot(None),
            ServiceCardActivity.category == "atividade",
            ServiceCardActivity.is_completed == False,  # noqa: E712
            ServiceCardActivity.due_date.isnot(None),
            ServiceCardActivity.due_date < dia.fim_local,
            ServiceCard.is_deleted == False,  # noqa: E712
        )
    )
    for pessoa, tipo, quando in atividades:
        if quando >= dia.inicio_local:
            hoje[pessoa][_tipo(tipo)] += 1
        else:
            atrasadas[pessoa] += 1

    enviados = 0
    for pessoa in set(hoje) | set(atrasadas):
        if notificar(
            db, pessoa, "resumo_manha", "Resumo do dia",
            montar_mensagem(hoje[pessoa], atrasadas[pessoa]),
            link="/activities",
            metadata={"data": dia.data.isoformat()},
            referencia=f"resumo:{dia.data.isoformat()}",
        ):
            enviados += 1
    return enviados
```

- [ ] **Step 5: Rodar e ver passar** — Expected: `7 passed`

- [ ] **Step 6: Commit** (perguntar antes)

```bash
git add backend/app/services/notificacoes/horario.py backend/app/services/notificacoes/resumo.py backend/tests/unit/test_notificacoes_resumo.py
git commit -m "feat(notificacoes): resumo da manha de Vendas e Servico"
```

---

### Task 10: Reunião em 15 minutos

**Files:**
- Create: `backend/app/services/notificacoes/reunioes.py`
- Test: `backend/tests/unit/test_notificacoes_reunioes.py`

- [ ] **Step 1: Teste que falha**

`backend/tests/unit/test_notificacoes_reunioes.py`:

```python
"""
Aviso 15 minutos antes, só de reunião: no último mês foram 65 ligações
agendadas à mão por dia útil contra 2,4 reuniões no time todo.
"""
from datetime import datetime, timedelta

from app.models.card_task import CardTask, TaskType
from app.services.notificacoes.reunioes import avisar_reunioes_proximas
from tests.unit.apoio_notificacoes import avisos

AGORA = datetime(2026, 10, 15, 16, 45)  # 13:45 em Brasília


def _tarefa(db, card, quem, tipo, minutos, **kw):
    t = CardTask(card_id=card.id, title="Apresentação Phoebus - ACME", task_type=tipo,
                 assigned_to_id=quem.id, due_date=AGORA + timedelta(minutes=minutos), **kw)
    db.add(t)
    db.commit()
    return t


def test_avisa_reuniao_daqui_a_15_minutos(db, test_card, test_salesperson_user):
    _tarefa(db, test_card, test_salesperson_user, TaskType.MEETING, 15)

    assert avisar_reunioes_proximas(db, AGORA) == 1

    [aviso] = avisos(db, test_salesperson_user.id, "reuniao_15min")
    assert aviso.message == '"Apresentação Phoebus - ACME" às 14:00.'
    assert aviso.notification_metadata["url"] == f"/cards/{test_card.id}"


def test_fora_da_janela_nao_avisa(db, test_card, test_salesperson_user):
    _tarefa(db, test_card, test_salesperson_user, TaskType.MEETING, 30)
    _tarefa(db, test_card, test_salesperson_user, TaskType.MEETING, 5)

    assert avisar_reunioes_proximas(db, AGORA) == 0


def test_ligacao_nao_avisa(db, test_card, test_salesperson_user):
    _tarefa(db, test_card, test_salesperson_user, TaskType.CALL, 15)

    assert avisar_reunioes_proximas(db, AGORA) == 0


def test_concluida_ou_cancelada_nao_avisa(db, test_card, test_salesperson_user):
    _tarefa(db, test_card, test_salesperson_user, TaskType.MEETING, 15, is_completed=True)
    _tarefa(db, test_card, test_salesperson_user, TaskType.MEETING, 15, is_cancelled=True)

    assert avisar_reunioes_proximas(db, AGORA) == 0


def test_rodando_a_cada_minuto_avisa_uma_vez(db, test_card, test_salesperson_user):
    _tarefa(db, test_card, test_salesperson_user, TaskType.MEETING, 15)

    for minuto in range(6):
        avisar_reunioes_proximas(db, AGORA + timedelta(minutes=minuto))

    assert len(avisos(db, test_salesperson_user.id)) == 1
```

- [ ] **Step 2: Rodar e ver falhar** — Expected: `ModuleNotFoundError ... reunioes`

- [ ] **Step 3: Implementar**

`backend/app/services/notificacoes/reunioes.py`:

```python
"""
Aviso 15 minutos antes de reunião.

O agendador roda a cada minuto e olha a janela de 10 a 16 minutos à frente:
cada reunião cai nela várias vezes, e a `referencia` faz o aviso sair uma só.
"""
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models.card_task import CardTask, TaskType
from app.services.notificacoes.enviar import notificar
from app.services.notificacoes.horario import hora_em_brasilia

JANELA_DE = timedelta(minutes=10)
JANELA_ATE = timedelta(minutes=16)


def avisar_reunioes_proximas(db: Session, agora_utc: datetime) -> int:
    """Returns: quantos avisos foram enviados."""
    reunioes = (
        db.query(CardTask)
        .filter(
            CardTask.task_type == TaskType.MEETING,
            CardTask.is_completed == False,  # noqa: E712
            CardTask.is_cancelled == False,  # noqa: E712
            CardTask.assigned_to_id.isnot(None),
            CardTask.due_date >= agora_utc + JANELA_DE,
            CardTask.due_date <= agora_utc + JANELA_ATE,
        )
        .all()
    )
    enviados = 0
    for t in reunioes:
        if notificar(
            db, t.assigned_to_id, "reuniao_15min", "Reunião em 15 minutos",
            f'"{t.title}" às {hora_em_brasilia(t.due_date)}.',
            link=f"/cards/{t.card_id}",
            metadata={"card_id": t.card_id, "task_id": t.id},
            referencia=f"reuniao:{t.id}",
        ):
            enviados += 1
    return enviados
```

- [ ] **Step 4: Rodar e ver passar** — Expected: `5 passed`

- [ ] **Step 5: Commit** (perguntar antes)

```bash
git add backend/app/services/notificacoes/reunioes.py backend/tests/unit/test_notificacoes_reunioes.py
git commit -m "feat(notificacoes): aviso 15 minutos antes de reuniao"
```

---

### Task 11: Card novo nos boards de Serviço

**Files:**
- Create: `backend/app/services/notificacoes/servico.py`
- Test: `backend/tests/unit/test_notificacoes_servico.py`

- [ ] **Step 1: Teste que falha**

`backend/tests/unit/test_notificacoes_servico.py`:

```python
"""
Card novo em Serviço, agrupado: em 01/10/2026 chegaram 101 cards de Cobrança
de uma vez. Os cards de Serviço não têm dono — o aviso vai para quem
acompanha o board.
"""
from datetime import datetime

from app.models.service_card import ServiceCard
from app.models.service_card_activity import ServiceCardActivity
from app.models.user_notification_setting import UserNotificationSetting
from app.services.notificacoes.servico import avisar_cards_novos_de_servico
from tests.unit.apoio_notificacoes import avisos, boards_de_servico, usuario

AGORA = datetime(2026, 10, 15, 14, 0)


def _acompanha(db, quem, *boards):
    db.add(UserNotificationSetting(user_id=quem.id, quadros_servico=[b.id for b in boards]))
    db.commit()


def _card(db, lista, titulo, criador=None):
    c = ServiceCard(list_id=lista.id, title=titulo)
    db.add(c)
    db.commit()
    if criador:
        db.add(ServiceCardActivity(service_card_id=c.id, user_id=criador.id,
                                   category="alteracao", activity_type="card_created"))
        db.commit()
    return c


def test_um_card_avisa_com_o_titulo(db):
    b = boards_de_servico(db)
    ellen = usuario(db, "Ellen", "service")
    _acompanha(db, ellen, b.servicos)
    c = _card(db, b.lista_servicos, "TRANSPORTES SILVA — OS 1234")

    assert avisar_cards_novos_de_servico(db, AGORA) == 1

    [aviso] = avisos(db, ellen.id, "card_novo_servico")
    assert aviso.title == "Novo card em Serviços"
    assert aviso.message == "TRANSPORTES SILVA — OS 1234"
    assert aviso.notification_metadata["url"] == f"/servicos/{b.servicos.id}/cards/{c.id}"


def test_varios_cards_viram_um_aviso(db):
    b = boards_de_servico(db)
    andre = usuario(db, "Andre", "service")
    _acompanha(db, andre, b.cobranca)
    for i in range(5):
        _card(db, b.lista_cobranca, f"Cobrança {i}")

    avisar_cards_novos_de_servico(db, AGORA)

    [aviso] = avisos(db, andre.id)
    assert aviso.title == "5 cards novos em Cobrança"
    assert aviso.message == "Cobrança 0, Cobrança 1, Cobrança 2 e mais 2"
    assert aviso.notification_metadata["url"] == f"/servicos/{b.cobranca.id}"


def test_so_quem_acompanha_o_board(db):
    b = boards_de_servico(db)
    andre = usuario(db, "Andre", "service")
    ellen = usuario(db, "Ellen", "service")
    _acompanha(db, andre, b.cobranca)
    _acompanha(db, ellen, b.servicos)
    _card(db, b.lista_cobranca, "Cobrança 1")

    avisar_cards_novos_de_servico(db, AGORA)

    assert len(avisos(db, andre.id)) == 1
    assert avisos(db, ellen.id) == []


def test_quem_criou_nao_e_avisado(db):
    b = boards_de_servico(db)
    leticia = usuario(db, "Leticia", "service")
    andre = usuario(db, "Andre", "service")
    _acompanha(db, leticia, b.cobranca)
    _acompanha(db, andre, b.cobranca)
    _card(db, b.lista_cobranca, "Manual", criador=leticia)

    avisar_cards_novos_de_servico(db, AGORA)

    assert avisos(db, leticia.id) == []
    assert len(avisos(db, andre.id)) == 1


def test_card_avisado_nao_avisa_de_novo(db):
    b = boards_de_servico(db)
    andre = usuario(db, "Andre", "service")
    _acompanha(db, andre, b.cobranca)
    c = _card(db, b.lista_cobranca, "Cobrança 1")

    avisar_cards_novos_de_servico(db, AGORA)
    avisar_cards_novos_de_servico(db, AGORA)

    assert len(avisos(db, andre.id)) == 1
    db.refresh(c)
    assert c.avisado_em == AGORA


def test_vendedor_e_integracao_nunca_recebem(db, test_salesperson_user):
    b = boards_de_servico(db)
    integ = usuario(db, "GestorHS", "service", is_integracao=True)
    _acompanha(db, test_salesperson_user, b.cobranca)
    _card(db, b.lista_cobranca, "Cobrança 1", criador=integ)

    avisar_cards_novos_de_servico(db, AGORA)

    assert avisos(db, test_salesperson_user.id) == []
    assert avisos(db, integ.id) == []
```

- [ ] **Step 2: Rodar e ver falhar** — Expected: `ModuleNotFoundError ... servico`

- [ ] **Step 3: Implementar**

`backend/app/services/notificacoes/servico.py`:

```python
"""
Card novo nos boards de Serviço.

Os cards de Serviço não têm dono (em 14/10/2026, os 1.368 abertos estavam sem
responsável): o aviso vai para quem acompanha o board, escolhido em
Configurações. Chega em lote — 101 cards de Cobrança de uma vez em 01/10 —
então vários cards viram um aviso só por board.
"""
from collections import defaultdict
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.role import Role
from app.models.service_board import ServiceBoard
from app.models.service_card import ServiceCard
from app.models.service_card_activity import ServiceCardActivity
from app.models.service_list import ServiceList
from app.models.user import User
from app.services.notificacoes.enviar import notificar
from app.services.user_notification_service import UserNotificationService

# Quem pode acompanhar boards de Serviço
PAPEIS = ("service", "admin", "manager")
AMOSTRA = 3


def _aviso(board_id: int, nome: str, cards: list) -> tuple:
    if len(cards) == 1:
        c = cards[0]
        return (f"Novo card em {nome}", c.title,
                f"/servicos/{board_id}/cards/{c.id}", f"servico_card:{c.id}")
    resto = len(cards) - AMOSTRA
    mensagem = ", ".join(c.title for c in cards[:AMOSTRA])
    if resto > 0:
        mensagem += f" e mais {resto}"
    return (f"{len(cards)} cards novos em {nome}", mensagem,
            f"/servicos/{board_id}", f"servico_lote:{board_id}:{cards[0].id}-{cards[-1].id}")


def avisar_cards_novos_de_servico(db: Session, agora_utc: datetime) -> int:
    """Returns: quantos avisos foram enviados."""
    novos = (
        db.query(ServiceCard, ServiceList.board_id)
        .join(ServiceList, ServiceList.id == ServiceCard.list_id)
        .filter(ServiceCard.avisado_em.is_(None), ServiceCard.is_deleted == False)  # noqa: E712
        .order_by(ServiceCard.id)
        .all()
    )
    if not novos:
        return 0

    ids = [c.id for c, _ in novos]
    criador = dict(
        db.query(ServiceCardActivity.service_card_id, ServiceCardActivity.user_id)
        .filter(ServiceCardActivity.service_card_id.in_(ids),
                ServiceCardActivity.activity_type == "card_created")
        .all()
    )
    nomes = {b.id: b.name for b in db.query(ServiceBoard).filter(
        ServiceBoard.id.in_({board_id for _, board_id in novos}))}

    pessoas = (
        db.query(User)
        .join(Role, Role.id == User.role_id)
        .filter(Role.name.in_(PAPEIS), User.is_active == True,  # noqa: E712
                User.is_deleted == False, User.is_integracao == False)  # noqa: E712
        .all()
    )
    preferencias = UserNotificationService(db)

    enviados = 0
    for pessoa in pessoas:
        acompanha = set(preferencias.get_or_create(pessoa.id).quadros_servico or [])
        por_board = defaultdict(list)
        for card, board_id in novos:
            if board_id in acompanha and criador.get(card.id) != pessoa.id:
                por_board[board_id].append(card)

        for board_id, cards in por_board.items():
            titulo, mensagem, link, referencia = _aviso(board_id, nomes.get(board_id, "Serviço"), cards)
            if notificar(
                db, pessoa.id, "card_novo_servico", titulo, mensagem,
                link=link,
                metadata={"board_id": board_id, "service_card_ids": [c.id for c in cards]},
                referencia=referencia,
            ):
                enviados += 1

    for card, _ in novos:
        card.avisado_em = agora_utc
    db.commit()
    return enviados
```

- [ ] **Step 4: Rodar e ver passar** — Expected: `6 passed`

- [ ] **Step 5: Commit** (perguntar antes)

```bash
git add backend/app/services/notificacoes/servico.py backend/tests/unit/test_notificacoes_servico.py
git commit -m "feat(notificacoes): card novo de Servico agrupado por board para quem acompanha"
```

---

### Task 12: Limpeza e agendador

**Files:**
- Create: `backend/app/services/notificacoes/limpeza.py`
- Modify: `backend/app/workers/scheduler.py`
- Test: `backend/tests/unit/test_notificacoes_limpeza_e_agenda.py`

- [ ] **Step 1: Teste que falha**

`backend/tests/unit/test_notificacoes_limpeza_e_agenda.py`:

```python
"""
Limpeza das lidas com mais de 30 dias e os jobs no agendador da API.

Os lembretes antigos (card vencido, tarefa vencendo...) iam para a fila do
Celery, e produção não tem worker: nunca chegaram a ninguém.
"""
from datetime import datetime, timedelta

from app.models.notification import Notification
from app.services.notificacoes.limpeza import limpar_notificacoes_lidas

AGORA = datetime(2026, 11, 20, 6, 30)


def _aviso(db, user, lida_em=None):
    db.add(Notification(user_id=user.id, notification_type="card_atribuido", title="t",
                        message="m", notification_metadata={},
                        is_read=lida_em is not None, read_at=lida_em))
    db.commit()


def test_apaga_so_as_lidas_ha_mais_de_30_dias(db, test_salesperson_user):
    _aviso(db, test_salesperson_user, lida_em=AGORA - timedelta(days=31))
    _aviso(db, test_salesperson_user, lida_em=AGORA - timedelta(days=29))
    _aviso(db, test_salesperson_user)  # não lida

    assert limpar_notificacoes_lidas(db, AGORA) == 1
    assert db.query(Notification).count() == 2


def test_jobs_registrados():
    from app.workers import scheduler as agenda

    agenda.scheduler = None
    try:
        agenda.configure_jobs()
        ids = {j.id for j in agenda.get_scheduler().get_jobs()}
    finally:
        agenda.scheduler = None

    assert {"resumo_manha", "reuniao_15min", "cards_novos_servico", "limpar_notificacoes"} <= ids
    assert not ids & {"check_overdue_cards", "check_overdue_tasks", "check_pending_transfers",
                      "report_failed_automations", "cleanup_notifications"}
```

- [ ] **Step 2: Rodar e ver falhar** — Expected: `ModuleNotFoundError ... limpeza`

- [ ] **Step 3: Limpeza**

`backend/app/services/notificacoes/limpeza.py`:

```python
"""Apaga notificações lidas há mais de 30 dias (decisão de 14/10/2026). As não lidas ficam."""
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models.notification import Notification

DIAS = 30


def limpar_notificacoes_lidas(db: Session, agora_utc: datetime) -> int:
    """Returns: quantas foram apagadas."""
    apagadas = (
        db.query(Notification)
        .filter(
            Notification.is_read == True,  # noqa: E712
            Notification.read_at.isnot(None),
            Notification.read_at < agora_utc - timedelta(days=DIAS),
        )
        .delete(synchronize_session=False)
    )
    db.commit()
    return apagadas
```

- [ ] **Step 4: Agendador** — em `backend/app/workers/scheduler.py`:

1. Apagar as funções `job_check_overdue_cards`, `job_check_overdue_tasks`, `job_report_failed_automations`, `job_cleanup_notifications` e `job_check_pending_transfers`, e os `sched.add_job(...)` delas em `configure_jobs` (ids `check_overdue_cards`, `check_overdue_tasks`, `report_failed_automations`, `check_pending_transfers`, `cleanup_notifications`).

2. Acrescentar, antes de `def configure_jobs():`:

```python
# ── Avisos (sem Celery: gravam direto no banco) ──────────────────────────────
# Os lembretes antigos iam para a fila do Celery, e produção não tem worker:
# nunca chegaram a ninguém. Estes rodam aqui mesmo, dentro da API.

def _rodar_aviso(nome: str, funcao) -> None:
    db = SessionLocal()
    try:
        quantos = funcao(db, datetime.utcnow())
        if quantos:
            logger.info(f"[AVISOS] {nome}: {quantos}")
    except Exception as e:
        db.rollback()
        logger.error(f"[AVISOS] {nome} falhou: {e}")
    finally:
        db.close()


def job_resumo_manha():
    from app.services.notificacoes.resumo import enviar_resumos_da_manha
    _rodar_aviso("resumo da manhã", enviar_resumos_da_manha)


def job_reuniao_15min():
    from app.services.notificacoes.reunioes import avisar_reunioes_proximas
    _rodar_aviso("reunião em 15 minutos", avisar_reunioes_proximas)


def job_cards_novos_servico():
    from app.services.notificacoes.servico import avisar_cards_novos_de_servico
    _rodar_aviso("card novo de Serviço", avisar_cards_novos_de_servico)


def job_limpar_notificacoes():
    from app.services.notificacoes.limpeza import limpar_notificacoes_lidas
    _rodar_aviso("limpeza de notificações", limpar_notificacoes_lidas)
```

3. Dentro de `configure_jobs`, depois dos `add_job` que ficaram:

```python
    sched.add_job(job_resumo_manha, trigger=CronTrigger(day_of_week="mon-fri", hour=8, minute=0),
                  id="resumo_manha", name="Resumo da manhã", replace_existing=True)
    sched.add_job(job_reuniao_15min, trigger=IntervalTrigger(minutes=1),
                  id="reuniao_15min", name="Reunião em 15 minutos", replace_existing=True)
    sched.add_job(job_cards_novos_servico, trigger=IntervalTrigger(minutes=5),
                  id="cards_novos_servico", name="Card novo de Serviço", replace_existing=True)
    sched.add_job(job_limpar_notificacoes, trigger=CronTrigger(hour=3, minute=30),
                  id="limpar_notificacoes", name="Limpar notificações lidas", replace_existing=True)
```

4. No `from app.workers.tasks import (...)` do topo, tirar `cleanup_old_data_task` e `send_notification_task` **se** não tiverem mais uso:

Run: `grep -n "cleanup_old_data_task\|send_notification_task\|send_email_task" backend/app/workers/scheduler.py`
Remover do import cada nome que só aparece na linha do import.

- [ ] **Step 5: Rodar e ver passar** — Expected: `2 passed`

- [ ] **Step 6: Commit** (perguntar antes)

```bash
git add backend/app/services/notificacoes/limpeza.py backend/app/workers/scheduler.py backend/tests/unit/test_notificacoes_limpeza_e_agenda.py
git commit -m "feat(notificacoes): lembretes e limpeza no agendador da API, sem Celery"
```

---

### Task 13: Frontend — tipos, ícones e sino sem notificação falsa

**Files:**
- Create: `frontend/src/utils/avisos.tsx`
- Modify: `frontend/src/types/index.ts` (`NotificationType` ~l.1020, `NotificationSettings` ~l.830-848), `frontend/src/services/notificationService.ts` (~l.105-166), `frontend/src/components/NotificationDropdown.tsx`, `frontend/src/pages/Notifications.tsx`

- [ ] **Step 1: Ícone, cor e rótulo por tipo**

`frontend/src/utils/avisos.tsx`:

```tsx
/**
 * Como cada tipo de aviso aparece no sino e na página de notificações.
 *
 * Os ids espelham o catálogo do backend (app/services/notificacoes/tipos.py).
 * Os antigos ficam até a limpeza de 30 dias apagar o histórico.
 */
import {
  AlarmClock, AlertTriangle, Bell, CheckSquare, Inbox, Package, Sun, Target,
  UserCheck, Video, Zap, type LucideIcon,
} from "lucide-react";

interface InfoDoAviso {
  rotulo: string;
  Icone: LucideIcon;
  cor: string;
}

const AVISOS: Record<string, InfoDoAviso> = {
  lead_site: { rotulo: "Novo lead do site", Icone: Target, cor: "text-emerald-500" },
  card_atribuido: { rotulo: "Card atribuído", Icone: UserCheck, cor: "text-blue-400" },
  tarefa_para_mim: { rotulo: "Tarefa para mim", Icone: CheckSquare, cor: "text-blue-400" },
  produto_no_card: { rotulo: "Produto no card", Icone: Package, cor: "text-purple-400" },
  reuniao_pronta: { rotulo: "Reunião pronta", Icone: Video, cor: "text-purple-400" },
  resumo_manha: { rotulo: "Resumo do dia", Icone: Sun, cor: "text-amber-500" },
  reuniao_15min: { rotulo: "Reunião em 15 minutos", Icone: AlarmClock, cor: "text-orange-400" },
  card_novo_servico: { rotulo: "Card novo no board", Icone: Inbox, cor: "text-cyan-500" },
  reuniao_falha: { rotulo: "Falha na reunião", Icone: AlertTriangle, cor: "text-red-400" },
  automacao: { rotulo: "Automação", Icone: Zap, cor: "text-slate-400" },
  // Antigos — continuam no histórico até a limpeza apagar
  card_assigned: { rotulo: "Card atribuído", Icone: UserCheck, cor: "text-blue-400" },
  task_assigned: { rotulo: "Tarefa para mim", Icone: CheckSquare, cor: "text-blue-400" },
  product_added: { rotulo: "Produto no card", Icone: Package, cor: "text-purple-400" },
  product_removed: { rotulo: "Produto no card", Icone: Package, cor: "text-purple-400" },
  meeting_recording: { rotulo: "Reunião pronta", Icone: Video, cor: "text-purple-400" },
};

const PADRAO: InfoDoAviso = { rotulo: "Aviso", Icone: Bell, cor: "text-slate-400" };

export function infoDoAviso(tipo: string): InfoDoAviso {
  return AVISOS[tipo] ?? PADRAO;
}

export function IconeDoAviso({ tipo, size = 18 }: { tipo: string; size?: number }) {
  const { Icone } = infoDoAviso(tipo);
  return <Icone size={size} />;
}

/** O lead do site precisa saltar aos olhos: era lido 0–22% das vezes. */
export function avisoEmDestaque(tipo: string): boolean {
  return tipo === "lead_site";
}
```

- [ ] **Step 2: Tipos** — em `frontend/src/types/index.ts`:

Trocar a união `export type NotificationType = ...` inteira por:

```ts
// Tipos de aviso — ver src/utils/avisos.tsx e o catálogo do backend
export type NotificationType = string;
```

Trocar `NotificationSettings` e `NotificationSettingsUpdate` por:

```ts
export interface NotificationSettings {
  id: number;
  user_id: number;
  task_assigned: boolean;
  card_product_changed: boolean;
  reuniao_pronta: boolean;
  resumo_manha: boolean;
  reuniao_15min: boolean;
  popup_navegador: boolean;
  quadros_servico: number[];
  created_at: string;
  updated_at: string;
}

export type NotificationSettingsUpdate = Partial<
  Pick<NotificationSettings,
    "task_assigned" | "card_product_changed" | "reuniao_pronta" |
    "resumo_manha" | "reuniao_15min" | "popup_navegador" | "quadros_servico">
>;
```

- [ ] **Step 3: Serviço de notificações** — em `frontend/src/services/notificationService.ts`, importar `import { infoDoAviso } from "../utils/avisos";` e trocar os corpos:

```ts
  formatType(type: NotificationType): string {
    return infoDoAviso(type).rotulo;
  }
```

```ts
  getTypeColor(type: NotificationType): string {
    return infoDoAviso(type).cor;
  }
```

Para `getTypeIcon`:
Run: `grep -rn "getTypeIcon" frontend/src`
Se a única ocorrência for a definição, apagar o método inteiro.

- [ ] **Step 4: Sino** — em `frontend/src/components/NotificationDropdown.tsx`:

1. Imports: trocar o bloco de ícones do `lucide-react` por `import { Bell, Check, CheckCheck } from "lucide-react";` (manter só os usados fora do mapa de ícones — conferir com o `tsc` no fim) e acrescentar:

```tsx
import userService from "../services/userService";
import { IconeDoAviso, avisoEmDestaque } from "../utils/avisos";
```

2. Depois de `const isInitialCountLoad = useRef(true);`:

```tsx
  // Pop-up do navegador só para quem deixou ligado em Configurações
  const popupLigado = useRef(true);
  const [erroAoCarregar, setErroAoCarregar] = useState(false);

  useEffect(() => {
    userService
      .getNotificationSettings()
      .then((p) => {
        popupLigado.current = p.popup_navegador;
      })
      .catch(() => {});
  }, []);
```

3. Em `showBrowserNotifications`, primeira linha do corpo:

```tsx
    if (!popupLigado.current) return;
```

4. Em `loadNotifications`, trocar o `catch` inteiro por:

```tsx
    } catch (error) {
      console.error("Erro ao carregar notificações:", error);
      setErroAoCarregar(true);
      setNotifications([]);
    } finally {
```

e logo depois de `setUnreadCount(response.unread_count);` acrescentar `setErroAoCarregar(false);`.

5. Apagar a função `getNotificationIcon` inteira e a `getMockNotifications` inteira (no fim do arquivo).

6. Na lista, trocar `{getNotificationIcon(notification.type)}` por `<IconeDoAviso tipo={notification.type} />`, e no `className` do item (o que hoje termina em `${!notification.is_read ? "bg-gray-200/30 dark:bg-slate-700/30" : ""}`) acrescentar o destaque:

```tsx
                    } ${!notification.is_read ? "bg-gray-200/30 dark:bg-slate-700/30" : ""} ${
                      avisoEmDestaque(notification.type)
                        ? "border-l-4 border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10"
                        : ""
                    }`}
```

7. No estado vazio, trocar o `notifications.length === 0 ? (` por uma checagem do erro antes:

```tsx
            ) : erroAoCarregar ? (
              <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                Não foi possível carregar as notificações.
              </div>
            ) : notifications.length === 0 ? (
```

- [ ] **Step 5: Página de notificações** — em `frontend/src/pages/Notifications.tsx`:

1. Trocar o `catch` de `loadNotifications` (o que usa `getMockNotifications`) por:

```tsx
    } catch (error) {
      console.error("Erro ao carregar notificações:", error);
      showError("Não foi possível carregar as notificações");
      setNotifications([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
```

2. Apagar `getMockNotifications` (fim do arquivo) e a função `getNotificationIcon`; trocar as chamadas `getNotificationIcon(x.type)` por `<IconeDoAviso tipo={x.type} size={20} />` com `import { IconeDoAviso } from "../utils/avisos";`.

- [ ] **Step 6: TypeScript**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.json`
Expected: sem saída. Se acusar import sem uso (ícones do lucide), remover o import apontado e rodar de novo.

- [ ] **Step 7: Commit** (perguntar antes)

```bash
git add frontend/src/utils/avisos.tsx frontend/src/types/index.ts frontend/src/services/notificationService.ts frontend/src/components/NotificationDropdown.tsx frontend/src/pages/Notifications.tsx
git commit -m "feat(notificacoes): sino com lead em destaque, pop-up opcional e sem notificacao falsa"
```

---

### Task 14: Frontend — Configurações > Notificações de verdade

**Files:**
- Create: `frontend/src/components/settings/NotificacoesConfig.tsx`
- Modify: `frontend/src/pages/Settings.tsx` (estado ~l.58-71, `handleSaveNotifications` ~l.504-508, aba ~l.1400-1651)

- [ ] **Step 1: Componente**

`frontend/src/components/settings/NotificacoesConfig.tsx`:

```tsx
/**
 * Configurações > Notificações.
 *
 * Até 14/10/2026 esta aba era de enfeite: os botões ficavam em estado local e
 * "salvar" era um console.log. Agora cada botão salva ao clicar, e só aparece o
 * que existe e faz sentido para o perfil.
 */
import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import userService from "../../services/userService";
import serviceBoardService from "../../services/serviceBoardService";
import { useAuth } from "../../hooks/useAuth";
import { showError, showSuccess } from "../../utils/toast";
import { NotificationSettings, NotificationSettingsUpdate } from "../../types";

type Chave = "task_assigned" | "card_product_changed" | "reuniao_pronta" | "resumo_manha" | "reuniao_15min" | "popup_navegador";

const CARTAO = "flex items-center justify-between rounded-lg bg-gray-100 p-4 dark:bg-slate-700/50";
const TITULO = "mb-3 text-lg font-medium text-slate-900 dark:text-white";

function Linha({ titulo, descricao, children }: { titulo: string; descricao: string; children: React.ReactNode }) {
  return (
    <div className={CARTAO}>
      <div className="pr-4">
        <p className="font-medium text-slate-900 dark:text-white">{titulo}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{descricao}</p>
      </div>
      {children}
    </div>
  );
}

function Interruptor({ ligado, onChange }: { ligado: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      onClick={() => onChange(!ligado)}
      className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${ligado ? "bg-emerald-500" : "bg-gray-300 dark:bg-slate-600"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${ligado ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

const NotificacoesConfig: React.FC = () => {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationSettings | null>(null);
  const [boards, setBoards] = useState<{ id: number; name: string }[]>([]);

  const papel = user?.role;
  const vendas = papel === "salesperson" || papel === "sdr" || papel === "admin" || papel === "manager";
  const servico = papel === "service" || papel === "admin" || papel === "manager";

  useEffect(() => {
    userService.getNotificationSettings().then(setPrefs).catch(() => showError("Não foi possível carregar suas preferências"));
    if (servico) {
      serviceBoardService.list({ page_size: 50 }).then((r) => setBoards(r.boards)).catch(() => {});
    }
  }, [servico]);

  const salvar = async (mudanca: NotificationSettingsUpdate) => {
    try {
      setPrefs(await userService.updateNotificationSettings(mudanca));
      showSuccess("Preferência salva");
    } catch {
      showError("Não foi possível salvar");
    }
  };

  const alternar = async (chave: Chave, valor: boolean) => {
    if (chave === "popup_navegador" && valor && "Notification" in window && Notification.permission === "default") {
      const permissao = await Notification.requestPermission();
      if (permissao === "denied") showError("O navegador bloqueou os pop-ups. Libere nas configurações do navegador.");
    }
    salvar({ [chave]: valor });
  };

  const alternarBoard = (id: number, marcado: boolean) => {
    const atuais = new Set(prefs?.quadros_servico ?? []);
    if (marcado) atuais.add(id);
    else atuais.delete(id);
    salvar({ quadros_servico: Array.from(atuais).sort((a, b) => a - b) });
  };

  if (!prefs) {
    return <p className="text-sm text-slate-500">Carregando preferências...</p>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Notificações</h2>

      {vendas && (
        <section>
          <h3 className={TITULO}>Sempre ativos</h3>
          <div className="space-y-3">
            {[
              ["Novo lead do site", "Quando um lead chega pelo site e é distribuído para você"],
              ["Card atribuído a mim", "Quando outra pessoa, ou a distribuição automática, coloca você no card"],
            ].map(([titulo, descricao]) => (
              <Linha key={titulo} titulo={titulo} descricao={descricao}>
                <Lock size={18} className="text-slate-400" />
              </Linha>
            ))}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Estes não podem ser desligados: ignorados, deixam o cliente esperando.
            </p>
          </div>
        </section>
      )}

      {vendas && (
        <section>
          <h3 className={TITULO}>Vendas</h3>
          <div className="space-y-3">
            <Linha titulo="Tarefa criada para mim" descricao="Quando outra pessoa cria ou passa uma tarefa para você">
              <Interruptor ligado={prefs.task_assigned} onChange={(v) => alternar("task_assigned", v)} />
            </Linha>
            <Linha titulo="Produto no meu card" descricao="Quando outra pessoa adiciona ou remove produto de um card seu">
              <Interruptor ligado={prefs.card_product_changed} onChange={(v) => alternar("card_product_changed", v)} />
            </Linha>
            <Linha titulo="Gravação e análise da reunião" descricao="Quando a gravação ou a análise de uma reunião sua fica pronta">
              <Interruptor ligado={prefs.reuniao_pronta} onChange={(v) => alternar("reuniao_pronta", v)} />
            </Linha>
          </div>
        </section>
      )}

      <section>
        <h3 className={TITULO}>Lembretes</h3>
        <div className="space-y-3">
          <Linha titulo="Resumo da manhã" descricao="Às 8h, de segunda a sexta: o que você tem para hoje e o que está atrasado">
            <Interruptor ligado={prefs.resumo_manha} onChange={(v) => alternar("resumo_manha", v)} />
          </Linha>
          {vendas && (
            <Linha titulo="Reunião em 15 minutos" descricao="Aviso 15 minutos antes de cada reunião sua">
              <Interruptor ligado={prefs.reuniao_15min} onChange={(v) => alternar("reuniao_15min", v)} />
            </Linha>
          )}
        </div>
      </section>

      {servico && boards.length > 0 && (
        <section>
          <h3 className={TITULO}>Serviço — avisar card novo em</h3>
          <div className="space-y-3">
            {boards.map((b) => (
              <Linha key={b.id} titulo={b.name} descricao="Cards que chegam do GestorHS ou criados por outra pessoa">
                <Interruptor
                  ligado={prefs.quadros_servico.includes(b.id)}
                  onChange={(v) => alternarBoard(b.id, v)}
                />
              </Linha>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className={TITULO}>Canal</h3>
        <Linha titulo="Pop-up do navegador" descricao="Além do sino, mostra um aviso do navegador quando chega algo novo">
          <Interruptor ligado={prefs.popup_navegador} onChange={(v) => alternar("popup_navegador", v)} />
        </Linha>
      </section>
    </div>
  );
};

export default NotificacoesConfig;
```

- [ ] **Step 2: Ligar na página** — em `frontend/src/pages/Settings.tsx`:

1. Import: `import NotificacoesConfig from "../components/settings/NotificacoesConfig";`
2. Apagar o estado `const [notificationSettings, setNotificationSettings] = useState({ ... });` (bloco "Estados das Notificações") e a função `handleSaveNotifications` inteira.
3. Trocar a aba inteira — do `{activeTab === "notifications" && (` até a linha **anterior** a `{activeTab === "security" && (` — por:

```tsx
            {activeTab === "notifications" && <NotificacoesConfig />}

```

Para fazer o passo 3 sem erro de contagem, conferir antes as linhas de início e fim:
Run: `grep -n 'activeTab === "notifications"\|activeTab === "security"' frontend/src/pages/Settings.tsx`
Expected: duas linhas (hoje ~1400 e ~1652). Apagar do início até `fim - 1`.

4. Run: `grep -n "notificationSettings\|handleSaveNotifications" frontend/src/pages/Settings.tsx`
Expected: nenhuma linha.

- [ ] **Step 3: TypeScript e build**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.json && npm run build 2>&1 | tail -3`
Expected: `tsc` sem saída; build `✓ built`. Remover imports sem uso que o `tsc` apontar em `Settings.tsx`.

- [ ] **Step 4: Commit** (perguntar antes)

```bash
git add frontend/src/components/settings/NotificacoesConfig.tsx frontend/src/pages/Settings.tsx
git commit -m "feat(notificacoes): Configuracoes > Notificacoes salva de verdade e mostra o que vale para o perfil"
```

---

### Task 15: Fechamento — suíte, changelog e roteiro do homo

**Files:**
- Modify: `CHANGELOG.md`, `frontend/src/components/common/ChangelogModal.tsx`, `frontend/src/layouts/MainLayout.tsx` (versão nos três — regra do projeto)

- [ ] **Step 1: Suíte completa**

Run: `... python -m pytest tests/ -q -p no:cacheprovider --color=no 2>&1 | tail -5`
Expected: todos passando (732 de antes + os novos). Falha em teste antigo que contava notificação pelo tipo velho (`card_assigned`, `task_assigned`, `meeting_recording`): atualizar o tipo esperado para o novo, nunca o código.

- [ ] **Step 2: Versão 1.10.15** (a 1.10.14 está no main e ainda não foi para produção; sobem juntas)

`CHANGELOG.md`, antes de `## [1.10.14]`:

```markdown
## [1.10.15] — DD/MM/2026 (o dia em que esta tarefa for feita)

### Adicionado
- **Novo lead do site em destaque:** o lead que chega pelo site sai como "Novo lead do site: <nome>", verde e com ícone próprio no sino — antes vinha com o mesmo título genérico de "Card atribuído" e era lido em 0–22% das vezes.
- **Resumo da manhã:** às 8h, de segunda a sexta, um aviso com o dia de cada um ("Hoje: 4 ligações, 1 reunião · 12 atrasadas"). Vale para Vendas e Serviço.
- **Reunião em 15 minutos:** aviso antes de cada reunião agendada.
- **Serviço recebe avisos:** card novo nos boards acompanhados, agrupado quando chegam vários ("101 cards novos em Cobrança").
- **Configurações > Notificações funcionando:** cada botão salva ao clicar; "Novo lead do site" e "Card atribuído" são obrigatórios; dá para escolher quais boards de Serviço acompanhar e desligar o pop-up do navegador.

### Corrigido
- **Fim do aviso da própria ação:** criar um card para si mesmo, se atribuir ou mexer no próprio card não gera mais aviso — era a maior parte do que chegava no sino.
- **Lembretes que nunca funcionaram** (card vencido, tarefa vencendo) saíram; os novos rodam no próprio servidor.
- **O sino não mostra mais notificações falsas** quando o servidor não responde.

### Alterado
- **Sino limpo na atualização:** as notificações antigas foram marcadas como lidas. Lidas somem depois de 30 dias.
```

`ChangelogModal.tsx`: no topo do array `const CHANGELOG: ChangelogVersion[] = [`, antes da entrada `version: "1.10.14"`:

```tsx
  {
    version: "1.10.15",
    date: "DD/MM/2026",
    entries: [
      {
        type: "feature",
        text: "Notificações — o lead que chega pelo site agora aparece em destaque no sino (\"Novo lead do site\"), e chegam dois lembretes novos: o resumo do dia às 8h e o aviso 15 minutos antes de cada reunião.",
      },
      {
        type: "feature",
        text: "Serviço recebe aviso de card novo nos boards que acompanha (agrupado quando chegam vários), e a tela Configurações > Notificações passou a funcionar de verdade: cada botão salva ao clicar.",
      },
      {
        type: "fix",
        text: "Você não recebe mais aviso do que você mesmo fez (como criar um card para si), e o sino não mostra mais notificações falsas quando o servidor não responde. As notificações antigas foram marcadas como lidas.",
      },
    ],
  },
```

`MainLayout.tsx`: `HSGrowth CRM v1.10.14` → `HSGrowth CRM v1.10.15`.

Run: `cd frontend && npx tsc --noEmit -p tsconfig.json` — Expected: sem saída.

- [ ] **Step 3: Commit** (perguntar antes)

```bash
git add CHANGELOG.md frontend/src/components/common/ChangelogModal.tsx frontend/src/layouts/MainLayout.tsx
git commit -m "chore: changelog v1.10.15 (notificacoes)"
```

- [ ] **Step 4: Roteiro do homo (entregar ao usuário — ele faz deploy e testa)**

Deploy no homo + `alembic upgrade head` lá (aplica `e9f0a1b2c3d4`). Depois:

1. **Sino zerado:** entrar com um vendedor que tinha notificações acumuladas → contador zero.
2. **Própria ação:** como vendedor, criar um card para si → nenhum aviso.
3. **Card atribuído:** como admin, criar um card com outro vendedor → o vendedor recebe "Card atribuído a você".
4. **Lead do site:** criar um card pela integração (ou com o token do usuário `integracao`) → vendedor recebe "Novo lead do site: ..." em verde; não chega "Card atribuído" junto.
5. **Reunião em 15 min:** agendar reunião para daqui a 17 minutos → aviso em ~2 minutos, uma vez só.
6. **Card novo de Serviço:** criar um card manual em Cobrança com a Letícia → André recebe, Letícia não.
7. **Configurações:** desligar "Resumo da manhã", recarregar → continua desligado; tentar achar botão para "Novo lead do site" → só o cadeado.
8. **Pop-up:** desligar "Pop-up do navegador" → novo aviso chega só no sino.
9. **Resumo:** no dia seguinte às 8h, conferir o resumo de um vendedor e de alguém de Serviço.

Produção: mesmo deploy + `alembic upgrade head` (conferir antes `alembic current` = `d8e9f0a1b2c3`).
