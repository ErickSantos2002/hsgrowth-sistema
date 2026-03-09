#!/usr/bin/env python3
"""
Script para importar dados do Pipedrive para o HSGrowth CRM.
Importa: Organizações, Pessoas, Produtos, Deals (Cards), Atividades, etc.

Requisitos:
- pip install requests
- Configurar PIPEDRIVE_API_TOKEN no .env ou como variável de ambiente
"""

import sys
import os
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, List, Any
import time

# Adiciona o diretório raiz ao path
sys.path.append(str(Path(__file__).parent.parent))

try:
    import requests
except ImportError:
    print("❌ Erro: biblioteca 'requests' não encontrada.")
    print("Instale com: pip install requests")
    sys.exit(1)

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.user import User
from app.models.role import Role
from app.models.board import Board
from app.models.list import List as BoardList
from app.models.client import Client
from app.models.product import Product
from app.models.card import Card
from app.core.config import settings


class PipedriveImporter:
    """Classe para importar dados do Pipedrive"""

    def __init__(self, api_token: str, domain: str = "api.pipedrive.com"):
        """
        Inicializa o importador

        Args:
            api_token: Token da API do Pipedrive
            domain: Domínio da API (padrão: api.pipedrive.com)
        """
        self.api_token = api_token
        self.base_url = f"https://{domain}/v1"
        self.session = requests.Session()

        # Mapeamento de IDs: Pipedrive -> HSGrowth
        self.org_map: Dict[int, int] = {}  # organization_id -> client_id
        self.person_map: Dict[int, int] = {}  # person_id -> ?
        self.product_map: Dict[int, int] = {}  # product_id -> product_id
        self.deal_map: Dict[int, int] = {}  # deal_id -> card_id
        self.user_map: Dict[int, int] = {}  # user_id -> user_id
        self.stage_map: Dict[int, int] = {}  # stage_id -> list_id

        # Estatísticas
        self.stats = {
            "organizations": 0,
            "persons": 0,
            "products": 0,
            "deals": 0,
            "activities": 0,
            "users": 0,
        }

    def _request(self, endpoint: str, params: Optional[Dict] = None) -> Dict:
        """
        Faz requisição para a API do Pipedrive

        Args:
            endpoint: Endpoint da API (ex: /organizations)
            params: Parâmetros adicionais

        Returns:
            Resposta JSON da API
        """
        if params is None:
            params = {}

        params["api_token"] = self.api_token

        url = f"{self.base_url}{endpoint}"
        response = self.session.get(url, params=params)

        if response.status_code != 200:
            raise Exception(f"Erro na API: {response.status_code} - {response.text}")

        data = response.json()

        if not data.get("success"):
            raise Exception(f"API retornou erro: {data}")

        return data

    def _get_all_paginated(self, endpoint: str) -> List[Dict]:
        """
        Busca todos os itens de um endpoint paginado

        Args:
            endpoint: Endpoint da API

        Returns:
            Lista com todos os itens
        """
        items = []
        start = 0
        limit = 100

        while True:
            print(f"   Buscando items {start} - {start + limit}...")
            data = self._request(endpoint, {"start": start, "limit": limit})

            if not data.get("data"):
                break

            items.extend(data["data"])

            # Verifica se há mais páginas
            pagination = data.get("additional_data", {}).get("pagination", {})
            if not pagination.get("more_items_in_collection"):
                break

            start = pagination.get("next_start", start + limit)
            time.sleep(0.2)  # Rate limiting

        return items

    def import_users(self, db: Session) -> None:
        """Importa usuários do Pipedrive"""
        print("\n📥 Importando usuários do Pipedrive...")

        users_data = self._get_all_paginated("/users")

        # Busca ou cria role de vendedor
        role = db.query(Role).filter(Role.name == "salesperson").first()
        if not role:
            role = Role(name="salesperson", description="Vendedor")
            db.add(role)
            db.commit()
            db.refresh(role)

        for pd_user in users_data:
            if not pd_user.get("active"):
                continue  # Pula usuários inativos

            # Verifica se já existe por email
            email = pd_user.get("email")
            if not email:
                continue

            existing = db.query(User).filter(User.email == email).first()
            if existing:
                self.user_map[pd_user["id"]] = existing.id
                continue

            # Cria novo usuário
            user = User(
                email=email,
                username=email.split("@")[0],
                name=pd_user.get("name", ""),
                phone=pd_user.get("phone"),
                role_id=role.id,
                is_active=pd_user.get("active", True),
                # Senha padrão - usuário precisará trocar
                hashed_password="$2b$12$temporary_password_needs_reset",
            )

            db.add(user)
            db.commit()
            db.refresh(user)

            self.user_map[pd_user["id"]] = user.id
            self.stats["users"] += 1

        print(f"   ✅ {self.stats['users']} usuários importados")

    def import_organizations(self, db: Session) -> None:
        """Importa organizações do Pipedrive como Clients"""
        print("\n📥 Importando organizações (clientes)...")

        orgs_data = self._get_all_paginated("/organizations")

        for org in orgs_data:
            # Verifica se já existe pelo nome
            name = org.get("name")
            if not name:
                continue

            # Cria cliente (organização)
            client = Client(
                name=name,
                company_name=name,
                document=None,  # Pipedrive não tem CNPJ padrão
                email=org.get("cc_email"),
                phone=None,  # Extrair do primeiro telefone se houver
                address=org.get("address"),
                city=org.get("address_locality"),
                state=org.get("address_admin_area_level_1"),
                country=org.get("address_country"),
                website=org.get("visible_to"),
                notes=None,
                is_active=org.get("active_flag", True),
            )

            db.add(client)
            db.commit()
            db.refresh(client)

            self.org_map[org["id"]] = client.id
            self.stats["organizations"] += 1

        print(f"   ✅ {self.stats['organizations']} organizações importadas")

    def import_products(self, db: Session) -> None:
        """Importa produtos do Pipedrive"""
        print("\n📥 Importando produtos...")

        products_data = self._get_all_paginated("/products")

        for pd_product in products_data:
            name = pd_product.get("name")
            if not name:
                continue

            # Extrai preço (pode ter múltiplas moedas)
            prices = pd_product.get("prices", [])
            unit_price = 0
            currency = "BRL"

            if prices:
                # Pega o primeiro preço
                price_obj = prices[0]
                unit_price = float(price_obj.get("price", 0))
                currency = price_obj.get("currency", "BRL")

            product = Product(
                name=name,
                description=pd_product.get("description"),
                sku=pd_product.get("code"),
                unit_price=unit_price,
                currency=currency,
                category=pd_product.get("category"),
                is_active=pd_product.get("active_flag", True),
            )

            db.add(product)
            db.commit()
            db.refresh(product)

            self.product_map[pd_product["id"]] = product.id
            self.stats["products"] += 1

        print(f"   ✅ {self.stats['products']} produtos importados")

    def import_pipeline_and_stages(self, db: Session) -> None:
        """Importa pipeline e stages como Board e Lists"""
        print("\n📥 Importando pipelines e stages...")

        pipelines_data = self._get_all_paginated("/pipelines")

        for pipeline in pipelines_data:
            # Cria board
            board = Board(
                name=pipeline.get("name", "Pipeline"),
                description=f"Importado do Pipedrive - Pipeline ID {pipeline['id']}",
                color="#3b82f6",
                icon="📊",
                is_deleted=False,
            )

            db.add(board)
            db.commit()
            db.refresh(board)

            # Busca stages deste pipeline
            stages_data = self._request(f"/pipelines/{pipeline['id']}/stages")

            if stages_data.get("data"):
                for idx, stage in enumerate(stages_data["data"]):
                    board_list = BoardList(
                        board_id=board.id,
                        name=stage.get("name", f"Stage {idx + 1}"),
                        position=idx + 1,
                        color=None,
                        is_done_stage=False,  # Pode ajustar manualmente depois
                        is_lost_stage=False,
                    )

                    db.add(board_list)
                    db.commit()
                    db.refresh(board_list)

                    self.stage_map[stage["id"]] = board_list.id

        print(f"   ✅ {len(self.stage_map)} stages importados")

    def import_deals(self, db: Session, default_user_id: int) -> None:
        """Importa deals do Pipedrive como Cards"""
        print("\n📥 Importando deals (negócios)...")

        deals_data = self._get_all_paginated("/deals")

        for deal in deals_data:
            title = deal.get("title")
            if not title:
                continue

            # Mapeia stage para list
            stage_id = deal.get("stage_id")
            list_id = self.stage_map.get(stage_id)

            if not list_id:
                print(f"   ⚠️  Deal '{title}' sem stage mapeado, pulando...")
                continue

            # Mapeia organização para client
            org_id = deal.get("org_id", {}).get("value") if isinstance(deal.get("org_id"), dict) else deal.get("org_id")
            client_id = self.org_map.get(org_id) if org_id else None

            # Mapeia usuário responsável
            user_id = deal.get("user_id", {}).get("id") if isinstance(deal.get("user_id"), dict) else deal.get("user_id")
            assigned_to_id = self.user_map.get(user_id, default_user_id)

            # Extrai informações de contato da pessoa
            contact_info = {}
            person_id = deal.get("person_id", {}).get("value") if isinstance(deal.get("person_id"), dict) else deal.get("person_id")

            if person_id:
                try:
                    person_data = self._request(f"/persons/{person_id}")
                    if person_data.get("data"):
                        person = person_data["data"]
                        contact_info = {
                            "name": person.get("name"),
                            "email": person.get("email", [{}])[0].get("value") if person.get("email") else None,
                            "phone": person.get("phone", [{}])[0].get("value") if person.get("phone") else None,
                        }
                except:
                    pass

            # Status do deal
            status = deal.get("status", "open")
            is_won = 1 if status == "won" else 0
            is_lost = status == "lost"

            card = Card(
                list_id=list_id,
                client_id=client_id,
                assigned_to_id=assigned_to_id,
                title=title,
                description=deal.get("notes"),
                value=float(deal.get("value", 0)) if deal.get("value") else None,
                currency=deal.get("currency", "BRL"),
                contact_info=contact_info if contact_info else None,
                is_won=is_won,
                is_lost=is_lost,
                due_date=None,  # Pipedrive usa expected_close_date
                position=deal.get("stage_order_nr", 0),
            )

            db.add(card)
            db.commit()
            db.refresh(card)

            self.deal_map[deal["id"]] = card.id
            self.stats["deals"] += 1

        print(f"   ✅ {self.stats['deals']} deals importados")

    def run_import(self, db: Session, default_user_id: int) -> None:
        """Executa a importação completa"""
        print("\n" + "=" * 80)
        print("🚀 Iniciando importação do Pipedrive para HSGrowth CRM")
        print("=" * 80)

        try:
            # Ordem de importação (respeita dependências)
            self.import_users(db)
            self.import_organizations(db)
            self.import_products(db)
            self.import_pipeline_and_stages(db)
            self.import_deals(db, default_user_id)

            # Resumo
            print("\n" + "=" * 80)
            print("✅ IMPORTAÇÃO CONCLUÍDA COM SUCESSO!")
            print("=" * 80)
            print("\n📊 Estatísticas:")
            print(f"   - Usuários: {self.stats['users']}")
            print(f"   - Organizações: {self.stats['organizations']}")
            print(f"   - Produtos: {self.stats['products']}")
            print(f"   - Deals: {self.stats['deals']}")
            print("\n")

        except Exception as e:
            print(f"\n❌ Erro durante importação: {str(e)}")
            import traceback
            traceback.print_exc()
            raise


