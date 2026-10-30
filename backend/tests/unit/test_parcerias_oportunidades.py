"""Board 2 — Pipeline de Parceiros: cadastro, isolamento, travas, elegibilidade, produtos, ativação."""
from app.models.partner import PartnerTeamMember
from app.models.product import Product

from tests.unit.apoio_parcerias import (
    CNPJ_A,
    CNPJ_B,
    headers,
    oportunidade,
    parceiro,
    parceiro_pronto,
    usuario,
)

URL = "/api/v1/parcerias/oportunidades"

NOVA = {
    "title": "Etilômetros Empresa A", "deal_type": "Nova Venda",
    "sector": "Indústrias de Transformação", "relationship_type": "Prospect",
    "context": "Frota de 40 caminhões", "cnpj": "11.222.333/0001-81", "company_name": "Empresa A",
}


def _login_parceiro(db, p, email="a@dmap.com"):
    return headers(usuario(db, "partner", email, p))


def test_parceiro_cria_no_proprio_canal(client, db):
    a, b = parceiro(db, "Dmap"), parceiro(db, "Outro")

    resposta = client.post(URL, json={**NOVA, "partner_id": b.id}, headers=_login_parceiro(db, a))

    assert resposta.status_code == 201
    corpo = resposta.json()
    assert corpo["partner_id"] == a.id
    assert corpo["partner_name"] == "Dmap"
    assert corpo["acquisition_channel"] == "Parceiros"
    assert corpo["stage"] == "novo_lead"
    assert corpo["eligibility_status"] == "em_analise"
    assert corpo["cnpj"] == CNPJ_A
    assert corpo["last_activity_at"] is not None


def test_dados_minimos(client, db):
    h = _login_parceiro(db, parceiro(db))

    assert client.post(URL, json={**NOVA, "context": ""}, headers=h).status_code == 422
    assert client.post(URL, json={**NOVA, "cnpj": "11222333000182"}, headers=h).status_code == 422


def test_admin_escolhe_o_parceiro(client, db, admin_headers):
    sem = client.post(URL, json=NOVA, headers=admin_headers)
    assert sem.status_code == 422
    assert "Escolha o parceiro" in sem.json()["detail"]

    p = parceiro(db)
    assert client.post(URL, json={**NOVA, "partner_id": p.id}, headers=admin_headers).status_code == 201


def test_vendedor_tem_que_ser_da_equipe(client, db):
    a, b = parceiro(db, "Dmap"), parceiro(db, "Outro")
    de_fora = PartnerTeamMember(partner_id=b.id, name="Bia")
    db.add(de_fora)
    db.commit()

    resposta = client.post(URL, json={**NOVA, "seller_member_id": de_fora.id}, headers=_login_parceiro(db, a))

    assert resposta.status_code == 422


def test_isolamento_entre_parceiros(client, db):
    a, b = parceiro(db, "Dmap"), parceiro(db, "Outro")
    oportunidade(db, a)
    op_b = oportunidade(db, b, cnpj=CNPJ_B)
    h = _login_parceiro(db, a)

    assert [o["partner_id"] for o in client.get(URL, headers=h).json()] == [a.id]
    assert client.get(f"{URL}/{op_b.id}", headers=h).status_code == 404
    assert client.put(f"{URL}/{op_b.id}", json={"title": "x"}, headers=h).status_code == 404
    assert client.put(f"{URL}/{op_b.id}/mover", json={"stage": "perdido", "loss_reason": "x"},
                      headers=h).status_code == 404


def test_novo_lead_so_sai_validado(client, db):
    p = parceiro(db)
    op = oportunidade(db, p)
    h = _login_parceiro(db, p)

    barrado = client.put(f"{URL}/{op.id}/mover", json={"stage": "oportunidade"}, headers=h)

    assert barrado.status_code == 422
    assert "Validada" in barrado.json()["detail"]


def test_elegibilidade(client, db):
    p = parceiro(db)
    op = oportunidade(db, p)
    financeiro = headers(usuario(db, "finance", "fin@hs.com"))

    assert client.put(f"{URL}/{op.id}/elegibilidade", json={"status": "validada"},
                      headers=_login_parceiro(db, p)).status_code == 403
    assert client.put(f"{URL}/{op.id}/elegibilidade", json={"status": "rejeitada"},
                      headers=financeiro).status_code == 422

    validada = client.put(f"{URL}/{op.id}/elegibilidade", json={"status": "validada"}, headers=financeiro)
    assert validada.status_code == 200
    assert validada.json()["eligibility_by_name"] == "fin"


