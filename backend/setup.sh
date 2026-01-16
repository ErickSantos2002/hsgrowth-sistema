#!/bin/bash
# Script de setup automático do HSGrowth CRM Backend
# Uso: ./setup.sh

set -e

echo "============================================"
echo "🚀 HSGrowth CRM - Setup Automático"
echo "============================================"
echo ""

# Verifica se Docker está rodando
if ! docker info > /dev/null 2>&1; then
    echo "❌ Erro: Docker não está rodando!"
    echo "Por favor, inicie o Docker Desktop e tente novamente."
    exit 1
fi
echo "✅ Docker está rodando"

# Verifica se arquivo .env.local existe
if [ ! -f ".env.local" ]; then
    echo "⚠️  Arquivo .env.local não encontrado"

    if [ -f ".env.example" ]; then
        echo "📋 Criando .env.local a partir de .env.example..."
        cp .env.example .env.local
        echo "✅ Arquivo .env.local criado!"
        echo ""
        echo "⚠️  IMPORTANTE: Edite o arquivo .env.local com suas credenciais reais!"
        echo "Principalmente:"
        echo "  - DATABASE_URL"
        echo "  - DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME"
        echo "  - JWT_SECRET"
        echo ""
        read -p "Pressione ENTER depois de editar o .env.local..."
    else
        echo "❌ Erro: .env.example não encontrado!"
        echo "Crie um arquivo .env.local manualmente com as configurações necessárias."
        exit 1
    fi
else
    echo "✅ Arquivo .env.local encontrado"
fi

# Verifica permissões do start.sh
if [ -f "scripts/start.sh" ]; then
    if [ ! -x "scripts/start.sh" ]; then
        echo "🔧 Dando permissão de execução para start.sh..."
        chmod +x scripts/start.sh
        echo "✅ Permissões configuradas"
    else
        echo "✅ Permissões do start.sh OK"
    fi
else
    echo "⚠️  scripts/start.sh não encontrado (será criado no build)"
fi

# Verifica se portas estão livres
echo ""
echo "🔍 Verificando portas..."

# Porta 8000 (API)
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1 || netstat -ano 2>/dev/null | grep -q ":8000"; then
    echo "⚠️  Porta 8000 está ocupada!"
    echo "Deseja parar o processo e continuar? (s/n)"
    read -r resposta
    if [ "$resposta" = "s" ] || [ "$resposta" = "S" ]; then
        echo "Tentando liberar porta 8000..."
        # Tenta parar containers antigos
        docker stop hsgrowth-api-local 2>/dev/null || true
    else
        echo "❌ Abortado. Libere a porta 8000 e tente novamente."
        exit 1
    fi
fi

# Porta 6379 (Redis)
if lsof -Pi :6379 -sTCP:LISTEN -t >/dev/null 2>&1 || netstat -ano 2>/dev/null | grep -q ":6379"; then
    echo "⚠️  Porta 6379 está ocupada!"
    echo "Tentando parar container Redis antigo..."
    docker stop hsgrowth-redis-local 2>/dev/null || true
fi

echo "✅ Portas verificadas"

# Para containers antigos se existirem
echo ""
echo "🧹 Limpando containers antigos..."
docker-compose -f docker-compose.local.yml down 2>/dev/null || true
echo "✅ Limpeza concluída"

# Sobe containers
echo ""
echo "🐳 Subindo containers (pode demorar na primeira vez)..."
echo "============================================"
docker-compose -f docker-compose.local.yml up -d --build

# Aguarda containers ficarem saudáveis
echo ""
echo "⏳ Aguardando containers ficarem saudáveis..."
sleep 5

# Verifica status dos containers
echo ""
echo "📊 Status dos containers:"
docker-compose -f docker-compose.local.yml ps

# Testa health check da API
echo ""
echo "🔍 Testando API..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if curl -f -s http://localhost:8000/health > /dev/null 2>&1; then
        echo "✅ API está respondendo!"
        break
    fi

    attempt=$((attempt + 1))
    echo "Aguardando API ficar pronta... (tentativa $attempt de $max_attempts)"
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo "⚠️  API demorou muito para responder. Verificando logs..."
    docker-compose -f docker-compose.local.yml logs --tail=50 api
    exit 1
fi

# Testa endpoint de health
echo ""
echo "🩺 Health check da API:"
curl -s http://localhost:8000/health | python -m json.tool 2>/dev/null || curl -s http://localhost:8000/health

echo ""
echo "============================================"
echo "✅ Setup concluído com sucesso!"
echo "============================================"
echo ""
echo "📊 Acessos:"
echo "  - API:     http://localhost:8000"
echo "  - Docs:    http://localhost:8000/docs"
echo "  - ReDoc:   http://localhost:8000/redoc"
echo "  - Health:  http://localhost:8000/health"
echo ""
echo "🔑 Credenciais de teste:"
echo "  - Admin:     admin@hsgrowth.com / admin123"
echo "  - Manager:   manager@hsgrowth.com / manager123"
echo "  - Vendedor:  vendedor@hsgrowth.com / vendedor123"
echo ""
echo "📝 Comandos úteis:"
echo "  - Ver logs:        docker-compose -f docker-compose.local.yml logs -f"
echo "  - Parar tudo:      docker-compose -f docker-compose.local.yml down"
echo "  - Reiniciar:       docker-compose -f docker-compose.local.yml restart"
echo "  - Rebuild:         docker-compose -f docker-compose.local.yml up -d --build"
echo ""
echo "🎉 Pronto para usar!"
echo "============================================"
