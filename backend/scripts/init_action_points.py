"""
Script para criar a tabela gamification_action_points e inicializar dados padrão.
Execute: python -m scripts.init_action_points
"""
import sys
import os

# Adiciona o diretório raiz ao path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.session import SessionLocal
from app.models.gamification_action_points import GamificationActionPoints
from app.db.base import Base
from sqlalchemy import create_engine
from app.core.config import settings


def create_table():
    """Cria a tabela gamification_action_points."""
    print("Criando tabela gamification_action_points...")
    engine = create_engine(settings.DATABASE_URL)
    Base.metadata.create_all(bind=engine, tables=[GamificationActionPoints.__table__])
    print("✅ Tabela criada com sucesso!")


def initialize_default_data():
    """Inicializa dados padrão de pontos."""
    print("\nInicializando dados padrão...")

    db = SessionLocal()

    default_actions = [
        ("card_created", 5, "Card criado"),
        ("card_won", 20, "Card ganho"),
        ("card_moved", 2, "Card movido"),
        ("card_lost", -5, "Card perdido"),
        ("board_created", 10, "Board criado"),
        ("user_invited", 15, "Usuário convidado"),
        ("task_completed", 10, "Tarefa completada"),
        ("first_login", 10, "Primeiro login"),
        ("daily_login", 3, "Login diário"),
    ]

    for action_type, points, description in default_actions:
        # Verifica se já existe
        existing = db.query(GamificationActionPoints).filter(
            GamificationActionPoints.action_type == action_type
        ).first()

        if not existing:
            action_point = GamificationActionPoints(
                action_type=action_type,
                points=points,
                description=description,
                is_active=True
            )
            db.add(action_point)
            print(f"  ✅ Criado: {action_type} = {points} pontos")
        else:
            print(f"  ⏭️  Já existe: {action_type}")

    db.commit()
    db.close()
    print("\n✅ Dados inicializados com sucesso!")


if __name__ == "__main__":
    try:
        create_table()
        initialize_default_data()
        print("\n🎉 Inicialização completa!")
    except Exception as e:
        print(f"\n❌ Erro: {e}")
        sys.exit(1)
