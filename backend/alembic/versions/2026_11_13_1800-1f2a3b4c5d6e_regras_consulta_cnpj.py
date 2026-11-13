"""Regras configuráveis da Consulta de CNPJ

Revision ID: 1f2a3b4c5d6e
Revises: 0e1f2a3b4c5d
Create Date: 2026-11-13 18:00:00

Tabela de uma linha com os prazos do semáforo, o limite diário de consultas e a trava
de Vendas entre vendedores. Já nasce com os valores de hoje (10/30/90/20, trava ligada).
Aditiva: pode rodar antes do código.
"""
from alembic import op
import sqlalchemy as sa


revision = '1f2a3b4c5d6e'
down_revision = '0e1f2a3b4c5d'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'cnpj_rules_config',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('protection_days', sa.Integer(), nullable=False, server_default='10'),
        sa.Column('recent_purchase_days', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('recent_loss_days', sa.Integer(), nullable=False, server_default='90'),
        sa.Column('daily_query_limit', sa.Integer(), nullable=False, server_default='20'),
        sa.Column('block_between_sellers', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_by_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
    )
    op.create_index('ix_cnpj_rules_config_id', 'cnpj_rules_config', ['id'])
    # A linha única, com os padrões acima (sem informar o id: a sequence segue certa).
    op.execute("INSERT INTO cnpj_rules_config (protection_days) VALUES (10)")


def downgrade():
    op.drop_index('ix_cnpj_rules_config_id', table_name='cnpj_rules_config')
    op.drop_table('cnpj_rules_config')
