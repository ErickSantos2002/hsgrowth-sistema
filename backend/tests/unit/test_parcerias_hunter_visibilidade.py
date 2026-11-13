"""
Perfil hunter e visibilidade por indicação (um nível só).

Rede dos testes: o hunter H indica a Empresa A; a Empresa A indica a Unidade B.
Outro hunter (H2) indica a Empresa C. O indicador vê a indicada e as vendas
dela, mas só lê; Equipe, Acessos, contrato e atividades do card da indicada são 404.
"""
from types import SimpleNamespace

import pytest

from app.models.partner import PartnerTeamMember
from app.models.partner_activity import PartnerActivity
from app.models.partner_opportunity import PartnerOpportunityProduct
from app.models.product import Product
from app.services.parcerias import acesso, atividades, consultas
from tests.unit.apoio_parcerias import CNPJ_B, headers, hunter, oportunidade, parceiro, usuario

URL = "/api/v1/parcerias"
SO_LEITURA = "Você só acompanha as oportunidades desta empresa."
NOVA = {
    "title": "Etilômetros", "deal_type": "Nova Venda", "sector": "Indústrias de Transformação",
    "relationship_type": "Prospect", "context": "Frota", "cnpj": CNPJ_B, "company_name": "Empresa B",
    "company_city": "Santos", "company_state": "SP",
    "contact_name": "Ana Souza", "contact_email": "ana@empresa.com", "contact_phone": "(11) 98888-7777",
}


def _rede(db):
    ph, uh = hunter(db, "João Hunter", "joao@hunter.com")
    a = parceiro(db, "Empresa A", indicated_by_partner_id=ph.id)
    ua = usuario(db, "partner", "dono@a.com", a)
    b = parceiro(db, "Unidade B", indicated_by_partner_id=a.id)
    ub = usuario(db, "partner", "dono@b.com", b)
    ph2, uh2 = hunter(db, "Outro Hunter", "outro@hunter.com")
    c = parceiro(db, "Empresa C", indicated_by_partner_id=ph2.id)
    excluida = parceiro(db, "Empresa Excluída", indicated_by_partner_id=ph.id, is_deleted=True)
    return SimpleNamespace(
        ph=ph, uh=uh, a=a, ua=ua, b=b, ub=ub, ph2=ph2, uh2=uh2, c=c, excluida=excluida,
        op_h=oportunidade(db, ph, title="Venda do hunter"),
        op_a=oportunidade(db, a, title="Venda de A"),
        op_b=oportunidade(db, b, title="Venda de B"),
        op_c=oportunidade(db, c, title="Venda de C"),
        op_excluida=oportunidade(db, excluida, title="Venda da excluída"),
    )


def _ids(resposta):
    assert resposta.status_code == 200, resposta.text
    return {item["id"] for item in resposta.json()}


def test_hunter_ve_so_os_indicados_diretos(client, db):
    r = _rede(db)
    h = headers(r.uh)

    assert _ids(client.get(f"{URL}/parceiros", headers=h)) == {r.a.id}
    assert _ids(client.get(f"{URL}/oportunidades", headers=h)) == {r.op_h.id, r.op_a.id}
    assert client.get(f"{URL}/oportunidades/{r.op_a.id}", headers=h).status_code == 200
    assert client.get(f"{URL}/oportunidades/{r.op_h.id}", headers=h).status_code == 200
    # Um nível só: a unidade que a Empresa A indicou não é do hunter.
    assert client.get(f"{URL}/oportunidades/{r.op_b.id}", headers=h).status_code == 404
    assert client.get(f"{URL}/parceiros/{r.b.id}", headers=h).status_code == 404
    assert _ids(client.get(f"{URL}/oportunidades?partner_id={r.b.id}", headers=h)) == set()
    # Nada do outro hunter, nem da indicada excluída.
    assert client.get(f"{URL}/oportunidades/{r.op_c.id}", headers=h).status_code == 404
    assert client.get(f"{URL}/parceiros/{r.c.id}", headers=h).status_code == 404
    assert client.get(f"{URL}/oportunidades/{r.op_excluida.id}", headers=h).status_code == 404
    # O próprio registro do hunter não aparece como card.
    assert client.get(f"{URL}/parceiros/{r.ph.id}", headers=h).status_code == 404

    assert acesso.ids_visiveis(db, r.uh) == [r.ph.id, r.a.id]


