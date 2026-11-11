"""Campos de hunter, indicação e termos no parceiro."""
from app.models.partner import Partner
from tests.unit.apoio_parcerias import hunter, parceiro


def test_parceiro_novo_nasce_empresa_sem_indicador(db):
    p = Partner(name="X")
    db.add(p)
    db.commit()
    db.refresh(p)
    assert p.kind == "empresa"
    assert p.indicated_by_partner_id is None


def test_indicador_um_nivel(db):
    h, _ = hunter(db)
    a = parceiro(db, "A", indicated_by_partner_id=h.id)
    b = parceiro(db, "B", indicated_by_partner_id=a.id)
    assert b.indicated_by.id == a.id
    assert a.indicated_by.id == h.id
