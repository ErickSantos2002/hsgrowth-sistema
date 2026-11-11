"""Parcerias: hunter, indicação, termos e as 4 situações da Aquisição

Revision ID: 8c9d0e1f2a3b
Revises: 7b8c9d0e1f2a
Create Date: 2026-11-11 10:00:00

- partners: kind, cpf, pix_key, indicated_by_partner_id, blocked_at/by, terms_accepted_at.
- partner_terms e partner_terms_acceptances.
- role hunter.
- partners.stage: ativacao/ativado -> ativado; perdido -> bloqueado; demais -> convidado
  (se já existe login partner) ou potencial.
"""
from alembic import op
import sqlalchemy as sa


revision = '8c9d0e1f2a3b'
down_revision = '7b8c9d0e1f2a'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('partners', sa.Column('kind', sa.String(10), nullable=False, server_default='empresa'))
    op.add_column('partners', sa.Column('cpf', sa.String(11), nullable=True))
    op.add_column('partners', sa.Column('pix_key', sa.String(140), nullable=True))
    op.add_column('partners', sa.Column('indicated_by_partner_id', sa.Integer(),
                                        sa.ForeignKey('partners.id', ondelete='SET NULL'), nullable=True))
    op.add_column('partners', sa.Column('blocked_at', sa.DateTime(), nullable=True))
    op.add_column('partners', sa.Column('blocked_by_id', sa.Integer(),
                                        sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True))
    op.add_column('partners', sa.Column('terms_accepted_at', sa.DateTime(), nullable=True))
    op.add_column('partners', sa.Column('blocked_login_ids', sa.JSON(), nullable=True))
    op.create_index('ix_partners_cpf', 'partners', ['cpf'])
    op.create_index('ix_partners_indicated_by_partner_id', 'partners', ['indicated_by_partner_id'])

    op.create_table(
        'partner_terms',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('audience', sa.String(10), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('published_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('published_by_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.UniqueConstraint('audience', 'version', name='uq_partner_terms_audience_version'),
    )
    op.create_index('ix_partner_terms_id', 'partner_terms', ['id'])
    op.create_table(
        'partner_terms_acceptances',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('partner_id', sa.Integer(), sa.ForeignKey('partners.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('terms_id', sa.Integer(), sa.ForeignKey('partner_terms.id', ondelete='CASCADE'), nullable=False),
        sa.Column('accepted_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('ip_address', sa.String(64), nullable=True),
    )
    op.create_index('ix_partner_terms_acceptances_id', 'partner_terms_acceptances', ['id'])
    op.create_index('ix_partner_terms_acceptances_partner_id', 'partner_terms_acceptances', ['partner_id'])

    op.execute("""
        INSERT INTO roles (name, display_name, description, permissions, is_system_role, created_at, updated_at)
        VALUES ('hunter', 'Hunter de parceiros',
                'Pessoa ou empresa que indica empresas ao Programa de Parceiros e acompanha as indicações',
                '[]', true, now(), now())
        ON CONFLICT (name) DO NOTHING;
    """)

    # Situações da Aquisição: a ordem importa (ativado e perdido primeiro).
    op.execute("UPDATE partners SET stage = 'ativado' WHERE stage IN ('ativacao', 'ativado')")
    op.execute("UPDATE partners SET stage = 'bloqueado', blocked_at = now() WHERE stage = 'perdido'")
    op.execute("""
        UPDATE partners SET stage = CASE WHEN EXISTS (
            SELECT 1 FROM users u JOIN roles r ON r.id = u.role_id
            WHERE u.partner_id = partners.id AND r.name = 'partner' AND u.is_deleted = false
        ) THEN 'convidado' ELSE 'potencial' END
        WHERE stage IN ('potencial', 'qualificacao', 'proposta', 'formalizacao', 'onboarding')
    """)


def downgrade():
    op.execute("UPDATE partners SET stage = 'potencial' WHERE stage = 'convidado'")
    op.execute("UPDATE partners SET stage = 'perdido' WHERE stage = 'bloqueado'")
    op.execute("DELETE FROM roles WHERE name = 'hunter' "
               "AND NOT EXISTS (SELECT 1 FROM users WHERE users.role_id = roles.id)")
    op.drop_index('ix_partner_terms_acceptances_partner_id', table_name='partner_terms_acceptances')
    op.drop_index('ix_partner_terms_acceptances_id', table_name='partner_terms_acceptances')
    op.drop_table('partner_terms_acceptances')
    op.drop_index('ix_partner_terms_id', table_name='partner_terms')
    op.drop_table('partner_terms')
    op.drop_index('ix_partners_indicated_by_partner_id', table_name='partners')
    op.drop_index('ix_partners_cpf', table_name='partners')
    for c in ('blocked_login_ids', 'terms_accepted_at', 'blocked_by_id', 'blocked_at', 'indicated_by_partner_id', 'pix_key', 'cpf', 'kind'):
        op.drop_column('partners', c)
