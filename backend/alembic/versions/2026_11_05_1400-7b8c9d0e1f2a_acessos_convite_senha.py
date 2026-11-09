"""Acessos: convite por e-mail, troca obrigatória de senha e vendedor do parceiro

Revision ID: 7b8c9d0e1f2a
Revises: 6a7b8c9d0e1f
Create Date: 2026-11-05 14:00:00

- users.must_change_password: senha definida por outra pessoa obriga a trocar no 1º login.
- user_access_tokens: links de uso único (convite 7 dias, redefinição 1 hora); só o hash.
- role partner_member: vendedor da equipe do parceiro (vê só as próprias oportunidades).
"""
from alembic import op
import sqlalchemy as sa


revision = '7b8c9d0e1f2a'
down_revision = '6a7b8c9d0e1f'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('must_change_password', sa.Boolean(), nullable=False,
                                     server_default=sa.false()))
    op.create_table(
        'user_access_tokens',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('kind', sa.String(20), nullable=False),
        sa.Column('token_hash', sa.String(64), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('used_at', sa.DateTime(), nullable=True),
        sa.Column('created_by_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_user_access_tokens_user_id', 'user_access_tokens', ['user_id'])
    op.create_index('ix_user_access_tokens_token_hash', 'user_access_tokens', ['token_hash'], unique=True)
    op.execute("""
        INSERT INTO roles (name, display_name, description, permissions, is_system_role, created_at, updated_at)
        VALUES ('partner_member', 'Vendedor do parceiro',
                'Vendedor da equipe de um parceiro: só as próprias oportunidades e a Consulta de CNPJ',
                '[]', true, now(), now())
        ON CONFLICT (name) DO NOTHING;
    """)


def downgrade():
    op.execute("DELETE FROM roles WHERE name = 'partner_member' "
               "AND NOT EXISTS (SELECT 1 FROM users WHERE users.role_id = roles.id)")
    op.drop_index('ix_user_access_tokens_token_hash', table_name='user_access_tokens')
    op.drop_index('ix_user_access_tokens_user_id', table_name='user_access_tokens')
    op.drop_table('user_access_tokens')
    op.drop_column('users', 'must_change_password')
