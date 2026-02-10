#!/usr/bin/env python3
"""
Script para importar APENAS notes e activities do Pipedrive.
Vincula aos cards existentes através do pipedrive_deal_id guardado em contact_info.

Uso:
    python scripts/import_notes_activities.py
"""

import sys
import os
import csv
from pathlib import Path
from datetime import datetime
from typing import Dict, Optional

# Adiciona o diretório raiz ao path
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy import text
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.card import Card
from app.models.card_note import CardNote
from app.models.activity import Activity
from app.models.user import User


class NotesActivitiesImporter:
    """Classe para importar notes e activities do Pipedrive"""

    def __init__(self, db: Session, scripts_dir: str):
        """
        Inicializa o importador

        Args:
            db: Sessão do banco de dados
            scripts_dir: Diretório onde estão os CSVs
        """
        self.db = db
        self.scripts_dir = Path(scripts_dir)

        # Cache de mapeamentos
        self.pipedrive_to_card_map: Dict[str, int] = {}  # pipedrive_deal_id -> card_id
        self.user_name_to_id_map: Dict[str, int] = {}  # user_name -> user_id

        # Estatísticas
        self.stats = {
            'notes_total': 0,
            'notes_imported': 0,
            'notes_skipped_no_card': 0,
            'notes_skipped_duplicate': 0,
            'notes_skipped_example': 0,
            'activities_total': 0,
            'activities_imported': 0,
            'activities_skipped_no_card': 0,
            'activities_skipped_duplicate': 0,
            'activities_skipped_no_subject': 0,
        }

    def build_pipedrive_to_card_map(self) -> None:
        """
        Constrói mapeamento de pipedrive_deal_id para card_id.
        Busca no campo JSON contact_info.
        """
        print("\n🔍 Construindo mapeamento de deals do Pipedrive para Cards...")

        # Query para buscar todos os cards que têm pipedrive_deal_id no contact_info
        query = text("""
            SELECT id, contact_info->>'pipedrive_deal_id' as pipedrive_deal_id
            FROM cards
            WHERE contact_info->>'pipedrive_deal_id' IS NOT NULL
        """)

        result = self.db.execute(query)

        for row in result:
            card_id = row.id
            pipedrive_deal_id = row.pipedrive_deal_id
            self.pipedrive_to_card_map[pipedrive_deal_id] = card_id

        print(f"   ✅ {len(self.pipedrive_to_card_map)} cards mapeados com pipedrive_deal_id")

    def get_or_cache_user_id(self, user_name: str) -> Optional[int]:
        """
        Busca ou retorna do cache o ID do usuário pelo nome.

        Args:
            user_name: Nome do usuário

        Returns:
            ID do usuário ou None se não encontrado
        """
        if not user_name:
            return None

        # Retorna do cache se já buscamos
        if user_name in self.user_name_to_id_map:
            return self.user_name_to_id_map[user_name]

        # Busca no banco (case-insensitive)
        user = self.db.query(User).filter(User.name.ilike(f"%{user_name}%")).first()

        user_id = user.id if user else None
        self.user_name_to_id_map[user_name] = user_id

        return user_id

    def read_csv(self, filename: str) -> list:
        """
        Lê um arquivo CSV e retorna lista de dicionários

        Args:
            filename: Nome do arquivo CSV

        Returns:
            Lista de dicionários com os dados
        """
        filepath = self.scripts_dir / filename

        if not filepath.exists():
            print(f"   ❌ Arquivo {filename} não encontrado!")
            return []

        data = []
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                data.append(row)

        return data

    def parse_datetime(self, date_str: str) -> Optional[datetime]:
        """
        Converte string de data para datetime

        Args:
            date_str: String da data

        Returns:
            Objeto datetime ou None
        """
        if not date_str or date_str.strip() == '':
            return None

        # Tenta vários formatos
        formats = [
            '%Y-%m-%d %H:%M:%S',
            '%Y-%m-%d',
            '%d/%m/%Y %H:%M:%S',
            '%d/%m/%Y',
        ]

        for fmt in formats:
            try:
                return datetime.strptime(date_str.strip(), fmt)
            except ValueError:
                continue

        return None

    def import_notes(self, csv_filename: str) -> None:
        """
        Importa notas do CSV do Pipedrive

        Args:
            csv_filename: Nome do arquivo CSV de notes
        """
        print(f"\n📝 Importando notas de {csv_filename}...")

        notes_data = self.read_csv(csv_filename)

        if not notes_data:
            print("   ⚠️  Nenhuma nota encontrada no CSV")
            return

        total = len(notes_data)
        self.stats['notes_total'] = total
        print(f"   Total de notas no CSV: {total}")

        for idx, note_data in enumerate(notes_data, 1):
            content = note_data.get('Conteúdo', '').strip()

            # Pula notas vazias
            if not content:
                continue

            # Pula exemplos do Pipedrive
            if content.startswith('[Exemplo]'):
                self.stats['notes_skipped_example'] += 1
                continue

            # Busca o ID do negócio no Pipedrive
            pipedrive_deal_id = note_data.get('ID do negócio', '').strip()

            if not pipedrive_deal_id:
                self.stats['notes_skipped_no_card'] += 1
                continue

            # Busca o card correspondente
            card_id = self.pipedrive_to_card_map.get(pipedrive_deal_id)

            if not card_id:
                self.stats['notes_skipped_no_card'] += 1
                continue

            # Verifica se já existe nota com mesmo conteúdo para este card
            existing = self.db.query(CardNote).filter(
                CardNote.card_id == card_id,
                CardNote.content == content
            ).first()

            if existing:
                self.stats['notes_skipped_duplicate'] += 1
                continue

            # Busca usuário que criou a nota
            user_name = note_data.get('Usuário', '').strip()
            user_id = self.get_or_cache_user_id(user_name)

            # Se não encontrou usuário, usa admin (ID 1) como fallback
            if not user_id:
                user_id = 1

            # Parse das datas
            created_at = self.parse_datetime(note_data.get('Data adicionada'))
            updated_at = self.parse_datetime(note_data.get('Atualizado em'))

            # Cria a nota
            note = CardNote(
                card_id=card_id,
                user_id=user_id,
                content=content,
            )

            # Define datas manualmente se vieram do CSV
            if created_at:
                note.created_at = created_at
            if updated_at:
                note.updated_at = updated_at

            self.db.add(note)
            self.stats['notes_imported'] += 1

            # Commit em lote a cada 500 notas
            if idx % 500 == 0:
                self.db.commit()
                print(f"   Progresso: {idx}/{total} notas processadas... (Importadas: {self.stats['notes_imported']})")

        # Commit final
        self.db.commit()
        print(f"   ✅ {self.stats['notes_imported']} notas importadas")

    def import_activities(self, csv_filename: str) -> None:
        """
        Importa atividades do CSV do Pipedrive

        Args:
            csv_filename: Nome do arquivo CSV de activities
        """
        print(f"\n📅 Importando atividades de {csv_filename}...")

        activities_data = self.read_csv(csv_filename)

        if not activities_data:
            print("   ⚠️  Nenhuma atividade encontrada no CSV")
            return

        total = len(activities_data)
        self.stats['activities_total'] = total
        print(f"   Total de atividades no CSV: {total}")

        for idx, activity_data in enumerate(activities_data, 1):
            subject = activity_data.get('Assunto', '').strip()

            # Pula atividades sem assunto
            if not subject:
                self.stats['activities_skipped_no_subject'] += 1
                continue

            # Busca o ID do negócio no Pipedrive
            pipedrive_deal_id = activity_data.get('ID do negócio', '').strip()

            if not pipedrive_deal_id:
                self.stats['activities_skipped_no_card'] += 1
                continue

            # Busca o card correspondente
            card_id = self.pipedrive_to_card_map.get(pipedrive_deal_id)

            if not card_id:
                self.stats['activities_skipped_no_card'] += 1
                continue

            # Tipo de atividade
            activity_type_raw = activity_data.get('Tipo', 'Chamada').strip()
            # Normaliza para lowercase
            activity_type = activity_type_raw.lower() if activity_type_raw else 'chamada'

            # Nota/Descrição adicional
            note = activity_data.get('Nota', '').strip()

            # Monta a descrição combinando assunto e nota
            description = subject
            if note and note != subject:
                description = f"{subject} - {note}"

            # Verifica se já existe atividade com mesma descrição
            existing = self.db.query(Activity).filter(
                Activity.card_id == card_id,
                Activity.description == description,
                Activity.activity_type == activity_type
            ).first()

            if existing:
                self.stats['activities_skipped_duplicate'] += 1
                continue

            # Busca usuário atribuído
            user_name = activity_data.get('Atribuído a usuário', '').strip()
            user_id = self.get_or_cache_user_id(user_name)

            # Se não encontrou, tenta o criador
            if not user_id:
                creator_name = activity_data.get('Criado por', '').strip()
                user_id = self.get_or_cache_user_id(creator_name)

            # Monta metadados com informações adicionais
            is_completed = activity_data.get('Concluído', '').strip() == 'Concluído'
            completed_at = self.parse_datetime(activity_data.get('Data e hora de conclusão'))

            activity_metadata = {
                'is_completed': is_completed,
                'completed_at': completed_at.isoformat() if completed_at else None,
                'due_date': activity_data.get('Data de vencimento', '').strip(),
                'due_time': activity_data.get('Horário de vencimento', '').strip(),
                'duration': activity_data.get('Duração', '').strip(),
                'location': activity_data.get('Localização', '').strip(),
                'priority': activity_data.get('Prioridade', '').strip(),
                'pipedrive_type': activity_type_raw,
                'imported_from': 'pipedrive_csv',
            }

            # Remove campos vazios do metadata
            activity_metadata = {k: v for k, v in activity_metadata.items() if v}

            # Cria a atividade
            activity = Activity(
                card_id=card_id,
                user_id=user_id,
                activity_type=activity_type,
                description=description,
                activity_metadata=activity_metadata,
            )

            # Define created_at se veio do CSV
            created_at = self.parse_datetime(activity_data.get('Data adicionada'))
            if created_at:
                activity.created_at = created_at

            self.db.add(activity)
            self.stats['activities_imported'] += 1

            # Commit em lote a cada 500 atividades
            if idx % 500 == 0:
                self.db.commit()
                print(f"   Progresso: {idx}/{total} atividades processadas... (Importadas: {self.stats['activities_imported']})")

        # Commit final
        self.db.commit()
        print(f"   ✅ {self.stats['activities_imported']} atividades importadas")

    def print_summary(self) -> None:
        """Imprime resumo da importação"""
        print("\n" + "=" * 80)
        print("📊 RESUMO DA IMPORTAÇÃO")
        print("=" * 80)

        print("\n📝 NOTAS:")
        print(f"   Total no CSV: {self.stats['notes_total']}")
        print(f"   ✅ Importadas: {self.stats['notes_imported']}")
        print(f"   ⏭️  Ignoradas (sem card): {self.stats['notes_skipped_no_card']}")
        print(f"   ⏭️  Ignoradas (duplicadas): {self.stats['notes_skipped_duplicate']}")
        print(f"   ⏭️  Ignoradas (exemplos): {self.stats['notes_skipped_example']}")

        print("\n📅 ATIVIDADES:")
        print(f"   Total no CSV: {self.stats['activities_total']}")
        print(f"   ✅ Importadas: {self.stats['activities_imported']}")
        print(f"   ⏭️  Ignoradas (sem card): {self.stats['activities_skipped_no_card']}")
        print(f"   ⏭️  Ignoradas (duplicadas): {self.stats['activities_skipped_duplicate']}")
        print(f"   ⏭️  Ignoradas (sem assunto): {self.stats['activities_skipped_no_subject']}")

        print("\n" + "=" * 80)


