"""
Preenche o tipo de cobrança (business_info.collection_type) nos cards do GestorHS
que foram criados antes de a integração passar a derivá-lo do gatilho.

Regra (a mesma da integração, em COLLECTION_TYPE_POR_SOURCE):
    gestorhs.calibracao  -> "a_vencer"   (vencendo em 50 dias)
    gestorhs.atrasados   -> "atrasados"  (carga de vencidos)
    gestorhs.os          -> não recebe (board de Serviços não tem tipo de cobrança)

Roda em SIMULAÇÃO por padrão (não grava). Para aplicar: --aplicar.

    cd backend && python -m scripts.retroagir_tipo_cobranca_gestorhs
    cd backend && python -m scripts.retroagir_tipo_cobranca_gestorhs --aplicar

Idempotente e não-destrutivo: só preenche cards cujo collection_type está vazio.
Nunca sobrescreve um valor já definido (nem o que um vendedor tenha ajustado à mão).
"""
import argparse
from collections import Counter

from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.models.service_card import ServiceCard
from app.services.integration_card_service import COLLECTION_TYPE_POR_SOURCE


def _cards_alvo(db: Session):
    return (
        db.query(ServiceCard)
        .filter(
            ServiceCard.external_source.in_(list(COLLECTION_TYPE_POR_SOURCE.keys())),
            ServiceCard.is_deleted.is_(False),
        )
        .order_by(ServiceCard.id)
        .all()
    )


def processar(db: Session, aplicar: bool) -> dict:
    resumo = Counter()
    for card in _cards_alvo(db):
        alvo = COLLECTION_TYPE_POR_SOURCE.get(card.external_source)
        bi = dict(card.business_info or {})
        atual = bi.get("collection_type")

        if atual:
            resumo[f"{card.external_source}: ja tinha ({atual})"] += 1
            continue

        resumo[f"{card.external_source}: preenche -> {alvo}"] += 1
        if aplicar:
            bi["collection_type"] = alvo
            card.business_info = bi
            flag_modified(card, "business_info")  # JSON: sinaliza mudança ao ORM

    if aplicar:
        db.commit()
    return dict(resumo)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--aplicar", action="store_true", help="grava de verdade (sem a flag, só simula)")
    args = ap.parse_args()

    from app.db.session import SessionLocal

    db = SessionLocal()
    try:
        resumo = processar(db, args.aplicar)
        print()
        print("=" * 60)
        print("  APLICANDO" if args.aplicar else "  SIMULAÇÃO (nada gravado)")
        print("=" * 60)
        total_preenche = 0
        for chave in sorted(resumo):
            print(f"  {chave:<44} {resumo[chave]:>5}")
            if "preenche" in chave:
                total_preenche += resumo[chave]
        print("-" * 60)
        print(f"  cards a preencher: {total_preenche}")
        print()
        if not args.aplicar:
            print("  Para aplicar: python -m scripts.retroagir_tipo_cobranca_gestorhs --aplicar")
            print()
    finally:
        db.close()


if __name__ == "__main__":
    main()
