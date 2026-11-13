"""Token de agente do HS.OS no kanban de Serviços (T3 do plano
docs/superpowers/plans/2026-11-13-token-agente-hsos.md): card conferido no quadro,
item conferido no card, PUT do card sem campos de movimento para o agente,
external_source/external_id no GET e "via <bot>" no histórico."""
import pytest
from sqlalchemy.orm import joinedload

from app.core.security import create_access_token, hash_password
from app.models.role import Role
from app.models.service import Service
from app.models.service_board import ServiceBoard
from app.models.service_card import ServiceCard
from app.models.service_card_activity import ServiceCardActivity
from app.models.service_card_product import ServiceCardProduct
from app.models.service_card_service import ServiceCardService
from app.models.service_list import ServiceList
from app.models.service_product import ServiceProduct
from app.models.user import User

MSG_403 = "Ação não permitida para o agente"
EMAIL_SERVICO = "servico@test.com"


def _h(tok):
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture
def usuario_servico(db, test_roles):
    role = Role(name="service", display_name="Serviço", description="Serviços",
                permissions=[], is_system_role=True)
    db.add(role)
    db.commit()
    u = User(name="Servico User", email=EMAIL_SERVICO, password_hash=hash_password("x12345678"),
             role_id=role.id, is_active=True, is_deleted=False)
    db.add(u)
    db.commit()
    return db.query(User).options(joinedload(User.role)).filter(User.id == u.id).first()


@pytest.fixture
def humano(usuario_servico):
    return _h(create_access_token(data={"sub": str(usuario_servico.id)}))


@pytest.fixture
def cenario(db, usuario_servico):
    # O primeiro quadro do banco em memória é o id 1: board com regra de etapa.
    b = ServiceBoard(name="Serviços")
    outro = ServiceBoard(name="Cobrança")
    db.add_all([b, outro])
    db.commit()
    assert b.id == 1
    e1 = ServiceList(board_id=b.id, name="Entrada", position=0)
    e2 = ServiceList(board_id=b.id, name="Triagem", position=1)
    e3 = ServiceList(board_id=b.id, name="Execução", position=2)
    lista_outro = ServiceList(board_id=outro.id, name="Entrada", position=0)
    prod = ServiceProduct(name="IBlow 10")
    serv = Service(name="Calibração", unit_price=100)
    db.add_all([e1, e2, e3, lista_outro, prod, serv])
    db.commit()
    card = ServiceCard(list_id=e1.id, title="Card", external_source="gestorhs.os", external_id="123")
    outro_card = ServiceCard(list_id=e1.id, title="Outro card")
    card_outro_quadro = ServiceCard(list_id=lista_outro.id, title="De outro quadro")
    db.add_all([card, outro_card, card_outro_quadro])
    db.commit()
    item_prod_outro = ServiceCardProduct(service_card_id=outro_card.id, product_id=prod.id,
                                         quantity=1, unit_price=0, discount=0)
    item_serv_outro = ServiceCardService(service_card_id=outro_card.id, service_id=serv.id,
                                         quantity=1, unit_price=100, discount=0)
    item_prod = ServiceCardProduct(service_card_id=card.id, product_id=prod.id,
                                   quantity=1, unit_price=0, discount=0)
    db.add_all([item_prod_outro, item_serv_outro, item_prod])
    db.commit()
    return {"b": b, "e1": e1, "e2": e2, "e3": e3, "card": card, "outro_card": outro_card,
            "card_outro_quadro": card_outro_quadro, "item_prod_outro": item_prod_outro,
            "item_serv_outro": item_serv_outro, "item_prod": item_prod, "lista_outro": lista_outro}


def _url(c, card=None, board=None):
    return f"/api/v1/service-boards/{board or c['b'].id}/cards/{(card or c['card']).id}"


# --- mover: pelo /move, com a regra de etapa ----------------------------------

def test_agente_service_move_com_regra(client, cenario, agente):
    c = cenario
    tok = _h(agente(EMAIL_SERVICO))
    # Pular etapa: a regra do board 1 recusa (400), não o 403 do agente.
    resp = client.put(_url(c) + "/move", json={"list_id": c["e3"].id}, headers=tok)
    assert resp.status_code == 400, resp.text
    assert "pular etapas" in resp.json()["detail"]
    resp = client.put(_url(c) + "/move", json={"list_id": c["e2"].id}, headers=tok)
    assert resp.status_code == 200, resp.text
    assert resp.json()["list_id"] == c["e2"].id


