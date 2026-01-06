"""
Script para popular o banco de dados com dados de exemplo.
Cria account, usuários, boards, listas, cards, badges, automações, etc.

Uso:
    python scripts/seed_database.py
"""
import sys
from pathlib import Path
from datetime import datetime, timedelta, date
from random import randint, choice, random

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
from app.models.badge import Badge
from app.models.gamification_stats import GamificationStats
from app.models.automation import Automation
from app.core.security import hash_password
from loguru import logger


def create_account(db: Session) -> Account:
    """Cria account de exemplo"""
    existing = db.query(Account).filter(Account.subdomain == "demo").first()
    if existing:
        logger.info(f"Account 'demo' já existe (ID: {existing.id})")
        return existing

    account = Account(
        name="Demo HSGrowth CRM",
        subdomain="demo",
        is_active=True
    )
    db.add(account)
    db.commit()
    db.refresh(account)

    logger.success(f"Account criado: {account.name} (ID: {account.id})")
    return account


def create_users(db: Session, account: Account) -> dict:
    """Cria usuários de exemplo"""
    users_data = [
        {
            "name": "Admin Sistema",
            "email": "admin@demo.com",
            "password": "admin123",
            "role": "admin",
            "phone": "+55 11 98765-4321"
        },
        {
            "name": "Carlos Manager",
            "email": "carlos@demo.com",
            "password": "manager123",
            "role": "manager",
            "phone": "+55 11 98765-1111"
        },
        {
            "name": "Ana Vendedora",
            "email": "ana@demo.com",
            "password": "sales123",
            "role": "salesperson",
            "phone": "+55 11 98765-2222"
        },
        {
            "name": "Bruno Vendedor",
            "email": "bruno@demo.com",
            "password": "sales123",
            "role": "salesperson",
            "phone": "+55 11 98765-3333"
        },
        {
            "name": "Carla Vendedora",
            "email": "carla@demo.com",
            "password": "sales123",
            "role": "salesperson",
            "phone": "+55 11 98765-4444"
        },
    ]

    users = {}

    for user_data in users_data:
        # Verifica se já existe
        existing = db.query(User).filter(User.email == user_data["email"]).first()
        if existing:
            logger.info(f"Usuário '{existing.email}' já existe")
            users[user_data["role"] + "_" + user_data["name"].split()[0].lower()] = existing
            continue

        user = User(
            name=user_data["name"],
            email=user_data["email"],
            password=hash_password(user_data["password"]),
            role=user_data["role"],
            phone=user_data.get("phone"),
            account_id=account.id,
            is_active=True,
            is_deleted=False
        )
        db.add(user)
        users[user_data["role"] + "_" + user_data["name"].split()[0].lower()] = user

        logger.success(f"Usuário criado: {user.email} (senha: {user_data['password']})")

    db.commit()

    # Refresh todos
    for user in users.values():
        db.refresh(user)

    return users


def create_board(db: Session, account: Account) -> Board:
    """Cria board de exemplo"""
    existing = db.query(Board).filter(
        Board.name == "Pipeline de Vendas 2024",
        Board.account_id == account.id
    ).first()

    if existing:
        logger.info(f"Board 'Pipeline de Vendas 2024' já existe (ID: {existing.id})")
        return existing

    board = Board(
        name="Pipeline de Vendas 2024",
        description="Pipeline principal de vendas da empresa",
        account_id=account.id
    )
    db.add(board)
    db.commit()
    db.refresh(board)

    logger.success(f"Board criado: {board.name} (ID: {board.id})")
    return board


def create_lists(db: Session, board: Board) -> list[List]:
    """Cria listas do board"""
    lists_data = [
        {"name": "Leads", "position": 0},
        {"name": "Qualificação", "position": 1},
        {"name": "Proposta", "position": 2},
        {"name": "Negociação", "position": 3},
        {"name": "Ganho", "position": 4},
        {"name": "Perdido", "position": 5},
    ]

    lists = []

    for list_data in lists_data:
        # Verifica se já existe
        existing = db.query(List).filter(
            List.name == list_data["name"],
            List.board_id == board.id
        ).first()

        if existing:
            logger.info(f"Lista '{existing.name}' já existe")
            lists.append(existing)
            continue

        list_obj = List(
            name=list_data["name"],
            position=list_data["position"],
            board_id=board.id
        )
        db.add(list_obj)
        lists.append(list_obj)

        logger.success(f"Lista criada: {list_obj.name}")

    db.commit()

    for list_obj in lists:
        db.refresh(list_obj)

    return lists


