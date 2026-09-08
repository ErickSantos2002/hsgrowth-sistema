"""card_tasks: campos da reuniao por video (Daily)

Aditiva — todas as colunas sao nullable e nenhuma linha existente e alterada.
As reunioes Teams atuais continuam funcionando sem mudanca: nelas
meeting_provider fica nulo, e o codigo trata nulo como "teams".

Revision ID: c1d2e3f4a5b6
Revises: b2c3d4e5f6a7
Create Date: 2026-09-08 10:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = 'c1d2e3f4a5b6'
down_revision = 'b2c3d4e5f6a7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('card_tasks', sa.Column(
        'meeting_provider', sa.String(20), nullable=True,
        comment='teams | daily | null (null = teams, por compatibilidade)'))
    op.add_column('card_tasks', sa.Column(
        'daily_room_name', sa.String(255), nullable=True,
        comment='Nome unico da sala no Daily'))
    op.add_column('card_tasks', sa.Column(
        'daily_room_url', sa.String(1000), nullable=True,
        comment='URL da sala no Daily'))
    op.add_column('card_tasks', sa.Column(
        'public_access_token', sa.String(64), nullable=True,
        comment='Token opaco do link publico do convidado'))
    op.add_column('card_tasks', sa.Column(
        'meeting_started_at', sa.DateTime(), nullable=True,
        comment='Quando o host entrou na sala'))
    op.add_column('card_tasks', sa.Column(
        'contact_joined_at', sa.DateTime(), nullable=True,
        comment='Quando o convidado entrou na sala'))
    op.add_column('card_tasks', sa.Column(
        'meeting_ended_at', sa.DateTime(), nullable=True,
        comment='Quando a sala encerrou'))

    op.create_index('ix_card_tasks_public_access_token', 'card_tasks',
                    ['public_access_token'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_card_tasks_public_access_token', table_name='card_tasks')
    for col in ('meeting_ended_at', 'contact_joined_at', 'meeting_started_at',
                'public_access_token', 'daily_room_url', 'daily_room_name',
                'meeting_provider'):
        op.drop_column('card_tasks', col)
