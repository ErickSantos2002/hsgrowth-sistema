"""propostas: vínculo N:N (proposal_service_cards) + histórico (proposal_versions)

Migra os vínculos existentes de proposals.service_card_id para a tabela de
vínculo e remove a coluna. Nenhuma proposta perde vínculo.

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-07-03 10:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = 'd4e5f6a7b8c9'
down_revision = 'c3d4e5f6a7b8'
branch_labels = None
depends_on = None


def upgrade():
    # 1) Tabela de vínculo N:N proposta <-> card de serviço
    op.create_table(
        'proposal_service_cards',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('proposal_id', sa.Integer(), nullable=False),
        sa.Column('service_card_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['proposal_id'], ['proposals.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['service_card_id'], ['service_cards.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('proposal_id', 'service_card_id', name='uq_proposal_card'),
    )
    op.create_index(op.f('ix_proposal_service_cards_id'), 'proposal_service_cards', ['id'])
    op.create_index(op.f('ix_proposal_service_cards_proposal_id'), 'proposal_service_cards', ['proposal_id'])
    op.create_index(op.f('ix_proposal_service_cards_service_card_id'), 'proposal_service_cards', ['service_card_id'])

    # 2) Tabela de histórico de versões
    op.create_table(
        'proposal_versions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('proposal_id', sa.Integer(), nullable=False),
        sa.Column('version_number', sa.Integer(), nullable=False),
        sa.Column('snapshot', sa.JSON(), nullable=True),
        sa.Column('pdf_path', sa.String(length=500), nullable=True),
        sa.Column('changed_by', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['proposal_id'], ['proposals.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_proposal_versions_id'), 'proposal_versions', ['id'])
    op.create_index(op.f('ix_proposal_versions_proposal_id'), 'proposal_versions', ['proposal_id'])

    # 3) Migra vínculos existentes (service_card_id -> tabela de vínculo)
    op.execute(
        """
        INSERT INTO proposal_service_cards (proposal_id, service_card_id, created_at, updated_at)
        SELECT id, service_card_id, NOW(), NOW()
        FROM proposals
        WHERE service_card_id IS NOT NULL
          AND is_deleted = false
        """
    )

    # 4) NÃO dropamos proposals.service_card_id aqui (expand/contract).
    #    A coluna fica órfã (não mais mapeada no model) e será removida numa
    #    migration de limpeza posterior, após validação em produção.


def downgrade():
    op.drop_index(op.f('ix_proposal_versions_proposal_id'), table_name='proposal_versions')
    op.drop_index(op.f('ix_proposal_versions_id'), table_name='proposal_versions')
    op.drop_table('proposal_versions')
    op.drop_index(op.f('ix_proposal_service_cards_service_card_id'), table_name='proposal_service_cards')
    op.drop_index(op.f('ix_proposal_service_cards_proposal_id'), table_name='proposal_service_cards')
    op.drop_index(op.f('ix_proposal_service_cards_id'), table_name='proposal_service_cards')
    op.drop_table('proposal_service_cards')
