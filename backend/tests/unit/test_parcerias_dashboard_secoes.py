"""Dashboard de Parcerias: seções no padrão dos outros dashboards (spec 2026-11-16)."""
from datetime import date, datetime, timedelta
from types import SimpleNamespace

from pydantic import TypeAdapter

from app.models.cnpj_rules_config import CnpjRulesConfig
from app.models.partner import PartnerTeamMember
from app.models.partner_activity import PartnerActivity
from app.schemas.parcerias import DashboardResponse
from app.services.parcerias import dashboard
from app.services.parcerias import dashboard_secoes as secoes
from tests.unit.apoio_parcerias import (
    config_comissoes, hunter, oportunidade, oportunidade_ganha, parceiro, usuario,
)

AGORA = datetime(2026, 11, 16, 15, 0)  # 12h em São Paulo
DE, ATE = date(2026, 11, 1), date(2026, 11, 16)


def _dia(n: float) -> datetime:
    return AGORA - timedelta(days=n)


def _op(db, p, etapa="novo_lead", valor=None, criada_ha=1, **campos):
    """Oportunidade criada há N dias; com `valor`, leva um produto desse preço."""
    campos.setdefault("created_at", _dia(criada_ha))
    if valor is None:
        return oportunidade(db, p, stage=etapa, **campos)
    campos.setdefault("won_at", None)
    return oportunidade_ganha(db, p, valor, stage=etapa, **campos)


def _escopo(*parceiros, membro=None):
    return secoes.Escopo(tuple(p.id for p in parceiros), membro.id if membro else None)


class TestResumoEPipeline:

    def test_abertas_por_etapa_e_novas_no_periodo(self, db):
        a = parceiro(db, "A")
        _op(db, a, "novo_lead", criada_ha=2)
        _op(db, a, "proposta", valor=1000, criada_ha=40)  # criada em outubro
        _op(db, a, "proposta", valor=500, criada_ha=3, eligibility_status="rejeitada")
        _op(db, a, "perdido", criada_ha=5, lost_at=_dia(1))
        _op(db, a, "ganho", valor=2000, criada_ha=10, modality="venda", won_confirmed_at=_dia(1))

        resumo, pipeline = secoes.resumo_e_pipeline(db, _escopo(a), DE, ATE)

        assert resumo == {"novas": 4, "em_negociacao": {"quantidade": 2, "valor": "1000.00"}}
        assert [(e["etapa"], e["quantidade"], e["valor"]) for e in pipeline] == [
            ("novo_lead", 1, "0.00"), ("oportunidade", 0, "0.00"), ("proposta", 1, "1000.00"),
            ("negociacao", 0, "0.00"), ("aguardando_pedido", 0, "0.00"),
        ]
        assert pipeline[0]["nome"] == "Novo Lead"

    def test_excluida_e_outro_parceiro_ficam_de_fora(self, db):
        a, b = parceiro(db, "A"), parceiro(db, "B")
        _op(db, a, "proposta", valor=100, is_deleted=True)
        _op(db, b, "proposta", valor=300)

        resumo, _ = secoes.resumo_e_pipeline(db, _escopo(a), DE, ATE)

        assert resumo == {"novas": 0, "em_negociacao": {"quantidade": 0, "valor": "0.00"}}

    def test_vendedor_da_equipe_so_as_dele(self, db):
        a = parceiro(db, "A")
        m1 = PartnerTeamMember(partner_id=a.id, name="Ana")
        m2 = PartnerTeamMember(partner_id=a.id, name="Beto")
        db.add_all([m1, m2])
        db.commit()
        _op(db, a, "proposta", valor=1000, seller_member_id=m1.id)
        _op(db, a, "proposta", valor=300, seller_member_id=m2.id)

        resumo, _ = secoes.resumo_e_pipeline(db, _escopo(a, membro=m1), DE, ATE)

        assert resumo["em_negociacao"] == {"quantidade": 1, "valor": "1000.00"}


