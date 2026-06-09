"""add calibration_price to products

Revision ID: 2026_06_09_0300
Revises: 2026_06_09_0200
Create Date: 2026-06-09 03:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '2026_06_09_0300'
down_revision = '2026_06_09_0200'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'products',
        sa.Column('calibration_price', sa.Numeric(12, 2), nullable=True, server_default='0'),
    )


def downgrade():
    op.drop_column('products', 'calibration_price')
