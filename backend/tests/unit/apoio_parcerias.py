"""Apoio dos testes de Parcerias: perfis, logins, parceiros e oportunidades."""
from datetime import datetime

from app.core.security import create_access_token, hash_password
from app.models.partner import Partner
from app.models.partner_opportunity import PartnerOpportunity
from app.models.role import Role
from app.models.user import User

# CNPJs com dígitos verificadores válidos.
CNPJ_A = "11222333000181"
CNPJ_B = "11444777000161"


def role(db, nome: str) -> Role:
    existente = db.query(Role).filter(Role.name == nome).first()
    if existente:
        return existente
    novo = Role(name=nome, display_name=nome, permissions=[], is_system_role=True)
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return novo


def usuario(db, nome_role: str, email: str, partner: Partner = None) -> User:
    user = User(
        name=email.split("@")[0],
        email=email,
        password_hash=hash_password("Senha@12345"),
        role_id=role(db, nome_role).id,
        partner_id=partner.id if partner else None,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def headers(user: User) -> dict:
    return {"Authorization": f"Bearer {create_access_token(data={'sub': str(user.id)})}"}


def parceiro(db, nome: str = "Dmap", **campos) -> Partner:
    campos.setdefault("stage", "ativado")
    campos.setdefault("terms_accepted_at", datetime.utcnow())
    p = Partner(name=nome, **campos)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


def hunter(db, nome: str = "Hunter", email: str = "h@hunter.com"):
    """Hunter (pessoa física que indica) e o login dele."""
    p = parceiro(db, nome, kind="hunter")
    return p, usuario(db, "hunter", email, partner=p)


def oportunidade(db, p: Partner, **campos) -> PartnerOpportunity:
    dados = dict(
        title="Etilômetros Empresa A", deal_type="Nova Venda",
        sector="Indústrias de Transformação", relationship_type="Prospect",
        context="Precisa de etilômetros para a frota", cnpj=CNPJ_A,
        company_name="Empresa A",
    )
    dados.update(campos)
    op = PartnerOpportunity(partner_id=p.id, **dados)
    db.add(op)
    db.commit()
    db.refresh(op)
    return op


CNPJ_FILIAL_A = "11222333000262"  # mesma raiz do CNPJ_A, outra unidade


def vendas(db):
    """Boards 6 (Prospecção, com a lista Lead Novo) e 7 (Aquisição), como em produção."""
    from types import SimpleNamespace
    from app.models.board import Board
    from app.models.list import List

    db.add_all([Board(id=6, name="Prospecção"), Board(id=7, name="Aquisição")])
    db.commit()
    lead_novo = List(board_id=6, name="Lead Novo", position=0)
    proposta = List(board_id=7, name="Proposta", position=0)
    db.add_all([lead_novo, proposta])
    db.commit()
    return SimpleNamespace(lead_novo=lead_novo, proposta=proposta)


def cliente(db, documento: str = CNPJ_A):
    from app.models.client import Client

    c = Client(name="Empresa A", company_name="Empresa A", document=documento,
               sector="Indústrias de Transformação", relationship_type="Prospect")
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


def card_de_vendas(db, lista, documento: str = CNPJ_A, **campos):
    """Card de Vendas com cliente; `criado_ha` (dias) recua o created_at."""
    from datetime import datetime, timedelta
    from app.models.card import Card

    criado_ha = campos.pop("criado_ha", 0)
    c = Card(title="Card Empresa A", list_id=lista.id, client_id=cliente(db, documento).id, **campos)
    c.created_at = datetime.utcnow() - timedelta(days=criado_ha)
    db.add(c)
    db.commit()
    db.refresh(c)
    return c
