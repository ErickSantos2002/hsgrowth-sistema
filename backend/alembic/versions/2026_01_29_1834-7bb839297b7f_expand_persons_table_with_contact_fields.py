"""expand_persons_table_with_contact_fields

Revision ID: 7bb839297b7f
Revises: be6611b1d1a6
Create Date: 2026-01-29 18:34:54.920000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '7bb839297b7f'
down_revision = 'be6611b1d1a6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Adiciona campos de email (múltiplos)
    op.add_column('persons', sa.Column('email_commercial', sa.String(length=255), nullable=True))
    op.add_column('persons', sa.Column('email_personal', sa.String(length=255), nullable=True))
    op.add_column('persons', sa.Column('email_alternative', sa.String(length=255), nullable=True))

    # Adiciona campos de telefone (múltiplos)
    op.add_column('persons', sa.Column('phone_commercial', sa.String(length=50), nullable=True))
    op.add_column('persons', sa.Column('phone_whatsapp', sa.String(length=50), nullable=True))
    op.add_column('persons', sa.Column('phone_alternative', sa.String(length=50), nullable=True))

    # Adiciona redes sociais
    op.add_column('persons', sa.Column('instagram', sa.String(length=500), nullable=True))
    op.add_column('persons', sa.Column('facebook', sa.String(length=500), nullable=True))

    # Cria índices para os emails (otimizar busca)
    op.create_index(op.f('ix_persons_email_commercial'), 'persons', ['email_commercial'], unique=False)
    op.create_index(op.f('ix_persons_email_personal'), 'persons', ['email_personal'], unique=False)


def downgrade() -> None:
    # Remove índices
    op.drop_index(op.f('ix_persons_email_personal'), table_name='persons')
    op.drop_index(op.f('ix_persons_email_commercial'), table_name='persons')

    # Remove colunas (ordem inversa da criação)
    op.drop_column('persons', 'facebook')
    op.drop_column('persons', 'instagram')
    op.drop_column('persons', 'phone_alternative')
    op.drop_column('persons', 'phone_whatsapp')
    op.drop_column('persons', 'phone_commercial')
    op.drop_column('persons', 'email_alternative')
    op.drop_column('persons', 'email_personal')
    op.drop_column('persons', 'email_commercial')
