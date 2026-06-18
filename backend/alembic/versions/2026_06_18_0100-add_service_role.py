"""Adiciona role 'service' (Serviço) ao sistema

Revision ID: add_service_role_2026
Revises: 2026_06_12_0300
Create Date: 2026-06-18 01:00:00.000000

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = 'add_service_role_2026'
down_revision = '2026_06_12_0300'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Insere a role 'service' na tabela roles, se ainda não existir."""
    op.execute("""
        INSERT INTO roles (name, display_name, description, permissions, is_system_role, created_at, updated_at)
        VALUES (
            'service',
            'Serviço',
            'Acesso ao módulo de serviços (boards de serviço, atividades, clientes, pessoas e produtos)',
            '["boards.read", "cards.read", "cards.create", "cards.update", "clients.read", "clients.create", "persons.read", "persons.create", "products.read"]',
            true,
            now(),
            now()
        )
        ON CONFLICT (name) DO NOTHING;
    """)


def downgrade() -> None:
    """Remove a role 'service' do sistema."""
    op.execute("DELETE FROM roles WHERE name = 'service';")