class TestConversao:

    def test_taxas_e_tempo_medio(self, db):
        a = parceiro(db, "A")
        _op(db, a, "ganho", valor=2000, criada_ha=10, modality="venda", won_confirmed_at=_dia(1),
            eligibility_status="validada", eligibility_at=_dia(8))
        # Locação também é negócio fechado: entra no fechamento (mas não no card de vendas).
        _op(db, a, "ganho", valor=900, criada_ha=5, modality="locacao", won_confirmed_at=_dia(2),
            eligibility_status="validada", eligibility_at=_dia(4))
        _op(db, a, "perdido", criada_ha=5, lost_at=_dia(1),
            eligibility_status="rejeitada", eligibility_at=_dia(4))
        _op(db, a, "perdido", criada_ha=60, lost_at=_dia(45))  # perdida em outubro
        _op(db, a, "proposta", criada_ha=50, eligibility_status="validada", eligibility_at=_dia(40))
        _op(db, a, "ganho", valor=100, criada_ha=3, modality="venda")  # ganho sem confirmação

        assert secoes.conversao(db, _escopo(a), DE, ATE) == {
            "ganhos": 2, "perdidos": 1, "taxa_fechamento": 66.7,
            "validadas": 2, "rejeitadas": 1, "taxa_elegibilidade": 66.7,
            "tempo_medio_ganho_dias": 6.0,  # (9 + 3) / 2
        }

    def test_sem_base_fica_none(self, db):
        a = parceiro(db, "A")
        _op(db, a, "proposta")

        c = secoes.conversao(db, _escopo(a), DE, ATE)

        assert c["ganhos"] == 0
        assert c["taxa_fechamento"] is None
        assert c["taxa_elegibilidade"] is None
        assert c["tempo_medio_ganho_dias"] is None


def _atividade(db, op, prazo, **campos):
    db.add(PartnerActivity(partner_id=op.partner_id, opportunity_id=op.id, category="atividade",
                           title=campos.pop("title", "Ligar"), due_date=prazo, **campos))
    db.commit()


class TestRiscos:

    def test_protecao_3_dias_entra_4_nao_e_perdida_nao(self, db):
        a = parceiro(db, "A")
        entra = _op(db, a, "proposta", criada_ha=7, title="Entra")
        _op(db, a, "proposta", criada_ha=6, title="Quatro dias")
        _op(db, a, "proposta", criada_ha=11, title="Já perdeu")
        _op(db, a, "ganho", criada_ha=8, title="Fechada")

        r = secoes.riscos(db, _escopo(a), AGORA)

        assert set(r) == {"protecao", "atividades_vencidas"}
        assert r["protecao"]["total"] == 1
        [item] = r["protecao"]["itens"]
        assert item["id"] == entra.id
        assert item["detalhe"] == "Perde a proteção em 3 dias"
        assert item["empresa"] == "Empresa A"
        assert item["quando"] == AGORA + timedelta(days=3)
        assert item["link"] == f"/parcerias/oportunidades/{entra.id}"

    def test_parceiro_bloqueado_e_regra_desligada_nao_entram(self, db):
        b = parceiro(db, "B", stage="bloqueado")
        _op(db, b, "proposta", criada_ha=7)
        assert secoes.riscos(db, _escopo(b), AGORA)["protecao"]["total"] == 0

        a = parceiro(db, "A")
        _op(db, a, "proposta", criada_ha=7)
        db.add(CnpjRulesConfig(protection_days=0))
        db.commit()
        assert secoes.riscos(db, _escopo(a), AGORA)["protecao"]["total"] == 0

    def test_atividades_vencidas(self, db):
        a = parceiro(db, "A")
        op = _op(db, a, "proposta", criada_ha=2)
        _atividade(db, op, AGORA - timedelta(hours=30))
        _atividade(db, op, AGORA - timedelta(hours=5))
        _atividade(db, op, AGORA + timedelta(days=1), title="Futura")
        _atividade(db, op, _dia(3), title="Feita", is_completed=True)

        r = secoes.riscos(db, _escopo(a), AGORA)

        [item] = r["atividades_vencidas"]["itens"]
        assert item["id"] == op.id
        assert item["detalhe"] == "2 atividades vencidas"
        assert item["quando"] == AGORA - timedelta(hours=30)
        assert r["protecao"]["total"] == 0  # a atividade futura segura a proteção

    def test_riscos_so_da_hs(self, db):
        a = parceiro(db, "A")
        g = _op(db, a, "ganho", criada_ha=4, won_at=_dia(1), eligibility_status="validada")
        n = _op(db, a, "novo_lead", criada_ha=2)
        _op(db, a, "perdido", criada_ha=2)  # em análise, mas perdida
        velho = parceiro(db, "Convidado velho", stage="convidado", terms_accepted_at=None)
        novo = parceiro(db, "Convidado novo", stage="convidado", terms_accepted_at=None)
        for p, dias in ((velho, 25), (novo, 10)):
            login = usuario(db, "partner", f"p{p.id}@x.com", partner=p)
            login.created_at = _dia(dias)
        db.commit()

        r = secoes.riscos(db, _escopo(a, velho, novo), AGORA, da_hs=True)

        assert [i["id"] for i in r["ganho_a_confirmar"]["itens"]] == [g.id]
        assert [i["id"] for i in r["elegibilidade_em_analise"]["itens"]] == [n.id]
        [c] = r["convites"]["itens"]
        assert c["id"] == velho.id
        assert c["detalhe"] == "Convidado há 25 dias"
        assert c["link"] == f"/parcerias/aquisicao/{velho.id}"

    def test_lista_corta_em_50_mas_conta_todas(self, db):
        a = parceiro(db, "A")
        for _ in range(secoes.MAX_ITENS_RISCO + 2):
            _op(db, a, "novo_lead", criada_ha=1)

        r = secoes.riscos(db, _escopo(a), AGORA, da_hs=True)

        assert r["elegibilidade_em_analise"]["total"] == secoes.MAX_ITENS_RISCO + 2
        assert len(r["elegibilidade_em_analise"]["itens"]) == secoes.MAX_ITENS_RISCO