def test_agente_nao_move_para_lista_de_outro_quadro(client, db, cenario, agente):
    c = cenario
    resp = client.put(_url(c) + "/move", json={"list_id": c["lista_outro"].id},
                      headers=_h(agente(EMAIL_SERVICO)))
    assert resp.status_code == 403, resp.text
    db.expire_all()
    assert db.get(ServiceCard, c["card"].id).list_id == c["e1"].id


@pytest.mark.parametrize("campo,valor", [
    ("list_id", None), ("position", 5.0), ("is_deleted", True), ("assigned_to_id", 1),
])
def test_agente_put_com_campo_de_movimento_403(client, db, cenario, agente, campo, valor):
    c = cenario
    corpo = {"title": "Novo", campo: c["e3"].id if campo == "list_id" else valor}
    resp = client.put(_url(c), json=corpo, headers=_h(agente(EMAIL_SERVICO)))
    assert resp.status_code == 403, resp.text
    assert resp.json()["detail"] == MSG_403
    db.refresh(c["card"])
    assert c["card"].title == "Card" and c["card"].list_id == c["e1"].id


def test_agente_put_campos_permitidos_200(client, db, cenario, agente):
    c = cenario
    corpo = {"title": "Pelo Guardi", "business_info": {"service_type": "Calibração"}}
    resp = client.put(_url(c), json=corpo, headers=_h(agente(EMAIL_SERVICO)))
    assert resp.status_code == 200, resp.text
    assert resp.json()["title"] == "Pelo Guardi"
    assert resp.json()["external_source"] == "gestorhs.os"


def test_humano_put_com_list_id_continua_passando(client, cenario, humano):
    # A trava de campos é só do agente (comportamento da tela não muda).
    c = cenario
    resp = client.put(_url(c), json={"position": 3.0}, headers=humano)
    assert resp.status_code == 200, resp.text


@pytest.mark.parametrize("metodo,sufixo", [("DELETE", ""), ("POST", "/clone")])
def test_agente_delete_e_clone_403(client, cenario, agente, metodo, sufixo):
    c = cenario
    resp = client.request(metodo, _url(c) + sufixo, headers=_h(agente(EMAIL_SERVICO)))
    assert resp.status_code == 403, resp.text
    assert resp.json()["detail"] == MSG_403


# --- item de outro card -> 404 (todos) ------------------------------------------

@pytest.mark.parametrize("quem", ["agente", "humano"])
@pytest.mark.parametrize("metodo,tipo", [
    ("PUT", "products"), ("DELETE", "products"), ("PUT", "services"), ("DELETE", "services"),
])
def test_item_de_outro_card_404(client, db, cenario, agente, humano, quem, metodo, tipo):
    c = cenario
    headers = _h(agente(EMAIL_SERVICO)) if quem == "agente" else humano
    item = c["item_prod_outro"] if tipo == "products" else c["item_serv_outro"]
    resp = client.request(metodo, f"{_url(c)}/{tipo}/{item.id}", headers=headers,
                          json={"quantity": 9} if metodo == "PUT" else None)
    assert resp.status_code == 404, resp.text
    assert resp.json()["detail"] == "Item não encontrado neste card"
    db.expire_all()
    modelo = ServiceCardProduct if tipo == "products" else ServiceCardService
    ainda = db.get(modelo, item.id)
    assert ainda is not None and ainda.quantity == 1


def test_item_do_proprio_card_continua_funcionando(client, db, cenario, humano):
    c = cenario
    resp = client.put(f"{_url(c)}/products/{c['item_prod'].id}", json={"quantity": 2}, headers=humano)
    assert resp.status_code == 200, resp.text
    assert resp.json()["quantity"] == 2


# --- card de outro quadro -> 404 (todos) ----------------------------------------

