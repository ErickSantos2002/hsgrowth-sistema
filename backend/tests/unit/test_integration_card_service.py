"""Testes do create-or-return da integração."""
from unittest.mock import patch

import pytest
from fastapi import HTTPException

from app.models.client import Client
from app.models.external_client_ref import ExternalClientRef
from app.models.person import Person
from app.models.role import Role
from app.models.service_board import ServiceBoard
from app.models.service_card import ServiceCard
from app.models.service_card_activity import ServiceCardActivity
from app.models.service_list import ServiceList
from app.models.user import User
from app.core.security import hash_password
from app.schemas.integration import IntegrationServiceCardCreate
from app.services.integration_card_service import IntegrationCardService


@pytest.fixture
def usuario(db):
    role = Role(name="service", display_name="Serviço", permissions=[])
    db.add(role)
    db.commit()
    user = User(
        role_id=role.id, email="gestorhs.integracao@healthsafetytech.com", name="GestorHS (Integração)",
        password_hash=hash_password("x"), is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def board_com_entrada(db):
    board = ServiceBoard(name="Serviços")
    db.add(board)
    db.commit()
    db.add(ServiceList(board_id=board.id, name="Triagem", position=0))
    db.add(ServiceList(
        board_id=board.id, name="Dados Preenchidos", position=1, is_entry_stage=True
    ))
    db.commit()
    db.refresh(board)
    return board


@pytest.fixture
def board_sem_entrada(db):
    board = ServiceBoard(name="Cobrança")
    db.add(board)
    db.commit()
    db.add(ServiceList(board_id=board.id, name="Oportunidade", position=0))
    db.commit()
    db.refresh(board)
    return board


def payload(board_id, **overrides):
    base = {
        "source": "gestorhs.os",
        "external_id": "1234",
        "board_id": board_id,
        "title": "OS #1234 · Transportadora X",
        "client": {
            "external_id": "789", "name": "Transportadora X LTDA",
            "document": "12345678000199", "email": "contato@x.com",
        },
    }
    base.update(overrides)
    return IntegrationServiceCardCreate(**base)


def test_cria_o_card_na_etapa_de_entrada(db, usuario, board_com_entrada):
    card, created = IntegrationCardService(db).create_or_return(
        payload(board_com_entrada.id), usuario
    )

    assert created is True
    assert card.external_source == "gestorhs.os"
    assert card.external_id == "1234"
    assert card.list.name == "Dados Preenchidos"


def test_reenvio_devolve_o_mesmo_card_sem_alterar(db, usuario, board_com_entrada):
    svc = IntegrationCardService(db)
    primeiro, _ = svc.create_or_return(payload(board_com_entrada.id), usuario)

    # o vendedor move e renomeia o card
    outra_lista = ServiceList(board_id=board_com_entrada.id, name="Em negociação", position=9)
    db.add(outra_lista)
    db.commit()
    primeiro.list_id = outra_lista.id
    primeiro.title = "Título que o vendedor editou"
    db.commit()

    segundo, created = svc.create_or_return(
        payload(board_com_entrada.id, title="Título original de novo"), usuario
    )

    assert created is False
    assert segundo.id == primeiro.id
    assert segundo.title == "Título que o vendedor editou"
    assert segundo.list_id == outra_lista.id
    assert db.query(ServiceCard).count() == 1


def test_board_sem_etapa_de_entrada_falha_alto(db, usuario, board_sem_entrada):
    with pytest.raises(HTTPException) as exc:
        IntegrationCardService(db).create_or_return(payload(board_sem_entrada.id), usuario)

    assert exc.value.status_code == 404
    assert db.query(ServiceCard).count() == 0


def test_board_inexistente_falha_alto(db, usuario):
    with pytest.raises(HTTPException) as exc:
        IntegrationCardService(db).create_or_return(payload(99999), usuario)

    assert exc.value.status_code == 404


def test_cria_o_cliente_e_o_vinculo_na_primeira_vez(db, usuario, board_com_entrada):
    card, _ = IntegrationCardService(db).create_or_return(
        payload(board_com_entrada.id), usuario
    )

    ref = db.query(ExternalClientRef).filter_by(source="gestorhs", external_id="789").first()
    assert ref is not None
    assert card.client_id == ref.client_id
    cliente = db.query(Client).filter_by(id=ref.client_id).first()
    assert cliente.company_name == "Transportadora X LTDA"
    assert cliente.document == "12345678000199"


def test_reaproveita_o_cliente_ja_vinculado(db, usuario, board_com_entrada):
    svc = IntegrationCardService(db)
    primeiro, _ = svc.create_or_return(payload(board_com_entrada.id), usuario)
    segundo, _ = svc.create_or_return(
        payload(board_com_entrada.id, external_id="5678"), usuario
    )

    assert primeiro.client_id == segundo.client_id
    assert db.query(Client).count() == 1


def test_documento_repetido_de_outro_cliente_nao_derruba_a_criacao(
    db, usuario, board_com_entrada
):
    """O legado do GestorHS tem documentos repetidos; isso não pode travar o card."""
    db.add(Client(name="Já existia", document="12345678000199"))
    db.commit()

    card, created = IntegrationCardService(db).create_or_return(
        payload(board_com_entrada.id), usuario
    )

    assert created is True
    assert card.client_id is not None
    assert db.query(Client).count() == 2


def test_cria_a_pessoa_de_contato_vinculada_ao_cliente(db, usuario, board_com_entrada):
    card, _ = IntegrationCardService(db).create_or_return(
        payload(board_com_entrada.id, contact={
            "name": "João Silva", "email": "joao@x.com", "phone": "11999998888",
        }),
        usuario,
    )

    pessoa = db.query(Person).filter_by(id=card.person_id).first()
    assert pessoa.name == "João Silva"
    assert pessoa.organization_id == card.client_id


def test_aparelhos_vao_para_business_info(db, usuario, board_com_entrada):
    card, _ = IntegrationCardService(db).create_or_return(
        payload(board_com_entrada.id, devices=[
            {"serial_number": "AB123", "model": "Alcotest 6820",
             "alcohol_module": "Sim", "next_recalibration_date": "2026-08-10"},
        ]),
        usuario,
    )

    equipamentos = card.business_info["equipamentos"]
    assert len(equipamentos) == 1
    assert equipamentos[0]["serial_number"] == "AB123"


def test_business_info_do_payload_e_preservado_junto_dos_aparelhos(
    db, usuario, board_com_entrada
):
    card, _ = IntegrationCardService(db).create_or_return(
        payload(
            board_com_entrada.id,
            business_info={"seller_name": "Sandra"},
            devices=[{"serial_number": "AB123"}],
        ),
        usuario,
    )

    assert card.business_info["seller_name"] == "Sandra"
    assert len(card.business_info["equipamentos"]) == 1


def test_o_card_registra_o_evento_de_criacao_com_o_usuario_da_integracao(
    db, usuario, board_com_entrada
):
    card, _ = IntegrationCardService(db).create_or_return(
        payload(board_com_entrada.id), usuario
    )

    evento = (
        db.query(ServiceCardActivity)
        .filter_by(service_card_id=card.id, activity_type="card_created")
        .first()
    )
    assert evento is not None
    assert evento.user_id == usuario.id


def test_devices_sobrescreve_equipamentos_de_business_info(db, usuario, board_com_entrada):
    """`devices` é a fonte canônica: se o payload trouxer os dois, `devices` vence."""
    card, _ = IntegrationCardService(db).create_or_return(
        payload(
            board_com_entrada.id,
            business_info={"equipamentos": ["valor antigo que deve ser descartado"]},
            devices=[{"serial_number": "AB123"}],
        ),
        usuario,
    )

    equipamentos = card.business_info["equipamentos"]
    assert len(equipamentos) == 1
    assert equipamentos[0]["serial_number"] == "AB123"


# ── corrida na criação do vínculo de cliente (achado 1) ─────────────────────────


def test_corrida_na_criacao_do_vinculo_de_cliente_devolve_o_cliente_vencedor(
    db, usuario, board_com_entrada
):
    """
    Simula duas requisições concorrentes para o MESMO cliente de origem: o job diário
    de cobrança pode disparar vários cards do mesmo cliente, e uma OS e uma calibração
    do mesmo cliente podem chegar juntas.

    A consulta de existência do vínculo (`_find_client_ref`) não vê o vínculo ainda
    (ele nasce depois, "por baixo", simulando o outro request que ganhou a corrida).
    Quando o nosso flush tenta inserir o mesmo par (source, external_id), o UNIQUE
    constraint estoura IntegrityError — que o service precisa capturar e resolver
    devolvendo o cliente vencedor, sem propagar erro 500 nem perder o card em criação.
    """
    svc = IntegrationCardService(db)

    vencedor = Client(name="Concorrente vencedor", company_name="Concorrente vencedor")
    db.add(vencedor)
    db.flush()
    ref_vencedor = ExternalClientRef(
        source="gestorhs", external_id="789", client_id=vencedor.id
    )
    db.add(ref_vencedor)
    db.flush()

    # A consulta de existência devolve None na primeira chamada (como se tivesse
    # rodado um instante antes do commit concorrente) e o valor real dali em diante.
    with patch.object(
        IntegrationCardService, "_find_client_ref", side_effect=[None, ref_vencedor]
    ):
        card, created = svc.create_or_return(payload(board_com_entrada.id), usuario)

    assert created is True
    assert card.client_id == vencedor.id
    assert db.query(Client).count() == 2  # o vencedor + o órfão que perdeu a corrida
    assert db.query(ExternalClientRef).count() == 1


# ── corrida na criação do card (achado 2) ────────────────────────────────────────


def test_corrida_na_criacao_do_card_devolve_o_card_vencedor(db, usuario, board_com_entrada):
    """
    Mecanismo central da idempotência sob corrida: dois requests com o mesmo
    (source, external_id) passam ambos pela consulta de existência sem achar nada
    (ainda não existia), mas o segundo perde a corrida no commit porque o primeiro
    já inseriu o card. O `except IntegrityError` precisa reconsultar e devolver o
    card vencedor com created=False, em vez de propagar o erro como 500.

    Sem threads: forçamos `_find_by_external_ref` a devolver None na primeira
    chamada (a consulta de existência, que "não viu" o concorrente) e o card real
    da segunda chamada em diante (a reconsulta pós-IntegrityError). O card do
    "vencedor" é inserido diretamente pelo model, simulando o commit concorrente
    que já aconteceu.
    """
    svc = IntegrationCardService(db)

    entry_list = board_com_entrada.lists[1]
    client = Client(name="Cliente", company_name="Cliente")
    db.add(client)
    db.flush()
    vencedor = ServiceCard(
        list_id=entry_list.id,
        title="Card que venceu a corrida",
        client_id=client.id,
        external_source="gestorhs.os",
        external_id="1234",
        position=0,
    )
    db.add(vencedor)
    db.commit()
    db.refresh(vencedor)

    with patch.object(
        IntegrationCardService, "_find_by_external_ref", side_effect=[None, vencedor]
    ):
        card, created = svc.create_or_return(payload(board_com_entrada.id), usuario)

    assert created is False
    assert card.id == vencedor.id
    assert db.query(ServiceCard).count() == 1


# ── dedup de contato (achado 3) ───────────────────────────────────────────────────


def test_homonimos_com_emails_diferentes_viram_duas_pessoas(db, usuario, board_com_entrada):
    """
    Dois contatos com o mesmo nome, mas emails diferentes, no mesmo cliente, não podem
    ser fundidos: são pessoas diferentes que por acaso têm o mesmo nome.
    """
    svc = IntegrationCardService(db)

    primeiro, _ = svc.create_or_return(
        payload(
            board_com_entrada.id,
            contact={"name": "João Silva", "email": "joao1@x.com", "phone": "11900000001"},
        ),
        usuario,
    )
    segundo, _ = svc.create_or_return(
        payload(
            board_com_entrada.id,
            external_id="5678",
            contact={"name": "João Silva", "email": "joao2@x.com", "phone": "11900000002"},
        ),
        usuario,
    )

    assert primeiro.person_id != segundo.person_id
    assert db.query(Person).count() == 2
    pessoa1 = db.query(Person).filter_by(id=primeiro.person_id).first()
    pessoa2 = db.query(Person).filter_by(id=segundo.person_id).first()
    assert pessoa1.email == "joao1@x.com"
    assert pessoa2.email == "joao2@x.com"


def test_reaproveitar_pessoa_sem_telefone_preenche_o_telefone_do_payload(
    db, usuario, board_com_entrada
):
    """Ao reaproveitar uma pessoa existente, campos vazios são preenchidos, não descartados."""
    svc = IntegrationCardService(db)

    primeiro, _ = svc.create_or_return(
        payload(
            board_com_entrada.id,
            contact={"name": "Maria Souza", "email": None, "phone": None},
        ),
        usuario,
    )
    pessoa = db.query(Person).filter_by(id=primeiro.person_id).first()
    assert pessoa.phone is None

    segundo, _ = svc.create_or_return(
        payload(
            board_com_entrada.id,
            external_id="5678",
            contact={"name": "Maria Souza", "email": None, "phone": "11988887777"},
        ),
        usuario,
    )

    assert segundo.person_id == primeiro.person_id
    db.refresh(pessoa)
    assert pessoa.phone == "11988887777"
    assert db.query(Person).count() == 1


def test_mesmo_email_reaproveita_a_pessoa_mesmo_com_nome_grafado_diferente(
    db, usuario, board_com_entrada
):
    """
    Passo 1 é a regra principal: email tem precedência sobre nome. Duas chamadas
    para o mesmo cliente com o MESMO email de contato devem reaproveitar a mesma
    Person, mesmo que o nome venha escrito diferente da segunda vez (erro de
    digitação/variação do sistema de origem). Ao final só pode existir uma Person
    para aquele cliente.
    """
    svc = IntegrationCardService(db)

    primeiro, _ = svc.create_or_return(
        payload(
            board_com_entrada.id,
            contact={"name": "João Silva", "email": "joao@x.com", "phone": None},
        ),
        usuario,
    )
    segundo, _ = svc.create_or_return(
        payload(
            board_com_entrada.id,
            external_id="5678",
            contact={"name": "Joao da Silva", "email": "joao@x.com", "phone": "11900000009"},
        ),
        usuario,
    )

    assert segundo.person_id == primeiro.person_id
    assert db.query(Person).count() == 1
    pessoa = db.query(Person).filter_by(id=primeiro.person_id).first()
    # reaproveitar não reescreve o nome já cadastrado
    assert pessoa.name == "João Silva"
    assert pessoa.phone == "11900000009"


def test_homonimo_sem_email_e_reaproveitado_por_decisao_de_design(
    db, usuario, board_com_entrada
):
    """
    Documenta o trade-off aceito no passo 2 do dedup (ver docstring de
    `_resolve_person`): quando o cliente já tem uma Person homônima SEM email
    cadastrado e chega um novo contato com o MESMO nome e um email, a pessoa
    existente é reaproveitada e ganha o email — mesmo que, na realidade, sejam
    duas pessoas diferentes que coincidentemente têm o mesmo nome.

    Isso NÃO é um bug: é uma decisão deliberada. No GestorHS só existe um
    contato por cliente, e é esta integração que cria as Person — então o risco
    de fundir homônimos foi aceito conscientemente para evitar o problema mais
    frequente e mais visível, que é gerar contatos duplicados no CRM. Se esta
    asserção falhar porque a lógica mudou para não reaproveitar mais, quem
    mexeu precisa revisar a decisão com o time antes de seguir.
    """
    pessoa_existente = Person(name="João Silva", organization_id=None, email=None)
    # organization_id precisa ser o do cliente que a integração vai resolver;
    # criamos o card primeiro sem contato para obter o client_id e só então
    # a Person homônima.
    svc = IntegrationCardService(db)
    primeiro, _ = svc.create_or_return(payload(board_com_entrada.id), usuario)
    pessoa_existente.organization_id = primeiro.client_id
    db.add(pessoa_existente)
    db.commit()
    db.refresh(pessoa_existente)

    segundo, _ = svc.create_or_return(
        payload(
            board_com_entrada.id,
            external_id="5678",
            contact={"name": "João Silva", "email": "joao@x.com", "phone": None},
        ),
        usuario,
    )

    # reaproveitou a pessoa existente em vez de criar uma nova
    assert segundo.person_id == pessoa_existente.id
    db.refresh(pessoa_existente)
    assert pessoa_existente.email == "joao@x.com"
    assert db.query(Person).filter_by(organization_id=primeiro.client_id).count() == 1


def test_payload_sem_email_com_homonimo_com_email_cria_pessoa_nova(
    db, usuario, board_com_entrada
):
    """
    Documenta o comportamento atual do outro lado do passo 2: quando o cliente já
    tem uma Person homônima que TEM email cadastrado, e chega um novo contato com
    o mesmo nome mas SEM email no payload, o filtro do passo 2 (`Person.email.is_(None)`)
    exclui essa homônima — então nada casa e uma pessoa NOVA é criada, duplicando
    o nome dentro do mesmo cliente.

    Este teste apenas registra o comportamento atual; não é uma correção. Ver o
    relatório da tarefa para a análise de se este caso deveria reaproveitar em vez
    de duplicar.
    """
    svc = IntegrationCardService(db)
    primeiro, _ = svc.create_or_return(
        payload(
            board_com_entrada.id,
            contact={"name": "João Silva", "email": "joao@x.com", "phone": None},
        ),
        usuario,
    )

    segundo, _ = svc.create_or_return(
        payload(
            board_com_entrada.id,
            external_id="5678",
            contact={"name": "João Silva", "email": None, "phone": "11900000009"},
        ),
        usuario,
    )

    assert segundo.person_id != primeiro.person_id
    assert db.query(Person).filter_by(organization_id=primeiro.client_id).count() == 2
    pessoa_nova = db.query(Person).filter_by(id=segundo.person_id).first()
    assert pessoa_nova.name == "João Silva"
    assert pessoa_nova.email is None
    assert pessoa_nova.phone == "11900000009"


# ─── tipo de cobrança (collection_type) ───────────────────────────────────────

def test_calibracao_nasce_como_a_vencer(db, usuario, board_com_entrada):
    card, _ = IntegrationCardService(db).create_or_return(
        payload(board_com_entrada.id, source="gestorhs.calibracao", external_id="7310:2026-09-08"),
        usuario,
    )
    assert card.business_info["collection_type"] == "a_vencer"


def test_atrasados_nasce_como_atrasados(db, usuario, board_com_entrada):
    card, _ = IntegrationCardService(db).create_or_return(
        payload(board_com_entrada.id, source="gestorhs.atrasados", external_id="512:2026-07-18"),
        usuario,
    )
    assert card.business_info["collection_type"] == "atrasados"


def test_os_nao_recebe_tipo_de_cobranca(db, usuario, board_com_entrada):
    """Board de Serviços não tem tipo de cobrança — não deve inventar um."""
    card, _ = IntegrationCardService(db).create_or_return(
        payload(board_com_entrada.id, source="gestorhs.os", external_id="1234"),
        usuario,
    )
    assert (card.business_info or {}).get("collection_type") is None


def test_collection_type_explicito_do_payload_e_respeitado(db, usuario, board_com_entrada):
    """Se o GestorHS mandar collection_type, o derivado do source não sobrescreve."""
    card, _ = IntegrationCardService(db).create_or_return(
        payload(
            board_com_entrada.id, source="gestorhs.calibracao", external_id="7310:2026-09-08",
            business_info={"collection_type": "atrasados"},
        ),
        usuario,
    )
    assert card.business_info["collection_type"] == "atrasados"