VALIDA = TypeAdapter(DashboardResponse)
SECOES = {"resumo", "evolucao", "pipeline", "conversao", "riscos"}
SO_HS = {"ganho_a_confirmar", "elegibilidade_em_analise", "convites"}


def _membro(db, p, nome, email):
    login = usuario(db, "partner_member", email, p)
    m = PartnerTeamMember(partner_id=p.id, name=nome, email=email, user_id=login.id)
    db.add(m)
    db.commit()
    db.refresh(m)
    return m, login


def _proposta(r):
    [e] = [e for e in r["pipeline"] if e["etapa"] == "proposta"]
    return e["quantidade"], e["valor"]


def _cenario_perfis(db):
    """Empresa A (Ana e Beto), unidade B indicada pelo hunter, e uma oportunidade de cada."""
    config_comissoes(db)
    ph, uh = hunter(db)
    a = parceiro(db, "A")
    b = parceiro(db, "B", indicated_by_partner_id=ph.id)
    dono = usuario(db, "partner", "dono@a.com", a)
    m1, login1 = _membro(db, a, "Ana", "ana@a.com")
    m2, _ = _membro(db, a, "Beto", "beto@a.com")
    _op(db, a, "proposta", valor=1000, seller_member_id=m1.id)
    _op(db, a, "proposta", valor=300, seller_member_id=m2.id)
    _op(db, b, "proposta", valor=700)
    _op(db, ph, "proposta", valor=50)
    return SimpleNamespace(ph=ph, uh=uh, a=a, b=b, dono=dono, login1=login1,
                           admin=usuario(db, "admin", "adm@hs.com"))