def create_cards(db: Session, lists: list[List], users: dict) -> list[Card]:
    """Cria cards de exemplo"""
    # Pega vendedores
    salespeople = [u for k, u in users.items() if u.role == "salesperson"]

    cards_data = [
        # Leads (lista 0)
        {"title": "Empresa ABC Ltda", "value": 15000, "list_idx": 0, "stage": "lead"},
        {"title": "Tech Solutions Inc", "value": 25000, "list_idx": 0, "stage": "lead"},
        {"title": "Inovação Digital", "value": 8000, "list_idx": 0, "stage": "lead"},

        # Qualificação (lista 1)
        {"title": "Consultoria XYZ", "value": 12000, "list_idx": 1, "stage": "qualification"},
        {"title": "Varejo Premium", "value": 18000, "list_idx": 1, "stage": "qualification"},

        # Proposta (lista 2)
        {"title": "Indústria 4.0", "value": 35000, "list_idx": 2, "stage": "proposal"},
        {"title": "E-commerce Plus", "value": 22000, "list_idx": 2, "stage": "proposal"},

        # Negociação (lista 3)
        {"title": "Startup Fintech", "value": 40000, "list_idx": 3, "stage": "negotiation"},

        # Ganho (lista 4)
        {"title": "Corporação Global", "value": 50000, "list_idx": 4, "stage": "won"},
        {"title": "Empresa Tradicional", "value": 30000, "list_idx": 4, "stage": "won"},

        # Perdido (lista 5)
        {"title": "Concorrente Ganhou", "value": 20000, "list_idx": 5, "stage": "lost"},
    ]

    cards = []
    position_counters = {}

    for card_data in cards_data:
        list_obj = lists[card_data["list_idx"]]

        # Calcula position
        if list_obj.id not in position_counters:
            position_counters[list_obj.id] = 0
        position = position_counters[list_obj.id]
        position_counters[list_obj.id] += 1

        # Atribui vendedor aleatório
        assigned_to = choice(salespeople)

        # Define datas
        created_days_ago = randint(1, 30)
        created_at = datetime.utcnow() - timedelta(days=created_days_ago)

        # Due date futuro aleatório
        due_date = date.today() + timedelta(days=randint(5, 30))

        card = Card(
            title=card_data["title"],
            description=f"Oportunidade de {card_data['value']:.2f}",
            list_id=list_obj.id,
            assigned_to_id=assigned_to.id,
            stage=card_data["stage"],
            value=card_data["value"],
            position=position,
            due_date=due_date,
            created_at=created_at,
            updated_at=created_at
        )
        db.add(card)
        cards.append(card)

    db.commit()

    for card in cards:
        db.refresh(card)

    logger.success(f"{len(cards)} cards criados")
    return cards


def create_badges(db: Session, account: Account) -> list[Badge]:
    """Cria badges de exemplo"""
    badges_data = [
        {
            "name": "Primeira Venda",
            "description": "Realizou a primeira venda",
            "icon": "trophy",
            "color": "gold"
        },
        {
            "name": "10 Vendas",
            "description": "Atingiu 10 vendas",
            "icon": "star",
            "color": "silver"
        },
        {
            "name": "Vendedor do Mês",
            "description": "Melhor vendedor do mês",
            "icon": "medal",
            "color": "blue"
        },
        {
            "name": "Streak de 7 dias",
            "description": "Ativo por 7 dias consecutivos",
            "icon": "fire",
            "color": "orange"
        },
        {
            "name": "R$ 100k em Vendas",
            "description": "Atingiu R$ 100.000 em vendas",
            "icon": "diamond",
            "color": "purple"
        },
    ]

    badges = []

    for badge_data in badges_data:
        # Verifica se já existe
        existing = db.query(Badge).filter(
            Badge.name == badge_data["name"],
            Badge.account_id == account.id
        ).first()

        if existing:
            logger.info(f"Badge '{existing.name}' já existe")
            badges.append(existing)
            continue

        badge = Badge(
            name=badge_data["name"],
            description=badge_data["description"],
            icon=badge_data["icon"],
            color=badge_data["color"],
            account_id=account.id
        )
        db.add(badge)
        badges.append(badge)

    db.commit()

    for badge in badges:
        db.refresh(badge)

    logger.success(f"{len(badges)} badges criados")
    return badges


