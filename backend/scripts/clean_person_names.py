"""
Script para limpar nomes inválidos de pessoas.

Corrige:
- Nomes que são emails (extrai nome do email)
- Nomes genéricos (a, VER, Inicial, ., -)
- Nomes muito curtos ou inválidos

Execução:
    python scripts/clean_person_names.py
"""
import sys
import os
import re
from pathlib import Path

# Adiciona o diretório raiz ao path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.session import SessionLocal
from app.models.person import Person
from sqlalchemy import or_


def extract_name_from_email(email: str) -> str:
    """
    Extrai um nome apresentável de um email.
    Ex: joao.silva@empresa.com -> João Silva
    """
    if not email or '@' not in email:
        return None

    # Pega a parte antes do @
    local_part = email.split('@')[0]

    # Remove números e caracteres especiais comuns
    local_part = re.sub(r'[0-9_\-.]', ' ', local_part)

    # Capitaliza cada palavra
    name = ' '.join(word.capitalize() for word in local_part.split() if word)

    if len(name) < 2:
        return None

    return name


def clean_person_names():
    """
    Limpa nomes inválidos de pessoas.
    """
    db = SessionLocal()

    try:
        print("\n🔍 Buscando pessoas com nomes inválidos...")

        # Nomes inválidos/genéricos comuns
        invalid_names = [
            '.', '-', 'a', 'A', 'aa', 'aaa', 'aaaa',
            'ver', 'VER', 'Ver', 'VERI', 'VERIFCRA',
            'inicial', 'Inicial', 'INICIAL', 'Iniciais',
            'teste', 'Teste', 'TESTE',
            'SEG', 'seg', 'Seg',
            've', 'VE'
        ]

        # Buscar pessoas com nomes inválidos
        persons = db.query(Person).filter(
            or_(
                Person.name.in_(invalid_names),
                Person.name.like('%@%'),  # Nome é um email
                Person.name.like('VER%'),
            )
        ).all()

        print(f"📊 Encontradas {len(persons)} pessoas para limpar\n")

        fixed_count = 0
        skipped_count = 0

        for person in persons:
            old_name = person.name
            new_name = None

            # Caso 1: Nome é um email
            if '@' in old_name:
                new_name = extract_name_from_email(old_name)
                if not new_name and person.email_commercial:
                    new_name = extract_name_from_email(person.email_commercial)
                elif not new_name and person.email:
                    new_name = extract_name_from_email(person.email)

            # Caso 2: Nome genérico - tentar extrair de email
            elif old_name in invalid_names or old_name.startswith('VER'):
                # Tentar extrair de emails
                for email_field in [person.email_commercial, person.email, person.email_personal]:
                    if email_field:
                        new_name = extract_name_from_email(email_field)
                        if new_name:
                            break

                # Se não conseguiu do email, usar o position
                if not new_name and person.position:
                    new_name = person.position.strip()
                    if len(new_name) < 3:
                        new_name = None

            # Se não conseguiu nenhum nome válido, usar genérico
            if not new_name:
                new_name = "Contato sem nome"

            # Atualizar se o nome mudou
            if new_name != old_name:
                person.name = new_name
                fixed_count += 1

                if fixed_count <= 10:  # Mostrar apenas os primeiros 10
                    print(f"  ✓ ID {person.id}: \"{old_name}\" → \"{new_name}\"")
            else:
                skipped_count += 1

        # Salvar alterações
        db.commit()

        print(f"\n✅ Limpeza concluída!")
        print(f"  Nomes corrigidos: {fixed_count}")
        print(f"  Nomes ignorados: {skipped_count}")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Erro durante a limpeza: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("\n" + "="*60)
    print("LIMPEZA DE NOMES DE PESSOAS")
    print("="*60)

    clean_person_names()

    print("\n" + "="*60)
