"""call_logs: allow service_card_id (card_id nullable + service_card_id FK)

Revision ID: 2026_06_10_0100
Revises: 2026_06_09_0400
Create Date: 2026-06-10 01:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '2026_06_10_0100'
down_revision = '2026_06_09_0400'
branch_labels = None
depends_on = None


def upgrade():
    # card_id passa a ser opcional (chamadas de service cards não têm card de vendas)
    op.alter_column('call_logs', 'card_id', existing_type=sa.Integer(), nullable=True)
    # Novo vínculo opcional com card de serviços
    op.add_column('call_logs', sa.Column('service_card_id', sa.Integer(), nullable=True))
    op.create_index('ix_call_logs_service_card_id', 'call_logs', ['service_card_id'], unique=False)
    op.create_foreign_key(
        'fk_call_logs_service_card_id', 'call_logs', 'service_cards',
        ['service_card_id'], ['id'], ondelete='CASCADE',
    )


def downgrade():
    op.drop_constraint('fk_call_logs_service_card_id', 'call_logs', type_='foreignkey')
    op.drop_index('ix_call_logs_service_card_id', table_name='call_logs')
    op.drop_column('call_logs', 'service_card_id')
    op.alter_column('call_logs', 'card_id', existing_type=sa.Integer(), nullable=False)
