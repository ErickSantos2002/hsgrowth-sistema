"""create_persons_and_leads_tables

Revision ID: be6611b1d1a6
Revises: 5459d041544c
Create Date: 2026-01-29 12:00:22.411861

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'be6611b1d1a6'
down_revision = '5459d041544c'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Cria as tabelas persons e leads"""

    # Cria tabela persons
    op.create_table(
        'persons',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('first_name', sa.String(length=100), nullable=True),
        sa.Column('last_name', sa.String(length=100), nullable=True),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('position', sa.String(length=200), nullable=True),
        sa.Column('linkedin', sa.String(length=500), nullable=True),
        sa.Column('organization_id', sa.Integer(), nullable=True),
        sa.Column('owner_id', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('pipedrive_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['clients.id'], ),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_persons_id'), 'persons', ['id'], unique=False)
    op.create_index(op.f('ix_persons_name'), 'persons', ['name'], unique=False)
    op.create_index(op.f('ix_persons_email'), 'persons', ['email'], unique=False)
    op.create_index(op.f('ix_persons_pipedrive_id'), 'persons', ['pipedrive_id'], unique=False)

    # Cria tabela leads
    op.create_table(
        'leads',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('value', sa.Float(), nullable=True),
        sa.Column('currency', sa.String(length=10), nullable=False, server_default='BRL'),
        sa.Column('source', sa.String(length=100), nullable=True),
        sa.Column('owner_id', sa.Integer(), nullable=True),
        sa.Column('person_id', sa.Integer(), nullable=True),
        sa.Column('organization_id', sa.Integer(), nullable=True),
        sa.Column('board_id', sa.Integer(), nullable=True),
        sa.Column('list_id', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='not_viewed'),
        sa.Column('is_archived', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('archived_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expected_close_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('custom_fields', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('pipedrive_id', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['person_id'], ['persons.id'], ),
        sa.ForeignKeyConstraint(['organization_id'], ['clients.id'], ),
        sa.ForeignKeyConstraint(['board_id'], ['boards.id'], ),
        sa.ForeignKeyConstraint(['list_id'], ['lists.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_leads_id'), 'leads', ['id'], unique=False)
    op.create_index(op.f('ix_leads_title'), 'leads', ['title'], unique=False)
    op.create_index(op.f('ix_leads_pipedrive_id'), 'leads', ['pipedrive_id'], unique=False)


def downgrade() -> None:
    """Remove as tabelas persons e leads"""

    # Remove tabela leads
    op.drop_index(op.f('ix_leads_pipedrive_id'), table_name='leads')
    op.drop_index(op.f('ix_leads_title'), table_name='leads')
    op.drop_index(op.f('ix_leads_id'), table_name='leads')
    op.drop_table('leads')

    # Remove tabela persons
    op.drop_index(op.f('ix_persons_pipedrive_id'), table_name='persons')
    op.drop_index(op.f('ix_persons_email'), table_name='persons')
    op.drop_index(op.f('ix_persons_name'), table_name='persons')
    op.drop_index(op.f('ix_persons_id'), table_name='persons')
    op.drop_table('persons')
