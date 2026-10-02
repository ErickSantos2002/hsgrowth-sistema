"""Bolinha "concluído" pessoal: regra da foto (board + situação)."""
from types import SimpleNamespace

from app.models.card_check import CardCheck
from app.services.card_check_service import (
    CardCheckService, situacao_card, situacao_lista_servico,
)


def test_situacao_card_de_vendas():
    assert situacao_card(SimpleNamespace(is_won=0)) == "aberto"
    assert situacao_card(SimpleNamespace(is_won=1)) == "ganho"
    assert situacao_card(SimpleNamespace(is_won=-1)) == "perdido"
    assert situacao_card(SimpleNamespace(is_won=None)) == "aberto"


def test_situacao_de_lista_de_servico_por_flag_ou_nome():
    def L(nome, done=False, lost=False):
        return SimpleNamespace(name=nome, is_done_stage=done, is_lost_stage=lost)
    assert situacao_lista_servico(L("Entrada")) == "aberto"
    assert situacao_lista_servico(L("Fechado", done=True)) == "ganho"
    assert situacao_lista_servico(L("Negócio Ganho")) == "ganho"
    assert situacao_lista_servico(L("Negócio Perdido")) == "perdido"
    assert situacao_lista_servico(L("X", lost=True)) == "perdido"
    assert situacao_lista_servico(None) == "aberto"


def test_ids_validos_mantem_quem_bate_e_apaga_quem_nao_bate(db, test_admin_user, test_card):
    svc = CardCheckService(db)
    svc.marcar(test_admin_user.id, "card_id", test_card.id, board_id=6, situacao="aberto")
    assert svc.ids_validos(test_admin_user.id, "card_id", {test_card.id: (6, "aberto")}) == {test_card.id}
    # mudou a situação → não vale mais e some do banco
    assert svc.ids_validos(test_admin_user.id, "card_id", {test_card.id: (6, "ganho")}) == set()
    assert db.query(CardCheck).count() == 0


def test_marcar_duas_vezes_atualiza_a_foto_e_desmarcar_e_idempotente(db, test_admin_user, test_card):
    svc = CardCheckService(db)
    svc.marcar(test_admin_user.id, "card_id", test_card.id, board_id=6, situacao="aberto")
    svc.marcar(test_admin_user.id, "card_id", test_card.id, board_id=7, situacao="ganho")
    linhas = db.query(CardCheck).all()
    assert len(linhas) == 1 and (linhas[0].board_id, linhas[0].situacao) == (7, "ganho")
    svc.desmarcar(test_admin_user.id, "card_id", test_card.id)
    svc.desmarcar(test_admin_user.id, "card_id", test_card.id)
    assert db.query(CardCheck).count() == 0


def test_sem_a_tabela_o_board_abre_sem_bolinhas(db, test_admin_user, test_card):
    """Deploy antes da migration: a listagem do board não pode quebrar."""
    CardCheck.__table__.drop(bind=db.get_bind())
    try:
        svc = CardCheckService(db)
        assert svc.ids_validos(test_admin_user.id, "card_id", {test_card.id: (6, "aberto")}) == set()
        assert test_card.title  # a sessão segue utilizável
    finally:
        CardCheck.__table__.create(bind=db.get_bind())


# ─── Vendas (API) ──────────────────────────────────────────────────────────────
from app.models.board import Board  # noqa: E402
from app.models.list import List as BoardList  # noqa: E402


def _marcado(client, headers, board_id, card_id):
    r = client.get(f"/api/v1/cards?minimal=true&board_id={board_id}&all=true", headers=headers)
    assert r.status_code == 200, r.text
    return next(c for c in r.json()["cards"] if c["id"] == card_id)["checked_by_me"]


class TestBolinhaVendas:
    def test_marcar_e_desmarcar(self, client, manager_headers, test_card, test_board):
        assert _marcado(client, manager_headers, test_board.id, test_card.id) is False
        r = client.put(f"/api/v1/cards/{test_card.id}/check", headers=manager_headers)
        assert r.status_code == 200 and r.json() == {"checked": True}
        assert _marcado(client, manager_headers, test_board.id, test_card.id) is True
        r = client.delete(f"/api/v1/cards/{test_card.id}/check", headers=manager_headers)
        assert r.status_code == 200 and r.json() == {"checked": False}
        assert _marcado(client, manager_headers, test_board.id, test_card.id) is False

    def test_e_pessoal(self, client, manager_headers, salesperson_headers, test_card, test_board):
        client.put(f"/api/v1/cards/{test_card.id}/check", headers=manager_headers)
        assert _marcado(client, salesperson_headers, test_board.id, test_card.id) is False

    def test_mudar_de_lista_no_mesmo_board_continua(self, client, manager_headers, db, test_card, test_lists, test_board):
        client.put(f"/api/v1/cards/{test_card.id}/check", headers=manager_headers)
        test_card.list_id = test_lists[1].id
        db.commit()
        assert _marcado(client, manager_headers, test_board.id, test_card.id) is True

    def test_ir_para_outro_board_desmarca(self, client, manager_headers, db, test_card):
        client.put(f"/api/v1/cards/{test_card.id}/check", headers=manager_headers)
        outro = Board(name="Aquisição")
        db.add(outro); db.commit()
        lst = BoardList(name="Entrada", position=0, board_id=outro.id)
        db.add(lst); db.commit()
        test_card.list_id = lst.id
        db.commit()
        assert _marcado(client, manager_headers, outro.id, test_card.id) is False

    def test_ganho_desmarca_e_marcar_no_ganho_fica(self, client, manager_headers, db, test_card, test_board):
        client.put(f"/api/v1/cards/{test_card.id}/check", headers=manager_headers)
        test_card.is_won = 1
        db.commit()
        assert _marcado(client, manager_headers, test_board.id, test_card.id) is False
        client.put(f"/api/v1/cards/{test_card.id}/check", headers=manager_headers)
        assert _marcado(client, manager_headers, test_board.id, test_card.id) is True

    def test_perdido_e_reabrir_desmarcam(self, client, manager_headers, db, test_card, test_board):
        client.put(f"/api/v1/cards/{test_card.id}/check", headers=manager_headers)
        test_card.is_won = -1
        db.commit()
        assert _marcado(client, manager_headers, test_board.id, test_card.id) is False
        client.put(f"/api/v1/cards/{test_card.id}/check", headers=manager_headers)
        test_card.is_won = 0
        db.commit()
        assert _marcado(client, manager_headers, test_board.id, test_card.id) is False

    def test_card_inexistente_404(self, client, manager_headers):
        assert client.put("/api/v1/cards/999999/check", headers=manager_headers).status_code == 404


