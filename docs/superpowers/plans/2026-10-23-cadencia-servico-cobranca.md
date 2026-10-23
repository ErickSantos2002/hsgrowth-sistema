# Cadência no board Serviço - Cobrança — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cadência de toques (WhatsApp, ligação, e-mail) nos cards do board 2, em que concluir um toque cria o próximo em dia útil, com toque condicional, parada automática e ligação de reabertura após Perdido.

**Architecture:** Reaproveita os modelos de cadência de Vendas (`CadenceTemplate`/`CadenceStep`, agora com `escopo`) e cria a instância própria do Serviço (`ServiceCardCadence`), ligada às `ServiceCardActivity` por FK. Toda a regra fica em `CadenciaServicoService`; `ServiceBoardService` só chama os ganchos ao concluir atividade e ao mover card. No frontend, a seção de cadência de Vendas passa a receber um "adaptador" de API e é reutilizada no card de Serviço.

**Tech Stack:** FastAPI + SQLAlchemy + Alembic, pytest (SQLite em memória), React + TypeScript.

**Spec:** `docs/superpowers/specs/2026-10-23-cadencia-servico-cobranca-design.md`

---

## Como rodar

```bash
cd backend
MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest tests/unit/<arquivo>.py -q -p no:cacheprovider --color=no
cd frontend && npx tsc --noEmit -p tsconfig.json
```

- Editar com Edit/Write, não com scripts no terminal (o terminal corrompe acentos).
- **O Docker local aponta para o banco de PRODUÇÃO.** Não rodar `alembic upgrade` sem confirmação do usuário. Até a migration rodar, o container local vai dar erro ao ler `cadence_templates` (coluna nova): os testes usam SQLite e não são afetados.
- Datas do Serviço são UTC sem fuso (`datetime.utcnow()`). Brasília = UTC−3.
- Não commitar sem perguntar. A reconexão automática da reunião (v1.10.19) está pendente e sem commit: não incluir os arquivos dela nos commits deste plano.

## Arquivos

| Arquivo | Papel |
|---|---|
| `backend/alembic/versions/2026_10_23_1000-c4d6e8f0a2b4_cadencia_servico.py` (novo) | Colunas, tabela e o modelo de 8 toques |
| `backend/app/models/cadence.py` | `escopo`, `reabertura_dias`, `somente_sem_resposta` |
| `backend/app/models/service_card_cadence.py` (novo) | Instância da cadência no card de Serviço |
| `backend/app/models/service_card_activity.py` | FK `service_card_cadence_id` |
| `backend/app/models/__init__.py` | Registrar o modelo novo |
| `backend/app/utils/business_days.py` | `proximo_dia_util`, `somar_dias_uteis` |
| `backend/app/services/cadencia_servico_service.py` (novo) | Toda a regra da cadência de Serviço |
| `backend/app/services/service_board_service.py` | Ganchos em `complete_activity` e `move_card` |
| `backend/app/schemas/cadence.py` | Campos novos + `ServiceCardCadenceResponse` |
| `backend/app/schemas/service_board.py` | `respondeu` em `ServiceCardActivityComplete` |
| `backend/app/services/cadence_service.py` | Gravar campos novos; filtrar por escopo; Vendas só com modelo de Vendas |
| `backend/app/api/v1/endpoints/cadences.py` | `escopo` na listagem |
| `backend/app/api/v1/endpoints/service_boards.py` | Rotas da cadência; `respondeu` no complete |
| `backend/tests/unit/test_cadencia_servico.py` (novo) | Testes |
| `frontend/src/services/cadenceService.ts` | Tipos novos + adaptadores de API |
| `frontend/src/components/settings/CadenceTemplateManager.tsx` | "Vale para", condicional, reabertura |
| `frontend/src/components/cardDetails/CadenceSection.tsx` | Prop `api` (reuso no Serviço) |
| `frontend/src/pages/ServiceCardDetails.tsx` | Seção Cadência no board 2 |
| `frontend/src/services/serviceActivityService.ts` | `respondeu` no complete |
| `frontend/src/components/service/ServiceActivityTab.tsx` | Pergunta "O cliente respondeu?" |

---

### Task 1: Banco — modelos e migration

**Files:** Create `backend/app/models/service_card_cadence.py`, `backend/alembic/versions/2026_10_23_1000-c4d6e8f0a2b4_cadencia_servico.py`; Modify `backend/app/models/cadence.py`, `backend/app/models/service_card_activity.py`, `backend/app/models/__init__.py`

- [ ] **Step 1:** Em `app/models/cadence.py`, na classe `CadenceTemplate`, depois de `is_active`:

```python
    # Onde o modelo vale: "vendas" (card de Vendas) ou "servico_cobranca"
    # (board Serviço - Cobrança). Cada tela só oferece os modelos do seu escopo.
    escopo = Column(String(30), nullable=False, default="vendas", server_default="vendas", index=True)
    # Só Serviço: ao marcar Perdido um card que teve cadência, agenda a
    # ligação de reabertura para daqui a N dias corridos. Vazio = não agenda.
    reabertura_dias = Column(Integer, nullable=True)
```

e na classe `CadenceStep`, depois de `scheduled_time`:

```python
    # Toque condicional: só acontece se o cliente NÃO respondeu o toque
    # anterior (ex.: ligação do D1 depois do WhatsApp sem resposta).
    somente_sem_resposta = Column(Boolean, nullable=False, default=False, server_default=sa_false())
```

com `from sqlalchemy import false as sa_false` junto dos imports do sqlalchemy no topo (conferir que `Boolean` já está importado).

- [ ] **Step 2:** `app/models/service_card_cadence.py`:

```python
"""
Cadência em andamento num card de Serviço (board Serviço - Cobrança).

Espelha CardCadence (Vendas), mas aponta para service_cards: o card de
Serviço é outro modelo e as atividades dele são ServiceCardActivity.
"""
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class ServiceCardCadence(Base):
    __tablename__ = "service_card_cadences"

    STATUS_ACTIVE = "active"
    STATUS_PAUSED = "paused"
    STATUS_COMPLETED = "completed"
    STATUS_CANCELLED = "cancelled"
    # Parou sozinha: o card saiu das etapas de contato (respondeu ou perdeu)
    STATUS_ENCERRADA = "encerrada"

    id = Column(Integer, primary_key=True, index=True)
    service_card_id = Column(Integer, ForeignKey("service_cards.id", ondelete="CASCADE"), nullable=False, index=True)
    template_id = Column(Integer, ForeignKey("cadence_templates.id", ondelete="RESTRICT"), nullable=False)
    started_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(20), nullable=False, default=STATUS_ACTIVE, index=True)
    current_step_order = Column(Integer, nullable=False, default=1)
    started_at = Column(DateTime, nullable=False, server_default=func.now())
    paused_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    motivo_encerramento = Column(String(120), nullable=True)

    template = relationship("CadenceTemplate")

    def __repr__(self):
        return f"<ServiceCardCadence(id={self.id}, card={self.service_card_id}, status={self.status})>"
```

- [ ] **Step 3:** Em `app/models/service_card_activity.py`, junto das outras colunas (antes dos campos de arquivo):

```python
    # Toque de cadência que gerou esta atividade (board Serviço - Cobrança)
    service_card_cadence_id = Column(
        Integer, ForeignKey("service_card_cadences.id", ondelete="SET NULL"), nullable=True, index=True
    )
```

(conferir que `ForeignKey` e `Integer` já estão importados no arquivo.)

- [ ] **Step 4:** Em `app/models/__init__.py`, depois da linha `from app.models.cadence import CadenceTemplate, CadenceStep, CardCadence`:

```python
from app.models.service_card_cadence import ServiceCardCadence
```

e acrescentar `"ServiceCardCadence",` na lista `__all__`, perto de `"ServiceCardActivity",`.

- [ ] **Step 5:** Migration `alembic/versions/2026_10_23_1000-c4d6e8f0a2b4_cadencia_servico.py`:

