"""Parcerias: Consulta de CNPJ (histórico) e semáforo gravado na oportunidade

Revision ID: 3d4e5f6a7b8c
Revises: 2c3d4e5f6a7b
Create Date: 2026-11-03 10:00:00

Cria cnpj_consultas e acrescenta cnpj_resultado, cnpj_motivo,
cnpj_liberado_por_id e cnpj_justificativa em partner_opportunities
(tabela da Entrega 1, só no homo). As oportunidades que já existem ficam nulas.
"""
from alembic import op
import sqlalchemy as sa


revision = '3d4e5f6a7b8c'
down_revision = '2c3d4e5f6a7b'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'cnpj_consultas',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('partner_id', sa.Integer(), sa.ForeignKey('partners.id', ondelete='SET NULL'), nullable=True),
        sa.Column('cnpj', sa.String(14), nullable=False),
        sa.Column('resultado', sa.String(10), nullable=False),
        sa.Column('motivo', sa.String(30), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_cnpj_consultas_id', 'cnpj_consultas', ['id'])
    op.create_index('ix_cnpj_consultas_user_id', 'cnpj_consultas', ['user_id'])
    op.create_index('ix_cnpj_consultas_partner_id', 'cnpj_consultas', ['partner_id'])
    op.create_index('ix_cnpj_consultas_cnpj', 'cnpj_consultas', ['cnpj'])
    op.create_index('ix_cnpj_consultas_created_at', 'cnpj_consultas', ['created_at'])

    op.add_column('partner_opportunities', sa.Column('cnpj_resultado', sa.String(10), nullable=True))
    op.add_column('partner_opportunities', sa.Column('cnpj_motivo', sa.String(30), nullable=True))
    op.add_column('partner_opportunities', sa.Column(
        'cnpj_liberado_por_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True))
    op.add_column('partner_opportunities', sa.Column('cnpj_justificativa', sa.Text(), nullable=True))


def downgrade():
    op.drop_column('partner_opportunities', 'cnpj_justificativa')
    op.drop_column('partner_opportunities', 'cnpj_liberado_por_id')
    op.drop_column('partner_opportunities', 'cnpj_motivo')
    op.drop_column('partner_opportunities', 'cnpj_resultado')
    op.drop_index('ix_cnpj_consultas_created_at', table_name='cnpj_consultas')
    op.drop_index('ix_cnpj_consultas_cnpj', table_name='cnpj_consultas')
    op.drop_index('ix_cnpj_consultas_partner_id', table_name='cnpj_consultas')
    op.drop_index('ix_cnpj_consultas_user_id', table_name='cnpj_consultas')
    op.drop_index('ix_cnpj_consultas_id', table_name='cnpj_consultas')
    op.drop_table('cnpj_consultas')
