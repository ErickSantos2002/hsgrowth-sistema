"""cria catalogo de servicos: services + service_card_services

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-07-08 10:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = 'e5f6a7b8c9d0'
down_revision = 'd4e5f6a7b8c9'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'services',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('sku', sa.String(length=100), nullable=True),
        sa.Column('unit_price', sa.Numeric(12, 2), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_services_id'), 'services', ['id'])
    op.create_index(op.f('ix_services_name'), 'services', ['name'])
    op.create_index(op.f('ix_services_sku'), 'services', ['sku'], unique=True)
    op.create_index(op.f('ix_services_category'), 'services', ['category'])
    op.create_index(op.f('ix_services_is_active'), 'services', ['is_active'])

    op.create_table(
        'service_card_services',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('service_card_id', sa.Integer(), nullable=False),
        sa.Column('service_id', sa.Integer(), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('unit_price', sa.Numeric(12, 2), nullable=False),
        sa.Column('discount', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['service_card_id'], ['service_cards.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['service_id'], ['services.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('service_card_id', 'service_id', name='unique_service_card_service'),
    )
    op.create_index(op.f('ix_service_card_services_id'), 'service_card_services', ['id'])
    op.create_index(op.f('ix_service_card_services_service_card_id'), 'service_card_services', ['service_card_id'])
    op.create_index(op.f('ix_service_card_services_service_id'), 'service_card_services', ['service_id'])


def downgrade():
    op.drop_table('service_card_services')
    op.drop_table('services')
