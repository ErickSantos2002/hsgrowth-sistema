"""Add attachment_type column to attachments table

Revision ID: add_attachment_type_2026
Revises: create_card_list_history_2026
Create Date: 2026-02-25 11:00:00.000000

Adiciona a coluna attachment_type à tabela de attachments para
classificar o tipo de anexo (ex: 'general', 'proposal').
Isso permite filtrar propostas formais durante a validação de
avanço de etapa no pipeline de aquisição.
"""
from alembic import op
import sqlalchemy as sa


# Identificadores da revisão
revision = 'add_attachment_type_2026'
down_revision = 'create_card_list_history_2026'
branch_labels = None
depends_on = None


def upgrade():
    """Adiciona coluna attachment_type com valor padrão 'general'."""
    op.add_column(
        'attachments',
        sa.Column(
            'attachment_type',
            sa.String(50),
            nullable=False,
            server_default='general',
            comment='Tipo do anexo: general, proposal, etc.'
        )
    )

    # Índice para buscas por tipo (ex: buscar apenas propostas)
    op.create_index(
        'ix_attachments_attachment_type',
        'attachments',
        ['attachment_type']
    )


def downgrade():
    """Remove coluna attachment_type."""
    op.drop_index('ix_attachments_attachment_type', table_name='attachments')
    op.drop_column('attachments', 'attachment_type')
