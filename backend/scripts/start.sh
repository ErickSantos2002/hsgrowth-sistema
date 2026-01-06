#!/bin/bash
# Script de inicialização do container Docker

set -e  # Para execução ao encontrar erro

echo "============================================"
echo "HSGrowth CRM - Inicializando..."
echo "============================================"

# Aguarda PostgreSQL estar pronto
echo "Aguardando PostgreSQL..."
export PGPASSWORD=$DB_PASSWORD
while ! pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER > /dev/null 2>&1; do
    echo "PostgreSQL não está pronto - aguardando..."
    sleep 2
done
echo "✓ PostgreSQL está pronto!"

# Aguarda Redis estar pronto (se configurado)
if [ ! -z "$REDIS_HOST" ]; then
    echo "Aguardando Redis..."
    timeout=30
    while [ $timeout -gt 0 ]; do
        if redis-cli -h $REDIS_HOST -p $REDIS_PORT ping > /dev/null 2>&1; then
            echo "✓ Redis está pronto!"
            break
        fi
        echo "Redis não está pronto - aguardando..."
        sleep 2
        timeout=$((timeout-2))
    done
fi

# Executa migrations do Alembic
echo "Executando migrations do banco de dados..."
alembic upgrade head
echo "✓ Migrations concluídas!"

# Se for ambiente de desenvolvimento, pode rodar seed (opcional)
if [ "$ENVIRONMENT" = "development" ] && [ "$RUN_SEED" = "true" ]; then
    echo "Executando seed do banco de dados..."
    python scripts/seed_database.py || echo "⚠ Seed falhou ou já foi executado"
fi

echo "============================================"
echo "Iniciando servidor Uvicorn..."
echo "Environment: $ENVIRONMENT"
echo "Host: $HOST"
echo "Port: $PORT"
echo "============================================"

# Inicia aplicação com Uvicorn
# Usa diferentes configurações baseado no environment
# UVICORN_LOG_LEVEL é definido no docker-compose.yml (em minúsculas para uvicorn)

if [ "$ENVIRONMENT" = "production" ]; then
    # Produção: múltiplos workers, sem reload
    exec uvicorn app.main:app \
        --host $HOST \
        --port $PORT \
        --workers ${WORKERS:-4} \
        --log-level ${UVICORN_LOG_LEVEL:-info} \
        --no-access-log \
        --proxy-headers \
        --forwarded-allow-ips='*'
else
    # Desenvolvimento: 1 worker, com reload
    exec uvicorn app.main:app \
        --host $HOST \
        --port $PORT \
        --reload \
        --log-level ${UVICORN_LOG_LEVEL:-info}
fi
