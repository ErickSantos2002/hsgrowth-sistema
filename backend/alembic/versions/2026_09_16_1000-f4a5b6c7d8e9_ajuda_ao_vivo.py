"""ajuda ao vivo: tabela meeting_assist_requests

Revision ID: f4a5b6c7d8e9
Revises: e3f4a5b6c7d8
Create Date: 2026-09-16 10:00:00

Cada clique em "Me ajuda aqui" durante a reuniao vira uma linha: o trecho da
conversa naquele momento, a resposta da IA e o custo da chamada.

O trecho e essencial — sem ele, quem le depois ve a sugestao sem saber o que o
cliente tinha acabado de dizer.

Somente acrescimos: nenhuma tabela ou coluna existente e alterada.
"""
from alembic import op
import sqlalchemy as sa


revision = 'f4a5b6c7d8e9'
down_revision = 'e3f4a5b6c7d8'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'meeting_assist_requests',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column(
            'card_task_id', sa.Integer(),
            sa.ForeignKey('card_tasks.id', ondelete='CASCADE'), nullable=False,
        ),
        sa.Column(
            'user_id', sa.Integer(),
            sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True,
            comment='Quem pediu a ajuda',
        ),
        sa.Column(
            'created_at', sa.DateTime(), nullable=False,
            server_default=sa.text('CURRENT_TIMESTAMP'),
        ),
        sa.Column(
            'trecho', sa.Text(), nullable=True,
            comment='Ultimas falas da conversa antes do clique',
        ),
        sa.Column('leitura', sa.Text(), nullable=False),
        sa.Column('fala', sa.Text(), nullable=False),
        sa.Column('pergunta', sa.Text(), nullable=True),
        sa.Column('alertas', sa.JSON(), nullable=True),
        sa.Column('fato_crm', sa.Text(), nullable=True),
        sa.Column(
            'marcadores', sa.JSON(), nullable=True,
            comment='Vocabulario fechado, para contar ocorrencias depois',
        ),
        sa.Column('modelo', sa.String(50), nullable=True),
        sa.Column('tokens_entrada', sa.Integer(), nullable=True),
        sa.Column('tokens_saida', sa.Integer(), nullable=True),
        sa.Column('latencia_ms', sa.Integer(), nullable=True),
    )
    op.create_index(
        'ix_meeting_assist_requests_card_task_id',
        'meeting_assist_requests', ['card_task_id'],
    )


def downgrade():
    op.drop_index(
        'ix_meeting_assist_requests_card_task_id',
        table_name='meeting_assist_requests',
    )
    op.drop_table('meeting_assist_requests')
