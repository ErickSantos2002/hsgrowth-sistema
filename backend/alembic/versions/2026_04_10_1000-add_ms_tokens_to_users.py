"""add ms tokens to users

Revision ID: 2026_04_10_1000
Revises: 2026_04_06_1000
Create Date: 2026-04-10 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '2026_04_10_1000'
down_revision = '2026_04_06_1000'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column(
        'ms_access_token', sa.Text(), nullable=True,
        comment='Token de acesso Microsoft Graph (SSO) — expira em ~1h'
    ))
    op.add_column('users', sa.Column(
        'ms_refresh_token', sa.Text(), nullable=True,
        comment='Refresh token Microsoft Graph — usado para renovar o access token'
    ))
    op.add_column('users', sa.Column(
        'ms_token_expires_at', sa.DateTime(), nullable=True,
        comment='Timestamp de expiração do ms_access_token'
    ))


def downgrade():
    op.drop_column('users', 'ms_token_expires_at')
    op.drop_column('users', 'ms_refresh_token')
    op.drop_column('users', 'ms_access_token')
