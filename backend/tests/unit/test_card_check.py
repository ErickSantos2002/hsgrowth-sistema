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


# ─── Detalhe do card (bolinha no topo da tela do card) ────────────────────────

class TestBolinhaNoDetalhe:
    def test_detalhe_de_vendas_traz_a_marcacao(self, client, manager_headers, salesperson_headers, db, test_card):
        url = f"/api/v1/cards/{test_card.id}"
        assert client.get(url, headers=manager_headers).json()["checked_by_me"] is False
        client.put(f"{url}/check", headers=manager_headers)
        assert client.get(url, headers=manager_headers).json()["checked_by_me"] is True
        assert client.get(url, headers=salesperson_headers).json()["checked_by_me"] is False  # pessoal
        test_card.is_won = 1
        db.commit()
        assert client.get(url, headers=manager_headers).json()["checked_by_me"] is False  # ganho desmarca

    def test_detalhe_de_servico_traz_a_marcacao(self, client, admin_headers, db):
        c = TestBolinhaServico()._cenario(db)
        url = f"/api/v1/service-boards/{c.b.id}/cards/{c.card.id}"
        assert client.get(url, headers=admin_headers).json()["checked_by_me"] is False
        client.put(f"{url}/check", headers=admin_headers)
        assert client.get(url, headers=admin_headers).json()["checked_by_me"] is True
        c.card.list_id = c.perdido.id
        db.commit()
        assert client.get(url, headers=admin_headers).json()["checked_by_me"] is False  # perdido desmarca


# ─── Desmarcar todos os meus concluídos de uma lista ──────────────────────────
from app.models.card import Card  # noqa: E402


class TestLimparConcluidosDaLista:
    def test_vendas_limpa_so_os_meus_e_so_da_lista(
        self, client, manager_headers, salesperson_headers, db, test_card, test_lists, test_board, test_salesperson_user
    ):
        outro = Card(title="Outra lista", list_id=test_lists[1].id,
                     assigned_to_id=test_salesperson_user.id, position=0)
        db.add(outro); db.commit()
        for cid in (test_card.id, outro.id):
            client.put(f"/api/v1/cards/{cid}/check", headers=manager_headers)
        client.put(f"/api/v1/cards/{test_card.id}/check", headers=salesperson_headers)

        r = client.delete(f"/api/v1/boards/{test_board.id}/lists/{test_lists[0].id}/checks", headers=manager_headers)
        assert r.status_code == 200 and r.json() == {"removed": 1}
        assert _marcado(client, manager_headers, test_board.id, test_card.id) is False
        assert _marcado(client, manager_headers, test_board.id, outro.id) is True          # outra lista
        assert _marcado(client, salesperson_headers, test_board.id, test_card.id) is True  # do colega

    def test_vendas_vendedor_pode_limpar_os_seus(self, client, salesperson_headers, test_card, test_lists, test_board):
        client.put(f"/api/v1/cards/{test_card.id}/check", headers=salesperson_headers)
        r = client.delete(f"/api/v1/boards/{test_board.id}/lists/{test_lists[0].id}/checks", headers=salesperson_headers)
        assert r.status_code == 200 and r.json() == {"removed": 1}

    def test_vendas_lista_de_outro_board_404(self, client, manager_headers, db, test_lists):
        outro = Board(name="Outro")
        db.add(outro); db.commit()
        r = client.delete(f"/api/v1/boards/{outro.id}/lists/{test_lists[0].id}/checks", headers=manager_headers)
        assert r.status_code == 404

    def test_servico_limpa_a_lista(self, client, admin_headers, db, test_admin_user):
        c = TestBolinhaServico()._cenario(db)
        client.put(f"/api/v1/service-boards/{c.b.id}/cards/{c.card.id}/check", headers=admin_headers)
        r = client.delete(f"/api/v1/service-boards/{c.b.id}/lists/{c.entrada.id}/checks", headers=admin_headers)
        assert r.status_code == 200 and r.json() == {"removed": 1}
        assert _sv_marcado(db, c.b.id, test_admin_user.id, c.card.id) is False
        r = client.delete(f"/api/v1/service-boards/{c.cob.id}/lists/{c.entrada.id}/checks", headers=admin_headers)
        assert r.status_code == 404


# ─── Editar/excluir lista: só admin e gerente ─────────────────────────────────

class TestListaSoAdminEGerente:
    def test_vendedor_nao_edita_nem_exclui_lista_de_vendas(self, client, salesperson_headers, sdr_headers, test_board, test_lists):
        url = f"/api/v1/boards/{test_board.id}/lists/{test_lists[0].id}"
        for h in (salesperson_headers, sdr_headers):
            assert client.put(url, json={"name": "X"}, headers=h).status_code == 403
            assert client.delete(url, headers=h).status_code == 403

    def test_gerente_edita_lista_de_vendas(self, client, manager_headers, test_board, test_lists):
        r = client.put(f"/api/v1/boards/{test_board.id}/lists/{test_lists[0].id}", json={"name": "Novo nome"}, headers=manager_headers)
        assert r.status_code == 200

    def test_usuario_de_servico_nao_edita_nem_exclui_lista_de_servico(self, client, db, test_roles):
        from app.core.security import create_access_token, hash_password
        from app.models.user import User
        from app.models.role import Role
        papel = Role(name="service", display_name="Serviço", description="Serviço", permissions=[])
        db.add(papel); db.commit()
        u = User(email="servico@test.com", name="Serviço", password_hash=hash_password("x12345678"),
                 role_id=papel.id, is_active=True, is_deleted=False)
        db.add(u); db.commit()
        h = {"Authorization": f"Bearer {create_access_token({'sub': str(u.id)})}"}
        c = TestBolinhaServico()._cenario(db)
        url = f"/api/v1/service-boards/{c.b.id}/lists/{c.entrada.id}"
        assert client.put(url, json={"name": "X"}, headers=h).status_code == 403
        assert client.delete(url, headers=h).status_code == 403
        # mas pode limpar os próprios concluídos
        assert client.delete(f"{url}/checks", headers=h).status_code == 200
