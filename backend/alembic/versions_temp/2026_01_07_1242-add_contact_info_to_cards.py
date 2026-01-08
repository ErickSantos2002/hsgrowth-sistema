"""add_contact_info_to_cards

Revision ID: 19d12b3c3393
Revises: fe459c9d78eb
Create Date: 2026-01-07 12:42:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '19d12b3c3393'
down_revision = 'fe459c9d78eb'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Adiciona coluna contact_info (JSON) na tabela cards
    op.add_column('cards', sa.Column('contact_info', postgresql.JSON(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    # Remove coluna contact_info da tabela cards
    op.drop_column('cards', 'contact_info')
