"""Oportunidade de parceiro ligada ao Cliente e à Pessoa do CRM, com histórico (v1.11.13)."""
from app.models.client import Client
from app.models.person import Person
from tests.unit.apoio_parcerias import CNPJ_A, CNPJ_B, headers, parceiro, usuario

URL = "/api/v1/parcerias/oportunidades"
NOVA = {
    "title": "Etilômetros Empresa A", "deal_type": "Nova Venda",
    "sector": "Indústrias de Transformação", "relationship_type": "Prospect",
    "context": "Frota de 40 caminhões", "cnpj": "11.222.333/0001-81", "company_name": "Empresa A",
    "company_city": "Santos", "company_state": "SP",
    "contact_name": "Ana Souza", "contact_role": "Compras",
    "contact_email": "ana@empresaa.com", "contact_phone": "(11) 98888-7777",
}


def _cliente(db, **campos) -> Client:
    c = Client(name=campos.get("company_name", "Empresa"), **campos)
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


def _parceiro_logado(db):
    p = parceiro(db)
    return p, headers(usuario(db, "partner", "a@dmap.com", p))


# ─── Ligação ─────────────────────────────────────────────────────────────────

def test_cria_cliente_e_pessoa_novos(client, db, admin_headers):
    p, h = _parceiro_logado(db)

    corpo = client.post(URL, json=NOVA, headers=h).json()

    c = db.query(Client).filter(Client.document == CNPJ_A).one()
    assert (c.name, c.company_name, c.city, c.state, c.relationship_type, c.source) == (
        "Empresa A", None, "Santos", "SP", "Lead", "parceria")
    pessoa = db.query(Person).filter(Person.organization_id == c.id).one()
    assert (pessoa.name, pessoa.position, pessoa.email_commercial) == ("Ana Souza", "Compras", "ana@empresaa.com")
    # O parceiro não enxerga o vínculo; a H&S sim.
    assert corpo["client_id"] is None and corpo["client_name"] is None
    visto = client.get(f"{URL}/{corpo['id']}", headers=admin_headers).json()
    assert (visto["client_id"], visto["client_name"]) == (c.id, "Empresa A")
    assert (visto["person_id"], visto["person_name"]) == (pessoa.id, "Ana Souza")


def test_liga_ao_cliente_existente_e_atualiza_o_preenchido(client, db):
    existente = _cliente(db, company_name="Fantasia A", document="11.222.333/0001-81",
                         city="Campinas", website="empresaa.com", relationship_type="Cliente")
    existente.name = "Empresa A Ltda"
    db.commit()
    _, h = _parceiro_logado(db)

    client.post(URL, json=NOVA, headers=h)

    assert db.query(Client).count() == 1
    db.refresh(existente)
    assert existente.name == "Empresa A"              # sobrescreve o preenchido ("Empresa")
    assert existente.company_name == "Fantasia A"     # nome fantasia o parceiro não informa
    assert existente.city == "Santos"
    assert existente.website == "empresaa.com"        # não mexe no que o parceiro não tem
    assert existente.relationship_type == "Cliente"   # Cliente não volta para Lead


def test_cliente_excluido_nao_conta(client, db):
    _cliente(db, company_name="Antiga", document=CNPJ_A, is_deleted=True)
    _, h = _parceiro_logado(db)

    client.post(URL, json=NOVA, headers=h)

    assert db.query(Client).filter(Client.is_deleted.is_(False)).count() == 1


def test_pessoa_achada_por_email_e_por_nome(client, db):
    empresa = _cliente(db, company_name="Empresa A", document=CNPJ_A)
    por_email = Person(name="Ana S.", email="ANA@empresaa.com", organization_id=empresa.id)
    por_nome = Person(name="bruno lima", organization_id=empresa.id)
    db.add_all([por_email, por_nome])
    db.commit()
    _, h = _parceiro_logado(db)

    client.post(URL, json=NOVA, headers=h)
    client.post(URL, json={**NOVA, "title": "Outra", "contact_name": "Bruno Lima", "contact_email": "bruno@empresaa.com"}, headers=h)

    assert db.query(Person).count() == 2
    db.refresh(por_email)
    assert por_email.name == "Ana Souza" and por_email.phone_commercial == "(11) 98888-7777"


def test_empresa_e_contato_sao_obrigatorios(client, db):
    _, h = _parceiro_logado(db)

    for campo in ("contact_name", "contact_phone", "contact_email", "company_city", "company_state"):
        assert client.post(URL, json={**NOVA, campo: None}, headers=h).status_code == 422, campo
        assert client.post(URL, json={**NOVA, campo: "  "}, headers=h).status_code == 422, campo

    assert db.query(Person).count() == 0


def test_edicao_nao_apaga_empresa_nem_contato(client, db):
    _, h = _parceiro_logado(db)
    op_id = client.post(URL, json=NOVA, headers=h).json()["id"]

    for campo in ("contact_name", "contact_phone", "contact_email", "company_city", "company_state"):
        assert client.put(f"{URL}/{op_id}", json={campo: None}, headers=h).status_code == 422, campo
    assert client.put(f"{URL}/{op_id}", json={"contact_role": None, "contact_name": "Ana Lima"}, headers=h).status_code == 200


