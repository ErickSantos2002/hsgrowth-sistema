"""Remodelação completa do sistema de gamificação v2.

Adiciona board_type em Board, created_by_id em CardTask,
novos campos em gamification_points, gamification_rankings e gamification_badges,
recria gamification_action_points com constraint (board_type, action_type),
limpa dados históricos incorretos e popula valores padrão.

Revision ID: gamification_remodulacao_v2_2026
Revises: expand_origin_utm_fields_500
Create Date: 2026-03-17 10:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = "gamification_remodulacao_v2_2026"
down_revision = "expand_origin_utm_fields_500"
branch_labels = None
depends_on = None


def upgrade():
    # ──────────────────────────────────────────
    # 1. boards — adiciona board_type
    # ──────────────────────────────────────────
    op.add_column(
        "boards",
        sa.Column("board_type", sa.String(20), nullable=True)
    )

    # Preenche os boards existentes pelo ID conhecido
    op.execute("UPDATE boards SET board_type = 'prospecting' WHERE id = 6")
    op.execute("UPDATE boards SET board_type = 'acquisition' WHERE id = 7")
    # Board Expansão (id=8) fica com board_type = NULL — não pontua

    # ──────────────────────────────────────────
    # 2. card_tasks — adiciona created_by_id
    # ──────────────────────────────────────────
    op.add_column(
        "card_tasks",
        sa.Column("created_by_id", sa.Integer(), nullable=True)
    )
    op.create_foreign_key(
        "fk_card_tasks_created_by_id",
        "card_tasks",
        "users",
        ["created_by_id"],
        ["id"],
        ondelete="SET NULL"
    )
    op.create_index("ix_card_tasks_created_by_id", "card_tasks", ["created_by_id"])

    # ──────────────────────────────────────────
    # 3. gamification_points — novos campos
    # ──────────────────────────────────────────
    op.add_column("gamification_points", sa.Column("board_type", sa.String(20), nullable=True))
    op.add_column("gamification_points", sa.Column("is_commission", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("gamification_points", sa.Column("commission_source_user_id", sa.Integer(), nullable=True))
    op.add_column("gamification_points", sa.Column("commission_ratio", sa.String(10), nullable=True))
    op.add_column("gamification_points", sa.Column("original_points", sa.Integer(), nullable=True))

    op.create_foreign_key(
        "fk_gamification_points_commission_source",
        "gamification_points",
        "users",
        ["commission_source_user_id"],
        ["id"],
        ondelete="SET NULL"
    )
    op.create_index("ix_gamification_points_board_type", "gamification_points", ["board_type"])

    # ──────────────────────────────────────────
    # 4. gamification_rankings — novo campo board_type
    # ──────────────────────────────────────────
    # Remove unique constraint antiga
    op.drop_constraint("unique_user_ranking_period", "gamification_rankings", type_="unique")

    op.add_column("gamification_rankings", sa.Column("board_type", sa.String(20), nullable=True))

    # Preenche valores existentes com placeholder (serão limpos logo abaixo)
    op.execute("UPDATE gamification_rankings SET board_type = 'acquisition' WHERE board_type IS NULL")

    # Torna o campo NOT NULL após preencher
    op.alter_column("gamification_rankings", "board_type", nullable=False)

    # Recria unique constraint incluindo board_type
    op.create_unique_constraint(
        "unique_user_board_ranking_period",
        "gamification_rankings",
        ["user_id", "board_type", "period_type", "period_start"]
    )

    op.create_index("ix_gamification_rankings_board_type", "gamification_rankings", ["board_type"])

    # ──────────────────────────────────────────
    # 5. gamification_badges — soft delete
    # ──────────────────────────────────────────
    op.add_column("gamification_badges", sa.Column("deleted_at", sa.DateTime(), nullable=True))

    # ──────────────────────────────────────────
    # 6. gamification_action_points — board_type + nova constraint
    # ──────────────────────────────────────────
    # Remove unique constraint e índice único em action_type (IF EXISTS para compatibilidade entre ambientes)
    op.execute("ALTER TABLE gamification_action_points DROP CONSTRAINT IF EXISTS gamification_action_points_action_type_key")
    op.execute("DROP INDEX IF EXISTS ix_gamification_action_points_action_type")

    op.add_column("gamification_action_points", sa.Column("board_type", sa.String(20), nullable=True))

    # Cria unique constraint no par (board_type, action_type)
    op.create_unique_constraint(
        "unique_board_action_type",
        "gamification_action_points",
        ["board_type", "action_type"]
    )

    op.create_index("ix_gamification_action_points_board_type", "gamification_action_points", ["board_type"])

    # ──────────────────────────────────────────
    # 7. Limpeza de dados históricos
    # ──────────────────────────────────────────
    op.execute("DELETE FROM user_badges")
    op.execute("DELETE FROM gamification_badges")
    op.execute("DELETE FROM gamification_rankings")
    op.execute("DELETE FROM gamification_points")
    op.execute("DELETE FROM gamification_action_points")

    # ──────────────────────────────────────────
    # 8. Popula configurações padrão por board
    # ──────────────────────────────────────────

    # Board Prospecção
    op.execute("""
        INSERT INTO gamification_action_points (board_type, action_type, points, is_active, description, created_at, updated_at)
        VALUES
            ('prospecting', 'meeting_created',    20, true,  'Reunião agendada no board Prospecção', NOW(), NOW()),
            ('prospecting', 'card_moved',           3, true,  'Card movido entre etapas no board Prospecção', NOW(), NOW()),
            ('prospecting', 'card_created',         3, true,  'Novo card criado no board Prospecção', NOW(), NOW()),
            ('prospecting', 'call_completed',       2, true,  'Ligação realizada no board Prospecção', NOW(), NOW()),
            ('prospecting', 'followup_completed',   2, true,  'Follow-up realizado no board Prospecção', NOW(), NOW()),
            ('prospecting', 'task_completed',       1, true,  'Tarefa genérica concluída no board Prospecção', NOW(), NOW())
    """)

    # Board Aquisição
    op.execute("""
        INSERT INTO gamification_action_points (board_type, action_type, points, is_active, description, created_at, updated_at)
        VALUES
            ('acquisition', 'card_won',            100, true,  'Card ganho (negócio fechado)', NOW(), NOW()),
            ('acquisition', 'card_lost',           -10, true,  'Card perdido no board Aquisição', NOW(), NOW()),
            ('acquisition', 'meeting_completed',    15, true,  'Reunião realizada no board Aquisição', NOW(), NOW()),
            ('acquisition', 'proposal_attached',    10, true,  'Primeira proposta anexada ao card', NOW(), NOW()),
            ('acquisition', 'card_moved',            5, true,  'Card movido entre etapas no board Aquisição', NOW(), NOW()),
            ('acquisition', 'followup_completed',    3, true,  'Follow-up realizado no board Aquisição', NOW(), NOW()),
            ('acquisition', 'task_completed',        2, true,  'Tarefa genérica concluída no board Aquisição', NOW(), NOW())
    """)


def downgrade():
    # Remove dados inseridos
    op.execute("DELETE FROM gamification_action_points")

    # Reverte gamification_action_points
    op.drop_index("ix_gamification_action_points_board_type", "gamification_action_points")
    op.drop_constraint("unique_board_action_type", "gamification_action_points", type_="unique")
    op.drop_column("gamification_action_points", "board_type")
    op.create_unique_constraint(
        "gamification_action_points_action_type_key",
        "gamification_action_points",
        ["action_type"]
    )

    # Reverte gamification_badges
    op.drop_column("gamification_badges", "deleted_at")

    # Reverte gamification_rankings
    op.drop_index("ix_gamification_rankings_board_type", "gamification_rankings")
    op.drop_constraint("unique_user_board_ranking_period", "gamification_rankings", type_="unique")
    op.drop_column("gamification_rankings", "board_type")
    op.create_unique_constraint(
        "unique_user_ranking_period",
        "gamification_rankings",
        ["user_id", "period_type", "period_start"]
    )

    # Reverte gamification_points
    op.drop_index("ix_gamification_points_board_type", "gamification_points")
    op.drop_constraint("fk_gamification_points_commission_source", "gamification_points", type_="foreignkey")
    op.drop_column("gamification_points", "original_points")
    op.drop_column("gamification_points", "commission_ratio")
    op.drop_column("gamification_points", "commission_source_user_id")
    op.drop_column("gamification_points", "is_commission")
    op.drop_column("gamification_points", "board_type")

    # Reverte card_tasks
    op.drop_index("ix_card_tasks_created_by_id", "card_tasks")
    op.drop_constraint("fk_card_tasks_created_by_id", "card_tasks", type_="foreignkey")
    op.drop_column("card_tasks", "created_by_id")

    # Reverte boards
    op.drop_column("boards", "board_type")