def test_empresa_ve_unidade_e_vendas_dela(client, db):
    r = _rede(db)
    h = headers(r.ua)

    assert _ids(client.get(f"{URL}/parceiros", headers=h)) == {r.a.id, r.b.id}
    assert _ids(client.get(f"{URL}/oportunidades", headers=h)) == {r.op_a.id, r.op_b.id}
    assert client.get(f"{URL}/parceiros/{r.b.id}", headers=h).status_code == 200
    assert client.get(f"{URL}/oportunidades/{r.op_b.id}", headers=h).status_code == 200
    assert client.get(f"{URL}/oportunidades/{r.op_b.id}/produtos", headers=h).status_code == 200
    # As atividades e os arquivos da oportunidade ficam com a empresa indicada.
    assert client.get(f"{URL}/oportunidades/{r.op_b.id}/atividades", headers=h).status_code == 404
    # Não vê quem a indicou nem as vendas do hunter dela.
    assert client.get(f"{URL}/parceiros/{r.ph.id}", headers=h).status_code == 404
    assert client.get(f"{URL}/oportunidades/{r.op_h.id}", headers=h).status_code == 404

    # A unidade vê só a si mesma.
    hb = headers(r.ub)
    assert _ids(client.get(f"{URL}/parceiros", headers=hb)) == {r.b.id}
    assert _ids(client.get(f"{URL}/oportunidades", headers=hb)) == {r.op_b.id}
    assert client.get(f"{URL}/parceiros/{r.a.id}", headers=hb).status_code == 404


def test_vendedor_da_empresa_nao_ve_a_unidade(client, db):
    r = _rede(db)
    login = usuario(db, "partner_member", "v@a.com", r.a)
    membro = PartnerTeamMember(partner_id=r.a.id, name="Vendedor", email="v@a.com", user_id=login.id)
    db.add(membro); db.commit(); db.refresh(membro)
    minha = oportunidade(db, r.a, title="Minha", seller_member_id=membro.id)
    h = headers(login)
    assert _ids(client.get(f"{URL}/oportunidades", headers=h)) == {minha.id}
    assert client.get(f"{URL}/oportunidades/{r.op_b.id}", headers=h).status_code == 404
    assert client.get(f"{URL}/parceiros", headers=h).json() == []


def _produto(db):
    p = Product(name="Phoebus", unit_price=1000, partner_enabled=True)
    db.add(p); db.commit(); db.refresh(p)
    return p


