"""
Script para popular o banco de dados com dados fictícios para desenvolvimento.
Cria usuários, boards, listas, cards e dados de gamificação realistas para sistema single-tenant.

Uso:
    docker-compose exec api python scripts/seed_database.py

    ou localmente:
    python scripts/seed_database.py
"""
import sys
from pathlib import Path
from datetime import datetime, timedelta
from random import randint, choice, random, uniform
from decimal import Decimal

# Adiciona o diretório raiz ao path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from faker import Faker
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.role import Role
from app.models.user import User
from app.models.client import Client
from app.models.board import Board
from app.models.list import List
from app.models.card import Card
from app.models.gamification_badge import GamificationBadge
from app.models.user_badge import UserBadge
from app.models.gamification_point import GamificationPoint
from app.models.gamification_ranking import GamificationRanking
from app.core.security import hash_password

# Inicializa Faker em português brasileiro
fake = Faker('pt_BR')


def create_roles(db: Session) -> dict:
    """Cria roles padrão do sistema"""
    print("📋 Criando roles...")

    roles_data = [
        {
            "name": "admin",
            "display_name": "Administrador",
            "description": "Acesso total ao sistema",
            "permissions": ["*"],
            "is_system_role": True
        },
        {
            "name": "manager",
            "display_name": "Gerente",
            "description": "Gerencia equipes e visualiza relatórios",
            "permissions": ["boards.*", "cards.*", "users.read", "reports.*"],
            "is_system_role": True
        },
        {
            "name": "salesperson",
            "display_name": "Vendedor",
            "description": "Gerencia seus próprios cards",
            "permissions": ["cards.read", "cards.create", "cards.update", "boards.read"],
            "is_system_role": True
        }
    ]

    roles = {}
    for role_data in roles_data:
        existing = db.query(Role).filter(Role.name == role_data["name"]).first()
        if existing:
            roles[role_data["name"]] = existing
            print(f"  ✓ Role '{role_data['name']}' já existe")
        else:
            role = Role(**role_data)
            db.add(role)
            roles[role_data["name"]] = role
            print(f"  ✓ Role '{role_data['name']}' criada")

    db.commit()
    for role in roles.values():
        db.refresh(role)

    return roles


def create_users(db: Session, roles: dict) -> list[User]:
    """Cria usuários de teste"""
    print(f"\n👥 Criando usuários...")

    all_users = []

    # 1 Admin
    admin_email = "admin@hsgrowth.com"
    existing_admin = db.query(User).filter(User.email == admin_email).first()
    if existing_admin:
        all_users.append(existing_admin)
        print(f"  ✓ Admin já existe: {admin_email}")
    else:
        admin = User(
            name="Admin HSGrowth",
            email=admin_email,
            password_hash=hash_password("admin123"),
            role_id=roles["admin"].id,
            is_active=True,
            is_deleted=False,
            phone=fake.phone_number()
        )
        db.add(admin)
        all_users.append(admin)
        print(f"  ✓ Admin criado: {admin_email}")

    # 2 Managers
    for i in range(2):
        manager_email = f"gerente{i+1}@hsgrowth.com"
        existing = db.query(User).filter(User.email == manager_email).first()
        if existing:
            all_users.append(existing)
            print(f"  ✓ Manager já existe: {manager_email}")
            continue

        manager = User(
            name=fake.name(),
            email=manager_email,
            password_hash=hash_password("gerente123"),
            role_id=roles["manager"].id,
            is_active=True,
            is_deleted=False,
            phone=fake.phone_number()
        )
        db.add(manager)
        all_users.append(manager)
        print(f"  ✓ Manager criado: {manager_email}")

    # 8 Vendedores
    for i in range(8):
        sales_email = f"vendedor{i+1}@hsgrowth.com"
        existing = db.query(User).filter(User.email == sales_email).first()
        if existing:
            all_users.append(existing)
            print(f"  ✓ Vendedor já existe: {sales_email}")
            continue

        salesperson = User(
            name=fake.name(),
            email=sales_email,
            password_hash=hash_password("vendedor123"),
            role_id=roles["salesperson"].id,
            is_active=True,
            is_deleted=False,
            phone=fake.phone_number()
        )
        db.add(salesperson)
        all_users.append(salesperson)
        print(f"  ✓ Vendedor criado: {sales_email}")

    db.commit()
    for user in all_users:
        db.refresh(user)

    return all_users


