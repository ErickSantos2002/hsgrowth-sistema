"""gclid: identificador do clique do Google Ads no card

Revision ID: f0a1b2c3d4e5
Revises: e9f0a1b2c3d4
Create Date: 2026-10-21 10:00:00

- cards.gclid: chega pela integração de leads junto com os UTMs, aparece no
  Rastreamento de Origem do card e vai no webhook "Webhook - Reunião agendada".
  Pedido do time de leads em 21/10/2026. VARCHAR(500) como os UTMs.
"""
from alembic import op
import sqlalchemy as sa

revision = "f0a1b2c3d4e5"
down_revision = "e9f0a1b2c3d4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "cards",
        sa.Column(
            "gclid",
            sa.String(500),
            nullable=True,
            comment="ID do clique do Google Ads (preenchido via API externa)",
        ),
    )


def downgrade() -> None:
    op.drop_column("cards", "gclid")
