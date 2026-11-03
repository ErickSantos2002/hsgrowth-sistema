"""Semáforo da Consulta de CNPJ: proteção por atividade e as cores."""
from datetime import date, datetime, timedelta, timezone

from app.models.card_note import CardNote
from app.models.card_task import CardTask
from app.models.partner_activity import PartnerActivity
from app.services.parcerias.semaforo import (
    Registro,
    juntar,
    motivo_do_registro,
    protecao_de_parceiro,
    protegido,
    situacao,
)

from tests.unit.apoio_parcerias import (
    CNPJ_A, CNPJ_B, CNPJ_FILIAL_A, card_de_vendas, oportunidade, parceiro, usuario, vendas,
)

AGORA = datetime(2026, 11, 3, 12, 0)
CNPJ = "11222333000181"
FILIAL = "11222333000262"


def dias(n):
    return AGORA - timedelta(days=n)


def dias_reais(n):
    return datetime.utcnow() + timedelta(days=n)


# ── Proteção (regras 4 e 5) ─────────────────────────────────────────────────

def test_atividade_agendada_longe_protege():
    assert protegido(AGORA, prazos=[AGORA + timedelta(days=60)], movimentos=[dias(40)])


def test_atividade_atrasada_ate_10_dias_protege():
    assert protegido(AGORA, prazos=[dias(9)], movimentos=[dias(40)])


def test_atividade_atrasada_mais_de_10_dias_nao_protege():
    assert not protegido(AGORA, prazos=[dias(11)], movimentos=[dias(40)])


def test_movimento_recente_protege_mesmo_com_atividade_atrasada():
    assert protegido(AGORA, prazos=[dias(12)], movimentos=[dias(1)])


def test_sem_atividade_e_sem_movimento_recente_nao_protege():
    assert not protegido(AGORA, prazos=[None], movimentos=[dias(11), None])


def test_aceita_datas_com_fuso():
    assert protegido(AGORA, prazos=[], movimentos=[dias(2).replace(tzinfo=timezone.utc)])


# ── Motivo de cada registro ──────────────────────────────────────────────────

def test_motivo_do_registro():
    assert motivo_do_registro(AGORA, aberto=True, protegido_=True) == ("em_negociacao", None)
    assert motivo_do_registro(AGORA, aberto=True, protegido_=False) is None
    assert motivo_do_registro(AGORA, aberto=False, ganho_em=dias(10)) == ("compra_recente", date(2026, 11, 23))
    assert motivo_do_registro(AGORA, aberto=False, ganho_em=dias(31)) is None
    assert motivo_do_registro(AGORA, aberto=False, perdido_em=dias(30)) == ("perdida_recente", date(2027, 1, 2))
    assert motivo_do_registro(AGORA, aberto=False, perdido_em=dias(91)) is None


# ── Juntar ───────────────────────────────────────────────────────────────────

def reg(cnpj=CNPJ, motivo="em_negociacao", libera_em=None):
    return Registro(tipo="card", id=1, titulo="T", onde="Prospecção · Lead Novo", responsavel="Miguel",
                    cnpj=cnpj, motivo=motivo, libera_em=libera_em, parceiro_id=None, parceiro=None,
                    desde=AGORA)


def test_livre():
    s = juntar(CNPJ, [])
    assert (s.resultado, s.motivo, s.frase) == ("verde", "livre", "Pode cadastrar.")


def test_outra_unidade_e_amarelo():
    s = juntar(CNPJ, [reg(cnpj=FILIAL)])
    assert (s.resultado, s.motivo) == ("amarelo", "outra_unidade")


def test_mesmo_cnpj_vence_outra_unidade():
    s = juntar(CNPJ, [reg(cnpj=FILIAL), reg(motivo="perdida_recente", libera_em=date(2026, 12, 1))])
    assert (s.resultado, s.motivo) == ("vermelho", "perdida_recente")
    assert s.frase == "Negociação encerrada há pouco. Disponível a partir de 01/12/2026."


def test_em_negociacao_vence_e_data_mais_distante():
    s = juntar(CNPJ, [
        reg(motivo="compra_recente", libera_em=date(2026, 11, 20)),
        reg(motivo="em_negociacao"),
    ])
    assert s.motivo == "em_negociacao"
    assert s.frase == "Esta empresa já está em negociação."

    s = juntar(CNPJ, [
        reg(motivo="perdida_recente", libera_em=date(2027, 1, 10)),
        reg(motivo="compra_recente", libera_em=date(2026, 11, 20)),
    ])
    assert s.motivo == "compra_recente"
    assert s.libera_em == date(2027, 1, 10)


# ── Com o banco ──────────────────────────────────────────────────────────────

