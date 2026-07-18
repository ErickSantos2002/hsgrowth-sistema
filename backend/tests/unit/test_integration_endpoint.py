"""Testes ponta a ponta do endpoint de integração."""
import pytest

from app.core.security import generate_api_key, hash_api_key, hash_password
from app.models.integration_client import IntegrationClient
from app.models.role import Role
from app.models.service_board import ServiceBoard
from app.models.service_list import ServiceList
from app.models.user import User

URL = "/api/v1/integration/service-cards"


@pytest.fixture
def chave(db):
    role = Role(name="service", display_name="Serviço", permissions=[])
    db.add(role)
    db.commit()
    user = User(
        role_id=role.id, email="gestorhs@integracao.local", name="GestorHS (Integração)",
        password_hash=hash_password("x"), is_active=True,
    )
    db.add(user)
    db.commit()

    k = generate_api_key()
    db.add(IntegrationClient(
        name="GestorHS", client_id="hsg_gestorhs", client_secret_hash="x",
        api_key_hash=hash_api_key(k), scopes=["service_cards:create"],
        impersonate_user_id=user.id, is_active=True,
    ))
    db.commit()
    return k


@pytest.fixture
def board(db):
    b = ServiceBoard(name="Serviços")
    db.add(b)
    db.commit()
    db.add(ServiceList(
        board_id=b.id, name="Dados Preenchidos", position=0, is_entry_stage=True
    ))
    db.commit()
    db.refresh(b)
    return b


def corpo(board_id, **overrides):
    base = {
        "source": "gestorhs.os",
        "external_id": "1234",
        "board_id": board_id,
        "title": "OS #1234 · Transportadora X",
        "client": {"external_id": "789", "name": "Transportadora X LTDA"},
    }
    base.update(overrides)
    return base


def test_cria_o_card_e_responde_201(client, chave, board):
    r = client.post(URL, json=corpo(board.id), headers={"X-API-Key": chave})

    assert r.status_code == 201
    body = r.json()
    assert body["created"] is True
    assert body["external_id"] == "1234"


def test_reenvio_responde_200_e_created_false(client, chave, board):
    client.post(URL, json=corpo(board.id), headers={"X-API-Key": chave})
    r = client.post(URL, json=corpo(board.id), headers={"X-API-Key": chave})

    assert r.status_code == 200
    assert r.json()["created"] is False


def test_carga_de_atrasados_cria_e_reenvio_nao_duplica(client, chave, board):
    """gestorhs.atrasados: 1 card por cliente com os vencidos agrupados em devices[]."""
    payload = corpo(
        board.id,
        source="gestorhs.atrasados",
        external_id="512:2026-07-18",
        title="Calibrações vencidas · Transportadora X",
        devices=[
            {"serial_number": "AB123", "next_recalibration_date": "2026-01-10"},
            {"serial_number": "CD456", "next_recalibration_date": "2026-03-22"},
        ],
    )

    r1 = client.post(URL, json=payload, headers={"X-API-Key": chave})
    assert r1.status_code == 201
    assert r1.json()["created"] is True
    assert r1.json()["external_source"] == "gestorhs.atrasados"

    r2 = client.post(URL, json=payload, headers={"X-API-Key": chave})
    assert r2.status_code == 200
    assert r2.json()["created"] is False
    assert r2.json()["id"] == r1.json()["id"]


def test_os_tres_sources_com_mesmo_id_geram_cards_distintos(client, chave, board):
    """O source namespaceia o external_id: OS 500, equipamento 500 e cliente 500
    são três cards, não um."""
    ids = set()
    for source in ("gestorhs.os", "gestorhs.calibracao", "gestorhs.atrasados"):
        r = client.post(
            URL, json=corpo(board.id, source=source, external_id="500"),
            headers={"X-API-Key": chave},
        )
        assert r.status_code == 201
        ids.add(r.json()["id"])

    assert len(ids) == 3


def test_sem_chave_responde_401(client, board):
    assert client.post(URL, json=corpo(board.id)).status_code == 401


def test_board_sem_etapa_de_entrada_responde_404(client, chave, db):
    b = ServiceBoard(name="Cobrança")
    db.add(b)
    db.commit()
    db.add(ServiceList(board_id=b.id, name="Oportunidade", position=0))
    db.commit()

    r = client.post(URL, json=corpo(b.id), headers={"X-API-Key": chave})
    assert r.status_code == 404


def test_source_invalido_responde_422(client, chave, board):
    r = client.post(
        URL, json=corpo(board.id, source="outro.sistema"), headers={"X-API-Key": chave}
    )
    assert r.status_code == 422


def test_os_e_calibracao_com_mesmo_id_geram_cards_distintos(client, chave, board):
    r1 = client.post(URL, json=corpo(board.id, source="gestorhs.os", external_id="500"),
                     headers={"X-API-Key": chave})
    r2 = client.post(URL, json=corpo(board.id, source="gestorhs.calibracao", external_id="500"),
                     headers={"X-API-Key": chave})

    assert r1.status_code == 201
    assert r2.status_code == 201
    assert r1.json()["id"] != r2.json()["id"]


def test_ciclos_de_calibracao_diferentes_geram_cards_distintos(client, chave, board):
    """O ano seguinte precisa virar card novo — por isso a data entra na chave."""
    r1 = client.post(
        URL, json=corpo(board.id, source="gestorhs.calibracao", external_id="500:2026-03-14"),
        headers={"X-API-Key": chave},
    )
    r2 = client.post(
        URL, json=corpo(board.id, source="gestorhs.calibracao", external_id="500:2027-03-14"),
        headers={"X-API-Key": chave},
    )

    assert r1.status_code == 201
    assert r2.status_code == 201
    assert r1.json()["id"] != r2.json()["id"]
