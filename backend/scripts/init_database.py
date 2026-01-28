#!/usr/bin/env python3
"""
Script para inicializar o banco de dados com dados básicos necessários.
Cria: Roles, Usuário Admin, Configurações de Pontos padrão, etc.
"""

import sys
import os
from pathlib import Path
from datetime import datetime

# Adiciona o diretório raiz ao path
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.role import Role
from app.models.user import User
from app.models.gamification_action_points import GamificationActionPoints
from app.core.security import hash_password


def create_roles(db: Session) -> dict:
    """
    Cria as roles padrão do sistema

    Returns:
        Dicionário com as roles criadas
    """
    print("\n1️⃣  Criando roles...")

    roles_data = [
        {
            "name": "admin",
            "display_name": "Administrador",
            "description": "Administrador do sistema - acesso total",
        },
        {
            "name": "manager",
            "display_name": "Gerente",
            "description": "Gerente de vendas - gerencia equipe e relatórios",
        },
        {
            "name": "salesperson",
            "display_name": "Vendedor",
            "description": "Vendedor - acessa seus próprios negócios",
        },
    ]

    roles = {}

    for role_data in roles_data:
        # Verifica se já existe
        existing = db.query(Role).filter(Role.name == role_data["name"]).first()

        if existing:
            print(f"   ℹ️  Role '{role_data['name']}' já existe")
            roles[role_data["name"]] = existing
        else:
            role = Role(**role_data)
            db.add(role)
            db.commit()
            db.refresh(role)
            roles[role_data["name"]] = role
            print(f"   ✅ Role '{role_data['name']}' criada")

    return roles


def create_admin_user(db: Session, admin_role: Role) -> User:
    """
    Cria o usuário administrador padrão

    Args:
        db: Sessão do banco
        admin_role: Role de administrador

    Returns:
        Usuário admin criado ou existente
    """
    print("\n2️⃣  Criando usuário administrador...")

    # Verifica se já existe
    existing = db.query(User).filter(User.email == "admin@hsgrowth.com").first()

    if existing:
        print("   ℹ️  Usuário admin já existe")
        return existing

    # Cria admin
    admin = User(
        email="admin@hsgrowth.com",
        username="admin",
        name="Admin HSGrowth",
        phone=None,
        role_id=admin_role.id,
        is_active=True,
        password_hash=hash_password("admin123"),  # Senha padrão
    )

    db.add(admin)
    db.commit()
    db.refresh(admin)

    print("   ✅ Usuário admin criado")
    print("   📧 Email: admin@hsgrowth.com")
    print("   🔑 Senha: admin123")
    print("   ⚠️  IMPORTANTE: Altere a senha após o primeiro login!")

    return admin


def create_action_points(db: Session) -> None:
    """Cria configurações padrão de pontos de gamificação"""
    print("\n3️⃣  Criando configurações de pontos...")

    # Verifica se já existe
    existing_count = db.query(GamificationActionPoints).count()

    if existing_count > 0:
        print(f"   ℹ️  Já existem {existing_count} configurações de pontos")
        return

    actions = [
        {
            "action_type": "card_created",
            "points": 5,
            "description": "Criar um novo card",
            "is_active": True,
        },
        {
            "action_type": "card_won",
            "points": 50,
            "description": "Ganhar um card (fechar venda)",
            "is_active": True,
        },
        {
            "action_type": "card_lost",
            "points": -5,
            "description": "Perder um card",
            "is_active": True,
        },
        {
            "action_type": "card_moved",
            "points": 2,
            "description": "Mover card entre listas",
            "is_active": True,
        },
        {
            "action_type": "task_completed",
            "points": 10,
            "description": "Completar uma tarefa",
            "is_active": True,
        },
        {
            "action_type": "note_added",
            "points": 3,
            "description": "Adicionar uma nota",
            "is_active": True,
        },
        {
            "action_type": "product_added",
            "points": 5,
            "description": "Adicionar produto a um card",
            "is_active": True,
        },
        {
            "action_type": "transfer_approved",
            "points": 15,
            "description": "Transferência aprovada",
            "is_active": True,
        },
        {
            "action_type": "client_created",
            "points": 10,
            "description": "Criar novo cliente",
            "is_active": True,
        },
        {
            "action_type": "automation_created",
            "points": 20,
            "description": "Criar automação",
            "is_active": True,
        },
    ]

    for action_data in actions:
        action = GamificationActionPoints(**action_data)
        db.add(action)

    db.commit()
    print(f"   ✅ {len(actions)} configurações de pontos criadas")


def main():
    """Função principal"""
    print("\n" + "=" * 80)
    print("🚀 Inicializando banco de dados do HSGrowth CRM")
    print("=" * 80)

    db = SessionLocal()

    try:
        # Cria roles
        roles = create_roles(db)

        # Cria admin
        admin = create_admin_user(db, roles["admin"])

        # Cria configurações de pontos
        create_action_points(db)

        print("\n" + "=" * 80)
        print("✅ INICIALIZAÇÃO CONCLUÍDA COM SUCESSO!")
        print("=" * 80)
        print("\n📋 Próximos passos:")
        print("1. Acesse o sistema: http://localhost:5173")
        print("2. Login: admin@hsgrowth.com / admin123")
        print("3. ⚠️  Altere a senha padrão em Configurações > Perfil")
        print("4. Crie usuários adicionais em /users")
        print("5. Execute importação do Pipedrive (se aplicável)")
        print()

    except Exception as e:
        print(f"\n❌ Erro durante inicialização: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
