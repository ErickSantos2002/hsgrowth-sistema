"""Parcerias: atividades no formato dos cards de Serviço (foco, anotação, arquivo, alteração)

Revision ID: 2c3d4e5f6a7b
Revises: 1b2c3d4e5f6a
Create Date: 2026-10-30 10:00:00

Só toca em partner_activities (tabela da Entrega 1, existe só no homo):
acrescenta as colunas de ServiceCardActivity, converte o `type` antigo em
category/activity_type, renomeia due_at para due_date e remove `type`.
"""
from alembic import op
import sqlalchemy as sa


revision = '2c3d4e5f6a7b'
down_revision = '1b2c3d4e5f6a'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('partner_activities', sa.Column('category', sa.String(20), nullable=False, server_default='atividade'))
    op.add_column('partner_activities', sa.Column('activity_type', sa.String(50), nullable=True))
    op.add_column('partner_activities', sa.Column('title', sa.String(500), nullable=True))
    op.add_column('partner_activities', sa.Column('activity_metadata', sa.JSON(), nullable=True))
    op.add_column('partner_activities', sa.Column('priority', sa.String(20), nullable=True))
    op.add_column('partner_activities', sa.Column('is_completed', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('partner_activities', sa.Column('file_name', sa.String(500), nullable=True))
    op.add_column('partner_activities', sa.Column('file_path', sa.String(1000), nullable=True))
    op.add_column('partner_activities', sa.Column('file_size', sa.BigInteger(), nullable=True))
    op.add_column('partner_activities', sa.Column('mime_type', sa.String(100), nullable=True))
    op.alter_column('partner_activities', 'due_at', new_column_name='due_date')
    op.alter_column('partner_activities', 'description', existing_type=sa.Text(), nullable=True)

    # nota → anotação; evento → alteração; o resto vira atividade com o tipo de Serviço.
    op.execute("""
        UPDATE partner_activities SET
            category = CASE type WHEN 'nota' THEN 'anotacao' WHEN 'evento' THEN 'alteracao' ELSE 'atividade' END,
            activity_type = CASE type
                WHEN 'ligacao' THEN 'call' WHEN 'whatsapp' THEN 'whatsapp' WHEN 'email' THEN 'email'
                WHEN 'reuniao' THEN 'meeting' WHEN 'tarefa' THEN 'task' WHEN 'nota' THEN 'note'
                ELSE 'change' END,
            title = CASE WHEN type IN ('nota', 'evento') THEN NULL ELSE left(description, 500) END,
            is_completed = completed_at IS NOT NULL
    """)
    op.drop_column('partner_activities', 'type')
    op.create_index('ix_partner_activities_category', 'partner_activities', ['category'])


def downgrade():
    op.drop_index('ix_partner_activities_category', table_name='partner_activities')
    op.add_column('partner_activities', sa.Column('type', sa.String(20), nullable=False, server_default='evento'))
    op.execute("""
        UPDATE partner_activities SET
            type = CASE category
                WHEN 'anotacao' THEN 'nota' WHEN 'alteracao' THEN 'evento' WHEN 'arquivo' THEN 'nota'
                ELSE CASE activity_type
                    WHEN 'call' THEN 'ligacao' WHEN 'whatsapp' THEN 'whatsapp' WHEN 'email' THEN 'email'
                    WHEN 'meeting' THEN 'reuniao' ELSE 'tarefa' END
                END,
            description = COALESCE(description, title, file_name, '')
    """)
    op.alter_column('partner_activities', 'type', server_default=None)
    op.alter_column('partner_activities', 'description', existing_type=sa.Text(), nullable=False)
    op.alter_column('partner_activities', 'due_date', new_column_name='due_at')
    for coluna in ('mime_type', 'file_size', 'file_path', 'file_name', 'is_completed', 'priority',
                   'activity_metadata', 'title', 'activity_type', 'category'):
        op.drop_column('partner_activities', coluna)
