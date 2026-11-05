"""Parcerias: oportunidade ligada ao Cliente e à Pessoa do CRM

Revision ID: 6a7b8c9d0e1f
Revises: 5f6a7b8c9d0e
Create Date: 2026-11-05 10:00:00

Acrescenta client_id e person_id em partner_opportunities: a empresa e o contato
da indicação passam a ser o mesmo Cliente e a mesma Pessoa de Vendas. Só colunas
novas e vazias; as oportunidades existentes se ligam na próxima vez que forem salvas.
"""
from alembic import op
import sqlalchemy as sa


revision = '6a7b8c9d0e1f'
down_revision = '5f6a7b8c9d0e'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('partner_opportunities', sa.Column('client_id', sa.Integer(), nullable=True))
    op.add_column('partner_opportunities', sa.Column('person_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_partner_opportunities_client_id', 'partner_opportunities', 'clients',
        ['client_id'], ['id'], ondelete='SET NULL',
    )
    op.create_foreign_key(
        'fk_partner_opportunities_person_id', 'partner_opportunities', 'persons',
        ['person_id'], ['id'], ondelete='SET NULL',
    )
    op.create_index('ix_partner_opportunities_client_id', 'partner_opportunities', ['client_id'])
    op.create_index('ix_partner_opportunities_person_id', 'partner_opportunities', ['person_id'])


def downgrade():
    op.drop_index('ix_partner_opportunities_person_id', table_name='partner_opportunities')
    op.drop_index('ix_partner_opportunities_client_id', table_name='partner_opportunities')
    op.drop_constraint('fk_partner_opportunities_person_id', 'partner_opportunities', type_='foreignkey')
    op.drop_constraint('fk_partner_opportunities_client_id', 'partner_opportunities', type_='foreignkey')
    op.drop_column('partner_opportunities', 'person_id')
    op.drop_column('partner_opportunities', 'client_id')
