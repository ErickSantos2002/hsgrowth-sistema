"""Blueprint da Consultora - Ajustes em Persons, Clients e Cards

Revision ID: blueprint_consultora_2026
Revises: d0a5404c934d
Create Date: 2026-02-05 12:30:00.000000

Adiciona campos solicitados pela consultora de vendas para adequar o sistema
ao blueprint criado para otimização do processo de vendas.

Tabelas afetadas:
- persons: Adiciona campo 'area' (departamento/área do contato)
- clients: Adiciona 7 campos (cnae, linkedin_url, relationship_type,
  commercial_activity, sector, employee_count, annual_revenue)
- cards: Adiciona 11 campos (sdr_id, datas de entrada nos boards,
  tipo de negócio, canais de aquisição, UTM, motivo de perda, etc)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'blueprint_consultora_2026'
down_revision: Union[str, None] = 'd0a5404c934d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Aplica as mudanças do blueprint da consultora.
    """

    # ========================================================================
    # 1. TABELA PERSONS - Adicionar campo 'area'
    # ========================================================================
    print("Adicionando campo 'area' na tabela persons...")
    op.add_column('persons', sa.Column('area', sa.String(length=200), nullable=True))

    # ========================================================================
    # 2. TABELA CLIENTS - Adicionar 7 campos
    # ========================================================================
    print("Adicionando campos na tabela clients...")

    # CNAE (Classificação Nacional de Atividades Econômicas)
    op.add_column('clients', sa.Column('cnae', sa.String(length=20), nullable=True))

    # LinkedIn da empresa
    op.add_column('clients', sa.Column('linkedin_url', sa.String(length=500), nullable=True))

    # Tipo de relacionamento (Cliente, Fornecedor, Lead, etc)
    op.add_column('clients', sa.Column('relationship_type', sa.String(length=50), nullable=True))

    # Atividade comercial (Ativo, Dormente, Inativo)
    op.add_column('clients', sa.Column('commercial_activity', sa.String(length=50), nullable=True))

    # Setor/Indústria
    op.add_column('clients', sa.Column('sector', sa.String(length=100), nullable=True))

    # Número de colaboradores (faixa)
    op.add_column('clients', sa.Column('employee_count', sa.String(length=50), nullable=True))

    # Faturamento/Receita anual (faixa)
    op.add_column('clients', sa.Column('annual_revenue', sa.String(length=50), nullable=True))

    # ========================================================================
    # 3. TABELA CARDS - Adicionar 11 campos
    # ========================================================================
    print("Adicionando campos na tabela cards...")

    # SDR responsável (Foreign Key para users)
    op.add_column('cards', sa.Column('sdr_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_cards_sdr_id_users',
        'cards', 'users',
        ['sdr_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_index('ix_cards_sdr_id', 'cards', ['sdr_id'])

    # Datas de entrada em cada board (Prospecção, Aquisição, Expansão)
    op.add_column('cards', sa.Column('prospection_entry_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('cards', sa.Column('acquisition_entry_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('cards', sa.Column('expansion_entry_date', sa.DateTime(timezone=True), nullable=True))

    # Tipo de negócio (Nova Venda, Cross Sell, Up Sell)
    op.add_column('cards', sa.Column('deal_type', sa.String(length=100), nullable=True))

    # Canal de aquisição (Inbound, Outbound, Indicação, etc)
    op.add_column('cards', sa.Column('acquisition_channel', sa.String(length=100), nullable=True))

    # Detalhamento do canal de aquisição
    op.add_column('cards', sa.Column('acquisition_channel_detail', sa.String(length=200), nullable=True))

    # Parâmetros UTM (tracking de marketing)
    op.add_column('cards', sa.Column('utm_params', sa.String(length=500), nullable=True))

    # Motivo da perda (quando card é perdido)
    op.add_column('cards', sa.Column('loss_reason', sa.String(length=200), nullable=True))

    # Se tem implementação
    op.add_column('cards', sa.Column('has_implementation', sa.Boolean(), nullable=True))

    # Se tem pessoas para manusear
    op.add_column('cards', sa.Column('has_personnel', sa.Boolean(), nullable=True))

    print("Migration concluída com sucesso!")


def downgrade() -> None:
    """
    Reverte as mudanças do blueprint da consultora.
    """

    # ========================================================================
    # REVERTER CARDS
    # ========================================================================
    print("Revertendo mudanças na tabela cards...")

    op.drop_column('cards', 'has_personnel')
    op.drop_column('cards', 'has_implementation')
    op.drop_column('cards', 'loss_reason')
    op.drop_column('cards', 'utm_params')
    op.drop_column('cards', 'acquisition_channel_detail')
    op.drop_column('cards', 'acquisition_channel')
    op.drop_column('cards', 'deal_type')
    op.drop_column('cards', 'expansion_entry_date')
    op.drop_column('cards', 'acquisition_entry_date')
    op.drop_column('cards', 'prospection_entry_date')

    op.drop_index('ix_cards_sdr_id', table_name='cards')
    op.drop_constraint('fk_cards_sdr_id_users', 'cards', type_='foreignkey')
    op.drop_column('cards', 'sdr_id')

    # ========================================================================
    # REVERTER CLIENTS
    # ========================================================================
    print("Revertendo mudanças na tabela clients...")

    op.drop_column('clients', 'annual_revenue')
    op.drop_column('clients', 'employee_count')
    op.drop_column('clients', 'sector')
    op.drop_column('clients', 'commercial_activity')
    op.drop_column('clients', 'relationship_type')
    op.drop_column('clients', 'linkedin_url')
    op.drop_column('clients', 'cnae')

    # ========================================================================
    # REVERTER PERSONS
    # ========================================================================
    print("Revertendo mudanças na tabela persons...")

    op.drop_column('persons', 'area')

    print("Rollback concluído com sucesso!")
