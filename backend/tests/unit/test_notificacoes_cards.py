"""Os três lugares que atribuem card de Vendas: criação, edição e /assign."""
from app.models.card import Card
from tests.unit.apoio_notificacoes import avisos, cabecalho, usuario


def test_card_guarda_quem_criou(client, db, admin_headers, test_lists, test_admin_user):
    r = client.post("/api/v1/cards", headers=admin_headers,
                    json={"title": "Novo", "list_id": test_lists[0].id})

    assert r.status_code == 201
    assert db.query(Card).filter(Card.id == r.json()["id"]).one().created_by_id == test_admin_user.id


def test_vendedor_criando_o_proprio_card_nao_e_avisado(client, db, salesperson_headers, test_lists, test_salesperson_user):
    client.post("/api/v1/cards", headers=salesperson_headers,
                json={"title": "Meu card", "list_id": test_lists[0].id})

    assert avisos(db, test_salesperson_user.id) == []


def test_admin_criando_para_o_vendedor_avisa(client, db, admin_headers, test_lists, test_salesperson_user):
    client.post("/api/v1/cards", headers=admin_headers,
                json={"title": "Para a Sandra", "list_id": test_lists[0].id,
                      "assigned_to_id": test_salesperson_user.id})

    [aviso] = avisos(db, test_salesperson_user.id)
    assert aviso.notification_type == "card_atribuido"


def test_integracao_criando_lead_avisa_como_lead(client, db, test_lists, test_salesperson_user):
    integ = usuario(db, "integracao", "manager", is_integracao=True)

    r = client.post("/api/v1/cards", headers=cabecalho(integ),
                    json={"title": "Lead do site", "list_id": test_lists[0].id,
                          "assigned_to_id": test_salesperson_user.id,
                          "origin": "Contato pelo Site"})

    assert db.query(Card).filter(Card.id == r.json()["id"]).one().created_by_id == integ.id
    [aviso] = avisos(db, test_salesperson_user.id)
    assert aviso.notification_type == "lead_site"


def test_assign_por_outra_pessoa_avisa(client, db, manager_headers, test_card, test_sdr_user, test_salesperson_user):
    client.put(f"/api/v1/cards/{test_card.id}/assign", headers=manager_headers,
               json={"assigned_to_id": test_sdr_user.id})

    [aviso] = avisos(db, test_sdr_user.id)
    assert aviso.notification_type == "card_atribuido"


def test_assign_para_si_mesmo_nao_avisa(client, db, manager_headers, test_card, test_manager_user):
    client.put(f"/api/v1/cards/{test_card.id}/assign", headers=manager_headers,
               json={"assigned_to_id": test_manager_user.id})

    assert avisos(db, test_manager_user.id) == []
