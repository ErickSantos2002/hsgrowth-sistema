"""Cria tabela card_list_history para rastrear movimentação de cards por lista

Revision ID: create_card_list_history_2026
Revises: create_custom_reports_2026
Create Date: 2026-02-25 10:00:00.000000

"""
import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision = 'create_card_list_history_2026'
down_revision = 'create_custom_reports_2026'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Cria a tabela card_list_history.

    Cada registro representa um período em que um card ficou em uma lista.
    O campo exited_at é NULL enquanto o card ainda está nessa lista.
    O board_id é desnormalizado para facilitar queries de relatório.
    """
    op.create_table(
        'card_list_history',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            'card_id',
            sa.Integer(),
            sa.ForeignKey('cards.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column(
            'list_id',
            sa.Integer(),
            sa.ForeignKey('lists.id', ondelete='CASCADE'),
            nullable=False,
        ),
        # board_id desnormalizado para evitar join em queries de relatório
        sa.Column(
            'board_id',
            sa.Integer(),
            sa.ForeignKey('boards.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column('entered_at', sa.DateTime(), nullable=False),
        # NULL = card ainda está nessa lista
        sa.Column('exited_at', sa.DateTime(), nullable=True),
    )

    # Índice principal: buscar histórico de um card específico
    op.create_index(
        'ix_card_list_history_card_id',
        'card_list_history',
        ['card_id'],
    )

    # Índice para queries de relatório: cards que entraram numa lista num período
    op.create_index(
        'ix_card_list_history_list_id_entered_at',
        'card_list_history',
        ['list_id', 'entered_at'],
    )

    # Índice para queries por board num período
    op.create_index(
        'ix_card_list_history_board_id_entered_at',
        'card_list_history',
        ['board_id', 'entered_at'],
    )

    # Índice para buscar registro aberto (exited_at IS NULL) de um card
    op.create_index(
        'ix_card_list_history_card_id_exited_at',
        'card_list_history',
        ['card_id', 'exited_at'],
    )


def downgrade() -> None:
    """Remove a tabela card_list_history."""
    op.drop_index('ix_card_list_history_card_id_exited_at', table_name='card_list_history')
    op.drop_index('ix_card_list_history_board_id_entered_at', table_name='card_list_history')
    op.drop_index('ix_card_list_history_list_id_entered_at', table_name='card_list_history')
    op.drop_index('ix_card_list_history_card_id', table_name='card_list_history')
    op.drop_table('card_list_history')
