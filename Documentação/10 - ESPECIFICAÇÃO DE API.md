# 10 - ESPECIFICAÇÃO DE API

## 1. INTRODUÇÃO

Este documento especifica todos os endpoints da API REST do HSGrowth CRM, incluindo métodos HTTP, parâmetros, respostas e exemplos.

**Base URL**: `https://api.hsgrowth.com/api/v1`

**Autenticação**: JWT Bearer Token ou Client Credentials

**Content-Type**: `application/json`

---

## 2. AUTENTICAÇÃO

### 2.1 Login (Vendedor)

**Endpoint**: `POST /auth/login`

**Descrição**: Autentica um vendedor com e-mail/username e senha.

**Request**:
```json
{
  \"email\": \"vendedor@empresa.com\",
  \"password\": \"SenhaForte123!\"
}
```

**Response (200 OK)**:
```json
{
  \"accessToken\": \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\",
  \"refreshToken\": \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\",
  \"user\": {
    \"id\": 1,
    \"email\": \"vendedor@empresa.com\",
    \"name\": \"João Silva\",
    \"role\": \"vendedor\"
  }
}
```

**Erros**:
- `400 Bad Request`: Email ou senha inválidos
- `401 Unauthorized`: Credenciais incorretas
- `429 Too Many Requests`: Muitas tentativas de login

---

### 2.2 Refresh Token

**Endpoint**: `POST /auth/refresh`

**Descrição**: Renova o access token usando o refresh token.

**Request**:
```json
{
  \"refreshToken\": \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\"
}
```

**Response (200 OK)**:
```json
{
  \"accessToken\": \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\"
}
```

---

### 2.3 Client Credentials (Sistema Externo)

**Endpoint**: `POST /auth/client-credentials`

**Descrição**: Autentica um sistema externo com Client ID e Client Secret.

**Request**:
```json
{
  \"client_id\": \"abc123def456\",
  \"client_secret\": \"xyz789uvw012\"
}
```

**Response (200 OK)**:
```json
{
  \"accessToken\": \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\",
  \"expiresIn\": 3600,
  \"tokenType\": \"Bearer\"
}
```

---

### 2.4 Logout

**Endpoint**: `POST /auth/logout`

**Descrição**: Faz logout do usuário, revogando o token.

**Headers**:
```
Authorization: Bearer <ACCESS_TOKEN>
```

**Response (200 OK)**:
```json
{
  \"message\": \"Logout successful\"
}
```

---

## 3. QUADROS (BOARDS)

### 3.1 Listar Quadros

**Endpoint**: `GET /boards`

**Descrição**: Lista todos os quadros da conta.

