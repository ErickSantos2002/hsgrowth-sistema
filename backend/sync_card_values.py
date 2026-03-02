"""
Script utilitário: Sincroniza card.value com (produtos + frete) para todos os cards.
Executar uma única vez após adicionar o campo shipping_cost.

Uso:
    cd backend
    python sync_card_values.py
"""
from app.db.session import SessionLocal
from app.models.card import Card
from app.services.product_service import ProductService


def run():
    db = SessionLocal()
    try:
        # Busca todos os cards não deletados
        cards = db.query(Card).filter(Card.deleted_at.is_(None)).all()
        total = len(cards)
        print(f"Sincronizando {total} cards...")

        service = ProductService(db)
        erros = 0

        for i, card in enumerate(cards, 1):
            try:
                service._sync_card_value_with_products(card.id)
                print(f"  [{i}/{total}] Card #{card.id} - OK")
            except Exception as e:
                erros += 1
                print(f"  [{i}/{total}] Card #{card.id} - ERRO: {e}")

        print(f"\nConcluído. {total - erros} atualizados, {erros} erros.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