@pytest.mark.parametrize("quem,qual", [("uh", "op_a"), ("ua", "op_b")])
def test_indicador_so_le(client, db, tmp_path, monkeypatch, quem, qual):
    monkeypatch.setattr(atividades, "UPLOAD_DIR", tmp_path)
    r = _rede(db)
    login, op = getattr(r, quem), getattr(r, qual)
    produto = _produto(db)
    item = PartnerOpportunityProduct(opportunity_id=op.id, product_id=_produto(db).id, quantity=1, unit_price=10)
    # Atividade lançada pelo próprio indicador (ex.: antes da regra): nem assim ele mexe.
    nota = PartnerActivity(opportunity_id=op.id, user_id=login.id, category="atividade",
                           activity_type="task", title="Ligar")
    db.add_all([item, nota]); db.commit(); db.refresh(item); db.refresh(nota)
    h = headers(login)

    assert client.get(f"{URL}/oportunidades/{op.id}", headers=h).status_code == 200
    assert client.get(f"{URL}/oportunidades/{op.id}/produtos", headers=h).status_code == 200
    assert client.get(f"{URL}/oportunidades/{op.id}/atividades", headers=h).status_code == 404

    escritas = [
        client.put(f"{URL}/oportunidades/{op.id}", headers=h, json={"title": "Outro"}),
        client.put(f"{URL}/oportunidades/{op.id}/mover", headers=h, json={"stage": "oportunidade"}),
        client.post(f"{URL}/oportunidades/{op.id}/produtos", headers=h,
                    json={"product_id": produto.id, "quantity": 1}),
        client.put(f"{URL}/oportunidades/{op.id}/produtos/{item.id}", headers=h, json={"quantity": 2}),
        client.delete(f"{URL}/oportunidades/{op.id}/produtos/{item.id}", headers=h),
        client.post(f"{URL}/oportunidades/{op.id}/atividades", headers=h,
                    json={"category": "anotacao", "description": "oi"}),
        client.post(f"{URL}/oportunidades/{op.id}/atividades/arquivos", headers=h,
                    files={"file": ("a.pdf", b"%PDF-1.4", "application/pdf")}),
        client.put(f"{URL}/atividades/{nota.id}", headers=h, json={"title": "Outra"}),
        client.patch(f"{URL}/atividades/{nota.id}/concluir", headers=h, json={"is_completed": True}),
        client.delete(f"{URL}/atividades/{nota.id}", headers=h),
    ]
    for resposta in escritas:
        assert resposta.status_code == 403, (resposta.request.method, resposta.request.url, resposta.text)
        assert resposta.json()["detail"] == SO_LEITURA

    db.expire_all()
    assert op.title != "Outro" and op.stage == "novo_lead"
    assert db.query(PartnerOpportunityProduct).filter_by(opportunity_id=op.id).count() == 1
    assert db.query(PartnerActivity).filter_by(id=nota.id).first().is_completed is not True
    assert not list(tmp_path.rglob("*.pdf"))


def test_dono_da_unidade_continua_trabalhando_a_propria(client, db):
    r = _rede(db)
    h = headers(r.ub)
    assert client.put(f"{URL}/oportunidades/{r.op_b.id}", headers=h, json={"title": "Nova"}).status_code == 200
    assert client.post(f"{URL}/oportunidades/{r.op_b.id}/atividades", headers=h,
                       json={"category": "anotacao", "description": "oi"}).status_code == 201


def test_equipe_e_acessos_da_unidade_sao_404(client, db, tmp_path, monkeypatch):
    monkeypatch.setattr(atividades, "UPLOAD_DIR", tmp_path)
    r = _rede(db)
    membro = PartnerTeamMember(partner_id=r.b.id, name="Vendedor B", email="v@b.com")
    nota = PartnerActivity(partner_id=r.b.id, user_id=r.ub.id, category="anotacao",
                           activity_type="note", description="Do card de B")
    db.add_all([membro, nota]); db.commit(); db.refresh(membro); db.refresh(nota)
    pdf = {"file": ("c.pdf", b"%PDF-1.4", "application/pdf")}

    for login, alvo in ((r.ua, r.b), (r.uh, r.a)):
        h = headers(login)
        respostas = [
            client.get(f"{URL}/parceiros/{alvo.id}/equipe", headers=h),
            client.post(f"{URL}/parceiros/{alvo.id}/equipe", headers=h, json={"name": "Novo"}),
            client.get(f"{URL}/parceiros/{alvo.id}/acessos", headers=h),
            client.post(f"{URL}/parceiros/{alvo.id}/acessos", headers=h,
                        json={"name": "X", "email": "x@b.com", "modo": "senha", "password": "Senha@12345"}),
            client.post(f"{URL}/parceiros/{alvo.id}/contrato", headers=h, files=pdf),
            client.put(f"{URL}/parceiros/{alvo.id}", headers=h, json={"name": "Trocado"}),
            client.put(f"{URL}/parceiros/{alvo.id}/mover", headers=h, json={"stage": "bloqueado"}),
            client.get(f"{URL}/parceiros/{alvo.id}/atividades", headers=h),
            client.post(f"{URL}/parceiros/{alvo.id}/atividades", headers=h,
                        json={"category": "anotacao", "description": "oi"}),
            client.post(f"{URL}/parceiros/{alvo.id}/atividades/arquivos", headers=h, files=pdf),
        ]
        for resposta in respostas:
            assert resposta.status_code == 404, (resposta.request.method, resposta.request.url, resposta.text)

    h = headers(r.ua)
    for resposta in (
        client.put(f"{URL}/parceiros/{r.b.id}/equipe/{membro.id}", headers=h, json={"name": "Outro"}),
        client.post(f"{URL}/parceiros/{r.b.id}/equipe/{membro.id}/acesso", headers=h,
                    json={"modo": "senha", "password": "Senha@12345"}),
        client.post(f"{URL}/parceiros/{r.b.id}/equipe/{membro.id}/acesso/convite", headers=h,
                    json={"enviar": False}),
        client.put(f"{URL}/atividades/{nota.id}", headers=h, json={"description": "mexi"}),
        client.delete(f"{URL}/atividades/{nota.id}", headers=h),
        client.get(f"{URL}/atividades/{nota.id}/arquivo", headers=h),
    ):
        assert resposta.status_code == 404, (resposta.request.method, resposta.request.url, resposta.text)

    db.expire_all()
    assert r.b.name == "Unidade B" and membro.name == "Vendedor B" and not list(tmp_path.rglob("*.pdf"))
    # A própria Equipe a Empresa A continua vendo.
    assert client.get(f"{URL}/parceiros/{r.a.id}/equipe", headers=h).status_code == 200