class TestPorPerfil:

    def test_vendedor_so_as_dele_e_sem_comissao(self, db):
        c = _cenario_perfis(db)
        r = dashboard.painel_vendedor(db, c.login1, DE, ATE, agora=AGORA)
        assert set(r) == {"visao", "vendas"} | SECOES
        assert _proposta(r) == (1, "1000.00")
        assert set(r["riscos"]) == {"protecao", "atividades_vencidas"}
        assert "comissoes" not in VALIDA.validate_python(r).model_dump()

    def test_empresa_ve_a_equipe_toda(self, db):
        c = _cenario_perfis(db)
        r = dashboard.painel_empresa(db, c.dono, DE, ATE, agora=AGORA)
        assert SECOES <= set(r) and "comissoes" in r
        assert _proposta(r) == (2, "1300.00")
        assert not SO_HS & set(r["riscos"])
        VALIDA.validate_python(r)

    def test_hunter_pipeline_so_das_proprias(self, db):
        c = _cenario_perfis(db)
        r = dashboard.painel_hunter(db, c.uh, DE, ATE, agora=AGORA)
        assert _proposta(r) == (1, "50.00")
        assert not SO_HS & set(r["riscos"])
        VALIDA.validate_python(r)

    def test_hs_ve_tudo_e_os_filtros_valem(self, db):
        c = _cenario_perfis(db)
        r = dashboard.painel_hs(db, c.admin, DE, ATE, agora=AGORA)
        assert _proposta(r) == (4, "2050.00")
        assert SO_HS <= set(r["riscos"])
        VALIDA.validate_python(r)
        com_hunter = dashboard.painel_hs(db, c.admin, DE, ATE, hunter_id=c.ph.id, agora=AGORA)
        assert _proposta(com_hunter) == (2, "750.00")
        com_empresa = dashboard.painel_hs(db, c.admin, DE, ATE, partner_id=c.a.id, agora=AGORA)
        assert _proposta(com_empresa) == (2, "1300.00")


class TestEvolucao:

    @staticmethod
    def _venda(db, p, valor, quando):
        return _op(db, p, "ganho", valor=valor, modality="venda", won_confirmed_at=quando,
                   created_at=quando - timedelta(days=1))

    def test_seis_meses_com_os_zerados(self, db):
        config_comissoes(db)
        admin = usuario(db, "admin", "adm@hs.com")
        a = parceiro(db, "A")
        self._venda(db, a, 300, datetime(2026, 5, 20, 15))  # fora da janela
        self._venda(db, a, 1000, datetime(2026, 9, 5, 15))
        self._venda(db, a, 500, datetime(2026, 11, 10, 15))

        r = dashboard.painel_hs(db, admin, DE, ATE, agora=AGORA)

        assert [(m["mes"], m["valor"]) for m in r["evolucao"]] == [
            ("2026-06", "0.00"), ("2026-07", "0.00"), ("2026-08", "0.00"),
            ("2026-09", "1000.00"), ("2026-10", "0.00"), ("2026-11", "500.00"),
        ]
        assert r["vendas"] == {"quantidade": 1, "valor": "500.00"}  # o card segue o período

    def test_termina_no_mes_do_fim_do_periodo_ou_no_de_hoje(self, db):
        config_comissoes(db)
        admin = usuario(db, "admin", "adm@hs.com")
        a = parceiro(db, "A")
        self._venda(db, a, 300, datetime(2026, 5, 20, 15))

        r = dashboard.painel_hs(db, admin, None, date(2026, 9, 30), agora=AGORA)

        assert [m["mes"] for m in r["evolucao"]] == [
            "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"]
        assert r["evolucao"][1] == {"mes": "2026-05", "quantidade": 1, "valor": "300.00"}
        sem_fim = dashboard.painel_hs(db, admin, None, None, agora=AGORA)
        assert sem_fim["evolucao"][-1]["mes"] == "2026-11"

    def test_hunter_soma_a_carteira(self, db):
        config_comissoes(db)
        ph, uh = hunter(db)
        b = parceiro(db, "B", indicated_by_partner_id=ph.id)
        self._venda(db, ph, 100, _dia(1))
        self._venda(db, b, 700, _dia(1))

        r = dashboard.painel_hunter(db, uh, DE, ATE, agora=AGORA)

        assert r["evolucao"][-1]["valor"] == "800.00"
        assert r["vendas"]["valor"] == "100.00"
