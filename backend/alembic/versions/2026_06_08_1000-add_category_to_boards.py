"""Adiciona coluna category à tabela boards para separar boards de Vendas e Serviços.

Revision ID: 2026_06_08_1000
Revises: 2026_05_20_1000
Create Date: 2026-06-08 10:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = '2026_06_08_1000'
down_revision = '2026_05_20_1000'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'boards',
        sa.Column('category', sa.String(20), nullable=False, server_default='vendas',
                  comment='Categoria do board: vendas ou servicos')
    )


def downgrade():
    op.drop_column('boards', 'category')
