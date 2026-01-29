"""create_contact_info_backup_table

Revision ID: 143af8f5e9f0
Revises: 43cc618cf142
Create Date: 2026-01-29 18:57:27.191480

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON, TIMESTAMP


# revision identifiers, used by Alembic.
revision = '143af8f5e9f0'
down_revision = '43cc618cf142'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Cria tabela de backup para contact_info
    op.create_table(
        'cards_contact_info_backup',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('card_id', sa.Integer(), nullable=False),
        sa.Column('contact_info', JSON, nullable=True),
        sa.Column('backed_up_at', TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # Cria índice no card_id
    op.create_index(op.f('ix_cards_contact_info_backup_card_id'), 'cards_contact_info_backup', ['card_id'], unique=False)

    # Copia dados de contact_info de todos os cards para o backup
    op.execute("""
        INSERT INTO cards_contact_info_backup (card_id, contact_info)
        SELECT id, contact_info
        FROM cards
        WHERE contact_info IS NOT NULL
    """)


def downgrade() -> None:
    # Remove índice
    op.drop_index(op.f('ix_cards_contact_info_backup_card_id'), table_name='cards_contact_info_backup')

    # Remove tabela
    op.drop_table('cards_contact_info_backup')
