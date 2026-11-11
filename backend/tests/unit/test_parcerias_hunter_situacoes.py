"""Aquisição com 4 situações: o card não se move na mão e o ganho não mexe na situação."""
from datetime import date

from tests.unit.apoio_parcerias import headers, oportunidade, parceiro, usuario

URL = "/api/v1/parcerias"
MENSAGEM = "As situações mudam sozinhas (convite e aceite) ou pelo botão Bloquear."


def test_mover_card_de_aquisicao_e_recusado(client, db, admin_headers):
    p = parceiro(db, stage="potencial")

    for destino in ("convidado", "ativado", "bloqueado", "potencial"):
        r = client.put(f"{URL}/parceiros/{p.id}/mover", json={"stage": destino}, headers=admin_headers)
        assert r.status_code == 422
        assert r.json()["detail"] == MENSAGEM
    db.refresh(p)
    assert p.stage == "potencial"


def test_ganho_nao_muda_situacao_do_parceiro(client, db):
    p = parceiro(db, stage="convidado")
    op = oportunidade(db, p, stage="aguardando_pedido", modality="venda", expected_close_date=date(2026, 11, 30))
    h = headers(usuario(db, "partner", "a@dmap.com", p))

    r = client.put(f"{URL}/oportunidades/{op.id}/mover", json={"stage": "ganho"}, headers=h)

    assert r.status_code == 200
    db.refresh(p)
    assert p.stage == "convidado"
    assert p.activated_at is None


def test_cadastro_pela_hs_nasce_potencial(client, admin_headers):
    r = client.post(f"{URL}/parceiros", json={"name": "Dmap"}, headers=admin_headers)

    assert r.status_code == 201
    assert r.json()["stage"] == "potencial"


def test_etapas_de_aquisicao_sao_quatro(client, admin_headers):
    r = client.get(f"{URL}/etapas", headers=admin_headers).json()["aquisicao"]
    assert [e["codigo"] for e in r] == ["potencial", "convidado", "ativado", "bloqueado"]
