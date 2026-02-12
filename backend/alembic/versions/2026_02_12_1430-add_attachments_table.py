"""Add attachments table

Revision ID: 2026_02_12_1430
Revises: 2026_02_05_1230
Create Date: 2026-02-12 14:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_attachments_2026'
down_revision = 'blueprint_consultora_2026'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Cria a tabela attachments para armazenar arquivos anexados aos cards"""
    op.create_table(
        'attachments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('card_id', sa.Integer(), nullable=False, comment='ID do card ao qual o arquivo pertence'),
        sa.Column('uploaded_by_id', sa.Integer(), nullable=True, comment='ID do usuário que fez upload'),

        # Informações do arquivo
        sa.Column('filename', sa.String(length=255), nullable=False, comment='Nome único do arquivo (gerado)'),
        sa.Column('original_filename', sa.String(length=500), nullable=False, comment='Nome original do arquivo'),
        sa.Column('file_size', sa.BigInteger(), nullable=False, comment='Tamanho em bytes'),
        sa.Column('mime_type', sa.String(length=100), nullable=False, comment='Tipo MIME (application/pdf, image/jpeg, etc)'),

        # Caminho de armazenamento
        sa.Column('storage_path', sa.String(length=1000), nullable=False, comment='Caminho relativo no volume (cards/123/abc.pdf)'),

        # Auditoria (TimestampMixin)
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),

        # Soft delete (SoftDeleteMixin)
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), server_default=sa.text('false'), nullable=False),

        # Constraints
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['card_id'], ['cards.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['uploaded_by_id'], ['users.id'], ondelete='SET NULL')
    )

    # Cria índices para melhor performance
    op.create_index('ix_attachments_id', 'attachments', ['id'])
    op.create_index('ix_attachments_card_id', 'attachments', ['card_id'])
    op.create_index('ix_attachments_uploaded_by_id', 'attachments', ['uploaded_by_id'])


def downgrade() -> None:
    """Remove a tabela attachments"""
    op.drop_index('ix_attachments_uploaded_by_id', table_name='attachments')
    op.drop_index('ix_attachments_card_id', table_name='attachments')
    op.drop_index('ix_attachments_id', table_name='attachments')
    op.drop_table('attachments')