```python
"""cadencia no board Servico - Cobranca

Revision ID: c4d6e8f0a2b4
Revises: f0a1b2c3d4e5
Create Date: 2026-10-23 10:00:00

- cadence_templates.escopo ('vendas' | 'servico_cobranca') e reabertura_dias.
- cadence_steps.somente_sem_resposta (toque condicional).
- service_card_cadences: cadencia em andamento no card de Servico.
- service_card_activities.service_card_cadence_id.
- Modelo inicial de 8 toques (base com calibracao atrasada), editavel depois
  em Configuracoes > Cadencias.
"""
from alembic import op
import sqlalchemy as sa

revision = "c4d6e8f0a2b4"
down_revision = "f0a1b2c3d4e5"
branch_labels = None
depends_on = None

NOME_MODELO = "Cobrança — Base com calibração atrasada"

# (ordem, dia, tipo, condicional, titulo, descricao)
TOQUES = [
    (1, 1, "whatsapp", False, "WhatsApp — calibração vencida",
     "Aviso curto da calibração vencida + pedido de horário."),
    (2, 1, "call", True, "Ligação — calibração atrasada",
     "Gancho da calibração atrasada, abre diagnóstico."),
    (3, 3, "email", False, "E-mail — risco em auditoria",
     "Risco de aparelho irregular em auditoria + link para agendar."),
    (4, 6, "whatsapp", False, "WhatsApp — diagnóstico",
     "Pergunta de diagnóstico: o aparelho tem travado ou dado erro?"),
    (5, 8, "call", False, "Ligação — 2ª tentativa",
     "2ª tentativa em outro horário."),
    (6, 10, "email", False, "E-mail — plataforma",
     "Plataforma que lembra a calibração + outras unidades."),
    (7, 13, "whatsapp", False, "WhatsApp — última tentativa",
     "Tentativa final, se possível com outro contato (segurança ou compras)."),
    (8, 15, "call", False, "Ligação — encerramento",
     "Encerramento: \"fecho por aqui, me chama quando quiser calibrar\"."),
]


def upgrade() -> None:
    op.add_column("cadence_templates", sa.Column(
        "escopo", sa.String(30), nullable=False, server_default="vendas"))
    op.create_index("ix_cadence_templates_escopo", "cadence_templates", ["escopo"])
    op.add_column("cadence_templates", sa.Column("reabertura_dias", sa.Integer(), nullable=True))
    op.add_column("cadence_steps", sa.Column(
        "somente_sem_resposta", sa.Boolean(), nullable=False, server_default=sa.false()))

    op.create_table(
        "service_card_cadences",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("service_card_id", sa.Integer(),
                  sa.ForeignKey("service_cards.id", ondelete="CASCADE"), nullable=False),
        sa.Column("template_id", sa.Integer(),
                  sa.ForeignKey("cadence_templates.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("started_by_id", sa.Integer(),
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("current_step_order", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("started_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("paused_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("motivo_encerramento", sa.String(120), nullable=True),
    )
    op.create_index("ix_service_card_cadences_id", "service_card_cadences", ["id"])
    op.create_index("ix_service_card_cadences_service_card_id", "service_card_cadences", ["service_card_id"])
    op.create_index("ix_service_card_cadences_status", "service_card_cadences", ["status"])

    op.add_column("service_card_activities", sa.Column(
        "service_card_cadence_id", sa.Integer(),
        sa.ForeignKey("service_card_cadences.id", ondelete="SET NULL"), nullable=True))
    op.create_index("ix_service_card_activities_service_card_cadence_id",
                    "service_card_activities", ["service_card_cadence_id"])

    conn = op.get_bind()
    template_id = conn.execute(sa.text(
        "INSERT INTO cadence_templates (name, description, is_active, escopo, reabertura_dias, created_at, updated_at) "
        "VALUES (:n, :d, true, 'servico_cobranca', 90, now(), now()) RETURNING id"
    ), {"n": NOME_MODELO,
        "d": "8 toques em 3 semanas: WhatsApp, ligação e e-mail. Perdido reabre em 90 dias."}).scalar()
    for ordem, dia, tipo, condicional, titulo, descricao in TOQUES:
        conn.execute(sa.text(
            "INSERT INTO cadence_steps (template_id, \"order\", day_offset, activity_type, title, description, "
            "priority, somente_sem_resposta) VALUES (:t, :o, :d, :a, :ti, :de, 'normal', :c)"
        ), {"t": template_id, "o": ordem, "d": dia, "a": tipo, "ti": titulo, "de": descricao, "c": condicional})


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("DELETE FROM cadence_templates WHERE escopo = 'servico_cobranca'"))
    op.drop_index("ix_service_card_activities_service_card_cadence_id", "service_card_activities")
    op.drop_column("service_card_activities", "service_card_cadence_id")
    op.drop_table("service_card_cadences")
    op.drop_column("cadence_steps", "somente_sem_resposta")
    op.drop_column("cadence_templates", "reabertura_dias")
    op.drop_index("ix_cadence_templates_escopo", "cadence_templates")
    op.drop_column("cadence_templates", "escopo")
```

- [ ] **Step 6:** Conferir o SQL sem tocar no banco (modo offline):

```bash
MSYS_NO_PATHCONV=1 docker exec -w /app hsgrowth-api-local alembic upgrade f0a1b2c3d4e5:c4d6e8f0a2b4 --sql | tail -40
```

Expected: `ALTER TABLE cadence_templates ADD COLUMN escopo ...`, `CREATE TABLE service_card_cadences ...` e os `INSERT`. Se o `env.py` não suportar modo offline, pular este passo e anotar.

- [ ] **Step 7:** Rodar a suíte inteira (os modelos novos entram no `create_all` dos testes). Expected: tudo passando (841+).

- [ ] **Step 8: Commit** (perguntar antes)

```bash
git add backend/app/models/cadence.py backend/app/models/service_card_cadence.py backend/app/models/service_card_activity.py backend/app/models/__init__.py backend/alembic/versions/2026_10_23_1000-c4d6e8f0a2b4_cadencia_servico.py
git commit -m "feat(cadencia-servico): tabelas, campos novos e modelo de 8 toques"
```

---

### Task 2: Dias úteis

**Files:** Modify `backend/app/utils/business_days.py`; Test `backend/tests/unit/test_cadencia_servico.py`

- [ ] **Step 1: Teste que falha** — criar `tests/unit/test_cadencia_servico.py`:

```python
"""
Cadência no board Serviço - Cobrança (spec 2026-10-23).

8 toques em 3 semanas; concluir um toque cria o próximo N dias úteis depois
da conclusão (N = diferença entre os dias do modelo); nunca sábado/domingo.
"""
from datetime import date

from app.utils.business_days import proximo_dia_util, somar_dias_uteis

SEG, QUA, SEX, SAB = date(2026, 10, 26), date(2026, 10, 28), date(2026, 10, 30), date(2026, 10, 31)


def test_dia_util_seguinte():
    assert proximo_dia_util(SEG) == SEG
    assert proximo_dia_util(SAB) == date(2026, 11, 2)


def test_somar_dias_uteis():
    assert somar_dias_uteis(SEG, 0) == SEG
    assert somar_dias_uteis(SEG, 2) == QUA
    assert somar_dias_uteis(QUA, 3) == date(2026, 11, 2)      # qua + 3 = seg
    assert somar_dias_uteis(SEX, 2) == date(2026, 11, 3)      # sex + 2 = ter
    assert somar_dias_uteis(SAB, 0) == date(2026, 11, 2)      # sábado vira segunda
```

- [ ] **Step 2:** Rodar — Expected: ImportError.

- [ ] **Step 3:** Em `app/utils/business_days.py`, acrescentar no fim (e `date` no import de `datetime`: `from datetime import date, datetime, timedelta, timezone`):

```python
def proximo_dia_util(dia: date) -> date:
    """O próprio dia, se for de segunda a sexta; senão a segunda seguinte."""
    while dia.weekday() >= 5:
        dia += timedelta(days=1)
    return dia


def somar_dias_uteis(dia: date, dias: int) -> date:
    """`dias` dias úteis depois de `dia` (0 = o próprio dia, ou a segunda se
    cair no fim de semana). Usado pela cadência de Serviço: qua + 3 = seg."""
    atual = dia
    restantes = dias
    while restantes > 0:
        atual += timedelta(days=1)
        if atual.weekday() < 5:
            restantes -= 1
    return proximo_dia_util(atual)
```

- [ ] **Step 4:** Rodar — Expected: 2 passed.

- [ ] **Step 5: Commit** (perguntar antes) — `git add backend/app/utils/business_days.py backend/tests/unit/test_cadencia_servico.py` · `feat(cadencia-servico): soma de dias uteis`

---

### Task 3: Schemas e modelos de cadência com escopo

**Files:** Modify `backend/app/schemas/cadence.py`, `backend/app/services/cadence_service.py`, `backend/app/api/v1/endpoints/cadences.py`; Test `backend/tests/unit/test_cadencia_servico.py`

- [ ] **Step 1: Testes que falham** — acrescentar em `test_cadencia_servico.py`:

```python
import pytest
from fastapi import HTTPException

from app.models.cadence import CadenceStep, CadenceTemplate
from app.models.card import Card
from app.services.cadence_service import CadenceService


def criar_modelo(db, escopo="servico_cobranca", reabertura_dias=90):
    """O modelo de 8 toques da migration, para os testes (SQLite não roda migration)."""
    t = CadenceTemplate(name=f"Modelo {escopo}", is_active=True, escopo=escopo, reabertura_dias=reabertura_dias)
    db.add(t)
    db.flush()
    toques = [(1, 1, "whatsapp", False), (2, 1, "call", True), (3, 3, "email", False),
              (4, 6, "whatsapp", False), (5, 8, "call", False), (6, 10, "email", False),
              (7, 13, "whatsapp", False), (8, 15, "call", False)]
    for ordem, dia, tipo, cond in toques:
        db.add(CadenceStep(template_id=t.id, order=ordem, day_offset=dia, activity_type=tipo,
                           title=f"Toque {ordem}", priority="normal", somente_sem_resposta=cond))
    db.commit()
    db.refresh(t)
    return t


def test_listagem_por_escopo(db):
    criar_modelo(db, "vendas")
    criar_modelo(db, "servico_cobranca")

    assert [t.escopo for t in CadenceService(db).list_templates(escopo="vendas")] == ["vendas"]
    assert len(CadenceService(db).list_templates()) == 2


def test_api_cria_modelo_de_servico_com_condicional(client, admin_headers):
    r = client.post("/api/v1/cadences/templates", headers=admin_headers, json={
        "name": "Cobrança", "escopo": "servico_cobranca", "reabertura_dias": 90,
        "steps": [
            {"order": 1, "day_offset": 1, "activity_type": "whatsapp", "title": "Zap"},
            {"order": 2, "day_offset": 1, "activity_type": "call", "title": "Liga",
             "somente_sem_resposta": True},
        ],
    })

    assert r.status_code == 201, r.text
    assert r.json()["escopo"] == "servico_cobranca"
    assert r.json()["reabertura_dias"] == 90
    assert [s["somente_sem_resposta"] for s in r.json()["steps"]] == [False, True]


def test_card_de_vendas_nao_inicia_modelo_de_servico(db, test_card, test_admin_user):
    modelo = criar_modelo(db, "servico_cobranca")

    with pytest.raises(HTTPException) as exc:
        CadenceService(db).start(test_card.id, modelo.id, test_admin_user)

    assert exc.value.status_code == 400
```

(conferir o status code de criação em `cadences.py` — se o POST de template não for 201, ajustar o assert para o que o endpoint declara.)

- [ ] **Step 2:** Rodar — Expected: falham (`escopo` desconhecido / `list_templates` sem parâmetro).

- [ ] **Step 3: Schemas** — em `app/schemas/cadence.py`:
  - topo: `from typing import Literal, Optional, List` e `CadenceEscopo = Literal["vendas", "servico_cobranca"]`;
  - em `CadenceStepBase`, depois de `scheduled_time`: `somente_sem_resposta: bool = Field(False, description="Só acontece se o cliente não respondeu o toque anterior")`;
  - em `CadenceTemplateCreate`: `escopo: CadenceEscopo = "vendas"` e `reabertura_dias: Optional[int] = Field(None, ge=1, le=365)`;
  - em `CadenceTemplateUpdate`: `escopo: Optional[CadenceEscopo] = None` e `reabertura_dias: Optional[int] = Field(None, ge=1, le=365)`;
  - em `CadenceTemplateResponse`: `escopo: str = "vendas"` e `reabertura_dias: Optional[int] = None`;
  - no fim do arquivo:

```python
class ServiceCardCadenceResponse(BaseModel):
    """Mesmo formato de CardCadenceResponse — a tela do card reaproveita o
    componente de Vendas. `card_id` é o id do card de Serviço."""
    id: int
    card_id: int
    template_id: int
    template_name: str
    started_by_id: Optional[int]
    status: str
    current_step_order: int
    total_steps: int
    started_at: datetime
    paused_at: Optional[datetime]
    completed_at: Optional[datetime]
    motivo_encerramento: Optional[str] = None
    current_step: Optional[CadenceStepResponse]
    previous_step: Optional[CadenceStepResponse]
```

- [ ] **Step 4: Service** — em `app/services/cadence_service.py`:

`list_templates`:

```python
    def list_templates(self, only_active: bool = False, escopo: Optional[str] = None):
        q = self.db.query(CadenceTemplate)
        if only_active:
            q = q.filter(CadenceTemplate.is_active == True)
        if escopo:
            q = q.filter(CadenceTemplate.escopo == escopo)
        return q.order_by(CadenceTemplate.name).all()
```

`create_template`: no `CadenceTemplate(...)` acrescentar `escopo=data.escopo, reabertura_dias=data.reabertura_dias,`; no `CadenceStep(...)` (nos DOIS lugares, create e update) acrescentar `somente_sem_resposta=step_data.somente_sem_resposta,`.

`update_template`, depois de `if data.is_active is not None: ...`:

```python
        if data.escopo is not None:
            template.escopo = data.escopo
        if "reabertura_dias" in data.model_fields_set:
            template.reabertura_dias = data.reabertura_dias
```

`delete_template`, antes de `self.db.delete(template)`:

```python
        from app.models.service_card_cadence import ServiceCardCadence
        ativas_servico = self.db.query(ServiceCardCadence).filter(
            ServiceCardCadence.template_id == template_id,
        ).count()
        if ativas_servico > 0:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=400,
                detail="Não é possível excluir: o modelo já foi usado em cards de Serviço. Desative-o.",
            )
```

`start`, depois de `if not template.is_active: ...`:

```python
        if template.escopo != "vendas":
            raise HTTPException(status_code=400, detail="Este modelo é de Serviço - Cobrança.")
```

- [ ] **Step 5: Endpoint** — em `cadences.py`, `list_templates` ganha `escopo: Optional[str] = None` (importar `Optional` de `typing`) e passa `escopo=escopo` para `CadenceService(db).list_templates(...)`.

- [ ] **Step 6:** Rodar `test_cadencia_servico.py` — Expected: tudo passa.

- [ ] **Step 7: Commit** (perguntar antes) — `git add backend/app/schemas/cadence.py backend/app/services/cadence_service.py backend/app/api/v1/endpoints/cadences.py backend/tests/unit/test_cadencia_servico.py` · `feat(cadencia): escopo vendas/servico, toque condicional e reabertura no modelo`

---

### Task 4: Iniciar, pausar, retomar, cancelar

**Files:** Create `backend/app/services/cadencia_servico_service.py`; Test `backend/tests/unit/test_cadencia_servico.py`

- [ ] **Step 1: Testes que falham** — acrescentar:

```python
from datetime import datetime, timedelta

from app.models.service_board import ServiceBoard
from app.models.service_card import ServiceCard
from app.models.service_card_activity import ServiceCardActivity
from app.models.service_card_cadence import ServiceCardCadence
from app.models.service_list import ServiceList
from app.services import cadencia_servico_service as mod
from app.services.cadencia_servico_service import CadenciaServicoService


@pytest.fixture
def cobranca(db):
    """Boards 1 (Serviços) e 2 (Cobrança) — a cadência só vale no 2."""
    servicos = ServiceBoard(name="Serviços")
    db.add(servicos)
    db.commit()
    board = ServiceBoard(name="Serviço - Cobrança")
    db.add(board)
    db.commit()
    assert board.id == 2
    listas = {}
    for pos, (nome, extra) in enumerate([
        ("Oportunidade Existente", {"is_entry_stage": True}), ("Tentativa de Contato", {}),
        ("Proposta", {}), ("Operações", {}), ("Negócio Ganho", {"is_done_stage": True}),
        ("Negócio Perdido", {}),
    ]):
        lst = ServiceList(board_id=board.id, name=nome, position=pos, **extra)
        db.add(lst)
        listas[nome] = lst
    lista_servicos = ServiceList(board_id=servicos.id, name="Entrada", position=0, is_entry_stage=True)
    db.add(lista_servicos)
    db.commit()
    return SimpleNamespace(board=board, listas=listas, lista_servicos=lista_servicos)


def card_em(db, lista, responsavel=None):
    c = ServiceCard(list_id=lista.id, title="Cliente com calibração vencida", position=0,
                    assigned_to_id=responsavel.id if responsavel else None)
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


def pendentes(db, card):
    return db.query(ServiceCardActivity).filter(
        ServiceCardActivity.service_card_id == card.id,
        ServiceCardActivity.category == "atividade",
        ServiceCardActivity.is_completed == False,  # noqa: E712
    ).all()


@pytest.fixture
def segunda(monkeypatch):
    """Hoje em Brasília = segunda 26/10/2026."""
    monkeypatch.setattr(mod, "_hoje_brasilia", lambda: SEG)


def test_iniciar_cria_o_primeiro_toque_para_hoje(db, cobranca, test_salesperson_user, segunda):
    modelo = criar_modelo(db)
    card = card_em(db, cobranca.listas["Oportunidade Existente"], test_salesperson_user)

    cad = CadenciaServicoService(db).iniciar(card, modelo.id, test_salesperson_user)

    [toque] = pendentes(db, card)
    assert cad.status == "active" and cad.current_step_order == 1
    assert toque.activity_type == "whatsapp"
    assert toque.service_card_cadence_id == cad.id
    assert toque.user_id == test_salesperson_user.id
    assert (toque.due_date - mod.FUSO_BRASILIA).date() == SEG
    assert toque.activity_metadata == {"cadencia_etapa": 1, "pergunta_respondeu": True}


def test_nao_inicia_fora_da_cobranca(db, cobranca, test_admin_user):
    card = card_em(db, cobranca.lista_servicos)

    with pytest.raises(HTTPException) as exc:
        CadenciaServicoService(db).iniciar(card, criar_modelo(db).id, test_admin_user)

    assert exc.value.status_code == 400


def test_nao_inicia_com_modelo_de_vendas(db, cobranca, test_admin_user):
    card = card_em(db, cobranca.listas["Oportunidade Existente"])

    with pytest.raises(HTTPException):
        CadenciaServicoService(db).iniciar(card, criar_modelo(db, "vendas").id, test_admin_user)


def test_uma_cadencia_por_vez(db, cobranca, test_admin_user, segunda):
    modelo = criar_modelo(db)
    card = card_em(db, cobranca.listas["Oportunidade Existente"])
    svc = CadenciaServicoService(db)
    svc.iniciar(card, modelo.id, test_admin_user)

    with pytest.raises(HTTPException):
        svc.iniciar(card, modelo.id, test_admin_user)


def test_retomar_recria_o_toque_se_nao_houver_pendente(db, cobranca, test_admin_user, segunda):
    card = card_em(db, cobranca.listas["Oportunidade Existente"])
    svc = CadenciaServicoService(db)
    svc.iniciar(card, criar_modelo(db).id, test_admin_user)
    svc.pausar(card.id)
    for a in pendentes(db, card):
        db.delete(a)
    db.commit()

    svc.retomar(card.id, test_admin_user)

    assert len(pendentes(db, card)) == 1
```

