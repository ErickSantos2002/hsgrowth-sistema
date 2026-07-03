"""Testes do módulo de Propostas."""
import pytest
from app.repositories.proposal_repository import ProposalRepository
from app.schemas.proposal import ProposalCreate, ProposalItemCreate


def test_next_number_starts_at_1_and_increments(db):
    repo = ProposalRepository(db)
    assert repo.next_number() == 1
    p = repo.create(ProposalCreate(items=[]))
    assert p.number == 1
    assert repo.next_number() == 2


def test_create_with_items_computes_item_total(db):
    repo = ProposalRepository(db)
    p = repo.create(ProposalCreate(items=[
        ProposalItemCreate(description="Calibração", quantity=2, unit_price=100),
    ]))
    assert len(p.items) == 1
    assert float(p.items[0].total) == 200.0


from app.services.proposal_service import ProposalService


def test_service_computes_totals_and_marker_em_aberto(db):
    svc = ProposalService(db)
    resp = svc.create(ProposalCreate(
        shipping=200, discount=0,
        items=[ProposalItemCreate(description="Calibração", quantity=1, unit_price=395)],
    ))
    assert resp.total_items == 395.0
    assert resp.total == 595.0            # 395 + 200 - 0
    assert resp.marker == "em_aberto"     # sem card vinculado


def test_service_marker_reflects_won_card(db):
    # cria um card de serviço numa lista "done" para simular Ganho
    from app.models.service_board import ServiceBoard
    from app.models.service_list import ServiceList
    from app.models.service_card import ServiceCard
    board = ServiceBoard(name="Serv", description="x"); db.add(board); db.commit()
    lst = ServiceList(name="Ganho", position=5, board_id=board.id, is_done_stage=True)
    db.add(lst); db.commit()
    card = ServiceCard(title="C", list_id=lst.id); db.add(card); db.commit()

    svc = ProposalService(db)
    resp = svc.create(ProposalCreate(service_card_id=card.id, items=[]))
    assert resp.marker == "aprovada"


def test_service_marker_reflects_lost_card(db):
    from app.models.service_board import ServiceBoard
    from app.models.service_list import ServiceList
    from app.models.service_card import ServiceCard
    board = ServiceBoard(name="Serv", description="x"); db.add(board); db.commit()
    lst = ServiceList(name="Perdido", position=6, board_id=board.id, is_lost_stage=True)
    db.add(lst); db.commit()
    card = ServiceCard(title="C", list_id=lst.id); db.add(card); db.commit()
    svc = ProposalService(db)
    resp = svc.create(ProposalCreate(service_card_id=card.id, items=[]))
    assert resp.marker == "nao_aprovada"


def test_marker_perdido_beats_ganho_multi_card(db):
    """Proposta em 2 cards (um Ganho, um Perdido) → nao_aprovada (Perdido > Ativo > Ganho)."""
    from app.models.service_board import ServiceBoard
    from app.models.service_list import ServiceList
    from app.models.service_card import ServiceCard
    board = ServiceBoard(name="Serv", description="x"); db.add(board); db.commit()
    won = ServiceList(name="Ganho", position=5, board_id=board.id, is_done_stage=True)
    lost = ServiceList(name="Perdido", position=6, board_id=board.id, is_lost_stage=True)
    db.add_all([won, lost]); db.commit()
    card_won = ServiceCard(title="W", list_id=won.id)
    card_lost = ServiceCard(title="L", list_id=lost.id)
    db.add_all([card_won, card_lost]); db.commit()

    svc = ProposalService(db)
    resp = svc.create(ProposalCreate(service_card_id=card_won.id, items=[]))
    assert resp.marker == "aprovada"                       # só o Ganho
    resp = svc.link(resp.id, card_lost.id)                 # adiciona o Perdido
    assert resp.marker == "nao_aprovada"                   # Perdido domina
    assert {lc.card_id for lc in resp.linked_cards} == {card_won.id, card_lost.id}


def test_marker_ganho_plus_active_is_em_aberto(db):
    """Ganho + card ativo → em_aberto (Ativo domina Ganho)."""
    from app.models.service_board import ServiceBoard
    from app.models.service_list import ServiceList
    from app.models.service_card import ServiceCard
    board = ServiceBoard(name="Serv", description="x"); db.add(board); db.commit()
    won = ServiceList(name="Ganho", position=5, board_id=board.id, is_done_stage=True)
    active = ServiceList(name="Proposta", position=3, board_id=board.id)
    db.add_all([won, active]); db.commit()
    card_won = ServiceCard(title="W", list_id=won.id)
    card_active = ServiceCard(title="A", list_id=active.id)
    db.add_all([card_won, card_active]); db.commit()

    svc = ProposalService(db)
    resp = svc.create(ProposalCreate(service_card_id=card_won.id, items=[]))
    resp = svc.link(resp.id, card_active.id)
    assert resp.marker == "em_aberto"


def test_update_creates_version(db):
    """Editar uma proposta arquiva o estado anterior como versão."""
    svc = ProposalService(db)
    from app.schemas.proposal import ProposalUpdate
    resp = svc.create(ProposalCreate(shipping=100, items=[
        ProposalItemCreate(description="Calibração", quantity=1, unit_price=395),
    ]))
    assert svc.list_versions(resp.id) == []                # sem versões após criação
    svc.update(resp.id, ProposalUpdate(shipping=200))
    versions = svc.list_versions(resp.id)
    assert len(versions) == 1
    assert versions[0].version_number == 1
    assert versions[0].snapshot["shipping"] == 100.0       # snapshot guardou o valor ANTERIOR


