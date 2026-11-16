# Parcerias — Entrega 4: Alertas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** avisar (sino + e-mail, uma vez por dia às 8h) quando uma oportunidade de parceiro está para perder ou perdeu a proteção do CNPJ, e quando uma empresa/hunter convidado passa de 23 e de 30 dias sem aceitar os termos — com um interruptor por aviso em Configurações → Notificações.

**Architecture:** função pura `data_de_queda` em `semaforo.py` (mesma regra de `protegido`, olhando para a frente); módulo novo `app/services/notificacoes/parcerias.py` com `avisar_protecao`, `avisar_convites` e `avisar_parcerias`, chamado por um job diário do APScheduler via `_rodar_aviso`. Os avisos passam por `notificar()` (preferência por coluna + dedupe por `referencia`); o e-mail sai só quando o aviso do sino foi criado. Duas colunas novas em `user_notification_settings` (migration aditiva).

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, APScheduler, pytest (SQLite), React 19 + TS.

**Spec:** `docs/superpowers/specs/2026-11-16-parcerias-entrega-4-alertas-design.md`

**Comando de teste** (rodar de `backend/`):
`MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest <alvo> -q -p no:cacheprovider --color=no`

**Regras:** não commitar sem perguntar ao usuário; nunca `alembic upgrade` no container local (aponta para produção).

---

## Arquivos

| Arquivo | O quê |
|---|---|
| `backend/app/services/parcerias/semaforo.py` | + `data_de_queda()` |
| `backend/app/models/user_notification_setting.py` | + colunas `parcerias_protecao`, `parcerias_convite` |
| `backend/alembic/versions/2026_11_16_1000-2a3b4c5d6e7f_alertas_parcerias.py` | migration aditiva (down `1f2a3b4c5d6e`) |
| `backend/app/schemas/user_notification_setting.py` | os 2 campos na resposta e no update |
| `backend/app/services/notificacoes/tipos.py` | 2 tipos novos com coluna |
| `backend/app/services/emails_de_acesso.py` | + `aviso()` (e-mail genérico com botão) |
| `backend/app/services/notificacoes/parcerias.py` | **novo**: os dois alertas |
| `backend/app/workers/scheduler.py` | job `alertas_parcerias` às 8h (fuso do agendador já é São Paulo) |
| `backend/tests/unit/test_parcerias_alertas.py` | **novo** |
| `backend/tests/unit/test_notificacoes_limpeza_e_agenda.py` | job registrado |
| `frontend/src/types/index.ts` | 2 campos em `NotificationSettings` |
| `frontend/src/components/settings/NotificacoesConfig.tsx` | seção "Parcerias" |
| Versão 1.11.26 | `CHANGELOG.md`, `ChangelogModal.tsx`, rodapé do `MainLayout.tsx`; `docs/programa-de-parceiros.md` |

---

### Task 1: `data_de_queda` no semáforo

**Files:**
- Modify: `backend/app/services/parcerias/semaforo.py` (logo depois de `protegido`, ~linha 64)
- Test: `backend/tests/unit/test_parcerias_alertas.py`

- [ ] **Step 1: teste que falha** — criar `backend/tests/unit/test_parcerias_alertas.py`:

```python
"""
Entrega 4 — alertas de Parcerias: proteção do CNPJ da oportunidade (3 dias antes
e no dia em que perde) e convite sem ativação (dia 23 e dia 30). Sino + e-mail.
"""
from datetime import datetime, timedelta

from app.services.parcerias.semaforo import data_de_queda, protegido

AGORA = datetime(2026, 11, 16, 11, 0)  # 8h em Brasília
D = timedelta(days=1)


class TestDataDeQueda:

    def test_sem_nada_nao_tem_data(self):
        assert data_de_queda([], [None], dias=10) is None

    def test_regra_desligada(self):
        assert data_de_queda([], [AGORA], dias=0) is None

    def test_movimento_mais_recente_vence(self):
        assert data_de_queda([], [AGORA - 8 * D, AGORA - 2 * D], dias=10) == AGORA + 8 * D

    def test_atividade_futura_empurra(self):
        assert data_de_queda([AGORA + 5 * D], [AGORA - 9 * D], dias=10) == AGORA + 15 * D

    def test_coerente_com_protegido(self):
        prazos, movimentos = [AGORA - 12 * D, None], [AGORA - 4 * D]
        cai = data_de_queda(prazos, movimentos, dias=10)
        for horas in range(-24 * 20, 24 * 20, 7):
            agora = AGORA + timedelta(hours=horas)
            assert protegido(agora, prazos, movimentos, dias=10) == (agora <= cai), agora
```

