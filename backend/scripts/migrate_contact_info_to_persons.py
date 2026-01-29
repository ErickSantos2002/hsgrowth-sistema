"""
Script de migração: contact_info (JSON) → persons (tabela)

Este script migra os dados de contact_info dos cards para a tabela persons,
vinculando cada card a uma pessoa existente ou criando uma nova pessoa.

Execução:
    python scripts/migrate_contact_info_to_persons.py

Funcionalidades:
- Busca pessoa existente por email (evita duplicatas)
- Cria nova pessoa se não encontrar
- Vincula card à pessoa (person_id)
- Gera log detalhado
- Gera relatório final
- Idempotente (pode rodar múltiplas vezes)
"""

import sys
import os
from datetime import datetime
from typing import Optional, Dict, Any, List, Tuple
import json

# Adiciona o diretório raiz ao path para importar módulos
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db.session import engine
from app.models.card import Card
from app.models.person import Person


class MigrationStats:
    """Estatísticas da migração"""

    def __init__(self):
        self.total_cards = 0
        self.cards_with_contact_info = 0
        self.persons_matched = 0
        self.persons_created = 0
        self.cards_migrated = 0
        self.cards_skipped = 0
        self.errors: List[Dict] = []
        self.start_time = datetime.now()

    def end_time_now(self):
        self.end_time = datetime.now()
        self.duration = self.end_time - self.start_time

    def print_report(self):
        """Imprime relatório final"""
        print("\n" + "="*60)
        print("RELATÓRIO DE MIGRAÇÃO: contact_info → persons")
        print("="*60)
        print(f"\nInício: {self.start_time.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Fim: {self.end_time.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Duração: {self.duration}")

        print(f"\n📊 ESTATÍSTICAS:")
        print(f"  Total de cards: {self.total_cards}")
        print(f"  Cards com contact_info: {self.cards_with_contact_info} ({self._percentage(self.cards_with_contact_info, self.total_cards)}%)")

        print(f"\n✅ RESULTADOS:")
        print(f"  Pessoas já existentes (matched): {self.persons_matched}")
        print(f"  Novas pessoas criadas: {self.persons_created}")
        print(f"  Cards migrados: {self.cards_migrated}")
        print(f"  Cards pulados (já migrados): {self.cards_skipped}")

        if self.errors:
            print(f"\n❌ ERROS: {len(self.errors)}")
            for error in self.errors[:10]:  # Mostra até 10 erros
                print(f"  - Card #{error['card_id']}: {error['error']}")
        else:
            print(f"\n✅ Nenhum erro!")

        print("\n" + "="*60)

    def _percentage(self, part, total):
        """Calcula percentual"""
        if total == 0:
            return 0
        return round((part / total) * 100, 1)


def find_person_by_email(db: Session, contact_info: Dict) -> Optional[Person]:
    """
    Busca pessoa existente por email.

    Prioridade de busca:
    1. email_commercial
    2. email_personal
    3. email (legado)
    4. email_alternative
    """
    emails_to_check = [
        contact_info.get('email_commercial'),
        contact_info.get('email_personal'),
        contact_info.get('email'),
        contact_info.get('email_alternative'),
    ]

    for email in emails_to_check:
        if not email or email.strip() == '':
            continue

        email_clean = email.strip().lower()

        # Busca em todos os campos de email da pessoa
        person = db.query(Person).filter(
            (Person.email == email_clean) |
            (Person.email_commercial == email_clean) |
            (Person.email_personal == email_clean) |
            (Person.email_alternative == email_clean)
        ).first()

        if person:
            return person

    return None


def create_person_from_contact_info(db: Session, contact_info: Dict, card: Card) -> Person:
    """
    Cria nova pessoa a partir do contact_info do card.
    """
    # Extrai dados do contact_info
    name = contact_info.get('name', '').strip() or 'Sem Nome'

    # Emails
    email_commercial = contact_info.get('email_commercial') or contact_info.get('email')
    email_personal = contact_info.get('email_personal')
    email_alternative = contact_info.get('email_alternative')

    # Telefones
    phone_commercial = contact_info.get('phone_commercial') or contact_info.get('phone')
    phone_whatsapp = contact_info.get('phone_whatsapp')
    phone_alternative = contact_info.get('phone_alternative')

    # Outros
    position = contact_info.get('position')
    linkedin = contact_info.get('linkedin')
    instagram = contact_info.get('instagram')
    facebook = contact_info.get('facebook')

    # Cria pessoa
    person = Person(
        name=name,
        email=email_commercial,  # Email principal = commercial
        email_commercial=email_commercial,
        email_personal=email_personal,
        email_alternative=email_alternative,
        phone=phone_whatsapp or phone_commercial,  # Phone principal = whatsapp ou commercial
        phone_commercial=phone_commercial,
        phone_whatsapp=phone_whatsapp,
        phone_alternative=phone_alternative,
        position=position,
        linkedin=linkedin,
        instagram=instagram,
        facebook=facebook,
        organization_id=card.client_id,  # Vincula à mesma organização do card
        owner_id=card.assigned_to_id,  # Mesmo responsável do card
        is_active=True
    )

    db.add(person)
    db.flush()  # Para obter o ID sem commit

    return person


