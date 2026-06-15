"""add modality (venda|locacao) to cards

Revision ID: 2026_06_12_0200
Revises: 2026_06_12_0100
Create Date: 2026-06-12 02:00:00.000000

Adiciona a coluna modality (String, nullable) na tabela cards (Vendas).
Guarda se o negócio é "venda" ou "locacao". Obrigatória para marcar como
Ganho (trava no move_card) e herdada pelo módulo de Serviços.

Mudança aditiva e retrocompatível: o código atual em produção ignora a
coluna nova; nada quebra.
"""
from alembic import op
import sqlalchemy as sa


revision = '2026_06_12_0200'
down_revision = '2026_06_12_0100'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('cards', sa.Column('modality', sa.String(length=20), nullable=True))


def downgrade():
    op.drop_column('cards', 'modality')
