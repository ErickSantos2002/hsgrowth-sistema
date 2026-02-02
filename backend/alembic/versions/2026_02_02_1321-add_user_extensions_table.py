"""Add user_extensions table

Revision ID: 2026_02_02_1321
Revises: 2026_02_02_1320
Create Date: 2026-02-02 13:21:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2026_02_02_1321'
down_revision = '2026_02_02_1320'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Cria a tabela user_extensions para vincular vendedores aos ramais da API4COM"""
    op.create_table(
        'user_extensions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False, comment='ID do usuário (vendedor)'),
        sa.Column('extension', sa.String(length=50), nullable=False, comment='Ramal do vendedor na API4COM'),

        # Configurações
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False, comment='Se o ramal está ativo'),

        # Auditoria
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),

        # Constraints
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('user_id', name='uq_user_extensions_user_id'),
        sa.UniqueConstraint('extension', name='uq_user_extensions_extension')
    )

    # Cria índices para melhor performance
    op.create_index('ix_user_extensions_id', 'user_extensions', ['id'])
    op.create_index('ix_user_extensions_user_id', 'user_extensions', ['user_id'])
    op.create_index('ix_user_extensions_extension', 'user_extensions', ['extension'])
    op.create_index('ix_user_extensions_is_active', 'user_extensions', ['is_active'])


def downgrade() -> None:
    """Remove a tabela user_extensions"""
    op.drop_index('ix_user_extensions_is_active', table_name='user_extensions')
    op.drop_index('ix_user_extensions_extension', table_name='user_extensions')
    op.drop_index('ix_user_extensions_user_id', table_name='user_extensions')
    op.drop_index('ix_user_extensions_id', table_name='user_extensions')
    op.drop_table('user_extensions')
