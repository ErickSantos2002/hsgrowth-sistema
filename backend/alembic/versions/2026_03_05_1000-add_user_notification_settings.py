"""Cria tabela user_notification_settings para configurações de notificação por usuário

Revision ID: notif_settings_2026
Revises: add_viewer_role_2026
Create Date: 2026-03-05 10:00:00.000000

"""
import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision = 'notif_settings_2026'
down_revision = 'add_viewer_role_2026'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Cria a tabela user_notification_settings com valores padrão True para todos os campos."""
    op.create_table(
        'user_notification_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        # Configurações individuais de notificação
        sa.Column('task_assigned', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('task_due_soon', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('card_moved', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('card_product_changed', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('achievement_unlocked', sa.Boolean(), nullable=False, server_default='true'),
        # Timestamps padrão
        sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=True, server_default=sa.text('now()')),
        # Constraints
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', name='uq_user_notification_settings_user_id'),
    )
    op.create_index(
        'ix_user_notification_settings_id',
        'user_notification_settings',
        ['id'],
        unique=False,
    )
    op.create_index(
        'ix_user_notification_settings_user_id',
        'user_notification_settings',
        ['user_id'],
        unique=False,
    )


def downgrade() -> None:
    """Remove a tabela user_notification_settings."""
    op.drop_index('ix_user_notification_settings_user_id', table_name='user_notification_settings')
    op.drop_index('ix_user_notification_settings_id', table_name='user_notification_settings')
    op.drop_table('user_notification_settings')
