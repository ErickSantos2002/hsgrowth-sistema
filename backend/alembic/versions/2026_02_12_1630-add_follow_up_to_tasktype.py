"""Add FOLLOW_UP to tasktype enum

Revision ID: add_follow_up_2026
Revises: add_attachments_2026
Create Date: 2026-02-12 16:30:00.000000

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = 'add_follow_up_2026'
down_revision = 'add_attachments_2026'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Adiciona o valor FOLLOW_UP ao enum tasktype"""
    # Para PostgreSQL, precisamos usar ALTER TYPE para adicionar um novo valor ao enum
    op.execute("ALTER TYPE tasktype ADD VALUE 'FOLLOW_UP'")


def downgrade() -> None:
    """
    Remove o valor FOLLOW_UP do enum tasktype

    ATENÇÃO: PostgreSQL não suporta remoção de valores de enum diretamente.
    Para fazer downgrade, seria necessário:
    1. Criar um novo enum sem FOLLOW_UP
    2. Alterar a coluna para usar o novo enum
    3. Deletar o enum antigo
    4. Renomear o novo enum

    Como isso é complexo e raramente necessário, deixamos vazio.
    Se precisar fazer downgrade, será necessário intervenção manual.
    """
    pass
