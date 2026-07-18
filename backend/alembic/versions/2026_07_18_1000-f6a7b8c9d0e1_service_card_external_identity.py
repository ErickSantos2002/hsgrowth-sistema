"""identidade externa no service_card (external_source, external_id)

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-07-18 10:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = 'f6a7b8c9d0e1'
down_revision = 'e5f6a7b8c9d0'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('service_cards', sa.Column('external_source', sa.String(length=50), nullable=True))
    op.add_column('service_cards', sa.Column('external_id', sa.String(length=100), nullable=True))
    op.create_index(op.f('ix_service_cards_external_source'), 'service_cards', ['external_source'])
    op.create_index(op.f('ix_service_cards_external_id'), 'service_cards', ['external_id'])
    op.create_unique_constraint(
        'unique_service_card_external_ref', 'service_cards', ['external_source', 'external_id']
    )


def downgrade():
    op.drop_constraint('unique_service_card_external_ref', 'service_cards', type_='unique')
    op.drop_index(op.f('ix_service_cards_external_id'), table_name='service_cards')
    op.drop_index(op.f('ix_service_cards_external_source'), table_name='service_cards')
    op.drop_column('service_cards', 'external_id')
    op.drop_column('service_cards', 'external_source')
