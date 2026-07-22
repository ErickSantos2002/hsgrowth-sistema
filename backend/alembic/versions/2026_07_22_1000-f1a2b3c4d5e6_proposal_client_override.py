"""proposta: coluna client_override (dados do cliente editáveis só na proposta)

Aditiva — apenas adiciona a coluna JSON nulável. Nenhum dado é alterado.

Revision ID: f1a2b3c4d5e6
Revises: d0e1f2a3b4c5
Create Date: 2026-07-22 10:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = 'f1a2b3c4d5e6'
down_revision = 'd0e1f2a3b4c5'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('proposals', sa.Column('client_override', sa.JSON(), nullable=True))


def downgrade():
    op.drop_column('proposals', 'client_override')
