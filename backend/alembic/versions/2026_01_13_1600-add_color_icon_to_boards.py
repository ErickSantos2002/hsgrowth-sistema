"""add_color_icon_to_boards

Revision ID: a1b2c3d4e5f6
Revises: 458ea44424e8
Create Date: 2026-01-13 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '458ea44424e8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Adiciona colunas color e icon na tabela boards
    op.add_column('boards', sa.Column('color', sa.String(length=50), nullable=True, server_default='#3B82F6'))
    op.add_column('boards', sa.Column('icon', sa.String(length=50), nullable=True, server_default='grid'))


def downgrade() -> None:
    # Remove colunas color e icon da tabela boards
    op.drop_column('boards', 'icon')
    op.drop_column('boards', 'color')
