"""create proposals

Revision ID: 4f9a63be9b4b
Revises: add_service_role_2026
Create Date: 2026-07-02 15:14:09.284873

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '4f9a63be9b4b'
down_revision = 'add_service_role_2026'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('proposals',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('number', sa.Integer(), nullable=False),
    sa.Column('client_id', sa.Integer(), nullable=True),
    sa.Column('person_id', sa.Integer(), nullable=True),
    sa.Column('service_card_id', sa.Integer(), nullable=True),
    sa.Column('seller_name', sa.String(length=255), nullable=True),
    sa.Column('date', sa.Date(), nullable=True),
    sa.Column('next_contact_date', sa.Date(), nullable=True),
    sa.Column('intro', sa.Text(), nullable=True),
    sa.Column('other_items', sa.Text(), nullable=True),
    sa.Column('discount', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('shipping', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('shipping_method', sa.String(length=100), nullable=True),
    sa.Column('freight_type', sa.String(length=100), nullable=True),
    sa.Column('carrier_name', sa.String(length=255), nullable=True),
    sa.Column('payment_terms', sa.String(length=255), nullable=True),
    sa.Column('validity_days', sa.Integer(), nullable=True),
    sa.Column('delivery_date', sa.Date(), nullable=True),
    sa.Column('delivery_desc', sa.String(length=500), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('signature', sa.String(length=255), nullable=True),
    sa.Column('internal_status', sa.String(length=30), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.Column('deleted_at', sa.DateTime(), nullable=True),
    sa.Column('is_deleted', sa.Boolean(), nullable=False),
    sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['person_id'], ['persons.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['service_card_id'], ['service_cards.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_proposals_client_id'), 'proposals', ['client_id'], unique=False)
    op.create_index(op.f('ix_proposals_id'), 'proposals', ['id'], unique=False)
    op.create_index(op.f('ix_proposals_number'), 'proposals', ['number'], unique=True)
    op.create_index(op.f('ix_proposals_service_card_id'), 'proposals', ['service_card_id'], unique=False)
    op.create_table('proposal_items',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('proposal_id', sa.Integer(), nullable=False),
    sa.Column('product_id', sa.Integer(), nullable=True),
    sa.Column('description', sa.String(length=500), nullable=False),
    sa.Column('sku', sa.String(length=100), nullable=True),
    sa.Column('quantity', sa.Numeric(precision=12, scale=4), nullable=False),
    sa.Column('unit', sa.String(length=20), nullable=True),
    sa.Column('unit_price', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('total', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['proposal_id'], ['proposals.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_proposal_items_id'), 'proposal_items', ['id'], unique=False)
    op.create_index(op.f('ix_proposal_items_proposal_id'), 'proposal_items', ['proposal_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_proposal_items_proposal_id'), table_name='proposal_items')
    op.drop_index(op.f('ix_proposal_items_id'), table_name='proposal_items')
    op.drop_table('proposal_items')
    op.drop_index(op.f('ix_proposals_service_card_id'), table_name='proposals')
    op.drop_index(op.f('ix_proposals_number'), table_name='proposals')
    op.drop_index(op.f('ix_proposals_id'), table_name='proposals')
    op.drop_index(op.f('ix_proposals_client_id'), table_name='proposals')
    op.drop_table('proposals')
