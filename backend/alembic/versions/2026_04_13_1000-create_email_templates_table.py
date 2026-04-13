"""create email_templates table

Revision ID: 2026_04_13_1000
Revises: 2026_04_10_1000
Create Date: 2026-04-13 10:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '2026_04_13_1000'
down_revision = '2026_04_10_1000'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'email_templates',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('subject', sa.String(500), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_by_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_email_templates_created_by_id', 'email_templates', ['created_by_id'])


def downgrade():
    op.drop_index('ix_email_templates_created_by_id', table_name='email_templates')
    op.drop_table('email_templates')
