# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [2.2.0] - 2026-03-09

### Adicionado

#### Módulo de Inteligência Artificial (OpenAI)
- **Integração com a API da OpenAI** usando o SDK oficial (`openai>=1.40.0`)
- **3 novos endpoints** sob o prefix `/api/v1/ai`:
  - `GET /ai/health` — Verifica se a conexão com a OpenAI está ativa e a API key é válida
  - `POST /ai/cards/{card_id}/summarize` — Gera resumo executivo de um card em até 4 frases (situação atual, última interação, ponto de atenção e próximo passo sugerido)
  - `POST /ai/generate-text` — Gera textos personalizados (e-mail de follow-up, e-mail de proposta, e-mail livre) com base nos dados do card e instruções adicionais
- **Contexto automático**: ao fornecer `card_id`, o serviço busca automaticamente título, cliente, contato, vendedor, etapa do funil, valor, prazo e últimas 15 notas para enriquecer o prompt
- **Tratamento de erros** específico para `AuthenticationError`, `RateLimitError` e `APIConnectionError` da OpenAI com mensagens claras em português

### Detalhes Técnicos

**Novos arquivos:**
- `app/schemas/ai.py` — Schemas Pydantic: `AIHealthResponse`, `AICardSummaryResponse`, `AITextGenerateRequest`, `AITextGenerateResponse`, enum `TextGenerateType`
- `app/services/ai_service.py` — `AIService` com métodos `check_connection()`, `summarize_card()`, `generate_text()` e helpers privados de montagem de prompt
- `app/api/v1/endpoints/ai.py` — Router FastAPI com os 3 endpoints documentados

**Arquivos modificados:**
- `app/core/config.py` — Adicionadas variáveis `OPENAI_API_KEY` e `OPENAI_MODEL` (padrão: `gpt-4o-mini`)
- `app/api/v1/__init__.py` — Router `ai` registrado com prefix `/ai` e tag `AI`
- `app/main.py` — Tag `AI` adicionada nos metadados do Swagger
- `requirements.txt` — Adicionado `openai>=1.40.0`
- `docker-compose.yml` — Adicionado mapeamento das variáveis `OPENAI_API_KEY` e `OPENAI_MODEL` na seção `environment` do service `api`

---

## [2.1.0] - 2026-02-06

### Adicionado

#### Página de Documentação Customizada da API
- **Nova rota `/api-docs`** servindo página HTML de vitrine profissional da API
- Página auto-contida (~600 linhas) com CSS e JS inline
- Carrega dinamicamente `/openapi.json` e renderiza via JavaScript
- Estilo visual inspirado em Stripe/Twilio API docs com dark theme (Tailwind CSS)
- **CDNs**: Tailwind CSS 3.4, Lucide Icons, Marked.js, Google Fonts (Inter, JetBrains Mono)

**Funcionalidades:**
- Header fixo com logo, versão e links para Swagger/ReDoc/OpenAPI
- Sidebar fixa com busca (debounce 200ms, atalho Ctrl+K), índice por tag, scroll spy
- Cards de endpoint colapsáveis com badges HTTP coloridos, tabelas de parâmetros, request/response examples com syntax highlighting e botão copiar
- Skeleton loader, tratamento de erros, responsivo com menu mobile

#### Diretório de Arquivos Estáticos
- **`app/static/`** criado para servir arquivos estáticos
- `StaticFiles` montado em `/static` via `app.mount()`
- Logo copiada do frontend para `app/static/logo.png`

### Detalhes Técnicos

**Novos imports em `main.py`:**
- `os` (stdlib)
- `fastapi.responses.FileResponse`
- `fastapi.staticfiles.StaticFiles`

**Rota `/api-docs`:**
- `include_in_schema=False` (não aparece no Swagger/OpenAPI)
- Retorna `FileResponse` com `media_type="text/html"`

**Docker:**
- Zero mudanças necessárias (volume mount `./app:/app/app` já cobre `app/static/`)

### Arquivos Criados
- `app/static/api-docs.html`
- `app/static/logo.png`

### Arquivos Modificados
- `app/main.py` (+3 imports, +mount estáticos, +rota /api-docs)

---

## [2.0.0] - 2026-01-29

### 🚀 Adicionado

#### Gestão de Pessoas (Contatos)
- **Nova tabela `persons`** no banco de dados para gestão centralizada de pessoas de contato
  - Múltiplos emails (comercial, pessoal, alternativo) com validação robusta
  - Múltiplos telefones (comercial, WhatsApp, alternativo)
  - Informações profissionais (cargo, organização)
  - Redes sociais (LinkedIn, Instagram, Facebook)
  - Relacionamento com clientes (organizations)
  - Status ativo/inativo
  - 4.043 pessoas migradas com sucesso

