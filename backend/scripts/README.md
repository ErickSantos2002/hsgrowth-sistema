# Scripts de Gerenciamento do HSGrowth CRM

Este diretório contém scripts úteis para gerenciamento do banco de dados e importação de dados.

## 📋 Scripts Disponíveis

### 1. `clean_database.py` - Limpar Banco de Dados

Limpa completamente o banco de dados, removendo todos os dados de todas as tabelas.

**⚠️ ATENÇÃO**: Este script deleta TODOS os dados! Use com extremo cuidado!

**Quando usar:**
- Antes de uma importação inicial
- Para resetar ambiente de desenvolvimento
- NUNCA em produção com dados reais!

**Como usar:**

```bash
# Dentro do container do backend
docker exec -it hsgrowth-api python scripts/clean_database.py

# Ou localmente (se tiver Python configurado)
cd backend
python scripts/clean_database.py
```

**O script irá:**
1. Pedir confirmação (digite `CONFIRMAR`)
2. Desabilitar foreign keys
3. Fazer TRUNCATE em todas as tabelas
4. Resetar as sequences (IDs voltam para 1)
5. Reabilitar foreign keys

---

### 2. `import_from_pipedrive_csv.py` - Importar do Pipedrive via CSV (RECOMENDADO)

Importa dados dos arquivos CSV exportados do Pipedrive para o HSGrowth CRM.

**O que é importado:**
- ✅ Produtos (products)
- ✅ Organizações → Clientes (clients)
- ✅ Pessoas → Contatos (persons)
- ✅ Leads → Leads (leads)
- ✅ Deals → Cards (cards)
- ✅ Notas → CardNotes (card_notes)
- ✅ Atividades → Activities (activities)

**Pré-requisitos:**

1. Exportar CSVs do Pipedrive:
   - Acesse cada seção no Pipedrive (Deals, Organizations, People, Products, Activities, Notes, Leads)
   - Clique em "Export" e baixe o CSV
   - Coloque todos os CSVs na pasta `backend/pipedrive/`

2. Nomes esperados dos arquivos:
   - `deals-21427617-45.csv`
   - `organizations-21427617-46.csv`
   - `people-21427617-47.csv`
   - `products-21427617-48.csv`
   - `activities-21427617-49.csv`
   - `notes-21427617-50.csv`
   - `leads-21427617-44.csv`

**Como usar:**

```bash
# Dentro do container do backend
docker exec -it hsgrowth-api python scripts/import_from_pipedrive_csv.py

# Ou localmente
cd backend
python scripts/import_from_pipedrive_csv.py
```

**O script irá:**
1. Ler todos os CSVs da pasta `backend/pipedrive/`
2. Pedir confirmação (digite `IMPORTAR`)
3. Importar dados na ordem correta (respeitando dependências)
4. Criar usuários automaticamente baseado nos proprietários
5. Criar boards (funis) e lists (etapas) automaticamente
6. Criar funil de Leads separado
7. Exibir estatísticas ao final

**Mapeamento de Dados:**

| Pipedrive | HSGrowth CRM | Observações |
|-----------|--------------|-------------|
| Organization | Client | Nome da empresa, endereço, CNPJ |
| Person | Person | Contatos com telefone, email, cargo, LinkedIn |
| Product | Product | Produtos com preço e SKU |
| Deal | Card | Negócios/oportunidades |
| Lead | Lead | Leads que ainda não viraram negócios |
| Stage | List | Etapas do funil |
| Pipeline | Board | Funil de vendas |
| User (owner) | User | Vendedores (role: salesperson) |
| Note | CardNote | Anotações dos negócios |
| Activity | Activity | Atividades (chamadas, reuniões, etc.) |

---

### 3. `import_from_pipedrive.py` - Importar do Pipedrive via API

Importa dados diretamente da API do Pipedrive para o HSGrowth CRM (método alternativo).

**O que é importado:**
- ✅ Usuários (vendedores)
- ✅ Organizações (como Clientes)
- ✅ Produtos (catálogo)
- ✅ Pipelines e Stages (como Boards e Lists)
- ✅ Deals (como Cards/Negócios)

**Pré-requisitos:**

1. Instalar biblioteca `requests`:
```bash
pip install requests
```

2. Obter API Token do Pipedrive:
   - Acesse: Pipedrive → Settings → Personal Preferences → API
   - Copie o "Personal API token"

3. Configurar variável de ambiente:

**Opção 1 - Variável de ambiente (Linux/Mac):**
```bash
export PIPEDRIVE_API_TOKEN="seu_token_aqui"
```

**Opção 2 - Variável de ambiente (Windows PowerShell):**
```powershell
$env:PIPEDRIVE_API_TOKEN="seu_token_aqui"
```

