"""Externos (parceiro, vendedor do parceiro, hunter) trabalham só com venda."""
import pytest

from app.models.partner import PartnerTeamMember
from tests.unit.apoio_parcerias import CNPJ_B, headers, hunter, oportunidade, parceiro, usuario

URL = "/api/v1/parcerias"
MSG = "Parceiros trabalham só com venda."
NOVA = {
    "title": "Etilômetros", "deal_type": "Nova Venda", "sector": "Indústrias de Transformação",
    "relationship_type": "Prospect", "context": "Frota", "cnpj": CNPJ_B, "company_name": "Empresa B",
}


def _externo(db, tipo):
    if tipo == "hunter":
        p, login = hunter(db)
    else:
        p = parceiro(db)
        login = usuario(db, tipo, f"{tipo}@dmap.com", p)
        if tipo == "partner_member":
            db.add(PartnerTeamMember(partner_id=p.id, name="v", email=login.email, user_id=login.id))
            db.commit()
    return p, headers(login)


def _op_do(db, p, tipo, **campos):
    if tipo == "partner_member":
        campos["seller_member_id"] = db.query(PartnerTeamMember).filter_by(partner_id=p.id).first().id
    return oportunidade(db, p, **campos)


TIPOS = ["partner", "partner_member", "hunter"]


@pytest.mark.parametrize("extra", [{}, {"modality": "venda"}])
@pytest.mark.parametrize("tipo", TIPOS)
def test_externo_cria_venda_por_padrao(client, db, tipo, extra):
    _, h = _externo(db, tipo)
    r = client.post(f"{URL}/oportunidades", headers=h, json={**NOVA, **extra})
    assert r.status_code == 201
    assert r.json()["modality"] == "venda"


@pytest.mark.parametrize("tipo", TIPOS)
def test_externo_locacao_422(client, db, tipo):
    p, h = _externo(db, tipo)
    r = client.post(f"{URL}/oportunidades", headers=h, json={**NOVA, "modality": "locacao"})
    assert r.status_code == 422 and r.json()["detail"] == MSG

    op = _op_do(db, p, tipo, modality="venda")
    r = client.put(f"{URL}/oportunidades/{op.id}", headers=h, json={"modality": "locacao"})
    assert r.status_code == 422 and r.json()["detail"] == MSG
    r = client.put(f"{URL}/oportunidades/{op.id}/mover", headers=h,
                   json={"stage": "qualificacao", "modality": "locacao"})
    assert r.status_code == 422 and r.json()["detail"] == MSG

    # modality null na edição é ignorado: continua venda
    r = client.put(f"{URL}/oportunidades/{op.id}", headers=h, json={"modality": None, "title": "Novo"})
    assert r.status_code == 200 and r.json()["modality"] == "venda"


def test_gestao_ainda_usa_locacao(client, db):
    p = parceiro(db)
    adm = headers(usuario(db, "admin", "adm@hs.com"))
    r = client.post(f"{URL}/oportunidades", headers=adm,
                    json={**NOVA, "partner_id": p.id, "modality": "locacao"})
    assert r.status_code == 201 and r.json()["modality"] == "locacao"
    r = client.put(f"{URL}/oportunidades/{r.json()['id']}", headers=adm, json={"modality": "venda"})
    assert r.status_code == 200 and r.json()["modality"] == "venda"
