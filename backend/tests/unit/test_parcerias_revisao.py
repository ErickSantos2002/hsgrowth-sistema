"""Correções da revisão de 04/11/2026 (v1.11.10)."""
from datetime import datetime, timedelta

from app.models.partner_activity import PartnerActivity
from app.models.product import Product
from app.schemas.product import ProductUpdate
from app.services.parcerias.cnpj import cnpj_valido, normalizar_cnpj
from app.services.product_service import ProductService

from tests.unit.apoio_parcerias import (
    card_de_vendas, cliente, headers, oportunidade, parceiro, parceiro_pronto, usuario, vendas,
)

URL = "/api/v1/parcerias"
NOVA = {
    "title": "Etilômetros Empresa A", "deal_type": "Nova Venda",
    "sector": "Indústrias de Transformação", "relationship_type": "Prospect",
    "context": "Frota de 40 caminhões", "cnpj": "11.222.333/0001-81", "company_name": "Empresa A",
}
# Exemplo da Receita Federal para o CNPJ com letras (vale desde jul/2026).
CNPJ_LETRAS = "12ABC34501DE35"


def _login_parceiro(db, p, email="a@dmap.com"):
    return headers(usuario(db, "partner", email, p))


# ─── Notificações ────────────────────────────────────────────────────────────

def test_so_admin_cria_notificacao_na_mao(client, db, admin_headers):
    alvo = usuario(db, "salesperson", "vend@hs.com")
    corpo = {"user_id": alvo.id, "notification_type": "card_assigned", "title": "Aviso", "message": "Clique aqui"}
    lote = {"user_ids": [alvo.id], "notification_type": "card_assigned", "title": "Aviso", "message": "Clique"}
    parceiro_h = _login_parceiro(db, parceiro(db))
    vendedor_h = headers(usuario(db, "salesperson", "outro@hs.com"))

    for h in (parceiro_h, vendedor_h):
        assert client.post("/api/v1/notifications", json=corpo, headers=h).status_code == 403
        assert client.post("/api/v1/notifications/bulk", json=lote, headers=h).status_code == 403
        assert client.post("/api/v1/notifications/helpers/badge-earned", headers=h,
                           params={"user_id": alvo.id, "badge_id": 1, "badge_name": "X"}).status_code == 403
    assert client.post("/api/v1/notifications", json=corpo, headers=admin_headers).status_code == 200


# ─── Histórico ───────────────────────────────────────────────────────────────

def test_parceiro_nao_le_a_justificativa_no_historico(client, db, admin_headers):
    v = vendas(db)
    card_de_vendas(db, v.lead_novo)
    p = parceiro(db)
    op_id = client.post(f"{URL}/oportunidades", headers=admin_headers,
                        json={**NOVA, "partner_id": p.id, "cnpj_justificativa": "Card do Miguel parado"}).json()["id"]

    def textos(h):
        return " ".join(a["description"] or "" for a in
                        client.get(f"{URL}/oportunidades/{op_id}/atividades", headers=h).json())

    assert "Card do Miguel parado" in textos(admin_headers)
    do_parceiro = textos(_login_parceiro(db, p))
    assert "Cadastro liberado pela gestão" in do_parceiro
    assert "Card do Miguel parado" not in do_parceiro


# ─── Mover ───────────────────────────────────────────────────────────────────

def test_gestao_volta_ativado_para_ativacao(client, db, admin_headers):
    p = parceiro_pronto(db, stage="ativado")
    p.activation_evidence = "primeira_venda"
    db.commit()

    r = client.put(f"{URL}/parceiros/{p.id}/mover", json={"stage": "ativacao"}, headers=admin_headers)

    assert r.status_code == 200 and r.json()["stage"] == "ativacao"


def test_mover_perdido_para_perdido_mantem_o_motivo(client, db, admin_headers):
    p = parceiro(db, stage="perdido", loss_reason="Sem interesse", lost_at=datetime.utcnow())
    op = oportunidade(db, p, stage="perdido", loss_reason="Preço", lost_at=datetime.utcnow())

    client.put(f"{URL}/parceiros/{p.id}/mover", json={"stage": "perdido", "position": 2}, headers=admin_headers)
    client.put(f"{URL}/oportunidades/{op.id}/mover", json={"stage": "perdido", "position": 2}, headers=admin_headers)

    db.refresh(p)
    db.refresh(op)
    assert (p.loss_reason, op.loss_reason) == ("Sem interesse", "Preço")


# ─── Valores ─────────────────────────────────────────────────────────────────

