"""add_reset_token_to_users

Revision ID: f8d3ccef2f2a
Revises: 1b01c98096da
Create Date: 2026-01-08 13:52:50.256227

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f8d3ccef2f2a'
down_revision = '1b01c98096da'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Adiciona colunas para reset de senha
    op.add_column('users', sa.Column('reset_token', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('reset_token_expires_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    # Remove colunas de reset de senha
    op.drop_column('users', 'reset_token_expires_at')
    op.drop_column('users', 'reset_token')
