"""Vendedor do parceiro (partner_member): só as próprias oportunidades (Entrega 3)."""
from app.models.partner import PartnerTeamMember
from app.models.partner_activity import PartnerActivity
from tests.unit.apoio_parcerias import CNPJ_B, headers, oportunidade, parceiro, usuario

URL = "/api/v1/parcerias"
NOVA = {
    "title": "Etilômetros", "deal_type": "Nova Venda", "sector": "Indústrias de Transformação",
    "relationship_type": "Prospect", "context": "Frota", "cnpj": CNPJ_B, "company_name": "Empresa B",
}


def _vendedor(db, p, email="v1@dmap.com"):
    login = usuario(db, "partner_member", email, p)
    membro = PartnerTeamMember(partner_id=p.id, name=email.split("@")[0], email=email, user_id=login.id)
    db.add(membro); db.commit(); db.refresh(membro)
    return login, membro


def test_ve_so_as_proprias(client, db):
    p = parceiro(db)
    eu, meu = _vendedor(db, p)
    _, outro = _vendedor(db, p, "v2@dmap.com")
    minha = oportunidade(db, p, seller_member_id=meu.id)
    dele = oportunidade(db, p, seller_member_id=outro.id, title="Outra")
    oportunidade(db, p, title="Sem vendedor")
    h = headers(eu)

    ids = [o["id"] for o in client.get(f"{URL}/oportunidades", headers=h).json()]
    assert ids == [minha.id]
    assert client.get(f"{URL}/oportunidades?partner_id={p.id}", headers=h).json()[0]["id"] == minha.id
    assert client.get(f"{URL}/oportunidades/{dele.id}", headers=h).status_code == 404


def test_nao_ve_atividades_produtos_nem_mexe_na_de_outro(client, db):
    p = parceiro(db)
    eu, meu = _vendedor(db, p)
    _, outro = _vendedor(db, p, "v2@dmap.com")
    minha = oportunidade(db, p, seller_member_id=meu.id)
    dele = oportunidade(db, p, seller_member_id=outro.id, title="Outra")
    nota = PartnerActivity(opportunity_id=dele.id, category="anotacao", activity_type="note", description="x")
    db.add(nota); db.commit(); db.refresh(nota)
    h = headers(eu)

    assert client.get(f"{URL}/oportunidades/{minha.id}/atividades", headers=h).status_code == 200
    assert client.get(f"{URL}/oportunidades/{dele.id}/atividades", headers=h).status_code == 404
    assert client.post(f"{URL}/oportunidades/{dele.id}/atividades", headers=h,
                       json={"category": "anotacao", "description": "oi"}).status_code == 404
    assert client.get(f"{URL}/oportunidades/{dele.id}/produtos", headers=h).status_code == 404
    assert client.put(f"{URL}/atividades/{nota.id}", headers=h, json={"description": "y"}).status_code == 404
    assert client.put(f"{URL}/oportunidades/{dele.id}/mover", headers=h,
                      json={"stage": "qualificacao"}).status_code == 404
    assert client.put(f"{URL}/oportunidades/{dele.id}", headers=h, json={"title": "Minha"}).status_code == 404


def test_cria_e_nasce_como_vendedor(client, db):
    p = parceiro(db)
    eu, meu = _vendedor(db, p)
    _, outro = _vendedor(db, p, "v2@dmap.com")
    r = client.post(f"{URL}/oportunidades", headers=headers(eu), json={**NOVA, "seller_member_id": outro.id})
    assert r.status_code == 201
    assert (r.json()["partner_id"], r.json()["seller_member_id"]) == (p.id, meu.id)


def test_edita_e_move_a_propria(client, db):
    p = parceiro(db)
    eu, meu = _vendedor(db, p)
    op = oportunidade(db, p, seller_member_id=meu.id)
    h = headers(eu)
    assert client.put(f"{URL}/oportunidades/{op.id}", headers=h, json={"title": "Novo título"}).status_code == 200
    assert client.put(f"{URL}/oportunidades/{op.id}", headers=h,
                      json={"seller_member_id": meu.id}).status_code == 200


def test_nao_troca_o_vendedor(client, db):
    p = parceiro(db)
    eu, meu = _vendedor(db, p)
    _, outro = _vendedor(db, p, "v2@dmap.com")
    op = oportunidade(db, p, seller_member_id=meu.id)
    r = client.put(f"{URL}/oportunidades/{op.id}", headers=headers(eu), json={"seller_member_id": outro.id})
    assert r.status_code == 422
    r = client.put(f"{URL}/oportunidades/{op.id}", headers=headers(eu), json={"seller_member_id": None})
    assert r.status_code == 422


