"""tipo da reuniao e convidados do convite

Revision ID: b6c7d8e9f0a1
Revises: a5b6c7d8e9f0
Create Date: 2026-09-24 10:00:00

Duas colunas em card_tasks, as duas nulas: nenhuma reuniao existente precisa
ser alterada, e reuniao sem tipo nao entra na avaliacao automatica.

Somente acrescimos.
"""
from alembic import op
import sqlalchemy as sa


revision = 'b6c7d8e9f0a1'
down_revision = 'a5b6c7d8e9f0'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'card_tasks',
        sa.Column(
            'meeting_kind', sa.String(30), nullable=True,
            comment='Tipo da reuniao: apresentacao_phoebus, duvidas_phoebus, apresentacao, duvidas, outra',
        ),
    )
    op.create_index('ix_card_tasks_meeting_kind', 'card_tasks', ['meeting_kind'])
    op.add_column(
        'card_tasks',
        sa.Column(
            'invited_emails', sa.JSON(), nullable=True,
            comment='Enderecos que receberam o convite',
        ),
    )


def downgrade():
    op.drop_index('ix_card_tasks_meeting_kind', table_name='card_tasks')
    op.drop_column('card_tasks', 'invited_emails')
    op.drop_column('card_tasks', 'meeting_kind')