**Opção 3 - Adicionar no `.env`:**
```env
PIPEDRIVE_API_TOKEN=seu_token_aqui
PIPEDRIVE_DOMAIN=api.pipedrive.com  # Opcional (padrão: api.pipedrive.com)
```

**Como usar:**

```bash
# Dentro do container do backend
docker exec -it hsgrowth-api python scripts/import_from_pipedrive.py

# Ou localmente
cd backend
python scripts/import_from_pipedrive.py
```

**O script irá:**
1. Validar API token
2. Pedir confirmação (digite `IMPORTAR`)
3. Importar dados na ordem correta (respeitando dependências)
4. Exibir estatísticas ao final

**Mapeamento de Dados:**

| Pipedrive | HSGrowth CRM | Observações |
|-----------|--------------|-------------|
| Organization | Client | Nome da empresa, endereço, etc. |
| Person | contact_info (JSON no Card) | Informações de contato |
| Product | Product | Produtos com preço e SKU |
| Deal | Card | Negócios/oportunidades |
| Stage | List | Etapas do funil |
| Pipeline | Board | Funil de vendas |
| User | User | Vendedores (role: salesperson) |

---

## 🚀 Processo Completo de Importação

Para importar dados do Pipedrive para um banco limpo:

### Passo 1: Limpar o banco (opcional)

```bash
docker exec -it hsgrowth-api python scripts/clean_database.py
```

### Passo 2: Executar migrations

```bash
docker exec -it hsgrowth-api alembic upgrade head
```

### Passo 3: Criar dados iniciais (roles e admin)

```bash
docker exec -it hsgrowth-api python scripts/init_database.py
```

### Passo 4: Configurar API token do Pipedrive

```bash
# Edite o .env e adicione:
PIPEDRIVE_API_TOKEN=seu_token_aqui
```

### Passo 5: Executar importação

```bash
docker exec -it hsgrowth-api python scripts/import_from_pipedrive.py
```

### Passo 6: Verificar importação

```bash
# Acessar o sistema e conferir:
# - Usuários em /users
# - Clientes em /clients
# - Produtos em /products
# - Boards em /boards
```

---

## 🔧 Troubleshooting

### Erro: "PIPEDRIVE_API_TOKEN não configurado"

**Solução:** Configure a variável de ambiente ou adicione no `.env`

### Erro: "relation does not exist"

**Solução:** Execute as migrations antes:
```bash
docker exec -it hsgrowth-api alembic upgrade head
```

### Erro: "Usuário admin não encontrado"

**Solução:** Execute o script de inicialização:
```bash
docker exec -it hsgrowth-api python scripts/init_database.py
```

### Importação lenta

**Causa:** A API do Pipedrive tem rate limiting

**Solução:** O script já inclui delays (0.2s entre requisições). É normal levar alguns minutos para importar muitos registros.

### Erro: "Deal sem stage mapeado"

**Causa:** Deal está em um stage que não foi importado

**Solução:** Verifique se o pipeline está ativo no Pipedrive

---

## 📊 Estatísticas Esperadas

Exemplo de saída bem-sucedida:

```
================================================================================
✅ IMPORTAÇÃO CONCLUÍDA COM SUCESSO!
================================================================================

📊 Estatísticas:
   - Usuários: 5
   - Organizações: 120
   - Produtos: 45
   - Deals: 380
```

---

## ⚠️ Avisos Importantes

1. **Backup**: Sempre faça backup do banco antes de importar
2. **Ambiente**: Teste primeiro em desenvolvimento
3. **Duplicação**: O script não verifica duplicatas em reimportações
4. **IDs**: IDs do Pipedrive não são preservados (são criados novos IDs)
5. **Customização**: Campos customizados do Pipedrive não são importados automaticamente

---

## 🔄 Reimportação

Para reimportar dados:

1. Limpe o banco com `clean_database.py`
2. Execute migrations: `alembic upgrade head`
3. Crie dados iniciais: `init_database.py`
4. Execute a importação novamente

**Ou:**

Se quiser manter alguns dados e adicionar novos do Pipedrive, edite o script para verificar duplicatas antes de inserir.

---

## 📝 Notas Técnicas

- Scripts usam SQLAlchemy ORM
- Transações são commitadas por lote
- Mapeamento de IDs é mantido em memória durante importação
- Rate limiting: 0.2s entre requisições para evitar bloqueio da API
- Paginação automática (100 itens por página)

---

## 🆘 Suporte

Para problemas ou dúvidas:
1. Verifique os logs do script
2. Confira a documentação da API do Pipedrive
3. Entre em contato com o time de desenvolvimento
