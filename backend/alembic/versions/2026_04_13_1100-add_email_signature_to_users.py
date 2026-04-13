"""add email_signature to users

Revision ID: 2026_04_13_1100
Revises: 2026_04_13_1000
Create Date: 2026-04-13 11:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '2026_04_13_1100'
down_revision = '2026_04_13_1000'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column(
        'email_signature',
        sa.Text(),
        nullable=True,
        comment='Assinatura HTML do e-mail — anexada automaticamente ao enviar pelo CRM'
    ))


def downgrade():
    op.drop_column('users', 'email_signature')
