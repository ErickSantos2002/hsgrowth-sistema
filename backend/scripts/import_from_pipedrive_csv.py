#!/usr/bin/env python3
"""
Script para importar dados dos CSVs exportados do Pipedrive para o HSGrowth CRM.

Importa:
- Products → products
- Organizations → clients
- People → persons
- Leads → leads
- Deals → cards
- Notes → card_notes
- Activities → activities

Uso:
    python scripts/import_from_pipedrive_csv.py
"""

import sys
import os
import csv
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional
from decimal import Decimal

# Adiciona o diretório raiz ao path
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.user import User
from app.models.role import Role
from app.models.board import Board
from app.models.list import List as BoardList
from app.models.client import Client
from app.models.product import Product
from app.models.card import Card
from app.models.person import Person
from app.models.lead import Lead
from app.models.card_note import CardNote
from app.models.activity import Activity


class PipedriveCSVImporter:
    """Classe para importar dados dos CSVs do Pipedrive"""

    def __init__(self, csv_dir: str):
        """
        Inicializa o importador

        Args:
            csv_dir: Diretório onde estão os CSVs
        """
        self.csv_dir = Path(csv_dir)
        self.db = SessionLocal()

        # Mapeamento de IDs: Pipedrive -> HSGrowth
        self.user_map: Dict[str, int] = {}  # username -> user_id
        self.org_map: Dict[int, int] = {}  # organization_id -> client_id
        self.person_map: Dict[int, int] = {}  # person_id -> person_id
        self.product_map: Dict[int, int] = {}  # product_id -> product_id
        self.board_map: Dict[str, int] = {}  # pipeline_name -> board_id
        self.stage_map: Dict[str, int] = {}  # stage_name -> list_id
        self.lead_map: Dict[str, int] = {}  # lead_id -> lead_id
        self.deal_map: Dict[int, int] = {}  # deal_id -> card_id

        # Board para leads
        self.leads_board_id: Optional[int] = None
        self.leads_list_map: Dict[str, int] = {}  # status -> list_id

        # Estatísticas
        self.stats = {
            "users": 0,
            "organizations": 0,
            "persons": 0,
            "products": 0,
            "boards": 0,
            "lists": 0,
            "leads": 0,
            "deals": 0,
            "notes": 0,
            "activities": 0,
        }

    def read_csv(self, filename: str) -> List[Dict]:
        """
        Lê um arquivo CSV e retorna lista de dicionários

        Args:
            filename: Nome do arquivo CSV

        Returns:
            Lista de dicionários com os dados
        """
        filepath = self.csv_dir / filename
        if not filepath.exists():
            print(f"   ⚠️  Arquivo {filename} não encontrado, pulando...")
            return []

        data = []
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                data.append(row)

        return data

    def get_or_create_user(self, owner_name: str) -> int:
        """
        Busca ou cria usuário baseado no nome do proprietário

        Args:
            owner_name: Nome do proprietário

        Returns:
            ID do usuário
        """
        if not owner_name or owner_name in ["", "Nicholson"]:
            # Retorna admin como padrão
            admin = self.db.query(User).filter(User.email == "admin@hsgrowth.com").first()
            if admin:
                return admin.id

        # Verifica se já mapeamos
        if owner_name in self.user_map:
            return self.user_map[owner_name]

        # Busca usuário pelo nome
        user = self.db.query(User).filter(User.name == owner_name).first()

        if not user:
            # Cria novo usuário
            role = self.db.query(Role).filter(Role.name == "salesperson").first()
            if not role:
                role = Role(name="salesperson", description="Vendedor")
                self.db.add(role)
                self.db.commit()
                self.db.refresh(role)

            # Gera email a partir do nome
            email = owner_name.lower().replace(" ", ".") + "@hsgrowth.com"

            user = User(
                email=email,
                username=owner_name.lower().replace(" ", ""),
                name=owner_name,
                role_id=role.id,
                is_active=True,
                hashed_password="$2b$12$temporary_password_needs_reset",
            )
            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)

            self.stats["users"] += 1

        self.user_map[owner_name] = user.id
        return user.id

    def import_products(self) -> None:
        """Importa produtos do CSV"""
        print("\n📥 Importando produtos...")

        products_data = self.read_csv("products-21427617-48.csv")

        for pd_product in products_data:
            product_id = int(pd_product["ID"])
            name = pd_product["Nome"]

            if not name:
                continue

            # Verifica se já existe
            existing = self.db.query(Product).filter(Product.name == name).first()
            if existing:
                self.product_map[product_id] = existing.id
                continue

            # Extrai preço
            price_str = pd_product.get("Preço (BRL)", "0").strip()
            try:
                unit_price = float(price_str) if price_str else 0.0
            except:
                unit_price = 0.0

            # SKU vazio vira None para evitar conflito de UNIQUE constraint
            sku = pd_product.get("Código do produto")
            sku = sku if sku and sku.strip() else None

            product = Product(
                name=name,
                description=pd_product.get("Descrição") or None,
                sku=sku,
                unit_price=unit_price,
                currency="BRL",
                category=pd_product.get("Categoria") or None,
                is_active=pd_product.get("Ativo") == "Sim",
            )

            self.db.add(product)
            self.db.flush()  # Flush para pegar o ID sem commit

            self.product_map[product_id] = product.id
            self.stats["products"] += 1

        # Commit único no final
        self.db.commit()
        print(f"   ✅ {self.stats['products']} produtos importados")

    def import_organizations(self) -> None:
        """Importa organizações como Clients"""
        print("\n📥 Importando organizações (clientes)...")

        orgs_data = self.read_csv("organizations-21427617-46.csv")

        total = len(orgs_data)
        print(f"   Total de organizações no CSV: {total}")

        for idx, org in enumerate(orgs_data, 1):
            org_id = int(org["ID"])
            name = org["Nome"]

            if not name or name.startswith("[Exemplo]"):
                continue

            # Monta endereço
            address_parts = []
            if org.get("Nome da rua de Endereço"):
                address_parts.append(org["Nome da rua de Endereço"])
            if org.get("Número da casa de Endereço"):
                address_parts.append(org["Número da casa de Endereço"])

            address = ", ".join(address_parts) if address_parts else None

            # Documento - trunca para 20 caracteres se for muito grande
            # Alguns registros do Pipedrive têm múltiplos CNPJs concatenados
            document = org.get("CNPJ")
            if document and len(document) > 20:
                # Pega só o primeiro CNPJ (primeiros 18 caracteres geralmente)
                document = document[:20]

            client = Client(
                name=name,
                company_name=name,
                document=document,
                address=address,
                city=org.get("Cidade/município/vila/localidade de Endereço"),
                state=org.get("Estado de Endereço"),
                country=org.get("País de Endereço", "Brasil"),
                is_active=True,
                source="pipedrive",
            )

            self.db.add(client)

            # Commit em lote a cada 100 registros
            if idx % 100 == 0:
                self.db.commit()
                print(f"   Progresso: {idx}/{total} organizações processadas...")

            # Precisa fazer flush para pegar o ID sem commit
            if idx % 100 != 0:
                self.db.flush()

            self.org_map[org_id] = client.id
            self.stats["organizations"] += 1

        # Commit final para os registros restantes
        self.db.commit()

        print(f"   ✅ {self.stats['organizations']} organizações importadas")

    def import_people(self) -> None:
        """Importa pessoas como Persons"""
        print("\n📥 Importando pessoas...")

        people_data = self.read_csv("people-21427617-47.csv")

        total = len(people_data)
        print(f"   Total de pessoas no CSV: {total}")

        for idx, person_data in enumerate(people_data, 1):
            person_id = int(person_data["ID"])
            name = person_data["Nome"]

            if not name:
                continue

            # Consolida telefone (prioriza celular)
            phone = (
                person_data.get("Telefone - Celular") or
                person_data.get("Telefone - Trabalho") or
                person_data.get("Telefone - Residencial") or
                person_data.get("Telefone - Outros")
            )

            # Consolida email
            email = (
                person_data.get("E-mail - Trabalho") or
                person_data.get("E-mail - Residencial") or
                person_data.get("E-mail - Outros")
            )

            # Organização
            org_id_str = person_data.get("ID da organização")
            org_id = int(org_id_str) if org_id_str else None
            organization_id = self.org_map.get(org_id) if org_id else None

            # Proprietário
            owner_name = person_data.get("Proprietário")
            owner_id = self.get_or_create_user(owner_name) if owner_name else None

            person = Person(
                name=name,
                first_name=person_data.get("Primeiro nome"),
                last_name=person_data.get("Sobrenome"),
                email=email,
                phone=phone,
                position=person_data.get("Cargo"),
                linkedin=person_data.get("Linkedin"),
                organization_id=organization_id,
                owner_id=owner_id,
                is_active=True,
                pipedrive_id=person_id,
            )

            self.db.add(person)

            # Commit em lote a cada 100 registros
            if idx % 100 == 0:
                self.db.commit()
                print(f"   Progresso: {idx}/{total} pessoas processadas...")
            else:
                self.db.flush()

            self.person_map[person_id] = person.id
            self.stats["persons"] += 1

        # Commit final
        self.db.commit()
        print(f"   ✅ {self.stats['persons']} pessoas importadas")

    def create_leads_board(self) -> None:
        """Cria board e lists para leads"""
        print("\n📥 Criando funil de leads...")

        # Verifica se já existe
        existing_board = self.db.query(Board).filter(Board.name == "Funil de Leads").first()
        if existing_board:
            self.leads_board_id = existing_board.id
        else:
            board = Board(
                name="Funil de Leads",
                description="Funil para gerenciar leads importados do Pipedrive",
                color="#8b5cf6",
                icon="🎯",
                is_deleted=False,
            )
            self.db.add(board)
            self.db.commit()
            self.db.refresh(board)
            self.leads_board_id = board.id
            self.stats["boards"] += 1

        # Cria listas para cada status
        statuses = [
            ("not_viewed", "Não Visualizado", 1),
            ("qualified", "Qualificado", 2),
            ("converted", "Convertido", 3),
            ("lost", "Perdido", 4),
        ]

        for status, name, position in statuses:
            existing_list = self.db.query(BoardList).filter(
                BoardList.board_id == self.leads_board_id,
                BoardList.name == name
            ).first()

            if existing_list:
                self.leads_list_map[status] = existing_list.id
            else:
                board_list = BoardList(
                    board_id=self.leads_board_id,
                    name=name,
                    position=position,
                    color=None,
                    is_done_stage=status == "converted",
                    is_lost_stage=status == "lost",
                )
                self.db.add(board_list)
                self.db.commit()
                self.db.refresh(board_list)
                self.leads_list_map[status] = board_list.id
                self.stats["lists"] += 1

        print(f"   ✅ Funil de leads criado")

    def import_leads(self) -> None:
        """Importa leads do CSV"""
        print("\n📥 Importando leads...")

        # Cria funil de leads primeiro
        self.create_leads_board()

        leads_data = self.read_csv("leads-21427617-44.csv")

        total = len(leads_data)
        print(f"   Total de leads no CSV: {total}")

        for idx, lead_data in enumerate(leads_data, 1):
            lead_id = lead_data["ID"]
            title = lead_data["Título"]

            if not title:
                continue

            # Valor
            value_str = lead_data.get("Valor", "0")
            try:
                value = float(value_str) if value_str else 0.0
            except:
                value = 0.0

            # Proprietário
            owner_name = lead_data.get("Proprietário")
            owner_id = self.get_or_create_user(owner_name) if owner_name else None

            # Pessoa
            person_id_str = lead_data.get("ID da pessoa de contato")
            person_id = int(person_id_str) if person_id_str else None
            person_db_id = self.person_map.get(person_id) if person_id else None

            # Organização
            org_id_str = lead_data.get("ID da organização")
            org_id = int(org_id_str) if org_id_str else None
            organization_id = self.org_map.get(org_id) if org_id else None

            # Status (todos vem como "Não visualizado" inicialmente)
            status = "not_viewed"
            if lead_data.get("Visto") == "Visualizado":
                status = "qualified"

            # Lista correspondente ao status
            list_id = self.leads_list_map.get(status)

            # Campos customizados
            custom_fields = {}
            if lead_data.get("CNPJ"):
                custom_fields["cnpj"] = lead_data["CNPJ"]
            if lead_data.get("Site"):
                custom_fields["site"] = lead_data["Site"]
            if lead_data.get("[IC] Segmento"):
                custom_fields["segmento"] = lead_data["[IC] Segmento"]

            lead = Lead(
                title=title,
                value=value,
                currency=lead_data.get("Moeda", "BRL"),
                source=lead_data.get("Fonte", "Import"),
                owner_id=owner_id,
                person_id=person_db_id,
                organization_id=organization_id,
                board_id=self.leads_board_id,
                list_id=list_id,
                status=status,
                is_archived=lead_data.get("Status de arquivamento") != "Não arquivado",
                custom_fields=custom_fields if custom_fields else None,
                pipedrive_id=lead_id,
            )

            self.db.add(lead)

            # Commit em lote a cada 100 registros
            if idx % 100 == 0:
                self.db.commit()
                print(f"   Progresso: {idx}/{total} leads processados...")
            else:
                self.db.flush()

            self.lead_map[lead_id] = lead.id
            self.stats["leads"] += 1

        # Commit final
        self.db.commit()
        print(f"   ✅ {self.stats['leads']} leads importados")

    def create_deals_boards(self, deals_data: List[Dict]) -> None:
        """Cria boards e lists baseado nos funis e etapas dos deals"""
        print("\n📥 Criando funis de vendas (boards)...")

        # Extrai funis e etapas únicos
        pipelines = {}
        for deal in deals_data:
            pipeline = deal.get("Funil")
            stage = deal.get("Etapa")

            if not pipeline or not stage:
                continue

            if pipeline not in pipelines:
                pipelines[pipeline] = set()

            pipelines[pipeline].add(stage)

        # Cria boards e lists
        for pipeline_name, stages in pipelines.items():
            # Cria board
            existing_board = self.db.query(Board).filter(Board.name == pipeline_name).first()
            if existing_board:
                board = existing_board
            else:
                board = Board(
                    name=pipeline_name,
                    description=f"Funil importado do Pipedrive",
                    color="#3b82f6",
                    icon="📊",
                    is_deleted=False,
                )
                self.db.add(board)
                self.db.commit()
                self.db.refresh(board)
                self.stats["boards"] += 1

            self.board_map[pipeline_name] = board.id

            # Cria lists (stages)
            for idx, stage_name in enumerate(sorted(stages), start=1):
                stage_key = f"{pipeline_name}::{stage_name}"

                existing_list = self.db.query(BoardList).filter(
                    BoardList.board_id == board.id,
                    BoardList.name == stage_name
                ).first()

                if existing_list:
                    board_list = existing_list
                else:
                    board_list = BoardList(
                        board_id=board.id,
                        name=stage_name,
                        position=idx,
                        color=None,
                        is_done_stage=False,
                        is_lost_stage=False,
                    )
                    self.db.add(board_list)
                    self.db.commit()
                    self.db.refresh(board_list)
                    self.stats["lists"] += 1

                self.stage_map[stage_key] = board_list.id

        print(f"   ✅ {self.stats['boards']} boards e {self.stats['lists']} listas criados")

    def import_deals(self) -> None:
        """Importa deals como Cards"""
        print("\n📥 Importando deals (negócios)...")

        deals_data = self.read_csv("deals-21427617-45.csv")

        # Cria boards/lists primeiro
        self.create_deals_boards(deals_data)

        total = len(deals_data)
        print(f"   Total de deals no CSV: {total}")

        for idx, deal in enumerate(deals_data, 1):
            deal_id = int(deal["ID"])
            title = deal["Título"]

            if not title:
                continue

            # Funil e Etapa
            pipeline = deal.get("Funil")
            stage = deal.get("Etapa")
            stage_key = f"{pipeline}::{stage}"

            list_id = self.stage_map.get(stage_key)
            if not list_id:
                print(f"   ⚠️  Deal '{title}' sem etapa mapeada, pulando...")
                continue

            # Valor
            value_str = deal.get("Valor", "0")
            try:
                value = float(value_str) if value_str else 0.0
            except:
                value = 0.0

            # Proprietário
            owner_name = deal.get("Proprietário")
            owner_id = self.get_or_create_user(owner_name) if owner_name else None

            # Organização
            org_id_str = deal.get("ID da organização")
            org_id = int(org_id_str) if org_id_str else None
            client_id = self.org_map.get(org_id) if org_id else None

            # Pessoa de contato
            person_id_str = deal.get("ID da pessoa de contato")
            person_id = int(person_id_str) if person_id_str else None
            person_db_id = self.person_map.get(person_id) if person_id else None

            # Monta contact_info a partir da pessoa
            contact_info = None
            if person_db_id:
                person = self.db.query(Person).get(person_db_id)
                if person:
                    contact_info = {
                        "name": person.name,
                        "email": person.email,
                        "phone": person.phone,
                    }

            # Status
            status = deal.get("Status", "open").lower()
            is_won = 1 if status == "ganho" else 0
            is_lost = status == "perdido"

            # Probabilidade
            prob_str = deal.get("Probabilidade", "0")
            try:
                probability = int(prob_str) if prob_str else None
            except:
                probability = None

            card = Card(
                list_id=list_id,
                client_id=client_id,
                assigned_to_id=owner_id,
                title=title,
                description=None,
                value=value,
                currency=deal.get("Moeda de Valor", "BRL"),
                contact_info=contact_info,
                is_won=is_won,
                is_lost=is_lost,
                probability=probability,
                position=0,
            )

            self.db.add(card)

            # Commit em lote a cada 100 registros
            if idx % 100 == 0:
                self.db.commit()
                print(f"   Progresso: {idx}/{total} deals processados...")
            else:
                self.db.flush()

            self.deal_map[deal_id] = card.id
            self.stats["deals"] += 1

        # Commit final
        self.db.commit()
        print(f"   ✅ {self.stats['deals']} deals importados")

    def import_notes(self) -> None:
        """Importa notas dos deals como CardNotes"""
        print("\n📥 Importando notas...")

        notes_data = self.read_csv("notes-21427617-50.csv")

        total = len(notes_data)
        print(f"   Total de notas no CSV: {total}")

        for idx, note_data in enumerate(notes_data, 1):
            content = note_data.get("Conteúdo")

            if not content or content.startswith("[Exemplo]"):
                continue

            # Verifica se tem deal associado
            deal_id_str = note_data.get("ID do negócio")
            if not deal_id_str:
                continue

            deal_id = int(deal_id_str)
            card_id = self.deal_map.get(deal_id)

            if not card_id:
                continue

            # Usuário autor
            user_name = note_data.get("Usuário")
            user_id = self.get_or_create_user(user_name) if user_name else None

            # Verifica se já existe nota com mesmo conteúdo
            existing = self.db.query(CardNote).filter(
                CardNote.card_id == card_id,
                CardNote.content == content
            ).first()

            if existing:
                continue

            note = CardNote(
                card_id=card_id,
                user_id=user_id,
                content=content,
            )

            self.db.add(note)

            # Commit em lote a cada 500 registros (notas são leves)
            if idx % 500 == 0:
                self.db.commit()
                print(f"   Progresso: {idx}/{total} notas processadas...")

            self.stats["notes"] += 1

        # Commit final
        self.db.commit()
        print(f"   ✅ {self.stats['notes']} notas importadas")

    def import_activities(self) -> None:
        """Importa atividades (opcional - se o modelo existir)"""
        print("\n📥 Importando atividades...")

        try:
            activities_data = self.read_csv("activities-21427617-49.csv")

            for activity_data in activities_data:
                subject = activity_data.get("Assunto")

                if not subject:
                    continue

                # Verifica se tem deal associado
                deal_id_str = activity_data.get("ID do negócio")
                if not deal_id_str:
                    continue

                deal_id = int(deal_id_str)
                card_id = self.deal_map.get(deal_id)

                if not card_id:
                    continue

                # Tipo
                activity_type = activity_data.get("Tipo", "Chamada").lower()

                # Status
                is_done = activity_data.get("Concluído") == "Concluído"

                # Usuário
                user_name = activity_data.get("Atribuído a usuário")
                user_id = self.get_or_create_user(user_name) if user_name else None

                # Nota/descrição
                note = activity_data.get("Nota")

                activity = Activity(
                    card_id=card_id,
                    user_id=user_id,
                    title=subject,
                    description=note,
                    activity_type=activity_type,
                    is_completed=is_done,
                )

                self.db.add(activity)
                self.db.commit()

                self.stats["activities"] += 1

            print(f"   ✅ {self.stats['activities']} atividades importadas")

        except Exception as e:
            print(f"   ⚠️  Erro ao importar atividades: {str(e)}")
            print(f"   ℹ️  Continuando sem atividades...")

    def run_import(self) -> None:
        """Executa a importação completa"""
        print("\n" + "=" * 80)
        print("🚀 Iniciando importação dos CSVs do Pipedrive para HSGrowth CRM")
        print("=" * 80)

        try:
            # Ordem de importação (respeita dependências)
            self.import_products()
            self.import_organizations()
            self.import_people()
            self.import_leads()
            self.import_deals()
            self.import_notes()
            self.import_activities()

            # Resumo
            print("\n" + "=" * 80)
            print("✅ IMPORTAÇÃO CONCLUÍDA COM SUCESSO!")
            print("=" * 80)
            print("\n📊 Estatísticas:")
            print(f"   - Usuários criados: {self.stats['users']}")
            print(f"   - Produtos: {self.stats['products']}")
            print(f"   - Organizações: {self.stats['organizations']}")
            print(f"   - Pessoas: {self.stats['persons']}")
            print(f"   - Boards: {self.stats['boards']}")
            print(f"   - Listas: {self.stats['lists']}")
            print(f"   - Leads: {self.stats['leads']}")
            print(f"   - Deals: {self.stats['deals']}")
            print(f"   - Notas: {self.stats['notes']}")
            print(f"   - Atividades: {self.stats['activities']}")
            print("\n")

        except Exception as e:
            print(f"\n❌ Erro durante importação: {str(e)}")
            import traceback
            traceback.print_exc()
            raise
        finally:
            self.db.close()


def main():
    """Função principal"""
    # Diretório dos CSVs
    csv_dir = Path(__file__).parent.parent / "pipedrive"

    if not csv_dir.exists():
        print(f"❌ Erro: Diretório {csv_dir} não encontrado!")
        print("\nCertifique-se de que os CSVs estão em: backend/pipedrive/")
        sys.exit(1)

    # Confirma importação
    print("\n" + "=" * 80)
    print("⚠️  ATENÇÃO: Este script irá importar dados dos CSVs do Pipedrive")
    print("=" * 80)
    print(f"\nDiretório: {csv_dir}")
    print("\nCertifique-se de que:")
    print("  1. O banco de dados está limpo (execute clean_database.py)")
    print("  2. As migrations foram executadas (alembic upgrade head)")
    print("  3. Os dados iniciais foram criados (execute init_database.py)")
    print()

    confirm = input("Digite 'IMPORTAR' para continuar: ")

    if confirm != "IMPORTAR":
        print("\n❌ Operação cancelada.")
        return

    # Inicia importação
    try:
        importer = PipedriveCSVImporter(str(csv_dir))
        importer.run_import()

    except KeyboardInterrupt:
        print("\n\n❌ Importação cancelada (Ctrl+C)")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Erro fatal: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
