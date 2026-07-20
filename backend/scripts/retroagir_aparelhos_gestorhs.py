"""
Retroage os aparelhos já carregados pelo GestorHS para produtos do catálogo.

Contexto: os cards criados antes desta mudança guardam os aparelhos apenas em
`business_info["equipamentos"]`, exibidos em modo leitura — o vendedor tinha de
redigitar série, modelo, módulo e data dentro do produto. Este script lê aquele
mesmo dado e cria os vínculos `ServiceCardProduct` com os aparelhos já preenchidos.

Roda em **simulação por padrão**: imprime o que faria e não grava nada.

    # simulação (não grava)
    cd backend && python -m scripts.retroagir_aparelhos_gestorhs

    # aplicar de verdade
    cd backend && python -m scripts.retroagir_aparelhos_gestorhs --aplicar

    # restringir a uma origem
    cd backend && python -m scripts.retroagir_aparelhos_gestorhs --source gestorhs.atrasados

É **idempotente**: rodar de novo não duplica vínculo, e não toca em card cujo produto
o vendedor já montou à mão (ver `aplicar_aparelhos_ao_card`).
"""
import argparse
from collections import Counter
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.service_product import ServiceProduct
from app.models.service_card import ServiceCard
from app.services.gestorhs_product_resolver import (
    EXTERNAL_SOURCE,
    aplicar_aparelhos_ao_card,
    normalizar_modelo,
)


def _cards_da_integracao(db: Session, source: Optional[str]) -> List[ServiceCard]:
    q = db.query(ServiceCard).filter(
        ServiceCard.external_source.isnot(None),
        ServiceCard.is_deleted.is_(False),
    )
    if source:
        q = q.filter(ServiceCard.external_source == source)
    return q.order_by(ServiceCard.id).all()


def _equipamentos(card: ServiceCard) -> List[Dict[str, Any]]:
    bi = card.business_info or {}
    if not isinstance(bi, dict):
        return []
    eq = bi.get("equipamentos")
    return eq if isinstance(eq, list) else []


def simular(db: Session, source: Optional[str]) -> Dict[str, Any]:
    """Percorre os cards e apura o que seria feito, sem gravar."""
    cards = _cards_da_integracao(db, source)

    existentes = {
        p.external_ref
        for p in db.query(ServiceProduct).filter(
            ServiceProduct.external_source == EXTERNAL_SOURCE,
            ServiceProduct.is_deleted.is_(False),
        )
    }

    modelos: Counter = Counter()
    cards_com_aparelhos = 0
    total_aparelhos = 0
    cards_sem_aparelhos = 0
    vinculos = 0
    sem_modelo = 0

    for card in cards:
        eq = _equipamentos(card)
        if not eq:
            cards_sem_aparelhos += 1
            continue
        cards_com_aparelhos += 1
        modelos_do_card = set()
        for d in eq:
            modelo = (d.get("model") or "").strip()
            if not modelo:
                sem_modelo += 1
                continue
            total_aparelhos += 1
            modelos[modelo] += 1
            modelos_do_card.add(normalizar_modelo(modelo))
        vinculos += len(modelos_do_card)

    a_criar = sorted(
        {m for m in modelos if normalizar_modelo(m) not in existentes},
        key=lambda m: -modelos[m],
    )

    return {
        "cards": len(cards),
        "cards_com_aparelhos": cards_com_aparelhos,
        "cards_sem_aparelhos": cards_sem_aparelhos,
        "total_aparelhos": total_aparelhos,
        "sem_modelo": sem_modelo,
        "vinculos": vinculos,
        "modelos": modelos,
        "produtos_a_criar": a_criar,
        "produtos_ja_existentes": len(existentes),
    }


def aplicar(db: Session, source: Optional[str]) -> Dict[str, int]:
    """Cria de fato os equipamentos e os vínculos. Commita por card."""
    cards = _cards_da_integracao(db, source)
    criados = 0
    cards_tocados = 0
    pulados = 0
    erros = 0

    for card in cards:
        eq = _equipamentos(card)
        if not eq:
            continue
        try:
            itens = aplicar_aparelhos_ao_card(db, card, eq)
            if itens:
                db.commit()
                criados += len(itens)
                cards_tocados += 1
            else:
                db.rollback()
                pulados += 1
        except Exception as e:  # noqa: BLE001 — um card ruim não pode parar a carga
            db.rollback()
            erros += 1
            print(f"  ERRO no card {card.id} ({card.external_source}:{card.external_id}): {e}")

    return {
        "cards_tocados": cards_tocados,
        "vinculos_criados": criados,
        "cards_pulados": pulados,
        "erros": erros,
    }


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--aplicar", action="store_true",
                    help="grava de verdade (sem esta flag, só simula)")
    ap.add_argument("--source", default=None,
                    help="restringe a uma origem, ex.: gestorhs.atrasados")
    args = ap.parse_args()

    from app.db.session import SessionLocal

    db = SessionLocal()
    try:
        r = simular(db, args.source)

        print()
        print("=" * 66)
        print("  SIMULAÇÃO" if not args.aplicar else "  APLICANDO")
        if args.source:
            print(f"  origem: {args.source}")
        print("=" * 66)
        print(f"  cards da integração:        {r['cards']}")
        print(f"    com aparelhos:            {r['cards_com_aparelhos']}")
        print(f"    sem aparelhos:            {r['cards_sem_aparelhos']}")
        print(f"  aparelhos a distribuir:     {r['total_aparelhos']}")
        if r["sem_modelo"]:
            print(f"    IGNORADOS (sem modelo):   {r['sem_modelo']}")
        print(f"  vínculos produto-card:      {r['vinculos']}")
        print(f"  produtos já existentes:     {r['produtos_ja_existentes']}")
        print(f"  produtos a criar:           {len(r['produtos_a_criar'])}")
        print()

        if r["produtos_a_criar"]:
            print("  Equipamentos que seriam criados em service_products "
                  "(categoria 'Equipamento GestorHS'):")
            print(f"  {'aparelhos':>9}  modelo")
            for m in r["produtos_a_criar"]:
                print(f"  {r['modelos'][m]:>9}  {m}")
            print()

        if not args.aplicar:
            print("  Nada foi gravado. Para aplicar:")
            print("    python -m scripts.retroagir_aparelhos_gestorhs --aplicar")
            print()
            return

        print("  Aplicando...")
        res = aplicar(db, args.source)
        print()
        print(f"  cards tocados:      {res['cards_tocados']}")
        print(f"  vínculos criados:   {res['vinculos_criados']}")
        print(f"  cards pulados:      {res['cards_pulados']}  (já tinham vínculo)")
        print(f"  erros:              {res['erros']}")
        print()
    finally:
        db.close()


if __name__ == "__main__":
    main()
