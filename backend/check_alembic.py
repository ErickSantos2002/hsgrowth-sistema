from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    result = conn.execute(text('SELECT * FROM alembic_version'))
    for row in result:
        print(f"Current alembic version: {row[0]}")
