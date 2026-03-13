"""Adiciona coluna is_noshow à tabela card_tasks para rastrear reuniões com NoShow.

Revision ID: add_is_noshow_card_tasks_2026
Revises: add_note_type_card_notes_2026
Create Date: 2026-03-13 11:00:00
"""

from alembic import op
import sqlalchemy as sa

revision = 'add_is_noshow_card_tasks_2026'
down_revision = 'add_note_type_card_notes_2026'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Adiciona coluna is_noshow — identifica reuniões em que o contato não compareceu
    op.add_column(
        'card_tasks',
        sa.Column('is_noshow', sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column('card_tasks', 'is_noshow')