def main():
    """Função principal"""

    # Busca API token do ambiente
    api_token = os.getenv("PIPEDRIVE_API_TOKEN")

    if not api_token:
        print("❌ Erro: PIPEDRIVE_API_TOKEN não configurado!")
        print("\nConfigura a variável de ambiente:")
        print("  export PIPEDRIVE_API_TOKEN='seu_token_aqui'")
        print("\nOu adicione no arquivo .env:")
        print("  PIPEDRIVE_API_TOKEN=seu_token_aqui")
        sys.exit(1)

    print("🔑 API Token encontrado!")

    # Domínio customizado (se houver)
    domain = os.getenv("PIPEDRIVE_DOMAIN", "api.pipedrive.com")

    # Confirma importação
    print("\n" + "=" * 80)
    print("⚠️  ATENÇÃO: Este script irá importar dados do Pipedrive")
    print("=" * 80)
    confirm = input("\nDigite 'IMPORTAR' para continuar: ")

    if confirm != "IMPORTAR":
        print("\n❌ Operação cancelada.")
        return

    # Busca usuário padrão
    db = SessionLocal()

    try:
        # Verifica se existe admin
        admin = db.query(User).filter(User.email == "admin@hsgrowth.com").first()

        if not admin:
            print("\n❌ Erro: Usuário admin não encontrado!")
            print("Execute primeiro a criação do usuário admin.")
            sys.exit(1)

        # Inicia importação
        importer = PipedriveImporter(api_token, domain)
        importer.run_import(db, admin.id)

    except KeyboardInterrupt:
        print("\n\n❌ Importação cancelada (Ctrl+C)")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Erro fatal: {str(e)}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