@pytest.mark.parametrize("metodo,sufixo,corpo", [
    ("GET", "", None),
    ("PUT", "", {"title": "X"}),
    ("DELETE", "", None),
    ("PUT", "/move", {"list_id": 1}),
    ("POST", "/clone", None),
    ("GET", "/products", None),
    ("POST", "/products", {"product_id": 1, "quantity": 1, "unit_price": 0}),
    ("GET", "/services", None),
    ("POST", "/services", {"service_id": 1, "quantity": 1, "unit_price": 0}),
])
def test_card_de_outro_quadro_404(client, db, cenario, humano, metodo, sufixo, corpo):
    c = cenario
    url = _url(c, card=c["card_outro_quadro"]) + sufixo
    resp = client.request(metodo, url, headers=humano, json=corpo)
    assert resp.status_code == 404, f"{metodo} {sufixo}: {resp.status_code} {resp.text[:200]}"
    db.expire_all()
    assert db.get(ServiceCard, c["card_outro_quadro"].id).is_deleted is False
    assert db.query(ServiceCard).count() == 3


@pytest.mark.parametrize("metodo,tipo", [("PUT", "products"), ("DELETE", "services")])
def test_item_pela_url_de_outro_quadro_404(client, cenario, humano, metodo, tipo):
    # Item do próprio card, mas a URL diz outro quadro.
    c = cenario
    item = c["item_prod"] if tipo == "products" else c["item_serv_outro"]
    card = c["card"] if tipo == "products" else c["outro_card"]
    url = f"/api/v1/service-boards/{c['b'].id + 1}/cards/{card.id}/{tipo}/{item.id}"
    resp = client.request(metodo, url, headers=humano, json={"quantity": 2} if metodo == "PUT" else None)
    assert resp.status_code == 404, resp.text


# --- external_source / external_id ------------------------------------------------

def test_get_do_card_traz_external(client, cenario, agente):
    c = cenario
    resp = client.get(_url(c), headers=_h(agente(EMAIL_SERVICO)))
    assert resp.status_code == 200, resp.text
    assert resp.json()["external_source"] == "gestorhs.os"
    assert resp.json()["external_id"] == "123"
    resp = client.get(_url(c, card=c["outro_card"]), headers=_h(agente(EMAIL_SERVICO)))
    assert resp.json()["external_source"] is None and resp.json()["external_id"] is None


# --- "via <bot>" ------------------------------------------------------------------

def test_atividade_do_agente_traz_via(client, db, cenario, agente, humano):
    c = cenario
    corpo = {"category": "anotacao", "description": "Cliente pediu retorno"}
    resp = client.post(_url(c) + "/activities", json=corpo, headers=_h(agente(EMAIL_SERVICO)))
    assert resp.status_code == 200, resp.text
    db.expire_all()
    a = db.get(ServiceCardActivity, resp.json()["id"])
    assert a.description == "Cliente pediu retorno (via erick-bot)"

    resp = client.post(_url(c) + "/activities", json=corpo, headers=humano)
    assert resp.status_code == 200, resp.text
    db.expire_all()
    assert db.get(ServiceCardActivity, resp.json()["id"]).description == "Cliente pediu retorno"


def test_motivo_da_perda_do_agente_fica_limpo(client, db, cenario, agente):
    # O texto alimenta o filtro "Motivo de perda" e o dashboard: a marca vai pro metadata.
    c = cenario
    corpo = {"category": "anotacao", "description": "Motivo da perda: Preço"}
    resp = client.post(_url(c) + "/activities", json=corpo, headers=_h(agente(EMAIL_SERVICO)))
    assert resp.status_code == 200, resp.text
    db.expire_all()
    a = db.get(ServiceCardActivity, resp.json()["id"])
    assert a.description == "Motivo da perda: Preço"
    assert (a.activity_metadata or {}).get("via_agente") == "erick-bot"


# --- vendedor não entra em Serviços nem por agente -----------------------------------

@pytest.mark.parametrize("metodo,sufixo,corpo", [
    ("GET", "", None),
    ("PUT", "", {"title": "X"}),
    ("PUT", "/move", {"list_id": 2}),
])
def test_vendedor_via_agente_403_em_servicos(client, cenario, test_salesperson_user, agente,
                                             metodo, sufixo, corpo):
    c = cenario
    resp = client.request(metodo, _url(c) + sufixo, json=corpo,
                          headers=_h(agente(test_salesperson_user.email)))
    assert resp.status_code == 403, resp.text
    # A tabela de papéis do agente (PAPEIS_AGENTE) recusa antes do require_service_access.
    from app.api.deps import MSG_AGENTE_PAPEL_403
    assert resp.json()["detail"] == MSG_AGENTE_PAPEL_403
