"""add aparelhos (JSON) to service_card_products

Revision ID: 2026_06_12_0300
Revises: 2026_06_12_0200
Create Date: 2026-06-12 03:00:00.000000

Adiciona a coluna aparelhos (JSON, nullable) na tabela service_card_products.
Guarda a sub-lista de aparelhos de cada produto, com os dados preenchidos pelo
laboratório por unidade:
  [{"serial_number": "...", "model": "...", "alcohol_module": "...",
    "next_recalibration_date": "YYYY-MM-DD"}]

Mudança aditiva e retrocompatível.
"""
from alembic import op
import sqlalchemy as sa


revision = '2026_06_12_0300'
down_revision = '2026_06_12_0200'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('service_card_products', sa.Column('aparelhos', sa.JSON(), nullable=True))


def downgrade():
    op.drop_column('service_card_products', 'aparelhos')