e no topo do arquivo `from types import SimpleNamespace`.

- [ ] **Step 2:** Rodar — Expected: ImportError (`cadencia_servico_service`).

- [ ] **Step 3:** `app/services/cadencia_servico_service.py` (primeira parte — os ganchos vêm nas Tasks 5 e 6):

```python
"""
Cadência no board Serviço - Cobrança (spec 2026-10-23).

Concluir um toque cria o próximo N dias úteis depois da conclusão, onde N é
a diferença entre os dias do modelo (D3 → D6 = 3). Toque marcado
"somente_sem_resposta" é pulado quando o cliente respondeu o anterior. Sair
das etapas de contato encerra a cadência; Perdido agenda a ligação de
reabertura.

Os modelos são os mesmos de Vendas (CadenceTemplate), com escopo
"servico_cobranca"; a instância é ServiceCardCadence.
"""
from datetime import date, datetime, timedelta
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.cadence import CadenceStep, CadenceTemplate
from app.models.service_card import ServiceCard
from app.models.service_card_activity import ServiceCardActivity
from app.models.service_card_cadence import ServiceCardCadence
from app.models.service_list import ServiceList
from app.models.user import User
from app.schemas.cadence import CadenceStepResponse, ServiceCardCadenceResponse
from app.utils.business_days import proximo_dia_util, somar_dias_uteis

BOARD_COBRANCA_ID = 2
ESCOPO = "servico_cobranca"
# Datas do Serviço são UTC sem fuso; o dia e o horário do toque são de Brasília.
FUSO_BRASILIA = timedelta(hours=3)
HORARIO_PADRAO = "09:00"
TITULO_REABERTURA = "Ligação de reabertura"
DESCRICAO_REABERTURA = "Reabra a cadência com um novo gancho: próxima calibração ou estado do aparelho."
ABERTAS = (ServiceCardCadence.STATUS_ACTIVE, ServiceCardCadence.STATUS_PAUSED)


def _hoje_brasilia() -> date:
    return (datetime.utcnow() - FUSO_BRASILIA).date()


def _vencimento(dia: date, horario: Optional[str]) -> datetime:
    """Dia + horário de Brasília → UTC sem fuso, como o resto do Serviço."""
    try:
        hora, minuto = map(int, (horario or HORARIO_PADRAO).split(":"))
    except ValueError:
        hora, minuto = 9, 0
    return datetime(dia.year, dia.month, dia.day, hora, minuto) + FUSO_BRASILIA


def _nome(lista: ServiceList) -> str:
    return (lista.name or "").strip().lower()


def e_etapa_de_contato(lista: ServiceList) -> bool:
    """Oportunidade Existente (entrada) e Tentativa de Contato: mover entre
    elas não encerra a cadência."""
    return bool(lista.is_entry_stage) or _nome(lista) == "tentativa de contato"


def e_perdido(lista: ServiceList) -> bool:
    """Por flag ou por nome — as listas nem sempre têm a flag."""
    return bool(lista.is_lost_stage) or "perdido" in _nome(lista)


class CadenciaServicoService:
    def __init__(self, db: Session):
        self.db = db

    # ── Consulta ─────────────────────────────────────────────────────────────

    def _passos(self, template: CadenceTemplate) -> List[CadenceStep]:
        return sorted(template.steps, key=lambda s: s.order)

    def _passo(self, template: CadenceTemplate, ordem: int) -> Optional[CadenceStep]:
        return next((s for s in template.steps if s.order == ordem), None)

    def _passo_seguinte(self, template: CadenceTemplate, ordem: int) -> Optional[CadenceStep]:
        return next((s for s in self._passos(template) if s.order > ordem), None)

    def cadencia_aberta(self, card_id: int) -> Optional[ServiceCardCadence]:
        return (
            self.db.query(ServiceCardCadence)
            .filter(ServiceCardCadence.service_card_id == card_id, ServiceCardCadence.status.in_(ABERTAS))
            .order_by(ServiceCardCadence.id.desc())
            .first()
        )

    def ultima_cadencia(self, card_id: int) -> Optional[ServiceCardCadence]:
        return (
            self.db.query(ServiceCardCadence)
            .filter(ServiceCardCadence.service_card_id == card_id)
            .order_by(ServiceCardCadence.id.desc())
            .first()
        )

    def resposta(self, cad: ServiceCardCadence) -> ServiceCardCadenceResponse:
        atual = self._passo(cad.template, cad.current_step_order)
        anterior = self._passo(cad.template, cad.current_step_order - 1)
        return ServiceCardCadenceResponse(
            id=cad.id,
            card_id=cad.service_card_id,
            template_id=cad.template_id,
            template_name=cad.template.name,
            started_by_id=cad.started_by_id,
            status=cad.status,
            current_step_order=cad.current_step_order,
            total_steps=len(cad.template.steps),
            started_at=cad.started_at,
            paused_at=cad.paused_at,
            completed_at=cad.completed_at,
            motivo_encerramento=cad.motivo_encerramento,
            current_step=CadenceStepResponse.model_validate(atual) if atual else None,
            previous_step=CadenceStepResponse.model_validate(anterior) if anterior else None,
        )

    # ── Ações do card ────────────────────────────────────────────────────────

    def iniciar(self, card: ServiceCard, template_id: int, user: Optional[User]) -> ServiceCardCadence:
        lista = self.db.get(ServiceList, card.list_id)
        if not lista or lista.board_id != BOARD_COBRANCA_ID:
            raise HTTPException(status_code=400, detail="A cadência de Serviço só existe no board Serviço - Cobrança.")
        if self.cadencia_aberta(card.id):
            raise HTTPException(status_code=400, detail="Este card já tem uma cadência em andamento.")
        template = self.db.get(CadenceTemplate, template_id)
        if not template or template.escopo != ESCOPO:
            raise HTTPException(status_code=400, detail="Escolha um modelo de cadência de Serviço - Cobrança.")
        if not template.is_active:
            raise HTTPException(status_code=400, detail="Este modelo de cadência está desativado.")
        passos = self._passos(template)
        if not passos:
            raise HTTPException(status_code=400, detail="Este modelo não tem toques.")

        cad = ServiceCardCadence(
            service_card_id=card.id,
            template_id=template.id,
            started_by_id=user.id if user else None,
            status=ServiceCardCadence.STATUS_ACTIVE,
            current_step_order=passos[0].order,
            started_at=datetime.utcnow(),
        )
        self.db.add(cad)
        self.db.flush()
        self._criar_toque(cad, card, passos[0], proximo_dia_util(_hoje_brasilia()), user)
        self.db.commit()
        self.db.refresh(cad)
        return cad

    def pausar(self, card_id: int) -> ServiceCardCadence:
        cad = self._aberta_ou_404(card_id)
        if cad.status != ServiceCardCadence.STATUS_ACTIVE:
            raise HTTPException(status_code=400, detail="A cadência não está ativa.")
        cad.status = ServiceCardCadence.STATUS_PAUSED
        cad.paused_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(cad)
        return cad

    def retomar(self, card_id: int, user: Optional[User]) -> ServiceCardCadence:
        cad = self._aberta_ou_404(card_id)
        if cad.status != ServiceCardCadence.STATUS_PAUSED:
            raise HTTPException(status_code=400, detail="A cadência não está pausada.")
        cad.status = ServiceCardCadence.STATUS_ACTIVE
        cad.paused_at = None
        passo = self._passo(cad.template, cad.current_step_order)
        if passo and not self._pendentes(cad):
            card = self.db.get(ServiceCard, cad.service_card_id)
            self._criar_toque(cad, card, passo, proximo_dia_util(_hoje_brasilia()), user)
        self.db.commit()
        self.db.refresh(cad)
        return cad

    def cancelar(self, card_id: int) -> ServiceCardCadence:
        """Os toques já criados ficam na agenda, como em Vendas."""
        cad = self._aberta_ou_404(card_id)
        cad.status = ServiceCardCadence.STATUS_CANCELLED
        cad.completed_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(cad)
        return cad

    # ── Interno ──────────────────────────────────────────────────────────────

    def _aberta_ou_404(self, card_id: int) -> ServiceCardCadence:
        cad = self.cadencia_aberta(card_id)
        if not cad:
            raise HTTPException(status_code=404, detail="Nenhuma cadência em andamento neste card.")
        return cad

    def _pendentes(self, cad: ServiceCardCadence) -> List[ServiceCardActivity]:
        return self.db.query(ServiceCardActivity).filter(
            ServiceCardActivity.service_card_cadence_id == cad.id,
            ServiceCardActivity.is_completed == False,  # noqa: E712
        ).all()

    def _responsavel(self, card: ServiceCard, user: Optional[User]) -> Optional[int]:
        return card.assigned_to_id or (user.id if user else None)

    def _criar_toque(self, cad: ServiceCardCadence, card: ServiceCard, passo: CadenceStep,
                     dia: date, user: Optional[User]) -> ServiceCardActivity:
        seguinte = self._passo_seguinte(cad.template, passo.order)
        toque = ServiceCardActivity(
            service_card_id=card.id,
            user_id=self._responsavel(card, user),
            category="atividade",
            activity_type=passo.activity_type,
            title=passo.title,
            description=passo.description,
            priority=passo.priority,
            due_date=_vencimento(dia, passo.scheduled_time),
            is_completed=False,
            service_card_cadence_id=cad.id,
            # A tela pergunta "O cliente respondeu?" quando o próximo toque é
            # condicional.
            activity_metadata={
                "cadencia_etapa": passo.order,
                "pergunta_respondeu": bool(seguinte and seguinte.somente_sem_resposta),
            },
        )
        self.db.add(toque)
        self.db.flush()
        return toque
```

