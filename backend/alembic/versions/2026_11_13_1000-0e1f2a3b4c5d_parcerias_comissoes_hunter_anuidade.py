"""Parcerias: % de venda própria do hunter e anuidade de referência

Revision ID: 0e1f2a3b4c5d
Revises: 9d0e1f2a3b4c
Create Date: 2026-11-13 10:00:00

- partner_commission_config.hunter_own_sale_pct: venda própria do hunter (o own_sale_pct
  passa a ser só da empresa).
- partner_commission_config.annual_fee_reference: anuidade usada só na previsão das renovações.
Aditiva: pode rodar antes do código.
"""
from alembic import op
import sqlalchemy as sa


revision = '0e1f2a3b4c5d'
down_revision = '9d0e1f2a3b4c'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('partner_commission_config',
                  sa.Column('hunter_own_sale_pct', sa.Numeric(5, 2), nullable=False, server_default='0'))
    op.add_column('partner_commission_config',
                  sa.Column('annual_fee_reference', sa.Numeric(12, 2), nullable=False, server_default='0'))


def downgrade():
    op.drop_column('partner_commission_config', 'annual_fee_reference')
    op.drop_column('partner_commission_config', 'hunter_own_sale_pct')
