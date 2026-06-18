"""
Reset dos dados de TESTE do módulo de Serviços.

Apaga TODOS os cards de serviço e, em consequência:
  - service_card_activities (atividades, anotações, arquivos)
  - service_card_products (produtos / aparelhos)
  - call_logs de serviço (linhas com service_card_id preenchido)

MANTÉM o board e as etapas (service_boards e service_lists) — o funil
continua configurado e vazio, pronto para uso real. Também NÃO toca em
Clientes/Pessoas/Produtos (compartilhados com Vendas), nem no role "Serviço".

⚠️  ATENÇÃO: opera no banco configurado em app.db.session — no setup local,
    isso é o banco de PRODUÇÃO. FAÇA BACKUP ANTES de rodar com --confirm.

Uso:
    python scripts/reset_service_data.py            # dry-run: só mostra o que seria apagado
    python scripts/reset_service_data.py --confirm  # apaga de fato (após o backup!)
"""
import sys
from pathlib import Path

# Adiciona o diretório raiz (backend/) ao path para importar o pacote app
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text

from app.db.session import SessionLocal


def main() -> None:
    confirm = "--confirm" in sys.argv
    db = SessionLocal()
    try:
        def count(sql: str) -> int:
            return db.execute(text(sql)).scalar() or 0

        n_cards = count("SELECT count(*) FROM service_cards")
        n_acts = count("SELECT count(*) FROM service_card_activities")
        n_prods = count("SELECT count(*) FROM service_card_products")
        n_calls = count("SELECT count(*) FROM call_logs WHERE service_card_id IS NOT NULL")
        n_boards = count("SELECT count(*) FROM service_boards")
        n_lists = count("SELECT count(*) FROM service_lists")

        print("=== Dados de Serviço encontrados ===")
        print(f"  service_cards (cards de teste):     {n_cards}")
        print(f"  service_card_activities:            {n_acts}")
        print(f"  service_card_products:              {n_prods}")
        print(f"  call_logs (ligações de serviço):    {n_calls}")
        print(f"  [MANTIDO] service_boards:           {n_boards}")
        print(f"  [MANTIDO] service_lists (etapas):   {n_lists}")
        print()

        if n_cards == 0 and n_acts == 0 and n_prods == 0 and n_calls == 0:
            print("Nada de serviço para apagar. Encerrando.")
            return

        if not confirm:
            print("DRY-RUN — nada foi apagado.")
            print("Para apagar de fato (depois do backup!):")
            print("    python scripts/reset_service_data.py --confirm")
            return

        print("Apagando dados de serviço (board e etapas serão mantidos)...")
        # Ordem: filhos antes do pai (robusto, mesmo se a cascata não estiver
        # ativa no nível do banco).
        d_calls = db.execute(text("DELETE FROM call_logs WHERE service_card_id IS NOT NULL")).rowcount
        d_acts = db.execute(text("DELETE FROM service_card_activities")).rowcount
        d_prods = db.execute(text("DELETE FROM service_card_products")).rowcount
        d_cards = db.execute(text("DELETE FROM service_cards")).rowcount
        db.commit()

        print("✓ Concluído:")
        print(f"  call_logs de serviço removidos:  {d_calls}")
        print(f"  atividades removidas:            {d_acts}")
        print(f"  produtos removidos:              {d_prods}")
        print(f"  cards removidos:                 {d_cards}")
        print(f"  board e etapas mantidos:         {n_boards} board(s) / {n_lists} etapa(s)")
    except Exception as e:
        db.rollback()
        print(f"ERRO — nada foi apagado (rollback): {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
