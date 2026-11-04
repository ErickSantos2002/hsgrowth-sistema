"""Parcerias: contrato do parceiro e confirmação do ganho

Revision ID: 5f6a7b8c9d0e
Revises: 4e5f6a7b8c9d
Create Date: 2026-11-04 15:00:00

Acrescenta contract_date e contract_activity_id em partners (trava para sair de
Formalização) e won_confirmed_at e won_confirmed_by_id em partner_opportunities
(o ganho marcado pelo parceiro é confirmado pela H&S). Só colunas novas e vazias.
"""
from alembic import op
import sqlalchemy as sa


revision = '5f6a7b8c9d0e'
down_revision = '4e5f6a7b8c9d'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('partners', sa.Column('contract_date', sa.Date(), nullable=True))
    op.add_column('partners', sa.Column('contract_activity_id', sa.Integer(), nullable=True))
    op.add_column('partner_opportunities', sa.Column('won_confirmed_at', sa.DateTime(), nullable=True))
    op.add_column('partner_opportunities', sa.Column('won_confirmed_by_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_partner_opportunities_won_confirmed_by_id', 'partner_opportunities', 'users',
        ['won_confirmed_by_id'], ['id'], ondelete='SET NULL',
    )


def downgrade():
    op.drop_constraint('fk_partner_opportunities_won_confirmed_by_id', 'partner_opportunities', type_='foreignkey')
    op.drop_column('partner_opportunities', 'won_confirmed_by_id')
    op.drop_column('partner_opportunities', 'won_confirmed_at')
    op.drop_column('partners', 'contract_activity_id')
    op.drop_column('partners', 'contract_date')
