"""
Script rápido para criar uma notificação de teste.
Útil para testar a atualização automática no frontend.
"""
import sys
from pathlib import Path
from datetime import datetime

# Adiciona o diretório raiz ao path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.services.notification_service import NotificationService
from app.schemas.notification import NotificationCreate, NotificationTypeEnum, NotificationIconEnum, NotificationColorEnum


def create_test_notification(user_id: int):
    """
    Cria uma notificação de teste para um usuário específico.
    """
    db = SessionLocal()
    try:
        notification_service = NotificationService(db)

        timestamp = datetime.now().strftime("%H:%M:%S")

        notif = NotificationCreate(
            user_id=user_id,
            notification_type=NotificationTypeEnum.GENERAL,
            title=f"Notificacao de teste - {timestamp}",
            message=f"Esta e uma notificacao criada em {timestamp} para testar a atualizacao automatica",
            icon=NotificationIconEnum.INFO,
            color=NotificationColorEnum.INFO,
            notification_metadata={
                "test": True,
                "created_at": timestamp
            }
        )

        notification_service.create_notification(notif)
        db.commit()

        print("=" * 60)
        print(f"OK - Notificacao criada com sucesso!")
        print(f"Usuario ID: {user_id}")
        print(f"Horario: {timestamp}")
        print(f"Titulo: Notificacao de teste - {timestamp}")
        print("=" * 60)
        print("\nVerifique o frontend - a notificacao deve aparecer em ate 30 segundos!")
        print("(ou imediatamente se voce abrir o dropdown)")

    except Exception as e:
        print(f"\nERRO ao criar notificacao: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


def main():
    """
    Função principal.
    """
    if len(sys.argv) < 2:
        print("Uso: python create_test_notification.py <user_id>")
        print("Exemplo: python create_test_notification.py 3")
        sys.exit(1)

    try:
        user_id = int(sys.argv[1])
        create_test_notification(user_id)
    except ValueError:
        print("ERRO: user_id deve ser um numero inteiro")
        sys.exit(1)


if __name__ == "__main__":
    main()
