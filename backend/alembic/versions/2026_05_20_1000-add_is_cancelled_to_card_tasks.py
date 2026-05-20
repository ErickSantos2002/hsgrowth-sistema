"""Adiciona coluna is_cancelled à tabela card_tasks para reuniões canceladas.

Revision ID: 2026_05_20_1000
Revises: 2026_05_05_1000
Create Date: 2026-05-20 10:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = '2026_05_20_1000'
down_revision = '2026_05_05_1000'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'card_tasks',
        sa.Column('is_cancelled', sa.Boolean(), nullable=False, server_default=sa.false(),
                  comment='Indica que a reunião foi cancelada (evento removido da agenda)')
    )


def downgrade():
    op.drop_column('card_tasks', 'is_cancelled')
