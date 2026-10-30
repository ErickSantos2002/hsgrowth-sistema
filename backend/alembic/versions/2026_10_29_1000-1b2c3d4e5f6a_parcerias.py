"""Programa de Parceiros: tabelas, users.partner_id e roles partner/finance

Revision ID: 1b2c3d4e5f6a
Revises: 0a1b2c3d4e5f
Create Date: 2026-10-29 10:00:00

Somente acréscimos: nenhuma coluna existente é alterada.
"""
from alembic import op
import sqlalchemy as sa


revision = '1b2c3d4e5f6a'
down_revision = '0a1b2c3d4e5f'
branch_labels = None
depends_on = None


def _timestamps():
    return [
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    ]


def _soft_delete():
    return [
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.false()),
    ]


def upgrade():
    op.execute("""
        INSERT INTO roles (name, display_name, description, permissions, is_system_role, created_at, updated_at)
        VALUES
            ('partner', 'Parceiro',
             'Parceiro do Programa de Parceiros: só a seção Parcerias, com as próprias oportunidades',
             '[]', true, now(), now()),
            ('finance', 'Financeiro',
             'Acompanha a seção Parcerias e valida a elegibilidade das oportunidades',
             '[]', true, now(), now())
        ON CONFLICT (name) DO NOTHING;
    """)

    op.create_table(
        'partners',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('cnpj', sa.String(14), nullable=True),
        sa.Column('main_contact_name', sa.String(255), nullable=True),
        sa.Column('main_contact_phone', sa.String(30), nullable=True),
        sa.Column('main_contact_email', sa.String(255), nullable=True),
        sa.Column('partner_type', sa.String(100), nullable=True),
        sa.Column('origin', sa.String(100), nullable=True),
        sa.Column('segment', sa.String(255), nullable=True),
        sa.Column('region', sa.String(255), nullable=True),
        sa.Column('hs_owner_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('qualification_status', sa.String(30), nullable=True),
        sa.Column('onboarding_date', sa.Date(), nullable=True),
        sa.Column('activation_evidence', sa.String(30), nullable=True),
        sa.Column('activated_at', sa.DateTime(), nullable=True),
        sa.Column('activation_opportunity_id', sa.Integer(), nullable=True),
        sa.Column('stage', sa.String(30), nullable=False, server_default='potencial'),
        sa.Column('position', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('loss_reason', sa.String(255), nullable=True),
        sa.Column('loss_detail', sa.Text(), nullable=True),
        sa.Column('lost_at', sa.DateTime(), nullable=True),
        sa.Column('created_by_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        *_timestamps(),
        *_soft_delete(),
    )
    op.create_index('ix_partners_id', 'partners', ['id'])
    op.create_index('ix_partners_name', 'partners', ['name'])
    op.create_index('ix_partners_cnpj', 'partners', ['cnpj'])
    op.create_index('ix_partners_hs_owner_id', 'partners', ['hs_owner_id'])
    op.create_index('ix_partners_stage', 'partners', ['stage'])

    op.create_table(
        'partner_team_members',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('partner_id', sa.Integer(), sa.ForeignKey('partners.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('phone', sa.String(30), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        *_timestamps(),
    )
    op.create_index('ix_partner_team_members_id', 'partner_team_members', ['id'])
    op.create_index('ix_partner_team_members_partner_id', 'partner_team_members', ['partner_id'])

    op.create_table(
        'partner_opportunities',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('partner_id', sa.Integer(), sa.ForeignKey('partners.id', ondelete='CASCADE'), nullable=False),
        sa.Column('seller_member_id', sa.Integer(),
                  sa.ForeignKey('partner_team_members.id', ondelete='SET NULL'), nullable=True),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('deal_type', sa.String(100), nullable=False),
        sa.Column('sector', sa.String(100), nullable=False),
        sa.Column('relationship_type', sa.String(100), nullable=False),
        sa.Column('context', sa.Text(), nullable=False),
        sa.Column('cnpj', sa.String(14), nullable=False),
        sa.Column('company_name', sa.String(255), nullable=False),
        sa.Column('company_segment', sa.String(255), nullable=True),
        sa.Column('company_city', sa.String(255), nullable=True),
        sa.Column('company_state', sa.String(2), nullable=True),
        sa.Column('contact_name', sa.String(255), nullable=True),
        sa.Column('contact_role', sa.String(255), nullable=True),
        sa.Column('contact_phone', sa.String(30), nullable=True),
        sa.Column('contact_email', sa.String(255), nullable=True),
        sa.Column('eligibility_status', sa.String(20), nullable=False, server_default='em_analise'),
        sa.Column('eligibility_note', sa.Text(), nullable=True),
        sa.Column('eligibility_by_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('eligibility_at', sa.DateTime(), nullable=True),
        sa.Column('expected_close_date', sa.Date(), nullable=True),
        sa.Column('modality', sa.String(10), nullable=True),
        sa.Column('loss_reason', sa.String(255), nullable=True),
        sa.Column('loss_detail', sa.Text(), nullable=True),
        sa.Column('stage', sa.String(30), nullable=False, server_default='novo_lead'),
        sa.Column('position', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('last_activity_at', sa.DateTime(), nullable=True),
        sa.Column('won_at', sa.DateTime(), nullable=True),
        sa.Column('lost_at', sa.DateTime(), nullable=True),
        sa.Column('created_by_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        *_timestamps(),
        *_soft_delete(),
    )
    op.create_index('ix_partner_opportunities_id', 'partner_opportunities', ['id'])
    op.create_index('ix_partner_opportunities_partner_id', 'partner_opportunities', ['partner_id'])
    op.create_index('ix_partner_opportunities_cnpj', 'partner_opportunities', ['cnpj'])
    op.create_index('ix_partner_opportunities_stage', 'partner_opportunities', ['stage'])
    op.create_index('ix_partner_opportunities_last_activity_at', 'partner_opportunities', ['last_activity_at'])

    op.create_table(
        'partner_opportunity_products',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('opportunity_id', sa.Integer(),
                  sa.ForeignKey('partner_opportunities.id', ondelete='CASCADE'), nullable=False),
        sa.Column('product_id', sa.Integer(), sa.ForeignKey('products.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('unit_price', sa.Numeric(12, 2), nullable=False, server_default='0'),
        *_timestamps(),
    )
    op.create_index('ix_partner_opportunity_products_id', 'partner_opportunity_products', ['id'])
    op.create_index('ix_partner_opportunity_products_opportunity_id', 'partner_opportunity_products',
                    ['opportunity_id'])

    op.create_table(
        'partner_activities',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('partner_id', sa.Integer(), sa.ForeignKey('partners.id', ondelete='CASCADE'), nullable=True),
        sa.Column('opportunity_id', sa.Integer(),
                  sa.ForeignKey('partner_opportunities.id', ondelete='CASCADE'), nullable=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('type', sa.String(20), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('due_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        *_timestamps(),
    )
    op.create_index('ix_partner_activities_id', 'partner_activities', ['id'])
    op.create_index('ix_partner_activities_partner_id', 'partner_activities', ['partner_id'])
    op.create_index('ix_partner_activities_opportunity_id', 'partner_activities', ['opportunity_id'])

    op.add_column('users', sa.Column('partner_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_users_partner_id', 'users', 'partners', ['partner_id'], ['id'], ondelete='SET NULL')
    op.create_index('ix_users_partner_id', 'users', ['partner_id'])


def downgrade():
    op.drop_index('ix_users_partner_id', table_name='users')
    op.drop_constraint('fk_users_partner_id', 'users', type_='foreignkey')
    op.drop_column('users', 'partner_id')
    op.drop_table('partner_activities')
    op.drop_table('partner_opportunity_products')
    op.drop_table('partner_opportunities')
    op.drop_table('partner_team_members')
    op.drop_table('partners')
    # Falha se ainda houver usuário com essas roles — de propósito.
    op.execute("DELETE FROM roles WHERE name IN ('partner', 'finance');")
