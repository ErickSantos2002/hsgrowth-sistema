"""Pedido de liberação de CNPJ em Vendas (1.11.32): pedir, liberar, recusar e cancelar."""
import pytest
from fastapi import HTTPException

from app.models.activity import Activity
from app.models.card import Card
from app.models.cnpj_release_request import CnpjReleaseRequest
from app.models.notification import Notification
from app.services.parcerias import liberacoes, vendas as trava

from tests.unit.apoio_parcerias import CNPJ_B, card_de_vendas, cliente, headers, usuario, vendas


@pytest.fixture
def cena(db):
    """O dono negocia o CNPJ A agora; o outro vendedor tenta criar um card dele."""
    from types import SimpleNamespace
    v = vendas(db)
    dono = usuario(db, "salesperson", "dono@hs.com")
    card_do_dono = card_de_vendas(db, v.lead_novo, assigned_to_id=dono.id)
    return SimpleNamespace(
        v=v, dono=dono, card_do_dono=card_do_dono,
        outro=usuario(db, "salesperson", "outro@hs.com"),
        gerente=usuario(db, "manager", "gerente@hs.com"),
        admin=usuario(db, "admin", "adm@hs.com"),
        empresa=cliente(db),
    )


def _pedir_card(db, cena, motivo="O cliente me ligou direto"):
    return liberacoes.pedir(db, cena.outro, "criar_card", cena.empresa.id, motivo,
                            payload={"title": "Empresa A - etilômetros", "list_id": cena.v.lead_novo.id})


def _avisos(db, tipo):
    return db.query(Notification).filter(Notification.notification_type == tipo).all()


def _status(exc) -> int:
    return exc.value.status_code


# ─── Pedir ───────────────────────────────────────────────────────────────────

def test_pedir_grava_pendente_e_avisa_a_gestao(db, cena):
    p = _pedir_card(db, cena)

    assert p.status == "pendente" and p.kind == "criar_card" and p.cnpj == "11222333000181"
    assert cena.dono.name in p.blocked_with
    assert p.payload["title"] == "Empresa A - etilômetros" and "cnpj_justificativa" not in p.payload
    assert db.query(Card).filter(Card.title == "Empresa A - etilômetros").count() == 0  # o card não nasce
    assert {a.user_id for a in _avisos(db, "cnpj_liberacao_pedido")} == {cena.gerente.id, cena.admin.id}


def test_pedir_de_novo_devolve_o_mesmo_pedido(db, cena):
    assert _pedir_card(db, cena).id == _pedir_card(db, cena, "outro motivo").id
    assert db.query(CnpjReleaseRequest).count() == 1


def test_pedir_cnpj_livre_admin_ou_sem_motivo_recusa(db, cena):
    livre = cliente(db, CNPJ_B)
    with pytest.raises(HTTPException) as e:
        liberacoes.pedir(db, cena.outro, "criar_card", livre.id, "motivo",
                         payload={"title": "X", "list_id": cena.v.lead_novo.id})
    assert _status(e) == 422 and "livre" in e.value.detail

    with pytest.raises(HTTPException) as e:
        liberacoes.pedir(db, cena.admin, "criar_card", cena.empresa.id, "motivo",
                         payload={"title": "X", "list_id": cena.v.lead_novo.id})
    assert _status(e) == 403

    with pytest.raises(HTTPException) as e:
        _pedir_card(db, cena, motivo="   ")
    assert _status(e) == 422


# ─── Liberar ─────────────────────────────────────────────────────────────────

def test_liberar_cria_o_card_do_vendedor_e_registra(db, cena):
    p = _pedir_card(db, cena)

    p = liberacoes.liberar(db, cena.gerente, p.id, "Cliente pediu outro vendedor")

    card = db.query(Card).filter(Card.id == p.card_id).one()
    assert card.title == "Empresa A - etilômetros" and card.assigned_to_id == cena.outro.id
    assert card.client_id == cena.empresa.id
    assert p.status == "liberado" and p.decided_by_id == cena.gerente.id and p.decided_at is not None
    registro = db.query(Activity).filter(Activity.card_id == card.id, Activity.activity_type == "parcerias_cnpj").one()
    assert "liberado por gerente a pedido de outro" in registro.description
    assert "O cliente me ligou direto" in registro.description and "Cliente pediu outro vendedor" in registro.description
    aviso = _avisos(db, "cnpj_liberacao_decisao")
    assert [a.user_id for a in aviso] == [cena.outro.id] and "liberado" in aviso[0].title


def test_liberar_vincular_poe_a_empresa_no_card_do_vendedor(db, cena):
    card_do_outro = card_de_vendas(db, cena.v.lead_novo, documento=CNPJ_B, assigned_to_id=cena.outro.id)
    p = liberacoes.pedir(db, cena.outro, "vincular_empresa", cena.empresa.id, "Mesmo grupo", card_id=card_do_outro.id)

    liberacoes.liberar(db, cena.admin, p.id)

    db.refresh(card_do_outro)
    assert card_do_outro.client_id == cena.empresa.id
    assert db.query(Activity).filter(Activity.card_id == card_do_outro.id,
                                     Activity.activity_type == "parcerias_cnpj").count() == 1


