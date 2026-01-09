"""remove_multi_tenant

Revision ID: a9c7d4e5f6b8
Revises: 1b01c98096da
Create Date: 2026-01-09 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a9c7d4e5f6b8'
down_revision = '1b01c98096da'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Remove multi-tenancy do sistema:
    - Dropa foreign keys de account_id
    - Dropa índices de account_id
    - Dropa colunas account_id de 7 tabelas
    - Recria unique constraint de gamification_rankings sem account_id
    - Dropa tabela accounts
    """

    # 1. Dropar foreign keys
    op.drop_constraint('users_account_id_fkey', 'users', type_='foreignkey')
    op.drop_constraint('boards_account_id_fkey', 'boards', type_='foreignkey')
    op.drop_constraint('clients_account_id_fkey', 'clients', type_='foreignkey')
    op.drop_constraint('automations_account_id_fkey', 'automations', type_='foreignkey')
    op.drop_constraint('gamification_badges_account_id_fkey', 'gamification_badges', type_='foreignkey')
    op.drop_constraint('gamification_rankings_account_id_fkey', 'gamification_rankings', type_='foreignkey')
    op.drop_constraint('audit_logs_account_id_fkey', 'audit_logs', type_='foreignkey')

    # 2. Dropar índices
    op.drop_index('ix_users_account_id', table_name='users')
    op.drop_index('ix_boards_account_id', table_name='boards')
    op.drop_index('ix_clients_account_id', table_name='clients')
    op.drop_index('ix_automations_account_id', table_name='automations')
    op.drop_index('ix_gamification_badges_account_id', table_name='gamification_badges')
    op.drop_index('ix_gamification_rankings_account_id', table_name='gamification_rankings')
    op.drop_index('ix_audit_logs_account_id', table_name='audit_logs')

    # 3. Dropar colunas account_id
    op.drop_column('users', 'account_id')
    op.drop_column('boards', 'account_id')
    op.drop_column('clients', 'account_id')
    op.drop_column('automations', 'account_id')
    op.drop_column('gamification_badges', 'account_id')
    op.drop_column('gamification_rankings', 'account_id')
    op.drop_column('audit_logs', 'account_id')

    # 4. Recriar unique constraint de gamification_rankings sem account_id
    op.drop_constraint('unique_user_ranking_period', 'gamification_rankings', type_='unique')
    op.create_unique_constraint(
        'unique_user_ranking_period',
        'gamification_rankings',
        ['user_id', 'period_type', 'period_start']
    )

    # 5. Dropar tabela accounts
    op.drop_table('accounts')


def downgrade() -> None:
    """
    Rollback: recria estrutura multi-tenant
    IMPORTANTE: Esta reversão não restaura os dados, apenas a estrutura.
    """

    # 1. Recriar tabela accounts
    op.create_table(
        'accounts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # 2. Adicionar colunas account_id
    op.add_column('users', sa.Column('account_id', sa.Integer(), nullable=True))
    op.add_column('boards', sa.Column('account_id', sa.Integer(), nullable=True))
    op.add_column('clients', sa.Column('account_id', sa.Integer(), nullable=True))
    op.add_column('automations', sa.Column('account_id', sa.Integer(), nullable=True))
    op.add_column('gamification_badges', sa.Column('account_id', sa.Integer(), nullable=True))
    op.add_column('gamification_rankings', sa.Column('account_id', sa.Integer(), nullable=True))
    op.add_column('audit_logs', sa.Column('account_id', sa.Integer(), nullable=True))

    # 3. Recriar índices
    op.create_index('ix_users_account_id', 'users', ['account_id'])
    op.create_index('ix_boards_account_id', 'boards', ['account_id'])
    op.create_index('ix_clients_account_id', 'clients', ['account_id'])
    op.create_index('ix_automations_account_id', 'automations', ['account_id'])
    op.create_index('ix_gamification_badges_account_id', 'gamification_badges', ['account_id'])
    op.create_index('ix_gamification_rankings_account_id', 'gamification_rankings', ['account_id'])
    op.create_index('ix_audit_logs_account_id', 'audit_logs', ['account_id'])

    # 4. Recriar foreign keys
    op.create_foreign_key('users_account_id_fkey', 'users', 'accounts', ['account_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key('boards_account_id_fkey', 'boards', 'accounts', ['account_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key('clients_account_id_fkey', 'clients', 'accounts', ['account_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key('automations_account_id_fkey', 'automations', 'accounts', ['account_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key('gamification_badges_account_id_fkey', 'gamification_badges', 'accounts', ['account_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key('gamification_rankings_account_id_fkey', 'gamification_rankings', 'accounts', ['account_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key('audit_logs_account_id_fkey', 'audit_logs', 'accounts', ['account_id'], ['id'], ondelete='CASCADE')

    # 5. Recriar unique constraint de gamification_rankings com account_id
    op.drop_constraint('unique_user_ranking_period', 'gamification_rankings', type_='unique')
    op.create_unique_constraint(
        'unique_user_ranking_period',
        'gamification_rankings',
        ['user_id', 'account_id', 'period_type', 'period_start']
    )
