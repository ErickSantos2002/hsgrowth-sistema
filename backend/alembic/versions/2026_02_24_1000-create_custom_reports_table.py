"""Cria tabela custom_reports para relatórios customizados

Revision ID: create_custom_reports_2026
Revises: add_follow_up_2026
Create Date: 2026-02-24 10:00:00.000000

"""
import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision = 'create_custom_reports_2026'
down_revision = 'add_follow_up_2026'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Cria a tabela custom_reports para persistir dashboards customizados."""
    op.create_table(
        'custom_reports',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column(
            'created_by_id',
            sa.Integer(),
            sa.ForeignKey('users.id', ondelete='CASCADE'),
            nullable=False,
        ),
        # Configuração completa do relatório (CustomReportConfig serializado)
        sa.Column('config', sa.JSON(), nullable=False),
        # Contador desnormalizado para exibição rápida na listagem
        sa.Column('charts_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )

    # Índice para buscas por usuário criador
    op.create_index(
        'ix_custom_reports_created_by_id',
        'custom_reports',
        ['created_by_id'],
    )


def downgrade() -> None:
    """Remove a tabela custom_reports."""
    op.drop_index('ix_custom_reports_created_by_id', table_name='custom_reports')
    op.drop_table('custom_reports')
