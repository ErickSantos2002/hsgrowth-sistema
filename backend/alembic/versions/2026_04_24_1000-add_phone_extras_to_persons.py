"""add phone_extra1 and phone_extra2 to persons

Revision ID: 2026_04_24_1000
Revises: 2026_04_15_1000
Create Date: 2026-04-24 10:00:00

"""
from alembic import op
import sqlalchemy as sa


revision = '2026_04_24_1000'
down_revision = '2026_04_15_1000'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('persons', sa.Column('phone_extra1', sa.String(50), nullable=True))
    op.add_column('persons', sa.Column('phone_extra2', sa.String(50), nullable=True))


def downgrade():
    op.drop_column('persons', 'phone_extra2')
    op.drop_column('persons', 'phone_extra1')