- [ ] **Step 2: rodar e ver falhar**

Run: `... pytest tests/unit/test_parcerias_alertas.py -q ...`
Expected: FAIL com `ImportError: cannot import name 'data_de_queda'`.

- [ ] **Step 3: implementar** — em `semaforo.py`, logo depois da função `protegido`:

```python
def data_de_queda(prazos: Iterable[Optional[datetime]], movimentos: Iterable[Optional[datetime]],
                  dias: int = PADRAO.protecao) -> Optional[datetime]:
    """
    Quando a proteção cai (a mesma regra de `protegido`, olhando para a frente):
    a data mais recente entre as atividades em aberto e os movimentos, mais N dias.
    None = nada para proteger ou regra desligada (N = 0).
    Garantia: protegido(agora, ...) == (agora <= data_de_queda(...)).
    """
    if dias <= 0:
        return None
    datas = [_naive(d) for d in list(prazos) + list(movimentos) if d is not None]
    if not datas:
        return None
    return max(datas) + timedelta(days=dias)
```

- [ ] **Step 4: rodar e ver passar** — mesmo comando. Expected: 5 passed.

---

### Task 2: preferências (modelo, migration, schema, catálogo)

**Files:**
- Modify: `backend/app/models/user_notification_setting.py`
- Create: `backend/alembic/versions/2026_11_16_1000-2a3b4c5d6e7f_alertas_parcerias.py`
- Modify: `backend/app/schemas/user_notification_setting.py`
- Modify: `backend/app/services/notificacoes/tipos.py`
- Test: `backend/tests/unit/test_parcerias_alertas.py`

- [ ] **Step 1: testes que falham** — acrescentar ao arquivo de teste:

```python
from app.models.user_notification_setting import UserNotificationSetting
from app.schemas.user_notification_setting import (
    UserNotificationSettingResponse, UserNotificationSettingUpdate,
)
from app.services.notificacoes.tipos import tipo_por_id
from app.services.user_notification_service import UserNotificationService
from tests.unit.apoio_parcerias import usuario


class TestPreferencias:

    def test_tipos_no_catalogo_com_coluna(self):
        for tipo in ("parcerias_protecao", "parcerias_convite"):
            info = tipo_por_id(tipo)
            assert info is not None and not info.obrigatorio
            assert info.coluna == tipo
            assert hasattr(UserNotificationSetting, tipo)

    def test_nascem_ligadas_e_desligam(self, db):
        u = usuario(db, "partner", "dono@dmap.com")
        servico = UserNotificationService(db)
        s = servico.get_or_create(u.id)
        assert s.parcerias_protecao is True and s.parcerias_convite is True

        s = servico.update(u.id, UserNotificationSettingUpdate(parcerias_convite=False))
        corpo = UserNotificationSettingResponse.model_validate(s).model_dump()
        assert corpo["parcerias_protecao"] is True
        assert corpo["parcerias_convite"] is False
```

- [ ] **Step 2: rodar e ver falhar** — Expected: FAIL (`tipo_por_id(...)` None / campo desconhecido).

- [ ] **Step 3: modelo** — em `user_notification_setting.py`, importar `true` (`from sqlalchemy import Column, Integer, Boolean, ForeignKey, UniqueConstraint, JSON, true`) e, depois de `reuniao_15min`:

```python
    # Parcerias (Entrega 4): oportunidade perto de perder / perdeu a proteção do CNPJ
    parcerias_protecao = Column(Boolean, default=True, server_default=true(), nullable=False)

    # Parcerias (Entrega 4): empresa ou hunter convidado sem aceitar os termos (dia 23 e 30)
    parcerias_convite = Column(Boolean, default=True, server_default=true(), nullable=False)
```

- [ ] **Step 4: migration** — criar `backend/alembic/versions/2026_11_16_1000-2a3b4c5d6e7f_alertas_parcerias.py`:

```python
"""Preferências dos alertas de Parcerias

Revision ID: 2a3b4c5d6e7f
Revises: 1f2a3b4c5d6e
Create Date: 2026-11-16 10:00:00

Duas colunas em user_notification_settings, ligadas para todo mundo.
Aditiva: pode rodar antes do código.
"""
from alembic import op
import sqlalchemy as sa


revision = '2a3b4c5d6e7f'
down_revision = '1f2a3b4c5d6e'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('user_notification_settings',
                  sa.Column('parcerias_protecao', sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column('user_notification_settings',
                  sa.Column('parcerias_convite', sa.Boolean(), nullable=False, server_default=sa.true()))


def downgrade():
    op.drop_column('user_notification_settings', 'parcerias_convite')
    op.drop_column('user_notification_settings', 'parcerias_protecao')
```

