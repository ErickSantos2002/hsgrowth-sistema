"""
Badge Checker Worker - Verifica e atribui badges automáticos.
Executado periodicamente para verificar se usuários atingiram critérios de badges.
"""
import sys
from pathlib import Path

# Adiciona o diretório raiz ao path para imports
root_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(root_dir))

from typing import List
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.user import User
from app.models.gamification_badge import GamificationBadge
from app.repositories.gamification_repository import GamificationRepository
from app.repositories.notification_repository import NotificationRepository


def check_and_award_automatic_badges(db: Session) -> dict:
    """
    Verifica e atribui badges automáticos para todos os usuários.

    Args:
        db: Sessão do banco de dados

    Returns:
        Estatísticas da execução
    """
    gamification_repo = GamificationRepository(db)
    notification_repo = NotificationRepository(db)

    # Busca todos os usuários ativos
    users = db.query(User).filter(User.is_deleted == False).all()

    # Busca todos os badges automáticos
    badges = gamification_repo.list_all_badges(skip=0, limit=1000)
    automatic_badges = [b for b in badges if b.criteria_type == "automatic" and b.criteria]

    total_awarded = 0
    users_with_new_badges = []

    print(f"🔍 Verificando badges automáticos para {len(users)} usuários...")
    print(f"📋 Total de badges automáticos: {len(automatic_badges)}")

    for user in users:
        user_new_badges = 0

        # Total de pontos do usuário
        total_points = gamification_repo.get_user_total_points(user.id)

        for badge in automatic_badges:
            # Verifica se o usuário já tem o badge
            if gamification_repo.user_has_badge(user.id, badge.id):
                continue

            # Verifica critério baseado em pontos
            if badge.criteria.get("field") == "total_points":
                required_points = badge.criteria.get("value", 0)
                operator = badge.criteria.get("operator", ">=")

                criteria_met = False

                if operator == ">=" and total_points >= required_points:
                    criteria_met = True
                elif operator == ">" and total_points > required_points:
                    criteria_met = True
                elif operator == "==" and total_points == required_points:
                    criteria_met = True

                if criteria_met:
                    # Atribui o badge
                    gamification_repo.award_badge(user.id, badge.id, awarded_by_id=None)

                    # Cria notificação
                    try:
                        notification_data = {
                            "user_id": user.id,
                            "notification_type": "badge_earned",
                            "title": "🏆 Badge conquistado!",
                            "message": f"Parabéns! Você conquistou o badge '{badge.name}'",
                            "icon": "trophy",
                            "color": "success",
                            "notification_metadata": {
                                "badge_id": badge.id,
                                "badge_name": badge.name,
                                "badge_description": badge.description,
                                "url": "/gamification"
                            }
                        }
                        notification_repo.create(notification_data)
                    except Exception as e:
                        print(f"⚠️  Erro ao criar notificação: {e}")

                    user_new_badges += 1
                    total_awarded += 1
                    print(f"✅ Badge '{badge.name}' atribuído ao usuário {user.name}")

        if user_new_badges > 0:
            users_with_new_badges.append({
                "user_id": user.id,
                "user_name": user.name,
                "badges_awarded": user_new_badges
            })

    # Commit das mudanças
    db.commit()

    print(f"\n✨ Finalizado!")
    print(f"📊 Total de badges atribuídos: {total_awarded}")
    print(f"👥 Usuários que receberam badges: {len(users_with_new_badges)}")

    return {
        "total_users_checked": len(users),
        "total_badges_awarded": total_awarded,
        "users_with_new_badges": users_with_new_badges
    }


def main():
    """Função principal do worker."""
    print("🚀 Iniciando verificação de badges automáticos...")

    db = SessionLocal()
    try:
        result = check_and_award_automatic_badges(db)
        print(f"\n📈 Resultado: {result}")
    except Exception as e:
        print(f"❌ Erro na execução: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
