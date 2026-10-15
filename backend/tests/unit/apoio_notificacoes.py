"""
Ajudantes dos testes de notificações.

O `test_roles` do conftest não tem o papel de Serviço, e vários testes daqui
precisam de um usuário de Serviço, de um usuário de integração e dos dois
boards de Serviço.
"""
from types import SimpleNamespace

from app.core.security import create_access_token, hash_password
from app.models.notification import Notification
from app.models.role import Role
from app.models.service_board import ServiceBoard
from app.models.service_list import ServiceList
from app.models.user import User


def papel(db, nome: str) -> Role:
    existente = db.query(Role).filter(Role.name == nome).first()
    if existente:
        return existente
    r = Role(name=nome, display_name=nome.title(), description=nome,
             permissions=[], is_system_role=True)
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


def usuario(db, nome: str, papel_nome: str = "salesperson", **extra) -> User:
    u = User(
        name=nome,
        email=f"{nome.lower().replace(' ', '.')}@teste.com",
        password_hash=hash_password("senha12345"),
        role_id=papel(db, papel_nome).id,
        is_active=True,
        is_deleted=False,
        **extra,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


def cabecalho(user: User) -> dict:
    return {"Authorization": f"Bearer {create_access_token(data={'sub': str(user.id)})}"}


def boards_de_servico(db) -> SimpleNamespace:
    servicos = ServiceBoard(name="Serviços")
    cobranca = ServiceBoard(name="Cobrança")
    db.add_all([servicos, cobranca])
    db.commit()
    lista_servicos = ServiceList(board_id=servicos.id, name="Entrada", position=0)
    lista_cobranca = ServiceList(board_id=cobranca.id, name="Entrada", position=0)
    db.add_all([lista_servicos, lista_cobranca])
    db.commit()
    return SimpleNamespace(servicos=servicos, cobranca=cobranca,
                           lista_servicos=lista_servicos, lista_cobranca=lista_cobranca)


def avisos(db, user_id: int, tipo: str = None) -> list:
    q = db.query(Notification).filter(Notification.user_id == user_id)
    if tipo:
        q = q.filter(Notification.notification_type == tipo)
    return q.order_by(Notification.id).all()