def migrate_card(db: Session, card: Card, stats: MigrationStats, dry_run: bool = False) -> bool:
    """
    Migra um card: busca ou cria pessoa e vincula.

    Returns:
        True se migrou com sucesso, False se pulou
    """
    try:
        # Se já tem person_id, pula
        if card.person_id:
            stats.cards_skipped += 1
            return False

        # Se não tem contact_info, pula
        if not card.contact_info:
            stats.cards_skipped += 1
            return False

        # Busca pessoa existente
        person = find_person_by_email(db, card.contact_info)

        if person:
            # Pessoa existe, apenas vincula
            stats.persons_matched += 1
            print(f"  ✓ Card #{card.id} → Person #{person.id} (matched: {person.name})")
        else:
            # Pessoa não existe, cria nova
            person = create_person_from_contact_info(db, card.contact_info, card)
            stats.persons_created += 1
            print(f"  ✓ Card #{card.id} → Person #{person.id} (created: {person.name})")

        # Vincula card à pessoa
        if not dry_run:
            card.person_id = person.id

        stats.cards_migrated += 1
        return True

    except Exception as e:
        stats.errors.append({
            'card_id': card.id,
            'error': str(e)
        })
        print(f"  ✗ Card #{card.id}: ERRO - {e}")
        return False


def run_migration(dry_run: bool = False, batch_size: int = 100):
    """
    Executa a migração completa.

    Args:
        dry_run: Se True, não faz commit (apenas simula)
        batch_size: Tamanho do lote para commit
    """
    stats = MigrationStats()

    print("\n" + "="*60)
    print("INICIANDO MIGRAÇÃO: contact_info → persons")
    print("="*60)

    if dry_run:
        print("\n⚠️  MODO DRY-RUN: Nenhuma mudança será salva no banco!\n")
    else:
        print("\n✅ MODO PRODUÇÃO: Mudanças serão salvas no banco!\n")

    with Session(engine) as db:
        try:
            # Conta total de cards
            stats.total_cards = db.query(Card).count()
            stats.cards_with_contact_info = db.query(Card).filter(
                Card.contact_info.isnot(None)
            ).count()

            print(f"Total de cards: {stats.total_cards}")
            print(f"Cards com contact_info: {stats.cards_with_contact_info}")
            print(f"\nProcessando em lotes de {batch_size}...\n")

            # Busca cards com contact_info (paginado)
            offset = 0
            batch_num = 1

            while True:
                # Busca lote
                cards = db.query(Card).filter(
                    Card.contact_info.isnot(None)
                ).offset(offset).limit(batch_size).all()

                if not cards:
                    break

                print(f"\nLote #{batch_num} ({len(cards)} cards):")

                # Processa cada card do lote
                for card in cards:
                    migrate_card(db, card, stats, dry_run=dry_run)

                # Commit do lote
                if not dry_run:
                    db.commit()
                    print(f"  → Lote #{batch_num} salvo no banco")
                else:
                    db.rollback()
                    print(f"  → Lote #{batch_num} simulado (não salvo)")

                offset += batch_size
                batch_num += 1

            # Validação final
            if not dry_run:
                print("\n🔍 Validando migração...")
                cards_sem_person = db.query(Card).filter(
                    Card.contact_info.isnot(None),
                    Card.person_id.is_(None)
                ).count()

                if cards_sem_person > 0:
                    print(f"  ⚠️  {cards_sem_person} cards ainda sem person_id!")
                else:
                    print(f"  ✅ Todos os cards foram migrados!")

        except Exception as e:
            print(f"\n❌ ERRO CRÍTICO: {e}")
            db.rollback()
            raise

    # Relatório final
    stats.end_time_now()
    stats.print_report()

    # Salva log em arquivo
    log_filename = f"migration_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(log_filename, 'w', encoding='utf-8') as f:
        json.dump({
            'start_time': stats.start_time.isoformat(),
            'end_time': stats.end_time.isoformat(),
            'duration': str(stats.duration),
            'total_cards': stats.total_cards,
            'cards_with_contact_info': stats.cards_with_contact_info,
            'persons_matched': stats.persons_matched,
            'persons_created': stats.persons_created,
            'cards_migrated': stats.cards_migrated,
            'cards_skipped': stats.cards_skipped,
            'errors': stats.errors
        }, f, indent=2, ensure_ascii=False)

    print(f"\n📝 Log salvo em: {log_filename}")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description='Migra contact_info para persons')
    parser.add_argument('--dry-run', action='store_true', help='Simula migração sem salvar')
    parser.add_argument('--batch-size', type=int, default=100, help='Tamanho do lote')

    args = parser.parse_args()

    # Confirmação
    if not args.dry_run:
        print("\n⚠️  ATENÇÃO: Você está prestes a migrar os dados em PRODUÇÃO!")
        print("Esta operação irá:")
        print("  1. Buscar ou criar pessoas na tabela persons")
        print("  2. Vincular cada card a uma pessoa (person_id)")
        print("  3. Salvar as mudanças no banco de dados")

        confirm = input("\nDeseja continuar? (digite 'SIM' para confirmar): ")
        if confirm != "SIM":
            print("Migração cancelada.")
            sys.exit(0)

    run_migration(dry_run=args.dry_run, batch_size=args.batch_size)
