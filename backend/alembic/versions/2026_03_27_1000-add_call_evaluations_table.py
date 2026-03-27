"""Cria tabela call_evaluations para armazenar avaliações de ligações geradas pelo agente de IA.

Revision ID: add_call_evaluations_table_2026
Revises: add_reopened_from_card_id_2026
Create Date: 2026-03-27 10:00:00
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = 'add_call_evaluations_table_2026'
down_revision = 'add_reopened_from_card_id_2026'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'call_evaluations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('card_id', sa.Integer(), nullable=False, comment='Card ao qual a ligação pertence'),
        sa.Column('call_log_id', sa.Integer(), nullable=True, comment='Registro da chamada VOIP (opcional)'),
        sa.Column('transcript', sa.Text(), nullable=True, comment='Transcrição completa da ligação'),
        sa.Column('summary', sa.Text(), nullable=False, comment='Resumo objetivo da conversa'),
        sa.Column('next_steps', sa.Text(), nullable=True, comment='Próximos passos combinados'),
        sa.Column('general_evaluation', sa.Text(), nullable=True, comment='Clareza, receptividade e qualificação'),
        sa.Column('situation', sa.String(50), nullable=True, comment='Situação da oportunidade'),
        sa.Column('matrix_evaluation', JSONB(), nullable=True, comment='Avaliação por blocos da matriz de ligação'),
        sa.Column('final_score', sa.Float(), nullable=True, comment='Nota final (0.0 a 10.0)'),
        sa.Column('classification', sa.String(20), nullable=True, comment='Excelente | Boa | Regular | Fraca | Crítica'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['card_id'], ['cards.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['call_log_id'], ['call_logs.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_call_evaluations_id', 'call_evaluations', ['id'], unique=False)
    op.create_index('ix_call_evaluations_card_id', 'call_evaluations', ['card_id'], unique=False)
    op.create_index('ix_call_evaluations_call_log_id', 'call_evaluations', ['call_log_id'], unique=False)


def downgrade():
    op.drop_index('ix_call_evaluations_call_log_id', table_name='call_evaluations')
    op.drop_index('ix_call_evaluations_card_id', table_name='call_evaluations')
    op.drop_index('ix_call_evaluations_id', table_name='call_evaluations')
    op.drop_table('call_evaluations')
