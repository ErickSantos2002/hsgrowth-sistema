"""create service_card_activities

Revision ID: 2026_06_09_0400
Revises: 2026_06_09_0300
Create Date: 2026-06-09 04:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '2026_06_09_0400'
down_revision = '2026_06_09_0300'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'service_card_activities',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('service_card_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('category', sa.String(20), nullable=False),
        sa.Column('activity_type', sa.String(50), nullable=True),
        sa.Column('title', sa.String(500), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('activity_metadata', sa.JSON(), nullable=True),
        sa.Column('priority', sa.String(20), nullable=True),
        sa.Column('due_date', sa.DateTime(), nullable=True),
        sa.Column('is_completed', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('file_name', sa.String(500), nullable=True),
        sa.Column('file_path', sa.String(1000), nullable=True),
        sa.Column('file_size', sa.BigInteger(), nullable=True),
        sa.Column('mime_type', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['service_card_id'], ['service_cards.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_service_card_activities_id'), 'service_card_activities', ['id'], unique=False)
    op.create_index('ix_service_card_activities_service_card_id', 'service_card_activities', ['service_card_id'], unique=False)
    op.create_index('ix_service_card_activities_user_id', 'service_card_activities', ['user_id'], unique=False)
    op.create_index('ix_service_card_activities_category', 'service_card_activities', ['category'], unique=False)


def downgrade():
    op.drop_index('ix_service_card_activities_category', table_name='service_card_activities')
    op.drop_index('ix_service_card_activities_user_id', table_name='service_card_activities')
    op.drop_index('ix_service_card_activities_service_card_id', table_name='service_card_activities')
    op.drop_index(op.f('ix_service_card_activities_id'), table_name='service_card_activities')
    op.drop_table('service_card_activities')
