"""Contrato do parceiro e confirmação do ganho pela H&S (v1.11.11)."""
from datetime import date

from tests.unit.apoio_parcerias import headers, oportunidade, parceiro, usuario

URL = "/api/v1/parcerias"


def _anexar(client, p, h, nome="contrato.pdf"):
    return client.post(f"{URL}/parceiros/{p.id}/contrato", headers=h,
                       files={"file": (nome, b"%PDF-1.4 contrato", "application/pdf")})


# ─── Contrato ────────────────────────────────────────────────────────────────

def test_contrato_aparece_no_historico_e_troca(client, db, tmp_path, monkeypatch, admin_headers):
    monkeypatch.setattr("app.services.parcerias.atividades.UPLOAD_DIR", tmp_path)
    p = parceiro(db)

    primeiro = _anexar(client, p, admin_headers).json()
    segundo = _anexar(client, p, admin_headers, "contrato-assinado.pdf").json()

    assert segundo["contract_file_name"] == "contrato-assinado.pdf"
    assert segundo["contract_activity_id"] != primeiro["contract_activity_id"]
    arquivos = [a for a in client.get(f"{URL}/parceiros/{p.id}/atividades", headers=admin_headers).json()
                if a["category"] == "arquivo"]
    assert len(arquivos) == 2


def test_excluir_o_anexo_tira_o_contrato(client, db, tmp_path, monkeypatch, admin_headers):
    monkeypatch.setattr("app.services.parcerias.atividades.UPLOAD_DIR", tmp_path)
    p = parceiro(db)
    anexo = _anexar(client, p, admin_headers).json()["contract_activity_id"]

    assert client.delete(f"{URL}/atividades/{anexo}", headers=admin_headers).status_code == 200

    corpo = client.get(f"{URL}/parceiros/{p.id}", headers=admin_headers).json()
    assert corpo["contract_activity_id"] is None and corpo["contract_file_name"] is None


def test_financeiro_nao_anexa_contrato(client, db, tmp_path, monkeypatch):
    monkeypatch.setattr("app.services.parcerias.atividades.UPLOAD_DIR", tmp_path)
    p = parceiro(db)

    assert _anexar(client, p, headers(usuario(db, "finance", "fin@hs.com"))).status_code == 403


# ─── Ganho confirmado ────────────────────────────────────────────────────────

def _ganho(db, p):
    return oportunidade(db, p, stage="aguardando_pedido", modality="venda", expected_close_date=date(2026, 11, 30))


def test_parceiro_marca_ganho_e_fica_a_confirmar(client, db):
    p = parceiro(db)
    op = _ganho(db, p)
    h = headers(usuario(db, "partner", "a@dmap.com", p))

    corpo = client.put(f"{URL}/oportunidades/{op.id}/mover", json={"stage": "ganho"}, headers=h).json()

    assert corpo["stage"] == "ganho"
    assert corpo["won_confirmed_at"] is None and corpo["won_confirmed_by_name"] is None


def test_financeiro_confirma_o_ganho(client, db):
    p = parceiro(db)
    op = _ganho(db, p)
    client.put(f"{URL}/oportunidades/{op.id}/mover", json={"stage": "ganho"},
               headers=headers(usuario(db, "partner", "a@dmap.com", p)))

    corpo = client.put(f"{URL}/oportunidades/{op.id}/ganho", json={"acao": "confirmar"},
                       headers=headers(usuario(db, "finance", "fin@hs.com"))).json()

    assert corpo["won_confirmed_at"] is not None and corpo["won_confirmed_by_name"] == "fin"
    historico = client.get(f"{URL}/oportunidades/{op.id}/atividades", headers=headers(usuario(db, "admin", "x@hs.com")))
    assert any(a["description"] == "Ganho confirmado" for a in historico.json())


def test_negar_o_ganho_volta_para_aguardando_pedido(client, db, manager_headers):
    p = parceiro(db)
    op = _ganho(db, p)
    client.put(f"{URL}/oportunidades/{op.id}/mover", json={"stage": "ganho"}, headers=manager_headers)

    sem_motivo = client.put(f"{URL}/oportunidades/{op.id}/ganho", json={"acao": "negar"}, headers=manager_headers)
    assert sem_motivo.status_code == 422

    corpo = client.put(f"{URL}/oportunidades/{op.id}/ganho", headers=manager_headers,
                       json={"acao": "negar", "motivo": "Pedido não saiu"}).json()

    assert (corpo["stage"], corpo["won_at"]) == ("aguardando_pedido", None)
    historico = client.get(f"{URL}/oportunidades/{op.id}/atividades", headers=manager_headers).json()
    assert any(a["description"] == "Ganho negado: Pedido não saiu" for a in historico)


def test_quem_pode_e_quando_confirmar(client, db, admin_headers):
    p = parceiro(db)
    aberta = oportunidade(db, p)
    ganha = oportunidade(db, p, stage="ganho", modality="venda")

    for perfil, email in (("partner", "a@dmap.com"), ("salesperson", "v@hs.com")):
        h = headers(usuario(db, perfil, email, p if perfil == "partner" else None))
        assert client.put(f"{URL}/oportunidades/{ganha.id}/ganho", json={"acao": "confirmar"},
                          headers=h).status_code == 403
    assert client.put(f"{URL}/oportunidades/{aberta.id}/ganho", json={"acao": "confirmar"},
                      headers=admin_headers).status_code == 422


def test_reabrir_zera_a_confirmacao(client, db, admin_headers):
    op = oportunidade(db, parceiro(db), stage="ganho", modality="venda", expected_close_date=date(2026, 11, 30))
    client.put(f"{URL}/oportunidades/{op.id}/ganho", json={"acao": "confirmar"}, headers=admin_headers)

    client.put(f"{URL}/oportunidades/{op.id}/mover", json={"stage": "negociacao"}, headers=admin_headers)
    corpo = client.put(f"{URL}/oportunidades/{op.id}/mover", json={"stage": "ganho"}, headers=admin_headers).json()

    assert corpo["won_confirmed_at"] is None