- [ ] **Step 5: schema** — em `UserNotificationSettingResponse`, depois de `popup_navegador`:

```python
    parcerias_protecao: bool = Field(default=True, description="Parcerias: proteção do CNPJ da oportunidade")
    parcerias_convite: bool = Field(default=True, description="Parcerias: convite sem ativação")
```

e em `UserNotificationSettingUpdate`, depois de `popup_navegador`:

```python
    parcerias_protecao: Optional[bool] = None
    parcerias_convite: Optional[bool] = None
```

- [ ] **Step 6: catálogo** — em `tipos.py`, antes de `TipoDeAviso("reuniao_falha", ...)`:

```python
    TipoDeAviso("parcerias_protecao", "Proteção do CNPJ da oportunidade",
                "3 dias antes de uma oportunidade de parceiro perder a proteção por falta de atividade, e no dia em que perde",
                "shield-alert", "warning", coluna="parcerias_protecao"),
    TipoDeAviso("parcerias_convite", "Convite sem ativação",
                "Quando uma empresa ou hunter convidado passa de 23 e de 30 dias sem aceitar os termos",
                "user-x", "warning", coluna="parcerias_convite"),
```

- [ ] **Step 7: rodar** `tests/unit/test_parcerias_alertas.py tests/unit/test_notificacoes_tipos.py` — Expected: tudo passa.
- [ ] **Step 8: conferir a cadeia** — `MSYS_NO_PATHCONV=1 docker exec -w /app hsgrowth-api-local alembic heads` → `2a3b4c5d6e7f (head)`. **Não** rodar `upgrade`.

---

### Task 3: alerta de proteção do CNPJ

**Files:**
- Modify: `backend/app/services/emails_de_acesso.py`
- Create: `backend/app/services/notificacoes/parcerias.py`
- Test: `backend/tests/unit/test_parcerias_alertas.py`

- [ ] **Step 1: testes que falham** — acrescentar:

```python
import pytest

from app.models.cnpj_rules_config import CnpjRulesConfig
from app.models.partner import PartnerTeamMember
from app.models.partner_activity import PartnerActivity
from app.services import envio_email
from app.services.notificacoes import parcerias as alertas
from tests.unit.apoio_notificacoes import avisos
from tests.unit.apoio_parcerias import oportunidade, parceiro


@pytest.fixture
def emails(monkeypatch):
    enviados = []
    monkeypatch.setattr(envio_email, "enviar_email",
                        lambda para, assunto, html, texto=None: enviados.append((para, assunto)) or True)
    return enviados


def _cenario(db, criada_ha_dias: float, **campos_op):
    """Parceiro com dono, vendedor e Responsável H&S; oportunidade criada há N dias."""
    hs = usuario(db, "salesperson", "resp@hs.com")
    p = parceiro(db, "Dmap", hs_owner_id=hs.id)
    dono = usuario(db, "partner", "dono@dmap.com", partner=p)
    vendedor = usuario(db, "partner_member", "vend@dmap.com", partner=p)
    membro = PartnerTeamMember(partner_id=p.id, name="Vend", user_id=vendedor.id)
    db.add(membro)
    db.commit()
    op = oportunidade(db, p, seller_member_id=membro.id,
                      created_at=AGORA - timedelta(days=criada_ha_dias), **campos_op)
    return op, dono, vendedor, hs


class TestProtecao:

    def test_faltando_3_dias_avisa_os_tres(self, db, emails):
        op, dono, vendedor, hs = _cenario(db, 7)

        assert alertas.avisar_protecao(db, AGORA) == 3

        for u in (dono, vendedor, hs):
            [a] = avisos(db, u.id, "parcerias_protecao")
            assert a.title == "Oportunidade perde a proteção em 3 dias"
            assert "19/11" in a.message
            assert a.notification_metadata["url"] == f"/parcerias/oportunidades/{op.id}"
        assert sorted(p for p, _ in emails) == ["dono@dmap.com", "resp@hs.com", "vend@dmap.com"]

    def test_faltando_4_dias_nao_avisa(self, db, emails):
        _cenario(db, 6)
        assert alertas.avisar_protecao(db, AGORA) == 0
        assert emails == []

    def test_no_dia_em_que_perde(self, db, emails):
        op, dono, _, _ = _cenario(db, 10 + 1 / 24)  # caiu há 1 hora

        alertas.avisar_protecao(db, AGORA)

        [a] = avisos(db, dono.id, "parcerias_protecao")
        assert a.title == "Oportunidade perdeu a proteção do CNPJ"
        assert "ficou livre" in a.message

    def test_perdida_ha_tempo_nao_avisa(self, db, emails):
        _cenario(db, 20)
        assert alertas.avisar_protecao(db, AGORA) == 0

    def test_rodar_duas_vezes_avisa_uma(self, db, emails):
        _, dono, _, _ = _cenario(db, 7)
        alertas.avisar_protecao(db, AGORA)
        assert alertas.avisar_protecao(db, AGORA + timedelta(hours=1)) == 0
        assert len(avisos(db, dono.id)) == 1
        assert len(emails) == 3

    def test_atividade_nova_abre_ciclo_novo(self, db, emails):
        op, dono, _, _ = _cenario(db, 7)
        alertas.avisar_protecao(db, AGORA)

        op.last_activity_at = AGORA
        db.commit()
        alertas.avisar_protecao(db, AGORA + 7 * D)

        assert len(avisos(db, dono.id, "parcerias_protecao")) == 2

    def test_atividade_agendada_no_futuro_protege(self, db, emails):
        op, *_ = _cenario(db, 7)
        db.add(PartnerActivity(opportunity_id=op.id, category="atividade", title="Ligar",
                               due_date=AGORA + 5 * D))
        db.commit()
        assert alertas.avisar_protecao(db, AGORA) == 0

    @pytest.mark.parametrize("campos", [{"stage": "ganho"}, {"stage": "perdido"},
                                        {"eligibility_status": "rejeitada"}])
    def test_fechada_ou_recusada_nao_avisa(self, db, emails, campos):
        _cenario(db, 7, **campos)
        assert alertas.avisar_protecao(db, AGORA) == 0

    def test_regra_desligada_nao_avisa(self, db, emails):
        db.add(CnpjRulesConfig(protection_days=0))
        db.commit()
        _cenario(db, 7)
        assert alertas.avisar_protecao(db, AGORA) == 0

    def test_preferencia_desligada_sem_sino_e_sem_email(self, db, emails):
        _, dono, _, _ = _cenario(db, 7)
        UserNotificationService(db).update(dono.id, UserNotificationSettingUpdate(parcerias_protecao=False))

        assert alertas.avisar_protecao(db, AGORA) == 2
        assert avisos(db, dono.id) == []
        assert "dono@dmap.com" not in [p for p, _ in emails]

    def test_parceiro_bloqueado_nao_avisa(self, db, emails):
        op, *_ = _cenario(db, 7)
        op.partner.stage = "bloqueado"
        db.commit()
        assert alertas.avisar_protecao(db, AGORA) == 0
```

