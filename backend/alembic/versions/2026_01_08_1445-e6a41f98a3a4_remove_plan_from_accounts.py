"""remove_plan_from_accounts

Revision ID: e6a41f98a3a4
Revises: f8d3ccef2f2a
Create Date: 2026-01-08 14:45:49.885882

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e6a41f98a3a4'
down_revision = 'f8d3ccef2f2a'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Remove coluna plan de accounts (não faz sentido em sistema interno)
    op.drop_column('accounts', 'plan')


def downgrade() -> None:
    # Recriar coluna plan se precisar reverter
    op.add_column('accounts', sa.Column('plan', sa.String(50), nullable=True))
