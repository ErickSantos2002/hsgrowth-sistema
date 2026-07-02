"""delivery_address to json (endereço de entrega estruturado)

Revision ID: c3d4e5f6a7b8
Revises: b1c2d3e4f5a6
Create Date: 2026-07-02 18:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = 'c3d4e5f6a7b8'
down_revision = 'b1c2d3e4f5a6'
branch_labels = None
depends_on = None


def upgrade():
    # Sem dados reais ainda — troca o tipo (Text -> JSON) recriando a coluna.
    op.drop_column('proposals', 'delivery_address')
    op.add_column('proposals', sa.Column('delivery_address', sa.JSON(), nullable=True))


def downgrade():
    op.drop_column('proposals', 'delivery_address')
    op.add_column('proposals', sa.Column('delivery_address', sa.Text(), nullable=True))
