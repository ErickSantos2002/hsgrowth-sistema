"""add scheduled_time to cadence_steps

Revision ID: 2026_04_15_1000
Revises: 2026_04_14_1300
Create Date: 2026-04-15 10:00:00

"""
from alembic import op
import sqlalchemy as sa

revision = '2026_04_15_1000'
down_revision = '2026_04_14_1300'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'cadence_steps',
        sa.Column(
            'scheduled_time',
            sa.String(5),
            nullable=True,
            comment='Horário agendado no formato HH:MM (ex: 09:00). Se nulo, usa hora atual ao criar a task.'
        )
    )


def downgrade():
    op.drop_column('cadence_steps', 'scheduled_time')
