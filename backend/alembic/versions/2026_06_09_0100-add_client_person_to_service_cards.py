"""add client_id and person_id to service_cards

Revision ID: 2026_06_09_0100
Revises: 2026_06_08_1200
Create Date: 2026-06-09 01:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '2026_06_09_0100'
down_revision = '2026_06_08_1200'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('service_cards', sa.Column('client_id', sa.Integer(), nullable=True))
    op.add_column('service_cards', sa.Column('person_id', sa.Integer(), nullable=True))
    op.create_index('ix_service_cards_client_id', 'service_cards', ['client_id'])
    op.create_index('ix_service_cards_person_id', 'service_cards', ['person_id'])
    op.create_foreign_key(
        'fk_service_cards_client_id', 'service_cards', 'clients',
        ['client_id'], ['id'], ondelete='SET NULL',
    )
    op.create_foreign_key(
        'fk_service_cards_person_id', 'service_cards', 'persons',
        ['person_id'], ['id'], ondelete='SET NULL',
    )


def downgrade():
    op.drop_constraint('fk_service_cards_person_id', 'service_cards', type_='foreignkey')
    op.drop_constraint('fk_service_cards_client_id', 'service_cards', type_='foreignkey')
    op.drop_index('ix_service_cards_person_id', table_name='service_cards')
    op.drop_index('ix_service_cards_client_id', table_name='service_cards')
    op.drop_column('service_cards', 'person_id')
    op.drop_column('service_cards', 'client_id')
