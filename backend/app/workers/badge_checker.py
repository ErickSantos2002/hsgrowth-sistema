"""
Badge Checker Worker - Verifica e atribui badges automáticos.
Executado periodicamente pelo scheduler para verificar se usuários
atingiram critérios de badges automáticos.

Delega a lógica de avaliação ao GamificationService para manter
consistência com as chamadas em tempo real (ex: ao ganhar pontos).
"""
import sys
from pathlib import Path

# Adiciona o diretório raiz ao path para imports standalone
root_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(root_dir))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.user import User


def check_and_award_automatic_badges(db: Session) -> dict:
    """
    Verifica e atribui badges automáticos para todos os usuários ativos.

    Delega a avaliação de critérios ao GamificationService._check_and_award_badges,
    que suporta os critérios: total_points, action_count e rank (com board_type).

    Args:
        db: Sessão do banco de dados

    Returns:
        Dicionário com estatísticas da execução
    """
    from app.services.gamification_service import GamificationService
    from app.repositories.gamification_repository import GamificationRepository

    gamification_repo = GamificationRepository(db)
    service = GamificationService(db)

    # Busca todos os usuários ativos
    users = db.query(User).filter(
        User.is_deleted == False,
        User.is_active == True
    ).all()

    # Busca badges automáticos ativos (excluindo soft-deleted)
    automatic_badges = [
        b for b in gamification_repo.list_all_badges(skip=0, limit=1000, include_deleted=False)
        if b.criteria_type == "automatic" and b.criteria and b.is_active
    ]

    print(f"[BADGE_CHECKER] Verificando {len(users)} usuários com {len(automatic_badges)} badges automáticos...")

    total_awarded = 0
    users_with_new_badges = []

    for user in users:
        badges_before = len(gamification_repo.list_user_badges(user.id))

        # Reutiliza o método do service que avalia todos os critérios
        service._check_and_award_badges(user.id)

        badges_after = len(gamification_repo.list_user_badges(user.id))
        new_badges = badges_after - badges_before

        if new_badges > 0:
            total_awarded += new_badges
            users_with_new_badges.append({
                "user_id": user.id,
                "user_name": user.name,
                "badges_awarded": new_badges
            })
            print(f"[BADGE_CHECKER] {new_badges} badge(s) atribuído(s) ao usuário {user.name}")

    print(
        f"[BADGE_CHECKER] Concluído: {total_awarded} badges atribuídos a "
        f"{len(users_with_new_badges)} usuários"
    )

    return {
        "total_users_checked": len(users),
        "total_badges_awarded": total_awarded,
        "users_with_new_badges": users_with_new_badges
    }


def main():
    """Função principal — execução standalone do badge checker."""
    print("[BADGE_CHECKER] Iniciando verificação de badges automáticos...")

    db = SessionLocal()
    try:
        result = check_and_award_automatic_badges(db)
        print(f"[BADGE_CHECKER] Resultado: {result}")
    except Exception as e:
        print(f"[BADGE_CHECKER] Erro na execução: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