- [ ] **Step 4:** Rodar — Expected: tudo passa.

- [ ] **Step 5: Commit** (perguntar antes) — `git add backend/app/services/cadencia_servico_service.py backend/tests/unit/test_cadencia_servico.py` · `feat(cadencia-servico): iniciar, pausar, retomar e cancelar`

---

### Task 5: Concluir um toque cria o próximo

**Files:** Modify `backend/app/services/cadencia_servico_service.py`, `backend/app/services/service_board_service.py` (`complete_activity` ~l.1287), `backend/app/schemas/service_board.py` (`ServiceCardActivityComplete` ~l.269); Test `backend/tests/unit/test_cadencia_servico.py`

- [ ] **Step 1: Testes que falham** — acrescentar:

```python
from app.services.service_board_service import ServiceBoardService


def concluir(db, card, toque, quando, user, respondeu=None):
    """Conclui pelo caminho da tela (complete_activity), 'quando' em Brasília."""
    toque.completed_at = datetime.combine(quando, datetime.min.time()).replace(hour=14) + mod.FUSO_BRASILIA
    db.commit()
    ServiceBoardService(db).complete_activity(2, card.id, toque.id, True, user, respondeu=respondeu)


def dia(toque):
    return (toque.due_date - mod.FUSO_BRASILIA).date()


def test_sequencia_em_dia_comecando_na_segunda(db, cobranca, test_admin_user, segunda):
    """seg (1 e 2) · qua (3) · seg (4) · qua (5) · sex (6) · qua (7) · sex (8)."""
    card = card_em(db, cobranca.listas["Oportunidade Existente"])
    CadenciaServicoService(db).iniciar(card, criar_modelo(db).id, test_admin_user)

    dias = []
    for _ in range(8):
        [toque] = pendentes(db, card)
        dias.append(dia(toque))
        concluir(db, card, toque, dia(toque), test_admin_user, respondeu=False)

    assert dias == [date(2026, 10, 26), date(2026, 10, 26), date(2026, 10, 28), date(2026, 11, 2),
                    date(2026, 11, 4), date(2026, 11, 6), date(2026, 11, 11), date(2026, 11, 13)]
    assert pendentes(db, card) == []
    assert CadenciaServicoService(db).ultima_cadencia(card.id).status == "completed"


def test_respondeu_pula_a_ligacao_do_d1(db, cobranca, test_admin_user, segunda):
    card = card_em(db, cobranca.listas["Oportunidade Existente"])
    CadenciaServicoService(db).iniciar(card, criar_modelo(db).id, test_admin_user)
    [zap] = pendentes(db, card)

    concluir(db, card, zap, SEG, test_admin_user, respondeu=True)

    [proximo] = pendentes(db, card)
    assert proximo.activity_type == "email"
    assert dia(proximo) == QUA


def test_conclusao_atrasada_empurra_o_proximo(db, cobranca, test_admin_user, segunda):
    card = card_em(db, cobranca.listas["Oportunidade Existente"])
    CadenciaServicoService(db).iniciar(card, criar_modelo(db).id, test_admin_user)
    [zap] = pendentes(db, card)
    concluir(db, card, zap, SEG, test_admin_user, respondeu=True)
    [email] = pendentes(db, card)

    concluir(db, card, email, date(2026, 10, 29), test_admin_user)  # qui em vez de qua

    [proximo] = pendentes(db, card)
    assert dia(proximo) == date(2026, 11, 3)  # qui + 3 dias úteis = ter


def test_concluir_de_novo_nao_duplica(db, cobranca, test_admin_user, segunda):
    card = card_em(db, cobranca.listas["Oportunidade Existente"])
    CadenciaServicoService(db).iniciar(card, criar_modelo(db).id, test_admin_user)
    [zap] = pendentes(db, card)
    concluir(db, card, zap, SEG, test_admin_user, respondeu=True)

    concluir(db, card, zap, SEG, test_admin_user, respondeu=True)

    assert len(pendentes(db, card)) == 1


def test_pausada_avanca_sem_criar_toque(db, cobranca, test_admin_user, segunda):
    card = card_em(db, cobranca.listas["Oportunidade Existente"])
    svc = CadenciaServicoService(db)
    svc.iniciar(card, criar_modelo(db).id, test_admin_user)
    [zap] = pendentes(db, card)
    svc.pausar(card.id)

    concluir(db, card, zap, SEG, test_admin_user, respondeu=True)

    assert pendentes(db, card) == []
    assert svc.ultima_cadencia(card.id).current_step_order == 3
```

`concluir` fixa `completed_at` antes de chamar `complete_activity`; o Step 3 abaixo faz `complete_activity` preservar um `completed_at` já preenchido, e é dessa data que a cadência conta o próximo toque.

- [ ] **Step 2:** Rodar — Expected: `complete_activity()` não aceita `respondeu`.

- [ ] **Step 3: Gancho** — em `service_board_service.py`, substituir `complete_activity` por:

```python
    def complete_activity(self, board_id: int, card_id: int, activity_id: int, is_completed: bool, user: User,
                          is_valid: Optional[bool] = None, respondeu: Optional[bool] = None) -> ServiceCardActivityResponse:
        activity = self._get_activity_scoped(board_id, card_id, activity_id)
        changes = {
            "is_completed": is_completed,
            # Preserva a hora de conclusão já registrada (concluir de novo não
            # muda a data da qual a cadência conta o próximo toque).
            "completed_at": (activity.completed_at or datetime.utcnow()) if is_completed else None,
        }
        if is_valid is not None:
            meta = dict(activity.activity_metadata or {})
            meta["is_valid"] = is_valid
            changes["activity_metadata"] = meta
        updated = self.repo.update_activity(activity, changes)
        if is_completed and updated.service_card_cadence_id:
            self._na_cadencia(lambda c: c.ao_concluir_toque(updated, respondeu, user))
        return self._build_activity_response(updated)

    def _na_cadencia(self, acao) -> None:
        """Gancho da cadência de Serviço: um erro nela nunca impede concluir a
        atividade nem mover o card."""
        from app.services.cadencia_servico_service import CadenciaServicoService
        try:
            acao(CadenciaServicoService(self.db))
        except Exception as e:  # pragma: no cover
            self.db.rollback()
            logger.exception(f"[CADENCIA-SERVICO] {e}")
```

Atenção: o `test_concluir_de_novo_nao_duplica` conclui a mesma atividade duas vezes; a 2ª não avança porque a etapa da atividade (1) já não é a etapa atual (3) — ver Step 4.

- [ ] **Step 4: Avançar** — em `cadencia_servico_service.py`, na seção "Ações do card", acrescentar:

