"""add_teams_fields_to_card_tasks

Revision ID: 2026_04_13_1200
Revises: 2026_04_13_1100
Create Date: 2026-04-13

Adiciona campos para integração com Microsoft Teams:
- teams_meeting_id: ID da reunião criada no Teams
- teams_join_url: Link de entrada na reunião
- transcript_raw: Transcrição bruta em formato VTT
- transcript_analysis: Análise da IA (JSON com resumo, sentimento, objeções, próximos passos)
"""
from alembic import op
import sqlalchemy as sa

revision = '2026_04_13_1200'
down_revision = '2026_04_13_1100'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('card_tasks', sa.Column(
        'teams_meeting_id', sa.String(255), nullable=True,
        comment='ID da reunião no Microsoft Teams'
    ))
    op.add_column('card_tasks', sa.Column(
        'teams_join_url', sa.String(1000), nullable=True,
        comment='Link de entrada na reunião Teams (joinWebUrl)'
    ))
    op.add_column('card_tasks', sa.Column(
        'transcript_raw', sa.Text(), nullable=True,
        comment='Transcrição bruta da reunião em formato VTT'
    ))
    op.add_column('card_tasks', sa.Column(
        'transcript_analysis', sa.Text(), nullable=True,
        comment='Análise IA da transcrição (JSON: resumo, sentimento, objecoes, proximos_passos, pontos_de_atencao)'
    ))


def downgrade():
    op.drop_column('card_tasks', 'transcript_analysis')
    op.drop_column('card_tasks', 'transcript_raw')
    op.drop_column('card_tasks', 'teams_join_url')
    op.drop_column('card_tasks', 'teams_meeting_id')