def test_dono_troca_o_vendedor_e_o_antigo_perde_a_visao(client, db):
    p = parceiro(db)
    dono = usuario(db, "partner", "dono@dmap.com", p)
    eu, meu = _vendedor(db, p)
    _, outro = _vendedor(db, p, "v2@dmap.com")
    op = oportunidade(db, p, seller_member_id=meu.id)
    assert client.put(f"{URL}/oportunidades/{op.id}", headers=headers(dono),
                      json={"seller_member_id": outro.id}).status_code == 200
    assert client.get(f"{URL}/oportunidades/{op.id}", headers=headers(eu)).status_code == 404


def test_nao_valida_elegibilidade_nem_confirma_ganho(client, db):
    p = parceiro(db)
    eu, meu = _vendedor(db, p)
    op = oportunidade(db, p, seller_member_id=meu.id)
    h = headers(eu)
    assert client.put(f"{URL}/oportunidades/{op.id}/elegibilidade", headers=h,
                      json={"status": "validada"}).status_code == 403
    assert client.put(f"{URL}/oportunidades/{op.id}/ganho", headers=h,
                      json={"acao": "confirmar"}).status_code == 403


def test_nao_ve_aquisicao_nem_equipe(client, db):
    p = parceiro(db)
    eu, meu = _vendedor(db, p)
    h = headers(eu)
    assert client.get(f"{URL}/parceiros/{p.id}", headers=h).status_code == 404
    assert client.get(f"{URL}/parceiros/{p.id}/equipe", headers=h).status_code == 404
    assert client.post(f"{URL}/parceiros/{p.id}/equipe", headers=h, json={"name": "X"}).status_code == 404
    assert client.put(f"{URL}/parceiros/{p.id}/equipe/{meu.id}", headers=h, json={"name": "X"}).status_code == 404
    assert client.get(f"{URL}/parceiros/{p.id}/atividades", headers=h).status_code == 404
    assert client.put(f"{URL}/parceiros/{p.id}/mover", headers=h, json={"stage": "potencial"}).status_code == 404
    assert client.put(f"{URL}/parceiros/{p.id}", headers=h, json={"name": "X"}).status_code == 404
    assert client.get(f"{URL}/parceiros", headers=h).json() == []
    # Acessos é só da gestão: 403 antes de olhar o parceiro (não revela nada).
    assert client.get(f"{URL}/parceiros/{p.id}/acessos", headers=h).status_code == 403


def test_nao_le_atividade_do_card_de_aquisicao(client, db):
    p = parceiro(db)
    eu, _ = _vendedor(db, p)
    nota = PartnerActivity(partner_id=p.id, category="anotacao", activity_type="note", description="x")
    db.add(nota); db.commit(); db.refresh(nota)
    assert client.put(f"{URL}/atividades/{nota.id}", headers=headers(eu),
                      json={"description": "y"}).status_code == 404


def test_login_sem_cadastro_na_equipe_nao_entra(client, db):
    p = parceiro(db)
    solto = usuario(db, "partner_member", "solto@dmap.com", p)
    assert client.get(f"{URL}/oportunidades", headers=headers(solto)).status_code == 403


def test_membro_inativo_nao_ve_mesmo_com_login_ativo(client, db):
    p = parceiro(db)
    eu, meu = _vendedor(db, p)
    oportunidade(db, p, seller_member_id=meu.id)
    meu.is_active = False
    db.commit()
    assert client.get(f"{URL}/oportunidades", headers=headers(eu)).status_code == 403


def test_trancado_fora_de_parcerias_e_usa_consulta_cnpj(client, db):
    p = parceiro(db)
    eu, _ = _vendedor(db, p)
    h = headers(eu)
    assert client.get("/api/v1/clients", headers=h).status_code == 403
    r = client.get(f"{URL}/consulta-cnpj/resumo", headers=h)
    assert r.status_code == 200 and r.json()["limite"] == 20
    assert client.get(f"{URL}/consulta-cnpj/historico", headers=h).status_code == 403


# ─── Task 9: Equipe → Dar acesso ─────────────────────────────────────────────

import pytest  # noqa: E402

from app.services import envio_email  # noqa: E402
from tests.unit.apoio_parcerias import role  # noqa: E402


@pytest.fixture
def emails(monkeypatch):
    enviados = []
    monkeypatch.setattr(envio_email, "enviar_email", lambda para, *a, **k: enviados.append(para) or True)
    return enviados


