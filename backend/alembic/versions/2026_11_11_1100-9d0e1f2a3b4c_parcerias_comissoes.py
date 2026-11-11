"""Parcerias: comissões, calibrações e âncora da primeira venda

Revision ID: 9d0e1f2a3b4c
Revises: 8c9d0e1f2a3b
Create Date: 2026-11-11 11:00:00

- partner_commission_config (linha única, zeros e 24 meses), partner_calibrations e partner_commissions.
- partners: first_sale_at e first_sale_opportunity_id (âncora do prazo de indicação).
"""
from alembic import op
import sqlalchemy as sa


revision = '9d0e1f2a3b4c'
down_revision = '8c9d0e1f2a3b'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('partners', sa.Column('first_sale_at', sa.DateTime(), nullable=True))
    op.add_column('partners', sa.Column('first_sale_opportunity_id', sa.Integer(), nullable=True))

    op.create_table(
        'partner_commission_config',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('own_sale_pct', sa.Numeric(5, 2), nullable=False, server_default='0'),
        sa.Column('indication_pct', sa.Numeric(5, 2), nullable=False, server_default='0'),
        sa.Column('first_sale_bonus', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('indication_months', sa.Integer(), nullable=False, server_default='24'),
        sa.Column('calibration_pct', sa.Numeric(5, 2), nullable=False, server_default='0'),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_by_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
    )
    op.create_index('ix_partner_commission_config_id', 'partner_commission_config', ['id'])
    op.execute("INSERT INTO partner_commission_config "
               "(own_sale_pct, indication_pct, first_sale_bonus, indication_months, calibration_pct) "
               "VALUES (0, 0, 0, 24, 0)")

    op.create_table(
        'partner_calibrations',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('opportunity_id', sa.Integer(),
                  sa.ForeignKey('partner_opportunities.id', ondelete='CASCADE'), nullable=False),
        sa.Column('serial_number', sa.String(60), nullable=False),
        sa.Column('calibration_date', sa.Date(), nullable=False),
        sa.Column('value', sa.Numeric(12, 2), nullable=False),
        sa.Column('created_by_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_partner_calibrations_id', 'partner_calibrations', ['id'])
    op.create_index('ix_partner_calibrations_opportunity_id', 'partner_calibrations', ['opportunity_id'])

    op.create_table(
        'partner_commissions',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('beneficiary_partner_id', sa.Integer(),
                  sa.ForeignKey('partners.id', ondelete='CASCADE'), nullable=False),
        sa.Column('source_partner_id', sa.Integer(),
                  sa.ForeignKey('partners.id', ondelete='CASCADE'), nullable=False),
        sa.Column('opportunity_id', sa.Integer(),
                  sa.ForeignKey('partner_opportunities.id', ondelete='CASCADE'), nullable=False),
        sa.Column('calibration_id', sa.Integer(),
                  sa.ForeignKey('partner_calibrations.id', ondelete='CASCADE'), nullable=True),
        sa.Column('kind', sa.String(20), nullable=False),
        sa.Column('base_value', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('rate', sa.Numeric(5, 2), nullable=True),
        sa.Column('fixed_value', sa.Numeric(12, 2), nullable=True),
        sa.Column('amount', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('status', sa.String(12), nullable=False, server_default='pendente'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('paid_at', sa.DateTime(), nullable=True),
        sa.Column('paid_by_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('cancelled_at', sa.DateTime(), nullable=True),
        sa.Column('cancel_reason', sa.String(255), nullable=True),
    )
    op.create_index('ix_partner_commissions_id', 'partner_commissions', ['id'])
    op.create_index('ix_partner_commissions_beneficiary_partner_id', 'partner_commissions', ['beneficiary_partner_id'])
    op.create_index('ix_partner_commissions_opportunity_id', 'partner_commissions', ['opportunity_id'])
    op.create_index('ix_partner_commissions_status', 'partner_commissions', ['status'])


def downgrade():
    op.drop_table('partner_commissions')
    op.drop_table('partner_calibrations')
    op.drop_table('partner_commission_config')
    op.drop_column('partners', 'first_sale_opportunity_id')
    op.drop_column('partners', 'first_sale_at')
