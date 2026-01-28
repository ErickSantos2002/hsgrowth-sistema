# Guia de Importação dos CSVs do Pipedrive

Este guia explica como importar dados dos CSVs exportados do Pipedrive para o HSGrowth CRM.

## 1. Estrutura Criada

### Novas Tabelas no Banco

1. **`persons`** - Pessoas/Contatos
   - Armazena contatos vinculados a organizações
   - Campos: nome, email, telefone, cargo, LinkedIn, etc.
   - Substituiu o JSON `contact_info` nos cards

2. **`leads`** - Leads
   - Armazena leads que ainda não viraram negócios
   - Possui funil próprio (board de leads)
   - Campos: título, valor, status, pessoa, organização, etc.

### Arquivos Criados

- `app/models/person.py` - Modelo de Person
- `app/models/lead.py` - Modelo de Lead
- `alembic/versions/2026_01_28_1730-create_persons_table.py` - Migration persons
- `alembic/versions/2026_01_28_1731-create_leads_table.py` - Migration leads
- `scripts/import_from_pipedrive_csv.py` - Script de importação dos CSVs
- `scripts/setup_production_csv.sh` - Script master de setup com CSV

## 2. Preparação dos CSVs

### Exportar do Pipedrive

1. Acesse cada seção no Pipedrive:
   - **Deals** (Negócios)
   - **Organizations** (Organizações)
   - **People** (Pessoas)
   - **Products** (Produtos)
   - **Activities** (Atividades)
   - **Notes** (Notas)
   - **Leads** (Leads)

2. Para cada seção:
   - Clique no botão "Export" (geralmente no canto superior direito)
   - Escolha "Export all" ou selecione os filtros desejados
   - Faça download do arquivo CSV

### Organizar os Arquivos

1. Crie a pasta `backend/pipedrive/` (se não existir):
   ```bash
   mkdir -p backend/pipedrive
   ```

2. Coloque todos os CSVs baixados nessa pasta

3. Nomes esperados (podem variar com o ID da sua conta):
   - `deals-XXXXXXXX-XX.csv`
   - `organizations-XXXXXXXX-XX.csv`
   - `people-XXXXXXXX-XX.csv`
   - `products-XXXXXXXX-XX.csv`
   - `activities-XXXXXXXX-XX.csv`
   - `notes-XXXXXXXX-XX.csv`
   - `leads-XXXXXXXX-XX.csv`

4. O script detecta automaticamente os arquivos, não precisa renomear

## 3. Executar Importação

### Opção 1: Script Master (Recomendado)

Este script faz tudo automaticamente:

```bash
# Dá permissão de execução
chmod +x backend/scripts/setup_production_csv.sh

# Executa
cd backend
docker exec -it hsgrowth-api bash scripts/setup_production_csv.sh
```

O script irá:
1. ✅ Limpar banco de dados
2. ✅ Executar migrations
3. ✅ Criar dados iniciais (admin, roles, etc.)
4. ✅ Importar CSVs do Pipedrive

### Opção 2: Passo a Passo Manual

Se preferir controle total:

```bash
# 1. Limpar banco
docker exec -it hsgrowth-api python scripts/clean_database.py
# Digite: CONFIRMAR

# 2. Executar migrations
docker exec -it hsgrowth-api alembic upgrade head

# 3. Criar dados iniciais
docker exec -it hsgrowth-api python scripts/init_database.py

# 4. Importar CSVs
docker exec -it hsgrowth-api python scripts/import_from_pipedrive_csv.py
# Digite: IMPORTAR
```

## 4. O Que Será Importado

### Mapeamento de Dados

| CSV do Pipedrive | Tabela no CRM | Observações |
|------------------|---------------|-------------|
| **products** | `products` | Catálogo de produtos com preços |
| **organizations** | `clients` | Empresas/organizações como clientes |
| **people** | `persons` | Contatos com telefone, email, cargo |
| **leads** | `leads` | Leads em funil separado |
| **deals** | `cards` | Negócios ativos |
| **notes** | `card_notes` | Anotações dos negócios |
| **activities** | `activities` | Chamadas, reuniões, etc. |

### Campos Importados vs Ignorados

#### Products
- ✅ Nome, Código (SKU), Preço, Categoria, Ativo
- ❌ Unidade, Imposto, Visível para

#### Organizations
- ✅ Nome, CNPJ, Endereço, Cidade, Estado
- ❌ Etiquetas, Contadores, Foto

#### People
- ✅ Nome, Email, Telefone, Cargo, LinkedIn, Organização
- ❌ Etiquetas, Foto, E-mail alternativo

#### Leads
- ✅ Título, Valor, Status, Fonte, Pessoa, Organização
- ✅ Campos customizados (CNPJ, Site, Segmento) → guardados em JSON
- ❌ Campos específicos do time ([SDR], [IC], etc.)

#### Deals
- ✅ Título, Valor, Funil, Etapa, Status, Probabilidade
- ✅ Organização, Pessoa, Proprietário, Datas
- ❌ Etiquetas, MRR, ARR, Controles internos