def test_card_de_vendas_novo_bloqueia(db):
    v = vendas(db)
    card_de_vendas(db, v.lead_novo)

    s = situacao(db, CNPJ_A)

    assert (s.resultado, s.motivo) == ("vermelho", "em_negociacao")
    [r] = s.registros
    assert r.tipo == "card" and r.onde == "Prospecção · Lead Novo"


def test_card_parado_libera_e_tarefa_futura_protege(db):
    v = vendas(db)
    card = card_de_vendas(db, v.lead_novo, criado_ha=30)
    atrasada = CardTask(card_id=card.id, title="Ligar", due_date=dias_reais(-12))
    db.add(atrasada)
    db.commit()
    atrasada.created_at = dias_reais(-30)
    db.commit()
    assert situacao(db, CNPJ_A).resultado == "verde"

    db.add(CardTask(card_id=card.id, title="Visita", due_date=dias_reais(+60)))
    db.commit()
    assert situacao(db, CNPJ_A).resultado == "vermelho"


def test_anotacao_recente_protege(db):
    v = vendas(db)
    card = card_de_vendas(db, v.lead_novo, criado_ha=30)
    autor = usuario(db, "salesperson", "v@hs.com")
    db.add(CardNote(card_id=card.id, user_id=autor.id, content="Falei com o cliente"))
    db.commit()

    assert situacao(db, CNPJ_A).resultado == "vermelho"


def test_tarefa_cancelada_nao_protege(db):
    v = vendas(db)
    card = card_de_vendas(db, v.lead_novo, criado_ha=30)
    tarefa = CardTask(card_id=card.id, title="Ligar", due_date=dias_reais(+5), is_cancelled=True)
    db.add(tarefa)
    db.commit()
    # A criação da tarefa é movimento; recua para não contar.
    tarefa.created_at = dias_reais(-30)
    db.commit()

    assert situacao(db, CNPJ_A).resultado == "verde"


def test_ganho_e_perdido_de_vendas(db):
    v = vendas(db)
    card_de_vendas(db, v.proposta, is_won=1, closed_at=dias_reais(-10), criado_ha=40)
    assert situacao(db, CNPJ_A).motivo == "compra_recente"

    card_de_vendas(db, v.proposta, documento=CNPJ_B, is_won=-1, closed_at=dias_reais(-100), criado_ha=200)
    assert situacao(db, CNPJ_B).resultado == "verde"


def test_documento_com_pontuacao_e_cpf(db):
    v = vendas(db)
    card_de_vendas(db, v.lead_novo, documento="11.222.333/0001-81")
    card_de_vendas(db, v.lead_novo, documento="12345678901")

    s = situacao(db, CNPJ_A)
    assert s.resultado == "vermelho" and len(s.registros) == 1


def test_outra_unidade_da_amarelo(db):
    v = vendas(db)
    card_de_vendas(db, v.lead_novo, documento=CNPJ_FILIAL_A)

    assert situacao(db, CNPJ_A).resultado == "amarelo"


def test_oportunidade_de_parceiro_bloqueia_e_rejeitada_nao(db):
    p = parceiro(db)
    op = oportunidade(db, p, last_activity_at=dias_reais(-1))
    assert situacao(db, CNPJ_A).motivo == "em_negociacao"
    assert situacao(db, CNPJ_A, ignorar_oportunidade_id=op.id).resultado == "verde"

    op.eligibility_status = "rejeitada"
    db.commit()
    assert situacao(db, CNPJ_A).resultado == "verde"


def test_oportunidade_parada_com_atividade_futura(db):
    p = parceiro(db)
    op = oportunidade(db, p, last_activity_at=dias_reais(-20))
    op.created_at = dias_reais(-20)
    db.commit()
    assert situacao(db, CNPJ_A).resultado == "verde"

    db.add(PartnerActivity(opportunity_id=op.id, category="atividade", title="Visita",
                           due_date=dias_reais(+30)))
    db.commit()
    assert situacao(db, CNPJ_A).resultado == "vermelho"


def test_oportunidade_ganha_recente(db):
    p = parceiro(db)
    oportunidade(db, p, stage="ganho", won_at=dias_reais(-5))

    assert situacao(db, CNPJ_A).motivo == "compra_recente"


def test_protecao_de_parceiro_so_olha_oportunidades_do_mesmo_cnpj(db):
    v = vendas(db)
    card_de_vendas(db, v.lead_novo)
    p = parceiro(db)
    oportunidade(db, p, cnpj=CNPJ_FILIAL_A, last_activity_at=dias_reais(-1))
    assert protecao_de_parceiro(db, CNPJ_A) == []

    oportunidade(db, p, last_activity_at=dias_reais(-1))
    [r] = protecao_de_parceiro(db, CNPJ_A)
    assert r.parceiro == "Dmap"