- [ ] **Step 2: rodar e ver falhar** — Expected: FAIL `ImportError: cannot import name 'parcerias'`.

- [ ] **Step 3: e-mail genérico** — em `emails_de_acesso.py`, trocar a docstring do módulo para `"""Textos dos e-mails do CRM: Convite, Redefinir senha e avisos (HTML simples e texto puro)."""` e acrescentar no fim:

```python
def aviso(nome: str, titulo: str, mensagem: str, link: str) -> Tuple[str, str, str]:
    """E-mail que repete um aviso do sino, com botão para abrir no CRM. (assunto, html, texto)"""
    assunto = f"HSGrowth: {titulo}"
    html = _moldura(titulo, (
        f"<p>Olá, {escape(nome)}.</p><p>{escape(mensagem)}</p>"
        + _botao(link, "Abrir no CRM")
        + '<p style="color:#64748b;font-size:13px">Para não receber este aviso, desligue em '
          "Configurações → Notificações.</p>"))
    texto = (f"Olá, {nome}.\n{mensagem}\nAbrir no CRM: {link}\n"
             "Para não receber este aviso, desligue em Configurações → Notificações.")
    return assunto, html, texto
```

- [ ] **Step 4: módulo** — criar `backend/app/services/notificacoes/parcerias.py`:

```python
"""
Alertas do Programa de Parceiros (Entrega 4), uma vez por dia às 8h.

1. Oportunidade perto de perder a proteção do CNPJ (3 dias antes) e no dia em
   que perdeu. Registrar atividade muda a data de queda e abre um ciclo novo.
2. Empresa ou hunter convidado que não aceitou os termos: do dia 23 e no dia 30.

Sino + e-mail. O e-mail só sai quando o aviso do sino foi criado (preferência
ligada, login ativo, ainda não avisado com a mesma referência): reiniciar a API
não repete nada. Os avisos de "perdeu" e "30 dias" só saem numa janela de 2
dias, para não disparar sobre casos antigos quando a função entrar no ar.
"""
import logging
from datetime import datetime, timedelta
from typing import List, Optional

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.partner import Partner
from app.models.partner_activity import PartnerActivity
from app.models.partner_opportunity import PartnerOpportunity
from app.models.role import Role
from app.models.user import User
from app.services import emails_de_acesso, envio_email
from app.services.notificacoes.enviar import notificar
from app.services.notificacoes.horario import BRASILIA
from app.services.parcerias import regras_cnpj
from app.services.parcerias.semaforo import data_de_queda

logger = logging.getLogger(__name__)

AVISO_ANTES_DIAS = 3
JANELA = timedelta(days=2)
LOGINS_DO_PARCEIRO = ("partner", "hunter")


def _dia_local(quando: datetime):
    return (quando + BRASILIA).date()


def _ativos(q):
    return q.filter(User.is_active.is_(True), User.is_deleted.is_(False))


def _logins_do_parceiro(db: Session, partner_id: Optional[int]) -> List[User]:
    if not partner_id:
        return []
    return _ativos(
        db.query(User).join(Role, Role.id == User.role_id)
        .filter(User.partner_id == partner_id, Role.name.in_(LOGINS_DO_PARCEIRO))
    ).order_by(User.id).all()


def _usuario(db: Session, user_id: Optional[int]) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first() if user_id else None


def _sem_repetir(pessoas) -> List[User]:
    vistos, saida = set(), []
    for u in pessoas:
        if u is not None and u.id not in vistos:
            vistos.add(u.id)
            saida.append(u)
    return saida


def _avisar(db: Session, user: User, tipo: str, titulo: str, mensagem: str,
            link: str, referencia: str) -> int:
    """Sino e, se ele foi criado, e-mail. Returns: 1 se avisou, 0 se não."""
    if notificar(db, user.id, tipo, titulo, mensagem, link=link, referencia=referencia) is None:
        return 0
    if user.email:
        url = f"{settings.FRONTEND_URL.rstrip('/')}{link}"
        assunto, html, texto = emails_de_acesso.aviso(user.name, titulo, mensagem, url)
        try:
            envio_email.enviar_email(user.email, assunto, html, texto)
        except Exception as e:  # o aviso do sino já valeu
            logger.error(f"[ALERTAS PARCERIAS] e-mail para {user.email} falhou: {e}")
    return 1


# ─── 1. Proteção do CNPJ ─────────────────────────────────────────────────────

def _destinatarios_da_oportunidade(db: Session, op: PartnerOpportunity) -> List[User]:
    vendedor = _usuario(db, op.seller.user_id) if op.seller else None
    responsavel = _usuario(db, op.partner.hs_owner_id) if op.partner else None
    return _sem_repetir([vendedor, *_logins_do_parceiro(db, op.partner_id), responsavel])


def _texto_protecao(op: PartnerOpportunity, cai: datetime, agora: datetime, dias: int):
    """(sufixo da referência, título, mensagem) ou None se não é dia de avisar."""
    nome = f'"{op.title}" ({op.company_name})'
    if cai >= agora:
        faltam = (_dia_local(cai) - _dia_local(agora)).days
        if faltam > AVISO_ANTES_DIAS:
            return None
        quando = "hoje" if faltam == 0 else ("em 1 dia" if faltam == 1 else f"em {faltam} dias")
        return ("antes", f"Oportunidade perde a proteção {quando}",
                f"{nome} perde a proteção do CNPJ em {(cai + BRASILIA):%d/%m}. "
                "Registre uma atividade para manter.")
    if agora - cai < JANELA:
        return ("perdeu", "Oportunidade perdeu a proteção do CNPJ",
                f"{nome} ficou {dias} dias sem atividade. O CNPJ ficou livre para outros "
                "parceiros e para Vendas.")
    return None


def avisar_protecao(db: Session, agora: datetime) -> int:
    """Returns: quantos avisos foram criados."""
    dias = regras_cnpj.regras(db).protecao
    if dias <= 0:
        return 0
    ops = db.query(PartnerOpportunity).filter(
        PartnerOpportunity.is_deleted.is_(False),
        PartnerOpportunity.stage.notin_(("ganho", "perdido")),
        PartnerOpportunity.eligibility_status != "rejeitada",
    ).all()
    if not ops:
        return 0

    prazos = {}
    for a in db.query(PartnerActivity).filter(
        PartnerActivity.opportunity_id.in_([o.id for o in ops]),
        PartnerActivity.category == "atividade",
        PartnerActivity.is_completed.is_(False),
    ).all():
        prazos.setdefault(a.opportunity_id, []).append(a.due_date)

    total = 0
    for op in ops:
        if op.partner is not None and op.partner.stage == "bloqueado":
            continue
        cai = data_de_queda(prazos.get(op.id, []), [op.last_activity_at, op.created_at], dias=dias)
        texto = _texto_protecao(op, cai, agora, dias) if cai else None
        if not texto:
            continue
        sufixo, titulo, mensagem = texto
        referencia = f"parc_protecao:{op.id}:{cai:%Y%m%d%H%M}:{sufixo}"
        for u in _destinatarios_da_oportunidade(db, op):
            total += _avisar(db, u, "parcerias_protecao", titulo, mensagem,
                             f"/parcerias/oportunidades/{op.id}", referencia)
    return total


def avisar_parcerias(db: Session, agora: datetime) -> int:
    """O job diário: os dois alertas."""
    return avisar_protecao(db, agora)
```