```python
    def ao_concluir_toque(self, atividade: ServiceCardActivity, respondeu: Optional[bool],
                          user: Optional[User]) -> None:
        """Concluiu um toque: cria o próximo (ou pula o condicional)."""
        cad = self.db.get(ServiceCardCadence, atividade.service_card_cadence_id)
        if not cad or cad.status not in ABERTAS:
            return
        etapa = (atividade.activity_metadata or {}).get("cadencia_etapa")
        # Só o toque da etapa atual faz andar: concluir de novo, ou concluir
        # um toque antigo, não cria nada.
        if etapa != cad.current_step_order:
            return
        atual = self._passo(cad.template, etapa)
        if not atual:
            return
        seguinte = self._passo_seguinte(cad.template, atual.order)
        if seguinte and seguinte.somente_sem_resposta and respondeu is True:
            seguinte = self._passo_seguinte(cad.template, seguinte.order)

        if not seguinte:
            cad.status = ServiceCardCadence.STATUS_COMPLETED
            cad.completed_at = datetime.utcnow()
            self.db.commit()
            return

        cad.current_step_order = seguinte.order
        if cad.status == ServiceCardCadence.STATUS_ACTIVE:
            concluido_em = atividade.completed_at or datetime.utcnow()
            dia_base = (concluido_em - FUSO_BRASILIA).date()
            dia = somar_dias_uteis(dia_base, max(seguinte.day_offset - atual.day_offset, 0))
            card = self.db.get(ServiceCard, cad.service_card_id)
            self._criar_toque(cad, card, seguinte, dia, user)
        self.db.commit()
```

- [ ] **Step 5: Schema e rota** — em `app/schemas/service_board.py`, `ServiceCardActivityComplete`:

```python
class ServiceCardActivityComplete(BaseModel):
    is_completed: bool = True
    is_valid: Optional[bool] = None  # resultado da atividade (Válido / Não Válido)
    # Cadência: o cliente respondeu este toque? Sim pula o próximo se ele for condicional.
    respondeu: Optional[bool] = None
```

e em `service_boards.py`, `complete_service_card_activity`:

```python
    return svc.complete_activity(board_id, card_id, activity_id, data.is_completed, current_user,
                                 data.is_valid, respondeu=data.respondeu)
```

- [ ] **Step 6:** Rodar `test_cadencia_servico.py` — Expected: tudo passa. Rodar também os testes que tocam atividades de Serviço: `pytest tests/unit -q -k "servic"` — Expected: passa.

- [ ] **Step 7: Commit** (perguntar antes) — `git add backend/app/services/cadencia_servico_service.py backend/app/services/service_board_service.py backend/app/schemas/service_board.py backend/app/api/v1/endpoints/service_boards.py backend/tests/unit/test_cadencia_servico.py` · `feat(cadencia-servico): concluir toque cria o proximo em dia util`

---

### Task 6: Mover o card encerra; Perdido agenda a reabertura

**Files:** Modify `backend/app/services/cadencia_servico_service.py`, `backend/app/services/service_board_service.py` (`move_card` ~l.762); Test `backend/tests/unit/test_cadencia_servico.py`

- [ ] **Step 1: Testes que falham** — acrescentar:

```python
def mover(db, card, lista, user):
    ServiceBoardService(db).move_card(card.id, lista.id, None, user)


def test_mover_para_proposta_encerra_e_tira_o_toque_da_agenda(db, cobranca, test_admin_user, segunda):
    card = card_em(db, cobranca.listas["Oportunidade Existente"])
    CadenciaServicoService(db).iniciar(card, criar_modelo(db).id, test_admin_user)

    mover(db, card, cobranca.listas["Proposta"], test_admin_user)

    cad = CadenciaServicoService(db).ultima_cadencia(card.id)
    assert cad.status == "encerrada"
    assert "Proposta" in cad.motivo_encerramento
    assert pendentes(db, card) == []


def test_mover_entre_etapas_de_contato_nao_encerra(db, cobranca, test_admin_user, segunda):
    card = card_em(db, cobranca.listas["Oportunidade Existente"])
    CadenciaServicoService(db).iniciar(card, criar_modelo(db).id, test_admin_user)

    mover(db, card, cobranca.listas["Tentativa de Contato"], test_admin_user)

    assert CadenciaServicoService(db).ultima_cadencia(card.id).status == "active"
    assert len(pendentes(db, card)) == 1


def test_perdido_agenda_a_ligacao_de_reabertura(db, cobranca, test_admin_user, segunda):
    card = card_em(db, cobranca.listas["Oportunidade Existente"])
    CadenciaServicoService(db).iniciar(card, criar_modelo(db).id, test_admin_user)

    mover(db, card, cobranca.listas["Negócio Perdido"], test_admin_user)

    [reabertura] = pendentes(db, card)
    assert reabertura.activity_type == "call"
    assert reabertura.title == mod.TITULO_REABERTURA
    # 26/10 + 90 dias = 24/01/2027 (domingo) → segunda 25/01
    assert dia(reabertura) == date(2027, 1, 25)
    assert CadenciaServicoService(db).ultima_cadencia(card.id).status == "encerrada"


def test_perdido_sem_cadencia_nao_agenda(db, cobranca, test_admin_user, segunda):
    card = card_em(db, cobranca.listas["Oportunidade Existente"])

    mover(db, card, cobranca.listas["Negócio Perdido"], test_admin_user)

    assert pendentes(db, card) == []
```

- [ ] **Step 2:** Rodar — Expected: falham (cadência continua ativa; sem reabertura).

- [ ] **Step 3:** Em `cadencia_servico_service.py`, acrescentar:

```python
    def ao_mover_card(self, card: ServiceCard, destino: ServiceList) -> None:
        """Saiu das etapas de contato: encerra e tira o toque pendente da agenda."""
        if destino.board_id != BOARD_COBRANCA_ID or e_etapa_de_contato(destino):
            return
        cad = self.cadencia_aberta(card.id)
        if not cad:
            return
        cad.status = ServiceCardCadence.STATUS_ENCERRADA
        cad.completed_at = datetime.utcnow()
        cad.motivo_encerramento = "Card perdido" if e_perdido(destino) else f"Card movido para {destino.name}"
        for toque in self._pendentes(cad):
            self.db.delete(toque)
        self.db.commit()

    def agendar_reabertura(self, card: ServiceCard, destino: ServiceList, user: Optional[User]) -> None:
        """Perdido de um card que teve cadência: ligação daqui a N dias corridos."""
        if destino.board_id != BOARD_COBRANCA_ID or not e_perdido(destino):
            return
        cad = self.ultima_cadencia(card.id)
        if not cad or not cad.template.reabertura_dias:
            return
        dia = proximo_dia_util(_hoje_brasilia() + timedelta(days=cad.template.reabertura_dias))
        self.db.add(ServiceCardActivity(
            service_card_id=card.id,
            user_id=self._responsavel(card, user),
            category="atividade",
            activity_type="call",
            title=TITULO_REABERTURA,
            description=DESCRICAO_REABERTURA,
            priority="normal",
            due_date=_vencimento(dia, None),
            is_completed=False,
            service_card_cadence_id=cad.id,
            activity_metadata={"cadencia_reabertura": True},
        ))
        self.db.commit()
```

- [ ] **Step 4: Ganchos** — em `service_board_service.py`, `move_card`, dentro de `if old_list_id != new_list_id:`, logo na primeira linha (antes de `meta = ...`):

```python
            # Antes de concluir as pendentes do Ganho/Perdido: o toque da
            # cadência sai da agenda em vez de virar "concluído".
            self._na_cadencia(lambda c: c.ao_mover_card(card, new_list))
```

e no ramo do Perdido, depois de `self._complete_pending_activities(card_id)`:

```python
                # Depois de concluir as pendentes, senão a reabertura nasceria concluída.
                self._na_cadencia(lambda c: c.agendar_reabertura(card, new_list, user))
```

- [ ] **Step 5:** Rodar `test_cadencia_servico.py` e `pytest tests/unit -q -k "servic"` — Expected: tudo passa.

- [ ] **Step 6: Commit** (perguntar antes) — `git add backend/app/services/cadencia_servico_service.py backend/app/services/service_board_service.py backend/tests/unit/test_cadencia_servico.py` · `feat(cadencia-servico): encerra ao sair do contato e agenda reabertura no Perdido`

---

### Task 7: Rotas da cadência no card de Serviço

**Files:** Modify `backend/app/api/v1/endpoints/service_boards.py`; Test `backend/tests/unit/test_cadencia_servico.py`

- [ ] **Step 1: Testes que falham** — acrescentar:

```python
def test_rotas_da_cadencia(client, db, admin_headers, cobranca, segunda):
    card = card_em(db, cobranca.listas["Oportunidade Existente"])
    modelo = criar_modelo(db)
    base = f"/api/v1/service-boards/2/cards/{card.id}/cadencia"

    assert client.get(base, headers=admin_headers).status_code == 404

    r = client.post(base, headers=admin_headers, json={"template_id": modelo.id})
    assert r.status_code == 200, r.text
    assert r.json()["card_id"] == card.id
    assert r.json()["current_step"]["activity_type"] == "whatsapp"

    assert client.post(f"{base}/pausar", headers=admin_headers).json()["status"] == "paused"
    assert client.post(f"{base}/retomar", headers=admin_headers).json()["status"] == "active"
    assert client.post(f"{base}/cancelar", headers=admin_headers).json()["status"] == "cancelled"
    assert client.get(base, headers=admin_headers).json()["status"] == "cancelled"


def test_rota_respeita_o_board(client, db, admin_headers, cobranca):
    card = card_em(db, cobranca.listas["Oportunidade Existente"])

    assert client.get(f"/api/v1/service-boards/1/cards/{card.id}/cadencia", headers=admin_headers).status_code == 404
```