def create_clients(db: Session) -> list[Client]:
    """Cria clientes de teste"""
    print(f"\n👤 Criando clientes...")

    all_clients = []

    # Cria 30-40 clientes
    num_clients = randint(30, 40)

    for _ in range(num_clients):
        # 70% empresas, 30% pessoas físicas
        is_company = random() < 0.7

        if is_company:
            company_name = fake.company()
            contact_name = fake.name()
            document = fake.cnpj()
        else:
            company_name = None
            contact_name = fake.name()
            document = fake.cpf()

        email = fake.email()

        # Verifica se já existe (evita duplicatas)
        existing = db.query(Client).filter(Client.email == email).first()
        if existing:
            all_clients.append(existing)
            continue

        client = Client(
            name=contact_name,
            email=email,
            phone=fake.phone_number(),
            company_name=company_name,
            document=document,
            address=fake.street_address(),
            city=fake.city(),
            state=fake.estado_sigla(),
            country="Brasil",
            website=fake.url() if is_company else None,
            notes=fake.text(max_nb_chars=200) if random() < 0.3 else None,
            source="manual",
            is_active=True,
            is_deleted=False
        )
        db.add(client)
        all_clients.append(client)

    db.commit()
    for client in all_clients:
        db.refresh(client)

    print(f"  ✓ {num_clients} clientes criados")

    return all_clients


def create_boards_and_lists(db: Session) -> tuple[list[Board], list[List]]:
    """Cria boards e listas"""
    print(f"\n📊 Criando boards e listas...")

    all_boards = []
    all_lists = []

    board_templates = [
        {
            "name": "Pipeline de Vendas",
            "description": "Funil principal de vendas",
            "lists": [
                {"name": "Novos Leads", "position": 0},
                {"name": "Qualificação", "position": 1},
                {"name": "Proposta Enviada", "position": 2},
                {"name": "Negociação", "position": 3},
                {"name": "Ganho", "position": 4, "is_done_stage": True},
                {"name": "Perdido", "position": 5, "is_lost_stage": True}
            ]
        },
        {
            "name": "Atendimento ao Cliente",
            "description": "Gestão de tickets de suporte",
            "lists": [
                {"name": "Novo Ticket", "position": 0},
                {"name": "Em Andamento", "position": 1},
                {"name": "Aguardando Cliente", "position": 2},
                {"name": "Resolvido", "position": 3, "is_done_stage": True}
            ]
        },
        {
            "name": "Projetos Internos",
            "description": "Gestão de projetos da equipe",
            "lists": [
                {"name": "Backlog", "position": 0},
                {"name": "Em Desenvolvimento", "position": 1},
                {"name": "Em Revisão", "position": 2},
                {"name": "Concluído", "position": 3, "is_done_stage": True}
            ]
        }
    ]

    for template in board_templates:
        existing_board = db.query(Board).filter(Board.name == template["name"]).first()

        if existing_board:
            board = existing_board
            all_boards.append(board)
            print(f"  ✓ Board '{board.name}' já existe")
        else:
            board = Board(
                name=template["name"],
                description=template["description"]
            )
            db.add(board)
            db.commit()
            db.refresh(board)
            all_boards.append(board)
            print(f"  ✓ Board '{board.name}' criado")

        # Cria listas
        for list_data in template["lists"]:
            existing_list = db.query(List).filter(
                List.name == list_data["name"],
                List.board_id == board.id
            ).first()

            if existing_list:
                all_lists.append(existing_list)
                print(f"    • Lista '{list_data['name']}' já existe")
            else:
                list_obj = List(
                    name=list_data["name"],
                    position=list_data["position"],
                    board_id=board.id,
                    is_done_stage=list_data.get("is_done_stage", False),
                    is_lost_stage=list_data.get("is_lost_stage", False)
                )
                db.add(list_obj)
                all_lists.append(list_obj)
                print(f"    • Lista '{list_data['name']}' criada")

        db.commit()

    for list_obj in all_lists:
        db.refresh(list_obj)

    return all_boards, all_lists


