"""
Configuração de fixtures do pytest para testes.
Define fixtures compartilhadas entre todos os testes.
"""
import os
import pytest
from typing import Generator
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.base import Base
from app.db.session import get_db
from app.core.security import hash_password, create_access_token
from app.models.account import Account
from app.models.user import User
from app.models.role import Role
from app.models.board import Board
from app.models.list import List
from app.models.card import Card


# Database de teste (SQLite em memória)
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db() -> Generator[Session, None, None]:
    """
    Fixture que cria um banco de dados de teste limpo para cada teste.
    Todas as tabelas são criadas e dropadas automaticamente.

    Yields:
        Session: Sessão de banco de dados de teste
    """
    # Cria todas as tabelas
    Base.metadata.create_all(bind=engine)

    db_session = TestingSessionLocal()
    try:
        yield db_session
    finally:
        db_session.close()
        # Dropa todas as tabelas após o teste
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db: Session) -> Generator[TestClient, None, None]:
    """
    Fixture que cria um TestClient do FastAPI com banco de dados de teste.

    Args:
        db: Sessão de banco de dados de teste

    Yields:
        TestClient: Cliente de teste do FastAPI
    """
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


# ==================== FIXTURES DE DADOS ====================


@pytest.fixture
def test_account(db: Session) -> Account:
    """
    Cria uma conta de teste.

    Args:
        db: Sessão de banco de dados

    Returns:
        Account: Conta criada
    """
    account = Account(
        name="Test Account",
        subdomain="test",
        is_active=True
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


@pytest.fixture
def test_roles(db: Session) -> dict:
    """
    Cria roles de teste no banco de dados.

    Args:
        db: Sessão de banco de dados

    Returns:
        dict: Dicionário com as roles criadas {name: Role}
    """
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
        role = Role(**role_data)
        db.add(role)
        roles[role_data["name"]] = role

    db.commit()

    for role in roles.values():
        db.refresh(role)

    return roles


@pytest.fixture
def test_admin_user(db: Session, test_account: Account, test_roles: dict) -> User:
    """
    Cria um usuário admin de teste.

    Args:
        db: Sessão de banco de dados
        test_account: Conta de teste
        test_roles: Roles de teste

    Returns:
        User: Usuário admin criado
    """
    user = User(
        name="Admin User",
        email="admin@test.com",
        password_hash=hash_password("admin123"),
        role_id=test_roles["admin"].id,
        account_id=test_account.id,
        is_active=True,
        is_deleted=False
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def test_manager_user(db: Session, test_account: Account, test_roles: dict) -> User:
    """
    Cria um usuário manager de teste.

    Args:
        db: Sessão de banco de dados
        test_account: Conta de teste
        test_roles: Roles de teste

    Returns:
        User: Usuário manager criado
    """
    user = User(
        name="Manager User",
        email="manager@test.com",
        password_hash=hash_password("manager123"),
        role_id=test_roles["manager"].id,
        account_id=test_account.id,
        is_active=True,
        is_deleted=False
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def test_salesperson_user(db: Session, test_account: Account, test_roles: dict) -> User:
    """
    Cria um usuário vendedor de teste.

    Args:
        db: Sessão de banco de dados
        test_account: Conta de teste
        test_roles: Roles de teste

    Returns:
        User: Usuário vendedor criado
    """
    user = User(
        name="Salesperson User",
        email="sales@test.com",
        password_hash=hash_password("sales123"),
        role_id=test_roles["salesperson"].id,
        account_id=test_account.id,
        is_active=True,
        is_deleted=False
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def test_board(db: Session, test_account: Account) -> Board:
    """
    Cria um board de teste.

    Args:
        db: Sessão de banco de dados
        test_account: Conta de teste

    Returns:
        Board: Board criado
    """
    board = Board(
        name="Test Board",
        description="Board de teste",
        account_id=test_account.id
    )
    db.add(board)
    db.commit()
    db.refresh(board)
    return board


@pytest.fixture
def test_lists(db: Session, test_board: Board) -> list[List]:
    """
    Cria listas de teste em um board.

    Args:
        db: Sessão de banco de dados
        test_board: Board de teste

    Returns:
        list[List]: Lista de listas criadas
    """
    lists_data = [
        {"name": "Leads", "position": 0},
        {"name": "Em Contato", "position": 1},
        {"name": "Proposta", "position": 2},
        {"name": "Ganho", "position": 3},
    ]

    lists = []
    for list_data in lists_data:
        list_obj = List(
            name=list_data["name"],
            position=list_data["position"],
            board_id=test_board.id
        )
        db.add(list_obj)
        lists.append(list_obj)

    db.commit()
    for list_obj in lists:
        db.refresh(list_obj)

    return lists


@pytest.fixture
def test_card(db: Session, test_lists: list[List], test_salesperson_user: User) -> Card:
    """
    Cria um card de teste.

    Args:
        db: Sessão de banco de dados
        test_lists: Listas de teste
        test_salesperson_user: Usuário vendedor de teste

    Returns:
        Card: Card criado
    """
    card = Card(
        title="Test Card",
        description="Card de teste",
        list_id=test_lists[0].id,
        assigned_to_id=test_salesperson_user.id,
        stage="lead",
        value=1000.00,
        position=0
    )
    db.add(card)
    db.commit()
    db.refresh(card)
    return card


# ==================== FIXTURES DE AUTENTICAÇÃO ====================


@pytest.fixture
def admin_token(test_admin_user: User) -> str:
    """
    Cria um token de autenticação para o usuário admin.

    Args:
        test_admin_user: Usuário admin de teste

    Returns:
        str: Token JWT válido
    """
    return create_access_token(data={"sub": str(test_admin_user.id)})


@pytest.fixture
def manager_token(test_manager_user: User) -> str:
    """
    Cria um token de autenticação para o usuário manager.

    Args:
        test_manager_user: Usuário manager de teste

    Returns:
        str: Token JWT válido
    """
    return create_access_token(data={"sub": str(test_manager_user.id)})


@pytest.fixture
def salesperson_token(test_salesperson_user: User) -> str:
    """
    Cria um token de autenticação para o usuário vendedor.

    Args:
        test_salesperson_user: Usuário vendedor de teste

    Returns:
        str: Token JWT válido
    """
    return create_access_token(data={"sub": str(test_salesperson_user.id)})


@pytest.fixture
def admin_headers(admin_token: str) -> dict:
    """
    Cria headers de autenticação para admin.

    Args:
        admin_token: Token JWT do admin

    Returns:
        dict: Headers com Authorization
    """
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def manager_headers(manager_token: str) -> dict:
    """
    Cria headers de autenticação para manager.

    Args:
        manager_token: Token JWT do manager

    Returns:
        dict: Headers com Authorization
    """
    return {"Authorization": f"Bearer {manager_token}"}


@pytest.fixture
def salesperson_headers(salesperson_token: str) -> dict:
    """
    Cria headers de autenticação para vendedor.

    Args:
        salesperson_token: Token JWT do vendedor

    Returns:
        dict: Headers com Authorization
    """
    return {"Authorization": f"Bearer {salesperson_token}"}


# ==================== CONFIGURAÇÕES ADICIONAIS ====================


@pytest.fixture(autouse=True)
def mock_celery_tasks(monkeypatch):
    """
    Mock de tasks do Celery para evitar execução real durante testes.

    Args:
        monkeypatch: Fixture do pytest para monkeypatch
    """
    # Mock das tasks principais para executar de forma síncrona
    from app.workers import tasks

    # Sobrescreve o método .delay() para executar de forma síncrona
    def mock_delay(self, *args, **kwargs):
        return self(*args, **kwargs)

    # Aplica o mock em todas as tasks
    if hasattr(tasks, 'execute_automation_task'):
        monkeypatch.setattr(tasks.execute_automation_task, 'delay', mock_delay)
    if hasattr(tasks, 'send_notification_task'):
        monkeypatch.setattr(tasks.send_notification_task, 'delay', mock_delay)
    if hasattr(tasks, 'send_email_task'):
        monkeypatch.setattr(tasks.send_email_task, 'delay', mock_delay)


@pytest.fixture(autouse=True)
def mock_scheduler(monkeypatch):
    """
    Mock do APScheduler para evitar execução de cron jobs durante testes.

    Args:
        monkeypatch: Fixture do pytest para monkeypatch
    """
    # Desabilita o scheduler durante os testes
    async def mock_start_scheduler():
        pass

    async def mock_stop_scheduler():
        pass

    from app.workers import scheduler
    monkeypatch.setattr(scheduler, 'start_scheduler', mock_start_scheduler)
    monkeypatch.setattr(scheduler, 'stop_scheduler', mock_stop_scheduler)


@pytest.fixture(autouse=True)
def disable_email_sending(monkeypatch):
    """
    Desabilita envio real de emails durante testes.

    Args:
        monkeypatch: Fixture do pytest para monkeypatch
    """
    from app.services.email_service import EmailService

    def mock_send_email(self, *args, **kwargs):
        # Apenas loga que o email seria enviado
        return True

    monkeypatch.setattr(EmailService, '_send_email', mock_send_email)
