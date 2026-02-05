-- Script para adicionar a role SDR no banco de dados
-- Execute este script no seu banco de dados PostgreSQL

-- Adiciona a role SDR (id = 4)
INSERT INTO roles (id, name, description, permissions, created_at, updated_at)
VALUES (
    4,
    'sdr',
    'SDR - Sales Development Representative',
    '{"can_view_own_cards": true, "can_create_cards": true, "can_edit_own_cards": true, "can_view_reports": false}',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Verifica se a role foi adicionada
SELECT * FROM roles WHERE id = 4;
