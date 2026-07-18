"""vinculo de cliente com sistema externo (external_client_refs)

Revision ID: c9d0e1f2a3b4
Revises: b8c9d0e1f2a3
Create Date: 2026-07-18 10:30:00
"""
from alembic import op
import sqlalchemy as sa


revision = 'c9d0e1f2a3b4'
down_revision = 'b8c9d0e1f2a3'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'external_client_refs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('source', sa.String(length=50), nullable=False),
        sa.Column('external_id', sa.String(length=100), nullable=False),
        sa.Column('client_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('source', 'external_id', name='unique_external_client_ref'),
    )
    op.create_index(op.f('ix_external_client_refs_id'), 'external_client_refs', ['id'])
    op.create_index(op.f('ix_external_client_refs_source'), 'external_client_refs', ['source'])
    op.create_index(op.f('ix_external_client_refs_external_id'), 'external_client_refs', ['external_id'])
    op.create_index(op.f('ix_external_client_refs_client_id'), 'external_client_refs', ['client_id'])


def downgrade():
    op.drop_table('external_client_refs')