def test_elegibilidade_so_em_novo_lead(client, db):
    op = oportunidade(db, parceiro(db), stage="oportunidade", eligibility_status="validada")
    financeiro = headers(usuario(db, "finance", "fin@hs.com"))

    resposta = client.put(f"{URL}/{op.id}/elegibilidade", json={"status": "rejeitada", "note": "x"},
                          headers=financeiro)

    assert resposta.status_code == 422


def test_negociacao_pede_data_e_ganho_pede_modalidade(client, db):
    p = parceiro(db)
    op = oportunidade(db, p, stage="proposta", eligibility_status="validada")
    h = _login_parceiro(db, p)

    assert client.put(f"{URL}/{op.id}/mover", json={"stage": "negociacao"}, headers=h).status_code == 422
    com_data = client.put(f"{URL}/{op.id}/mover",
                          json={"stage": "negociacao", "expected_close_date": "2026-11-30"}, headers=h)
    assert com_data.status_code == 200

    assert client.put(f"{URL}/{op.id}/mover", json={"stage": "ganho"}, headers=h).status_code == 422
    ganho = client.put(f"{URL}/{op.id}/mover", json={"stage": "ganho", "modality": "venda"}, headers=h)
    assert ganho.status_code == 200
    assert ganho.json()["won_at"] is not None

    reabrir = client.put(f"{URL}/{op.id}/mover", json={"stage": "negociacao"}, headers=h)
    assert reabrir.status_code == 422


def test_cnpj_nao_muda_depois_de_validado(client, db):
    p = parceiro(db)
    op = oportunidade(db, p, eligibility_status="validada")

    resposta = client.put(f"{URL}/{op.id}", json={"cnpj": CNPJ_B}, headers=_login_parceiro(db, p))

    assert resposta.status_code == 422


def test_financeiro_nao_cria_oportunidade(client, db):
    p = parceiro(db)
    financeiro = headers(usuario(db, "finance", "fin@hs.com"))

    assert client.post(URL, json={**NOVA, "partner_id": p.id}, headers=financeiro).status_code == 403


def test_produtos_e_valor(client, db):
    p = parceiro(db)
    op = oportunidade(db, p)
    h = _login_parceiro(db, p)
    ativo = Product(name="Etilômetro", sku="ETL-1", unit_price=1500)
    inativo = Product(name="Antigo", unit_price=10, is_active=False)
    db.add_all([ativo, inativo])
    db.commit()

    catalogo = client.get("/api/v1/parcerias/produtos", params={"busca": "etil"}, headers=h).json()
    assert [c["name"] for c in catalogo] == ["Etilômetro"]

    item = client.post(f"{URL}/{op.id}/produtos", json={"product_id": ativo.id, "quantity": 2}, headers=h)
    assert item.status_code == 201
    assert item.json()["total"] == 3000
    assert client.get(f"{URL}/{op.id}", headers=h).json()["total_value"] == 3000

    assert client.post(f"{URL}/{op.id}/produtos", json={"product_id": inativo.id}, headers=h).status_code == 422

    assert client.delete(f"{URL}/{op.id}/produtos/{item.json()['id']}", headers=h).status_code == 200
    assert client.get(f"{URL}/{op.id}/produtos", headers=h).json() == []


def test_validar_ativa_o_parceiro(client, db):
    p = parceiro_pronto(db, stage="ativacao")
    op = oportunidade(db, p)
    financeiro = headers(usuario(db, "finance", "fin@hs.com"))

    client.put(f"{URL}/{op.id}/elegibilidade", json={"status": "validada"}, headers=financeiro)

    parceiro_depois = client.get(f"/api/v1/parcerias/parceiros/{p.id}", headers=financeiro).json()
    assert parceiro_depois["stage"] == "ativado"
    assert parceiro_depois["activation_evidence"] == "oportunidade_validada"


def test_proposta_conta_como_evidencia(client, db):
    p = parceiro_pronto(db, stage="ativacao")
    op = oportunidade(db, p, stage="oportunidade", eligibility_status="validada")
    p.activation_evidence = None
    db.commit()

    client.put(f"{URL}/{op.id}/mover", json={"stage": "proposta"}, headers=_login_parceiro(db, p))

    db.refresh(p)
    assert p.activation_evidence == "proposta_enviada"
    assert p.stage == "ativado"
