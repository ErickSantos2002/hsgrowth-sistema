"""add_linkedin_to_task_type_enum

Revision ID: 2026_04_14_1200
Revises: 2026_04_14_1100
Create Date: 2026-04-14

Adiciona o valor 'LINKEDIN' ao enum task_type da tabela card_tasks.
"""
from alembic import op


revision = '2026_04_14_1200'
down_revision = '2026_04_14_1100'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TYPE tasktype ADD VALUE IF NOT EXISTS 'LINKEDIN'")


def downgrade():
    # Enum values não podem ser removidos no PostgreSQL sem recriar o tipo
    pass
