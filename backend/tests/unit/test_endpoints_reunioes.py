"""
A página de Reuniões: todas as reuniões, com ou sem avaliação.

Mostrar só as avaliadas esconderia justamente o que interessa ao gestor — as
reuniões que ninguém gravou nem avaliou.

Quem responde pela reunião é o responsável pela tarefa; sem responsável, o
vendedor do negócio. É a mesma regra do Dashboard e a mesma que decide quem
pode gravar.

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
            f"/api/v1/reunioes?vendedor={test_salesperson_user.id}", headers=manager_headers
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


class TestSDR:
    """
    O SDR agenda a reunião e às vezes acompanha.

    Ele vê as reuniões dos negócios em que é o SDR, e o gestor pode filtrar
    por ele — é a leitura do que a pré-venda colocou de pé, diferente da do
    vendedor que conduziu.
    """

    def test_item_traz_o_sdr_do_negocio(
        self, client: TestClient, manager_headers, db, test_card,
        test_salesperson_user, test_sdr_user
    ):
        test_card.sdr_id = test_sdr_user.id
        db.commit()
        criar_reuniao(db, test_card, test_salesperson_user, "Com SDR")

        item = client.get("/api/v1/reunioes", headers=manager_headers).json()["items"][0]

        assert item["sdr"] == test_sdr_user.name
        assert item["vendedor"] == test_salesperson_user.name

    def test_gestor_recebe_a_lista_de_sdrs(
        self, client: TestClient, manager_headers, db, test_card,
        test_salesperson_user, test_sdr_user
    ):
        test_card.sdr_id = test_sdr_user.id
        db.commit()
        criar_reuniao(db, test_card, test_salesperson_user, "Com SDR")

        corpo = client.get("/api/v1/reunioes", headers=manager_headers).json()

        assert corpo["sdrs"] == [{"id": test_sdr_user.id, "nome": test_sdr_user.name}]

    def test_filtra_por_sdr(
        self, client: TestClient, manager_headers, db, test_lists, test_card,
        test_salesperson_user, test_sdr_user
    ):
        from app.models.card import Card

        test_card.sdr_id = test_sdr_user.id
        db.commit()
        criar_reuniao(db, test_card, test_salesperson_user, "Com SDR")

        sem_sdr = Card(
            title="Negócio sem SDR",
            list_id=test_lists[0].id,
            assigned_to_id=test_salesperson_user.id,
            position=2,
        )
        db.add(sem_sdr)
        db.commit()
        criar_reuniao(db, sem_sdr, test_salesperson_user, "Sem SDR")

        r = client.get(
            f"/api/v1/reunioes?sdr={test_sdr_user.id}", headers=manager_headers
        )

        assert r.json()["total"] == 1
        assert r.json()["items"][0]["titulo"] == "Com SDR"

    def test_negocio_sem_sdr_nao_entra_na_lista_de_sdrs(
        self, client: TestClient, manager_headers, db, test_card, test_salesperson_user
    ):
        criar_reuniao(db, test_card, test_salesperson_user, "Sem SDR")

        corpo = client.get("/api/v1/reunioes", headers=manager_headers).json()

        assert corpo["sdrs"] == []


class TestQuemRespondePelaReuniao:
    """
    A reunião é de quem a conduz, não de quem é dono do negócio.

    Em 18/09 o Miguel sumiu da página: ele conduziu uma reunião num negócio da
    Sandra, e a tela mostrava a reunião como dela — enquanto o Dashboard
    contava para ele. Mesma reunião, duas respostas diferentes.
    """

    def test_responsavel_pela_tarefa_ganha_a_reuniao(
        self, client: TestClient, manager_headers, db, test_card,
        test_salesperson_user, test_manager_user
    ):
        # negócio da salesperson, reunião conduzida pelo manager
        criar_reuniao(db, test_card, test_manager_user, "Conduzida por outro")

        item = client.get("/api/v1/reunioes", headers=manager_headers).json()["items"][0]

        assert item["vendedor"] == test_manager_user.name

    def test_sem_responsavel_vale_o_vendedor_do_negocio(
        self, client: TestClient, manager_headers, db, test_card, test_salesperson_user
    ):
        task = criar_reuniao(db, test_card, test_salesperson_user, "Sem responsável")
        task.assigned_to_id = None
        db.commit()

        item = client.get("/api/v1/reunioes", headers=manager_headers).json()["items"][0]

        assert item["vendedor"] == test_salesperson_user.name

    def test_quadro_agrupa_por_quem_conduziu(
        self, client: TestClient, manager_headers, db, test_card,
        test_salesperson_user, test_manager_user
    ):
        criar_reuniao(db, test_card, test_manager_user, "A")
        criar_reuniao(db, test_card, test_manager_user, "B")

        corpo = client.get("/api/v1/reunioes", headers=manager_headers).json()

        assert corpo["por_vendedor"][0]["vendedor"] == test_manager_user.name
        assert corpo["por_vendedor"][0]["reunioes"] == 2

    def test_filtro_de_vendedor_segue_quem_conduziu(
        self, client: TestClient, manager_headers, db, test_card,
        test_salesperson_user, test_manager_user
    ):
        criar_reuniao(db, test_card, test_manager_user, "Do manager")
        criar_reuniao(db, test_card, test_salesperson_user, "Do vendedor")

        r = client.get(
            f"/api/v1/reunioes?vendedor={test_manager_user.id}", headers=manager_headers
        )

        assert r.json()["total"] == 1
        assert r.json()["items"][0]["titulo"] == "Do manager"


class TestDataDaReuniao:

    def test_periodo_usa_a_data_em_que_aconteceu(
        self, client: TestClient, manager_headers, db, test_card, test_salesperson_user
    ):
        """
        Agendada para daqui a duas semanas, mas realizada hoje: entra no
        período de hoje, que é a data que a lista mostra.
        """
        task = criar_reuniao(db, test_card, test_salesperson_user, "Antecipada")
        task.due_date = datetime.utcnow() + timedelta(days=14)
        task.meeting_ended_at = datetime.utcnow()
        db.commit()

        hoje = datetime.utcnow().date().isoformat()
        r = client.get(
            f"/api/v1/reunioes?date_from={hoje}&date_to={hoje}", headers=manager_headers
        )

        assert r.json()["total"] == 1


class TestColunasDaLista:

    def test_reuniao_do_crm_e_do_teams_aparecem_separadas(
        self, client: TestClient, manager_headers, db, test_card, test_salesperson_user
    ):
        do_crm = criar_reuniao(db, test_card, test_salesperson_user, "No CRM")
        do_crm.meeting_provider = "daily"
        do_teams = criar_reuniao(db, test_card, test_salesperson_user, "No Teams")
        do_teams.teams_join_url = "https://teams.microsoft.com/l/meetup-join/x"
        db.commit()

        items = client.get("/api/v1/reunioes", headers=manager_headers).json()["items"]
        por_titulo = {i["titulo"]: i["tipo"] for i in items}

        assert por_titulo["No CRM"] == "CRM"
        assert por_titulo["No Teams"] == "Teams"

    def test_reuniao_sem_sala_nao_inventa_tipo(
        self, client: TestClient, manager_headers, db, test_card, test_salesperson_user
    ):
        criar_reuniao(db, test_card, test_salesperson_user, "Presencial")

        item = client.get("/api/v1/reunioes", headers=manager_headers).json()["items"][0]

        assert item["tipo"] == "—"

    def test_diz_se_foi_avaliada(
        self, client: TestClient, manager_headers, db, test_card, test_salesperson_user
    ):
        criar_reuniao(db, test_card, test_salesperson_user, "Avaliada", avaliada=True)
        criar_reuniao(db, test_card, test_salesperson_user, "Crua", dias_atras=1)

        items = client.get("/api/v1/reunioes", headers=manager_headers).json()["items"]
        por_titulo = {i["titulo"]: i["avaliada"] for i in items}

        assert por_titulo["Avaliada"] is True
        assert por_titulo["Crua"] is False


class TestQuadroPorSDR:

    def test_agrupa_por_sdr_do_negocio(
        self, client: TestClient, manager_headers, db, test_card,
        test_salesperson_user, test_sdr_user
    ):
        test_card.sdr_id = test_sdr_user.id
        db.commit()
        criar_reuniao(db, test_card, test_salesperson_user, "A")
        criar_reuniao(db, test_card, test_salesperson_user, "B")

        corpo = client.get("/api/v1/reunioes", headers=manager_headers).json()

        assert corpo["por_sdr"][0]["sdr"] == test_sdr_user.name
        assert corpo["por_sdr"][0]["reunioes"] == 2

    def test_negocio_sem_sdr_aparece_agrupado_a_parte(
        self, client: TestClient, manager_headers, db, test_card, test_salesperson_user
    ):
        """Sem isso, o gestor não veria quantas reuniões saíram sem pré-venda."""
        criar_reuniao(db, test_card, test_salesperson_user, "Sem SDR")

        corpo = client.get("/api/v1/reunioes", headers=manager_headers).json()

        assert corpo["por_sdr"][0]["sdr"] == "(sem sdr)"


class TestFiltrosSemVinculo:

    def test_filtrar_reunioes_sem_sdr(
        self, client: TestClient, manager_headers, db, test_lists, test_card,
        test_salesperson_user, test_sdr_user
    ):
        from app.models.card import Card

        test_card.sdr_id = test_sdr_user.id
        db.commit()
        criar_reuniao(db, test_card, test_salesperson_user, "Com SDR")

        sem_sdr = Card(
            title="Negócio sem SDR",
            list_id=test_lists[0].id,
            assigned_to_id=test_salesperson_user.id,
            position=3,
        )
        db.add(sem_sdr)
        db.commit()
        criar_reuniao(db, sem_sdr, test_salesperson_user, "Sem SDR")

        r = client.get("/api/v1/reunioes?sdr=sem", headers=manager_headers)

        assert r.json()["total"] == 1
        assert r.json()["items"][0]["titulo"] == "Sem SDR"

    def test_filtrar_reunioes_sem_vendedor(
        self, client: TestClient, manager_headers, db, test_lists, test_salesperson_user
    ):
        from app.models.card import Card

        orfao = Card(
            title="Negócio sem dono",
            list_id=test_lists[0].id,
            assigned_to_id=None,
            position=4,
        )
        db.add(orfao)
        db.commit()
        task = criar_reuniao(db, orfao, test_salesperson_user, "Sem vendedor")
        task.assigned_to_id = None
        db.commit()

        r = client.get("/api/v1/reunioes?vendedor=sem", headers=manager_headers)

        assert r.json()["total"] == 1
        assert r.json()["items"][0]["vendedor"] is None


class TestTipoDaReuniao:
    """
    O recorte que a consultora vai querer: abrir a lista e ver só as
    apresentações.
    """

    def test_item_traz_o_tipo_e_o_rotulo(
        self, client: TestClient, manager_headers, db, test_card, test_salesperson_user
    ):
        task = criar_reuniao(db, test_card, test_salesperson_user, "Com tipo")
        task.meeting_kind = "apresentacao_phoebus"
        db.commit()

        item = client.get("/api/v1/reunioes", headers=manager_headers).json()["items"][0]

        assert item["tipo_reuniao"] == "apresentacao_phoebus"
        assert item["tipo_reuniao_rotulo"] == "Apresentação Phoebus"

    def test_reuniao_antiga_sem_tipo(
        self, client: TestClient, manager_headers, db, test_card, test_salesperson_user
    ):
        criar_reuniao(db, test_card, test_salesperson_user, "Sem tipo")

        item = client.get("/api/v1/reunioes", headers=manager_headers).json()["items"][0]

        assert item["tipo_reuniao"] is None
        assert item["tipo_reuniao_rotulo"] is None

    def test_filtra_por_tipo(
        self, client: TestClient, manager_headers, db, test_card, test_salesperson_user
    ):
        apresentacao = criar_reuniao(db, test_card, test_salesperson_user, "Apresentação")
        apresentacao.meeting_kind = "apresentacao_phoebus"
        duvidas = criar_reuniao(db, test_card, test_salesperson_user, "Dúvidas", dias_atras=1)
        duvidas.meeting_kind = "duvidas"
        db.commit()

        r = client.get(
            "/api/v1/reunioes?tipo_reuniao=apresentacao_phoebus", headers=manager_headers
        )

        assert r.json()["total"] == 1
        assert r.json()["items"][0]["titulo"] == "Apresentação"

    def test_filtrar_por_sem_tipo(
        self, client: TestClient, manager_headers, db, test_card, test_salesperson_user
    ):
        """As reuniões de antes da mudança — o gestor precisa conseguir achá-las."""
        com_tipo = criar_reuniao(db, test_card, test_salesperson_user, "Nova")
        com_tipo.meeting_kind = "duvidas"
        criar_reuniao(db, test_card, test_salesperson_user, "Antiga", dias_atras=1)
        db.commit()

        r = client.get("/api/v1/reunioes?tipo_reuniao=sem", headers=manager_headers)

        assert r.json()["total"] == 1
        assert r.json()["items"][0]["titulo"] == "Antiga"

    def test_lista_de_tipos_para_o_seletor(
        self, client: TestClient, manager_headers, db, test_card, test_salesperson_user
    ):
        criar_reuniao(db, test_card, test_salesperson_user, "A")

        corpo = client.get("/api/v1/reunioes", headers=manager_headers).json()

        ids = [t["id"] for t in corpo["tipos_de_reuniao"]]
        assert ids == [
            "apresentacao_phoebus", "duvidas_phoebus", "apresentacao", "duvidas", "outra"
        ]


class TestCanalDeAquisicao:
    """
    De onde veio o negócio da reunião.

    É a leitura que liga a reunião ao marketing: quais canais trazem conversa
    que anda, e não só quantos leads entraram.
    """

    def test_item_traz_o_canal_do_negocio(
        self, client: TestClient, manager_headers, db, test_card, test_salesperson_user
    ):
        test_card.acquisition_channel = "Inbound"
        db.commit()
        criar_reuniao(db, test_card, test_salesperson_user, "De inbound")

        item = client.get("/api/v1/reunioes", headers=manager_headers).json()["items"][0]

        assert item["canal"] == "Inbound"

    def test_negocio_sem_canal(
        self, client: TestClient, manager_headers, db, test_card, test_salesperson_user
    ):
        test_card.acquisition_channel = None
        db.commit()
        criar_reuniao(db, test_card, test_salesperson_user, "Sem canal")

        item = client.get("/api/v1/reunioes", headers=manager_headers).json()["items"][0]

        assert item["canal"] is None

    def test_filtra_por_canal(
        self, client: TestClient, manager_headers, db, test_lists, test_card,
        test_salesperson_user
    ):
        from app.models.card import Card

        test_card.acquisition_channel = "Inbound"
        db.commit()
        criar_reuniao(db, test_card, test_salesperson_user, "De inbound")

        outro = Card(
            title="Negócio de outbound",
            list_id=test_lists[0].id,
            assigned_to_id=test_salesperson_user.id,
            position=7,
            acquisition_channel="Outbound",
        )
        db.add(outro)
        db.commit()
        criar_reuniao(db, outro, test_salesperson_user, "De outbound", dias_atras=1)

        r = client.get("/api/v1/reunioes?canal=Inbound", headers=manager_headers)

        assert r.json()["total"] == 1
        assert r.json()["items"][0]["titulo"] == "De inbound"

    def test_filtrar_os_sem_canal(
        self, client: TestClient, manager_headers, db, test_lists, test_card,
        test_salesperson_user
    ):
        from app.models.card import Card

        test_card.acquisition_channel = "Inbound"
        db.commit()
        criar_reuniao(db, test_card, test_salesperson_user, "Com canal")

        sem_canal = Card(
            title="Negócio sem canal",
            list_id=test_lists[0].id,
            assigned_to_id=test_salesperson_user.id,
            position=8,
        )
        db.add(sem_canal)
        db.commit()
        criar_reuniao(db, sem_canal, test_salesperson_user, "Sem canal", dias_atras=1)

        r = client.get("/api/v1/reunioes?canal=sem", headers=manager_headers)

        assert r.json()["total"] == 1
        assert r.json()["items"][0]["titulo"] == "Sem canal"

    def test_lista_de_canais_para_o_seletor(
        self, client: TestClient, manager_headers, db, test_lists, test_card,
        test_salesperson_user
    ):
        """Só os canais que aparecem no período — a lista acompanha os dados."""
        from app.models.card import Card

        test_card.acquisition_channel = "Outbound"
        db.commit()
        criar_reuniao(db, test_card, test_salesperson_user, "A")

        outro = Card(
            title="Outro negócio",
            list_id=test_lists[0].id,
            assigned_to_id=test_salesperson_user.id,
            position=9,
            acquisition_channel="Indicação",
        )
        db.add(outro)
        db.commit()
        criar_reuniao(db, outro, test_salesperson_user, "B", dias_atras=1)

        corpo = client.get("/api/v1/reunioes", headers=manager_headers).json()

        assert corpo["canais"] == ["Indicação", "Outbound"]

    def test_canal_repetido_aparece_uma_vez(
        self, client: TestClient, manager_headers, db, test_card, test_salesperson_user
    ):
        test_card.acquisition_channel = "Inbound"
        db.commit()
        criar_reuniao(db, test_card, test_salesperson_user, "A")
        criar_reuniao(db, test_card, test_salesperson_user, "B", dias_atras=1)

        corpo = client.get("/api/v1/reunioes", headers=manager_headers).json()

        assert corpo["canais"] == ["Inbound"]

    def test_vendedor_nao_recebe_a_lista_de_canais(
        self, client: TestClient, salesperson_headers, db, test_card, test_salesperson_user
    ):
        """Como os outros seletores, o filtro de canal é do gestor."""
        test_card.acquisition_channel = "Inbound"
        db.commit()
        criar_reuniao(db, test_card, test_salesperson_user, "A")

        corpo = client.get("/api/v1/reunioes", headers=salesperson_headers).json()

        assert corpo["canais"] == []
