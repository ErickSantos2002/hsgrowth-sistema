"""chave de api estatica e escopos no integration_client

Revision ID: b8c9d0e1f2a3
Revises: a7b8c9d0e1f2
Create Date: 2026-07-18 10:20:00
"""
from alembic import op
import sqlalchemy as sa


revision = 'b8c9d0e1f2a3'
down_revision = 'a7b8c9d0e1f2'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('integration_clients', sa.Column('api_key_hash', sa.String(length=255), nullable=True))
    op.add_column('integration_clients', sa.Column('scopes', sa.JSON(), nullable=True))
    op.create_index(
        op.f('ix_integration_clients_api_key_hash'), 'integration_clients', ['api_key_hash']
    )


def downgrade():
    op.drop_index(op.f('ix_integration_clients_api_key_hash'), table_name='integration_clients')
    op.drop_column('integration_clients', 'scopes')
    op.drop_column('integration_clients', 'api_key_hash')
