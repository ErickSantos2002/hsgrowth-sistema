"""
Filtro `card_aberto` e campo `card_is_won` nas rotas de tarefas.

Fechar o card não conclui as tarefas dele (o time deixa de lembrete), então
quem só quer o que ainda dá pra trabalhar — o Guardi, no HS.OS — pede
`card_aberto=true`. Sem o parâmetro, as rotas respondem como sempre.
"""
from datetime import datetime, timedelta

import pytest
from sqlalchemy.orm import Session

from app.models.card import Card
from app.models.card_task import CardTask


@pytest.fixture
def tarefas_por_estado(db: Session, test_lists, test_salesperson_user) -> dict:
    """Um card aberto, um ganho e um perdido, cada um com uma tarefa atrasada."""
    ontem = datetime.utcnow() - timedelta(days=1)
    tarefas = {}
    for nome, is_won in (("aberto", 0), ("ganho", 1), ("perdido", -1)):
        card = Card(
            title=f"Card {nome}",
            list_id=test_lists[0].id,
            assigned_to_id=test_salesperson_user.id,
            position=0,
            is_won=is_won,
        )
        db.add(card)
        db.flush()
        task = CardTask(
            card_id=card.id,
            title=f"Tarefa {nome}",
            task_type="task",
            assigned_to_id=test_salesperson_user.id,
            due_date=ontem,
        )
        db.add(task)
        db.flush()
        tarefas[nome] = task.id
    db.commit()
    return tarefas


class TestListaComCardAberto:

    def test_card_aberto_true_so_traz_card_aberto(self, client, admin_headers, tarefas_por_estado):
        r = client.get("/api/v1/card-tasks?card_aberto=true", headers=admin_headers)
        assert r.status_code == 200
        corpo = r.json()
        ids = {t["id"] for t in corpo["tasks"]}
        assert ids == {tarefas_por_estado["aberto"]}
        assert corpo["total"] == 1
        assert corpo["total_pages"] == 1

    def test_card_aberto_false_so_traz_card_fechado(self, client, admin_headers, tarefas_por_estado):
        r = client.get("/api/v1/card-tasks?card_aberto=false", headers=admin_headers)
        corpo = r.json()
        ids = {t["id"] for t in corpo["tasks"]}
        assert ids == {tarefas_por_estado["ganho"], tarefas_por_estado["perdido"]}
        assert corpo["total"] == 2

    def test_paginacao_usa_contagem_filtrada(self, client, admin_headers, tarefas_por_estado):
        r = client.get("/api/v1/card-tasks?card_aberto=false&page_size=1", headers=admin_headers)
        corpo = r.json()
        assert corpo["total"] == 2
        assert corpo["total_pages"] == 2
        assert len(corpo["tasks"]) == 1

    def test_sem_parametro_traz_todas(self, client, admin_headers, tarefas_por_estado):
        r = client.get("/api/v1/card-tasks", headers=admin_headers)
        corpo = r.json()
        assert {t["id"] for t in corpo["tasks"]} == set(tarefas_por_estado.values())
        assert corpo["total"] == 3

    def test_card_is_won_vem_preenchido(self, client, admin_headers, tarefas_por_estado):
        r = client.get("/api/v1/card-tasks", headers=admin_headers)
        estado = {t["id"]: t["card_is_won"] for t in r.json()["tasks"]}
        assert estado == {
            tarefas_por_estado["aberto"]: 0,
            tarefas_por_estado["ganho"]: 1,
            tarefas_por_estado["perdido"]: -1,
        }


class TestAtrasadasComCardAberto:

    def test_card_aberto_true_so_traz_card_aberto(self, client, admin_headers, tarefas_por_estado):
        r = client.get("/api/v1/card-tasks/overdue?card_aberto=true", headers=admin_headers)
        assert r.status_code == 200
        assert [t["id"] for t in r.json()] == [tarefas_por_estado["aberto"]]

    def test_card_aberto_false_so_traz_card_fechado(self, client, admin_headers, tarefas_por_estado):
        r = client.get("/api/v1/card-tasks/overdue?card_aberto=false", headers=admin_headers)
        ids = {t["id"] for t in r.json()}
        assert ids == {tarefas_por_estado["ganho"], tarefas_por_estado["perdido"]}

    def test_sem_parametro_traz_todas(self, client, admin_headers, tarefas_por_estado):
        r = client.get("/api/v1/card-tasks/overdue", headers=admin_headers)
        assert {t["id"] for t in r.json()} == set(tarefas_por_estado.values())

    def test_card_is_won_vem_preenchido(self, client, admin_headers, tarefas_por_estado):
        r = client.get("/api/v1/card-tasks/overdue", headers=admin_headers)
        estado = {t["id"]: t["card_is_won"] for t in r.json()}
        assert estado == {
            tarefas_por_estado["aberto"]: 0,
            tarefas_por_estado["ganho"]: 1,
            tarefas_por_estado["perdido"]: -1,
        }
