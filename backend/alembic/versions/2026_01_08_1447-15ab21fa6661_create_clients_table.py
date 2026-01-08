"""create_clients_table

Revision ID: 15ab21fa6661
Revises: e6a41f98a3a4
Create Date: 2026-01-08 14:47:05.291328

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = '15ab21fa6661'
down_revision = 'e6a41f98a3a4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Cria tabela clients (Clientes)
    op.create_table(
        'clients',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('account_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('phone', sa.String(20), nullable=True),
        sa.Column('company_name', sa.String(255), nullable=True),
        sa.Column('document', sa.String(20), nullable=True),  # CPF/CNPJ
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('city', sa.String(100), nullable=True),
        sa.Column('state', sa.String(2), nullable=True),
        sa.Column('country', sa.String(100), nullable=True, server_default='Brasil'),
        sa.Column('website', sa.String(255), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('source', sa.String(50), nullable=True),  # pipedrive, manual, etc
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], ondelete='CASCADE')
    )

    # Cria índices
    op.create_index('ix_clients_id', 'clients', ['id'])
    op.create_index('ix_clients_account_id', 'clients', ['account_id'])
    op.create_index('ix_clients_email', 'clients', ['email'])
    op.create_index('ix_clients_document', 'clients', ['document'])
    op.create_index('ix_clients_name', 'clients', ['name'])


def downgrade() -> None:
    # Remove índices
    op.drop_index('ix_clients_name', 'clients')
    op.drop_index('ix_clients_document', 'clients')
    op.drop_index('ix_clients_email', 'clients')
    op.drop_index('ix_clients_account_id', 'clients')
    op.drop_index('ix_clients_id', 'clients')

    # Remove tabela
    op.drop_table('clients')
