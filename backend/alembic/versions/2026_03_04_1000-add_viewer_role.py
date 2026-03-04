"""Adiciona role 'viewer' (somente leitura) ao sistema

Revision ID: add_viewer_role_2026
Revises: create_custom_reports_2026
Create Date: 2026-03-04 10:00:00.000000

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = 'add_viewer_role_2026'
down_revision = 'add_shipping_cost_2026'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Insere a role 'viewer' na tabela roles, se ainda não existir."""
    op.execute("""
        INSERT INTO roles (name, display_name, description, permissions, is_system_role, created_at, updated_at)
        VALUES (
            'viewer',
            'Visualizador',
            'Acesso somente leitura a boards, clientes, pessoas e produtos',
            '["boards.read", "cards.read", "clients.read", "persons.read", "products.read"]',
            true,
            now(),
            now()
        )
        ON CONFLICT (name) DO NOTHING;
    """)


def downgrade() -> None:
    """Remove a role 'viewer' do sistema."""
    op.execute("DELETE FROM roles WHERE name = 'viewer';")