def test_trocar_o_cnpj_religa(client, db, admin_headers):
    _, h = _parceiro_logado(db)
    op = client.post(URL, json=NOVA, headers=h).json()

    client.put(f"{URL}/{op['id']}", json={"cnpj": CNPJ_B, "company_name": "Empresa B"}, headers=h)

    b = db.query(Client).filter(Client.document == CNPJ_B).one()
    assert client.get(f"{URL}/{op['id']}", headers=admin_headers).json()["client_id"] == b.id


def test_reenviar_o_formulario_nao_desfaz_correcao_da_hs(client, db):
    _, h = _parceiro_logado(db)
    op = client.post(URL, json=NOVA, headers=h).json()
    c = db.query(Client).filter(Client.document == CNPJ_A).one()
    c.city = "São Vicente"  # a H&S corrigiu em Clientes
    db.commit()

    # O parceiro salva o formulário inteiro de novo, mudando só o cargo do contato.
    client.put(f"{URL}/{op['id']}", json={**NOVA, "contact_role": "Diretor"}, headers=h)

    db.refresh(c)
    assert c.city == "São Vicente"
    assert db.query(Person).one().position == "Diretor"


def test_oportunidade_antiga_se_liga_na_primeira_edicao(client, db):
    from tests.unit.apoio_parcerias import oportunidade
    p, h = _parceiro_logado(db)
    op = oportunidade(db, p)  # gravada direto, sem ligação (como as de antes da 1.11.13)

    client.put(f"{URL}/{op.id}", json={"title": "Novo título"}, headers=h)

    db.refresh(op)
    assert op.client_id == db.query(Client).filter(Client.document == CNPJ_A).one().id


def test_email_que_pessoas_recusa_nao_passa(client, db, admin_headers):
    _, h = _parceiro_logado(db)

    recusado = client.post(URL, json={**NOVA, "contact_email": "ana@empresa.test"}, headers=h)
    assert recusado.status_code == 422 and "E-mail inválido" in str(recusado.json())

    # E-mail antigo gravado antes da regra: a Pessoa é criada sem ele e continua legível.
    from tests.unit.apoio_parcerias import oportunidade
    op = oportunidade(db, parceiro(db, "Outro"), contact_name="Bia", contact_email="bia@empresa.local")
    client.put(f"{URL}/{op.id}", json={"title": "Novo"}, headers=admin_headers)
    pessoa = db.query(Person).filter(Person.name == "Bia").one()
    assert pessoa.email_commercial is None
    assert client.get(f"/api/v1/persons/{pessoa.id}", headers=admin_headers).status_code == 200


# ─── Histórico ───────────────────────────────────────────────────────────────

def test_historico_marca_a_parceria(client, db, admin_headers):
    existente = _cliente(db, company_name="Empresa A", document=CNPJ_A, city="Campinas")
    _, h = _parceiro_logado(db)

    client.post(URL, json=NOVA, headers=h)

    historico = client.get(f"/api/v1/clients/{existente.id}/historico", headers=admin_headers).json()
    assert len(historico) == 1
    item = historico[0]
    assert (item["usuario"], item["origem"], item["acao"]) == ("a", "via Parceria", "alterado")
    assert {"campo": "Cidade", "antes": "Campinas", "depois": "Santos"} in item["mudancas"]
    assert all(m["campo"] != "CNPJ/CPF" for m in item["mudancas"])  # só o que mudou


def test_historico_pela_tela_de_clientes_e_pessoas(client, db, salesperson_headers):
    c = _cliente(db, company_name="Empresa A", city="Campinas")
    pessoa = Person(name="Ana", organization_id=c.id)
    db.add(pessoa)
    db.commit()

    assert client.put(f"/api/v1/clients/{c.id}", json={"city": "Santos", "website": "a.com"},
                      headers=salesperson_headers).status_code == 200
    assert client.put(f"/api/v1/persons/{pessoa.id}", json={"position": "Compras"},
                      headers=salesperson_headers).status_code == 200

    mud = client.get(f"/api/v1/clients/{c.id}/historico", headers=salesperson_headers).json()[0]["mudancas"]
    assert {"campo": "Site", "antes": None, "depois": "a.com"} in mud
    pes = client.get(f"/api/v1/persons/{pessoa.id}/historico", headers=salesperson_headers).json()[0]
    assert pes["origem"] is None and pes["mudancas"] == [{"campo": "Cargo", "antes": None, "depois": "Compras"}]


def test_parceiro_e_financeiro_nao_veem_o_historico(client, db):
    c = _cliente(db, company_name="Empresa A")
    p = parceiro(db)

    for perfil, email in (("partner", "a@dmap.com"), ("finance", "fin@hs.com")):
        h = headers(usuario(db, perfil, email, p if perfil == "partner" else None))
        assert client.get(f"/api/v1/clients/{c.id}/historico", headers=h).status_code == 403
