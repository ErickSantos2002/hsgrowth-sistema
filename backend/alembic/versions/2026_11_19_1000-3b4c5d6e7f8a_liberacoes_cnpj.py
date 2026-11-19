"""Pedidos de liberação de CNPJ em Vendas

Revision ID: 3b4c5d6e7f8a
Revises: 2a3b4c5d6e7f
Create Date: 2026-11-19 10:00:00

Tabela nova cnpj_release_requests. Aditiva: pode rodar antes do código.
"""
from alembic import op
import sqlalchemy as sa


revision = '3b4c5d6e7f8a'
down_revision = '2a3b4c5d6e7f'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'cnpj_release_requests',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('kind', sa.String(20), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='pendente'),
        sa.Column('client_id', sa.Integer(), sa.ForeignKey('clients.id', ondelete='SET NULL'), nullable=True),
        sa.Column('cnpj', sa.String(14), nullable=False),
        sa.Column('card_id', sa.Integer(), sa.ForeignKey('cards.id', ondelete='SET NULL'), nullable=True),
        sa.Column('payload', sa.JSON(), nullable=False),
        sa.Column('reason', sa.String(500), nullable=False),
        sa.Column('blocked_with', sa.String(500), nullable=False),
        sa.Column('requested_by_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('decided_by_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('decided_at', sa.DateTime(), nullable=True),
        sa.Column('decision_note', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_cnpj_release_requests_id', 'cnpj_release_requests', ['id'])
    op.create_index('ix_cnpj_release_requests_status', 'cnpj_release_requests', ['status'])
    op.create_index('ix_cnpj_release_requests_cnpj', 'cnpj_release_requests', ['cnpj'])
    op.create_index('ix_cnpj_release_requests_requested_by_id', 'cnpj_release_requests', ['requested_by_id'])
    op.create_index('ix_cnpj_release_requests_created_at', 'cnpj_release_requests', ['created_at'])


def downgrade():
    op.drop_table('cnpj_release_requests')
