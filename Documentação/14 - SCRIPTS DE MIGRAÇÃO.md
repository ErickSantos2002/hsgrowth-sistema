# 14 - SCRIPTS DE MIGRAÇÃO

**HSGrowth CRM - Internal Sales Management System**
**Versão**: 1.0
**Data**: 15/12/2025
**Autor**: Equipe de Desenvolvimento HSGrowth

---

## 📋 Índice

1. [Introdução](#1-introdução)
2. [Exportação de Dados do Pipedrive](#2-exportação-de-dados-do-pipedrive)
3. [Mapeamento de Campos](#3-mapeamento-de-campos)
4. [Scripts de Transformação](#4-scripts-de-transformação)
5. [Scripts de Validação](#5-scripts-de-validação)
6. [Importação para HSGrowth CRM](#6-importação-para-hsgrowth-crm)
7. [Plano de Rollback](#7-plano-de-rollback)
8. [Checklist de Migração](#8-checklist-de-migração)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Introdução

Este documento descreve o processo completo de **migração de dados do Pipedrive para o HSGrowth CRM**.

### 1.1 Escopo da Migração

**Dados a serem migrados**:
- ✅ Usuários (Users)
- ✅ Organizações (Organizations)
- ✅ Contatos (People)
- ✅ Negócios/Deals (Cards)
- ✅ Produtos (Products)
- ✅ Anotações (Notes)
- ✅ Atividades (Activities - limitado)

**Dados que NÃO serão migrados**:
- ❌ E-mails (permanecem no Pipedrive ou email client)
- ❌ Arquivos anexados > 10MB (migração manual se necessário)
- ❌ Integrações de terceiros (reconfigurar manualmente)
- ❌ Webhooks (recriar no HSGrowth)

### 1.2 Pré-requisitos

- Acesso de **Admin** ao Pipedrive
- **API Token** do Pipedrive
- Node.js 18+ instalado
- PostgreSQL 14+ instalado e configurado
- Banco de dados HSGrowth CRM criado e com migrations executadas

### 1.3 Timeline Estimada

| Fase | Duração Estimada | Responsável |
|------|------------------|-------------|
| Exportação do Pipedrive | 1-2 horas | Admin |
| Transformação de dados | 2-4 horas | Desenvolvedor |
| Validação de dados | 1-2 horas | QA |
| Importação no HSGrowth | 2-3 horas | Desenvolvedor |
| Testes de validação | 2-4 horas | QA + Admin |
| **Total** | **8-15 horas** | Equipe |

---

## 2. Exportação de Dados do Pipedrive

### 2.1 Obter API Token do Pipedrive

1. Acesse Pipedrive → **Settings** → **Personal Preferences** → **API**
2. Copie o **API Token**
3. Armazene em variável de ambiente:

```bash
export PIPEDRIVE_API_TOKEN="seu_token_aqui"
```

### 2.2 Script de Exportação

Crie o arquivo `scripts/export-pipedrive.js`:

```javascript
/**
 * Script de Exportação de Dados do Pipedrive
 *
 * Exporta todos os dados relevantes do Pipedrive via API
 * e salva em arquivos JSON locais.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const PIPEDRIVE_API_TOKEN = process.env.PIPEDRIVE_API_TOKEN;
const PIPEDRIVE_BASE_URL = 'https://api.pipedrive.com/v1';
const OUTPUT_DIR = './data/pipedrive-export';

// Garantir que diretório de saída existe
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Função genérica para buscar dados da API do Pipedrive
 */
async function fetchPipedriveData(endpoint, params = {}) {
  const url = `${PIPEDRIVE_BASE_URL}/${endpoint}`;
  const allData = [];
  let start = 0;
  const limit = 500;

  try {
    while (true) {
      const response = await axios.get(url, {
        params: {
          api_token: PIPEDRIVE_API_TOKEN,
          start,
          limit,
          ...params
        }
      });

      if (!response.data.success) {
        throw new Error(`API Error: ${response.data.error}`);
      }

      const data = response.data.data;

      if (!data || data.length === 0) {
        break;
      }

      allData.push(...data);

      console.log(`Fetched ${data.length} records from ${endpoint} (total: ${allData.length})`);

      // Verificar se há mais dados
      if (!response.data.additional_data?.pagination?.more_items_in_collection) {
        break;
      }

      start += limit;
    }

    return allData;
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error.message);
    throw error;
  }
}

/**
 * Exportar dados
 */
async function exportData() {
  console.log('=== INICIANDO EXPORTAÇÃO DO PIPEDRIVE ===\n');

  try {
    // 1. Exportar Usuários
    console.log('1. Exportando usuários...');
    const users = await fetchPipedriveData('users');
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'users.json'),
      JSON.stringify(users, null, 2)
    );
    console.log(`✓ ${users.length} usuários exportados\n`);

    // 2. Exportar Pipelines (Funis)
    console.log('2. Exportando pipelines...');
    const pipelines = await fetchPipedriveData('pipelines');
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'pipelines.json'),
      JSON.stringify(pipelines, null, 2)
    );
    console.log(`✓ ${pipelines.length} pipelines exportados\n`);

    // 3. Exportar Estágios
    console.log('3. Exportando estágios...');
    const stages = await fetchPipedriveData('stages');
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'stages.json'),
      JSON.stringify(stages, null, 2)
    );
    console.log(`✓ ${stages.length} estágios exportados\n`);

    // 4. Exportar Organizações
    console.log('4. Exportando organizações...');
    const organizations = await fetchPipedriveData('organizations');
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'organizations.json'),
      JSON.stringify(organizations, null, 2)
    );
    console.log(`✓ ${organizations.length} organizações exportadas\n`);

    // 5. Exportar Pessoas/Contatos
    console.log('5. Exportando pessoas/contatos...');
    const persons = await fetchPipedriveData('persons');
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'persons.json'),
      JSON.stringify(persons, null, 2)
    );
    console.log(`✓ ${persons.length} pessoas exportadas\n`);

    // 6. Exportar Produtos
    console.log('6. Exportando produtos...');
    const products = await fetchPipedriveData('products');
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'products.json'),
      JSON.stringify(products, null, 2)
    );
    console.log(`✓ ${products.length} produtos exportados\n`);

    // 7. Exportar Negócios/Deals
    console.log('7. Exportando negócios/deals (pode demorar)...');
    const deals = await fetchPipedriveData('deals', { status: 'all_not_deleted' });
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'deals.json'),
      JSON.stringify(deals, null, 2)
    );
    console.log(`✓ ${deals.length} deals exportados\n`);

    // 8. Exportar Anotações
    console.log('8. Exportando anotações...');
    const notes = await fetchPipedriveData('notes');
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'notes.json'),
      JSON.stringify(notes, null, 2)
    );
    console.log(`✓ ${notes.length} anotações exportadas\n`);

    // 9. Exportar Atividades
    console.log('9. Exportando atividades...');
    const activities = await fetchPipedriveData('activities');
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'activities.json'),
      JSON.stringify(activities, null, 2)
    );
    console.log(`✓ ${activities.length} atividades exportadas\n`);

    // Resumo
    console.log('\n=== EXPORTAÇÃO CONCLUÍDA COM SUCESSO ===');
    console.log(`Usuários: ${users.length}`);
    console.log(`Pipelines: ${pipelines.length}`);
    console.log(`Estágios: ${stages.length}`);
    console.log(`Organizações: ${organizations.length}`);
    console.log(`Pessoas: ${persons.length}`);
    console.log(`Produtos: ${products.length}`);
    console.log(`Deals: ${deals.length}`);
    console.log(`Anotações: ${notes.length}`);
    console.log(`Atividades: ${activities.length}`);
    console.log(`\nArquivos salvos em: ${OUTPUT_DIR}`);

  } catch (error) {
    console.error('\n❌ ERRO NA EXPORTAÇÃO:', error.message);
    process.exit(1);
  }
}

// Executar
exportData();
```

### 2.3 Executar Exportação

```bash
# Instalar dependências
npm install axios

# Executar script
node scripts/export-pipedrive.js
```

**Saída esperada**: Arquivos JSON em `./data/pipedrive-export/`

---

## 3. Mapeamento de Campos

### 3.1 Usuários (Users)

| Pipedrive | HSGrowth CRM | Transformação |
|-----------|--------------|---------------|
| `id` | - | Mapear em dicionário externo |
| `name` | `first_name` + `last_name` | Split por espaço |
| `email` | `email` | Direto |
| `active_flag` | `status` | true → 'active', false → 'inactive' |
| `role_id` | `role` | Mapear roles: Admin → 'admin', Manager → 'gerente', User → 'vendedor' |

### 3.2 Organizações (Organizations)

| Pipedrive | HSGrowth CRM | Transformação |
|-----------|--------------|---------------|
| `id` | - | Mapear em dicionário |
| `name` | `name` | Direto |
| `address` | `address` | Direto |
| `address_locality` | `city` | Direto |
| `address_admin_area_level_1` | `state` | Direto |
| `address_country` | `country` | Direto |

### 3.3 Pessoas/Contatos (People)

| Pipedrive | HSGrowth CRM | Transformação |
|-----------|--------------|---------------|
| `id` | - | Mapear em dicionário |
| `name` | `first_name` + `last_name` | Split por espaço |
| `email[0].value` | `email` | Primeiro email |
| `phone[0].value` | `phone` | Primeiro telefone |
| `org_id` | `organization_id` | Lookup em dicionário |

### 3.4 Negócios/Deals → Cards

| Pipedrive | HSGrowth CRM | Transformação |
|-----------|--------------|---------------|
| `id` | - | Mapear em dicionário |
| `title` | `title` | Direto |
| `value` | Campo customizado "Valor" | Converter para número |
| `currency` | Campo customizado "Moeda" | Direto (BRL, USD, etc) |
| `stage_id` | `list_id` | Mapear estágios → listas |
| `user_id` | `assigned_to` + `original_owner_id` | Lookup em dicionário de usuários |
| `person_id` | Relacionamento CARD_PEOPLE | Lookup em dicionário de pessoas |
| `org_id` | Campo customizado "Empresa" | Lookup em dicionário de orgs |
| `add_time` | `created_at` | Converter ISO 8601 |
| `update_time` | `updated_at` | Converter ISO 8601 |
| `status` | `archived_at` | 'deleted' → NOW(), senão NULL |

### 3.5 Produtos (Products)

| Pipedrive | HSGrowth CRM | Transformação |
|-----------|--------------|---------------|
| `id` | - | Mapear em dicionário |
| `name` | `name` | Direto |
| `code` | `description` | Código como descrição |
| `prices[0].price` | `price` | Primeiro preço |
| `prices[0].currency` | `currency` | Direto |

### 3.6 Anotações (Notes)

| Pipedrive | HSGrowth CRM | Transformação |
|-----------|--------------|---------------|
| `id` | - | Mapear em dicionário |
| `content` | `content` | Direto (remover HTML se necessário) |
| `deal_id` | `card_id` | Lookup em dicionário de deals |
| `user_id` | `user_id` | Lookup em dicionário de usuários |
| `add_time` | `created_at` | Converter ISO 8601 |

---

## 4. Scripts de Transformação

### 4.1 Script de Transformação Principal

Crie o arquivo `scripts/transform-data.js`:

```javascript
/**
 * Script de Transformação de Dados
 *
 * Transforma dados exportados do Pipedrive para formato HSGrowth CRM
 */

const fs = require('fs');
const path = require('path');

const INPUT_DIR = './data/pipedrive-export';
const OUTPUT_DIR = './data/transformed';

// Garantir que diretório de saída existe
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Dicionários de mapeamento (ID Pipedrive → ID HSGrowth)
const mappings = {
  users: new Map(),
  organizations: new Map(),
  persons: new Map(),
  deals: new Map(),
  stages: new Map(),
  products: new Map()
};

/**
 * Carregar dados do Pipedrive
 */
function loadPipedriveData() {
  return {
    users: JSON.parse(fs.readFileSync(path.join(INPUT_DIR, 'users.json'))),
    pipelines: JSON.parse(fs.readFileSync(path.join(INPUT_DIR, 'pipelines.json'))),
    stages: JSON.parse(fs.readFileSync(path.join(INPUT_DIR, 'stages.json'))),
    organizations: JSON.parse(fs.readFileSync(path.join(INPUT_DIR, 'organizations.json'))),
    persons: JSON.parse(fs.readFileSync(path.join(INPUT_DIR, 'persons.json'))),
    products: JSON.parse(fs.readFileSync(path.join(INPUT_DIR, 'products.json'))),
    deals: JSON.parse(fs.readFileSync(path.join(INPUT_DIR, 'deals.json'))),
    notes: JSON.parse(fs.readFileSync(path.join(INPUT_DIR, 'notes.json'))),
    activities: JSON.parse(fs.readFileSync(path.join(INPUT_DIR, 'activities.json')))
  };
}

/**
 * Transformar usuários
 */
function transformUsers(users) {
  console.log('\nTransformando usuários...');

  const transformed = users
    .filter(u => u.active_flag) // Apenas usuários ativos
    .map((u, index) => {
      const nameParts = (u.name || '').split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Mapear role (simplificado)
      let role = 'vendedor';
      if (u.is_admin) role = 'admin';
      else if (u.role_id === 1) role = 'gerente'; // Ajustar conforme roles do Pipedrive

      const transformed = {
        // id será auto-incrementado no banco
        account_id: 1, // IMPORTANTE: Ajustar para ID da conta HSGrowth
        email: u.email,
        first_name: firstName,
        last_name: lastName,
        role,
        status: 'active',
        password_hash: '$2b$12$DEFAULT_HASH', // IMPORTANTE: Resetar senhas após migração
        created_at: u.created || new Date().toISOString(),
        updated_at: u.modified || new Date().toISOString()
      };

      // Salvar mapeamento (ID Pipedrive → Index no array)
      mappings.users.set(u.id, index + 1);

      return transformed;
    });

  console.log(`✓ ${transformed.length} usuários transformados`);
  return transformed;
}

/**
 * Transformar organizações
 */
function transformOrganizations(organizations) {
  console.log('\nTransformando organizações...');

  const transformed = organizations.map((org, index) => {
    const transformed = {
      account_id: 1,
      name: org.name,
      email: org.email?.[0]?.value || null,
      phone: org.phone?.[0]?.value || null,
      website: org.website || null,
      address: org.address || null,
      city: org.address_locality || null,
      state: org.address_admin_area_level_1 || null,
      country: org.address_country || null,
      created_at: org.add_time || new Date().toISOString(),
      updated_at: org.update_time || new Date().toISOString()
    };

    mappings.organizations.set(org.id, index + 1);
    return transformed;
  });

  console.log(`✓ ${transformed.length} organizações transformadas`);
  return transformed;
}

/**
 * Transformar pessoas/contatos
 */
function transformPersons(persons) {
  console.log('\nTransformando pessoas/contatos...');

  const transformed = persons.map((person, index) => {
    const nameParts = (person.name || '').split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const transformed = {
      account_id: 1,
      organization_id: person.org_id ? mappings.organizations.get(person.org_id) : null,
      first_name: firstName,
      last_name: lastName,
      email: person.email?.[0]?.value || null,
      phone: person.phone?.[0]?.value || null,
      mobile: person.phone?.[1]?.value || null,
      job_title: person.job_title || null,
      created_at: person.add_time || new Date().toISOString(),
      updated_at: person.update_time || new Date().toISOString()
    };

    mappings.persons.set(person.id, index + 1);
    return transformed;
  });

  console.log(`✓ ${transformed.length} pessoas transformadas`);
  return transformed;
}

/**
 * Transformar produtos
 */
function transformProducts(products) {
  console.log('\nTransformando produtos...');

  const transformed = products.map((product, index) => {
    const transformed = {
      account_id: 1,
      name: product.name,
      description: product.code || null,
      price: product.prices?.[0]?.price || 0,
      currency: product.prices?.[0]?.currency || 'BRL',
      created_at: product.add_time || new Date().toISOString(),
      updated_at: product.update_time || new Date().toISOString()
    };

    mappings.products.set(product.id, index + 1);
    return transformed;
  });

  console.log(`✓ ${transformed.length} produtos transformados`);
  return transformed;
}

/**
 * Transformar estágios → listas
 */
function transformStages(stages) {
  console.log('\nTransformando estágios → listas...');

  const transformed = stages.map((stage, index) => {
    const transformed = {
      board_id: 1, // IMPORTANTE: Ajustar para ID do board criado
      name: stage.name,
      position: stage.order_nr,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    mappings.stages.set(stage.id, index + 1);
    return transformed;
  });

  console.log(`✓ ${transformed.length} listas transformadas`);
  return transformed;
}

/**
 * Transformar deals → cards
 */
function transformDeals(deals, stages) {
  console.log('\nTransformando deals → cards...');

  const transformed = deals.map((deal, index) => {
    const listId = mappings.stages.get(deal.stage_id) || 1;
    const assignedTo = mappings.users.get(deal.user_id) || null;

    const transformed = {
      list_id: listId,
      title: deal.title,
      description: deal.description || null,
      assigned_to: assignedTo,
      original_owner_id: assignedTo,
      current_owner_id: assignedTo,
      position: index,
      created_by: assignedTo,
      created_at: deal.add_time,
      updated_at: deal.update_time,
      archived_at: deal.status === 'deleted' ? new Date().toISOString() : null
    };

    mappings.deals.set(deal.id, index + 1);
    return transformed;
  });

  console.log(`✓ ${transformed.length} cartões transformados`);
  return transformed;
}

/**
 * Transformar notas
 */
function transformNotes(notes) {
  console.log('\nTransformando notas...');

  const transformed = notes
    .filter(note => note.deal_id && mappings.deals.has(note.deal_id))
    .map(note => ({
      card_id: mappings.deals.get(note.deal_id),
      user_id: mappings.users.get(note.user_id) || 1,
      content: note.content?.replace(/<[^>]*>/g, '') || '', // Remover HTML
      created_at: note.add_time,
      updated_at: note.update_time || note.add_time
    }));

  console.log(`✓ ${transformed.length} notas transformadas`);
  return transformed;
}

/**
 * Executar transformação
 */
async function transformData() {
  console.log('=== INICIANDO TRANSFORMAÇÃO DE DADOS ===');

  const data = loadPipedriveData();

  const transformed = {
    users: transformUsers(data.users),
    organizations: transformOrganizations(data.organizations),
    persons: transformPersons(data.persons),
    products: transformProducts(data.products),
    stages: transformStages(data.stages),
    cards: transformDeals(data.deals, data.stages),
    notes: transformNotes(data.notes)
  };

  // Salvar dados transformados
  Object.keys(transformed).forEach(key => {
    const filename = path.join(OUTPUT_DIR, `${key}.json`);
    fs.writeFileSync(filename, JSON.stringify(transformed[key], null, 2));
    console.log(`Salvo: ${filename}`);
  });

  // Salvar mapeamentos
  const mappingsObj = {};
  Object.keys(mappings).forEach(key => {
    mappingsObj[key] = Array.from(mappings[key].entries());
  });
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'mappings.json'),
    JSON.stringify(mappingsObj, null, 2)
  );

  console.log('\n=== TRANSFORMAÇÃO CONCLUÍDA COM SUCESSO ===');
  console.log(`Arquivos salvos em: ${OUTPUT_DIR}`);
}

transformData();
```

### 4.2 Executar Transformação

```bash
node scripts/transform-data.js
```

---

## 5. Scripts de Validação

### 5.1 Script de Validação

Crie o arquivo `scripts/validate-data.js`:

```javascript
/**
 * Script de Validação de Dados
 *
 * Valida dados transformados antes da importação
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = './data/transformed';

function validateData() {
  console.log('=== VALIDANDO DADOS TRANSFORMADOS ===\n');

  const errors = [];
  const warnings = [];

  // Carregar dados
  const users = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'users.json')));
  const organizations = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'organizations.json')));
  const persons = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'persons.json')));
  const cards = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'cards.json')));
  const notes = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'notes.json')));

  // 1. Validar Usuários
  console.log('1. Validando usuários...');
  users.forEach((user, index) => {
    if (!user.email) {
      errors.push(`Usuário ${index}: email obrigatório`);
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
      errors.push(`Usuário ${index}: email inválido (${user.email})`);
    }

    if (!user.first_name) {
      warnings.push(`Usuário ${index}: first_name vazio`);
    }

    if (!['admin', 'gerente', 'vendedor', 'visualizador'].includes(user.role)) {
      errors.push(`Usuário ${index}: role inválido (${user.role})`);
    }
  });

  // Verificar emails duplicados
  const emails = users.map(u => u.email);
  const duplicateEmails = emails.filter((email, index) => emails.indexOf(email) !== index);
  if (duplicateEmails.length > 0) {
    errors.push(`Emails duplicados: ${duplicateEmails.join(', ')}`);
  }

  console.log(`✓ ${users.length} usuários validados`);

  // 2. Validar Organizações
  console.log('\n2. Validando organizações...');
  organizations.forEach((org, index) => {
    if (!org.name || org.name.length < 2) {
      errors.push(`Organização ${index}: nome inválido`);
    }

    if (org.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(org.email)) {
      warnings.push(`Organização ${index}: email inválido (${org.email})`);
    }
  });
  console.log(`✓ ${organizations.length} organizações validadas`);

  // 3. Validar Pessoas
  console.log('\n3. Validando pessoas...');
  persons.forEach((person, index) => {
    if (!person.first_name) {
      warnings.push(`Pessoa ${index}: first_name vazio`);
    }

    if (person.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(person.email)) {
      warnings.push(`Pessoa ${index}: email inválido (${person.email})`);
    }

    if (person.organization_id && !organizations[person.organization_id - 1]) {
      errors.push(`Pessoa ${index}: organization_id inválido (${person.organization_id})`);
    }
  });
  console.log(`✓ ${persons.length} pessoas validadas`);

  // 4. Validar Cartões
  console.log('\n4. Validando cartões...');
  cards.forEach((card, index) => {
    if (!card.title || card.title.length < 3) {
      errors.push(`Cartão ${index}: título inválido`);
    }

    if (!card.list_id) {
      errors.push(`Cartão ${index}: list_id obrigatório`);
    }

    if (card.assigned_to && !users[card.assigned_to - 1]) {
      errors.push(`Cartão ${index}: assigned_to inválido (${card.assigned_to})`);
    }
  });
  console.log(`✓ ${cards.length} cartões validados`);

  // 5. Validar Notas
  console.log('\n5. Validando notas...');
  notes.forEach((note, index) => {
    if (!note.card_id) {
      errors.push(`Nota ${index}: card_id obrigatório`);
    } else if (!cards[note.card_id - 1]) {
      errors.push(`Nota ${index}: card_id inválido (${note.card_id})`);
    }

    if (!note.content) {
      warnings.push(`Nota ${index}: conteúdo vazio`);
    }
  });
  console.log(`✓ ${notes.length} notas validadas`);

  // Resultado
  console.log('\n=== RESULTADO DA VALIDAÇÃO ===');
  console.log(`Erros: ${errors.length}`);
  console.log(`Avisos: ${warnings.length}\n`);

  if (errors.length > 0) {
    console.log('❌ ERROS ENCONTRADOS:');
    errors.forEach(err => console.log(`  - ${err}`));
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  AVISOS:');
    warnings.forEach(warn => console.log(`  - ${warn}`));
  }

  if (errors.length === 0) {
    console.log('\n✅ VALIDAÇÃO CONCLUÍDA SEM ERROS!');
    console.log('Dados prontos para importação.');
    return true;
  } else {
    console.log('\n❌ VALIDAÇÃO FALHOU!');
    console.log('Corrija os erros antes de importar.');
    return false;
  }
}

const isValid = validateData();
process.exit(isValid ? 0 : 1);
```

### 5.2 Executar Validação

```bash
node scripts/validate-data.js
```

---

## 6. Importação para HSGrowth CRM

### 6.1 Script de Importação

Crie o arquivo `scripts/import-to-hsgrowth.js`:

```javascript
/**
 * Script de Importação para HSGrowth CRM
 *
 * Importa dados transformados e validados para o banco de dados
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DATA_DIR = './data/transformed';

// Configuração do banco de dados
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'hsgrowth_crm',
  user: process.env.DB_USER || 'dev_user',
  password: process.env.DB_PASSWORD || 'dev_password_2025'
});

/**
 * Importar dados
 */
async function importData() {
  const client = await pool.connect();

  try {
    console.log('=== INICIANDO IMPORTAÇÃO ===\n');

    // Iniciar transação
    await client.query('BEGIN');

    // 1. Importar Usuários
    console.log('1. Importando usuários...');
    const users = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'users.json')));

    for (const user of users) {
      await client.query(
        `INSERT INTO users (account_id, email, first_name, last_name, role, status, password_hash, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [user.account_id, user.email, user.first_name, user.last_name, user.role, user.status, user.password_hash, user.created_at, user.updated_at]
      );
    }
    console.log(`✓ ${users.length} usuários importados`);

    // 2. Importar Organizações
    console.log('\n2. Importando organizações...');
    const organizations = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'organizations.json')));

    for (const org of organizations) {
      await client.query(
        `INSERT INTO organizations (account_id, name, email, phone, website, address, city, state, country, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [org.account_id, org.name, org.email, org.phone, org.website, org.address, org.city, org.state, org.country, org.created_at, org.updated_at]
      );
    }
    console.log(`✓ ${organizations.length} organizações importadas`);

    // 3. Importar Pessoas
    console.log('\n3. Importando pessoas...');
    const persons = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'persons.json')));

    for (const person of persons) {
      await client.query(
        `INSERT INTO people (account_id, organization_id, first_name, last_name, email, phone, mobile, job_title, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [person.account_id, person.organization_id, person.first_name, person.last_name, person.email, person.phone, person.mobile, person.job_title, person.created_at, person.updated_at]
      );
    }
    console.log(`✓ ${persons.length} pessoas importadas`);

    // 4. Importar Produtos
    console.log('\n4. Importando produtos...');
    const products = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'products.json')));

    for (const product of products) {
      await client.query(
        `INSERT INTO products (account_id, name, description, price, currency, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [product.account_id, product.name, product.description, product.price, product.currency, product.created_at, product.updated_at]
      );
    }
    console.log(`✓ ${products.length} produtos importados`);

    // 5. Importar Listas (Stages)
    console.log('\n5. Importando listas...');
    const stages = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'stages.json')));

    for (const stage of stages) {
      await client.query(
        `INSERT INTO lists (board_id, name, position, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [stage.board_id, stage.name, stage.position, stage.created_at, stage.updated_at]
      );
    }
    console.log(`✓ ${stages.length} listas importadas`);

    // 6. Importar Cartões
    console.log('\n6. Importando cartões...');
    const cards = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'cards.json')));

    for (const card of cards) {
      await client.query(
        `INSERT INTO cards (list_id, title, description, assigned_to, original_owner_id, current_owner_id, position, created_by, created_at, updated_at, archived_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [card.list_id, card.title, card.description, card.assigned_to, card.original_owner_id, card.current_owner_id, card.position, card.created_by, card.created_at, card.updated_at, card.archived_at]
      );
    }
    console.log(`✓ ${cards.length} cartões importados`);

    // 7. Importar Notas
    console.log('\n7. Importando notas...');
    const notes = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'notes.json')));

    for (const note of notes) {
      await client.query(
        `INSERT INTO notes (card_id, user_id, content, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [note.card_id, note.user_id, note.content, note.created_at, note.updated_at]
      );
    }
    console.log(`✓ ${notes.length} notas importadas`);

    // Commit transação
    await client.query('COMMIT');

    console.log('\n=== IMPORTAÇÃO CONCLUÍDA COM SUCESSO ===');

    // Registrar no histórico de importações
    await client.query(
      `INSERT INTO import_history (account_id, source, total_records, successful_records, failed_records, imported_by)
       VALUES ($1, 'pipedrive', $2, $2, 0, 1)`,
      [1, users.length + organizations.length + persons.length + cards.length + notes.length]
    );

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ ERRO NA IMPORTAÇÃO:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

importData();
```

### 6.2 Executar Importação

```bash
# Configurar variáveis de ambiente
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=hsgrowth_crm
export DB_USER=dev_user
export DB_PASSWORD=dev_password_2025

# Instalar dependências
npm install pg

# Executar importação
node scripts/import-to-hsgrowth.js
```

---

## 7. Plano de Rollback

### 7.1 Backup Antes da Migração

**SEMPRE** faça backup do banco de dados antes de iniciar a migração:

```bash
# Backup completo do banco
pg_dump -U dev_user -h localhost hsgrowth_crm > backup_pre_migration_$(date +%Y%m%d_%H%M%S).sql

# Backup comprimido (recomendado)
pg_dump -U dev_user -h localhost hsgrowth_crm | gzip > backup_pre_migration_$(date +%Y%m%d_%H%M%S).sql.gz
```

### 7.2 Restauração de Backup

Se algo der errado durante a migração:

```bash
# Restaurar de backup
psql -U dev_user -h localhost -d hsgrowth_crm < backup_pre_migration_20251215_140000.sql

# Restaurar de backup comprimido
gunzip -c backup_pre_migration_20251215_140000.sql.gz | psql -U dev_user -h localhost -d hsgrowth_crm
```

### 7.3 Rollback Parcial (Limpar Dados Importados)

Se precisar limpar apenas os dados importados (sem afetar estrutura):

```sql
-- CUIDADO: Isso deleta TODOS os dados!
BEGIN;

DELETE FROM notes;
DELETE FROM activities;
DELETE FROM card_field_values;
DELETE FROM card_transfers;
DELETE FROM cards;
DELETE FROM custom_fields;
DELETE FROM lists;
DELETE FROM boards;
DELETE FROM people;
DELETE FROM organizations;
DELETE FROM products;
DELETE FROM users WHERE id > 1; -- Manter usuário admin original
DELETE FROM import_history;

-- Resetar sequences
ALTER SEQUENCE users_id_seq RESTART WITH 2;
ALTER SEQUENCE organizations_id_seq RESTART WITH 1;
ALTER SEQUENCE people_id_seq RESTART WITH 1;
ALTER SEQUENCE products_id_seq RESTART WITH 1;
ALTER SEQUENCE boards_id_seq RESTART WITH 1;
ALTER SEQUENCE lists_id_seq RESTART WITH 1;
ALTER SEQUENCE cards_id_seq RESTART WITH 1;
ALTER SEQUENCE notes_id_seq RESTART WITH 1;

COMMIT;
```

### 7.4 Verificação Pós-Rollback

```sql
-- Verificar se rollback funcionou
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'organizations', COUNT(*) FROM organizations
UNION ALL
SELECT 'cards', COUNT(*) FROM cards
UNION ALL
SELECT 'notes', COUNT(*) FROM notes;

-- Resultado esperado: todos os counts devem ser 0 (exceto users = 1)
```

---

## 8. Checklist de Migração

### 8.1 Pré-Migração

- [ ] **Backup do banco de dados HSGrowth CRM**
- [ ] **API Token do Pipedrive obtido**
- [ ] **Variáveis de ambiente configuradas**
- [ ] **Node.js e dependências instaladas**
- [ ] **Banco de dados HSGrowth CRM com migrations executadas**
- [ ] **Comunicação com equipe: Migração agendada para [DATA/HORA]**
- [ ] **Criar conta (account) no HSGrowth CRM via interface**
- [ ] **Criar board principal no HSGrowth CRM via interface**
- [ ] **Anotar IDs: account_id = ?, board_id = ?**

### 8.2 Execução

- [ ] **1. Exportar dados do Pipedrive** (`node scripts/export-pipedrive.js`)
  - Verificar arquivos JSON em `./data/pipedrive-export/`
  - Conferir quantidades: users, deals, organizations, etc

- [ ] **2. Transformar dados** (`node scripts/transform-data.js`)
  - Ajustar account_id e board_id no script
  - Verificar arquivos JSON em `./data/transformed/`
  - Conferir mapeamentos em `mappings.json`

- [ ] **3. Validar dados** (`node scripts/validate-data.js`)
  - Corrigir erros reportados
  - Revisar avisos (warnings)
  - Executar até 0 erros

- [ ] **4. Importar para HSGrowth** (`node scripts/import-to-hsgrowth.js`)
  - Acompanhar progresso no console
  - Verificar mensagem "IMPORTAÇÃO CONCLUÍDA COM SUCESSO"

### 8.3 Pós-Migração

- [ ] **Verificar contagens no banco de dados**
  ```sql
  SELECT 'users' as table_name, COUNT(*) as count FROM users
  UNION ALL SELECT 'organizations', COUNT(*) FROM organizations
  UNION ALL SELECT 'cards', COUNT(*) FROM cards
  UNION ALL SELECT 'notes', COUNT(*) FROM notes;
  ```

- [ ] **Testar login de usuários migrados**
  - IMPORTANTE: Resetar senhas (enviar email de boas-vindas)

- [ ] **Verificar quadro Kanban**
  - Todas as listas criadas?
  - Cartões nas listas corretas?
  - Campos customizados exibindo valores?

- [ ] **Verificar relacionamentos**
  - Cartões associados a pessoas corretas?
  - Notas vinculadas aos cartões?
  - Organizações linkadas corretamente?

- [ ] **Testar funcionalidades críticas**
  - Mover cartão entre listas
  - Adicionar nota a cartão
  - Criar novo cartão
  - Transferir cartão

- [ ] **Comunicar conclusão da migração**
  - Email para equipe com instruções de acesso
  - Orientações sobre reset de senha
  - Link para documentação/treinamento

### 8.4 Limpeza

- [ ] **Manter backup do Pipedrive por 30 dias** (após confirmação de sucesso)
- [ ] **Arquivar dados exportados/transformados** (`./data/`)
- [ ] **Documentar lições aprendidas**
- [ ] **Atualizar documentação com IDs reais**

---

## 9. Troubleshooting

### 9.1 Erro: "API Token inválido"

**Sintoma**: Erro 401 ao exportar do Pipedrive

**Solução**:
1. Verificar se token está correto
2. Regenerar token no Pipedrive
3. Verificar se token não expirou

### 9.2 Erro: "Duplicate key value violates unique constraint"

**Sintoma**: Erro ao importar (email duplicado, posição duplicada, etc)

**Solução**:
1. Executar script de validação novamente
2. Identificar registros duplicados
3. Remover duplicatas nos dados transformados
4. Re-executar importação

### 9.3 Erro: "Foreign key constraint violation"

**Sintoma**: Erro ao inserir registros com FKs inválidas

**Solução**:
1. Verificar ordem de importação (users → organizations → persons → cards → notes)
2. Verificar mapeamentos em `mappings.json`
3. Ajustar IDs de referência

### 9.4 Performance Lenta

**Sintoma**: Importação muito lenta (> 1 hora)

**Solução**:
1. Desabilitar índices temporariamente antes da importação:
   ```sql
   DROP INDEX idx_cards_assigned_to;
   DROP INDEX idx_cards_created_at;
   -- ... outros índices
   ```

2. Executar importação

3. Recriar índices:
   ```sql
   CREATE INDEX idx_cards_assigned_to ON cards(assigned_to);
   CREATE INDEX idx_cards_created_at ON cards(created_at DESC);
   -- ... outros índices
   ```

### 9.5 Dados Incompletos

**Sintoma**: Alguns registros não foram importados

**Solução**:
1. Verificar logs de erro
2. Identificar registros faltantes
3. Importar manualmente ou ajustar script
4. Executar queries de verificação pós-migração

---

## 10. Recursos Adicionais

### 10.1 Documentação Pipedrive API

- API Reference: https://developers.pipedrive.com/docs/api/v1
- Rate Limits: 100 requests/10 segundos
- Webhooks: https://developers.pipedrive.com/docs/api/v1/Webhooks

### 10.2 Queries Úteis Pós-Migração

```sql
-- Comparar totais Pipedrive vs HSGrowth
-- Executar antes e depois da migração

-- Total de usuários
SELECT COUNT(*) FROM users WHERE account_id = 1;

-- Total de organizações
SELECT COUNT(*) FROM organizations WHERE account_id = 1;

-- Total de cartões
SELECT COUNT(*) FROM cards WHERE list_id IN (SELECT id FROM lists WHERE board_id = 1);

-- Total de notas
SELECT COUNT(*) FROM notes
WHERE card_id IN (SELECT id FROM cards WHERE list_id IN (SELECT id FROM lists WHERE board_id = 1));

-- Cartões por lista (comparar com estágios do Pipedrive)
SELECT l.name, COUNT(c.id) as total
FROM lists l
LEFT JOIN cards c ON l.id = c.list_id
WHERE l.board_id = 1
GROUP BY l.id, l.name
ORDER BY l.position;
```

---

**IMPORTANTE**: Teste SEMPRE em ambiente de desenvolvimento/staging antes de migrar produção!

---

**Última atualização**: 15/12/2025
**Próxima revisão**: Após primeira migração real