**Query Parameters**:
- `limit` (number, default: 20): Limite de resultados
- `offset` (number, default: 0): Deslocamento
- `search` (string): Buscar por nome
- `sort` (string, default: \"created_at\"): Campo para ordenação
- `order` (string, default: \"desc\"): Ordem (asc, desc)

**Response (200 OK)**:
```json
{
  \"data\": [
    {
      \"id\": 1,
      \"name\": \"Vendas Q1 2026\",
      \"description\": \"Oportunidades de vendas para Q1\",
      \"color\": \"#3498db\",
      \"type\": \"kanban\",
      \"cardCount\": 45,
      \"createdAt\": \"2025-12-08T10:00:00Z\",
      \"updatedAt\": \"2025-12-08T10:00:00Z\"
    }
  ],
  \"pagination\": {
    \"total\": 7,
    \"limit\": 20,
    \"offset\": 0
  }
}
```

---

### 3.2 Criar Quadro

**Endpoint**: `POST /boards`

**Descrição**: Cria um novo quadro.

**Request**:
```json
{
  \"name\": \"Vendas Q1 2026\",
  \"description\": \"Oportunidades de vendas para Q1\",
  \"color\": \"#3498db\",
  \"type\": \"kanban\"
}
```

**Response (201 Created)**:
```json
{
  \"id\": 1,
  \"name\": \"Vendas Q1 2026\",
  \"description\": \"Oportunidades de vendas para Q1\",
  \"color\": \"#3498db\",
  \"type\": \"kanban\",
  \"roundrobinEnabled\": false,
  \"createdAt\": \"2025-12-08T10:00:00Z\",
  \"updatedAt\": \"2025-12-08T10:00:00Z\"
}
```

---

### 3.3 Obter Quadro

**Endpoint**: `GET /boards/{id}`

**Descrição**: Obtém detalhes de um quadro específico.

**Response (200 OK)**:
```json
{
  \"id\": 1,
  \"name\": \"Vendas Q1 2026\",
  \"description\": \"Oportunidades de vendas para Q1\",
  \"color\": \"#3498db\",
  \"type\": \"kanban\",
  \"roundrobinEnabled\": false,
  \"lists\": [
    {
      \"id\": 1,
      \"name\": \"Prospectando\",
      \"color\": \"#e74c3c\",
      \"position\": 1,
      \"cardCount\": 10
    },
    {
      \"id\": 2,
      \"name\": \"Negociando\",
      \"color\": \"#f39c12\",
      \"position\": 2,
      \"cardCount\": 15
    },
    {
      \"id\": 3,
      \"name\": \"Fechado\",
      \"color\": \"#27ae60\",
      \"position\": 3,
      \"cardCount\": 20
    }
  ],
  \"customFields\": [
    {
      \"id\": 1,
      \"name\": \"Valor da Oportunidade\",
      \"type\": \"currency\",
      \"required\": true,
      \"position\": 1
    },
    {
      \"id\": 2,
      \"name\": \"Data de Vencimento\",
      \"type\": \"due_date\",
      \"required\": true,
      \"position\": 2
    }
  ],
  \"createdAt\": \"2025-12-08T10:00:00Z\",
  \"updatedAt\": \"2025-12-08T10:00:00Z\"
}
```

---

### 3.4 Atualizar Quadro

**Endpoint**: `PUT /boards/{id}`

**Descrição**: Atualiza um quadro existente.

**Request**:
```json
{
  \"name\": \"Vendas Q1 2026 - Atualizado\",
  \"description\": \"Oportunidades atualizadas\",
  \"color\": \"#2ecc71\",
  \"roundrobinEnabled\": true
}
```

**Response (200 OK)**:
```json
{
  \"id\": 1,
  \"name\": \"Vendas Q1 2026 - Atualizado\",
  \"description\": \"Oportunidades atualizadas\",
  \"color\": \"#2ecc71\",
  \"type\": \"kanban\",
  \"roundrobinEnabled\": true,
  \"updatedAt\": \"2025-12-08T11:00:00Z\"
}
```

---

### 3.5 Deletar Quadro

**Endpoint**: `DELETE /boards/{id}`

**Descrição**: Deleta um quadro e todos seus cartões.

**Response (204 No Content)**

---

## 4. CAMPOS CUSTOMIZADOS

### 4.1 Criar Campo Customizado

**Endpoint**: `POST /boards/{boardId}/custom-fields`

**Descrição**: Cria um novo campo customizado para um quadro.

**Request**:
```json
{
  \"name\": \"Valor da Oportunidade\",
  \"type\": \"currency\",
  \"description\": \"Valor estimado da oportunidade\",
  \"required\": true,
  \"defaultValue\": \"0\",
  \"options\": null
}
```

**Tipos de Campo Permitidos**:
- `text`: Texto livre
- `email`: Email
- `document`: Documento (CPF, CNPJ)
- `date`: Data
- `datetime`: Data e Hora
- `time`: Hora
- `due_date`: Data de Vencimento
- `currency`: Moeda
- `number`: Número
- `select`: Seleção
- `checkbox`: Checkbox
- `user`: Usuário
- `attachment`: Anexo
- `tag`: Etiqueta

**Response (201 Created)**:
```json
{
  \"id\": 1,
  \"boardId\": 1,
  \"name\": \"Valor da Oportunidade\",
  \"type\": \"currency\",
  \"description\": \"Valor estimado da oportunidade\",
  \"required\": true,
  \"defaultValue\": \"0\",
  \"position\": 1,
  \"createdAt\": \"2025-12-08T10:00:00Z\"
}
```

---

### 4.2 Listar Campos Customizados

**Endpoint**: `GET /boards/{boardId}/custom-fields`

**Response (200 OK)**:
```json
{
  \"data\": [
    {
      \"id\": 1,
      \"name\": \"Valor da Oportunidade\",
      \"type\": \"currency\",
      \"required\": true,
      \"position\": 1
    },
    {
      \"id\": 2,
      \"name\": \"Data de Vencimento\",
      \"type\": \"due_date\",
      \"required\": true,
      \"position\": 2
    }
  ]
}
```

---

### 4.3 Atualizar Campo Customizado

**Endpoint**: `PUT /boards/{boardId}/custom-fields/{fieldId}`

**Request**:
```json
{
  \"name\": \"Valor da Oportunidade (Atualizado)\",
  \"description\": \"Valor estimado em reais\",
  \"required\": false,
  \"defaultValue\": \"1000\"
}
```

**Response (200 OK)**

---

### 4.4 Deletar Campo Customizado

**Endpoint**: `DELETE /boards/{boardId}/custom-fields/{fieldId}`

**Response (204 No Content)**

---

## 5. CARTÕES (CARDS)

### 5.1 Listar Cartões

**Endpoint**: `GET /boards/{boardId}/cards`

**Query Parameters**:
- `listId` (number): Filtrar por lista
- `assignedTo` (number): Filtrar por responsável
- `search` (string): Buscar por texto
- `tags` (string[]): Filtrar por etiquetas
- `limit` (number, default: 50): Limite de resultados
- `offset` (number, default: 0): Deslocamento

**Response (200 OK)**:
```json
{
  \"data\": [
    {
      \"id\": 1,
      \"title\": \"Contato com Empresa XYZ\",
      \"description\": \"Primeira reunião marcada para segunda\",
      \"listId\": 1,
      \"assignedTo\": 5,
      \"position\": 1,
      \"fieldValues\": [
        {
          \"fieldId\": 1,
          \"fieldName\": \"Valor da Oportunidade\",
          \"value\": \"50000\"
        },
        {
          \"fieldId\": 2,
          \"fieldName\": \"Data de Vencimento\",
          \"value\": \"2025-12-31\"
        }
      ],
      \"tags\": [\"importante\", \"cliente-novo\"],
      \"createdAt\": \"2025-12-08T10:00:00Z\",
      \"updatedAt\": \"2025-12-08T10:00:00Z\"
    }
  ],
  \"pagination\": {
    \"total\": 45,
    \"limit\": 50,
    \"offset\": 0
  }
}
```

---

### 5.2 Criar Cartão

**Endpoint**: `POST /boards/{boardId}/cards`

**Request**:
```json
{
  \"title\": \"Contato com Empresa XYZ\",
  \"description\": \"Primeira reunião marcada para segunda\",
  \"listId\": 1,
  \"assignedTo\": 5,
  \"fieldValues\": [
    {
      \"fieldId\": 1,
      \"value\": \"50000\"
    },
    {
      \"fieldId\": 2,
      \"value\": \"2025-12-31\"
    }
  ],
  \"tags\": [\"importante\", \"cliente-novo\"]
}
```

**Response (201 Created)**:
```json
{
  \"id\": 1,
  \"title\": \"Contato com Empresa XYZ\",
  \"description\": \"Primeira reunião marcada para segunda\",
  \"listId\": 1,
  \"assignedTo\": 5,
  \"position\": 1,
  \"fieldValues\": [...],
  \"tags\": [...],
  \"createdAt\": \"2025-12-08T10:00:00Z\",
  \"updatedAt\": \"2025-12-08T10:00:00Z\"
}
```

---

### 5.3 Obter Cartão

**Endpoint**: `GET /boards/{boardId}/cards/{cardId}`

**Response (200 OK)**:
```json
{
  \"id\": 1,
  \"title\": \"Contato com Empresa XYZ\",
  \"description\": \"Primeira reunião marcada para segunda\",
  \"listId\": 1,
  \"assignedTo\": 5,
  \"fieldValues\": [...],
  \"tags\": [...],
  \"notes\": [
    {
      \"id\": 1,
      \"content\": \"Cliente interessado em pacote premium\",
      \"userId\": 5,
      \"userName\": \"João Silva\",
      \"createdAt\": \"2025-12-08T10:30:00Z\"
    }
  ],
  \"attachments\": [
    {
      \"id\": 1,
      \"filename\": \"proposta.pdf\",
      \"fileSize\": 102400,
      \"uploadedAt\": \"2025-12-08T10:15:00Z\"
    }
  ],
  \"activities\": [
    {
      \"id\": 1,
      \"type\": \"created\",
      \"description\": \"Cartão criado\",
      \"userId\": 5,
      \"userName\": \"João Silva\",
      \"createdAt\": \"2025-12-08T10:00:00Z\"
    }
  ],
  \"createdAt\": \"2025-12-08T10:00:00Z\",
  \"updatedAt\": \"2025-12-08T10:00:00Z\"
}
```

---

### 5.4 Atualizar Cartão

**Endpoint**: `PUT /boards/{boardId}/cards/{cardId}`

**Request**:
```json
{
  \"title\": \"Contato com Empresa XYZ - Atualizado\",
  \"description\": \"Reunião confirmada para segunda às 10h\",
  \"assignedTo\": 6,
  \"fieldValues\": [
    {
      \"fieldId\": 1,
      \"value\": \"75000\"
    }
  ]
}
```

**Response (200 OK)**

---

### 5.5 Mover Cartão

**Endpoint**: `PUT /boards/{boardId}/cards/{cardId}/move`

**Request**:
```json
{
  \"listId\": 2,
  \"position\": 5
}
```

**Response (200 OK)**:
```json
{
  \"id\": 1,
  \"listId\": 2,
  \"position\": 5,
  \"movedAt\": \"2025-12-08T11:00:00Z\"
}
```

---

### 5.6 Deletar Cartão

**Endpoint**: `DELETE /boards/{boardId}/cards/{cardId}`

**Response (204 No Content)**

---

### 5.7 Importar Cartões via API

**Endpoint**: `POST /cards/import`

**Descrição**: Importa múltiplos cartões de uma vez.

**Request**:
```json
{
  \"boardId\": 1,
  \"cards\": [
    {
      \"title\": \"Empresa A\",
      \"description\": \"Lead do website\",
      \"listId\": 1,
      \"assignedTo\": null,
      \"fieldValues\": [
        {
          \"fieldId\": 1,
          \"value\": \"25000\"
        }
      ]
    },
    {
      \"title\": \"Empresa B\",
      \"description\": \"Referência de cliente\",
      \"listId\": 1,
      \"assignedTo\": null,
      \"fieldValues\": [
        {
          \"fieldId\": 1,
          \"value\": \"35000\"
        }
      ]
    }
  ]
}
```

**Response (201 Created)**:
```json
{
  \"importedCount\": 2,
  \"failedCount\": 0,
  \"cardIds\": [1, 2],
  \"errors\": []
}
```

---

## 6. RELATÓRIOS E KPIs

### 6.1 Obter KPIs

**Endpoint**: `GET /reports/kpis`

**Query Parameters**:
- `boardId` (number): Filtrar por quadro
- `period` (string): Período (today, week, month, year)
- `startDate` (date): Data inicial (YYYY-MM-DD)
- `endDate` (date): Data final (YYYY-MM-DD)

**Response (200 OK)**:
```json
{
  \"cardsCreated\": {
    \"today\": 5,
    \"week\": 25,
    \"month\": 100
  },
  \"cardsCompleted\": {
    \"today\": 2,
    \"week\": 12,
    \"month\": 50
  },
  \"cardsOverdue\": 3,
  \"completionRate\": 95,
  \"averageCompletionTime\": 5.2,
  \"averageTimePerPhase\": {
    \"prospecting\": 2.1,
    \"negotiating\": 2.5,
    \"closed\": 0.6
  },
  \"cardsByUser\": [
    {
      \"userId\": 5,
      \"userName\": \"João Silva\",
      \"cardsCreated\": 20,
      \"cardsCompleted\": 18,
      \"completionRate\": 90
    }
  ]
}
```

---

### 6.2 Exportar Relatório

**Endpoint**: `GET /reports/export`

**Query Parameters**:
- `format` (string): Formato (pdf, excel, csv)
- `boardId` (number): Filtrar por quadro
- `period` (string): Período

**Response (200 OK)**:
- Content-Type: application/pdf (ou application/vnd.ms-excel, text/csv)
- Body: Arquivo binário

---

## 7. AUDITORIA

### 7.1 Listar Logs de Auditoria

**Endpoint**: `GET /admin/audit-logs`

**Query Parameters**:
- `userId` (number): Filtrar por usuário
- `action` (string): Filtrar por ação
- `tableName` (string): Filtrar por tabela
- `startDate` (date): Data inicial
- `endDate` (date): Data final
- `limit` (number, default: 50): Limite
- `offset` (number, default: 0): Deslocamento

**Response (200 OK)**:
```json
{
  \"data\": [
    {
      \"id\": 1,
      \"userId\": 5,
      \"userName\": \"João Silva\",
      \"action\": \"create\",
      \"tableName\": \"cards\",
      \"recordId\": 123,
      \"oldValues\": null,
      \"newValues\": {
        \"title\": \"Novo Cartão\",
        \"listId\": 1
      },
      \"ipAddress\": \"192.168.1.1\",
      \"createdAt\": \"2025-12-08T10:00:00Z\"
    }
  ],
  \"pagination\": {
    \"total\": 1000,
    \"limit\": 50,
    \"offset\": 0
  }
}
```

---

## 8. USUÁRIOS

### 8.1 Listar Usuários

**Endpoint**: `GET /admin/users`

**Response (200 OK)**:
```json
{
  \"data\": [
    {
      \"id\": 1,
      \"email\": \"admin@empresa.com\",
      \"name\": \"Administrador\",
      \"role\": \"admin\",
      \"status\": \"active\",
      \"lastLoginAt\": \"2025-12-08T10:00:00Z\",
      \"createdAt\": \"2025-12-01T00:00:00Z\"
    },
    {
      \"id\": 5,
      \"email\": \"vendedor@empresa.com\",
      \"name\": \"João Silva\",
      \"role\": \"vendedor\",
      \"status\": \"active\",
      \"lastLoginAt\": \"2025-12-08T09:30:00Z\",
      \"createdAt\": \"2025-12-05T00:00:00Z\"
    }
  ]
}
```

---

### 8.2 Criar Usuário

**Endpoint**: `POST /admin/users`

**Request**:
```json
{
  \"email\": \"novo.vendedor@empresa.com\",
  \"name\": \"Novo Vendedor\",
  \"role\": \"vendedor\"
}
```

**Response (201 Created)**:
```json
{
  \"id\": 10,
  \"email\": \"novo.vendedor@empresa.com\",
  \"name\": \"Novo Vendedor\",
  \"role\": \"vendedor\",
  \"status\": \"active\",
  \"createdAt\": \"2025-12-08T10:00:00Z\"
}
```

---

### 8.3 Atualizar Usuário

**Endpoint**: `PUT /admin/users/{userId}`

**Request**:
```json
{
  \"name\": \"João Silva Atualizado\",
  \"role\": \"gerente\",
  \"status\": \"inactive\"
}
```

**Response (200 OK)**

---

### 8.4 Deletar Usuário

**Endpoint**: `DELETE /admin/users/{userId}`

**Response (204 No Content)**

---

## 9. NOTIFICAÇÕES

### 9.1 Listar Notificações

**Endpoint**: `GET /notifications`

**Query Parameters**:
- `unreadOnly` (boolean, default: false): Apenas não lidas
- `limit` (number, default: 20): Limite

**Response (200 OK)**:
```json
{
  \"data\": [
    {
      \"id\": 1,
      \"type\": \"card_assigned\",
      \"title\": \"Novo cartão atribuído\",
      \"message\": \"Você recebeu um novo cartão: Empresa ABC\",
      \"cardId\": 123,
      \"read\": false,
      \"createdAt\": \"2025-12-08T10:00:00Z\"
    }
  ]
}
```

---

### 9.2 Marcar Notificação como Lida

**Endpoint**: `PUT /notifications/{notificationId}/read`

**Response (200 OK)**

---

## 10. CÓDIGOS DE ERRO

| Código | Mensagem | Descrição |
|--------|----------|----------|
| 400 | Bad Request | Requisição inválida |
| 401 | Unauthorized | Não autenticado |
| 403 | Forbidden | Sem permissão |
| 404 | Not Found | Recurso não encontrado |
| 409 | Conflict | Conflito (ex: duplicata) |
| 422 | Unprocessable Entity | Dados inválidos |
| 429 | Too Many Requests | Rate limit atingido |
| 500 | Internal Server Error | Erro do servidor |
| 503 | Service Unavailable | Serviço indisponível |

---

## 11. RATE LIMITING

- **Login**: 5 tentativas por 15 minutos
- **API Geral**: 100 requisições por minuto por token
- **Busca**: 10 requisições por segundo por usuário
- **Importação**: 1 por hora por conta

**Headers de Rate Limit**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1702032600
```

---

## 12. PAGINAÇÃO

Todos os endpoints que retornam listas suportam paginação:

**Query Parameters**:
- `limit` (number, default: 20, max: 100): Limite de resultados
- `offset` (number, default: 0): Deslocamento

**Response**:
```json
{
  \"data\": [...],
  \"pagination\": {
    \"total\": 1000,
    \"limit\": 20,
    \"offset\": 0,
    \"hasMore\": true
  }
}
```

---

## 13. SQL DIRETO (ADMIN)

### 13.1 Executar Query SQL

**Endpoint**: `POST /admin/sql/execute`

**Descrição**: Executa query SQL direta no banco de dados (apenas Admin).

**Request**:
```json
{
  "query": "SELECT id, title, assignedTo FROM cards WHERE listId = 5 LIMIT 100"
}
```

**Validações de Segurança**:
- Apenas comandos SELECT permitidos
- Timeout de 30 segundos
- Limite de 1000 linhas retornadas
- Whitelist de tabelas permitidas

**Response (200 OK)**:
```json
{
  "columns": ["id", "title", "assignedTo"],
  "rows": [
    [123, "Cliente ABC", 5],
    [124, "Cliente XYZ", 6]
  ],
  "rowCount": 2,
  "executionTime": 45,
  "message": "Query executada com sucesso"
}
```

**Erros**:
- `400`: Query inválida (não é SELECT)
- `403`: Permissão negada (não é Admin)
- `408`: Timeout (> 30s)
- `422`: Query SQL com erro de sintaxe

---

### 13.2 Validar Query SQL

**Endpoint**: `POST /admin/sql/validate`

**Descrição**: Valida query SQL sem executar (preview).

**Request**:
```json
{
  "query": "SELECT * FROM cards WHERE listId = 5"
}
```

**Response (200 OK)**:
```json
{
  "valid": true,
  "estimatedRows": 45,
  "warnings": [
    "Query retornará todas as colunas (*), considere especificar colunas"
  ]
}
```

---

## 14. DUPLICAÇÃO

### 14.1 Duplicar Quadro

**Endpoint**: `POST /boards/{id}/duplicate`

**Descrição**: Duplica um quadro completo.

**Request**:
```json
{
  "newName": "Vendas Q2 2026 (Cópia)",
  "includeCards": false,
  "includeCustomFields": true,
  "includeLists": true
}
```

**Response (201 Created)**:
```json
{
  "id": 10,
  "originalBoardId": 1,
  "name": "Vendas Q2 2026 (Cópia)",
  "listsCount": 5,
  "customFieldsCount": 8,
  "cardsCount": 0,
  "message": "Quadro duplicado com sucesso"
}
```

---

### 14.2 Duplicar Lista

**Endpoint**: `POST /boards/{boardId}/lists/{listId}/duplicate`

**Descrição**: Duplica uma lista dentro do mesmo quadro.

**Request**:
```json
{
  "newName": "Prospectando (Cópia)",
  "includeCards": true
}
```

**Response (201 Created)**:
```json
{
  "id": 25,
  "originalListId": 1,
  "name": "Prospectando (Cópia)",
  "position": 6,
  "cardsCount": 15,
  "message": "Lista duplicada com sucesso"
}
```

---

## 15. RODÍZIO

### 15.1 Configurar Rodízio no Quadro

**Endpoint**: `PUT /boards/{id}/roundrobin/config`

**Descrição**: Ativa/configura rodízio automático em um quadro.

**Request**:
```json
{
  "enabled": true,
  "strategy": "balanced",
  "targetListId": 1,
  "eligibleUsers": [5, 6, 7, 8]
}
```

**Estratégias**:
- `balanced`: Balanceamento de carga (vendedor com menos cartões ativos)
- `sequential`: Ordem sequencial (round-robin tradicional)

**Response (200 OK)**:
```json
{
  "boardId": 1,
  "roundrobinEnabled": true,
  "strategy": "balanced",
  "targetListId": 1,
  "eligibleUsers": [5, 6, 7, 8],
  "message": "Rodízio configurado com sucesso"
}
```

---

### 15.2 Obter Próximo Vendedor (Rodízio)

**Endpoint**: `GET /boards/{id}/roundrobin/next-user`

**Descrição**: Obtém o próximo vendedor que receberá um cartão no rodízio.

**Response (200 OK)**:
```json
{
  "userId": 5,
  "userName": "João Silva",
  "currentCardCount": 12,
  "reason": "Vendedor com menor número de cartões ativos"
}
```

---

### 15.3 Distribuir Cartão Manualmente

**Endpoint**: `POST /boards/{boardId}/cards/{cardId}/auto-assign`

**Descrição**: Atribui cartão usando regras de rodízio.

**Response (200 OK)**:
```json
{
  "cardId": 123,
  "assignedTo": 5,
  "assignedUser": "João Silva",
  "method": "roundrobin",
  "message": "Cartão atribuído automaticamente"
}
```

---

## 16. VISUALIZAÇÕES SALVAS

### 16.1 Criar Visualização Salva

**Endpoint**: `POST /boards/{boardId}/views`

**Descrição**: Salva uma visualização personalizada (filtros, ordenação).

**Request**:
```json
{
  "name": "Meus Cartões de Alto Valor",
  "description": "Cartões > R$ 10.000 atribuídos a mim",
  "filters": {
    "assignedTo": "me",
    "fieldFilters": [
      {
        "fieldId": 1,
        "operator": ">",
        "value": "10000"
      }
    ]
  },
  "sort": {
    "field": "due_date",
    "order": "asc"
  },
  "isPublic": false
}
```

**Response (201 Created)**:
```json
{
  "id": 1,
  "name": "Meus Cartões de Alto Valor",
  "boardId": 1,
  "userId": 5,
  "isPublic": false,
  "createdAt": "2025-12-10T14:30:00Z"
}
```

---

### 16.2 Listar Visualizações Salvas

**Endpoint**: `GET /boards/{boardId}/views`

**Query Parameters**:
- `includePublic` (boolean, default: true): Incluir visualizações públicas

**Response (200 OK)**:
```json
{
  "views": [
    {
      "id": 1,
      "name": "Meus Cartões de Alto Valor",
      "description": "Cartões > R$ 10.000 atribuídos a mim",
      "userId": 5,
      "userName": "João Silva",
      "isPublic": false,
      "createdAt": "2025-12-10T14:30:00Z"
    }
  ]
}
```

---

### 16.3 Aplicar Visualização Salva

**Endpoint**: `GET /boards/{boardId}/cards?viewId={viewId}`

**Descrição**: Aplica visualização salva aos cartões.

**Response (200 OK)**:
```json
{
  "viewId": 1,
  "viewName": "Meus Cartões de Alto Valor",
  "data": [
    {
      "id": 123,
      "title": "Cliente ABC",
      "assignedTo": 5,
      "fieldValues": [...]
    }
  ],
  "pagination": {...}
}
```

---

### 16.4 Atualizar Visualização Salva

**Endpoint**: `PUT /boards/{boardId}/views/{viewId}`

**Request**: Mesmo formato do POST

**Response (200 OK)**

---

### 16.5 Deletar Visualização Salva

**Endpoint**: `DELETE /boards/{boardId}/views/{viewId}`

**Response (204 No Content)**

---

## 17. GAMIFICAÇÃO

### 17.1 Obter Pontos do Usuário

**Endpoint**: `GET /api/gamification/points/:user_id`

**Descrição**: Obtém histórico de pontos de um usuário.

**Query Parameters**:
- `limit` (number, default: 50): Limite de resultados
- `offset` (number, default: 0): Deslocamento

**Response (200 OK)**:
```json
{
  "user_id": 123,
  "total_points": 1450,
  "points_history": [
    {
      "id": 1,
      "action_type": "fechar_venda",
      "points": 150,
      "description": "Venda #12345 fechada",
      "created_at": "2025-12-10T14:30:00Z"
    }
  ],
  "pagination": {
    "total": 45,
    "limit": 50,
    "offset": 0
  }
}
```

---

### 17.2 Obter Ranking

**Endpoint**: `GET /api/gamification/ranking`

**Descrição**: Obtém ranking de vendedores por período.

**Query Parameters**:
- `period` (string, required): 'weekly', 'monthly', 'quarterly', 'annual'
- `year` (number, optional): Ano do ranking
- `period_number` (number, optional): Número do período (semana/mês/trimestre)

**Response (200 OK)**:
```json
{
  "period": "monthly",
  "year": 2025,
  "month": 12,
  "rankings": [
    {
      "rank": 1,
      "user_id": 123,
      "user_name": "João Silva",
      "user_photo": "https://...",
      "total_points": 2500,
      "badge": "🥇"
    },
    {
      "rank": 2,
      "user_id": 124,
      "user_name": "Maria Santos",
      "user_photo": "https://...",
      "total_points": 2300,
      "badge": "🥈"
    }
  ]
}
```

---

### 17.3 Obter Badges do Usuário

**Endpoint**: `GET /api/gamification/badges/:user_id`

**Descrição**: Obtém badges conquistadas pelo usuário.

**Response (200 OK)**:
```json
{
  "user_id": 123,
  "badges": [
    {
      "id": 1,
      "name": "Vendedor do Mês",
      "description": "Maior pontuação do mês",
      "icon": "🏆",
      "earned_at": "2025-12-01T00:00:00Z"
    }
  ],
  "total_badges": 5
}
```

---

### 17.4 Listar Todas as Badges

**Endpoint**: `GET /api/gamification/badges`

**Descrição**: Lista todas as badges disponíveis.

**Response (200 OK)**:
```json
{
  "badges": [
    {
      "id": 1,
      "name": "Vendedor do Mês",
      "description": "Maior pontuação do mês",
      "criteria": "Ser #1 no ranking mensal",
      "icon": "🏆",
      "points_required": 0,
      "is_active": true
    }
  ]
}
```

---

### 17.5 Configurar Pontos por Ação

**Endpoint**: `PUT /api/gamification/config/points`

**Descrição**: Admin configura quantos pontos cada ação vale.

**Request**:
```json
{
  "criar_lead": 10,
  "primeiro_contato": 15,
  "enviar_proposta": 25,
  "fechar_venda": 100,
  "transferir_cartao": 25
}
```

**Response (200 OK)**:
```json
{
  "message": "Configuração salva com sucesso",
  "config": { ... }
}
```

---

### 17.6 Criar Badge Customizada (Admin)

**Endpoint**: `POST /api/gamification/badges`

**Descrição**: Admin cria nova badge customizada.

**Request**:
```json
{
  "name": "Black Friday Master",
  "description": "Maior vendedor durante Black Friday 2025",
  "icon": "🛍️",
  "criteria_type": "manual",
  "criteria": null,
  "is_active": true
}
```

**Response (201 Created)**:
```json
{
  "id": 15,
  "account_id": 1,
  "name": "Black Friday Master",
  "description": "Maior vendedor durante Black Friday 2025",
  "icon": "🛍️",
  "criteria_type": "manual",
  "is_custom": true,
  "is_active": true,
  "created_by": 1,
  "created_at": "2025-12-15T10:00:00Z"
}
```

**Validações**:
- Nome: 3-50 caracteres, único por conta
- Descrição: máximo 200 caracteres
- criteria_type: 'manual' ou 'automatic'
- Se automatic: criteria obrigatório

**Erros**:
- `400`: Validação falhou
- `403`: Apenas Admin pode criar badges
- `409`: Nome já existe nesta conta

---

### 17.7 Listar Badges (Padrão + Customizadas)

**Endpoint**: `GET /api/gamification/badges`

**Descrição**: Lista todas as badges (padrão do sistema + customizadas da conta).

**Query Parameters**:
- `is_custom` (boolean, optional): Filtrar por customizadas
- `is_active` (boolean, optional): Filtrar por ativas/inativas
- `criteria_type` (string, optional): 'manual' ou 'automatic'

**Response (200 OK)**:
```json
{
  "badges": [
    {
      "id": 1,
      "name": "Vendedor do Mês",
      "description": "1º lugar no ranking mensal",
      "icon": "🏆",
      "criteria": "rank = 1 AND period = 'monthly'",
      "criteria_type": "automatic",
      "is_custom": false,
      "is_active": true
    },
    {
      "id": 15,
      "name": "Black Friday Master",
      "description": "Maior vendedor durante Black Friday 2025",
      "icon": "🛍️",
      "criteria_type": "manual",
      "is_custom": true,
      "is_active": true,
      "created_by": 1,
      "created_at": "2025-12-15T10:00:00Z"
    }
  ],
  "total": 12,
  "system_badges": 6,
  "custom_badges": 6
}
```

---

### 17.8 Atualizar Badge Customizada (Admin)

**Endpoint**: `PUT /api/gamification/badges/:id`

**Descrição**: Admin atualiza badge customizada.

**Request**:
```json
{
  "name": "Black Friday Champion",
  "description": "Top vendedor Black Friday 2025",
  "icon": "🏅",
  "is_active": false
}
```

**Response (200 OK)**:
```json
{
  "id": 15,
  "name": "Black Friday Champion",
  "description": "Top vendedor Black Friday 2025",
  "icon": "🏅",
  "is_active": false,
  "updated_at": "2025-12-15T11:00:00Z"
}
```

**Validações**:
- Apenas badges customizadas (is_custom = true) podem ser editadas
- Não pode editar criteria_type (para evitar inconsistências)

**Erros**:
- `403`: Apenas Admin / Não pode editar badge padrão do sistema
- `404`: Badge não encontrada

---

### 17.9 Deletar Badge Customizada (Admin)

**Endpoint**: `DELETE /api/gamification/badges/:id`

**Descrição**: Admin deleta badge customizada (soft delete).

**Response (204 No Content)**

**Validações**:
- Apenas badges customizadas (is_custom = true) podem ser deletadas
- Soft delete: is_active = false (histórico mantido)
- Badges conquistadas por vendedores são mantidas

**Erros**:
- `403`: Apenas Admin / Não pode deletar badge padrão do sistema
- `404`: Badge não encontrada

---

### 17.10 Atribuir Badge Manualmente (Admin)

**Endpoint**: `POST /api/gamification/badges/:id/assign`

**Descrição**: Admin atribui badge manualmente a vendedor(es).

**Request**:
```json
{
  "user_ids": [123, 124, 125]
}
```

**Response (200 OK)**:
```json
{
  "badge_id": 15,
  "badge_name": "Black Friday Master",
  "assigned_to": [
    {
      "user_id": 123,
      "user_name": "João Silva",
      "status": "success"
    },
    {
      "user_id": 124,
      "user_name": "Maria Santos",
      "status": "already_has"
    },
    {
      "user_id": 125,
      "user_name": "Pedro Costa",
      "status": "success"
    }
  ],
  "success_count": 2,
  "already_had_count": 1,
  "notifications_sent": 2
}
```

**Validações**:
- Badge deve ter criteria_type = 'manual'
- Apenas Admin pode atribuir
- Sistema valida se vendedor já possui a badge (UNIQUE constraint)

**Erros**:
- `400`: Badge não é manual
- `403`: Apenas Admin pode atribuir badges
- `404`: Badge ou usuário não encontrado

---

### 17.11 Exportar Relatório de Gamificação (Admin)

**Endpoint**: `GET /api/gamification/reports/export`

**Descrição**: Admin exporta relatório de gamificação para uso externo (RH/Folha).

**Query Parameters**:
- `period` (string, required): 'weekly', 'monthly', 'quarterly', 'annual'
- `year` (number, required): Ano do relatório
- `period_number` (number, optional): Número do período (semana/mês/trimestre)
- `start_date` (date, optional): Data inicial customizada (YYYY-MM-DD)
- `end_date` (date, optional): Data final customizada (YYYY-MM-DD)
- `user_id` (number, optional): Filtrar por vendedor específico
- `format` (string, required): 'excel' ou 'csv'

**Response (200 OK)**:
- **Content-Type**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (Excel) ou `text/csv` (CSV)
- **Content-Disposition**: `attachment; filename="gamificacao_2025-12.xlsx"`
- **Body**: Arquivo binário

**Estrutura do Arquivo Exportado**:

| Vendedor      | Email                | Pontos | Ranking | Vendas Fechadas | Badges Conquistadas | Lista de Badges                          |
|---------------|---------------------|--------|---------|----------------|---------------------|------------------------------------------|
| João Silva    | joao@empresa.com    | 2500   | 1º      | 45             | 5                   | Vendedor do Mês, Top 3, 100 Vendas      |
| Maria Santos  | maria@empresa.com   | 2300   | 2º      | 42             | 4                   | Top 3, Velocidade, Trabalho em Equipe   |
| Pedro Costa   | pedro@empresa.com   | 2100   | 3º      | 38             | 3                   | Top 3, 100 Vendas                       |

**Headers Adicionais**:
- Linha 1: Título do relatório ("Relatório de Gamificação - Dezembro 2025")
- Linha 2: Período ("Período: 01/12/2025 a 31/12/2025")
- Linha 3: Data da exportação ("Exportado em: 15/12/2025 às 14:30")
- Linha 4: Vazia
- Linha 5: Cabeçalhos das colunas
- Linha 6+: Dados dos vendedores

**Validações**:
- Apenas Admin pode exportar relatórios
- Período e ano são obrigatórios (ou start_date + end_date)
- Formato deve ser 'excel' ou 'csv'

**Erros**:
- `400`: Parâmetros inválidos (período, formato, datas)
- `403`: Apenas Admin pode exportar relatórios
- `404`: Nenhum dado encontrado para o período

**Auditoria**:
- Exportação é registrada em `audit_logs` com ação "export_gamification_report"
- Log inclui: user_id, período, formato, timestamp

**Nota Importante**:
> ⚠️ **Sistema não calcula bônus ou comissões.**
> Este relatório exporta apenas dados de gamificação (pontos, rankings, badges) para que o RH/Folha de Pagamento calcule bônus externamente conforme política da empresa.

---

## 18. AUTOMAÇÕES

### 18.1 Listar Automações

**Endpoint**: `GET /api/automations`

**Descrição**: Lista todas as automações da conta (por gatilho e agendadas).

**Query Parameters**:
- `is_active` (boolean, optional): Filtrar por ativas/inativas
- `automation_type` (string, optional): Filtrar por tipo ("trigger" ou "scheduled")

**Response (200 OK)**:
```json
{
  "automations": [
    {
      "id": 1,
      "name": "Vendas -> Pós-venda",
      "description": "Move cartões fechados para quadro de pós-venda",
      "automation_type": "trigger",
      "priority": 80,
      "trigger_type": "card_moved",
      "trigger_board_id": 1,
      "trigger_list_id": 5,
      "action_type": "move_card",
      "action_board_id": 2,
      "action_list_id": 10,
      "is_active": true,
      "next_execution_at": null,
      "created_at": "2025-12-01T10:00:00Z"
    },
    {
      "id": 2,
      "name": "Relatório Semanal",
      "description": "Relatório de vendas toda segunda",
      "automation_type": "scheduled",
      "schedule_type": "recurring",
      "schedule_config": {
        "frequency": "weekly",
        "day_of_week": 1,
        "time": "09:00"
      },
      "priority": 60,
      "action_type": "notify",
      "action_board_id": 1,
      "is_active": true,
      "next_execution_at": "2025-12-22T09:00:00Z",
      "last_executed_at": "2025-12-15T09:00:00Z",
      "created_at": "2025-11-10T12:00:00Z"
    },
    {
      "id": 3,
      "name": "Relatório Mensal Janeiro",
      "description": "Enviar relatório de vendas do mês",
      "automation_type": "scheduled",
      "schedule_type": "once",
      "schedule_config": {
        "datetime": "2026-01-15T09:00:00Z"
      },
      "priority": 50,
      "action_type": "notify",
      "action_board_id": 1,
      "is_active": true,
      "next_execution_at": "2026-01-15T09:00:00Z",
      "last_executed_at": null,
      "created_at": "2025-12-10T14:00:00Z"
    }
  ],
  "summary": {
    "active_count": 45,
    "inactive_count": 12,
    "total_count": 57,
    "trigger_count": 40,
    "scheduled_count": 5,
    "limit": 50,
    "remaining": 5
  }
}
```

---

### 18.2 Criar Automação

**Endpoint**: `POST /api/automations`

**Descrição**: Cria nova automação (por gatilho ou agendada).

**Request - Automação por Gatilho (Trigger-based)**:
```json
{
  "name": "Vendas -> Pós-venda",
  "description": "Move cartões fechados para quadro de pós-venda",
  "automation_type": "trigger",
  "priority": 80,
  "trigger_type": "card_moved",
  "trigger_board_id": 1,
  "trigger_list_id": 5,
  "trigger_conditions": {
    "field_value": {
      "field_name": "valor",
      "operator": ">",
      "value": 1000
    }
  },
  "action_type": "move_card",
  "action_board_id": 2,
  "action_list_id": 10,
  "field_mapping": {
    "cliente": "cliente",
    "valor_venda": "valor_contrato"
  },
  "is_active": true
}
```

**Request - Automação Agendada - Execução Única**:
```json
{
  "name": "Relatório Mensal Janeiro",
  "description": "Enviar relatório de vendas do mês",
  "automation_type": "scheduled",
  "schedule_type": "once",
  "schedule_config": {
    "datetime": "2026-01-15T09:00:00Z"
  },
  "priority": 50,
  "action_type": "notify",
  "action_board_id": 1,
  "is_active": true
}
```

**Request - Automação Agendada - Execução Recorrente (Diária)**:
```json
{
  "name": "Lembretes Diários",
  "description": "Enviar lembretes de follow-up todo dia",
  "automation_type": "scheduled",
  "schedule_type": "recurring",
  "schedule_config": {
    "frequency": "daily",
    "time": "08:00"
  },
  "priority": 70,
  "action_type": "notify",
  "action_board_id": 1,
  "is_active": true
}
```

**Request - Automação Agendada - Execução Recorrente (Semanal)**:
```json
{
  "name": "Relatório Semanal",
  "description": "Relatório de vendas toda segunda",
  "automation_type": "scheduled",
  "schedule_type": "recurring",
  "schedule_config": {
    "frequency": "weekly",
    "day_of_week": 1,
    "time": "09:00"
  },
  "priority": 60,
  "action_type": "notify",
  "action_board_id": 1,
  "is_active": true
}
```

**Request - Automação Agendada - Execução Recorrente (Mensal)**:
```json
{
  "name": "Limpeza Mensal",
  "description": "Limpar leads inativos todo dia 1º",
  "automation_type": "scheduled",
  "schedule_type": "recurring",
  "schedule_config": {
    "frequency": "monthly",
    "day_of_month": 1,
    "time": "02:00"
  },
  "priority": 30,
  "action_type": "move_card",
  "action_board_id": 2,
  "action_list_id": 15,
  "is_active": true
}
```

**Campos**:
- `automation_type` (string, optional): Tipo de automação (padrão: "trigger")
  - `"trigger"`: Por Gatilho (executa quando evento ocorre)
  - `"scheduled"`: Agendada (executa em datas/horários)
- `priority` (number, optional): Prioridade de execução 1-100 (padrão: 50)
  - Alta (90-100): Notificações críticas, logs
  - Média (50-89): Movimentações, criações (padrão)
  - Baixa (1-49): Integrações externas

**Campos para Automações Agendadas**:
- `schedule_type` (string, obrigatório se automation_type = "scheduled"):
  - `"once"`: Execução única
  - `"recurring"`: Execução recorrente
- `schedule_config` (object, obrigatório se automation_type = "scheduled"):
  - Se `schedule_type = "once"`:
    - `datetime` (string ISO 8601): Data/hora única de execução
  - Se `schedule_type = "recurring"`:
    - `frequency` (string): "daily", "weekly", "monthly", "annual"
    - `time` (string "HH:mm"): Horário de execução (ex: "08:00")
    - `day_of_week` (number 1-7): Dia da semana (apenas weekly, 1=segunda)
    - `day_of_month` (number 1-31): Dia do mês (apenas monthly)
    - `month` (number 1-12): Mês (apenas annual)
    - `day` (number 1-31): Dia (apenas annual)

**Response (201 Created) - Automação por Gatilho**:
```json
{
  "id": 1,
  "name": "Vendas -> Pós-venda",
  "automation_type": "trigger",
  "priority": 80,
  "created_at": "2025-12-10T14:30:00Z",
  "active_automations": 46,
  "limit": 50,
  "message": "Automação criada com sucesso. Você tem 46/50 automações ativas."
}
```

**Response (201 Created) - Automação Agendada**:
```json
{
  "id": 2,
  "name": "Relatório Semanal",
  "automation_type": "scheduled",
  "schedule_type": "recurring",
  "next_execution_at": "2025-12-22T09:00:00Z",
  "priority": 60,
  "created_at": "2025-12-15T10:00:00Z",
  "active_automations": 47,
  "limit": 50,
  "message": "Automação agendada criada com sucesso. Próxima execução: 22/12/2025 às 09:00."
}
```

**Validações**:
- Nome é obrigatório (3-255 caracteres)
- action_type é obrigatório e válido
- **priority** (opcional): Inteiro entre 1 e 100. Se não informado, usa padrão 50
- **Limite de automações**: Máximo 50 automações ativas por conta (soma trigger + scheduled)

**Validações Específicas - Automações por Gatilho**:
- `trigger_type` é obrigatório e válido
- Quadros e listas devem existir
- `trigger_board_id` e `trigger_list_id` obrigatórios

**Validações Específicas - Automações Agendadas**:
- `schedule_type` é obrigatório ("once" ou "recurring")
- `schedule_config` é obrigatório e válido para o tipo escolhido
- Se `schedule_type = "once"`:
  - `datetime` obrigatório em formato ISO 8601
  - Data/hora deve ser no futuro
- Se `schedule_type = "recurring"`:
  - `frequency` obrigatório ("daily", "weekly", "monthly", "annual")
  - `time` obrigatório em formato "HH:mm"
  - Campos específicos obrigatórios conforme frequency:
    - weekly: `day_of_week` (1-7)
    - monthly: `day_of_month` (1-31)
    - annual: `month` (1-12) e `day` (1-31)
- Campos de trigger (`trigger_type`, `trigger_board_id`, `trigger_list_id`) devem ser NULL/omitidos

**Erros**:
- `400 Bad Request`: Validação falhou ou limite atingido
- `403 Forbidden`: Usuário não tem permissão para criar automações
- `404 Not Found`: Quadro ou lista não encontrada

**Erro de Limite Atingido**:
```json
{
  "error": "AUTOMATION_LIMIT_EXCEEDED",
  "message": "Limite de 50 automações ativas atingido. Desative automações existentes para criar novas.",
  "active_automations": 50,
  "limit": 50,
  "suggestion": "Desative automações desnecessárias em /automations"
}
```

---

### 18.3 Atualizar Automação

**Endpoint**: `PUT /api/automations/:id`

**Descrição**: Atualiza automação existente.

**Request**: Mesmo formato do POST

**Response (200 OK)**:
```json
{
  "id": 1,
  "message": "Automação atualizada com sucesso"
}
```

---

### 18.4 Deletar Automação

**Endpoint**: `DELETE /api/automations/:id`

**Descrição**: Deleta automação.

**Response (204 No Content)**

---

### 18.5 Ativar/Desativar Automação

**Endpoint**: `PATCH /api/automations/:id/toggle`

**Descrição**: Ativa ou desativa automação.

**Request**:
```json
{
  "is_active": false
}
```

**Response (200 OK)**:
```json
{
  "id": 1,
  "is_active": false,
  "message": "Automação desativada"
}
```

---

### 18.6 Testar Automação

**Endpoint**: `POST /api/automations/:id/test`

**Descrição**: Testa automação em modo preview (sem executar de verdade).

**Request**:
```json
{
  "card_id": 123
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "preview": {
    "source_card": { ... },
    "would_create_card": {
      "board_id": 2,
      "list_id": 10,
      "mapped_fields": { ... }
    },
    "warnings": []
  }
}
```

---

### 18.7 Histórico de Execuções

**Endpoint**: `GET /api/automations/:id/executions`

**Descrição**: Obtém histórico de execuções de uma automação.

**Query Parameters**:
- `status` (string, optional): 'success', 'failed', 'pending'
- `limit` (number, default: 50)
- `offset` (number, default: 0)

**Response (200 OK)**:
```json
{
  "executions": [
    {
      "id": 1,
      "automation_id": 1,
      "source_card_id": 123,
      "destination_card_id": 456,
      "status": "success",
      "executed_at": "2025-12-10T14:30:00Z"
    },
    {
      "id": 2,
      "automation_id": 1,
      "source_card_id": 124,
      "destination_card_id": null,
      "status": "failed",
      "error_message": "Campo 'cliente' não encontrado no cartão de origem",
      "executed_at": "2025-12-10T15:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

---

## 19. TRANSFERÊNCIA DE CARTÕES

### 19.1 Transferir Cartão

**Endpoint**: `POST /api/cards/:id/transfer`

**Descrição**: Transfere cartão para outro vendedor.

**Request**:
```json
{
  "to_user_id": 124,
  "transfer_reason": "Especialista",
  "notes": "Cliente precisa de especialista em integrações"
}
```

**Response (200 OK)**:
```json
{
  "card_id": 123,
  "from_user_id": 123,
  "to_user_id": 124,
  "transferred_at": "2025-12-10T14:30:00Z",
  "message": "Cartão transferido com sucesso"
}
```

**Erros**:
- `400`: Não pode transferir para si mesmo
- `403`: Sem permissão para transferir este cartão
- `422`: Cartão não pode ser transferido (status finalizado)

---

### 19.2 Histórico de Transferências do Cartão

**Endpoint**: `GET /api/cards/:id/transfer-history`

**Descrição**: Obtém histórico completo de transferências do cartão.

**Response (200 OK)**:
```json
{
  "card_id": 123,
  "original_owner": {
    "id": 120,
    "name": "João Silva",
    "photo": "https://..."
  },
  "current_owner": {
    "id": 124,
    "name": "Pedro Costa",
    "photo": "https://..."
  },
  "transfers": [
    {
      "id": 1,
      "from_user": {
        "id": 120,
        "name": "João Silva"
      },
      "to_user": {
        "id": 123,
        "name": "Maria Santos"
      },
      "transferred_by": {
        "id": 120,
        "name": "João Silva"
      },
      "transfer_reason": "Especialista",
      "notes": "Cliente precisa de especialista em software",
      "transferred_at": "2025-11-20T14:30:00Z",
      "days_with_previous_owner": 5
    },
    {
      "id": 2,
      "from_user": {
        "id": 123,
        "name": "Maria Santos"
      },
      "to_user": {
        "id": 124,
        "name": "Pedro Costa"
      },
      "transferred_by": {
        "id": 125,
        "name": "Gerente Carlos"
      },
      "transfer_reason": "Rebalanceamento",
      "notes": null,
      "transferred_at": "2025-11-25T09:15:00Z",
      "days_with_previous_owner": 5
    }
  ],
  "total_transfers": 2
}
```

---

### 19.3 Cartões Transferidos pelo Usuário

**Endpoint**: `GET /api/users/:id/transferred-cards`

**Descrição**: Lista cartões transferidos pelo usuário.

**Query Parameters**:
- `direction` (string): 'sent' (transferidos para outros) ou 'received' (recebidos de outros)
- `limit`, `offset`: Paginação

**Response (200 OK)**:
```json
{
  "user_id": 123,
  "transferred_to_others": 15,
  "received_from_others": 8,
  "cards": [
    {
      "card_id": 123,
      "card_title": "Cliente ABC",
      "transferred_to": {
        "id": 124,
        "name": "Maria Santos"
      },
      "transfer_reason": "Especialista",
      "transferred_at": "2025-12-01T10:00:00Z",
      "status": "Venda Fechada"
    }
  ],
  "pagination": { ... },
  "statistics": {
    "success_rate": 0.73,
    "avg_time_before_transfer_days": 7
  }
}
```

---

### 19.4 Relatório de Transferências

**Endpoint**: `GET /api/reports/transfers`

**Descrição**: Relatório completo de transferências (apenas Admin/Gerente).

**Query Parameters**:
- `start_date` (date): Data inicial
- `end_date` (date): Data final
- `user_id` (number, optional): Filtrar por usuário

**Response (200 OK)**:
```json
{
  "period": {
    "start_date": "2025-12-01",
    "end_date": "2025-12-31"
  },
  "total_transfers": 45,
  "by_reason": {
    "Especialista": 20,
    "Rebalanceamento": 15,
    "Férias": 5,
    "Escalação": 5
  },
  "by_user": [
    {
      "user_id": 123,
      "user_name": "João Silva",
      "transferred_out": 10,
      "received": 5,
      "success_rate": 0.80
    }
  ],
  "success_rate_overall": 0.75,
  "avg_transfer_chain_length": 2.3
}
```

---

### 19.5 Badges de Transferência

**Endpoint**: `GET /api/gamification/transfer-badges/:user_id`

**Descrição**: Obtém badges relacionadas a transferências do usuário.

**Response (200 OK)**:
```json
{
  "user_id": 123,
  "transfer_badges": [
    {
      "name": "Identificador de Oportunidades",
      "description": "10+ transferências bem-sucedidas",
      "earned_at": "2025-12-01T00:00:00Z"
    }
  ],
  "progress": {
    "trabalho_em_equipe": {
      "current": 8,
      "required": 10,
      "percentage": 80
    }
  }
}
```

---

**Versão**: 4.0
**Data**: 11 de Dezembro 2025
**Status**: Completo

