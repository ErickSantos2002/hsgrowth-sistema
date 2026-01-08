"""add_phone_to_users

Revision ID: c83eca4d1b29
Revises: 19d12b3c3393
Create Date: 2026-01-08 11:57:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c83eca4d1b29'
down_revision = '19d12b3c3393'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Adiciona coluna phone na tabela users"""
    op.add_column('users', sa.Column('phone', sa.String(length=20), nullable=True))


def downgrade() -> None:
    """Remove coluna phone da tabela users"""
    op.drop_column('users', 'phone')
