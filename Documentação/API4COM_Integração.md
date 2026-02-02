# Integração API4COM - HSGrowth CRM

## Visão Geral

A integração com API4COM permite que vendedores façam chamadas telefônicas diretamente do CRM, com rastreamento automático e gravação das ligações.

## Arquitetura

### Backend

#### Models (`backend/app/models/api4com.py`)

**API4ComConfig**
- Armazena credenciais e configuração da integração
- Campos: email, senha criptografada (Fernet), token, data de expiração
- Apenas uma configuração por sistema

**UserExtension**
- Vincula vendedores aos ramais da API4COM
- Cada vendedor tem um ramal único
- Campos: user_id, extension, is_active

**CallLog**
- Registra histórico de chamadas
- Campos: user_id, card_id, phone, extension, status, duration, recording_url, api4com_call_id
- Metadata inclui gateway="GrowthHS" e card_id para rastreamento

#### Repository (`backend/app/repositories/api4com_repository.py`)

**Métodos de Configuração:**
- `get_config()` - Retorna configuração ativa
- `create_config()` - Cria nova configuração
- `update_config()` - Atualiza configuração existente
- `update_token()` - Atualiza token após login
- `get_decrypted_password()` - Descriptografa senha para login

**Métodos de Ramais:**
- `list_extensions()` - Lista todos os ramais
- `get_extension_by_user()` - Busca ramal por user_id
- `create_extension()` - Cria novo ramal
- `update_extension()` - Atualiza ramal existente
- `delete_extension()` - Remove ramal

**Métodos de Chamadas:**
- `create_call_log()` - Cria registro quando chamada inicia
- `get_call_log_by_id()` - Busca por ID
- `get_call_log_by_api4com_id()` - Busca por ID da API4COM
- `update_call_log()` - Atualiza status, duração, gravação
- `list_call_logs_by_card()` - Lista chamadas de um card
- `list_call_logs_by_user()` - Lista chamadas de um vendedor

#### Client (`backend/app/services/api4com_client.py`)

**Métodos:**
- `login(email, password)` - Faz login e obtém token
- `test_connection()` - Verifica se token é válido
- `make_call(extension, phone, metadata)` - Inicia chamada via /dialer

#### Service (`backend/app/services/api4com_service.py`)

**Lógica de Negócio:**

1. **Configuração:**
   - `get_config()` - Retorna config com validação de token
   - `save_config()` - Salva credenciais e obtém token automaticamente
   - `test_connection()` - Testa token atual
   - `refresh_token()` - Renova token antes de expirar

2. **Ramais:**
   - `list_extensions()` - Lista com dados dos vendedores
   - `save_extension()` - Cria ou atualiza ramal
   - `delete_extension()` - Remove ramal

3. **Chamadas:**
   - `make_call(call_request, current_user)` - Valida e inicia chamada
     - Verifica configuração ativa
     - Verifica token válido
     - Verifica ramal do vendedor
     - Cria call_log
     - Chama API4COM com metadata
   - `process_webhook(webhook_data)` - Processa webhook quando chamada termina

#### Endpoints (`backend/app/api/v1/endpoints/api4com.py`)

**Configuração:**
- `GET /api/v1/api4com/config` - Retorna configuração (admin/manager)
- `POST /api/v1/api4com/config` - Salva configuração (admin)
- `POST /api/v1/api4com/test` - Testa conexão (admin/manager)

**Ramais:**
- `GET /api/v1/api4com/extensions` - Lista ramais (admin/manager)
- `POST /api/v1/api4com/extensions` - Salva ramal (admin/manager)
- `DELETE /api/v1/api4com/extensions/{user_id}` - Remove ramal (admin/manager)

**Chamadas:**
- `POST /api/v1/api4com/call` - Inicia chamada (qualquer usuário autenticado)
- `POST /api/v1/api4com/webhook` - Recebe webhook da API4COM (público)

### Frontend

#### Service (`frontend/src/services/api4comService.ts`)

**Métodos:**
- `getConfig()` - Busca configuração
- `saveConfig(email, password)` - Salva credenciais
- `testConnection()` - Testa token
- `listExtensions()` - Lista ramais
- `saveExtension(user_id, extension)` - Salva ramal
- `deleteExtension(user_id)` - Remove ramal
- `makeCall(phone, card_id)` - Inicia chamada

#### Componentes

**Settings.tsx**
- Aba "API4COM" (visível apenas para admin)
- Formulário de credenciais
- Gerenciamento de ramais dos vendedores
- Teste de conexão

**FocusSection.tsx**
- Seção "Foco" no CardDetails
- Lista atividades pendentes
- Botão "Ligar" aparece apenas em atividades tipo "call"
- Valida se pessoa tem phone_whatsapp cadastrado
- Chama api4comService.makeCall()

## Fluxo de Uso

### 1. Configuração Inicial (Admin)

1. Admin acessa **Configurações → API4COM**
2. Insere email e senha da conta API4COM
3. Sistema faz login automaticamente e armazena token
4. Token válido por ~14 dias

### 2. Configurar Ramais (Admin/Manager)

1. Na seção "Ramais dos Vendedores"
2. Seleciona vendedor no dropdown
3. Digita número do ramal (ex: 1000)
4. Salva
5. Ramal fica vinculado ao vendedor

