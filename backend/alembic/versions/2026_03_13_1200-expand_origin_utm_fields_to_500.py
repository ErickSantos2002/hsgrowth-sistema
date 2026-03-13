"""Expande os campos origin, utm_campaign, utm_source e utm_term de VARCHAR(200) para VARCHAR(500).

Necessário para suportar valores longos enviados via integrações externas (ex: RD Station via n8n),
como URLs completas de conversão ou nomes de campanha detalhados.

Revision ID: expand_origin_utm_fields_500
Revises: add_is_noshow_card_tasks_2026
Create Date: 2026-03-13 12:00:00
"""

from alembic import op
import sqlalchemy as sa

revision = 'expand_origin_utm_fields_500'
down_revision = 'add_is_noshow_card_tasks_2026'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Expande os campos de rastreamento de origem para suportar valores mais longos
    op.alter_column('cards', 'origin',
                    existing_type=sa.String(200),
                    type_=sa.String(500),
                    existing_nullable=True)
    op.alter_column('cards', 'utm_campaign',
                    existing_type=sa.String(200),
                    type_=sa.String(500),
                    existing_nullable=True)
    op.alter_column('cards', 'utm_source',
                    existing_type=sa.String(200),
                    type_=sa.String(500),
                    existing_nullable=True)
    op.alter_column('cards', 'utm_term',
                    existing_type=sa.String(200),
                    type_=sa.String(500),
                    existing_nullable=True)


def downgrade() -> None:
    op.alter_column('cards', 'utm_term',
                    existing_type=sa.String(500),
                    type_=sa.String(200),
                    existing_nullable=True)
    op.alter_column('cards', 'utm_source',
                    existing_type=sa.String(500),
                    type_=sa.String(200),
                    existing_nullable=True)
    op.alter_column('cards', 'utm_campaign',
                    existing_type=sa.String(500),
                    type_=sa.String(200),
                    existing_nullable=True)
    op.alter_column('cards', 'origin',
                    existing_type=sa.String(500),
                    type_=sa.String(200),
                    existing_nullable=True)
