"""
Avisa o GestorHS sobre os cards gestorhs.os que JÁ estão em Ganho.

O gatilho automático (move_card) só cobre Ganhos futuros. Este script cobre os
que fecharam antes dele existir, chamando o mesmo endpoint inbound (idempotente).

Simulação por padrão. Para aplicar: --aplicar

    cd backend && python -m scripts.retroagir_ganho_gestorhs
    cd backend && python -m scripts.retroagir_ganho_gestorhs --aplicar

Número da proposta: usa business_info.proposal_number do card; se ausente, usa
PROPOSTA_RETROATIVO_PADRAO (2 — proposta interna de teste do GestorHS para os
cards antigos, que fecharam sem o campo). A caixa avança de qualquer forma.
"""
import argparse
from typing import List, Optional

from sqlalchemy import or_, func
from sqlalchemy.orm import Session

from app.models.service_card import ServiceCard
from app.models.service_list import ServiceList
from app.services.service_board_service import deal_value_by_card

# Proposta interna do GestorHS usada como referência nos cards antigos sem número.
PROPOSTA_RETROATIVO_PADRAO = 2


def _brl(valor: float) -> str:
    return f"{valor:,.2f}".replace(",", "§").replace(".", ",").replace("§", ".")


def cards_em_ganho(db: Session) -> List[ServiceCard]:
    """Cards gestorhs.os, não deletados, cuja lista é de Ganho (is_done_stage ou nome 'ganho')."""
    ganho_list_ids = [
        l.id for l in db.query(ServiceList.id).filter(
            or_(
                ServiceList.is_done_stage.is_(True),
                func.lower(ServiceList.name).like("%ganho%"),
            )
        ).all()
    ]
    if not ganho_list_ids:
        return []
    return (
        db.query(ServiceCard)
        .filter(
            ServiceCard.external_source == "gestorhs.os",
            ServiceCard.external_id.isnot(None),
            ServiceCard.is_deleted.is_(False),
            ServiceCard.list_id.in_(ganho_list_ids),
        )
        .order_by(ServiceCard.id)
        .all()
    )


def numero_para_envio(business_info: Optional[dict]) -> int:
    pn = (business_info or {}).get("proposal_number")
    try:
        if pn not in (None, "") and int(pn) > 0:
            return int(pn)
    except (TypeError, ValueError):
        pass
    return PROPOSTA_RETROATIVO_PADRAO


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--aplicar", action="store_true", help="chama o GestorHS de verdade (sem a flag, só simula)")
    args = ap.parse_args()

    from app.db.session import SessionLocal
    from app.integrations import gestorhs_client

    db = SessionLocal()
    try:
        cards = cards_em_ganho(db)
        print()
        print("=" * 66)
        print("  APLICANDO" if args.aplicar else "  SIMULAÇÃO (nada enviado)")
        print("=" * 66)
        print(f"  cards gestorhs.os em Ganho: {len(cards)}")
        print(f"  integração ativa (envs):    {gestorhs_client.integracao_ativa()}")
        print()
        ok = erro = 0
        for c in cards:
            numero = numero_para_envio(c.business_info)
            valor = deal_value_by_card(db, [c.id]).get(c.id, 0.0)
            obs = f"Ganho no GrowthHS (retroativo) — card #{c.id} · R$ {_brl(valor)}"
            print(f"  card {c.id}  caixa={c.external_id}  proposta={numero}  R$ {_brl(valor)}")
            if args.aplicar:
                try:
                    gestorhs_client.mover_caixa_ganho(c.external_id, numero, obs)
                    ok += 1
                except Exception as e:  # noqa: BLE001 — um card ruim não para a carga
                    erro += 1
                    print(f"    ERRO: {e}")
        print()
        if args.aplicar:
            print(f"  enviados OK: {ok}  |  erros: {erro}")
        else:
            print("  Nada enviado. Para aplicar: python -m scripts.retroagir_ganho_gestorhs --aplicar")
        print()
    finally:
        db.close()


if __name__ == "__main__":
    main()
