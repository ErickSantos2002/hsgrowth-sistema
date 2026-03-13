"""Adiciona campo note_type à tabela card_notes para categorização de anotações

Revision ID: add_note_type_card_notes_2026
Revises: add_origin_utm_fields_2026
Create Date: 2026-03-13 10:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_note_type_card_notes_2026'
down_revision = 'add_origin_utm_fields_2026'
branch_labels = None
depends_on = None


def upgrade():
    # Adiciona coluna note_type (nullable para não quebrar registros existentes)
    op.add_column(
        'card_notes',
        sa.Column('note_type', sa.String(50), nullable=True, comment='Tipo da anotação (ex: ligacao, geral)')
    )
    # Índice para acelerar filtros por tipo
    op.create_index('ix_card_notes_note_type', 'card_notes', ['note_type'])


def downgrade():
    op.drop_index('ix_card_notes_note_type', table_name='card_notes')
    op.drop_column('card_notes', 'note_type')
