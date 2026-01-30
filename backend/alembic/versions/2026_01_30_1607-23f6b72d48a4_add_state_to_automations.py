"""add_state_to_automations

Revision ID: 23f6b72d48a4
Revises: 4bd904519b52
Create Date: 2026-01-30 16:07:55.714815

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '23f6b72d48a4'
down_revision = '4bd904519b52'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Adiciona campo state para guardar estados persistentes das automações"""
    op.add_column('automations', sa.Column('state', sa.JSON(), nullable=False, server_default='{}'))


def downgrade() -> None:
    """Remove campo state"""
    op.drop_column('automations', 'state')
