"""add_is_valid_to_card_tasks

Revision ID: 2026_04_14_1300
Revises: 2026_04_14_1200
Create Date: 2026-04-14

Adiciona coluna is_valid à tabela card_tasks.
- NULL  = atividade não concluída
- TRUE  = concluída como válida (atividade realizada com sucesso)
- FALSE = concluída como não válida (tentativa sem resultado)
"""
from alembic import op
import sqlalchemy as sa


revision = '2026_04_14_1300'
down_revision = '2026_04_14_1200'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'card_tasks',
        sa.Column('is_valid', sa.Boolean(), nullable=True, comment='NULL=não concluída, TRUE=válida, FALSE=não válida')
    )


def downgrade():
    op.drop_column('card_tasks', 'is_valid')
