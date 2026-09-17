"""avaliacao de reuniao: meeting_evaluations e meeting_evaluation_items

Revision ID: a5b6c7d8e9f0
Revises: f4a5b6c7d8e9
Create Date: 2026-09-18 10:00:00

Cada reuniao pode ter uma avaliacao pela regua da consultoria, com os 26
criterios pendurados nela.

Peso e bloco ficam copiados na linha do item de proposito: e o que permite
reabrir uma avaliacao de meses atras e conferir como aquele 62 foi calculado,
mesmo depois de a regua mudar.

Somente acrescimos: nenhuma tabela ou coluna existente e alterada.
"""
from alembic import op
import sqlalchemy as sa


revision = 'a5b6c7d8e9f0'
down_revision = 'f4a5b6c7d8e9'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'meeting_evaluations',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column(
            'card_task_id', sa.Integer(),
            sa.ForeignKey('card_tasks.id', ondelete='CASCADE'), nullable=False,
        ),
        sa.Column(
            'avaliado_por_id', sa.Integer(),
            sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True,
            comment='Quem pediu a avaliacao',
        ),
        sa.Column(
            'avaliado_em', sa.DateTime(), nullable=False,
            server_default=sa.text('CURRENT_TIMESTAMP'),
        ),
        sa.Column(
            'versao_criterios', sa.String(20), nullable=False,
            comment='Qual regua foi usada — avaliacao antiga continua explicavel',
        ),
        sa.Column('score', sa.Float(), nullable=True, comment='Nulo quando nao comparavel'),
        sa.Column('veredito', sa.String(80), nullable=True),
        sa.Column('cobertura', sa.Float(), nullable=True, comment='0 a 1'),
        sa.Column('medias_por_bloco', sa.JSON(), nullable=True),
        sa.Column('desfecho', sa.Text(), nullable=True),
        sa.Column('ponto_forte', sa.Text(), nullable=True),
        sa.Column('foco_desenvolvimento', sa.Text(), nullable=True),
        sa.Column('proxima_acao', sa.Text(), nullable=True),
        sa.Column('modelo', sa.String(50), nullable=True),
        sa.Column('tokens_entrada', sa.Integer(), nullable=True),
        sa.Column('tokens_saida', sa.Integer(), nullable=True),
        sa.Column('latencia_ms', sa.Integer(), nullable=True),
        sa.UniqueConstraint('card_task_id', name='uq_meeting_evaluation_task'),
    )
    op.create_index(
        'ix_meeting_evaluations_card_task_id', 'meeting_evaluations', ['card_task_id'],
    )

    op.create_table(
        'meeting_evaluation_items',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column(
            'evaluation_id', sa.Integer(),
            sa.ForeignKey('meeting_evaluations.id', ondelete='CASCADE'), nullable=False,
        ),
        sa.Column('criterio_id', sa.String(5), nullable=False),
        sa.Column('bloco', sa.String(20), nullable=False),
        sa.Column(
            'peso', sa.Float(), nullable=False,
            comment='Copiado da regua no momento da avaliacao',
        ),
        sa.Column('nota', sa.Integer(), nullable=True, comment='0, 1, 2 ou nulo (N/A)'),
        sa.Column('evidencia', sa.Text(), nullable=True),
        sa.Column('porque', sa.Text(), nullable=True),
    )
    op.create_index(
        'ix_meeting_evaluation_items_evaluation_id',
        'meeting_evaluation_items', ['evaluation_id'],
    )


def downgrade():
    op.drop_table('meeting_evaluation_items')
    op.drop_table('meeting_evaluations')
