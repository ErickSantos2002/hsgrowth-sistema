"""
Script para limpar e filtrar CSV de deals do Pipedrive
Mantém apenas deals do funil "Novas Vendas" e colunas relevantes
"""
import pandas as pd
import sys
from datetime import datetime

def clean_deals_csv():
    """Limpa e filtra o CSV de deals"""

    print("Lendo arquivo CSV...")
    df = pd.read_csv('deals-21427617-53.csv')
    print(f"Total de deals lidos: {len(df)}")

    # Filtrar apenas "Novas Vendas"
    print("\nFiltrando apenas funil 'Novas Vendas'...")
    df_filtered = df[df['Funil'] == 'Novas Vendas'].copy()
    print(f"Deals filtrados: {len(df_filtered)}")

    # Selecionar apenas colunas relevantes para o sistema
    colunas_relevantes = [
        'ID',                                    # ID original do Pipedrive
        'Título',                                # title
        'Proprietário',                          # assigned_to (nome)
        'Valor',                                 # value
        'Organização',                           # client (nome)
        'ID da organização',                     # client_id do Pipedrive
        'Pessoa de contato',                     # person (nome)
        'ID da pessoa de contato',               # person_id do Pipedrive
        'Etapa',                                 # list (etapa/lista)
        'Status',                                # Status (Ganho/Perdido/Aberto)
        'Negócio criado em',                     # created_at
        'Ganho em',                              # won_at
        'Data de perda',                         # lost_at
        'Motivo da perda',                       # loss_reason
        'Data de fechamento esperada',           # due_date
        '[IC] SDR Responsável',                  # sdr_id (nome do SDR)
        '[SDR] Canal de Aquisição',              # acquisition_channel
        '[SDR] Principal Necessidade Mapeada',   # Pode ser útil para notes
        'CNPJ',                                  # Para vincular com client
        'Site',                                  # Website do client
    ]

    # Verificar quais colunas existem
    colunas_existentes = [col for col in colunas_relevantes if col in df_filtered.columns]
    colunas_faltando = [col for col in colunas_relevantes if col not in df_filtered.columns]

    if colunas_faltando:
        print(f"\nAVISO - Colunas nao encontradas: {colunas_faltando}")

    # Selecionar apenas colunas existentes
    df_clean = df_filtered[colunas_existentes].copy()

    # Renomear colunas para inglês (padrão do sistema)
    rename_map = {
        'ID': 'pipedrive_deal_id',
        'Título': 'title',
        'Proprietário': 'owner_name',
        'Valor': 'value',
        'Organização': 'organization_name',
        'ID da organização': 'pipedrive_org_id',
        'Pessoa de contato': 'person_name',
        'ID da pessoa de contato': 'pipedrive_person_id',
        'Etapa': 'stage',
        'Status': 'status',
        'Negócio criado em': 'created_at',
        'Ganho em': 'won_at',
        'Data de perda': 'lost_at',
        'Motivo da perda': 'loss_reason',
        'Data de fechamento esperada': 'due_date',
        '[IC] SDR Responsável': 'sdr_name',
        '[SDR] Canal de Aquisição': 'acquisition_channel',
        '[SDR] Principal Necessidade Mapeada': 'main_need',
        'CNPJ': 'cnpj',
        'Site': 'website',
    }

    df_clean = df_clean.rename(columns=rename_map)

    # Limpeza de dados
    print("\nLimpando dados...")

    # Substituir valores vazios por None/NaN
    df_clean = df_clean.replace('', pd.NA)

    # Converter valor para float (remover vírgulas se houver)
    if 'value' in df_clean.columns:
        df_clean['value'] = pd.to_numeric(df_clean['value'], errors='coerce')

    # Normalizar status
    if 'status' in df_clean.columns:
        status_map = {
            'Ganho': 'won',
            'Perdido': 'lost',
            'Aberto': 'open',
        }
        df_clean['status'] = df_clean['status'].map(status_map).fillna('open')

    # Estatísticas do dataset limpo
    print("\nEstatisticas do dataset limpo:")
    print(f"Total de deals: {len(df_clean)}")
    print(f"\nDistribuicao por Status:")
    print(df_clean['status'].value_counts())
    print(f"\nDistribuicao por Etapa:")
    print(df_clean['stage'].value_counts())

    if 'sdr_name' in df_clean.columns:
        print(f"\nDeals com SDR: {df_clean['sdr_name'].notna().sum()}")

    if 'acquisition_channel' in df_clean.columns:
        print(f"\nDeals com Canal de Aquisicao: {df_clean['acquisition_channel'].notna().sum()}")
        print(f"\nDistribuicao por Canal:")
        print(df_clean['acquisition_channel'].value_counts())

    # Verificar valores nulos
    print(f"\nValores nulos por coluna:")
    null_counts = df_clean.isnull().sum()
    for col, count in null_counts.items():
        if count > 0:
            percentage = (count / len(df_clean)) * 100
            print(f"  {col}: {count} ({percentage:.1f}%)")

    # Salvar CSV limpo
    output_file = 'deals_novas_vendas_clean.csv'
    print(f"\nSalvando CSV limpo: {output_file}")
    df_clean.to_csv(output_file, index=False)
    print(f"Arquivo salvo com sucesso!")

    # Mostrar preview
    print(f"\nPreview dos primeiros 3 deals:")
    print(df_clean.head(3).to_string())

    return df_clean

if __name__ == "__main__":
    try:
        df_result = clean_deals_csv()
        print(f"\nProcesso concluido com sucesso!")
        print(f"Arquivo gerado: deals_novas_vendas_clean.csv")
        print(f"Total de deals: {len(df_result)}")
    except Exception as e:
        print(f"\nERRO: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
