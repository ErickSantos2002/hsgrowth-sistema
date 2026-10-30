"""As tabelas de Parcerias: parceiro, Equipe, oportunidade, produtos e histórico."""
from app.models.partner import PartnerTeamMember
from app.models.partner_activity import PartnerActivity
from app.models.partner_opportunity import PartnerOpportunityProduct
from app.models.product import Product

from tests.unit.apoio_parcerias import oportunidade, parceiro, usuario


def test_parceiro_com_equipe_oportunidade_produto_e_historico(db):
    p = parceiro(db)
    db.add(PartnerTeamMember(partner_id=p.id, name="Ana"))
    db.commit()
    op = oportunidade(db, p)
    produto = Product(name="Etilômetro", unit_price=1500)
    db.add(produto)
    db.commit()
    db.add(PartnerOpportunityProduct(opportunity_id=op.id, product_id=produto.id, quantity=2, unit_price=1500))
    db.add(PartnerActivity(opportunity_id=op.id, category="anotacao", description="Primeiro contato"))
    db.commit()
    db.refresh(p)
    db.refresh(op)

    assert p.stage == "potencial"
    assert [m.name for m in p.team] == ["Ana"]
    assert op.partner.name == "Dmap"
    assert op.stage == "novo_lead"
    assert op.eligibility_status == "em_analise"
    assert op.products[0].product.name == "Etilômetro"


def test_login_fica_ligado_ao_parceiro(db):
    p = parceiro(db)
    user = usuario(db, "partner", "contato@dmap.com", p)

    assert user.partner_id == p.id
