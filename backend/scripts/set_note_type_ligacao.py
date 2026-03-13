"""
Script para marcar todas as anotações criadas pelo usuário 'integracao'
com note_type = 'ligacao'.

Uso:
    python scripts/set_note_type_ligacao.py
    python scripts/set_note_type_ligacao.py --dry-run  (apenas visualiza, sem alterar)
"""
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.session import SessionLocal
from app.models.card_note import CardNote
from app.models.user import User

# Verifica se está em modo simulação (sem alterações no banco)
dry_run = "--dry-run" in sys.argv

db = SessionLocal()

try:
    # Busca o usuário 'integracao' pelo nome ou email
    user = (
        db.query(User)
        .filter(
            (User.name.ilike("%integracao%")) | (User.email.ilike("%integracao%"))
        )
        .first()
    )

    if not user:
        print("ERRO: Usuario 'integracao' nao encontrado no banco.")
        print("\nUsuarios cadastrados:")
        all_users = db.query(User).order_by(User.id).all()
        for u in all_users:
            print(f"  id={u.id} | nome={u.name} | email={u.email}")
        sys.exit(1)

    print(f"Usuario encontrado: id={user.id} | nome={user.name} | email={user.email}")

    # Busca todas as notas desse usuário que ainda não têm tipo definido
    notes_sem_tipo = (
        db.query(CardNote)
        .filter(CardNote.user_id == user.id, CardNote.note_type == None)
        .all()
    )

    # Conta também as que já estão marcadas (para informação)
    notes_ja_marcadas = (
        db.query(CardNote)
        .filter(CardNote.user_id == user.id, CardNote.note_type == "ligacao")
        .count()
    )

    print(f"\nAnotacoes encontradas:")
    print(f"  Sem tipo (serao atualizadas): {len(notes_sem_tipo)}")
    print(f"  Ja marcadas como 'ligacao':   {notes_ja_marcadas}")

    if not notes_sem_tipo:
        print("\nNada a fazer. Todas as anotacoes ja estao marcadas.")
        sys.exit(0)

    if dry_run:
        print("\n[DRY-RUN] Nenhuma alteracao feita. Rode sem --dry-run para aplicar.")
        sys.exit(0)

    # Aplica a atualização
    for note in notes_sem_tipo:
        note.note_type = "ligacao"

    db.commit()

    print(f"\nConcluido! {len(notes_sem_tipo)} anotacoes atualizadas para note_type='ligacao'.")

except Exception as e:
    db.rollback()
    print(f"\nERRO: {e}")
    sys.exit(1)

finally:
    db.close()