def test_valor_gigante_da_422(client, db):
    p = parceiro(db)
    op = oportunidade(db, p)
    h = _login_parceiro(db, p)
    produto = Product(name="Phoebus", unit_price=1000, partner_enabled=True)
    db.add(produto)
    db.commit()

    assert client.put(f"{URL}/oportunidades/{op.id}", json={"shipping": 1e11}, headers=h).status_code == 422
    assert client.post(f"{URL}/oportunidades/{op.id}/produtos", headers=h,
                       json={"product_id": produto.id, "unit_price": 1e11}).status_code == 422
    assert client.post(f"{URL}/oportunidades/{op.id}/produtos", headers=h,
                       json={"product_id": produto.id, "quantity": 10_000_000}).status_code == 422


def test_produto_com_liberado_nulo_nao_quebra(db):
    admin = usuario(db, "admin", "adm@hs.com")
    produto = Product(name="Phoebus", unit_price=1000, partner_enabled=True)
    db.add(produto)
    db.commit()

    editado = ProductService(db).update_product(produto.id, ProductUpdate(partner_enabled=None, is_active=None), admin)

    assert editado.partner_enabled is True and editado.is_active is True


def test_ganho_trava_valores_para_quem_nao_e_gestao(client, db, admin_headers):
    p = parceiro(db)
    op = oportunidade(db, p, stage="ganho", won_at=datetime.utcnow())
    produto = Product(name="Phoebus", unit_price=1000, partner_enabled=True)
    db.add(produto)
    db.commit()
    h = _login_parceiro(db, p)

    assert client.put(f"{URL}/oportunidades/{op.id}", json={"shipping": 50}, headers=h).status_code == 422
    assert client.post(f"{URL}/oportunidades/{op.id}/produtos", json={"product_id": produto.id},
                       headers=h).status_code == 422
    # Outros campos seguem livres, e a gestão corrige o valor.
    assert client.put(f"{URL}/oportunidades/{op.id}", json={"contact_name": "Ana"}, headers=h).status_code == 200
    assert client.put(f"{URL}/oportunidades/{op.id}", json={"shipping": 50}, headers=admin_headers).status_code == 200


# ─── Atividades da H&S ───────────────────────────────────────────────────────

def test_parceiro_nao_mexe_na_atividade_da_hs(client, db):
    p = parceiro(db)
    gerente = usuario(db, "manager", "ger@hs.com")
    h = _login_parceiro(db, p)
    da_hs = PartnerActivity(partner_id=p.id, user_id=gerente.id, category="atividade", title="Treinamento")
    db.add(da_hs)
    db.commit()
    propria = client.post(f"{URL}/parceiros/{p.id}/atividades", headers=h,
                          json={"category": "atividade", "title": "Ligar"}).json()

    assert client.put(f"{URL}/atividades/{da_hs.id}", json={"title": "Outro"}, headers=h).status_code == 403
    assert client.patch(f"{URL}/atividades/{da_hs.id}/concluir", json={"is_completed": True},
                        headers=h).status_code == 403
    assert client.patch(f"{URL}/atividades/{propria['id']}/concluir", json={"is_completed": True},
                        headers=h).status_code == 200
    assert client.patch(f"{URL}/atividades/{da_hs.id}/concluir", json={"is_completed": True},
                        headers=headers(gerente)).status_code == 200


# ─── Parceiro perdido ────────────────────────────────────────────────────────

def test_parceiro_perdido_nao_cria_oportunidade(client, db, admin_headers):
    p = parceiro(db, stage="perdido", loss_reason="Sem interesse")

    assert client.post(f"{URL}/oportunidades", json=NOVA, headers=_login_parceiro(db, p)).status_code == 422
    assert client.post(f"{URL}/oportunidades", json={**NOVA, "partner_id": p.id},
                       headers=admin_headers).status_code == 422


# ─── Vendas ──────────────────────────────────────────────────────────────────

def test_oportunidade_encerrada_do_parceiro_nao_bloqueia_vendas(client, db):
    v = vendas(db)
    p = parceiro(db)
    oportunidade(db, p, stage="ganho", won_at=datetime.utcnow() - timedelta(days=5))
    vendedor = usuario(db, "salesperson", "v@hs.com")

    r = client.post("/api/v1/cards", headers=headers(vendedor),
                    json={"title": "Empresa A", "list_id": v.lead_novo.id, "client_id": cliente(db).id})

    assert r.status_code == 201


# ─── CNPJ com letras ─────────────────────────────────────────────────────────

def test_cnpj_com_letras():
    assert normalizar_cnpj("12.abc.345/01de-35") == CNPJ_LETRAS
    assert cnpj_valido("12.ABC.345/01DE-35")
    assert not cnpj_valido("12.ABC.345/01DE-36")
    assert cnpj_valido("11.222.333/0001-81")
    assert not cnpj_valido("12ABC34501DEAB")  # verificadores são sempre números


def test_oportunidade_com_cnpj_de_letras(client, db):
    h = _login_parceiro(db, parceiro(db))

    r = client.post(f"{URL}/oportunidades", json={**NOVA, "cnpj": "12.ABC.345/01DE-35"}, headers=h)

    assert r.status_code == 201 and r.json()["cnpj"] == CNPJ_LETRAS
