"""Create persons table

Revision ID: 2026_01_28_1730
Revises: 2026_01_28_1230
Create Date: 2026-01-28 17:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2026_01_28_1730'
down_revision = '2026_01_28_1230'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Cria a tabela persons"""
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


def downgrade() -> None:
    """Remove a tabela persons"""
    op.drop_index(op.f('ix_persons_pipedrive_id'), table_name='persons')
    op.drop_index(op.f('ix_persons_email'), table_name='persons')
    op.drop_index(op.f('ix_persons_name'), table_name='persons')
    op.drop_index(op.f('ix_persons_id'), table_name='persons')
    op.drop_table('persons')
