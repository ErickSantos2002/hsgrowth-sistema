"""add business_info (JSON) to service_cards

Revision ID: 2026_06_12_0100
Revises: 2026_06_10_0100
Create Date: 2026-06-12 01:00:00.000000

Adiciona a coluna business_info (JSON, nullable) na tabela service_cards
para guardar as informações de negócio do Resumo (herdadas de Vendas e
específicas de Serviço): seller_name, deal_type, acquisition_channel,
acquisition_channel_detail, modality (venda|locacao), should_invoice.

Mudança aditiva e retrocompatível: o código atual em produção ignora a
coluna nova; nada quebra.
"""
from alembic import op
import sqlalchemy as sa


revision = '2026_06_12_0100'
down_revision = '2026_06_10_0100'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('service_cards', sa.Column('business_info', sa.JSON(), nullable=True))


def downgrade():
    op.drop_column('service_cards', 'business_info')
