"""Merge api4com and automations branches

Revision ID: 2026_02_02_1322
Revises: 23f6b72d48a4, 2026_02_02_1321
Create Date: 2026-02-02 13:22:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2026_02_02_1322'
down_revision = ('23f6b72d48a4', '2026_02_02_1321')
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Merge - sem mudanças no banco"""
    pass


def downgrade() -> None:
    """Merge - sem mudanças no banco"""
    pass
