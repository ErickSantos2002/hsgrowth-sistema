"""create service_boards, service_lists e service_cards tables

Revision ID: 2026_06_08_1100
Revises: 2026_06_08_1000
Create Date: 2026-06-08 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '2026_06_08_1100'
down_revision = '2026_06_08_1000'
branch_labels = None
depends_on = None


def upgrade():
    # Tabela service_boards
    op.create_table(
        'service_boards',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('color', sa.String(50), nullable=True),
        sa.Column('icon', sa.String(50), nullable=True),
        sa.Column('settings', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_service_boards_id'), 'service_boards', ['id'], unique=False)

    # Tabela service_lists
    op.create_table(
        'service_lists',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('board_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('color', sa.String(7), nullable=True),
        sa.Column('position', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_done_stage', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_lost_stage', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['board_id'], ['service_boards.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_service_lists_id'), 'service_lists', ['id'], unique=False)
    op.create_index(op.f('ix_service_lists_board_id'), 'service_lists', ['board_id'], unique=False)

    # Tabela service_cards
    op.create_table(
        'service_cards',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('list_id', sa.Integer(), nullable=False),
        sa.Column('assigned_to_id', sa.Integer(), nullable=True),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('position', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('contact_info', sa.JSON(), nullable=True),
        sa.Column('due_date', sa.DateTime(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['assigned_to_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['list_id'], ['service_lists.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_service_cards_id'), 'service_cards', ['id'], unique=False)
    op.create_index(op.f('ix_service_cards_list_id'), 'service_cards', ['list_id'], unique=False)
    op.create_index(op.f('ix_service_cards_assigned_to_id'), 'service_cards', ['assigned_to_id'], unique=False)
    op.create_index(op.f('ix_service_cards_title'), 'service_cards', ['title'], unique=False)


def downgrade():
    op.drop_table('service_cards')
    op.drop_table('service_lists')
    op.drop_table('service_boards')
