"""Adiciona campo automacao01 na tabela cards.

Revision ID: add_automacao01_to_cards
Revises: call_eval_ramal_vendedor_2026
Create Date: 2026-03-30 10:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_automacao01_to_cards'
down_revision = 'call_eval_ramal_vendedor_2026'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('cards', sa.Column(
        'automacao01',
        sa.Boolean(),
        nullable=True,
        server_default=sa.false(),
        comment='Automação de nutrição por e-mail — envia webhook para sistema externo quando ativado/desativado'
    ))


def downgrade():
    op.drop_column('cards', 'automacao01')
