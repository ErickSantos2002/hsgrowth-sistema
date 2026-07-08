"""Seed de serviços de teste (idempotente). Cria Calibração 1-4 se não existirem."""
from app.db.session import SessionLocal
from app.models.service import Service

SEED = [
    ("Calibração 1", 100),
    ("Calibração 2", 200),
    ("Calibração 3", 300),
    ("Calibração 4", 400),
]


def run():
    db = SessionLocal()
    created = 0
    for name, price in SEED:
        exists = (
            db.query(Service)
            .filter(Service.name == name, Service.is_deleted == False)  # noqa: E712
            .first()
        )
        if not exists:
            db.add(Service(name=name, unit_price=price, category="Calibração", is_active=True))
            created += 1
    db.commit()
    print(f"seed_services: {created} criado(s)")


if __name__ == "__main__":
    run()
