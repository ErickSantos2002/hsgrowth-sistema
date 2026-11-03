"""Parcerias: produto liberado para parceiros, desconto por linha, desconto geral e frete

Revision ID: 4e5f6a7b8c9d
Revises: 3d4e5f6a7b8c
Create Date: 2026-11-03 14:00:00

Acrescenta products.partner_enabled (já marca o produto "Phoebus"),
partner_opportunity_products.discount e global_discount, global_discount_type
e shipping em partner_opportunities. Nada é apagado; o que existe fica com zero.
"""
from alembic import op
import sqlalchemy as sa


revision = '4e5f6a7b8c9d'
down_revision = '3d4e5f6a7b8c'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('products', sa.Column('partner_enabled', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.execute("UPDATE products SET partner_enabled = TRUE WHERE lower(trim(name)) = 'phoebus'")

    op.add_column('partner_opportunity_products',
                  sa.Column('discount', sa.Numeric(12, 2), nullable=False, server_default='0'))
    op.add_column('partner_opportunities',
                  sa.Column('global_discount', sa.Numeric(12, 2), nullable=False, server_default='0'))
    op.add_column('partner_opportunities',
                  sa.Column('global_discount_type', sa.String(10), nullable=False, server_default='value'))
    op.add_column('partner_opportunities',
                  sa.Column('shipping', sa.Numeric(12, 2), nullable=False, server_default='0'))


def downgrade():
    op.drop_column('partner_opportunities', 'shipping')
    op.drop_column('partner_opportunities', 'global_discount_type')
    op.drop_column('partner_opportunities', 'global_discount')
    op.drop_column('partner_opportunity_products', 'discount')
    op.drop_column('products', 'partner_enabled')
