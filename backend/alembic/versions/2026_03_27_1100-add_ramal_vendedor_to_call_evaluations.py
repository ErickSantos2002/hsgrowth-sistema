"""Adiciona ramal e vendedor_name em call_evaluations para identificação do vendedor.

Revision ID: add_ramal_vendedor_call_evaluations_2026
Revises: add_call_evaluations_table_2026
Create Date: 2026-03-27 11:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = 'call_eval_ramal_vendedor_2026'
down_revision = 'add_call_evaluations_table_2026'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('call_evaluations', sa.Column('ramal', sa.String(20), nullable=True, comment='Ramal do vendedor que realizou a ligação'))
    op.add_column('call_evaluations', sa.Column('vendedor_name', sa.String(255), nullable=True, comment='Nome do vendedor que realizou a ligação'))


def downgrade():
    op.drop_column('call_evaluations', 'vendedor_name')
    op.drop_column('call_evaluations', 'ramal')
