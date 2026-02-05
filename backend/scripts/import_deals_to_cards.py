"""
Script para importar deals do CSV limpo para o sistema como cards
- Usa pipedrive_deal_id para evitar duplicados
- Mapeia etapas para listas específicas
"""
import sys
import os
import pandas as pd
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Adicionar path do app ao PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.models.card import Card
from app.models.client import Client
from app.models.person import Person
from app.models.user import User
from app.db.session import SessionLocal

# Mapeamento de etapas para listas
# Lista 22: Lead Novo (Board 6 - Prospecção)
# Lista 30: Diagnóstico e Proposta (Board 7 - Aquisição)
STAGE_TO_LIST_MAP = {
    'Oportunidade RD': 22,
    'Oportunidades 2026': 22,
    # Demais etapas vão para lista 30
    'FECHAMENTO': 30,
    'DIAGNÓSTICO & PROPOSTA': 30,
    'NEGOCIAÇÃO': 30,
    'Revenda': 30,
}

# Mapeamento de lista para board (necessário para consistência)
LIST_TO_BOARD_MAP = {
    22: 6,  # Lead Novo → Board Prospecção
    30: 7,  # Diagnóstico e Proposta → Board Aquisição
}

# Mapeamento de proprietários (nomes do Pipedrive para IDs do sistema)
OWNER_NAME_TO_ID = {
    'Gislayne': 2,  # Gislayne Nunes
    'Adriana Oliveira': 3,
    'Eduardo Luna': 4,
    'Sandra Silva': 5,
    'Lara Leite': 6,
    'Nicholson': 1,  # Admin (quando não encontrar)
}

def get_or_create_client(db, org_name, pipedrive_org_id, cnpj=None):
    """Busca ou cria um cliente baseado no nome da organização"""
    if not org_name or pd.isna(org_name):
        return None

    # Buscar por pipedrive_id primeiro
    if pipedrive_org_id and not pd.isna(pipedrive_org_id):
        client = db.query(Client).filter(
            Client.source == 'pipedrive',
            Client.document == str(int(pipedrive_org_id))  # Usando document para guardar pipedrive_id temporariamente
        ).first()
        if client:
            return client.id

    # Buscar por nome
    client = db.query(Client).filter(Client.name == org_name).first()
    if client:
        return client.id

    # Criar novo cliente
    try:
        new_client = Client(
            name=org_name,
            company_name=org_name,
            document=cnpj if cnpj and not pd.isna(cnpj) else None,
            source='pipedrive',
            is_active=True
        )
        db.add(new_client)
        db.flush()
        return new_client.id
    except Exception as e:
        print(f"  AVISO: Erro ao criar cliente '{org_name}': {e}")
        db.rollback()
        return None

def get_or_create_person(db, person_name, pipedrive_person_id, client_id=None):
    """Busca ou cria uma pessoa baseada no nome"""
    if not person_name or pd.isna(person_name):
        return None

    # Buscar por pipedrive_id primeiro (usando campo pipedrive_id do Person)
    if pipedrive_person_id and not pd.isna(pipedrive_person_id):
        person = db.query(Person).filter(
            Person.pipedrive_id == int(pipedrive_person_id)
        ).first()
        if person:
            return person.id

    # Buscar por nome
    person = db.query(Person).filter(Person.name == person_name).first()
    if person:
        return person.id

    # Criar nova pessoa
    try:
        new_person = Person(
            name=person_name,
            organization_id=client_id,
            pipedrive_id=int(pipedrive_person_id) if pipedrive_person_id and not pd.isna(pipedrive_person_id) else None,
            is_active=True
        )
        db.add(new_person)
        db.flush()
        return new_person.id
    except Exception as e:
        print(f"  AVISO: Erro ao criar pessoa '{person_name}': {e}")
        db.rollback()
        return None

def get_user_id_by_name(db, owner_name):
    """Busca ID do usuário pelo nome"""
    if not owner_name or pd.isna(owner_name):
        return None

    # Tentar mapeamento direto
    if owner_name in OWNER_NAME_TO_ID:
        return OWNER_NAME_TO_ID[owner_name]

    # Buscar no banco
    user = db.query(User).filter(User.name.ilike(f"%{owner_name}%")).first()
    if user:
        return user.id

    return None

def parse_datetime(date_str):
    """Converte string de data para datetime"""
    if not date_str or pd.isna(date_str):
        return None

    try:
        return datetime.strptime(str(date_str), '%Y-%m-%d %H:%M:%S')
    except:
        try:
            return datetime.strptime(str(date_str), '%Y-%m-%d')
        except:
            return None