- **Novos endpoints de API** (`/api/v1/persons`)
  - `GET /persons` - Listar pessoas (paginação até 10.000)
  - `POST /persons` - Criar pessoa
  - `GET /persons/{id}` - Buscar pessoa
  - `PUT /persons/{id}` - Atualizar pessoa
  - `DELETE /persons/{id}` - Deletar pessoa
  - `PATCH /persons/{id}/status` - Alterar status
  - `GET /persons/organization/{id}` - Listar pessoas de organização
  - `POST /cards/{card_id}/person/link` - Vincular pessoa ao card
  - `DELETE /cards/{card_id}/person/unlink` - Desvincular pessoa

- **Validação robusta de emails** com 20+ regras
  - Trata emails vazios
  - Trata múltiplos emails concatenados
  - Remove caracteres HTML (`<`, `>`, `"`, `'`)
  - Valida formato e domínio completo
  - Retorna None em vez de erro para dados inválidos

- **Scripts de migração**
  - `migrate_contact_info_to_persons.py` - Migra dados de contact_info (JSON) para tabela persons
  - `clean_person_names.py` - Limpa 1.197 nomes inválidos (91% sucesso)

- **Frontend - Página de Pessoas**
  - Listagem completa de pessoas com filtros
  - Busca por nome, email, telefone, cargo
  - Integração com cards (vinculação/desvinculação)
  - Seção de contato no card com dados da pessoa

- **Documentação completa**
  - `MIGRATION_CONTACT_INFO_TO_PERSONS.md` - Documentação detalhada da migração
  - README.md atualizado com nova funcionalidade
  - scripts/README.md atualizado com novos scripts

### ⚡ Melhorado

#### Performance
- **Aumento do limite de page_size** de 100 para 10.000 nos endpoints:
  - `/api/v1/persons` (linha 73)
  - `/api/v1/clients` (linha 74)
- **Otimização de carregamento no frontend**
  - Redução de 50+ requisições para 1 requisição por página
  - Melhoria de +98% na performance de carregamento
  - Páginas: Persons.tsx, Clients.tsx

#### Qualidade de Dados
- **1.197 nomes de pessoas corrigidos** (de 1.315 inválidos)
  - Extração de nomes de emails
  - Uso de cargo como fallback
  - 91% de taxa de sucesso

#### Schemas e Validação
- **CardResponse schema** agora inclui:
  - `person_id` - ID da pessoa vinculada
  - `person_name` - Nome da pessoa vinculada
- **ContactInfo schema** com validador robusto de emails (compatibilidade temporária)

### 🐛 Corrigido

- **Erro de vinculação pessoa-card**
  - Corrigido método `create_activity` → `create` em CardService (linhas 781, 816)
  - Adicionado fetch imediato de dados da pessoa após vincular (ContactSection.tsx)

- **Erro de validação de emails**
  - ~12.000 emails processados com validador robusto
  - Emails inválidos retornam None em vez de causar erro 422

- **Erro ao abrir cards antigos**
  - ContactInfo (JSON) agora tem validação robusta de emails
  - Cards com contact_info inválido não causam mais erro

- **CardResponse não retornava person_id/person_name**
  - Adicionados campos ao schema (card.py linhas 319-320)
  - Dados da pessoa agora aparecem corretamente no card expanded

### 🗃️ Banco de Dados

#### Novas Tabelas
- `persons` - Pessoas de contato com todos os campos

#### Novas Colunas
- `cards.person_id` - Relacionamento com pessoa (many-to-one)

#### Novos Índices
- `idx_persons_organization_id` - Performance em busca por organização
- `idx_persons_owner_id` - Performance em busca por responsável
- `idx_persons_name` - Performance em busca por nome
- `idx_persons_is_active` - Performance em filtro de status
- `idx_cards_person_id` - Performance em busca de cards por pessoa

#### Constraints
- `unique_email_commercial` - Email comercial único
- `unique_email_personal` - Email pessoal único
- `unique_email_alternative` - Email alternativo único

### 📊 Estatísticas da Migração

- ✅ 4.043 pessoas criadas
- ✅ 3.525 cards vinculados
- ✅ 1.197 nomes corrigidos
- ✅ ~12.000 emails validados
- ✅ 98% redução de requisições
- ✅ 25 arquivos modificados
- ✅ ~3.500 linhas de código

### 🔄 Migração

**Importante**: Esta é uma migração major (breaking change).

