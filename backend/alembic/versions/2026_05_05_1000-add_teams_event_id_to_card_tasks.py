"""add teams_event_id to card_tasks

Revision ID: 2026_05_05_1000
Revises: 2026_04_24_1000
Create Date: 2026-05-05 10:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = '2026_05_05_1000'
down_revision = '2026_04_24_1000'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'card_tasks',
        sa.Column('teams_event_id', sa.String(255), nullable=True,
                  comment='ID do evento no calendário do Outlook (usado para reagendar)')
    )


def downgrade():
    op.drop_column('card_tasks', 'teams_event_id')
