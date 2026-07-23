"""service_cards: colunas global_discount, global_discount_type, shipping

Valor do negócio dos cards de serviço passa a vir dos Serviços do card
(qtd × preço − desconto por serviço) com desconto global e frete aplicados
sobre o total. Estas 3 colunas guardam o desconto global e o frete do card.

Aditiva — apenas adiciona colunas com default. Nenhum dado é alterado.

Revision ID: b2c3d4e5f6a7
Revises: f1a2b3c4d5e6
Create Date: 2026-07-23 09:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = 'b2c3d4e5f6a7'
down_revision = 'f1a2b3c4d5e6'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('service_cards', sa.Column('global_discount', sa.Numeric(12, 2), nullable=False, server_default='0'))
    op.add_column('service_cards', sa.Column('global_discount_type', sa.String(10), nullable=False, server_default='value'))
    op.add_column('service_cards', sa.Column('shipping', sa.Numeric(12, 2), nullable=False, server_default='0'))


def downgrade():
    op.drop_column('service_cards', 'shipping')
    op.drop_column('service_cards', 'global_discount_type')
    op.drop_column('service_cards', 'global_discount')
