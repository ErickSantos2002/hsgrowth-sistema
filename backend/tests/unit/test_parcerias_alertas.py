"""
Entrega 4 — alertas de Parcerias: proteção do CNPJ da oportunidade (3 dias antes
e no dia em que perde) e convite sem ativação (dia 23 e dia 30). Sino + e-mail.
"""
from datetime import datetime, timedelta

import pytest

from app.models.cnpj_rules_config import CnpjRulesConfig
from app.models.partner import PartnerTeamMember
from app.models.partner_activity import PartnerActivity
from app.models.user_notification_setting import UserNotificationSetting
from app.services import envio_email
from app.services.notificacoes import parcerias as alertas
from tests.unit.apoio_notificacoes import avisos
from tests.unit.apoio_parcerias import oportunidade, parceiro
from app.schemas.user_notification_setting import (
    UserNotificationSettingResponse, UserNotificationSettingUpdate,
)
from app.services.notificacoes.tipos import tipo_por_id
from app.services.parcerias.semaforo import data_de_queda, protegido
from app.services.user_notification_service import UserNotificationService
from tests.unit.apoio_parcerias import usuario

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
