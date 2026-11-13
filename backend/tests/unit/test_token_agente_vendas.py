"""Token de agente do HS.OS em Vendas (T2): o Guardi só escreve no que é do dono.

- card: só do dono (vendedor ou SDR), também para admin via agente;
- PUT /cards: nunca responsável, SDR, ganho ou perda;
- campo personalizado só por definição existente;
- POST /cards: responsável só o próprio, sem SDR;
- cliente/contato: só ligado a card aberto do dono;
- usuário humano não é afetado;
- 4a (todos): /clients?search= acha documento com máscara pelos dígitos.
"""
import pytest

from app.api.deps import MSG_AGENTE_403, MSG_AGENTE_CADASTRO_SEM_CARD, MSG_AGENTE_CARD_DE_OUTRO
from app.core.security import hash_password
from app.models.card import Card
from app.models.card_task import CardTask, TaskType
from app.models.client import Client
from app.models.person import Person
from app.models.user import User

EMAIL = "sales@test.com"


def _h(tok):
    return {"Authorization": f"Bearer {tok}"}


def _detalhe(resp):
    try:
        return resp.json().get("detail")
    except Exception:
        return None


def _recusa_de_dono(resp) -> bool:
    return resp.status_code == 403 and _detalhe(resp) == MSG_AGENTE_CARD_DE_OUTRO