# ─── Serviço / Cobrança ────────────────────────────────────────────────────────
from app.models.service_board import ServiceBoard  # noqa: E402
from app.models.service_card import ServiceCard  # noqa: E402
from app.models.service_list import ServiceList  # noqa: E402
from app.services.service_board_service import ServiceBoardService  # noqa: E402


def _sv_marcado(db, board_id, user_id, card_id):
    r = ServiceBoardService(db).list_cards(board_id, user_id=user_id)
    return next(c for c in r.cards if c.id == card_id).checked_by_me


class TestBolinhaServico:
    def _cenario(self, db):
        b = ServiceBoard(name="Serviços")
        cob = ServiceBoard(name="Cobrança")
        db.add_all([b, cob]); db.commit()
        entrada = ServiceList(board_id=b.id, name="Entrada", position=0)
        execucao = ServiceList(board_id=b.id, name="Execução", position=1)
        ganho = ServiceList(board_id=b.id, name="Negócio Ganho", position=2)
        perdido = ServiceList(board_id=b.id, name="Negócio Perdido", position=3)
        cob_entrada = ServiceList(board_id=cob.id, name="Entrada", position=0)
        db.add_all([entrada, execucao, ganho, perdido, cob_entrada]); db.commit()
        card = ServiceCard(list_id=entrada.id, title="CX 1083")
        db.add(card); db.commit(); db.refresh(card)
        return SimpleNamespace(b=b, cob=cob, entrada=entrada, execucao=execucao,
                               ganho=ganho, perdido=perdido, cob_entrada=cob_entrada, card=card)

    def test_api_marcar_desmarcar_e_regras(self, client, admin_headers, db, test_admin_user, test_manager_user):
        c = self._cenario(db)
        url = f"/api/v1/service-boards/{c.b.id}/cards/{c.card.id}/check"
        r = client.put(url, headers=admin_headers)
        assert r.status_code == 200 and r.json() == {"checked": True}
        assert _sv_marcado(db, c.b.id, test_admin_user.id, c.card.id) is True
        assert _sv_marcado(db, c.b.id, test_manager_user.id, c.card.id) is False   # pessoal
        c.card.list_id = c.execucao.id; db.commit()                                  # mesmo board
        assert _sv_marcado(db, c.b.id, test_admin_user.id, c.card.id) is True
        c.card.list_id = c.ganho.id; db.commit()                                     # ganho
        assert _sv_marcado(db, c.b.id, test_admin_user.id, c.card.id) is False
        assert client.put(url, headers=admin_headers).status_code == 200             # marca no ganho
        assert _sv_marcado(db, c.b.id, test_admin_user.id, c.card.id) is True
        assert client.delete(url, headers=admin_headers).json() == {"checked": False}
        assert _sv_marcado(db, c.b.id, test_admin_user.id, c.card.id) is False

    def test_perdido_e_outro_board_desmarcam(self, client, admin_headers, db, test_admin_user):
        c = self._cenario(db)
        client.put(f"/api/v1/service-boards/{c.b.id}/cards/{c.card.id}/check", headers=admin_headers)
        c.card.list_id = c.perdido.id; db.commit()
        assert _sv_marcado(db, c.b.id, test_admin_user.id, c.card.id) is False
        c.card.list_id = c.entrada.id; db.commit()
        client.put(f"/api/v1/service-boards/{c.b.id}/cards/{c.card.id}/check", headers=admin_headers)
        c.card.list_id = c.cob_entrada.id; db.commit()
        assert _sv_marcado(db, c.cob.id, test_admin_user.id, c.card.id) is False

    def test_card_de_outro_board_404(self, client, admin_headers, db):
        c = self._cenario(db)
        r = client.put(f"/api/v1/service-boards/{c.cob.id}/cards/{c.card.id}/check", headers=admin_headers)
        assert r.status_code == 404

    def test_listagem_pela_api_traz_o_campo(self, client, admin_headers, db):
        c = self._cenario(db)
        client.put(f"/api/v1/service-boards/{c.b.id}/cards/{c.card.id}/check", headers=admin_headers)
        r = client.get(f"/api/v1/service-boards/{c.b.id}/cards", headers=admin_headers)
        assert r.status_code == 200
        assert next(x for x in r.json()["cards"] if x["id"] == c.card.id)["checked_by_me"] is True
