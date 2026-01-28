"""Add card_notes table

Revision ID: 2026_01_28_1230
Revises: cb8c49b2c082
Create Date: 2026-01-28 12:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2026_01_28_1230'
down_revision = 'cb8c49b2c082'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Cria a tabela card_notes"""
    op.create_table(
        'card_notes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('card_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False, comment='Conteúdo da anotação'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['card_id'], ['cards.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE')
    )

    # Cria índices para melhor performance
    op.create_index('ix_card_notes_id', 'card_notes', ['id'])
    op.create_index('ix_card_notes_card_id', 'card_notes', ['card_id'])


def downgrade() -> None:
    """Remove a tabela card_notes"""
    op.drop_index('ix_card_notes_card_id', table_name='card_notes')
    op.drop_index('ix_card_notes_id', table_name='card_notes')
    op.drop_table('card_notes')