def create_cards(db: Session, users: list[User], boards: list[Board], clients: list[Client]) -> list[Card]:
    """Cria cards realistas"""
    print(f"\n📇 Criando cards...")

    all_cards = []

    salespeople = [u for u in users if u.role.name == "salesperson"]

    if not salespeople:
        print(f"  ⚠ Nenhum vendedor encontrado")
        return all_cards

    if not clients:
        print(f"  ⚠ Nenhum cliente encontrado")
        return all_cards

    for board in boards:
        lists = db.query(List).filter(List.board_id == board.id).order_by(List.position).all()

        # 40-60 cards por board
        num_cards = randint(40, 60)
        print(f"  Board '{board.name}': criando {num_cards} cards")

        for i in range(num_cards):
            list_obj = choice(lists)
            assigned_user = choice(salespeople)
            client = choice(clients)

            value = round(uniform(1000, 50000), 2)

            # Status baseado na lista
            is_won = 0
            closed_at = None

            if list_obj.is_done_stage:
                is_won = 1
                closed_at = fake.date_time_between(start_date='-30d', end_date='now')
            elif list_obj.is_lost_stage:
                is_won = -1
                closed_at = fake.date_time_between(start_date='-30d', end_date='now')

            card = Card(
                title=f"{client.display_name} - {fake.catch_phrase()}",
                description=f"Oportunidade com {client.name} da empresa {client.company_name or 'N/A'}.\n\n{fake.text(max_nb_chars=200)}",
                list_id=list_obj.id,
                client_id=client.id,
                assigned_to_id=assigned_user.id,
                value=Decimal(str(value)),
                due_date=fake.date_time_between(start_date='now', end_date='+60d') if random() > 0.3 else None,
                contact_info={
                    "name": client.name,
                    "email": client.email,
                    "phone": client.phone,
                    "company": client.company_name
                },
                is_won=is_won,
                closed_at=closed_at,
                position=i
            )
            db.add(card)
            all_cards.append(card)

        db.commit()
        print(f"    ✓ {num_cards} cards criados")

    return all_cards