def test_dono_da_acesso_ao_vendedor_por_convite(client, db, emails):
    role(db, "partner_member")
    p = parceiro(db)
    h = headers(usuario(db, "partner", "dono@dmap.com", p))
    m = client.post(f"{URL}/parceiros/{p.id}/equipe", headers=h,
                    json={"name": "Vini", "email": "vini@dmap.com"}).json()
    assert m["user_id"] is None and m["status_acesso"] is None

    r = client.post(f"{URL}/parceiros/{p.id}/equipe/{m['id']}/acesso", headers=h, json={"modo": "convite"})

    assert r.status_code == 201
    assert r.json()["status_acesso"] == "convite_pendente" and emails == ["vini@dmap.com"]
    equipe = client.get(f"{URL}/parceiros/{p.id}/equipe", headers=h).json()
    assert equipe[0]["user_id"] and equipe[0]["status_acesso"] == "convite_pendente"

    from app.models.user import User
    login = db.query(User).filter(User.id == equipe[0]["user_id"]).first()
    assert (login.role.name, login.partner_id, login.email) == ("partner_member", p.id, "vini@dmap.com")

    # Segunda vez: já tem acesso. Reenviar o convite pela rota própria.
    assert client.post(f"{URL}/parceiros/{p.id}/equipe/{m['id']}/acesso", headers=h,
                       json={"modo": "convite"}).status_code == 422
    r = client.post(f"{URL}/parceiros/{p.id}/equipe/{m['id']}/acesso/convite", headers=h, json={"enviar": False})
    assert r.status_code == 200 and r.json()["link"]


def test_gestao_da_acesso_por_senha(client, db, admin_headers):
    role(db, "partner_member")
    p = parceiro(db)
    membro = PartnerTeamMember(partner_id=p.id, name="Ana", email="ana@dmap.com")
    db.add(membro); db.commit(); db.refresh(membro)
    r = client.post(f"{URL}/parceiros/{p.id}/equipe/{membro.id}/acesso", headers=admin_headers,
                    json={"modo": "senha", "password": "Senha@123"})
    assert r.status_code == 201 and r.json()["status_acesso"] == "ativo"
    db.refresh(membro)
    assert membro.user_id


def test_vendedor_sem_email_nao_ganha_acesso(client, db):
    p = parceiro(db)
    h = headers(usuario(db, "partner", "dono@dmap.com", p))
    m = client.post(f"{URL}/parceiros/{p.id}/equipe", headers=h, json={"name": "Sem email"}).json()
    r = client.post(f"{URL}/parceiros/{p.id}/equipe/{m['id']}/acesso", headers=h,
                    json={"modo": "senha", "password": "Senha@123"})
    assert r.status_code == 422


def test_membro_inativo_nao_ganha_acesso(client, db):
    role(db, "partner_member")
    p = parceiro(db)
    h = headers(usuario(db, "partner", "dono@dmap.com", p))
    membro = PartnerTeamMember(partner_id=p.id, name="Ana", email="ana@dmap.com", is_active=False)
    db.add(membro); db.commit(); db.refresh(membro)
    r = client.post(f"{URL}/parceiros/{p.id}/equipe/{membro.id}/acesso", headers=h,
                    json={"modo": "senha", "password": "Senha@123"})
    assert r.status_code == 422


def test_so_dono_ou_gestao_dao_acesso(client, db):
    role(db, "partner_member")
    responsavel = usuario(db, "salesperson", "resp@hs.com")
    p = parceiro(db, hs_owner_id=responsavel.id)
    outro = parceiro(db, "Outro")
    eu, _ = _vendedor(db, p)
    membro = PartnerTeamMember(partner_id=p.id, name="Ana", email="ana@dmap.com")
    db.add(membro); db.commit(); db.refresh(membro)
    corpo = {"modo": "senha", "password": "Senha@123"}
    caminho = f"{URL}/parceiros/{p.id}/equipe/{membro.id}/acesso"

    assert client.post(caminho, headers=headers(eu), json=corpo).status_code == 404
    assert client.post(caminho, headers=headers(responsavel), json=corpo).status_code == 403
    dono_de_outro = usuario(db, "partner", "dono@outro.com", outro)
    assert client.post(caminho, headers=headers(dono_de_outro), json=corpo).status_code == 404
    # Membro de outro parceiro pela URL do parceiro certo: 404.
    dono = usuario(db, "partner", "dono@dmap.com", p)
    alheio = PartnerTeamMember(partner_id=outro.id, name="Zé", email="ze@outro.com")
    db.add(alheio); db.commit(); db.refresh(alheio)
    assert client.post(f"{URL}/parceiros/{p.id}/equipe/{alheio.id}/acesso", headers=headers(dono),
                       json=corpo).status_code == 404
    db.refresh(membro)
    assert membro.user_id is None


