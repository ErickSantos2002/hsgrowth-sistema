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