(`avisar_convites` entra na Task 4 e passa a somar em `avisar_parcerias`.)

- [ ] **Step 5: rodar e ver passar** — `tests/unit/test_parcerias_alertas.py`. Expected: tudo passa.

---

### Task 4: alerta de convite sem ativação

**Files:**
- Modify: `backend/app/services/notificacoes/parcerias.py`
- Test: `backend/tests/unit/test_parcerias_alertas.py`

- [ ] **Step 1: testes que falham** — acrescentar:

```python
def _convidada(db, ha_dias: int, com_responsavel=True, indicada_por=None, **campos):
    hs = usuario(db, "salesperson", "resp@hs.com") if com_responsavel else None
    p = parceiro(db, "Nova", stage="convidado", terms_accepted_at=None,
                 hs_owner_id=hs.id if hs else None,
                 indicated_by_partner_id=indicada_por.id if indicada_por else None, **campos)
    login = usuario(db, "partner", "nova@nova.com", partner=p)
    login.created_at = AGORA - timedelta(days=ha_dias)
    db.commit()
    return p, hs


class TestConvite:

    def test_dia_22_nao_avisa(self, db, emails):
        _convidada(db, 22)
        assert alertas.avisar_convites(db, AGORA) == 0

    def test_dia_23_avisa_o_responsavel(self, db, emails):
        p, hs = _convidada(db, 23)

        assert alertas.avisar_convites(db, AGORA) == 1

        [a] = avisos(db, hs.id, "parcerias_convite")
        assert a.title == "Convite sem ativação"
        assert "Faltam 7 dias" in a.message
        assert a.notification_metadata["url"] == f"/parcerias/aquisicao/{p.id}"
        assert emails == [("resp@hs.com", "HSGrowth: Convite sem ativação")]

    def test_dia_30_avisa_de_novo(self, db, emails):
        _, hs = _convidada(db, 23)
        alertas.avisar_convites(db, AGORA)
        alertas.avisar_convites(db, AGORA + 7 * D)

        titulos = [a.title for a in avisos(db, hs.id, "parcerias_convite")]
        assert titulos == ["Convite sem ativação", "Convite: 30 dias sem ativação"]

    def test_convite_antigo_nao_avisa(self, db, emails):
        _convidada(db, 40)
        assert alertas.avisar_convites(db, AGORA) == 0

    def test_ativada_nao_avisa(self, db, emails):
        p, _ = _convidada(db, 23)
        p.stage = "ativado"
        db.commit()
        assert alertas.avisar_convites(db, AGORA) == 0

    def test_sem_responsavel_vai_para_os_admins(self, db, emails):
        admin = usuario(db, "admin", "adm@hs.com")
        _convidada(db, 23, com_responsavel=False)

        alertas.avisar_convites(db, AGORA)

        assert len(avisos(db, admin.id, "parcerias_convite")) == 1

    def test_quem_indicou_recebe(self, db, emails):
        hunter_p = parceiro(db, "Hunter", kind="hunter")
        h = usuario(db, "hunter", "h@hunter.com", partner=hunter_p)
        _convidada(db, 23, indicada_por=hunter_p)

        alertas.avisar_convites(db, AGORA)

        [a] = avisos(db, h.id, "parcerias_convite")
        assert a.notification_metadata["url"] == "/parcerias/indicacoes"

    def test_job_soma_os_dois(self, db, emails):
        _convidada(db, 23)
        assert alertas.avisar_parcerias(db, AGORA) == 1
```

- [ ] **Step 2: rodar e ver falhar** — Expected: FAIL `AttributeError: ... has no attribute 'avisar_convites'`.

- [ ] **Step 3: implementar** — em `parcerias.py`, antes de `avisar_parcerias`:

```python
# ─── 2. Convite sem ativação ─────────────────────────────────────────────────

DIA_AVISO_CONVITE = 23
DIA_LIMITE_CONVITE = 30


def _admins(db: Session) -> List[User]:
    return _ativos(
        db.query(User).join(Role, Role.id == User.role_id).filter(Role.name == "admin")
    ).order_by(User.id).all()


def _convidado_desde(db: Session, p: Partner) -> Optional[datetime]:
    """Criação do primeiro login do parceiro (o convite). Sem login, None."""
    datas = [u.created_at for u in db.query(User).join(Role, Role.id == User.role_id).filter(
        User.partner_id == p.id, Role.name.in_(LOGINS_DO_PARCEIRO)).all() if u.created_at]
    return min(datas) if datas else None


def avisar_convites(db: Session, agora: datetime) -> int:
    """Returns: quantos avisos foram criados."""
    total = 0
    for p in db.query(Partner).filter(Partner.is_deleted.is_(False), Partner.stage == "convidado").all():
        desde = _convidado_desde(db, p)
        if desde is None:
            continue
        dias = (_dia_local(agora) - _dia_local(desde)).days
        if DIA_AVISO_CONVITE <= dias < DIA_LIMITE_CONVITE:
            marco, titulo = DIA_AVISO_CONVITE, "Convite sem ativação"
            faltam = DIA_LIMITE_CONVITE - dias
            mensagem = (f"{p.name} foi convidado(a) em {(desde + BRASILIA):%d/%m} e ainda não aceitou "
                        f"os termos. Faltam {faltam} dia{'s' if faltam > 1 else ''} para completar 30.")
        elif DIA_LIMITE_CONVITE <= dias < DIA_LIMITE_CONVITE + JANELA.days:
            marco, titulo = DIA_LIMITE_CONVITE, "Convite: 30 dias sem ativação"
            mensagem = f"{p.name} completou 30 dias sem aceitar os termos. Reenvie o convite ou bloqueie."
        else:
            continue

        referencia = f"parc_convite:{p.id}:{marco}"
        responsavel = _usuario(db, p.hs_owner_id)
        hs = [responsavel] if responsavel and responsavel.is_active and not responsavel.is_deleted else _admins(db)
        for u in _sem_repetir(hs):
            total += _avisar(db, u, "parcerias_convite", titulo, mensagem,
                             f"/parcerias/aquisicao/{p.id}", referencia)
        for u in _logins_do_parceiro(db, p.indicated_by_partner_id):
            total += _avisar(db, u, "parcerias_convite", titulo, mensagem,
                             "/parcerias/indicacoes", referencia)
    return total
```

e trocar o corpo de `avisar_parcerias` para:

```python
    return avisar_protecao(db, agora) + avisar_convites(db, agora)
```

- [ ] **Step 4: rodar e ver passar** — `tests/unit/test_parcerias_alertas.py`. Expected: tudo passa.

---

### Task 5: job diário

**Files:**
- Modify: `backend/app/workers/scheduler.py`
- Modify: `backend/tests/unit/test_notificacoes_limpeza_e_agenda.py`

- [ ] **Step 1: teste que falha** — em `test_jobs_registrados`, trocar o primeiro assert por:

```python
    assert {"resumo_manha", "reuniao_15min", "cards_novos_servico", "limpar_notificacoes",
            "alertas_parcerias"} <= ids
```

- [ ] **Step 2: rodar e ver falhar** — `tests/unit/test_notificacoes_limpeza_e_agenda.py::test_jobs_registrados`.

- [ ] **Step 3: implementar** — em `scheduler.py`, depois de `job_limpar_notificacoes`:

```python
def job_alertas_parcerias():
    from app.services.notificacoes.parcerias import avisar_parcerias
    _rodar_aviso("alertas de Parcerias", avisar_parcerias)
```

e em `configure_jobs`, depois do `job_limpar_notificacoes`:

```python
    # Parcerias (Entrega 4): proteção do CNPJ e convite sem ativação. Todo dia
    # (o prazo conta dias corridos), às 8h — o agendador já está no fuso de São Paulo.
    sched.add_job(job_alertas_parcerias, trigger=CronTrigger(hour=8, minute=0),
                  id="alertas_parcerias", name="Alertas de Parcerias", replace_existing=True)
```

- [ ] **Step 4: rodar e ver passar.**

---

### Task 6: tela de Configurações → Notificações

**Files:**
- Modify: `frontend/src/types/index.ts` (~linha 833)
- Modify: `frontend/src/components/settings/NotificacoesConfig.tsx`

- [ ] **Step 1: tipos** — em `NotificationSettings`, depois de `popup_navegador: boolean;`:

```ts
  parcerias_protecao: boolean;
  parcerias_convite: boolean;
```