#### Notes
- ✅ Conteúdo, Negócio, Usuário, Data
- ❌ Notas de exemplo

#### Activities
- ✅ Assunto, Tipo, Status, Negócio, Usuário, Nota
- ❌ Localização, Lead, Projeto

## 5. Estrutura Criada Automaticamente

### Usuários
- **Admin** (já existe): admin@hsgrowth.com / admin123
- **Vendedores**: Criados automaticamente baseado nos "Proprietários" do Pipedrive
  - Email: `nome.sobrenome@hsgrowth.com`
  - Username: `nomesobrenome`
  - Senha temporária (precisa resetar)
  - Role: salesperson

### Boards (Funis)
- **Funil de Leads**: Criado para gerenciar leads
  - Listas: Não Visualizado, Qualificado, Convertido, Perdido
- **Funis de Vendas**: Criados automaticamente baseado nos Pipelines do Pipedrive
  - Cada Pipeline vira um Board
  - Cada Stage vira uma List

## 6. Verificação Após Importação

### Confira no Sistema

1. **Produtos** (`/products`)
   - Verifique se todos os produtos foram importados
   - Confira preços e SKUs

2. **Clientes** (`/clients`)
   - Verifique organizações importadas
   - Confira CNPJs e endereços

3. **Usuários** (`/users`)
   - Verifique se vendedores foram criados
   - Redefina senhas conforme necessário

4. **Boards** (`/boards`)
   - Confira se funis foram criados corretamente
   - Verifique etapas (listas)

5. **Cards** (dentro de cada board)
   - Verifique deals importados
   - Confira valores e informações de contato

6. **Leads** (board "Funil de Leads")
   - Verifique leads importados
   - Confira status e informações

### Estatísticas Esperadas

Exemplo de saída bem-sucedida:

```
================================================================================
✅ IMPORTAÇÃO CONCLUÍDA COM SUCESSO!
================================================================================

📊 Estatísticas:
   - Usuários criados: 3
   - Produtos: 45
   - Organizações: 120
   - Pessoas: 150
   - Boards: 2
   - Listas: 12
   - Leads: 85
   - Deals: 380
   - Notas: 520
   - Atividades: 340
```

## 7. Troubleshooting

### Erro: "Arquivo não encontrado"

**Causa:** CSVs não estão na pasta correta

**Solução:**
```bash
# Verifique se a pasta existe
ls backend/pipedrive/

# Deve mostrar os arquivos CSV
# Se vazio, adicione os CSVs exportados do Pipedrive
```

### Erro: "relation does not exist"

**Causa:** Migrations não foram executadas

**Solução:**
```bash
docker exec -it hsgrowth-api alembic upgrade head
```

### Importação parcial (alguns CSVs pulados)

**Causa:** Arquivo CSV não encontrado

**Solução:** Script continua normalmente, pulando arquivos ausentes. Não é erro, apenas aviso.

### Duplicação em reimportação

**Atenção:** O script não verifica duplicatas. Para reimportar:

1. Limpe o banco primeiro:
   ```bash
   docker exec -it hsgrowth-api python scripts/clean_database.py
   ```

2. Execute migrations e init novamente

3. Reimporte os CSVs

### Caracteres especiais corrompidos

**Causa:** Encoding do CSV

**Solução:** O script usa UTF-8. Se houver problemas, abra o CSV em um editor de texto e salve como UTF-8.

## 8. Diferenças do Import via API

### Via API (`import_from_pipedrive.py`)
- ✅ Dados sempre atualizados
- ✅ Não precisa exportar CSVs manualmente
- ❌ Requer API Token do Pipedrive
- ❌ Rate limiting (pode ser lento)
- ❌ Menos controle sobre dados importados

### Via CSV (`import_from_pipedrive_csv.py`) - **RECOMENDADO**
- ✅ Controle total sobre dados
- ✅ Pode revisar/editar CSVs antes de importar
- ✅ Mais rápido (sem rate limiting)
- ✅ Importa TUDO (Leads, Notes, Activities)
- ✅ Funciona offline
- ❌ Precisa exportar CSVs manualmente
- ❌ Dados podem ficar desatualizados

## 9. Próximos Passos

Após importação bem-sucedida:

1. **Revisar dados importados** no sistema
2. **Redefinir senhas** dos usuários criados automaticamente
3. **Configurar boards** conforme necessário
4. **Treinar equipe** no novo sistema
5. **Começar a usar!** 🚀

## 10. Manutenção

### Reimportação completa

Se precisar reimportar do zero:

```bash
# Executa script master novamente
docker exec -it hsgrowth-api bash scripts/setup_production_csv.sh
```

### Importação incremental

Para adicionar novos dados sem limpar:

```bash
# NÃO limpe o banco
# Execute apenas o import
docker exec -it hsgrowth-api python scripts/import_from_pipedrive_csv.py
```

⚠️ **Atenção:** Importação incremental pode gerar duplicatas!

---

## Suporte

Para problemas ou dúvidas:
1. Confira os logs do script
2. Verifique se todos os CSVs estão presentes
3. Confira se migrations foram executadas
4. Entre em contato com o time de desenvolvimento