**Passos para atualizar de v1.x para v2.0:**

1. Fazer backup do banco de dados
2. Aplicar migrations: `alembic upgrade head`
3. Executar script de migração: `python scripts/migrate_contact_info_to_persons.py`
4. Executar limpeza de nomes: `python scripts/clean_person_names.py`
5. Atualizar frontend para versão correspondente
6. Validar funcionamento completo

**Compatibilidade:**
- Campo `contact_info` (JSON) mantido temporariamente por compatibilidade
- Será removido em versão futura após validação completa (v2.1 ou v3.0)

---

## [1.0.0] - 2026-01-08

### 🚀 Release Inicial

#### Funcionalidades Principais

**Autenticação e Autorização**
- Sistema completo de JWT com access e refresh tokens
- Recuperação de senha via email
- Sistema de permissões baseado em roles (Admin, Manager, Salesperson)
- Multi-tenancy (isolamento por conta/empresa)

**Gestão de Usuários**
- CRUD completo de usuários
- Perfis com avatar, telefone e informações adicionais
- Paginação e filtros avançados
- Soft delete para histórico

**Gestão de Clientes**
- Cadastro completo de clientes (pessoas físicas e jurídicas)
- Dados: nome, email, telefone, empresa, CPF/CNPJ, endereço
- Vinculação de clientes aos cards/oportunidades
- Preparado para importação do Pipedrive

**Boards e Listas (Kanban)**
- Quadros personalizados por equipe
- Listas customizáveis com reordenação
- Marcação de listas de ganho/perda
- Suporte a múltiplos boards por conta

**Cards (Oportunidades)**
- Cards com título, descrição, valor monetário
- Vinculação a clientes (tabela separada)
- Campos customizados por board
- Status de ganho/perda automático baseado na lista
- Datas de vencimento e fechamento
- Atribuição a vendedores
- **contact_info como JSON** (método original, substituído em v2.0)

**Gamificação**
- Sistema de pontos por ações (card ganho, criado, movido)
- Badges automáticas e manuais
- Rankings periódicos (semanal, mensal, trimestral, anual)
- Estatísticas de desempenho

**Automações**
- Automações trigger (ao mover card, criar, etc)
- Automações agendadas (cron)
- Ações: mover card, atribuir usuário, enviar email, webhook
- Histórico de execuções

**Transferências de Cards**
- Transferência de cards entre vendedores
- Fluxo de aprovação opcional
- Limite de transferências por mês
- Histórico completo

**Relatórios e Dashboard**
- KPIs: taxa de conversão, valor total, cards por status
- Relatórios de vendas por período
- Relatórios de transferências
- Performance por vendedor

**Notificações**
- Notificações in-app em tempo real
- Notificações por email
- Tipos: menções, transferências, cards vencidos, badges ganhas

**Sistema de Email**
- Integração com Microsoft 365 (SMTP)
- Templates HTML responsivos
- Envio assíncrono via Celery
- Retry automático em caso de falha

#### Tecnologias

**Core**
- FastAPI 0.109.0
- Python 3.11+
- SQLAlchemy 2.0.25
- Alembic 1.13.1
- Pydantic 2.5.3

**Banco de Dados**
- PostgreSQL 17.7

**Segurança**
- Python-Jose (JWT tokens)
- Passlib + Bcrypt (Hash de senhas)

**Workers e Jobs**
- Celery (Processamento assíncrono)
- Redis (Broker e cache)
- APScheduler (Cron jobs)

**Qualidade e Testes**
- Pytest
- 140+ testes automatizados
- Cobertura > 80%

**Infraestrutura**
- Docker + Docker Compose
- 5 serviços orquestrados
- Health checks
- Migrations automáticas

#### Testes

- ✅ 78/78 testes passando (100%)
- ✅ Auth: 19 testes
- ✅ Users: 19 testes
- ✅ Cards: 18 testes
- ✅ Gamification: 16 testes
- ✅ Integration: 6 testes

#### Documentação

- README.md completo
- TODO.md com 18 fases
- Swagger/OpenAPI automático
- Scripts utilitários documentados

---

## Tipos de Mudanças

- `Adicionado` - para novas funcionalidades
- `Melhorado` - para mudanças em funcionalidades existentes
- `Depreciado` - para funcionalidades que serão removidas
- `Removido` - para funcionalidades removidas
- `Corrigido` - para correção de bugs
- `Segurança` - para vulnerabilidades corrigidas

---

## Links

- [Repositório](https://github.com/hsgrowth/crm)
- [Documentação](./README.md)
- [Migrations](./alembic/versions/)
