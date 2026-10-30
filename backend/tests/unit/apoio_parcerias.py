"""Apoio dos testes de Parcerias: perfis, logins, parceiros e oportunidades."""
from datetime import date

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
    p = Partner(name=nome, **campos)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


def parceiro_pronto(db, nome: str = "Dmap", stage: str = "ativacao") -> Partner:
    """Parceiro com todos os dados que as travas do board 1 pedem."""
    dono = usuario(db, "manager", f"dono-{nome.lower()}@hs.com")
    return parceiro(
        db, nome, stage=stage,
        main_contact_name="Carlos", main_contact_phone="11999990000",
        hs_owner_id=dono.id, qualification_status="aderente",
        onboarding_date=date(2026, 10, 1),
    )


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
