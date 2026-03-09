"""Adiciona campos de rastreamento de origem ao cards (origin, utm_campaign, utm_source, utm_term)

Revision ID: add_origin_utm_fields_2026
Revises: notif_settings_2026
Create Date: 2026-03-09 10:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_origin_utm_fields_2026'
down_revision = 'notif_settings_2026'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Adiciona os 4 campos de rastreamento de origem na tabela cards.
    # - origin: editável pelo frontend (usuários podem informar a origem do lead)
    # - utm_campaign, utm_source, utm_term: preenchidos exclusivamente via API externa
    op.add_column('cards', sa.Column('origin', sa.String(200), nullable=True, comment='Origem do lead (ex: Site, Indicação, LinkedIn)'))
    op.add_column('cards', sa.Column('utm_campaign', sa.String(200), nullable=True, comment='Parâmetro UTM: campanha (preenchido via API externa)'))
    op.add_column('cards', sa.Column('utm_source', sa.String(200), nullable=True, comment='Parâmetro UTM: fonte (preenchido via API externa)'))
    op.add_column('cards', sa.Column('utm_term', sa.String(200), nullable=True, comment='Parâmetro UTM: termo (preenchido via API externa)'))


def downgrade() -> None:
    op.drop_column('cards', 'utm_term')
    op.drop_column('cards', 'utm_source')
    op.drop_column('cards', 'utm_campaign')
    op.drop_column('cards', 'origin')
