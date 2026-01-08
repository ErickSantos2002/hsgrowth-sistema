"""add_client_id_to_cards

Revision ID: 458ea44424e8
Revises: 15ab21fa6661
Create Date: 2026-01-08 14:49:43.978320

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '458ea44424e8'
down_revision = '15ab21fa6661'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Adiciona coluna client_id em cards
    op.add_column('cards', sa.Column('client_id', sa.Integer(), nullable=True))

    # Adiciona foreign key
    op.create_foreign_key(
        'fk_cards_client_id',
        'cards',
        'clients',
        ['client_id'],
        ['id'],
        ondelete='SET NULL'
    )

    # Cria índice
    op.create_index('ix_cards_client_id', 'cards', ['client_id'])


def downgrade() -> None:
    # Remove índice
    op.drop_index('ix_cards_client_id', 'cards')

    # Remove foreign key
    op.drop_constraint('fk_cards_client_id', 'cards', type_='foreignkey')

    # Remove coluna
    op.drop_column('cards', 'client_id')