def main():
    """Função principal"""
    print("\n" + "=" * 80)
    print("🚀 IMPORTAÇÃO DE NOTES E ACTIVITIES DO PIPEDRIVE")
    print("=" * 80)
    print("\nEste script importa APENAS notes e activities,")
    print("vinculando aos cards existentes através do pipedrive_deal_id.")
    print()

    # Diretório dos scripts (onde estão os CSVs)
    scripts_dir = Path(__file__).parent

    # Arquivos CSV
    notes_csv = "notes-21427617-55.csv"
    activities_csv = "activities-21427617-56.csv"

    # Verifica se os arquivos existem
    if not (scripts_dir / notes_csv).exists():
        print(f"❌ Erro: Arquivo {notes_csv} não encontrado em {scripts_dir}")
        sys.exit(1)

    if not (scripts_dir / activities_csv).exists():
        print(f"❌ Erro: Arquivo {activities_csv} não encontrado em {scripts_dir}")
        sys.exit(1)

    print(f"📂 Diretório: {scripts_dir}")
    print(f"📄 Notes CSV: {notes_csv}")
    print(f"📄 Activities CSV: {activities_csv}")
    print()

    # Confirmação
    confirm = input("Digite 'IMPORTAR' para continuar ou qualquer outra coisa para cancelar: ")

    if confirm != 'IMPORTAR':
        print("\n❌ Operação cancelada.")
        return

    # Inicia importação
    db = SessionLocal()

    try:
        importer = NotesActivitiesImporter(db, str(scripts_dir))

        # 1. Constrói mapeamento de pipedrive_deal_id para card_id
        importer.build_pipedrive_to_card_map()

        # 2. Importa notes
        importer.import_notes(notes_csv)

        # 3. Importa activities
        importer.import_activities(activities_csv)

        # 4. Mostra resumo
        importer.print_summary()

        print("\n✅ IMPORTAÇÃO CONCLUÍDA COM SUCESSO!\n")

    except KeyboardInterrupt:
        print("\n\n❌ Importação cancelada (Ctrl+C)")
        db.rollback()
        sys.exit(1)

    except Exception as e:
        print(f"\n❌ Erro durante importação: {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
        sys.exit(1)

    finally:
        db.close()


if __name__ == "__main__":
    main()
