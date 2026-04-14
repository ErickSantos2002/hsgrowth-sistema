"""add_cadence_system_tables

Revision ID: 2026_04_14_1100
Revises: 2026_04_14_1000
Create Date: 2026-04-14

Cria o sistema de cadência por lead individual:
- cadence_templates: templates configuráveis por admin/gerente
- cadence_steps: etapas de cada template (dia, tipo, título)
- card_cadences: instância da cadência em um card específico
- card_tasks.card_cadence_id: FK ligando a task à instância de cadência
"""
from alembic import op
import sqlalchemy as sa


revision = '2026_04_14_1100'
down_revision = '2026_04_14_1000'
branch_labels = None
depends_on = None


def upgrade():
    # ── cadence_templates ────────────────────────────────────────────────────
    op.create_table(
        'cadence_templates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_by_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_cadence_templates_id', 'cadence_templates', ['id'])
    op.create_index('ix_cadence_templates_is_active', 'cadence_templates', ['is_active'])

    # ── cadence_steps ────────────────────────────────────────────────────────
    op.create_table(
        'cadence_steps',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('template_id', sa.Integer(), sa.ForeignKey('cadence_templates.id', ondelete='CASCADE'), nullable=False),
        sa.Column('order', sa.Integer(), nullable=False),
        sa.Column('day_offset', sa.Integer(), nullable=False),
        sa.Column('activity_type', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('priority', sa.String(length=20), nullable=False, server_default='normal'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_cadence_steps_id', 'cadence_steps', ['id'])
    op.create_index('ix_cadence_steps_template_id', 'cadence_steps', ['template_id'])

    # ── card_cadences ────────────────────────────────────────────────────────
    op.create_table(
        'card_cadences',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('card_id', sa.Integer(), sa.ForeignKey('cards.id', ondelete='CASCADE'), nullable=False),
        sa.Column('template_id', sa.Integer(), sa.ForeignKey('cadence_templates.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('started_by_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='active'),
        sa.Column('current_step_order', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('started_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('paused_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_card_cadences_id', 'card_cadences', ['id'])
    op.create_index('ix_card_cadences_card_id', 'card_cadences', ['card_id'])
    op.create_index('ix_card_cadences_status', 'card_cadences', ['status'])

    # ── card_tasks: coluna card_cadence_id ───────────────────────────────────
    op.add_column('card_tasks', sa.Column(
        'card_cadence_id',
        sa.Integer(),
        sa.ForeignKey('card_cadences.id', ondelete='SET NULL'),
        nullable=True,
    ))
    op.create_index('ix_card_tasks_card_cadence_id', 'card_tasks', ['card_cadence_id'])


def downgrade():
    op.drop_index('ix_card_tasks_card_cadence_id', table_name='card_tasks')
    op.drop_column('card_tasks', 'card_cadence_id')
    op.drop_table('card_cadences')
    op.drop_table('cadence_steps')
    op.drop_table('cadence_templates')
