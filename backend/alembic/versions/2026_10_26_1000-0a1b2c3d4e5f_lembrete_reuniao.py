"""lembrete de reuniao por e-mail: colunas em card_tasks

Revision ID: 0a1b2c3d4e5f
Revises: f0a1b2c3d4e5
Create Date: 2026-10-26 10:00:00

Lembrete por e-mail aos convidados da reuniao: as 8h do dia e 1 hora antes.

- invite_organizer_id: quem enviou o convite (o lembrete sai da mesma conta).
- reminder_day_sent_for / reminder_1h_sent_for: o horario da reuniao para o
  qual cada lembrete ja saiu. Se a reuniao for remarcada, o horario muda e o
  lembrete vale de novo.

Somente acrescimos: nenhuma coluna existente e alterada.
"""
from alembic import op
import sqlalchemy as sa


revision = '0a1b2c3d4e5f'
down_revision = 'f0a1b2c3d4e5'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'card_tasks',
        sa.Column(
            'invite_organizer_id', sa.Integer(),
            sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True,
            comment='Quem enviou o convite (remetente do lembrete)',
        ),
    )
    op.add_column(
        'card_tasks',
        sa.Column(
            'reminder_day_sent_for', sa.DateTime(), nullable=True,
            comment='Horario da reuniao para o qual o lembrete do dia saiu',
        ),
    )
    op.add_column(
        'card_tasks',
        sa.Column(
            'reminder_1h_sent_for', sa.DateTime(), nullable=True,
            comment='Horario da reuniao para o qual o lembrete de 1 hora saiu',
        ),
    )


def downgrade():
    op.drop_column('card_tasks', 'reminder_1h_sent_for')
    op.drop_column('card_tasks', 'reminder_day_sent_for')
    op.drop_column('card_tasks', 'invite_organizer_id')
