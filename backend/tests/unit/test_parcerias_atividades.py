"""Atividades dos dois boards, no padrão dos cards de Serviço: atividade (Foco), anotação, arquivo e alteração."""
from datetime import datetime, timedelta

from tests.unit.apoio_parcerias import headers, oportunidade, parceiro, usuario

URL = "/api/v1/parcerias"


def test_atividade_na_oportunidade_atualiza_a_ultima_atividade(client, db):
    p = parceiro(db)
    op = oportunidade(db, p, last_activity_at=datetime.utcnow() - timedelta(days=20))
    h = headers(usuario(db, "partner", "a@dmap.com", p))

    criada = client.post(f"{URL}/oportunidades/{op.id}/atividades",
                         json={"category": "atividade", "activity_type": "call", "title": "Ligar para o comprador",
                               "priority": "high", "due_date": "2026-11-05T10:00:00"}, headers=h)

    assert criada.status_code == 201
    corpo = criada.json()
    assert corpo["user_name"] == "a"
    assert corpo["category"] == "atividade"
    assert corpo["is_completed"] is False
    db.refresh(op)
    assert op.last_activity_at > datetime.utcnow() - timedelta(minutes=1)


def test_atividade_sem_titulo_e_recusada(client, db):
    p = parceiro(db)
    h = headers(usuario(db, "partner", "a@dmap.com", p))

    resposta = client.post(f"{URL}/parceiros/{p.id}/atividades", json={"category": "atividade"}, headers=h)

    assert resposta.status_code == 422


def test_anotacao_criar_editar_excluir(client, db):
    p = parceiro(db)
    h = headers(usuario(db, "partner", "a@dmap.com", p))
    nota = client.post(f"{URL}/parceiros/{p.id}/atividades",
                       json={"category": "anotacao", "description": "Reunião boa"}, headers=h).json()

    editada = client.put(f"{URL}/atividades/{nota['id']}", json={"description": "Reunião ótima"}, headers=h)
    assert editada.json()["description"] == "Reunião ótima"

    assert client.delete(f"{URL}/atividades/{nota['id']}", headers=h).status_code == 200
    restantes = client.get(f"{URL}/parceiros/{p.id}/atividades", headers=h).json()
    assert all(a["category"] != "anotacao" for a in restantes)


def test_concluir_com_resultado_e_editar_registra_edicao(client, db):
    p = parceiro(db)
    h = headers(usuario(db, "partner", "a@dmap.com", p))
    tarefa = client.post(f"{URL}/parceiros/{p.id}/atividades",
                         json={"category": "atividade", "activity_type": "whatsapp", "title": "Mandar proposta"},
                         headers=h).json()

    editada = client.put(f"{URL}/atividades/{tarefa['id']}", json={"title": "Mandar proposta revisada"}, headers=h).json()
    assert len(editada["activity_metadata"]["edits"]) == 1

    concluida = client.patch(f"{URL}/atividades/{tarefa['id']}/concluir",
                             json={"is_completed": True, "is_valid": True}, headers=h).json()
    assert concluida["is_completed"] is True
    assert concluida["completed_at"] is not None
    assert concluida["activity_metadata"]["is_valid"] is True


def test_alteracao_e_do_sistema(client, db, admin_headers):
    criado = client.post(f"{URL}/parceiros", json={"name": "Dmap"}, headers=admin_headers).json()
    [evento] = client.get(f"{URL}/parceiros/{criado['id']}/atividades", headers=admin_headers).json()

    assert evento["category"] == "alteracao"
    assert evento["activity_type"] == "card_created"
    assert client.delete(f"{URL}/atividades/{evento['id']}", headers=admin_headers).status_code == 422
    assert client.put(f"{URL}/atividades/{evento['id']}", json={"description": "x"},
                      headers=admin_headers).status_code == 422


def test_mudanca_de_etapa_vira_alteracao(client, db, admin_headers):
    p = parceiro(db, stage="potencial", main_contact_name="Carlos", main_contact_phone="11999990000",
                 hs_owner_id=usuario(db, "manager", "g@hs.com").id)

    client.put(f"{URL}/parceiros/{p.id}/mover", json={"stage": "qualificacao"}, headers=admin_headers)

    tipos = [a["activity_type"] for a in client.get(f"{URL}/parceiros/{p.id}/atividades", headers=admin_headers).json()]
    assert "stage_change" in tipos


def test_arquivo_anexar_baixar_excluir(client, db, tmp_path, monkeypatch):
    from app.services.parcerias import atividades as modulo
    monkeypatch.setattr(modulo, "UPLOAD_DIR", tmp_path)
    p = parceiro(db)
    op = oportunidade(db, p)
    h = headers(usuario(db, "partner", "a@dmap.com", p))

    enviado = client.post(f"{URL}/oportunidades/{op.id}/atividades/arquivos",
                          files={"file": ("proposta.pdf", b"%PDF-1.4 teste", "application/pdf")}, headers=h)
    assert enviado.status_code == 201
    arquivo = enviado.json()
    assert arquivo["category"] == "arquivo"
    assert arquivo["file_name"] == "proposta.pdf"
    assert arquivo["file_size"] == len(b"%PDF-1.4 teste")

    baixado = client.get(f"{URL}/atividades/{arquivo['id']}/arquivo", headers=h)
    assert baixado.status_code == 200
    assert baixado.content == b"%PDF-1.4 teste"

    assert client.delete(f"{URL}/atividades/{arquivo['id']}", headers=h).status_code == 200
    assert not any(tmp_path.rglob("*.pdf"))


def test_parceiro_nao_mexe_em_atividade_de_outro(client, db):
    a, b = parceiro(db, "Dmap"), parceiro(db, "Outro")
    op_b = oportunidade(db, b)
    h_b = headers(usuario(db, "partner", "b@outro.com", b))
    atividade = client.post(f"{URL}/oportunidades/{op_b.id}/atividades",
                            json={"category": "anotacao", "description": "x"}, headers=h_b).json()
    h_a = headers(usuario(db, "partner", "a@dmap.com", a))

    assert client.get(f"{URL}/oportunidades/{op_b.id}/atividades", headers=h_a).status_code == 404
    assert client.delete(f"{URL}/atividades/{atividade['id']}", headers=h_a).status_code == 404
    assert client.get(f"{URL}/atividades/{atividade['id']}/arquivo", headers=h_a).status_code == 404


def test_financeiro_so_le(client, db):
    p = parceiro(db)
    financeiro = headers(usuario(db, "finance", "fin@hs.com"))

    assert client.get(f"{URL}/parceiros/{p.id}/atividades", headers=financeiro).status_code == 200
    assert client.post(f"{URL}/parceiros/{p.id}/atividades", json={"category": "anotacao", "description": "x"},
                       headers=financeiro).status_code == 403
