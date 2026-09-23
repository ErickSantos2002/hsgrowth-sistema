"""mensagem do convite da reuniao

Revision ID: c7d8e9f0a1b2
Revises: b6c7d8e9f0a1
Create Date: 2026-09-24 11:00:00

O texto que o vendedor escreve no convite. Nulo nas reunioes existentes, que
seguem com o texto padrao.

Somente acrescimos.
"""
from alembic import op
import sqlalchemy as sa


revision = 'c7d8e9f0a1b2'
down_revision = 'b6c7d8e9f0a1'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'card_tasks',
        sa.Column(
            'invite_message', sa.Text(), nullable=True,
            comment='Texto do convite escrito pelo vendedor',
        ),
    )


def downgrade():
    op.drop_column('card_tasks', 'invite_message')