e no `Pick` de `NotificationSettingsUpdate` acrescentar `| "parcerias_protecao" | "parcerias_convite"`.

- [ ] **Step 2: tela** — em `NotificacoesConfig.tsx`:
  - `type Chave = ... | "popup_navegador" | "parcerias_protecao" | "parcerias_convite";`
  - depois de `const servico = ...`:

```tsx
  // Quem participa do Programa de Parceiros (o vendedor pode ser Responsável H&S).
  const parcerias = ["admin", "manager", "salesperson", "partner", "partner_member", "hunter"].includes(papel ?? "");
```

  - depois da seção `{vendas && (... Vendas ...)}`:

```tsx
      {parcerias && (
        <section>
          <h3 className={TITULO}>Parcerias</h3>
          <div className="space-y-3">
            <Linha titulo="Proteção do CNPJ da oportunidade" descricao="3 dias antes de uma oportunidade perder a proteção por falta de atividade, e no dia em que perde. Sino e e-mail.">
              <Interruptor ligado={prefs.parcerias_protecao} onChange={(v) => alternar("parcerias_protecao", v)} />
            </Linha>
            <Linha titulo="Convite sem ativação" descricao="Quando uma empresa ou hunter convidado passa de 23 e de 30 dias sem aceitar os termos. Sino e e-mail.">
              <Interruptor ligado={prefs.parcerias_convite} onChange={(v) => alternar("parcerias_convite", v)} />
            </Linha>
          </div>
        </section>
      )}
```

- [ ] **Step 3: checar** — em `frontend/`: `npx tsc --noEmit -p . && npm run build`. Expected: sem erros.

---

### Task 7: versão 1.11.26, documentação e suíte inteira

**Files:** `CHANGELOG.md`, `frontend/src/components/common/ChangelogModal.tsx`, `frontend/src/layouts/MainLayout.tsx` (rodapé), `docs/programa-de-parceiros.md`.

- [ ] **Step 1: CHANGELOG** — nova seção depois de `## [Não lançado]` / `---`:

```markdown
## [1.11.26] — 16/11/2026

### Adicionado
- **Parcerias — alertas (Entrega 4):** todo dia às 8h, sino e e-mail.
  - **Proteção do CNPJ:** 3 dias antes de uma oportunidade de parceiro perder a proteção por falta de atividade (o prazo da Consulta de CNPJ, hoje 10 dias) e no dia em que perde. Recebem o vendedor da oportunidade, o dono do parceiro (ou o hunter) e o Responsável H&S. Registrar atividade recomeça a contagem.
  - **Convite sem ativação:** quando uma empresa ou hunter convidado passa de 23 e de 30 dias sem aceitar os termos. Recebem o Responsável H&S (sem ele, os admins) e quem indicou. Só avisa: a situação continua "Convidado".
- **Configurações → Notificações → Parcerias:** um interruptor para cada alerta (desliga sino e e-mail). Começam ligados.

### Banco de dados
- Migration aditiva `2a3b4c5d6e7f` (down `1f2a3b4c5d6e`): colunas `parcerias_protecao` e `parcerias_convite` em `user_notification_settings`, ligadas para todos. Pode rodar antes do código.
```

- [ ] **Step 2: ChangelogModal** — no topo do array `CHANGELOG`:

```ts
  {
    version: "1.11.26",
    date: "16/11/2026",
    entries: [
      {
        type: "feature",
        text: "Parcerias: alertas por sino e e-mail — 3 dias antes de uma oportunidade perder a proteção do CNPJ e no dia em que perde, e convite de empresa ou hunter sem ativação nos dias 23 e 30.",
      },
      {
        type: "feature",
        text: "Configurações → Notificações: seção Parcerias para ligar ou desligar cada alerta.",
      },
    ],
  },
```

- [ ] **Step 3: rodapé** — `MainLayout.tsx`: `HSGrowth CRM v1.11.25` → `HSGrowth CRM v1.11.26`.
- [ ] **Step 4: guia** — `docs/programa-de-parceiros.md`: na lista de pendências (§8) tirar a Entrega 4 (fica só a 7, Finder) e acrescentar, na seção de regras, um item "Alertas" com o resumo do CHANGELOG.
- [ ] **Step 5: suíte inteira** — `... pytest tests --ignore=tests/e2e ...` (≈9 min). Expected: 1505 + novos, todos passando.
- [ ] **Step 6: perguntar ao usuário "posso commitar?"** e, com o sim, commitar: `feat(parcerias): alertas de protecao do CNPJ e convite sem ativacao` e `chore(release): v1.11.26`.
