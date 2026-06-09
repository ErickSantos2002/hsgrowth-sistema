"""create service_card_products and add payment_info to service_cards

Revision ID: 2026_06_09_0200
Revises: 2026_06_09_0100
Create Date: 2026-06-09 02:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '2026_06_09_0200'
down_revision = '2026_06_09_0100'
branch_labels = None
depends_on = None


def upgrade():
    # Tabela service_card_products (produtos vinculados a cards de serviços)
    op.create_table(
        'service_card_products',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('service_card_id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('unit_price', sa.Numeric(12, 2), nullable=False),
        sa.Column('discount', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['service_card_id'], ['service_cards.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('service_card_id', 'product_id', name='unique_service_card_product'),
    )
    op.create_index(op.f('ix_service_card_products_id'), 'service_card_products', ['id'], unique=False)
    op.create_index('ix_service_card_products_service_card_id', 'service_card_products', ['service_card_id'], unique=False)
    op.create_index('ix_service_card_products_product_id', 'service_card_products', ['product_id'], unique=False)

    # Coluna payment_info (desconto global + condições de pagamento) em service_cards
    op.add_column('service_cards', sa.Column('payment_info', sa.JSON(), nullable=True))


def downgrade():
    op.drop_column('service_cards', 'payment_info')
    op.drop_index('ix_service_card_products_product_id', table_name='service_card_products')
    op.drop_index('ix_service_card_products_service_card_id', table_name='service_card_products')
    op.drop_index(op.f('ix_service_card_products_id'), table_name='service_card_products')
    op.drop_table('service_card_products')