(conferir o prefixo real das rotas de Serviço em `app/api/v1/router.py` — o frontend usa `/api/v1/service-boards`.)

- [ ] **Step 2:** Rodar — Expected: 404/405 nas rotas novas.

- [ ] **Step 3:** Em `service_boards.py`, depois de `delete_service_card_activity`:

```python
# ── Cadência (board Serviço - Cobrança) ─────────────────────────────────────

from app.schemas.cadence import CardCadenceStart, ServiceCardCadenceResponse
from app.services.cadencia_servico_service import CadenciaServicoService


@router.get("/{board_id}/cards/{card_id}/cadencia", response_model=ServiceCardCadenceResponse)
async def get_service_card_cadencia(
    board_id: int = Path(...),
    card_id: int = Path(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    ServiceBoardService(db).get_card_in_board(board_id, card_id)
    svc = CadenciaServicoService(db)
    cad = svc.ultima_cadencia(card_id)
    if not cad:
        raise HTTPException(status_code=404, detail="Nenhuma cadência neste card.")
    return svc.resposta(cad)


@router.post("/{board_id}/cards/{card_id}/cadencia", response_model=ServiceCardCadenceResponse)
async def start_service_card_cadencia(
    board_id: int = Path(...),
    card_id: int = Path(...),
    data: CardCadenceStart = ...,
    current_user: User = Depends(require_not_viewer()),
    db: Session = Depends(get_db),
) -> Any:
    card = ServiceBoardService(db).get_card_in_board(board_id, card_id)
    svc = CadenciaServicoService(db)
    return svc.resposta(svc.iniciar(card, data.template_id, current_user))


@router.post("/{board_id}/cards/{card_id}/cadencia/pausar", response_model=ServiceCardCadenceResponse)
async def pause_service_card_cadencia(
    board_id: int = Path(...),
    card_id: int = Path(...),
    current_user: User = Depends(require_not_viewer()),
    db: Session = Depends(get_db),
) -> Any:
    ServiceBoardService(db).get_card_in_board(board_id, card_id)
    svc = CadenciaServicoService(db)
    return svc.resposta(svc.pausar(card_id))


@router.post("/{board_id}/cards/{card_id}/cadencia/retomar", response_model=ServiceCardCadenceResponse)
async def resume_service_card_cadencia(
    board_id: int = Path(...),
    card_id: int = Path(...),
    current_user: User = Depends(require_not_viewer()),
    db: Session = Depends(get_db),
) -> Any:
    ServiceBoardService(db).get_card_in_board(board_id, card_id)
    svc = CadenciaServicoService(db)
    return svc.resposta(svc.retomar(card_id, current_user))


@router.post("/{board_id}/cards/{card_id}/cadencia/cancelar", response_model=ServiceCardCadenceResponse)
async def cancel_service_card_cadencia(
    board_id: int = Path(...),
    card_id: int = Path(...),
    current_user: User = Depends(require_not_viewer()),
    db: Session = Depends(get_db),
) -> Any:
    ServiceBoardService(db).get_card_in_board(board_id, card_id)
    svc = CadenciaServicoService(db)
    return svc.resposta(svc.cancelar(card_id))
```

Mover os dois `import` para o topo do arquivo, junto dos outros. Conferir que `HTTPException` e `get_current_active_user` estão importados; se não, acrescentar. `get_card_in_board` precisa devolver 404 quando o card não é do board (conferir; o teste `test_rota_respeita_o_board` cobre).

- [ ] **Step 4:** Rodar `test_cadencia_servico.py` — Expected: tudo passa. Depois a suíte inteira — Expected: tudo passa.

- [ ] **Step 5: Commit** (perguntar antes) — `git add backend/app/api/v1/endpoints/service_boards.py backend/tests/unit/test_cadencia_servico.py` · `feat(cadencia-servico): rotas no card de Servico`

---

### Task 8: Configurações > Cadências

**Files:** Modify `frontend/src/services/cadenceService.ts`, `frontend/src/components/settings/CadenceTemplateManager.tsx`

- [ ] **Step 1: Tipos** — em `cadenceService.ts`:

```ts
export type CadenceEscopo = "vendas" | "servico_cobranca";

export const ESCOPO_LABELS: Record<CadenceEscopo, string> = {
  vendas: "Vendas",
  servico_cobranca: "Serviço - Cobrança",
};
```

- `CadenceStep` e `CadenceStepInput`: `somente_sem_resposta: boolean;` (no Input: `somente_sem_resposta?: boolean;`).
- `CadenceTemplate`: `escopo: CadenceEscopo;` e `reabertura_dias: number | null;`.
- `CreateTemplateRequest` e `UpdateTemplateRequest`: `escopo?: CadenceEscopo;` e `reabertura_dias?: number | null;`.
- `CardCadenceStatus`: acrescentar `| "encerrada"`; `CardCadence`: `motivo_encerramento?: string | null;`.
- `listTemplates`:

```ts
  listTemplates: async (onlyActive = false, escopo?: CadenceEscopo): Promise<CadenceTemplate[]> => {
    const res = await api.get("/api/v1/cadences/templates", {
      params: { only_active: onlyActive, ...(escopo ? { escopo } : {}) },
    });
    return res.data;
  },
```

- [ ] **Step 2: Estado do formulário** — em `CadenceTemplateManager.tsx`:
  - `emptyStep`: acrescentar `somente_sem_resposta: false,`;
  - estados novos junto dos do form: `const [formEscopo, setFormEscopo] = useState<CadenceEscopo>("vendas");` e `const [formReabertura, setFormReabertura] = useState<number | "">(90);`;
  - `openCreate`: `setFormEscopo("vendas"); setFormReabertura(90);`;
  - `openEdit`: `setFormEscopo(t.escopo || "vendas"); setFormReabertura(t.reabertura_dias ?? "");` e, no `map` dos passos, `somente_sem_resposta: s.somente_sem_resposta ?? false,`;
  - `updateStep`: o tipo do `value` passa a `string | number | boolean | null`;
  - `payload`:

```ts
      const payload: CreateTemplateRequest = {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        is_active: formActive,
        escopo: formEscopo,
        reabertura_dias: formEscopo === "servico_cobranca" && formReabertura !== "" ? Number(formReabertura) : null,
        steps: formSteps.map(({ _key, ...s }) => s),
      };
```

  - imports: `CadenceEscopo, ESCOPO_LABELS` de `../../services/cadenceService`.

- [ ] **Step 3: Campos** — no bloco "Nome e descrição", depois do `<div>` da descrição (antes do toggle de ativo):

```tsx
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                Vale para
              </label>
              <select
                value={formEscopo}
                onChange={(e) => setFormEscopo(e.target.value as CadenceEscopo)}
                className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
              >
                {(Object.keys(ESCOPO_LABELS) as CadenceEscopo[]).map((e) => (
                  <option key={e} value={e}>{ESCOPO_LABELS[e]}</option>
                ))}
              </select>
            </div>
            {formEscopo === "servico_cobranca" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  Ligação de reabertura após Perdido (dias)
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={formReabertura}
                  onChange={(e) => setFormReabertura(e.target.value === "" ? "" : parseInt(e.target.value) || 1)}
                  placeholder="Vazio = não agenda"
                  className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            )}
          </div>
```

  e, em cada etapa, depois do campo "Instrução para o SDR" (ainda dentro do `grid`):

```tsx
                  {/* Toque condicional */}
                  {idx > 0 && (
                    <label className="col-span-2 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 md:col-span-4">
                      <input
                        type="checkbox"
                        checked={!!step.somente_sem_resposta}
                        onChange={(e) => updateStep(step._key, "somente_sem_resposta", e.target.checked)}
                      />
                      Só se o cliente não respondeu o toque anterior
                    </label>
                  )}
```

  Na listagem dos modelos (o card de cada template, perto do selo Ativo/Inativo, ~l.516), acrescentar um selo `{ESCOPO_LABELS[t.escopo] || "Vendas"}` com as mesmas classes de selo neutro usadas ali; e no detalhe das etapas (~l.569), depois do "Dia N", `{step.somente_sem_resposta ? " · só sem resposta" : ""}`.

- [ ] **Step 4: Vendas só vê os seus** — em `components/cardDetails/CadenceSection.tsx`, `openStartModal`: trocar `cadenceService.listTemplates(true)` por `cadenceService.listTemplates(true, "vendas")` (a Task 9 troca de novo por `cadenceApi.listTemplates()`; fazer aqui para manter Vendas correto já neste commit).

- [ ] **Step 5:** `npx tsc --noEmit -p tsconfig.json` — Expected: sem saída.

- [ ] **Step 6: Commit** (perguntar antes) — `git add frontend/src/services/cadenceService.ts frontend/src/components/settings/CadenceTemplateManager.tsx frontend/src/components/cardDetails/CadenceSection.tsx` · `feat(cadencia): modelo com "vale para", toque condicional e reabertura`

---

### Task 9: Seção Cadência no card de Cobrança

