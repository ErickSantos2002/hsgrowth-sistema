import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.db.session import SessionLocal
from app.models.board import Board
from app.models.list import List
from app.models.user import User

db = SessionLocal()

print('BOARDS:')
boards = db.query(Board).order_by(Board.id).all()
for b in boards:
    print(f'  {b.id}: {b.name}')

print('\nLISTAS (IDs 22 e 30):')
lists = db.query(List).filter(List.id.in_([22, 30])).all()
for l in lists:
    print(f'  {l.id}: {l.name} (Board: {l.board_id})')

if not lists:
    print('  AVISO: Listas 22 e 30 nao encontradas!')
    print('\n  Mostrando todas as listas:')
    all_lists = db.query(List).order_by(List.board_id, List.position).all()
    for l in all_lists:
        print(f'    {l.id}: {l.name} (Board: {l.board_id})')

print('\nUSUARIOS:')
users = db.query(User).order_by(User.id).all()
for u in users:
    print(f'  {u.id}: {u.name} (role: {u.role})')

db.close()
