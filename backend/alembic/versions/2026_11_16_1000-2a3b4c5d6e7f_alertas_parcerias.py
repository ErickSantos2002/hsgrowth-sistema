"""Preferências dos alertas de Parcerias

Revision ID: 2a3b4c5d6e7f
Revises: 1f2a3b4c5d6e
Create Date: 2026-11-16 10:00:00

Duas colunas em user_notification_settings, ligadas para todo mundo.
Aditiva: pode rodar antes do código.
"""
from alembic import op
import sqlalchemy as sa


revision = '2a3b4c5d6e7f'
down_revision = '1f2a3b4c5d6e'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('user_notification_settings',
                  sa.Column('parcerias_protecao', sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column('user_notification_settings',
                  sa.Column('parcerias_convite', sa.Boolean(), nullable=False, server_default=sa.true()))


def downgrade():
    op.drop_column('user_notification_settings', 'parcerias_convite')
    op.drop_column('user_notification_settings', 'parcerias_protecao')
