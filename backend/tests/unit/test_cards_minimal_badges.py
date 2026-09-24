"""
O que o board precisa receber na listagem enxuta.

O kanban carrega os cards com `minimal=true` para reduzir o payload, e a
resposta é montada campo a campo — um campo esquecido aqui não quebra nada no
servidor, some silenciosamente na tela. Foi o que aconteceu com o badge
"Cross-sell" em 24/09: o card e o filtro liam `deal_type`, que a listagem
enxuta não mandava, e nenhum card aparecia no filtro.
"""
from fastapi.testclient import TestClient


def _listar(client: TestClient, headers, board_id: int) -> dict:
    r = client.get(
        f"/api/v1/cards?minimal=true&board_id={board_id}&all=true", headers=headers
    )
    assert r.status_code == 200, r.text
    return r.json()


class TestListagemEnxutaDoBoard:

    def test_manda_o_tipo_de_negocio(
        self, client: TestClient, manager_headers, db, test_card, test_board
    ):
        """É o que acende o badge e alimenta o filtro "Cross-sell"."""
        test_card.deal_type = "Cross Sell"
        db.commit()

        corpo = _listar(client, manager_headers, test_board.id)

        card = next(c for c in corpo["cards"] if c["id"] == test_card.id)
        assert card["deal_type"] == "Cross Sell"

    def test_negocio_sem_tipo_vem_vazio(
        self, client: TestClient, manager_headers, db, test_card, test_board
    ):
        test_card.deal_type = None
        db.commit()

        corpo = _listar(client, manager_headers, test_board.id)

        card = next(c for c in corpo["cards"] if c["id"] == test_card.id)
        assert card["deal_type"] is None

    def test_campos_que_o_card_do_board_mostra(
        self, client: TestClient, manager_headers, test_card, test_board
    ):
        """
        Os campos que o KanbanCard lê direto da listagem. Se um sair daqui, o
        badge correspondente some da tela sem erro nenhum.
        """
        corpo = _listar(client, manager_headers, test_board.id)

        card = next(c for c in corpo["cards"] if c["id"] == test_card.id)
        for campo in (
            "deal_type",
            "is_stuck_3d",
            "is_stuck_7d",
            "automacao01",
            "loss_reason",
            "pending_tasks_status",
            "acquisition_channel",
        ):
            assert campo in card, f"'{campo}' sumiu da listagem enxuta do board"
