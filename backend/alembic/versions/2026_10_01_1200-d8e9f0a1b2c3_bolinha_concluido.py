"""bolinha concluido: tabela card_checks

Revision ID: d8e9f0a1b2c3
Revises: c7d8e9f0a1b2
Create Date: 2026-10-01 12:00:00

Bolinha "concluido" pessoal nos cards (Vendas e Servico), como no Trello. Cada
linha e a marcacao de um usuario em um card, com a foto do contexto no clique
(board + situacao aberto/ganho/perdido). Se o contexto do card mudar, a
marcacao deixa de valer.

Somente acrescimos: nenhuma tabela ou coluna existente e alterada.
"""
from alembic import op
import sqlalchemy as sa


revision = 'd8e9f0a1b2c3'
down_revision = 'c7d8e9f0a1b2'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'card_checks',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column(
            'user_id', sa.Integer(),
            sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False,
            comment='Quem marcou',
        ),
        sa.Column(
            'card_id', sa.Integer(),
            sa.ForeignKey('cards.id', ondelete='CASCADE'), nullable=True,
            comment='Card de Vendas',
        ),
        sa.Column(
            'service_card_id', sa.Integer(),
            sa.ForeignKey('service_cards.id', ondelete='CASCADE'), nullable=True,
            comment='Card de Servico',
        ),
        sa.Column(
            'board_id', sa.Integer(), nullable=False,
            comment='Board do card no momento do clique',
        ),
        sa.Column(
            'situacao', sa.String(10), nullable=False,
            comment='aberto | ganho | perdido no clique',
        ),
        sa.Column(
            'created_at', sa.DateTime(), nullable=False,
            server_default=sa.text('CURRENT_TIMESTAMP'),
        ),
        sa.UniqueConstraint('user_id', 'card_id', name='uq_card_checks_user_card'),
        sa.UniqueConstraint('user_id', 'service_card_id', name='uq_card_checks_user_service_card'),
        sa.CheckConstraint(
            '(card_id IS NULL) <> (service_card_id IS NULL)',
            name='ck_card_checks_um_card',
        ),
    )
    op.create_index('ix_card_checks_user_id', 'card_checks', ['user_id'])
    op.create_index('ix_card_checks_card_id', 'card_checks', ['card_id'])
    op.create_index('ix_card_checks_service_card_id', 'card_checks', ['service_card_id'])


def downgrade():
    op.drop_index('ix_card_checks_service_card_id', table_name='card_checks')
    op.drop_index('ix_card_checks_card_id', table_name='card_checks')
    op.drop_index('ix_card_checks_user_id', table_name='card_checks')
    op.drop_table('card_checks')
