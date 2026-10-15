"""notificacoes: preferencias de verdade, lead do site e controle de repeticao

Revision ID: e9f0a1b2c3d4
Revises: d8e9f0a1b2c3
Create Date: 2026-10-14 10:00:00

- notifications.referencia: a que o aviso se refere (o agendador confere
  antes de criar e nunca repete).
- user_notification_settings: entram reuniao_pronta, resumo_manha,
  reuniao_15min, popup_navegador e quadros_servico; saem card_moved,
  achievement_unlocked e task_due_soon (avisos que nao existem mais).
- cards.created_by_id e users.is_integracao: reconhecer o lead do site.
- service_cards.avisado_em: card de Servico ja avisado ao time. Os que ja
  existem nascem marcados, senao o primeiro ciclo avisaria 1.300 cards.
- Todas as notificacoes existentes viram lidas: o sino recomeca limpo.
"""
from alembic import op
import sqlalchemy as sa


revision = 'e9f0a1b2c3d4'
down_revision = 'd8e9f0a1b2c3'
branch_labels = None
depends_on = None

INTEGRACOES = ('integracao@healthsafetytech.com', 'gestorhs.integracao@healthsafetytech.com')


def upgrade():
    op.add_column('notifications', sa.Column(
        'referencia', sa.String(120), nullable=True,
        comment='A que o aviso se refere; evita repetir lembrete'))
    op.create_index('ix_notifications_dedupe', 'notifications',
                    ['user_id', 'notification_type', 'referencia'])

    for coluna in ('reuniao_pronta', 'resumo_manha', 'reuniao_15min', 'popup_navegador'):
        op.add_column('user_notification_settings', sa.Column(
            coluna, sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column('user_notification_settings', sa.Column(
        'quadros_servico', sa.JSON(), nullable=True,
        comment='Boards de Servico acompanhados; nulo = calcular pelo historico'))
    for coluna in ('card_moved', 'achievement_unlocked', 'task_due_soon'):
        op.drop_column('user_notification_settings', coluna)

    op.add_column('cards', sa.Column(
        'created_by_id', sa.Integer(),
        sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True,
        comment='Quem criou o card'))
    op.create_index('ix_cards_created_by_id', 'cards', ['created_by_id'])

    op.add_column('users', sa.Column(
        'is_integracao', sa.Boolean(), nullable=False, server_default=sa.false(),
        comment='Usuario tecnico de integracao'))
    op.execute(
        "UPDATE users SET is_integracao = true WHERE email IN ('%s', '%s')" % INTEGRACOES
    )

    op.add_column('service_cards', sa.Column(
        'avisado_em', sa.DateTime(), nullable=True,
        comment='Quando o time foi avisado do card novo'))
    op.execute("UPDATE service_cards SET avisado_em = now()")

    op.execute("UPDATE notifications SET is_read = true, read_at = now() WHERE is_read = false")


def downgrade():
    op.drop_column('service_cards', 'avisado_em')
    op.drop_column('users', 'is_integracao')
    op.drop_index('ix_cards_created_by_id', table_name='cards')
    op.drop_column('cards', 'created_by_id')
    for coluna in ('card_moved', 'achievement_unlocked', 'task_due_soon'):
        op.add_column('user_notification_settings', sa.Column(
            coluna, sa.Boolean(), nullable=False, server_default=sa.true()))
    op.drop_column('user_notification_settings', 'quadros_servico')
    for coluna in ('reuniao_pronta', 'resumo_manha', 'reuniao_15min', 'popup_navegador'):
        op.drop_column('user_notification_settings', coluna)
    op.drop_index('ix_notifications_dedupe', table_name='notifications')
    op.drop_column('notifications', 'referencia')