def import_deals():
    """Importa deals do CSV para o sistema"""

    print("="*80)
    print("IMPORTACAO DE DEALS PARA CARDS")
    print("="*80)

    # Ler CSV limpo
    print("\nLendo CSV limpo...")
    script_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(script_dir, 'deals_novas_vendas_clean.csv')
    df = pd.read_csv(csv_path)
    print(f"Total de deals no CSV: {len(df)}")

    # Conectar ao banco
    print("\nConectando ao banco de dados...")
    db = SessionLocal()

    try:
        # Estatísticas
        stats = {
            'total': len(df),
            'imported': 0,
            'skipped_duplicate': 0,
            'skipped_error': 0,
            'clients_created': 0,
            'persons_created': 0,
        }

        print("\nIniciando importacao...")
        print("-"*80)

        for idx, row in df.iterrows():
            pipedrive_deal_id = row['pipedrive_deal_id']

            # Verificar se já existe (por título e data de criação)
            created_at = parse_datetime(row.get('created_at'))
            existing_card = db.query(Card).filter(
                Card.title == row['title'],
                Card.created_at == created_at
            ).first()

            if existing_card:
                stats['skipped_duplicate'] += 1
                if idx % 100 == 0:
                    print(f"[{idx+1}/{len(df)}] SKIP: Deal {pipedrive_deal_id} ja existe")
                continue

            try:
                # Mapear status primeiro (prioridade sobre etapa)
                status = row.get('status', 'open')

                if status == 'won':
                    # Deals ganhos → Lista 32 (Negócio Ganho)
                    list_id = 32
                    board_id = 7
                elif status == 'lost':
                    # Deals perdidos → Lista 33 (Negócio Perdido)
                    list_id = 33
                    board_id = 7
                else:
                    # Deals abertos → Mapear por etapa
                    stage = row.get('stage', '')
                    list_id = STAGE_TO_LIST_MAP.get(stage, 30)  # Default: lista 30
                    board_id = LIST_TO_BOARD_MAP.get(list_id, 7)  # Board correspondente à lista

                # Buscar/criar cliente
                client_id = None
                if row.get('organization_name') and not pd.isna(row['organization_name']):
                    client_id = get_or_create_client(
                        db,
                        row['organization_name'],
                        row.get('pipedrive_org_id'),
                        row.get('cnpj')
                    )
                    if client_id and db.query(Client).filter(Client.id == client_id).first().created_at == db.query(Client).filter(Client.id == client_id).first().updated_at:
                        stats['clients_created'] += 1

                # Buscar/criar pessoa
                person_id = None
                if row.get('person_name') and not pd.isna(row['person_name']):
                    person_id = get_or_create_person(
                        db,
                        row['person_name'],
                        row.get('pipedrive_person_id'),
                        client_id
                    )
                    if person_id and db.query(Person).filter(Person.id == person_id).first().created_at == db.query(Person).filter(Person.id == person_id).first().updated_at:
                        stats['persons_created'] += 1

                # Buscar usuário (owner)
                assigned_to_id = get_user_id_by_name(db, row.get('owner_name'))

                # Calcular is_won baseado no status
                is_won_value = 1 if status == 'won' else (-1 if status == 'lost' else 0)

                # Criar card
                new_card = Card(
                    title=row['title'],
                    list_id=list_id,
                    client_id=client_id,
                    person_id=person_id,
                    assigned_to_id=assigned_to_id,
                    value=float(row['value']) if row.get('value') and not pd.isna(row['value']) else 0.0,
                    is_won=is_won_value,  # 0=aberto, 1=ganho, -1=perdido
                    created_at=created_at,
                    due_date=parse_datetime(row.get('due_date')),
                    loss_reason=row.get('loss_reason') if not pd.isna(row.get('loss_reason')) else None,
                    acquisition_channel=row.get('acquisition_channel') if not pd.isna(row.get('acquisition_channel')) else None,
                    position=idx,  # Usar índice como posição inicial
                    contact_info={
                        'pipedrive_deal_id': pipedrive_deal_id,  # Guardar ID do Pipedrive aqui
                        'imported_at': datetime.now().isoformat(),
                        'source': 'csv_import'
                    }
                )

                db.add(new_card)
                db.flush()

                stats['imported'] += 1

                if (idx + 1) % 100 == 0:
                    print(f"[{idx+1}/{len(df)}] Importados: {stats['imported']} | Duplicados: {stats['skipped_duplicate']}")
                    db.commit()  # Commit a cada 100 deals

            except Exception as e:
                print(f"[{idx+1}/{len(df)}] ERRO ao importar deal {pipedrive_deal_id}: {e}")
                stats['skipped_error'] += 1
                db.rollback()
                continue

        # Commit final
        db.commit()

        # Relatório final
        print("\n" + "="*80)
        print("RELATORIO FINAL")
        print("="*80)
        print(f"Total de deals no CSV: {stats['total']}")
        print(f"Importados com sucesso: {stats['imported']}")
        print(f"Duplicados (ignorados): {stats['skipped_duplicate']}")
        print(f"Erros: {stats['skipped_error']}")
        print(f"Clientes criados: {stats['clients_created']}")
        print(f"Pessoas criadas: {stats['persons_created']}")
        print("="*80)

        return stats

    except Exception as e:
        print(f"\nERRO CRITICO: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        return None
    finally:
        db.close()

if __name__ == "__main__":
    try:
        result = import_deals()
        if result:
            print("\nProcesso concluido!")
            sys.exit(0)
        else:
            print("\nProcesso falhou!")
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n\nImportacao cancelada pelo usuario.")
        sys.exit(1)
    except Exception as e:
        print(f"\nERRO: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