def create_gamification_stats(db: Session, users: dict):
    """Cria estatísticas de gamificação para os vendedores"""
    salespeople = [u for k, u in users.items() if u.role == "salesperson"]

    for user in salespeople:
        # Verifica se já existe
        existing = db.query(GamificationStats).filter(
            GamificationStats.user_id == user.id
        ).first()

        if existing:
            logger.info(f"Stats de gamificação para '{user.name}' já existem")
            continue

        stats = GamificationStats(
            user_id=user.id,
            total_points=randint(50, 500),
            monthly_points=randint(20, 200),
            weekly_points=randint(10, 100),
            current_streak=randint(0, 10),
            longest_streak=randint(5, 20)
        )
        db.add(stats)

    db.commit()
    logger.success(f"Stats de gamificação criados para {len(salespeople)} vendedores")


def create_automations(db: Session, board: Board) -> list[Automation]:
    """Cria automações de exemplo"""
    automations_data = [
        {
            "name": "Notificar ao criar card",
            "automation_type": "trigger",
            "trigger_event": "card_created",
            "is_active": True,
            "actions": [
                {
                    "action_type": "notify_user",
                    "config": {"message": "Novo card criado!"}
                }
            ]
        },
        {
            "name": "Atualizar ranking diário",
            "automation_type": "scheduled",
            "schedule_type": "recurrent",
            "recurrence_pattern": "daily",
            "is_active": True,
            "actions": [
                {
                    "action_type": "update_ranking",
                    "config": {}
                }
            ]
        },
    ]

    automations = []

    for auto_data in automations_data:
        # Verifica se já existe
        existing = db.query(Automation).filter(
            Automation.name == auto_data["name"],
            Automation.board_id == board.id
        ).first()

        if existing:
            logger.info(f"Automação '{existing.name}' já existe")
            automations.append(existing)
            continue

        automation = Automation(
            name=auto_data["name"],
            automation_type=auto_data["automation_type"],
            trigger_event=auto_data.get("trigger_event"),
            schedule_type=auto_data.get("schedule_type"),
            recurrence_pattern=auto_data.get("recurrence_pattern"),
            is_active=auto_data["is_active"],
            actions=auto_data["actions"],
            board_id=board.id,
            account_id=board.account_id
        )
        db.add(automation)
        automations.append(automation)

    db.commit()

    for automation in automations:
        db.refresh(automation)

    logger.success(f"{len(automations)} automações criadas")
    return automations


def seed_database():
    """Função principal para popular o banco"""
    logger.info("=" * 60)
    logger.info("INICIANDO SEED DO BANCO DE DADOS")
    logger.info("=" * 60)

    db = SessionLocal()

    try:
        # 1. Account
        logger.info("\n[1/8] Criando Account...")
        account = create_account(db)

        # 2. Users
        logger.info("\n[2/8] Criando Usuários...")
        users = create_users(db, account)

        # 3. Board
        logger.info("\n[3/8] Criando Board...")
        board = create_board(db, account)

        # 4. Lists
        logger.info("\n[4/8] Criando Listas...")
        lists = create_lists(db, board)

        # 5. Cards
        logger.info("\n[5/8] Criando Cards...")
        cards = create_cards(db, lists, users)

        # 6. Badges
        logger.info("\n[6/8] Criando Badges...")
        badges = create_badges(db, account)

        # 7. Gamification Stats
        logger.info("\n[7/8] Criando Estatísticas de Gamificação...")
        create_gamification_stats(db, users)

        # 8. Automations
        logger.info("\n[8/8] Criando Automações...")
        automations = create_automations(db, board)

        # Resumo final
        logger.info("\n" + "=" * 60)
        logger.success("SEED CONCLUÍDO COM SUCESSO!")
        logger.info("=" * 60)
        logger.info("\n📊 RESUMO:")
        logger.info(f"  ✓ Account: {account.name}")
        logger.info(f"  ✓ Usuários: {len(users)}")
        logger.info(f"  ✓ Board: {board.name}")
        logger.info(f"  ✓ Listas: {len(lists)}")
        logger.info(f"  ✓ Cards: {len(cards)}")
        logger.info(f"  ✓ Badges: {len(badges)}")
        logger.info(f"  ✓ Automações: {len(automations)}")

        logger.info("\n🔑 CREDENCIAIS DE ACESSO:")
        logger.info("  Admin:     admin@demo.com / admin123")
        logger.info("  Manager:   carlos@demo.com / manager123")
        logger.info("  Vendedor:  ana@demo.com / sales123")
        logger.info("  Vendedor:  bruno@demo.com / sales123")
        logger.info("  Vendedor:  carla@demo.com / sales123")

        logger.info("\n⚠️  IMPORTANTE: Altere as senhas após o primeiro login!")
        logger.info("=" * 60)

    except Exception as e:
        logger.error(f"\n❌ Erro ao fazer seed do banco: {e}")
        import traceback
        logger.error(traceback.format_exc())
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