def test_liberar_que_falha_deixa_o_pedido_pendente(db, cena):
    p = _pedir_card(db, cena)
    p.payload = {**p.payload, "list_id": 999999}  # a lista sumiu depois do pedido
    db.commit()

    with pytest.raises(HTTPException):
        liberacoes.liberar(db, cena.gerente, p.id)

    assert db.query(CnpjReleaseRequest).filter(CnpjReleaseRequest.id == p.id).one().status == "pendente"


def test_liberar_duas_vezes_ou_sem_ser_gestao(db, cena):
    p = _pedir_card(db, cena)
    with pytest.raises(HTTPException) as e:
        liberacoes.liberar(db, cena.outro, p.id)
    assert _status(e) == 403

    liberacoes.liberar(db, cena.gerente, p.id)
    with pytest.raises(HTTPException) as e:
        liberacoes.liberar(db, cena.gerente, p.id)
    assert _status(e) == 409


# ─── Recusar e cancelar ──────────────────────────────────────────────────────

def test_recusar_exige_motivo_e_avisa(db, cena):
    p = _pedir_card(db, cena)
    with pytest.raises(HTTPException) as e:
        liberacoes.recusar(db, cena.gerente, p.id, "")
    assert _status(e) == 422

    p = liberacoes.recusar(db, cena.gerente, p.id, "O dono está fechando a proposta")

    assert p.status == "recusado" and p.decision_note == "O dono está fechando a proposta"
    aviso = _avisos(db, "cnpj_liberacao_decisao")
    assert aviso[0].user_id == cena.outro.id and "O dono está fechando a proposta" in aviso[0].message


def test_cancelar_so_quem_pediu(db, cena):
    p = _pedir_card(db, cena)
    with pytest.raises(HTTPException) as e:
        liberacoes.cancelar(db, cena.dono, p.id)
    assert _status(e) == 403

    assert liberacoes.cancelar(db, cena.outro, p.id).status == "cancelado"


# ─── Listar e contar ─────────────────────────────────────────────────────────

def test_listar_e_contar(db, cena):
    _pedir_card(db, cena)
    sdr = usuario(db, "sdr", "sdr@hs.com")
    liberacoes.pedir(db, sdr, "criar_card", cena.empresa.id, "lead quente",
                     payload={"title": "Do SDR", "list_id": cena.v.lead_novo.id})

    assert liberacoes.listar(db, cena.gerente)[0] == 2
    total, itens = liberacoes.listar(db, cena.outro)
    assert total == 1 and [p.requested_by_id for p in itens] == [cena.outro.id]
    assert liberacoes.contar_pendentes(db, cena.admin) == 2
    assert liberacoes.contar_pendentes(db, cena.outro) == 0
    assert liberacoes.listar(db, cena.gerente, "recusado") == (0, [])


def test_listar_pagina_de_10_em_10(db, cena):
    for i in range(12):
        db.add(CnpjReleaseRequest(kind="criar_card", status="recusado", cnpj="11111111000111",
                                  reason=f"pedido {i}", blocked_with="com alguém",
                                  requested_by_id=cena.outro.id))
    db.commit()

    total, primeira = liberacoes.listar(db, cena.gerente)
    assert total == 12 and len(primeira) == 10
    total, segunda = liberacoes.listar(db, cena.gerente, pagina=2)
    assert total == 12 and len(segunda) == 2
    assert not {p.id for p in primeira} & {p.id for p in segunda}
    # Página além do fim: vazia, mas o total continua certo.
    assert liberacoes.listar(db, cena.gerente, pagina=5) == (12, [])


def test_conferir_com_liberacao_passa_sem_checar(db, cena):
    assert trava.conferir(db, cena.outro, cena.empresa.id, liberacao="texto") == "texto"
    with pytest.raises(HTTPException):
        trava.conferir(db, cena.outro, cena.empresa.id)


# ─── Endpoints (permissões) ──────────────────────────────────────────────────

def test_endpoints_pedir_e_decidir(client, db, cena):
    url = "/api/v1/parcerias/liberacoes-cnpj"
    r = client.post(url, headers=headers(cena.outro), json={
        "kind": "criar_card", "client_id": cena.empresa.id, "reason": "cliente ligou",
        "payload": {"title": "Pelo endpoint", "list_id": cena.v.lead_novo.id},
    })
    assert r.status_code == 201, r.text
    pedido = r.json()
    assert pedido["status"] == "pendente" and pedido["solicitante"] == cena.outro.name
    assert pedido["titulo_do_card"] == "Pelo endpoint"

    assert client.post(f"{url}/{pedido['id']}/liberar", headers=headers(cena.outro), json={}).status_code == 403
    assert client.get(f"{url}/pendentes/contagem", headers=headers(cena.gerente)).json() == {"total": 1}
    lista = client.get(url, headers=headers(cena.gerente), params={"pagina": 1}).json()
    assert lista["total"] == 1 and [p["id"] for p in lista["itens"]] == [pedido["id"]]

    r = client.post(f"{url}/{pedido['id']}/liberar", headers=headers(cena.gerente), json={"nota": "ok"})
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "liberado" and r.json()["card_id"]

    viewer = usuario(db, "viewer", "ver@hs.com")
    assert client.get(url, headers=headers(viewer)).status_code == 403
