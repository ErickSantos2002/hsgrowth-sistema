"""add_whatsapp_to_task_type_enum

Revision ID: 2026_04_14_1000
Revises: 2026_04_13_1200
Create Date: 2026-04-14

Adiciona o valor 'whatsapp' ao enum task_type da tabela card_tasks.
"""
from alembic import op
import sqlalchemy as sa


revision = '2026_04_14_1000'
down_revision = '2026_04_13_1200'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TYPE tasktype ADD VALUE IF NOT EXISTS 'WHATSAPP'")


def downgrade():
    # Enum values não podem ser removidos no PostgreSQL sem recriar o tipo
    pass