def test_seller_name_is_creator_and_immutable(db):
    """Vendedor = criador; editar por outro usuário não muda; histórico registra quem alterou."""
    from types import SimpleNamespace
    from app.schemas.proposal import ProposalUpdate
    creator = SimpleNamespace(name="Ana Criadora")
    editor = SimpleNamespace(name="Bruno Editor")
    svc = ProposalService(db)

    resp = svc.create(ProposalCreate(seller_name="ignorado", items=[]), user=creator)
    assert resp.seller_name == "Ana Criadora"          # veio do usuário, não do payload

    # Outro usuário edita tentando trocar o vendedor
    resp = svc.update(resp.id, ProposalUpdate(seller_name="Bruno Editor", shipping=50), user=editor)
    assert resp.seller_name == "Ana Criadora"          # imutável

    versions = svc.list_versions(resp.id)
    assert versions[0].changed_by == "Bruno Editor"    # histórico mostra quem alterou


def test_unlink_removes_card_link(db):
    from app.models.service_board import ServiceBoard
    from app.models.service_list import ServiceList
    from app.models.service_card import ServiceCard
    board = ServiceBoard(name="Serv", description="x"); db.add(board); db.commit()
    lst = ServiceList(name="Proposta", position=3, board_id=board.id); db.add(lst); db.commit()
    card = ServiceCard(title="C", list_id=lst.id); db.add(card); db.commit()
    svc = ProposalService(db)
    resp = svc.create(ProposalCreate(service_card_id=card.id, items=[]))
    assert len(resp.linked_cards) == 1
    resp = svc.unlink(resp.id, card.id)
    assert resp.linked_cards == []


def test_soft_deleted_proposal_hidden_from_list(db):
    svc = ProposalService(db)
    p = svc.create(ProposalCreate(items=[]))
    svc.delete(p.id)
    assert svc.list().total == 0


def test_endpoint_create_and_list_requires_service_access(client, admin_headers):
    # admin tem acesso ao módulo de Serviço
    payload = {"items": [{"description": "Calibração", "quantity": 1, "unit_price": 395}], "shipping": 200}
    r = client.post("/api/v1/proposals", json=payload, headers=admin_headers)
    assert r.status_code == 201, r.text
    body = r.json()
    created_number = body["number"]
    assert created_number >= 1
    assert body["total"] == 595.0

    r2 = client.get("/api/v1/proposals", headers=admin_headers)
    assert r2.status_code == 200
    data = r2.json()
    assert data["total"] >= 1
    numbers = [p["number"] for p in data["items"]]
    assert created_number in numbers


def test_endpoint_blocks_salesperson(client, salesperson_headers):
    r = client.get("/api/v1/proposals", headers=salesperson_headers)
    assert r.status_code == 403


# ── Regra de avanço: proposta vinculada ao card ────────────────────────────────

def test_has_linked_proposal_helper(db):
    """_has_linked_proposal retorna False sem proposta e True com proposta vinculada."""
    from app.services.service_board_service import ServiceBoardService
    from app.models.service_board import ServiceBoard
    from app.models.service_list import ServiceList
    from app.models.service_card import ServiceCard
    from app.models.proposal import Proposal

    board = ServiceBoard(name="Serv", description="x")
    db.add(board)
    db.commit()

    lst = ServiceList(name="Proposta", position=3, board_id=board.id)
    db.add(lst)
    db.commit()

    card = ServiceCard(title="C", list_id=lst.id)
    db.add(card)
    db.commit()

    from app.models.proposal_service_card import ProposalServiceCard

    svc = ServiceBoardService(db)

    # Sem proposta vinculada → False
    assert svc._has_linked_proposal(card.id) is False

    # Adiciona proposta vinculada via tabela de vínculo N:N
    prop = Proposal(number=9901)
    db.add(prop)
    db.commit()
    db.add(ProposalServiceCard(proposal_id=prop.id, service_card_id=card.id))
    db.commit()

    # Com proposta vinculada → True
    assert svc._has_linked_proposal(card.id) is True


def test_endpoint_proposal_pdf(client, admin_headers):
    payload = {"items": [{"description": "Calibração", "quantity": 1, "unit_price": 395}], "shipping": 200}
    r = client.post("/api/v1/proposals", json=payload, headers=admin_headers)
    pid = r.json()["id"]
    r2 = client.get(f"/api/v1/proposals/{pid}/pdf", headers=admin_headers)
    assert r2.status_code == 200, r2.text
    assert r2.headers["content-type"] == "application/pdf"
    assert r2.content[:5] == b"%PDF-"


def test_auto_attach_pdf_on_create_linked(db):
    from app.models.service_board import ServiceBoard
    from app.models.service_list import ServiceList
    from app.models.service_card import ServiceCard
    from app.models.service_card_activity import ServiceCardActivity
    from app.services.proposal_service import ProposalService
    from app.schemas.proposal import ProposalCreate, ProposalItemCreate
    board = ServiceBoard(name="Serv", description="x"); db.add(board); db.commit()
    lst = ServiceList(name="Proposta", position=3, board_id=board.id); db.add(lst); db.commit()
    card = ServiceCard(title="C", list_id=lst.id); db.add(card); db.commit()
    svc = ProposalService(db)
    svc.create(ProposalCreate(service_card_id=card.id, items=[ProposalItemCreate(description="Calibração", quantity=1, unit_price=395)]))
    files = db.query(ServiceCardActivity).filter(ServiceCardActivity.service_card_id == card.id, ServiceCardActivity.category == "arquivo").all()
    assert len(files) == 1
    assert (files[0].activity_metadata or {}).get("proposal_pdf_id") is not None