def test_desativar_o_membro_desativa_o_login(client, db):
    p = parceiro(db)
    h = headers(usuario(db, "partner", "dono@dmap.com", p))
    eu, meu = _vendedor(db, p)
    client.put(f"{URL}/parceiros/{p.id}/equipe/{meu.id}", headers=h, json={"is_active": False})
    db.refresh(eu)
    assert eu.is_active is False
    assert client.get(f"{URL}/oportunidades", headers=headers(eu)).status_code == 403

    r = client.put(f"{URL}/parceiros/{p.id}/equipe/{meu.id}", headers=h, json={"is_active": True})
    assert r.json()["status_acesso"] == "ativo"
    db.refresh(eu)
    assert eu.is_active is True
    assert client.get(f"{URL}/oportunidades", headers=headers(eu)).status_code == 200


# ─── Revisão: escopo do convite e ativação do login ─────────────────────────

def test_convite_do_membro_so_com_login_de_vendedor_do_parceiro(client, db):
    p = parceiro(db)
    outro = parceiro(db, "Outro")
    h = headers(usuario(db, "partner", "dono@dmap.com", p))
    # Membro apontando para um login que não é vendedor deste parceiro.
    alheio = usuario(db, "partner_member", "alheio@outro.com", outro)
    gerente = usuario(db, "manager", "ger@hs.com")
    for login in (alheio, gerente):
        m = PartnerTeamMember(partner_id=p.id, name="X", email=login.email, user_id=login.id)
        db.add(m); db.commit(); db.refresh(m)
        r = client.post(f"{URL}/parceiros/{p.id}/equipe/{m.id}/acesso/convite", headers=h, json={"enviar": False})
        assert r.status_code == 404


def test_convite_do_membro_inativo_e_recusado(client, db):
    p = parceiro(db)
    h = headers(usuario(db, "partner", "dono@dmap.com", p))
    _, meu = _vendedor(db, p)
    meu.is_active = False
    db.commit()
    r = client.post(f"{URL}/parceiros/{p.id}/equipe/{meu.id}/acesso/convite", headers=h, json={"enviar": False})
    assert r.status_code == 422 and "Reative" in r.json()["detail"]


def test_responsavel_hs_nao_liga_nem_desliga_o_login(client, db):
    responsavel = usuario(db, "salesperson", "resp@hs.com")
    p = parceiro(db, hs_owner_id=responsavel.id)
    eu, meu = _vendedor(db, p)
    h = headers(responsavel)
    caminho = f"{URL}/parceiros/{p.id}/equipe/{meu.id}"
    assert client.put(caminho, headers=h, json={"is_active": False}).status_code == 403
    db.refresh(eu); db.refresh(meu)
    assert eu.is_active is True and meu.is_active is True
    # Outros campos continuam como hoje.
    assert client.put(caminho, headers=h, json={"phone": "11999990000"}).status_code == 200
    # Membro sem login: ativar/desativar continua liberado para ele.
    solto = PartnerTeamMember(partner_id=p.id, name="Solto")
    db.add(solto); db.commit(); db.refresh(solto)
    assert client.put(f"{URL}/parceiros/{p.id}/equipe/{solto.id}", headers=h,
                      json={"is_active": False}).status_code == 200


def test_acessos_nao_mexe_no_login_do_vendedor(client, db, admin_headers):
    p = parceiro(db)
    eu, _ = _vendedor(db, p)
    r = client.put(f"{URL}/parceiros/{p.id}/acessos/{eu.id}", headers=admin_headers, json={"is_active": False})
    assert r.status_code == 404
    db.refresh(eu)
    assert eu.is_active is True


def test_email_do_membro_com_login_nao_muda(client, db):
    p = parceiro(db)
    h = headers(usuario(db, "partner", "dono@dmap.com", p))
    eu, meu = _vendedor(db, p)
    caminho = f"{URL}/parceiros/{p.id}/equipe/{meu.id}"
    r = client.put(caminho, headers=h, json={"email": "novo@dmap.com"})
    assert r.status_code == 422 and "e-mail do login" in r.json()["detail"]
    assert client.put(caminho, headers=h, json={"email": "V1@dmap.com"}).status_code == 200
    r = client.put(caminho, headers=h, json={"name": "Vinicius"})
    assert r.status_code == 200 and r.json()["name"] == "Vinicius"
    db.refresh(eu)
    assert (eu.email, eu.name) == ("v1@dmap.com", "v1")
