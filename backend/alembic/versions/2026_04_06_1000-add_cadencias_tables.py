"""add cadencias tables

Revision ID: 2026_04_06_1000
Revises: 2026_03_30_1000
Create Date: 2026-04-06 10:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '2026_04_06_1000'
down_revision = 'add_automacao01_to_cards'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'cadencias',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_cadencias_user_id', 'cadencias', ['user_id'])

    op.create_table(
        'cadencia_itens',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('cadencia_id', sa.Integer(), nullable=False),
        sa.Column('activity_type', sa.String(50), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['cadencia_id'], ['cadencias.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_cadencia_itens_cadencia_id', 'cadencia_itens', ['cadencia_id'])


def downgrade():
    op.drop_table('cadencia_itens')
    op.drop_table('cadencias')
