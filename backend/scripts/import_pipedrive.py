"""
Script para importar dados do Pipedrive para o HSGrowth CRM.
Importa deals, pessoas, organizações e atividades.

Configuração:
    1. Obtenha sua API key do Pipedrive em: Settings > Personal Preferences > API
    2. Configure a variável PIPEDRIVE_API_KEY ou passe como argumento

Uso:
    python scripts/import_pipedrive.py --api-key=<sua_api_key> --account-id=<account_id>
    python scripts/import_pipedrive.py --help
"""
import sys
import argparse
from pathlib import Path
from typing import Optional, Dict, List, Tuple
import requests
from datetime import datetime

# Adiciona o diretório raiz ao path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.account import Account
from app.models.user import User
from app.models.board import Board
from app.models.list import List
from app.models.card import Card
from loguru import logger


class PipedriveImporter:
    """Importador de dados do Pipedrive"""

    def __init__(self, api_key: str, db: Session):
        self.api_key = api_key
        self.db = db
        self.base_url = "https://api.pipedrive.com/v1"

        # Mapeamento de dados importados
        self.user_map = {}  # pipedrive_user_id -> our_user_id
        self.deal_map = {}  # pipedrive_deal_id -> our_card_id

    def _make_request(self, endpoint: str, params: Optional[Dict] = None) -> Dict:
        """
        Faz requisição à API do Pipedrive.

        Args:
            endpoint: Endpoint da API (ex: /deals)
            params: Parâmetros adicionais

        Returns:
            Dict com resposta da API
        """
        url = f"{self.base_url}{endpoint}"

        # Adiciona API key aos parâmetros
        if params is None:
            params = {}
        params["api_token"] = self.api_key

        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Erro na requisição para {endpoint}: {e}")
            raise

    def get_users(self) -> List[Dict]:
        """Busca usuários do Pipedrive"""
        logger.info("Buscando usuários do Pipedrive...")
        response = self._make_request("/users")

        if response.get("success"):
            users = response.get("data", [])
            logger.success(f"{len(users)} usuários encontrados")
            return users

        return []

    def get_deals(self, status: str = "all_not_deleted") -> List[Dict]:
        """
        Busca deals do Pipedrive.

        Args:
            status: Status dos deals (all_not_deleted, open, won, lost)

        Returns:
            Lista de deals
        """
        logger.info(f"Buscando deals (status: {status})...")

        deals = []
        start = 0
        limit = 100

        while True:
            response = self._make_request(
                "/deals",
                params={"status": status, "start": start, "limit": limit}
            )

            if not response.get("success"):
                break

            batch = response.get("data", [])
            if not batch:
                break

            deals.extend(batch)

            # Verifica se tem mais páginas
            pagination = response.get("additional_data", {}).get("pagination", {})
            if not pagination.get("more_items_in_collection"):
                break

            start = pagination.get("next_start", start + limit)

        logger.success(f"{len(deals)} deals encontrados")
        return deals

    def import_users(self, account: Account, pipedrive_users: List[Dict]) -> Dict[int, User]:
        """
        Importa usuários do Pipedrive.

        Args:
            account: Account onde os usuários serão criados
            pipedrive_users: Lista de usuários do Pipedrive

        Returns:
            Dicionário mapeando pipedrive_user_id -> User
        """
        logger.info("Importando usuários...")

        user_map = {}

        for pd_user in pipedrive_users:
            # Verifica se já existe usuário com este email
            email = pd_user.get("email")
            if not email:
                logger.warning(f"Usuário {pd_user.get('name')} sem email, ignorando...")
                continue

            existing = self.db.query(User).filter(User.email == email).first()
            if existing:
                logger.info(f"Usuário {email} já existe, usando existente")
                user_map[pd_user["id"]] = existing
                continue

            # Cria novo usuário
            from app.core.security import hash_password
            import secrets

            user = User(
                name=pd_user.get("name", "Usuário Importado"),
                email=email,
                password=hash_password(secrets.token_urlsafe(16)),  # Senha aleatória
                role="salesperson",  # Padrão: vendedor
                account_id=account.id,
                is_active=pd_user.get("active_flag", True),
                is_deleted=False
            )

            self.db.add(user)
            user_map[pd_user["id"]] = user

            logger.success(f"Usuário importado: {email}")

        self.db.commit()

        # Refresh
        for user in user_map.values():
            self.db.refresh(user)

        logger.success(f"{len(user_map)} usuários importados")
        self.user_map = user_map
        return user_map

    def import_board(self, account: Account) -> Tuple[Board, List[List]]:
        """
        Cria board para importação do Pipedrive.

        Args:
            account: Account onde o board será criado

        Returns:
            Tupla (Board, List of Lists)
        """
        logger.info("Criando board para importação...")

        # Verifica se já existe
        board = self.db.query(Board).filter(
            Board.name == "Importação Pipedrive",
            Board.account_id == account.id
        ).first()

        if board:
            logger.info(f"Board 'Importação Pipedrive' já existe (ID: {board.id})")
            lists = self.db.query(List).filter(List.board_id == board.id).order_by(List.position).all()
            return board, lists

        # Cria board
        board = Board(
            name="Importação Pipedrive",
            description="Deals importados do Pipedrive",
            account_id=account.id
        )
        self.db.add(board)
        self.db.commit()
        self.db.refresh(board)

        # Cria listas padrão
        lists_data = [
            "Leads",
            "Qualificação",
            "Proposta",
            "Negociação",
            "Ganho",
            "Perdido"
        ]

        lists = []
        for i, name in enumerate(lists_data):
            list_obj = List(
                name=name,
                position=i,
                board_id=board.id
            )
            self.db.add(list_obj)
            lists.append(list_obj)

        self.db.commit()

        for list_obj in lists:
            self.db.refresh(list_obj)

        logger.success(f"Board e {len(lists)} listas criados")
        return board, lists

    def import_deals(
        self,
        board: Board,
        lists: List[List],
        pipedrive_deals: List[Dict],
        user_map: Dict[int, User]
    ) -> List[Card]:
        """
        Importa deals do Pipedrive como cards.

        Args:
            board: Board onde os cards serão criados
            lists: Listas do board
            pipedrive_deals: Lista de deals do Pipedrive
            user_map: Mapeamento de usuários

        Returns:
            Lista de cards criados
        """
        logger.info("Importando deals...")

        cards = []

        # Mapeia status do Pipedrive para nossas listas
        status_to_list = {
            "won": lists[4],       # Ganho
            "lost": lists[5],      # Perdido
            "open": lists[0],      # Leads (padrão para deals abertos)
        }

        for pd_deal in pipedrive_deals:
            # Determina lista baseada no status
            status = pd_deal.get("status", "open")
            list_obj = status_to_list.get(status, lists[0])

            # Determina stage
            stage_map = {
                "won": "won",
                "lost": "lost",
                "open": "lead"
            }
            stage = stage_map.get(status, "lead")

            # Busca responsável
            owner_id = pd_deal.get("user_id", {}).get("id") if isinstance(pd_deal.get("user_id"), dict) else pd_deal.get("user_id")
            assigned_to = user_map.get(owner_id)

            # Cria card
            card = Card(
                title=pd_deal.get("title", "Deal sem título"),
                description=pd_deal.get("notes", ""),
                list_id=list_obj.id,
                assigned_to_id=assigned_to.id if assigned_to else None,
                stage=stage,
                value=float(pd_deal.get("value", 0) or 0),
                position=len(cards),  # Posição incremental
                created_at=datetime.fromisoformat(pd_deal.get("add_time", datetime.utcnow().isoformat()).replace("Z", "+00:00")) if pd_deal.get("add_time") else datetime.utcnow()
            )

            self.db.add(card)
            cards.append(card)

            # Mapeia para referência futura
            self.deal_map[pd_deal["id"]] = card

        self.db.commit()

        # Refresh
        for card in cards:
            self.db.refresh(card)

        logger.success(f"{len(cards)} deals importados como cards")
        return cards

    def run_import(self, account_id: int):
        """
        Executa importação completa do Pipedrive.

        Args:
            account_id: ID da account onde importar os dados
        """
        logger.info("=" * 60)
        logger.info("INICIANDO IMPORTAÇÃO DO PIPEDRIVE")
        logger.info("=" * 60)

        # Busca account
        account = self.db.query(Account).filter(Account.id == account_id).first()
        if not account:
            logger.error(f"Account {account_id} não encontrada!")
            return

        logger.info(f"Importando para account: {account.name} (ID: {account.id})")

        try:
            # 1. Buscar dados do Pipedrive
            logger.info("\n[1/4] Buscando dados do Pipedrive...")
            pipedrive_users = self.get_users()
            pipedrive_deals = self.get_deals()

            # 2. Importar usuários
            logger.info("\n[2/4] Importando usuários...")
            user_map = self.import_users(account, pipedrive_users)

            # 3. Criar board e listas
            logger.info("\n[3/4] Criando board e listas...")
            board, lists = self.import_board(account)

            # 4. Importar deals
            logger.info("\n[4/4] Importando deals...")
            cards = self.import_deals(board, lists, pipedrive_deals, user_map)

            # Resumo
            logger.info("\n" + "=" * 60)
            logger.success("IMPORTAÇÃO CONCLUÍDA COM SUCESSO!")
            logger.info("=" * 60)
            logger.info("\n📊 RESUMO:")
            logger.info(f"  ✓ Usuários importados: {len(user_map)}")
            logger.info(f"  ✓ Board criado: {board.name}")
            logger.info(f"  ✓ Listas criadas: {len(lists)}")
            logger.info(f"  ✓ Deals importados: {len(cards)}")
            logger.info("\n⚠️  IMPORTANTE: Os usuários importados receberam senhas aleatórias.")
            logger.info("   Use o recurso de reset de senha para definir novas senhas.")
            logger.info("=" * 60)

        except Exception as e:
            logger.error(f"\n❌ Erro durante importação: {e}")
            import traceback
            logger.error(traceback.format_exc())
            self.db.rollback()
            raise


def main():
    """Função principal"""
    parser = argparse.ArgumentParser(
        description="Importa dados do Pipedrive para o HSGrowth CRM"
    )
    parser.add_argument(
        "--api-key",
        required=True,
        help="API Key do Pipedrive (obtido em Settings > Personal Preferences > API)"
    )
    parser.add_argument(
        "--account-id",
        type=int,
        required=True,
        help="ID da account onde importar os dados"
    )

    args = parser.parse_args()

    db = SessionLocal()

    try:
        importer = PipedriveImporter(api_key=args.api_key, db=db)
        importer.run_import(account_id=args.account_id)
    finally:
        db.close()


if __name__ == "__main__":
    main()
