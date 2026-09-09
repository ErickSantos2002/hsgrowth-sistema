"""card_tasks: campos da gravacao + tabela recording_shares

Aditiva — todas as colunas novas sao nullable e nenhuma linha existente e
alterada. As reunioes ja criadas ficam com recording_status nulo, tratado como
"sem gravacao".

recording_shares registra quem gerou link da gravacao para o cliente e quando
ele expira (decisao da secao 15.5 do design).

Revision ID: d2e3f4a5b6c7
Revises: c1d2e3f4a5b6
Create Date: 2026-09-09 10:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = 'd2e3f4a5b6c7'
down_revision = 'c1d2e3f4a5b6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Gravação e transcrição na tarefa ────────────────────────────────────
    op.add_column('card_tasks', sa.Column(
        'recording_status', sa.String(30), nullable=True,
        comment='none | recording | processing | ready | failed | external_link'))
    op.add_column('card_tasks', sa.Column(
        'recording_key', sa.String(500), nullable=True,
        comment='Caminho do arquivo no bucket R2'))
    op.add_column('card_tasks', sa.Column(
        'recording_external_url', sa.String(1000), nullable=True,
        comment='URL no Daily, usada quando o arquivo e grande demais para baixar'))
    op.add_column('card_tasks', sa.Column(
        'recording_duration_seconds', sa.Integer(), nullable=True,
        comment='Duracao gravada, em segundos'))
    op.add_column('card_tasks', sa.Column(
        'recording_size_bytes', sa.BigInteger(), nullable=True,
        comment='Tamanho do arquivo'))
    op.add_column('card_tasks', sa.Column(
        'recording_started_at', sa.DateTime(), nullable=True,
        comment='Quando a gravacao comecou'))
    op.add_column('card_tasks', sa.Column(
        'recording_ready_at', sa.DateTime(), nullable=True,
        comment='Quando a gravacao ficou disponivel'))
    op.add_column('card_tasks', sa.Column(
        'recording_error', sa.Text(), nullable=True,
        comment='Motivo da falha no processamento, quando houver'))
    op.add_column('card_tasks', sa.Column(
        'transcript_status', sa.String(30), nullable=True,
        comment='none | processing | ready | failed'))

    # ── Registro de compartilhamento da gravação ────────────────────────────
    op.create_table(
        'recording_shares',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('card_task_id', sa.Integer(),
                  sa.ForeignKey('card_tasks.id', ondelete='CASCADE'),
                  nullable=False, index=True),
        sa.Column('created_by_id', sa.Integer(),
                  sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False,
                  server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('revoked_at', sa.DateTime(), nullable=True,
                  comment='Preenchido quando o link e revogado antes de expirar'),
        comment='Quem gerou link de compartilhamento da gravacao, e ate quando vale',
    )


def downgrade() -> None:
    op.drop_table('recording_shares')
    for col in ('transcript_status', 'recording_error', 'recording_ready_at',
                'recording_started_at', 'recording_size_bytes',
                'recording_duration_seconds', 'recording_external_url',
                'recording_key', 'recording_status'):
        op.drop_column('card_tasks', col)
