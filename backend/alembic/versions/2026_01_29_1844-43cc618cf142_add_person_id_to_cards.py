"""add_person_id_to_cards

Revision ID: 43cc618cf142
Revises: 7bb839297b7f
Create Date: 2026-01-29 18:44:25.646758

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '43cc618cf142'
down_revision = '7bb839297b7f'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Adiciona coluna person_id na tabela cards
    op.add_column('cards', sa.Column('person_id', sa.Integer(), nullable=True))

    # Cria Foreign Key para persons
    op.create_foreign_key(
        'cards_person_id_fkey',  # Nome da constraint
        'cards',  # Tabela source
        'persons',  # Tabela target
        ['person_id'],  # Coluna source
        ['id'],  # Coluna target
        ondelete='SET NULL'  # Se pessoa for deletada, apenas desvincula do card
    )

    # Cria índice para otimizar queries
    op.create_index(op.f('ix_cards_person_id'), 'cards', ['person_id'], unique=False)


def downgrade() -> None:
    # Remove índice
    op.drop_index(op.f('ix_cards_person_id'), table_name='cards')

    # Remove Foreign Key
    op.drop_constraint('cards_person_id_fkey', 'cards', type_='foreignkey')

    # Remove coluna
    op.drop_column('cards', 'person_id')
