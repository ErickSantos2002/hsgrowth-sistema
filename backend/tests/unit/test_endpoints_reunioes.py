"""
A página de Reuniões: todas as reuniões, com ou sem avaliação.

Mostrar só as avaliadas esconderia justamente o que interessa ao gestor — as
reuniões que ninguém gravou nem avaliou.

Visibilidade (RN-037): admin e gerente veem tudo; os demais veem os negócios
em que são vendedor ou SDR.
"""
from datetime import datetime, timedelta

from fastapi.testclient import TestClient

from app.models.card_task import CardTask
from app.models.meeting_evaluation import MeetingEvaluation, MeetingEvaluationItem


def criar_reuniao(db, card, responsavel, titulo, dias_atras=0, avaliada=False, score=70.0):
    task = CardTask(
        card_id=card.id,
        title=titulo,
        task_type="meeting",
        assigned_to_id=responsavel.id,
        due_date=datetime.utcnow() - timedelta(days=dias_atras),
        meeting_ended_at=datetime.utcnow() - timedelta(days=dias_atras),
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    if avaliada:
        avaliacao = MeetingEvaluation(
            card_task_id=task.id,
            versao_criterios="2026-09",
            score=score,
            veredito="Call frágil — valor percebido parcial",
            cobertura=0.9,
            medias_por_bloco={"Abertura": 80, "Fechamento": 40},
        )
        avaliacao.itens.append(MeetingEvaluationItem(
            criterio_id="F6", bloco="Fechamento", peso=5, nota=1,
        ))
        db.add(avaliacao)
        db.commit()

    return task


class TestLista:

    def test_traz_reuniao_avaliada_e_nao_avaliada(
        self, client: TestClient, manager_headers, db, test_card, test_salesperson_user
    ):
        criar_reuniao(db, test_card, test_salesperson_user, "Sem avaliação")
        criar_reuniao(db, test_card, test_salesperson_user, "Avaliada", avaliada=True)

        r = client.get("/api/v1/reunioes", headers=manager_headers)

        assert r.status_code == 200
        corpo = r.json()
        assert corpo["total"] == 2
        assert {i["titulo"] for i in corpo["items"]} == {"Sem avaliação", "Avaliada"}

    def test_cada_item_traz_o_negocio_e_o_vendedor(
        self, client: TestClient, manager_headers, db, test_card, test_salesperson_user
    ):
        criar_reuniao(db, test_card, test_salesperson_user, "Com cliente", avaliada=True)

        item = client.get("/api/v1/reunioes", headers=manager_headers).json()["items"][0]

        assert item["card_id"] == test_card.id
        assert item["cliente"] == test_card.title
        assert item["vendedor"] == test_salesperson_user.name
        assert item["score"] == 70.0
        assert item["selo"] == "avaliada"

    def test_filtra_por_periodo(
        self, client: TestClient, manager_headers, db, test_card, test_salesperson_user
    ):
        criar_reuniao(db, test_card, test_salesperson_user, "De hoje")
        criar_reuniao(db, test_card, test_salesperson_user, "De 60 dias", dias_atras=60)

        desde = (datetime.utcnow() - timedelta(days=7)).date().isoformat()
        r = client.get(f"/api/v1/reunioes?date_from={desde}", headers=manager_headers)

        assert r.json()["total"] == 1

    def test_filtra_por_veredito(
        self, client: TestClient, manager_headers, db, test_card, test_salesperson_user
    ):
        criar_reuniao(db, test_card, test_salesperson_user, "Frágil", avaliada=True)
        criar_reuniao(db, test_card, test_salesperson_user, "Sem avaliação")

        r = client.get(
            "/api/v1/reunioes?veredito=Call frágil — valor percebido parcial",
            headers=manager_headers,
        )

        assert r.json()["total"] == 1

    def test_filtra_por_estado_nao_avaliadas(
        self, client: TestClient, manager_headers, db, test_card, test_salesperson_user
    ):
        criar_reuniao(db, test_card, test_salesperson_user, "Avaliada", avaliada=True)
        criar_reuniao(db, test_card, test_salesperson_user, "Crua")

        r = client.get("/api/v1/reunioes?estado=nao_avaliadas", headers=manager_headers)

        assert r.json()["total"] == 1
        assert r.json()["items"][0]["titulo"] == "Crua"

    def test_cancelada_fica_de_fora_da_conta(
        self, client: TestClient, manager_headers, db, test_card, test_salesperson_user
    ):
        """Reunião que não aconteceu não entra na conta de avaliação."""
        task = criar_reuniao(db, test_card, test_salesperson_user, "Cancelada")
        task.is_cancelled = True
        db.commit()

        r = client.get("/api/v1/reunioes", headers=manager_headers)

        assert r.json()["total"] == 0


class TestIndicadores:

    def test_score_medio_so_das_comparaveis(
        self, client: TestClient, manager_headers, db, test_card, test_salesperson_user
    ):
        criar_reuniao(db, test_card, test_salesperson_user, "A", avaliada=True, score=80.0)
        criar_reuniao(db, test_card, test_salesperson_user, "B", avaliada=True, score=60.0)
        criar_reuniao(db, test_card, test_salesperson_user, "C")

        corpo = client.get("/api/v1/reunioes", headers=manager_headers).json()

        assert corpo["score_medio"] == 70.0

    def test_percentual_avaliadas(
        self, client: TestClient, manager_headers, db, test_card, test_salesperson_user
    ):
        criar_reuniao(db, test_card, test_salesperson_user, "A", avaliada=True)
        for titulo in ("B", "C", "D"):
            criar_reuniao(db, test_card, test_salesperson_user, titulo)

        corpo = client.get("/api/v1/reunioes", headers=manager_headers).json()

        assert corpo["percentual_avaliadas"] == 25.0

    def test_distribuicao_por_veredito(
        self, client: TestClient, manager_headers, db, test_card, test_salesperson_user
    ):
        criar_reuniao(db, test_card, test_salesperson_user, "A", avaliada=True)
        criar_reuniao(db, test_card, test_salesperson_user, "B", avaliada=True)

        corpo = client.get("/api/v1/reunioes", headers=manager_headers).json()

        assert corpo["por_veredito"]["Call frágil — valor percebido parcial"] == 2

    def test_media_por_bloco(
        self, client: TestClient, manager_headers, db, test_card, test_salesperson_user
    ):
        criar_reuniao(db, test_card, test_salesperson_user, "A", avaliada=True)

        corpo = client.get("/api/v1/reunioes", headers=manager_headers).json()

        assert corpo["media_por_bloco"]["Abertura"] == 80
        assert corpo["media_por_bloco"]["Fechamento"] == 40

    def test_percentual_com_proximo_passo(
        self, client: TestClient, manager_headers, db, test_card, test_salesperson_user
    ):
        """F6 é o critério do próximo passo — o ponto mais fraco do time hoje."""
        criar_reuniao(db, test_card, test_salesperson_user, "A", avaliada=True)

        corpo = client.get("/api/v1/reunioes", headers=manager_headers).json()

        assert corpo["percentual_proximo_passo"] == 100.0

    def test_quadro_por_vendedor_para_o_gestor(
        self, client: TestClient, manager_headers, db, test_card, test_salesperson_user
    ):
        criar_reuniao(db, test_card, test_salesperson_user, "A", avaliada=True, score=60.0)
        criar_reuniao(db, test_card, test_salesperson_user, "B", avaliada=True, score=80.0)

        corpo = client.get("/api/v1/reunioes", headers=manager_headers).json()

        linha = corpo["por_vendedor"][0]
        assert linha["vendedor"] == test_salesperson_user.name
        assert linha["reunioes"] == 2
        assert linha["score_medio"] == 70.0


class TestVisibilidade:

    def test_vendedor_ve_as_dos_negocios_dele(
        self, client: TestClient, salesperson_headers, db, test_card, test_salesperson_user
    ):
        criar_reuniao(db, test_card, test_salesperson_user, "Minha")

        r = client.get("/api/v1/reunioes", headers=salesperson_headers)

        assert r.json()["total"] == 1

    def test_vendedor_nao_ve_negocio_alheio(
        self, client: TestClient, salesperson_headers, db, test_lists, test_manager_user
    ):
        from app.models.card import Card

        alheio = Card(
            title="Negócio de outro",
            list_id=test_lists[0].id,
            assigned_to_id=test_manager_user.id,
            position=1,
        )
        db.add(alheio)
        db.commit()
        criar_reuniao(db, alheio, test_manager_user, "Reunião alheia")

        r = client.get("/api/v1/reunioes", headers=salesperson_headers)

        assert r.json()["total"] == 0

    def test_sdr_do_card_ve_a_reuniao(
        self, client: TestClient, sdr_headers, db, test_card, test_sdr_user, test_salesperson_user
    ):
        """O SDR agenda para o vendedor e acompanha — a reunião é dos dois."""
        test_card.sdr_id = test_sdr_user.id
        db.commit()
        criar_reuniao(db, test_card, test_salesperson_user, "Agendada pelo SDR")

        r = client.get("/api/v1/reunioes", headers=sdr_headers)

        assert r.json()["total"] == 1

    def test_gestor_recebe_a_lista_de_vendedores_do_periodo(
        self, client: TestClient, manager_headers, db, test_card, test_salesperson_user
    ):
        """É o que enche o seletor da página."""
        criar_reuniao(db, test_card, test_salesperson_user, "A")

        corpo = client.get("/api/v1/reunioes", headers=manager_headers).json()

        assert corpo["vendedores"] == [
            {"id": test_salesperson_user.id, "nome": test_salesperson_user.name}
        ]

    def test_filtrar_por_vendedor_nao_encolhe_o_seletor(
        self, client: TestClient, manager_headers, db, test_card, test_salesperson_user
    ):
        """Escolher uma pessoa não pode apagar as outras da lista de escolha."""
        criar_reuniao(db, test_card, test_salesperson_user, "A")

        corpo = client.get(
            f"/api/v1/reunioes?vendedor_id={test_salesperson_user.id}", headers=manager_headers
        ).json()

        assert len(corpo["vendedores"]) == 1
        assert corpo["total"] == 1

    def test_vendedor_nao_recebe_quadro_por_vendedor(
        self, client: TestClient, salesperson_headers, db, test_card, test_salesperson_user
    ):
        criar_reuniao(db, test_card, test_salesperson_user, "Minha", avaliada=True)

        corpo = client.get("/api/v1/reunioes", headers=salesperson_headers).json()

        assert corpo["por_vendedor"] == []
        assert corpo["vendedores"] == []

    def test_exige_autenticacao(self, client: TestClient):
        assert client.get("/api/v1/reunioes").status_code in (401, 403)
