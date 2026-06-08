"""add deleted_at to service_boards and service_cards

Revision ID: 2026_06_08_1200
Revises: 2026_06_08_1100
Create Date: 2026-06-08 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '2026_06_08_1200'
down_revision = '2026_06_08_1100'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('service_boards', sa.Column('deleted_at', sa.DateTime(), nullable=True))
    op.add_column('service_cards', sa.Column('deleted_at', sa.DateTime(), nullable=True))


def downgrade():
    op.drop_column('service_boards', 'deleted_at')
    op.drop_column('service_cards', 'deleted_at')
