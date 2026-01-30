"""add_integration_clients_table

Revision ID: 4bd904519b52
Revises: 143af8f5e9f0
Create Date: 2026-01-30 11:42:11.745542

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '4bd904519b52'
down_revision = '143af8f5e9f0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Cria a tabela de integration_clients para autenticação via client_credentials"""
    op.create_table(
        'integration_clients',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('client_id', sa.String(length=100), nullable=False),
        sa.Column('client_secret_hash', sa.String(length=255), nullable=False),
        sa.Column('impersonate_user_id', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_integration_clients_id', 'integration_clients', ['id'])
    op.create_index('ix_integration_clients_name', 'integration_clients', ['name'])
    op.create_index('ix_integration_clients_client_id', 'integration_clients', ['client_id'], unique=True)


def downgrade() -> None:
    """Remove a tabela de integration_clients"""
    op.drop_index('ix_integration_clients_client_id', table_name='integration_clients')
    op.drop_index('ix_integration_clients_name', table_name='integration_clients')
    op.drop_index('ix_integration_clients_id', table_name='integration_clients')
    op.drop_table('integration_clients')
