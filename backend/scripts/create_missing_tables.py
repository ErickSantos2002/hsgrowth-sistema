#!/usr/bin/env python3
"""
Script para criar tabelas persons e leads manualmente
"""

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy import text
from app.db.session import engine

def create_tables():
    """Cria as tabelas persons e leads"""

    print("Criando tabela persons...")

    with engine.connect() as conn:
        # Cria tabela persons
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS persons (
                id SERIAL PRIMARY KEY,
                first_name VARCHAR(100),
                last_name VARCHAR(100),
                name VARCHAR(200) NOT NULL,
                email VARCHAR(255),
                phone VARCHAR(50),
                position VARCHAR(200),
                linkedin VARCHAR(500),
                organization_id INTEGER REFERENCES clients(id),
                owner_id INTEGER REFERENCES users(id),
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                pipedrive_id INTEGER,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
            );
        """))

        # Índices persons
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_persons_id ON persons(id);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_persons_name ON persons(name);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_persons_email ON persons(email);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_persons_pipedrive_id ON persons(pipedrive_id);"))

        conn.commit()
        print("Tabela persons criada!")

        # Cria tabela leads
        print("\nCriando tabela leads...")

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS leads (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                value FLOAT,
                currency VARCHAR(10) NOT NULL DEFAULT 'BRL',
                source VARCHAR(100),
                owner_id INTEGER REFERENCES users(id),
                person_id INTEGER REFERENCES persons(id),
                organization_id INTEGER REFERENCES clients(id),
                board_id INTEGER REFERENCES boards(id),
                list_id INTEGER REFERENCES lists(id),
                status VARCHAR(50) NOT NULL DEFAULT 'not_viewed',
                is_archived BOOLEAN NOT NULL DEFAULT FALSE,
                archived_at TIMESTAMP WITH TIME ZONE,
                expected_close_date TIMESTAMP WITH TIME ZONE,
                custom_fields JSONB,
                pipedrive_id VARCHAR(100),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
            );
        """))

        # Índices leads
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_leads_id ON leads(id);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_leads_title ON leads(title);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_leads_pipedrive_id ON leads(pipedrive_id);"))

        conn.commit()
        print("Tabela leads criada!")

        print("\n✅ Todas as tabelas criadas com sucesso!")

if __name__ == "__main__":
    create_tables()