def create_gamification_data(db: Session, users: list[User]):
    """Cria badges, pontos e rankings"""
    print(f"\n🎮 Criando dados de gamificação...")

    # Badges
    print("\n  Criando badges...")
    badges_data = [
        {
            "name": "Primeiro Passo",
            "description": "Ganhou seu primeiro card",
            "criteria_type": "automatic",
            "criteria": {"field": "cards_won", "operator": ">=", "value": 1},
            "is_system_badge": True
        },
        {
            "name": "Vendedor Estrela",
            "description": "Alcançou 1000 pontos",
            "criteria_type": "automatic",
            "criteria": {"field": "total_points", "operator": ">=", "value": 1000},
            "is_system_badge": True
        },
        {
            "name": "Top Performer",
            "description": "Ficou em 1º no ranking mensal",
            "criteria_type": "manual",
            "criteria": {},
            "is_system_badge": True
        },
        {
            "name": "Persistente",
            "description": "Ganhou 10 cards",
            "criteria_type": "automatic",
            "criteria": {"field": "cards_won", "operator": ">=", "value": 10},
            "is_system_badge": True
        },
        {
            "name": "Campeão Trimestral",
            "description": "1º lugar no ranking trimestral",
            "criteria_type": "manual",
            "criteria": {},
            "is_system_badge": True
        }
    ]

    all_badges = []
    for badge_data in badges_data:
        existing = db.query(GamificationBadge).filter(
            GamificationBadge.name == badge_data["name"]
        ).first()

        if existing:
            all_badges.append(existing)
        else:
            badge = GamificationBadge(**badge_data)
            db.add(badge)
            all_badges.append(badge)

    db.commit()
    for badge in all_badges:
        db.refresh(badge)
    print(f"    ✓ {len(all_badges)} badges criados")

    # Pontos e rankings
    print("\n  Criando pontos e rankings...")

    salespeople = [u for u in users if u.role.name == "salesperson"]

    for user in salespeople:
        # Histórico de pontos (últimos 90 dias)
        num_events = randint(10, 30)

        for _ in range(num_events):
            points = choice([10, 25, 50, 100])
            event_type = choice(["card_won", "card_created", "card_moved"])

            point = GamificationPoint(
                user_id=user.id,
                points=points,
                reason=event_type,
                description=f"Pontos por {event_type.replace('_', ' ')}"
            )
            db.add(point)

    db.commit()

    # Rankings semanal e mensal
    # Semanal
    week_start = datetime.now() - timedelta(days=datetime.now().weekday())
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
    week_end = week_start + timedelta(days=6, hours=23, minutes=59, seconds=59)

    users_points = [(u, randint(100, 500)) for u in salespeople]
    users_points.sort(key=lambda x: x[1], reverse=True)

    for rank, (user, points) in enumerate(users_points, 1):
        existing = db.query(GamificationRanking).filter(
            GamificationRanking.user_id == user.id,
            GamificationRanking.period_type == "weekly",
            GamificationRanking.period_start == week_start
        ).first()

        if not existing:
            ranking = GamificationRanking(
                user_id=user.id,
                period_type="weekly",
                period_start=week_start,
                period_end=week_end,
                rank=rank,
                points=points,
                cards_won=points // 50
            )
            db.add(ranking)

    # Mensal
    month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if month_start.month == 12:
        month_end = month_start.replace(year=month_start.year + 1, month=1) - timedelta(seconds=1)
    else:
        month_end = month_start.replace(month=month_start.month + 1) - timedelta(seconds=1)

    for rank, (user, points) in enumerate(users_points, 1):
        existing = db.query(GamificationRanking).filter(
            GamificationRanking.user_id == user.id,
            GamificationRanking.period_type == "monthly",
            GamificationRanking.period_start == month_start
        ).first()

        if not existing:
            ranking = GamificationRanking(
                user_id=user.id,
                period_type="monthly",
                period_start=month_start,
                period_end=month_end,
                rank=rank,
                points=points * 4,
                cards_won=(points * 4) // 50
            )
            db.add(ranking)

    db.commit()
    print(f"    ✓ Gamificação criada com sucesso")


def main():
    """Função principal"""
    print("\n" + "="*60)
    print("  🌱 SEED DATABASE - Dados Fictícios (Single-Tenant)")
    print("="*60 + "\n")

    db = SessionLocal()

    try:
        roles = create_roles(db)
        users = create_users(db, roles)
        clients = create_clients(db)
        boards, lists = create_boards_and_lists(db)
        cards = create_cards(db, users, boards, clients)
        create_gamification_data(db, users)

        print("\n" + "="*60)
        print("  ✅ Banco de dados populado com sucesso!")
        print("="*60)

        print("\n📊 Resumo:")
        print(f"  • Usuários: {len(users)}")
        print(f"  • Clientes: {len(clients)}")
        print(f"  • Boards: {len(boards)}")
        print(f"  • Listas: {len(lists)}")
        print(f"  • Cards: {len(cards)}")

        print("\n🔐 Credenciais de teste:")
        print(f"  Admin: admin@hsgrowth.com / admin123")
        print(f"  Manager: gerente1@hsgrowth.com / gerente123")
        print(f"  Vendedor: vendedor1@hsgrowth.com / vendedor123")

        print("\n")

        # Commit final para garantir que tudo foi persistido
        db.commit()

    except Exception as e:
        print(f"\n❌ Erro: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()