@pytest.fixture
def outro_vendedor(db, test_roles):
    user = User(
        name="Outro Vendedor", email="outro@test.com", password_hash=hash_password("x123456"),
        role_id=test_roles["salesperson"].id, is_active=True, is_deleted=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def card_de_outro(db, test_lists, outro_vendedor):
    card = Card(title="Card do outro", list_id=test_lists[0].id, assigned_to_id=outro_vendedor.id, position=1)
    db.add(card)
    db.commit()
    db.refresh(card)
    return card


def _tarefa(db, card, tipo=TaskType.MEETING):
    t = CardTask(card_id=card.id, title="Reunião", task_type=tipo, assigned_to_id=card.assigned_to_id)
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


def _rotas(card_id, task_id, lista_id):
    return [
        ("PUT", f"/cards/{card_id}", {"title": "Novo título"}),
        ("PUT", f"/cards/{card_id}/move", {"target_list_id": lista_id}),
        ("POST", f"/cards/{card_id}/win", None),
        ("POST", f"/cards/{card_id}/lose", {"loss_reason": "Preço"}),
        ("POST", f"/cards/{card_id}/fields", {"field_definition_id": 999999, "value": "x"}),
        ("POST", f"/cards/{card_id}/person?person_id=999999", None),
        ("POST", "/card-notes", {"card_id": card_id, "content": "Ligou"}),
        ("POST", "/card-tasks", {"card_id": card_id, "title": "Retorno", "task_type": "call"}),
        ("PUT", f"/card-tasks/{task_id}", {"title": "Outro título"}),
        ("PATCH", f"/card-tasks/{task_id}/complete", {"is_completed": True}),
        ("PATCH", f"/card-tasks/{task_id}/noshow", None),
    ]


def _chamar(client, db, metodo, caminho, corpo, headers):
    try:
        return client.request(metodo, "/api/v1" + caminho, json=corpo, headers=headers)
    except Exception:
        # Exceção dentro do endpoint: passou das travas de dono.
        db.rollback()
        return None


# --- card do dono ---------------------------------------------------------------

def test_rotas_de_card_de_outro_vendedor_403(client, db, test_salesperson_user, test_lists, card_de_outro, agente):
    tarefa = _tarefa(db, card_de_outro)
    h = _h(agente(EMAIL))
    for metodo, caminho, corpo in _rotas(card_de_outro.id, tarefa.id, test_lists[1].id):
        resp = _chamar(client, db, metodo, caminho, corpo, h)
        assert resp is not None and _recusa_de_dono(resp), f"{metodo} {caminho}: {resp and resp.status_code} {resp and resp.text[:150]}"
    db.refresh(card_de_outro)
    assert card_de_outro.title == "Card do outro" and card_de_outro.is_won == 0


def test_rotas_de_card_proprio_nao_dao_403_de_dono(client, db, test_salesperson_user, test_lists, test_card, agente):
    h = _h(agente(EMAIL))
    for metodo, caminho, corpo in _rotas(test_card.id, _tarefa(db, test_card).id, test_lists[1].id):
        # Depois do /win o /lose dá 422 (card já ganho): regra de negócio, não a trava.
        resp = _chamar(client, db, metodo, caminho, corpo, h)
        if resp is not None:
            assert not _recusa_de_dono(resp), f"{metodo} {caminho}: {resp.text[:150]}"
            assert _detalhe(resp) != MSG_AGENTE_403, f"{metodo} {caminho} fora da allowlist"


def test_card_do_qual_e_sdr_passa(client, db, test_salesperson_user, card_de_outro, agente):
    card_de_outro.sdr_id = test_salesperson_user.id
    db.commit()
    resp = client.put(f"/api/v1/cards/{card_de_outro.id}", json={"title": "Pelo SDR"}, headers=_h(agente(EMAIL)))
    assert not _recusa_de_dono(resp), resp.text


def test_admin_via_agente_tambem_so_no_card_dele(client, test_admin_user, test_card, agente):
    resp = client.put(f"/api/v1/cards/{test_card.id}", json={"title": "x"}, headers=_h(agente("admin@test.com")))
    assert _recusa_de_dono(resp), resp.text


def test_card_ou_tarefa_inexistente_segue_o_fluxo_normal(client, test_salesperson_user, agente):
    h = _h(agente(EMAIL))
    assert client.put("/api/v1/cards/999999", json={"title": "x"}, headers=h).status_code == 404
    assert client.patch("/api/v1/card-tasks/999999/noshow", headers=h).status_code == 404


# --- PUT /cards: campos proibidos ----------------------------------------------

@pytest.mark.parametrize("corpo", [
    {"assigned_to_id": 1},
    {"assigned_to_id": None},
    {"sdr_id": 1},
    {"is_won": True},
    {"is_lost": False},
    {"loss_reason": "Preço"},
])
def test_put_card_proprio_com_campo_proibido_403(client, db, test_salesperson_user, test_card, agente, corpo):
    resp = client.put(f"/api/v1/cards/{test_card.id}", json={"title": "x", **corpo}, headers=_h(agente(EMAIL)))
    assert resp.status_code == 403, resp.text
    assert "O agente não altera" in _detalhe(resp)
    db.refresh(test_card)
    assert test_card.title == "Test Card"


def test_humano_no_put_card_continua_como_antes(client, db, test_salesperson_user, test_card, salesperson_headers):
    corpo = {"title": "Pela tela", "assigned_to_id": test_salesperson_user.id}
    resp = client.put(f"/api/v1/cards/{test_card.id}", json=corpo, headers=salesperson_headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["title"] == "Pela tela"


def test_humano_nao_sofre_trava_de_dono(client, db, test_salesperson_user, card_de_outro, salesperson_headers):
    resp = client.post("/api/v1/card-notes", json={"card_id": card_de_outro.id, "content": "Nota"},
                       headers=salesperson_headers)
    assert not _recusa_de_dono(resp), resp.text


# --- campo personalizado --------------------------------------------------------

@pytest.mark.parametrize("corpo", [
    {"field_name": "Origem", "field_value": "Indicação", "field_type": "text"},
    {"field_definition_id": 1, "field_name": "Origem", "value": "x"},
    {"value": "x"},
])
def test_campo_por_nome_ou_sem_definicao_403(client, db, test_salesperson_user, test_card, agente, corpo):
    from app.models.field_definition import FieldDefinition
    antes = db.query(FieldDefinition).count()
    resp = client.post(f"/api/v1/cards/{test_card.id}/fields", json=corpo, headers=_h(agente(EMAIL)))
    assert resp.status_code == 403, resp.text
    assert "field_definition_id" in _detalhe(resp)
    assert db.query(FieldDefinition).count() == antes


# --- POST /cards ------------------------------------------------------------------

def test_criar_card_com_outro_responsavel_403(client, test_salesperson_user, outro_vendedor, test_lists, agente):
    corpo = {"title": "Lead", "list_id": test_lists[0].id, "assigned_to_id": outro_vendedor.id}
    resp = client.post("/api/v1/cards", json=corpo, headers=_h(agente(EMAIL)))
    assert resp.status_code == 403, resp.text
    assert "responsável" in _detalhe(resp)


def test_criar_card_com_sdr_403(client, test_salesperson_user, test_sdr_user, test_lists, agente):
    corpo = {"title": "Lead", "list_id": test_lists[0].id, "assigned_to_id": test_salesperson_user.id,
             "sdr_id": test_sdr_user.id}
    resp = client.post("/api/v1/cards", json=corpo, headers=_h(agente(EMAIL)))
    assert resp.status_code == 403, resp.text
    assert "SDR" in _detalhe(resp)


@pytest.fixture
def lead_novo(db):
    """Lista onde vendedor pode criar card: 'Lead Novo' do quadro de Prospecção (id 6)."""
    from app.models.board import Board
    from app.models.list import List
    board = Board(id=6, name="Prospecção")
    db.add(board)
    db.commit()
    lista = List(name="Lead Novo", position=0, board_id=6, is_done_stage=False, is_lost_stage=False)
    db.add(lista)
    db.commit()
    db.refresh(lista)
    return lista


def test_criar_card_do_proprio_dono_passa(client, db, test_salesperson_user, lead_novo, agente):
    corpo = {"title": "Lead do Guardi", "list_id": lead_novo.id, "assigned_to_id": test_salesperson_user.id}
    resp = client.post("/api/v1/cards", json=corpo, headers=_h(agente(EMAIL)))
    assert resp.status_code == 201, resp.text
    assert resp.json()["assigned_to_id"] == test_salesperson_user.id


def test_admin_via_agente_cria_lead_com_ele_de_responsavel(client, test_admin_user, lead_novo, agente):
    corpo = {"title": "Lead do admin", "list_id": lead_novo.id}
    resp = client.post("/api/v1/cards", json=corpo, headers=_h(agente(test_admin_user.email)))
    assert resp.status_code == 201, resp.text
    assert resp.json()["assigned_to_id"] == test_admin_user.id


# --- cliente e contato ------------------------------------------------------------

@pytest.fixture
def cliente_e_contato(db):
    cli = Client(name="Empresa X", document="12.345.678/0001-90")
    db.add(cli)
    db.commit()
    pes = Person(name="Fulano", organization_id=cli.id)
    db.add(pes)
    db.commit()
    db.refresh(cli)
    db.refresh(pes)
    return cli, pes


def _put_cadastros(client, cli, pes, h):
    return (
        client.put(f"/api/v1/clients/{cli.id}", json={"city": "Recife"}, headers=h),
        client.put(f"/api/v1/persons/{pes.id}", json={"position": "Gerente"}, headers=h),
    )


def test_cliente_e_contato_sem_card_403(client, test_salesperson_user, cliente_e_contato, agente):
    cli, pes = cliente_e_contato
    for resp in _put_cadastros(client, cli, pes, _h(agente(EMAIL))):
        assert resp.status_code == 403 and _detalhe(resp) == MSG_AGENTE_CADASTRO_SEM_CARD, resp.text


@pytest.mark.parametrize("situacao", ["de_outro", "ganho", "perdido", "apagado"])
def test_cliente_e_contato_com_card_que_nao_vale_403(
    client, db, test_salesperson_user, outro_vendedor, test_card, cliente_e_contato, agente, situacao,
):
    cli, pes = cliente_e_contato
    test_card.client_id, test_card.person_id = cli.id, pes.id
    if situacao == "de_outro":
        test_card.assigned_to_id = outro_vendedor.id
    elif situacao == "ganho":
        test_card.is_won = 1
    elif situacao == "perdido":
        test_card.is_won = -1
    else:
        test_card.is_deleted = True
    db.commit()
    for resp in _put_cadastros(client, cli, pes, _h(agente(EMAIL))):
        assert resp.status_code == 403 and _detalhe(resp) == MSG_AGENTE_CADASTRO_SEM_CARD, resp.text


@pytest.mark.parametrize("papel", ["vendedor", "sdr"])
def test_cliente_e_contato_de_card_aberto_do_dono_passa(
    client, db, test_salesperson_user, outro_vendedor, test_card, cliente_e_contato, agente, papel,
):
    cli, pes = cliente_e_contato
    test_card.client_id, test_card.person_id = cli.id, pes.id
    if papel == "sdr":
        test_card.assigned_to_id, test_card.sdr_id = outro_vendedor.id, test_salesperson_user.id
    db.commit()
    r_cli, r_pes = _put_cadastros(client, cli, pes, _h(agente(EMAIL)))
    assert r_cli.status_code == 200, r_cli.text
    assert r_cli.json()["city"] == "Recife"
    assert r_pes.status_code == 200, r_pes.text
    assert r_pes.json()["position"] == "Gerente"


def test_humano_edita_cliente_sem_card(client, test_salesperson_user, cliente_e_contato, salesperson_headers):
    cli, pes = cliente_e_contato
    for resp in _put_cadastros(client, cli, pes, salesperson_headers):
        assert resp.status_code == 200, resp.text


# --- 4a: busca de cliente pelo documento sem máscara --------------------------------

@pytest.mark.parametrize("termo", ["12345678000190", "12.345.678/0001-90", "345678"])
def test_busca_cliente_por_documento_sem_mascara(client, test_salesperson_user, cliente_e_contato,
                                                  salesperson_headers, termo):
    resp = client.get(f"/api/v1/clients?search={termo}", headers=salesperson_headers)
    assert resp.status_code == 200, resp.text
    corpo = resp.json()
    nomes = [c["name"] for c in corpo.get("clients", corpo.get("items", []))]
    assert "Empresa X" in nomes, corpo
    assert corpo.get("total", 1) >= 1