def test_hunter_cria_venda_propria(client, db):
    r = _rede(db)
    h = headers(r.uh)
    resposta = client.post(f"{URL}/oportunidades", headers=h, json={**NOVA, "partner_id": r.a.id})
    assert resposta.status_code == 201, resposta.text
    assert resposta.json()["partner_id"] == r.ph.id
    assert resposta.json()["seller_member_id"] is None
    nova = resposta.json()["id"]
    # A própria venda ele trabalha.
    assert client.put(f"{URL}/oportunidades/{nova}", headers=h, json={"title": "Minha"}).status_code == 200
    assert client.put(f"{URL}/oportunidades/{nova}/mover", headers=h,
                      json={"stage": "oportunidade"}).status_code == 200
    assert client.post(f"{URL}/oportunidades/{nova}/atividades", headers=h,
                       json={"category": "anotacao", "description": "oi"}).status_code == 201


def test_hunter_nao_escolhe_vendedor(client, db):
    r = _rede(db)
    membro = PartnerTeamMember(partner_id=r.a.id, name="Vendedor A", email="v@a.com")
    db.add(membro); db.commit(); db.refresh(membro)
    h = headers(r.uh)
    resposta = client.post(f"{URL}/oportunidades", headers=h, json={**NOVA, "seller_member_id": membro.id})
    assert resposta.status_code == 422
    assert client.put(f"{URL}/oportunidades/{r.op_h.id}", headers=h,
                      json={"seller_member_id": membro.id}).status_code == 422


def test_hunter_trancado_e_consulta_cnpj(client, db):
    r = _rede(db)
    h = headers(r.uh)
    assert client.get("/api/v1/clients", headers=h).status_code == 403
    assert client.get("/api/v1/cards", headers=h).status_code == 403
    assert client.get(f"{URL}/consulta-cnpj/resumo", headers=h).status_code == 200
    assert consultas.limite_de(r.uh) == consultas.LIMITE_CONSULTAS_PARCEIRO


def test_perfis_externos(db):
    r = _rede(db)
    assert acesso.eh_hunter(r.uh) and acesso.eh_externo(r.uh) and acesso.eh_parceiro(r.uh)
    assert acesso.eh_externo(r.ua) and not acesso.eh_hunter(r.ua)
    assert not acesso.eh_dono_do_parceiro(r.uh)
    assert acesso.parceiro_do_login(r.uh) == r.ph.id
    assert acesso.ids_visiveis(db, r.ua) == [r.a.id, r.b.id]
