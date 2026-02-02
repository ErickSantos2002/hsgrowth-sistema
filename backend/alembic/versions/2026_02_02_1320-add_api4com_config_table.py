"""Add api4com_config table

Revision ID: 2026_02_02_1320
Revises: 43cc618cf142
Create Date: 2026-02-02 13:20:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2026_02_02_1320'
down_revision = '43cc618cf142'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Cria a tabela api4com_config para configurações da API4COM"""
    op.create_table(
        'api4com_config',
        sa.Column('id', sa.Integer(), nullable=False),

        # Credenciais
        sa.Column('email', sa.String(length=255), nullable=False, comment='Email de login na API4COM'),
        sa.Column('password_encrypted', sa.Text(), nullable=False, comment='Senha criptografada'),

        # Token
        sa.Column('api_token', sa.Text(), nullable=True, comment='Token de autenticação da API'),
        sa.Column('token_expires_at', sa.DateTime(timezone=True), nullable=True, comment='Data de expiração do token'),

        # Status
        sa.Column('is_active', sa.Boolean(), server_default='false', nullable=False, comment='Se a integração está ativa'),
        sa.Column('last_sync_at', sa.DateTime(timezone=True), nullable=True, comment='Última sincronização com a API'),
        sa.Column('last_test_at', sa.DateTime(timezone=True), nullable=True, comment='Último teste de conexão'),
        sa.Column('last_test_success', sa.Boolean(), nullable=True, comment='Resultado do último teste'),
        sa.Column('last_test_error', sa.Text(), nullable=True, comment='Erro do último teste'),

        # Auditoria
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('created_by_id', sa.Integer(), nullable=True),
        sa.Column('updated_by_id', sa.Integer(), nullable=True),

        # Constraints
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], ondelete='SET NULL')
    )

    # Cria índices
    op.create_index('ix_api4com_config_id', 'api4com_config', ['id'])
    op.create_index('ix_api4com_config_is_active', 'api4com_config', ['is_active'])


def downgrade() -> None:
    """Remove a tabela api4com_config"""
    op.drop_index('ix_api4com_config_is_active', table_name='api4com_config')
    op.drop_index('ix_api4com_config_id', table_name='api4com_config')
    op.drop_table('api4com_config')