**Files:** Modify `frontend/src/services/cadenceService.ts`, `frontend/src/components/cardDetails/CadenceSection.tsx`, `frontend/src/pages/ServiceCardDetails.tsx`

- [ ] **Step 1: Adaptadores** — no fim de `cadenceService.ts`, antes do `export default`:

```ts
/** O que a seção de cadência precisa — Vendas e Serviço implementam igual. */
export interface CadenceApi {
  get: () => Promise<CardCadence | null>;
  listTemplates: () => Promise<CadenceTemplate[]>;
  start: (templateId: number) => Promise<CardCadence>;
  pause: () => Promise<CardCadence>;
  resume: () => Promise<CardCadence>;
  cancel: () => Promise<CardCadence>;
}

export const cadenciaDeVendas = (cardId: number): CadenceApi => ({
  get: () => cadenceService.getCardCadence(cardId),
  listTemplates: () => cadenceService.listTemplates(true, "vendas"),
  start: (templateId) => cadenceService.startCadence(cardId, templateId),
  pause: () => cadenceService.pauseCadence(cardId),
  resume: () => cadenceService.resumeCadence(cardId),
  cancel: () => cadenceService.cancelCadence(cardId),
});

export const cadenciaDeServico = (boardId: number, cardId: number): CadenceApi => {
  const base = `/api/v1/service-boards/${boardId}/cards/${cardId}/cadencia`;
  return {
    get: async () => {
      try {
        return (await api.get(base)).data;
      } catch (err: any) {
        if (err?.response?.status === 404) return null;
        throw err;
      }
    },
    listTemplates: () => cadenceService.listTemplates(true, "servico_cobranca"),
    start: async (templateId) => (await api.post(base, { template_id: templateId })).data,
    pause: async () => (await api.post(`${base}/pausar`)).data,
    resume: async () => (await api.post(`${base}/retomar`)).data,
    cancel: async () => (await api.post(`${base}/cancelar`)).data,
  };
};
```

(`cadenceService` é declarado como `const` mais acima no arquivo, então está disponível aqui.)

- [ ] **Step 2: Seção reutilizável** — em `CadenceSection.tsx`:
  - props: `api?: CadenceApi;` em `CadenceSectionProps`; desestruturar `api`;
  - imports: `useMemo` do React; `CadenceApi, cadenciaDeVendas` de `../../services/cadenceService`;
  - logo no começo do componente: `const cadenceApi = useMemo(() => api ?? cadenciaDeVendas(cardId), [api, cardId]);`
  - trocas (são 6 chamadas):
    - `cadenceService.getCardCadence(cardId)` → `cadenceApi.get()`
    - `cadenceService.listTemplates(true, "vendas")` → `cadenceApi.listTemplates()`
    - `cadenceService.startCadence(cardId, selectedTemplateId)` → `cadenceApi.start(selectedTemplateId)`
    - `cadenceService.pauseCadence(cardId)` → `cadenceApi.pause()`
    - `cadenceService.resumeCadence(cardId)` → `cadenceApi.resume()`
    - `cadenceService.cancelCadence(cardId)` → `cadenceApi.cancel()`
  - `useEffect(() => { loadCadence(); }, [cardId]);` → `[cadenceApi]`;
  - `STATUS_LABELS`: acrescentar `encerrada: "Encerrada",`;
  - no bloco "Nenhuma cadência ativa", depois do `<p>` "Nenhuma cadência ativa neste lead.":

```tsx
              {cadence?.status === "encerrada" && cadence.motivo_encerramento && (
                <p className="-mt-2 mb-3 text-xs text-slate-400 dark:text-slate-500">
                  A última cadência foi encerrada: {cadence.motivo_encerramento.toLowerCase()}.
                </p>
              )}
```

  - se `cadenceService` deixar de ser usado no arquivo, remover o import default (manter `ACTIVITY_TYPE_LABELS` e os tipos).

- [ ] **Step 3: Card de Serviço** — em `ServiceCardDetails.tsx`:
  - imports: `import CadenceSection from "../components/cardDetails/CadenceSection";` e `import { cadenciaDeServico } from "../services/cadenceService";` (e `useMemo` se ainda não importado);
  - no componente que renderiza a coluna esquerda (onde estão `numBoardId`/`numCardId`), antes do `return`: `const cadenciaApi = useMemo(() => cadenciaDeServico(numBoardId, numCardId), [numBoardId, numCardId]);`
  - depois de `<ServiceSummarySection ... />`:

```tsx
          {/* Cadência só no board Serviço - Cobrança */}
          {numBoardId === 2 && (
            <CadenceSection cardId={numCardId} api={cadenciaApi} onUpdate={reloadActivities} />
          )}
```

- [ ] **Step 4:** `npx tsc --noEmit -p tsconfig.json` — Expected: sem saída.

- [ ] **Step 5: Commit** (perguntar antes) — `git add frontend/src/services/cadenceService.ts frontend/src/components/cardDetails/CadenceSection.tsx frontend/src/pages/ServiceCardDetails.tsx` · `feat(cadencia-servico): secao Cadencia no card de Cobranca`

---

### Task 10: Pergunta "O cliente respondeu?"

**Files:** Modify `frontend/src/services/serviceActivityService.ts` (`complete` ~l.93), `frontend/src/components/service/ServiceActivityTab.tsx` (`markResult`/`conclude` ~l.182)

- [ ] **Step 1:** `serviceActivityService.complete`:

```ts
  async complete(boardId: number, cardId: number, id: number, isCompleted: boolean,
                 isValid?: boolean | null, respondeu?: boolean | null): Promise<ServiceCardActivity> {
    const r = await api.patch<ServiceCardActivity>(`${BASE}/${boardId}/cards/${cardId}/activities/${id}/complete`, {
      is_completed: isCompleted,
      is_valid: isValid ?? null,
      respondeu: respondeu ?? null,
    });
    return r.data;
  }
```

- [ ] **Step 2:** Em `ServiceActivityTab.tsx`, substituir `markResult` e `conclude` por:

```tsx
  // Toque de cadência cujo próximo é condicional (ex.: WhatsApp do D1 antes da
  // ligação): a resposta decide se o próximo toque acontece.
  const perguntarSeRespondeu = async (): Promise<boolean | null> => {
    if (!activity.activity_metadata?.pergunta_respondeu) return null;
    return confirm({
      title: "O cliente respondeu?",
      message: "Se respondeu, o próximo toque da cadência (ligação) é pulado.",
      confirmText: "Sim, respondeu",
      cancelText: "Não respondeu",
    });
  };

  const markResult = async (isValid: boolean) => {
    try {
      const respondeu = await perguntarSeRespondeu();
      await serviceActivityService.complete(boardId, cardId, activity.id, true, isValid, respondeu);
      await onChanged();
    } catch { showError("Erro ao registrar resultado"); }
  };

  const conclude = async () => {
    try {
      const respondeu = await perguntarSeRespondeu();
      await serviceActivityService.complete(boardId, cardId, activity.id, true, null, respondeu);
      await onChanged();
    } catch { showError("Erro ao concluir"); }
  };
```

(conferir que `confirm` vem do `useConfirm()` já declarado no mesmo componente, ~l.136; se `markResult`/`conclude` estiverem em outro componente do arquivo, declarar `const { confirm } = useConfirm();` nele.)

- [ ] **Step 3:** `npx tsc --noEmit -p tsconfig.json` — Expected: sem saída.

- [ ] **Step 4: Commit** (perguntar antes) — `git add frontend/src/services/serviceActivityService.ts frontend/src/components/service/ServiceActivityTab.tsx` · `feat(cadencia-servico): pergunta se o cliente respondeu ao concluir o toque`

---

### Task 11: Fechamento

- [ ] **Step 1:** Suíte completa do backend — Expected: tudo passando.
- [ ] **Step 2:** `npm run build` no frontend — Expected: `✓ built`.
- [ ] **Step 3:** Versão **1.10.20** nos três lugares (`CHANGELOG.md`, `ChangelogModal.tsx`, rodapé `MainLayout.tsx`) — a 1.10.19 é a reconexão automática da reunião, ainda pendente. Itens: cadência no board Serviço - Cobrança (feature); modelos de cadência com "vale para" e toque condicional (improvement). Se o usuário descartar a 1.10.19, usar 1.10.19.
- [ ] **Step 4: Commit** (perguntar antes) — `chore: changelog v1.10.20`.
- [ ] **Step 5: Deploy (usuário):** rodar a migration `c4d6e8f0a2b4` em produção **antes** do deploy (`docker exec hsgrowth-api-local alembic upgrade head`, com confirmação explícita) e conferir que o modelo "Cobrança — Base com calibração atrasada" aparece em Configurações > Cadências.
- [ ] **Step 6: Roteiro de teste em produção:** num card de teste do board 2, iniciar a cadência → WhatsApp para hoje; concluir respondendo "Não respondeu" → ligação para hoje; concluir a ligação → e-mail 2 dias úteis depois; mover para Proposta → cadência encerrada e e-mail some da agenda; num 2º card, iniciar e mover para Negócio Perdido → "Ligação de reabertura" em ~90 dias.
