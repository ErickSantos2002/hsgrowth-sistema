"""
Script para popular notificações de teste no banco de dados.
Cria 3 notificações para cada usuário ativo.
"""
import sys
from pathlib import Path

# Adiciona o diretório raiz ao path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.user import User
from app.services.notification_service import NotificationService
from app.schemas.notification import NotificationCreate, NotificationTypeEnum, NotificationIconEnum, NotificationColorEnum


def create_sample_notifications(db: Session):
    """
    Cria notificações de exemplo para todos os usuários.
    """
    print("=" * 60)
    print("Criando notificações de teste...")
    print("=" * 60)

    # Busca todos os usuários ativos
    users = db.query(User).filter(User.is_active == True).all()

    if not users:
        print("AVISO Nenhum usuário encontrado no banco de dados!")
        return

    print(f"Encontrados {len(users)} usuários ativos")
    print()

    notification_service = NotificationService(db)
    total_created = 0

    for user in users:
        print(f"Criando notificacoes para: {user.name or user.username} (ID: {user.id})")

        # Notificação 1: Card atribuído
        notif1 = NotificationCreate(
            user_id=user.id,
            notification_type=NotificationTypeEnum.CARD_ASSIGNED,
            title="Novo card atribuído",
            message=f"O card 'Proposta Cliente ABC' foi atribuído para você por João Silva",
            icon=NotificationIconEnum.BELL,
            color=NotificationColorEnum.INFO,
            notification_metadata={
                "card_id": 123,
                "board_id": 1,
                "url": "/boards/1/cards/123",
                "assigned_by": "João Silva"
            }
        )
        notification_service.create_notification(notif1)
        print("  OK Notificação 1: Card atribuído")

        # Notificação 2: Badge conquistado
        notif2 = NotificationCreate(
            user_id=user.id,
            notification_type=NotificationTypeEnum.BADGE_EARNED,
            title="Novo badge conquistado!",
            message="Parabéns! Você conquistou o badge 'Vendedor do Mês'",
            icon=NotificationIconEnum.TROPHY,
            color=NotificationColorEnum.SUCCESS,
            notification_metadata={
                "badge_id": 5,
                "badge_name": "Vendedor do Mês",
                "url": "/gamification"
            }
        )
        notification_service.create_notification(notif2)
        print("  OK Notificação 2: Badge conquistado")

        # Notificação 3: Transferência aprovada
        notif3 = NotificationCreate(
            user_id=user.id,
            notification_type=NotificationTypeEnum.TRANSFER_APPROVED,
            title="Transferência aprovada",
            message="Sua transferência do card 'Lead XYZ Corp' foi aprovada pelo gerente",
            icon=NotificationIconEnum.CHECK,
            color=NotificationColorEnum.SUCCESS,
            notification_metadata={
                "transfer_id": 42,
                "card_id": 789,
                "approved_by": "Gerente",
                "url": "/transfers"
            }
        )
        notification_service.create_notification(notif3)
        print("  OK Notificação 3: Transferência aprovada")

        total_created += 3
        print()

    db.commit()
    print("=" * 60)
    print(f"OK Total de notificações criadas: {total_created}")
    print(f"OK {len(users)} usuários receberam 3 notificações cada")
    print("=" * 60)


def main():
    """
    Função principal.
    """
    db = SessionLocal()
    try:
        create_sample_notifications(db)
        print("\nOK Script concluído com sucesso!")
    except Exception as e:
        print(f"\nERRO Erro ao criar notificações: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()
