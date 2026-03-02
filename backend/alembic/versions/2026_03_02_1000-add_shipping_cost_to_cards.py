"""Add shipping_cost column to cards table

Revision ID: add_shipping_cost_2026
Revises: add_attachment_type_2026
Create Date: 2026-03-02 10:00:00.000000

Adiciona o campo shipping_cost (custo de frete) à tabela de cards.
Este campo é opcional e representa o valor do frete/envio vinculado ao negócio.
O total do negócio passa a ser: produtos + frete.
"""
from alembic import op
import sqlalchemy as sa


# Identificadores da revisão
revision = 'add_shipping_cost_2026'
down_revision = 'add_attachment_type_2026'
branch_labels = None
depends_on = None


def upgrade():
    """Adiciona coluna shipping_cost (nullable) na tabela cards."""
    op.add_column(
        'cards',
        sa.Column(
            'shipping_cost',
            sa.Numeric(12, 2),
            nullable=True,
            comment='Custo de frete/envio do negócio (somado ao total de produtos)'
        )
    )


def downgrade():
    """Remove coluna shipping_cost da tabela cards."""
    op.drop_column('cards', 'shipping_cost')