### 3. Fazer Chamada (Vendedor)

1. Vendedor abre um card
2. Cria atividade do tipo "Ligação"
3. Atividade aparece na seção "Foco"
4. Expande atividade
5. Clica no botão "Ligar" (verde)
6. Sistema:
   - Busca phone_whatsapp da pessoa vinculada ao card
   - Cria registro em call_logs (status=pending)
   - Chama API4COM passando metadata (gateway, card_id)
   - Webphone abre automaticamente no PC do vendedor
   - Chamada é iniciada

### 4. Processamento do Webhook

1. Quando chamada termina, API4COM envia webhook para:
   ```
   POST /api/v1/api4com/webhook
   ```

2. Webhook contém:
   - ID da chamada
   - Duração em segundos
   - Status (completed, failed, no_answer)
   - URL da gravação
   - Metadata (gateway, card_id, user_id)

3. Sistema atualiza call_logs com dados finais

## Metadata Personalizada

Toda chamada envia metadata para rastreamento:

```json
{
  "gateway": "GrowthHS",
  "card_id": 4530,
  "user_id": 123,
  "call_log_id": 456
}
```

Isso permite:
- Identificar origem da chamada (HSGrowth)
- Vincular chamada ao card correto
- Associar transcrições futuramente
- Rastrear qual vendedor fez a chamada

## Segurança

### Criptografia de Senha

- Senha da API4COM é criptografada usando **Fernet** (criptografia reversível)
- Necessário para fazer login automático na API4COM
- Chave armazenada em variável de ambiente: `API4COM_ENCRYPTION_KEY`
- **IMPORTANTE:** Em produção, usar chave forte e segura

### Permissões

**Admin:**
- Configurar credenciais API4COM
- Gerenciar ramais de todos vendedores
- Testar conexão

**Manager:**
- Gerenciar ramais
- Testar conexão
- Ver configuração (sem senha)

**Vendedor:**
- Fazer chamadas (se tiver ramal configurado)
- Ver apenas suas próprias chamadas

### Webhook

- Endpoint público (sem autenticação)
- Apenas atualiza call_logs existentes
- Não cria novos registros
- Validação por api4com_call_id

## Banco de Dados

### Tabelas

**api4com_config**
```sql
- id (PK)
- email (varchar)
- password_encrypted (text)
- api_token (text)
- token_expires_at (timestamp)
- is_active (boolean)
- last_test_at (timestamp)
- last_test_success (boolean)
- last_test_error (text)
- created_at, updated_at
- created_by_id, updated_by_id (FK users)
```

**user_extensions**
```sql
- id (PK)
- user_id (FK users, unique)
- extension (varchar, unique)
- is_active (boolean)
- created_at, updated_at
```

**call_logs**
```sql
- id (PK)
- user_id (FK users)
- card_id (FK cards)
- phone (varchar)
- extension (varchar)
- status (varchar) - pending, ringing, completed, failed, no_answer
- duration (integer) - segundos
- recording_url (text)
- api4com_call_id (varchar, unique)
- error_message (text)
- call_metadata (text) - JSON
- created_at, updated_at
```

## Troubleshooting

### "API4COM não está configurada ou ativa"

**Causa:** Configuração não existe ou token expirou

**Solução:**
1. Admin acessa Configurações → API4COM
2. Insere credenciais novamente
3. Sistema obtém novo token

### "Você não tem ramal configurado"

**Causa:** Vendedor não tem ramal vinculado

**Solução:**
1. Admin/Manager acessa Configurações → API4COM
2. Na seção "Ramais", vincula ramal ao vendedor

### "Pessoa não possui número de WhatsApp cadastrado"

**Causa:** Campo phone_whatsapp vazio na pessoa

**Solução:**
1. Editar pessoa vinculada ao card
2. Preencher campo "WhatsApp"
3. Salvar

### Token expirado

**Automático:** Sistema renova token automaticamente quando falta menos de 24h para expirar

**Manual:** Admin pode reconfigurar em Configurações → API4COM

### Webphone não abre

**Causas possíveis:**
- Vendedor não tem extensão do webphone instalada
- Webphone não está logado
- Ramal incorreto

**Solução:**
1. Instalar extensão do webphone (Chrome Web Store)
2. Fazer login no webphone com credenciais API4COM
3. Verificar se ramal está correto

## Melhorias Futuras

### Em Discussão com API4COM

- [ ] Abrir webphone sem discar automaticamente (controle manual)
- [ ] URL scheme para deep linking do webphone

### Roadmap

- [ ] Transcrição automática de chamadas
- [ ] Análise de sentimento das ligações
- [ ] Relatório de chamadas por vendedor
- [ ] Integração de transcrição com notas do card
- [ ] Dashboard de métricas de chamadas
- [ ] Notificações quando gravação estiver disponível

## Referências

- **API4COM Docs:** https://developers.api4com.com/
- **Webphone Integration:** https://developers.api4com.com/integration-api4com-webphone.html
- **Endpoint /dialer:** https://api.api4com.com/api/v1/dialer

## Suporte

Dúvidas sobre a integração:
- Contatar suporte da API4COM
- Revisar logs do backend (Docker logs)
- Verificar console do navegador (erros frontend)
