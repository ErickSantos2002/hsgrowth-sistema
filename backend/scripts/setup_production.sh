#!/bin/bash
#
# Script master para setup completo do HSGrowth CRM em produção
# Executa: limpeza, migrations, inicialização e importação do Pipedrive
#

set -e  # Para na primeira falha

echo "================================================================================"
echo "🚀 HSGrowth CRM - Setup Completo para Produção"
echo "================================================================================"
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para perguntar sim/não
ask_yes_no() {
    while true; do
        read -p "$1 (s/n): " yn
        case $yn in
            [Ss]* ) return 0;;
            [Nn]* ) return 1;;
            * ) echo "Por favor, responda 's' ou 'n'.";;
        esac
    done
}

# Banner de aviso
echo -e "${RED}⚠️  ATENÇÃO: Este script irá preparar o banco de dados para produção!${NC}"
echo ""
echo "Este processo irá:"
echo "  1. Limpar completamente o banco de dados (TODOS os dados serão perdidos!)"
echo "  2. Executar migrations do Alembic"
echo "  3. Criar dados iniciais (roles, admin, configurações)"
echo "  4. Importar dados do Pipedrive (se configurado)"
echo ""

if ! ask_yes_no "${YELLOW}Deseja continuar?${NC}"; then
    echo ""
    echo -e "${RED}❌ Setup cancelado pelo usuário.${NC}"
    exit 0
fi

# Verifica se está dentro do container ou precisa usar docker exec
if [ -f "/.dockerenv" ]; then
    EXEC_PREFIX=""
    echo -e "${BLUE}ℹ️  Executando dentro do container Docker${NC}"
else
    EXEC_PREFIX="docker exec -it hsgrowth-api"
    echo -e "${BLUE}ℹ️  Executando via docker exec${NC}"
fi

echo ""
echo "================================================================================"

# PASSO 1: Limpar banco de dados
echo ""
echo -e "${BLUE}[1/4] Limpando banco de dados...${NC}"
echo ""
$EXEC_PREFIX python scripts/clean_database.py << EOF
CONFIRMAR
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Banco de dados limpo com sucesso${NC}"
else
    echo -e "${RED}❌ Erro ao limpar banco de dados${NC}"
    exit 1
fi

# PASSO 2: Executar migrations
echo ""
echo "================================================================================"
echo ""
echo -e "${BLUE}[2/4] Executando migrations do Alembic...${NC}"
echo ""
$EXEC_PREFIX alembic upgrade head

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Migrations executadas com sucesso${NC}"
else
    echo -e "${RED}❌ Erro ao executar migrations${NC}"
    exit 1
fi

# PASSO 3: Inicializar dados básicos
echo ""
echo "================================================================================"
echo ""
echo -e "${BLUE}[3/4] Criando dados iniciais...${NC}"
echo ""
$EXEC_PREFIX python scripts/init_database.py

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dados iniciais criados com sucesso${NC}"
else
    echo -e "${RED}❌ Erro ao criar dados iniciais${NC}"
    exit 1
fi

# PASSO 4: Importar do Pipedrive (opcional)
echo ""
echo "================================================================================"
echo ""
echo -e "${BLUE}[4/4] Importação do Pipedrive${NC}"
echo ""

# Verifica se tem API token configurado
if [ -z "$PIPEDRIVE_API_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  PIPEDRIVE_API_TOKEN não configurado${NC}"
    echo ""
    echo "Para importar dados do Pipedrive, configure a variável de ambiente:"
    echo "  export PIPEDRIVE_API_TOKEN='seu_token_aqui'"
    echo ""

    if ask_yes_no "Deseja pular a importação do Pipedrive?"; then
        echo -e "${YELLOW}⏭️  Pulando importação do Pipedrive${NC}"
    else
        echo ""
        echo -e "${RED}❌ Setup interrompido. Configure PIPEDRIVE_API_TOKEN e execute novamente.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ PIPEDRIVE_API_TOKEN encontrado${NC}"
    echo ""

    if ask_yes_no "Deseja importar dados do Pipedrive agora?"; then
        echo ""
        $EXEC_PREFIX python scripts/import_from_pipedrive.py << EOF
IMPORTAR
EOF

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Importação do Pipedrive concluída com sucesso${NC}"
        else
            echo -e "${RED}❌ Erro durante importação do Pipedrive${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}⏭️  Importação do Pipedrive pulada${NC}"
    fi
fi

# Conclusão
echo ""
echo "================================================================================"
echo -e "${GREEN}✅ SETUP COMPLETO CONCLUÍDO COM SUCESSO!${NC}"
echo "================================================================================"
echo ""
echo "📋 Informações importantes:"
echo ""
echo "  🌐 Acesse o sistema em: http://localhost:5173"
echo "  📧 Login: admin@hsgrowth.com"
echo "  🔑 Senha: admin123"
echo ""
echo -e "${YELLOW}  ⚠️  IMPORTANTE: Altere a senha padrão após o primeiro login!${NC}"
echo ""
echo "📊 Próximos passos:"
echo "  1. Acesse o sistema e faça login"
echo "  2. Altere a senha do admin em Configurações > Perfil"
echo "  3. Crie usuários adicionais em /users"
echo "  4. Configure boards e listas conforme necessário"
echo "  5. Comece a usar o CRM! 🚀"
echo ""
echo "================================================================================"
