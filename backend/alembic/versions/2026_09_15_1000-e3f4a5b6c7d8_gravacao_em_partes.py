"""gravacao em partes: tabela meeting_recordings

Revision ID: e3f4a5b6c7d8
Revises: d2e3f4a5b6c7
Create Date: 2026-09-15 10:00:00

Uma reuniao pode ter varios trechos gravados: o vendedor para a gravacao e
recomeca. Na homologacao de 14/09 uma unica reuniao gerou tres arquivos, e o
modelo so guardava um — os outros dois seriam perdidos.

Acrescenta tambem a coluna que liga um link compartilhado ao trecho especifico
que ele abre.

Somente acrescimos: nenhuma coluna existente e alterada ou removida.
"""
from alembic import op
import sqlalchemy as sa


revision = 'e3f4a5b6c7d8'
down_revision = 'd2e3f4a5b6c7'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'meeting_recordings',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column(
            'card_task_id', sa.Integer(),
            sa.ForeignKey('card_tasks.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column(
            'daily_recording_id', sa.String(100), nullable=False, unique=True,
            comment='Identificador do arquivo no Daily',
        ),
        sa.Column('ordem', sa.Integer(), nullable=False, server_default='1'),
        sa.Column(
            'status', sa.String(30), nullable=False, server_default='processing',
            comment='processing | ready | failed | expired',
        ),
        sa.Column('r2_key', sa.String(500), nullable=True, comment='Caminho no bucket R2'),
        sa.Column('duration_seconds', sa.Integer(), nullable=True),
        sa.Column('size_bytes', sa.BigInteger(), nullable=True),
        sa.Column('error', sa.Text(), nullable=True),
        sa.Column(
            'created_at', sa.DateTime(), nullable=False,
            server_default=sa.text('CURRENT_TIMESTAMP'),
        ),
        sa.Column('ready_at', sa.DateTime(), nullable=True),
    )
    op.create_index(
        'ix_meeting_recordings_card_task_id', 'meeting_recordings', ['card_task_id']
    )

    op.add_column(
        'recording_shares',
        sa.Column(
            'meeting_recording_id', sa.Integer(),
            sa.ForeignKey('meeting_recordings.id', ondelete='CASCADE'), nullable=True,
            comment='Trecho compartilhado; nulo nos registros anteriores a esta mudanca',
        ),
    )


def downgrade():
    op.drop_column('recording_shares', 'meeting_recording_id')
    op.drop_index('ix_meeting_recordings_card_task_id', table_name='meeting_recordings')
    op.drop_table('meeting_recordings')
