"""add delivery address fields to proposals

Revision ID: b1c2d3e4f5a6
Revises: 4f9a63be9b4b
Create Date: 2026-07-02 17:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = 'b1c2d3e4f5a6'
down_revision = '4f9a63be9b4b'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'proposals',
        sa.Column('different_delivery_address', sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column('proposals', sa.Column('delivery_address', sa.Text(), nullable=True))
    # Default cobre linhas existentes; o app controla o default daqui pra frente.
    op.alter_column('proposals', 'different_delivery_address', server_default=None)


def downgrade():
    op.drop_column('proposals', 'delivery_address')
    op.drop_column('proposals', 'different_delivery_address')
