"""Adiciona reopened_from_card_id em cards para rastrear reabertura de negócios.

Revision ID: add_reopened_from_card_id_2026
Revises: gamification_remodulacao_v2_2026
Create Date: 2026-03-18 10:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_reopened_from_card_id_2026'
down_revision = 'gamification_remodulacao_v2_2026'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'cards',
        sa.Column(
            'reopened_from_card_id',
            sa.Integer(),
            sa.ForeignKey('cards.id', ondelete='SET NULL'),
            nullable=True,
            comment='ID do card original que gerou esta reabertura (NULL = criado do zero)'
        )
    )
    # Cria índice separado para não duplicar com o index=True implícito do add_column
    op.create_index(
        'ix_cards_reopened_from_card_id',
        'cards',
        ['reopened_from_card_id'],
        if_not_exists=True,
    )


def downgrade():
    op.drop_index('ix_cards_reopened_from_card_id', table_name='cards')
    op.drop_column('cards', 'reopened_from_card_id')
