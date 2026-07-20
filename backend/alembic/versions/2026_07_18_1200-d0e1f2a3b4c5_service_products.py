"""catalogo proprio de equipamentos do modulo de Servicos (service_products)

Separa o catálogo de equipamentos de cliente (Serviços) do catálogo de venda
(`products`). Ver app/models/service_product.py para o motivo.

Migra os vínculos existentes: para cada `products` referenciado hoje por
`service_card_products`, cria o equivalente em `service_products` (mesmo nome,
mesma categoria) e repõe a FK apontando para ele. Nenhum vínculo é perdido e
nenhuma linha de `products` é alterada ou apagada.

Revision ID: d0e1f2a3b4c5
Revises: c9d0e1f2a3b4
Create Date: 2026-07-18 12:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = 'd0e1f2a3b4c5'
down_revision = 'c9d0e1f2a3b4'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'service_products',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('sku', sa.String(length=100), nullable=True),
        sa.Column('category', sa.String(length=100), nullable=True),
        sa.Column('external_source', sa.String(length=50), nullable=True),
        sa.Column('external_ref', sa.String(length=255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('external_source', 'external_ref',
                            name='unique_service_product_external_ref'),
    )
    op.create_index(op.f('ix_service_products_id'), 'service_products', ['id'])
    op.create_index(op.f('ix_service_products_name'), 'service_products', ['name'])
    op.create_index(op.f('ix_service_products_sku'), 'service_products', ['sku'])
    op.create_index(op.f('ix_service_products_category'), 'service_products', ['category'])
    op.create_index(op.f('ix_service_products_external_source'), 'service_products',
                    ['external_source'])
    op.create_index(op.f('ix_service_products_external_ref'), 'service_products',
                    ['external_ref'])
    op.create_index(op.f('ix_service_products_is_active'), 'service_products', ['is_active'])

    # ── migra os vínculos existentes ──────────────────────────────────────────
    # Cria em service_products o equivalente de cada products hoje referenciado
    # por service_card_products. Marca com external_source='migracao-vendas' para
    # ficar rastreável de onde veio.
    op.execute("""
        INSERT INTO service_products
            (name, description, sku, category, external_source, external_ref,
             is_active, is_deleted, created_at, updated_at)
        SELECT DISTINCT
            p.name, p.description, p.sku, p.category,
            'migracao-vendas', 'product:' || p.id::text,
            true, false, now(), now()
        FROM products p
        WHERE p.id IN (SELECT DISTINCT product_id FROM service_card_products)
    """)

    # Repõe a FK: troca products.id pelo service_products.id correspondente.
    op.drop_constraint('unique_service_card_product', 'service_card_products', type_='unique')
    op.execute("""
        UPDATE service_card_products scp
        SET product_id = sp.id
        FROM service_products sp
        WHERE sp.external_source = 'migracao-vendas'
          AND sp.external_ref = 'product:' || scp.product_id::text
    """)

    # Agora sim, aponta a FK para a tabela nova.
    for fk in sa.inspect(op.get_bind()).get_foreign_keys('service_card_products'):
        if fk['referred_table'] == 'products' and fk['constrained_columns'] == ['product_id']:
            op.drop_constraint(fk['name'], 'service_card_products', type_='foreignkey')
    op.create_foreign_key(
        'fk_service_card_products_service_product', 'service_card_products',
        'service_products', ['product_id'], ['id'], ondelete='CASCADE',
    )
    op.create_unique_constraint(
        'unique_service_card_product', 'service_card_products',
        ['service_card_id', 'product_id'],
    )


def downgrade():
    op.drop_constraint('unique_service_card_product', 'service_card_products', type_='unique')
    op.drop_constraint('fk_service_card_products_service_product', 'service_card_products',
                       type_='foreignkey')

    # Desfaz o repontamento nos vínculos que vieram da migração de Vendas.
    op.execute("""
        UPDATE service_card_products scp
        SET product_id = CAST(split_part(sp.external_ref, ':', 2) AS INTEGER)
        FROM service_products sp
        WHERE sp.id = scp.product_id
          AND sp.external_source = 'migracao-vendas'
    """)

    op.create_foreign_key(
        'service_card_products_product_id_fkey', 'service_card_products',
        'products', ['product_id'], ['id'], ondelete='CASCADE',
    )
    op.create_unique_constraint(
        'unique_service_card_product', 'service_card_products',
        ['service_card_id', 'product_id'],
    )
    op.drop_table('service_products')
