#!/bin/sh
# Script de inicializaÃ§Ã£o do container Docker

set -e  # Para execuÃ§Ã£o ao encontrar erro

echo "============================================"
echo "HSGrowth CRM - Inicializando..."
echo "============================================"

# Aguarda PostgreSQL estar pronto
echo "Aguardando PostgreSQL..."
export PGPASSWORD=$DB_PASSWORD
while ! pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER > /dev/null 2>&1; do
    echo "PostgreSQL nÃ£o estÃ¡ pronto - aguardando..."
    sleep 2
done
echo "âœ“ PostgreSQL estÃ¡ pronto!"

# Aguarda Redis estar pronto (se configurado e habilitado)
if [ "$ENABLE_REDIS_CHECK" = "true" ] && [ ! -z "$REDIS_HOST" ]; then
    echo "Aguardando Redis..."
    timeout=10
    redis_ready=false
    while [ $timeout -gt 0 ]; do
        if redis-cli -h $REDIS_HOST -p $REDIS_PORT ping > /dev/null 2>&1; then
            echo "âœ" Redis estÃ¡ pronto!"
            redis_ready=true
            break
        fi
        sleep 1
        timeout=$((timeout-1))
    done

    if [ "$redis_ready" = "false" ]; then
        echo "âš  Redis nÃ£o respondeu em 10s - continuando sem Redis (funcionalidades de cache podem nÃ£o funcionar)"
    fi
else
    echo "â„¹ VerificaÃ§Ã£o do Redis desabilitada (ENABLE_REDIS_CHECK nÃ£o estÃ¡ true)"
fi

# Executa migrations do Alembic
echo "Executando migrations do banco de dados..."
alembic upgrade head
echo "âœ“ Migrations concluÃ­das!"

# Se for ambiente de desenvolvimento, pode rodar seed (opcional)
if [ "$ENVIRONMENT" = "development" ] && [ "$RUN_SEED" = "true" ]; then
    echo "Executando seed do banco de dados..."
    python scripts/seed_database.py || echo "âš  Seed falhou ou jÃ¡ foi executado"
fi

echo "============================================"
echo "Iniciando servidor Uvicorn..."
echo "Environment: $ENVIRONMENT"
echo "Host: $HOST"
echo "Port: $PORT"
echo "============================================"

# Inicia aplicaÃ§Ã£o com Uvicorn
# Usa diferentes configuraÃ§Ãµes baseado no environment
# UVICORN_LOG_LEVEL Ã© definido no docker-compose.yml (em minÃºsculas para uvicorn)

if [ "$ENVIRONMENT" = "production" ]; then
    # ProduÃ§Ã£o: mÃºltiplos workers, sem reload
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
