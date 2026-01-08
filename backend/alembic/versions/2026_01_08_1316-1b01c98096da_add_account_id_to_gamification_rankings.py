"""add_account_id_to_gamification_rankings

Revision ID: 1b01c98096da
Revises: c83eca4d1b29
Create Date: 2026-01-08 13:16:23.553985

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '1b01c98096da'
down_revision = 'c83eca4d1b29'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Adiciona coluna account_id (temporariamente nullable)
    op.add_column('gamification_rankings', sa.Column('account_id', sa.Integer(), nullable=True))

    # Preenche account_id consultando a tabela users
    op.execute("""
        UPDATE gamification_rankings
        SET account_id = (
            SELECT account_id
            FROM users
            WHERE users.id = gamification_rankings.user_id
        )
    """)

    # Torna a coluna NOT NULL
    op.alter_column('gamification_rankings', 'account_id', nullable=False)

    # Adiciona foreign key constraint
    op.create_foreign_key(
        'fk_gamification_rankings_account_id',
        'gamification_rankings',
        'accounts',
        ['account_id'],
        ['id'],
        ondelete='CASCADE'
    )

    # Cria index para account_id
    op.create_index('ix_gamification_rankings_account_id', 'gamification_rankings', ['account_id'])

    # Drop a constraint antiga
    op.drop_constraint('unique_user_ranking_period', 'gamification_rankings', type_='unique')

    # Cria a nova constraint com account_id
    op.create_unique_constraint(
        'unique_user_ranking_period',
        'gamification_rankings',
        ['account_id', 'user_id', 'period_type', 'period_start']
    )


def downgrade() -> None:
    # Drop a nova constraint
    op.drop_constraint('unique_user_ranking_period', 'gamification_rankings', type_='unique')

    # Recria a constraint antiga sem account_id
    op.create_unique_constraint(
        'unique_user_ranking_period',
        'gamification_rankings',
        ['user_id', 'period_type', 'period_start']
    )

    # Drop index
    op.drop_index('ix_gamification_rankings_account_id', 'gamification_rankings')

    # Drop foreign key
    op.drop_constraint('fk_gamification_rankings_account_id', 'gamification_rankings', type_='foreignkey')

    # Drop coluna account_id
    op.drop_column('gamification_rankings', 'account_id')
