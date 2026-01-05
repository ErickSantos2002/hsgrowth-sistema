# ATUALIZAÇÕES PENDENTES - HSGrowth CRM

**Data**: 10/12/2025
**Objetivo**: Consolidar todas as atualizações necessárias na documentação organizada (pasta CRM) com base nos novos documentos do chefe (pasta CRM-2.0)

---

## 📋 RESUMO EXECUTIVO

A pasta CRM-2.0 contém várias features NOVAS e importantes que não existem na documentação organizada. As principais são:

1. **TRANSFERÊNCIA DE CARTÕES ENTRE VENDEDORES** (Feature completa e bem documentada)
2. **POLICIAL DE VENDAS** (Feature GIGANTE - IA de análise de ligações)
3. **Fluxo de Pós-Venda** (pode já existir parcialmente)
4. **Gamificação** (mencionada no resumo da sessão)
5. **Automações entre quadros** (mencionada no resumo da sessão)

---

## 🎯 FEATURES NOVAS PRINCIPAIS

### 1. TRANSFERÊNCIA DE CARTÕES ENTRE VENDEDORES

**Arquivo fonte**: `CRM-2.0/documentos pre-desenvolvimento/TRANSFERÊNCIA DE CARTÕES ENTRE VENDEDORES - HS GROWTH.md`

**O que é**: Sistema completo de transferência de cartões entre vendedores com rastreamento total da cadeia.

#### Funcionalidades principais:
- ✅ Transferência simples com 1 clique
- ✅ Rastreamento completo da cadeia de transferências
- ✅ Histórico imutável de todas as transferências
- ✅ Visualização de origem (quem criou originalmente)
- ✅ Gamificação com pontos para quem identifica e quem fecha
- ✅ Comissão em cadeia (todos os envolvidos ganham)
- ✅ Relatórios de transferência
- ✅ Badges específicas (Identificador de Oportunidades, Trabalho em Equipe, etc)

#### Casos de uso:
- Delegação para especialista
- Saída de vendedor (transferir carteira)
- Cobertura de férias
- Escalação para gerente

#### Banco de dados necessário:
```sql
-- Nova tabela
CREATE TABLE card_transfers (
  id SERIAL PRIMARY KEY,
  card_id INTEGER NOT NULL,
  from_user_id INTEGER NOT NULL,
  to_user_id INTEGER NOT NULL,
  transferred_by_user_id INTEGER NOT NULL,
  transfer_reason VARCHAR(255),
  transferred_at TIMESTAMP,
  notes TEXT
);

-- Campos novos em cards
ALTER TABLE cards ADD COLUMN original_owner_id INTEGER;
ALTER TABLE cards ADD COLUMN current_owner_id INTEGER;
ALTER TABLE cards ADD COLUMN last_transfer_date TIMESTAMP;
```

#### API necessária:
- `POST /api/cards/:id/transfer`
- `GET /api/cards/:id/transfer-history`
- `GET /api/users/:id/transferred-cards`

#### Onde atualizar:
- [ ] **02_Requisitos_Funcionais.md** - Adicionar módulo novo com RFs
- [ ] **06_Modelo_Banco_de_Dados.md** - Adicionar tabela card_transfers e campos
- [ ] **07 - REGRAS DE NEGÓCIO E VALIDAÇÕES.md** - Adicionar regras de transferência
- [ ] **10 - ESPECIFICAÇÃO DE API.md** - Adicionar endpoints

---

### 2. POLICIAL DE VENDAS (Análise Inteligente de Ligações)

**Arquivo fonte**: `CRM-2.0/documentos pre-desenvolvimento/POLICIAL DE VENDAS - HS GROWTH.md`

**O que é**: Sistema de IA que analisa 100% das ligações de vendas, transcreve, classifica e fornece feedback automático.

**⚠️ ATENÇÃO**: Esta é uma feature GIGANTE e complexa - praticamente um projeto à parte!

#### Funcionalidades principais:
- ✅ Captura de áudio de ligações
- ✅ Transcrição automática (Whisper, Google Speech-to-Text)
- ✅ Classificação automática de ligações
- ✅ Auditoria de fluxo de vendas (6 etapas)
- ✅ Pontuação de 0-100 por etapa
- ✅ Mapeamento de objeções
- ✅ Detecção de "dinheiro deixado na mesa"
- ✅ Dashboard do gestor
- ✅ Análise por vendedor
- ✅ Treinamento automático
- ✅ Recomendações personalizadas
- ✅ Biblioteca de treinamento
- ✅ Gamificação de treinamento

#### Etapas do funil auditadas:
1. Abertura da Ligação
2. Rapport
3. Diagnóstico
4. Apresentação da Solução
5. Tratamento de Objeções
6. Fechamento

#### Tipos de objeções detectadas:
- Preço/Orçamento
- Timing/Urgência
- Necessidade/Relevância
- Concorrência
- Autoridade/Decisão
- Confiança/Credibilidade
- Produto/Funcionalidade
- Implementação/Risco

#### Banco de dados necessário (5 NOVAS TABELAS):
```sql
-- Tabela de Ligações
CREATE TABLE calls (
  id SERIAL PRIMARY KEY,
  call_id VARCHAR(255) UNIQUE,
  vendedor_id INTEGER REFERENCES users(id),
  cliente_id INTEGER REFERENCES people(id),
  tipo_ligacao VARCHAR(50),
  resultado VARCHAR(50),
  data_hora TIMESTAMP,
  duracao_segundos INTEGER,
  arquivo_audio_url VARCHAR(500),
  transcricao_texto TEXT,
  nota_final DECIMAL(5,2),
  oportunidades_perdidas DECIMAL(10,2)
);

-- Tabela de Etapas Analisadas
CREATE TABLE call_etapas (
  id SERIAL PRIMARY KEY,
  call_id INTEGER REFERENCES calls(id),
  etapa_numero INTEGER,
  etapa_nome VARCHAR(100),
  pontuacao DECIMAL(5,2),
  feedback TEXT,
  minuto_inicio INTEGER,
  minuto_fim INTEGER
);

-- Tabela de Objeções
CREATE TABLE call_objecoes (
  id SERIAL PRIMARY KEY,
  call_id INTEGER REFERENCES calls(id),
  tipo_objecao VARCHAR(100),
  descricao TEXT,
  minuto INTEGER,
  duracao_segundos INTEGER,
  resposta_vendedor TEXT,
  status VARCHAR(50),
  qualidade_resposta DECIMAL(5,2),
  recomendacao TEXT
);

-- Tabela de Oportunidades Perdidas
CREATE TABLE call_oportunidades (
  id SERIAL PRIMARY KEY,
  call_id INTEGER REFERENCES calls(id),
  tipo_oportunidade VARCHAR(100),
  descricao TEXT,
  valor_estimado DECIMAL(10,2),
  minuto INTEGER,
  recomendacao TEXT
);

-- Tabela de Métricas por Vendedor
CREATE TABLE vendedor_metricas (
  id SERIAL PRIMARY KEY,
  vendedor_id INTEGER REFERENCES users(id),
  periodo_data DATE,
  total_ligacoes INTEGER,
  taxa_conversao DECIMAL(5,2),
  nota_media DECIMAL(5,2),
  oportunidades_perdidas_total DECIMAL(10,2),
  objecoes_nao_resolvidas INTEGER
);
```

#### Integrações necessárias:
- **Telefonia**: Twilio, RingCentral, Vonage, Asterisk
- **Transcrição**: OpenAI Whisper, Google Speech-to-Text, Azure Speech
- **NLP**: OpenAI GPT-4, Google Cloud NLP, Azure Text Analytics
- **Armazenamento**: AWS S3, Google Cloud Storage, Azure Blob

#### API necessária:
- `POST /api/calls` - Registrar nova ligação
- `GET /api/calls` - Listar ligações
- `GET /api/calls/:id/transcricao` - Transcrição completa
- `GET /api/calls/:id/analise` - Análise completa
- `GET /api/analises/dashboard` - Dashboard principal
- `GET /api/analises/vendedor/:id` - Análise de vendedor
- `GET /api/relatorios/semanal` - Relatório semanal

#### Onde atualizar:
- [ ] **02_Requisitos_Funcionais.md** - Adicionar MÓDULO COMPLETO (novo)
- [ ] **06_Modelo_Banco_de_Dados.md** - Adicionar 5 NOVAS TABELAS
- [ ] **07 - REGRAS DE NEGÓCIO E VALIDAÇÕES.md** - Adicionar regras de análise
- [ ] **08 - ARQUITETURA TÉCNICA.md** - Adicionar integrações com IA
- [ ] **10 - ESPECIFICAÇÃO DE API.md** - Adicionar TODOS os endpoints

**⚠️ DECISÃO NECESSÁRIA**: Este módulo é MUITO complexo. Precisa decidir se:
- A) Implementar completo (projeto de 2-3 meses adicional)
- B) Implementar versão básica (só transcrição e registro)
- C) Deixar para Fase 2 do projeto

---

### 3. GAMIFICAÇÃO AVANÇADA

**Arquivo fonte**: `CRM/RESUMO-SESSAO-08-12-2024.md` (linhas 47-66)

**O que é**: Sistema completo de pontos, rankings, badges e parabenizações automáticas.

#### Funcionalidades principais:
- ✅ Sistema de pontos por ação
- ✅ Rankings (semanal, mensal, trimestral, anual)
- ✅ Badges/Conquistas
- ✅ Parabenizações automáticas
- ✅ Dashboard de gamificação
- ✅ Notificações de gamificação
- ✅ Histórico de pontos
- ✅ Reset periódico de ranking

#### Pontos sugeridos:
- Criar lead: 10 pts
- Primeiro contato: 25 pts
- Enviar proposta: 75 pts
- Fechar venda: 150 pts
- Transferir para especialista: 25 pts
- Venda de cartão transferido: 50 pts (bônus)

#### Badges sugeridas:
- 🏆 Vendedor do Mês
- 📈 Maior Conversão
- 🎯 Especialista
- 💰 Upsell Master
- 🎯 Identificador de Oportunidades
- 🤝 Trabalho em Equipe

#### Banco de dados necessário (4 NOVAS TABELAS):
```sql
-- Tabela de Pontos
CREATE TABLE gamification_points (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action_type VARCHAR(100),
  points INTEGER,
  card_id INTEGER REFERENCES cards(id),
  created_at TIMESTAMP
);

-- Tabela de Rankings
CREATE TABLE gamification_rankings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  period VARCHAR(50), -- weekly, monthly, quarterly, annual
  rank INTEGER,
  total_points INTEGER,
  year INTEGER,
  period_number INTEGER -- week/month/quarter
);

-- Tabela de Badges
CREATE TABLE gamification_badges (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  description TEXT,
  criteria TEXT,
  points_required INTEGER,
  icon VARCHAR(255)
);

-- Tabela de Badges do Usuário
CREATE TABLE user_badges (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  badge_id INTEGER REFERENCES gamification_badges(id),
  earned_at TIMESTAMP
);
```

#### Requisitos Funcionais (RF-180 a RF-189):
- RF-180: Sistema de Pontos por Ação
- RF-181: Ranking (Semanal, Mensal, Trimestral, Anual)
- RF-182: Configurar Pontos por Ação
- RF-183: Badges/Conquistas
- RF-184: Parabenizações Automáticas
- RF-185: Dashboard de Gamificação
- RF-186: Notificações de Gamificação
- RF-187: Histórico de Pontos
- RF-188: Resetar Ranking (periódico)
- RF-189: Configurar Badges

#### Onde atualizar:
- [ ] **02_Requisitos_Funcionais.md** - Adicionar MÓDULO 18: GAMIFICAÇÃO (RF-180 a RF-189)
- [ ] **06_Modelo_Banco_de_Dados.md** - Adicionar 4 NOVAS TABELAS
- [ ] **07 - REGRAS DE NEGÓCIO E VALIDAÇÕES.md** - Adicionar regras de pontuação
- [ ] **10 - ESPECIFICAÇÃO DE API.md** - Adicionar endpoints de gamificação

---

### 4. AUTOMAÇÕES ENTRE QUADROS

**Arquivo fonte**: `CRM/RESUMO-SESSAO-08-12-2024.md` (linhas 82-96)

**O que é**: Sistema genérico de automações que substitui o fluxo fixo de pós-venda.

#### Conceito:
```
GATILHO (Trigger)              AÇÃO (Action)
Quando cartão move para    →   Mover/Copiar para
Lista X do Quadro Y            Lista Z do Quadro W
```

#### Casos de uso:
- Vendas [Fechado] → Pós-venda [Onboarding]
- Inbound [Qualificado] → Outbound [Contato]
- Suporte [Upsell] → Vendas [Oportunidade]

#### Banco de dados necessário (2 NOVAS TABELAS):
```sql
-- Tabela de Automações
CREATE TABLE automations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  trigger_type VARCHAR(100), -- card_moved, card_created, etc
  trigger_board_id INTEGER REFERENCES boards(id),
  trigger_list_id INTEGER REFERENCES lists(id),
  action_type VARCHAR(100), -- move_card, copy_card, create_card
  action_board_id INTEGER REFERENCES boards(id),
  action_list_id INTEGER REFERENCES lists(id),
  field_mapping JSON, -- mapeamento de campos
  is_active BOOLEAN DEFAULT true
);

-- Tabela de Execuções de Automação
CREATE TABLE automation_executions (
  id SERIAL PRIMARY KEY,
  automation_id INTEGER REFERENCES automations(id),
  source_card_id INTEGER REFERENCES cards(id),
  destination_card_id INTEGER,
  status VARCHAR(50), -- success, failed, pending
  error_message TEXT,
  executed_at TIMESTAMP
);
```

#### Requisitos Funcionais (RF-190 a RF-199):
- RF-190: Criar Automação
- RF-191: Definir Gatilhos (Triggers)
- RF-192: Definir Ações
- RF-193: Mapeamento de Campos
- RF-194: Executar Automação
- RF-195: Histórico de Execuções
- RF-196: Listar e Gerenciar Automações
- RF-197: Ativar/Desativar Automação
- RF-198: Testar Automação
- RF-199: Notificar Erros de Automação

#### Onde atualizar:
- [ ] **02_Requisitos_Funcionais.md** - Adicionar MÓDULO 19: AUTOMAÇÕES (RF-190 a RF-199)
- [ ] **06_Modelo_Banco_de_Dados.md** - Adicionar 2 NOVAS TABELAS
- [ ] **07 - REGRAS DE NEGÓCIO E VALIDAÇÕES.md** - Adicionar regras de automação
- [ ] **10 - ESPECIFICAÇÃO DE API.md** - Adicionar endpoints de automação

---

## 📊 RESUMO DE IMPACTO

### Novos Módulos a Adicionar:
1. **Módulo 18**: Gamificação (RF-180 a RF-189) - 10 requisitos
2. **Módulo 19**: Automações (RF-190 a RF-199) - 10 requisitos
3. **Módulo 20**: Transferência de Cartões (RF-200 a RF-209) - 10 requisitos
4. **Módulo 21**: Policial de Vendas (RF-210 a RF-240) - 30+ requisitos

### Novas Tabelas de Banco de Dados:
- `card_transfers` (Transferências)
- `gamification_points` (Pontos)
- `gamification_rankings` (Rankings)
- `gamification_badges` (Badges)
- `user_badges` (Badges do Usuário)
- `automations` (Automações)
- `automation_executions` (Histórico de Automações)
- `calls` (Ligações - Policial)
- `call_etapas` (Etapas - Policial)
- `call_objecoes` (Objeções - Policial)
- `call_oportunidades` (Oportunidades - Policial)
- `vendedor_metricas` (Métricas - Policial)

**Total**: 12 NOVAS TABELAS

### Novos Requisitos Funcionais:
- **Antes**: 141 requisitos
- **Depois**: ~186 requisitos (+45 novos)

### Estimativa de Trabalho:
- **Documentação**: 4-6 horas (atualizar todos os arquivos)
- **Implementação Gamificação**: 1-2 semanas
- **Implementação Automações**: 1-2 semanas
- **Implementação Transferências**: 1 semana
- **Implementação Policial de Vendas**: 2-3 MESES (projeto grande!)

---

## ✅ CHECKLIST DE ATUALIZAÇÕES

### Arquivo: 02_Requisitos_Funcionais.md
- [ ] Adicionar RF-015: Duplicar Quadro
- [ ] Adicionar RF-024: Duplicar Lista
- [ ] Adicionar MÓDULO 18: Gamificação (RF-180 a RF-189)
- [ ] Adicionar MÓDULO 19: Automações (RF-190 a RF-199)
- [ ] Adicionar MÓDULO 20: Transferência de Cartões (RF-200 a RF-209)
- [ ] Adicionar MÓDULO 21: Policial de Vendas (RF-210 a RF-240) - OPCIONAL

### Arquivo: 06_Modelo_Banco_de_Dados.md
- [ ] Adicionar tabela `card_transfers`
- [ ] Adicionar campos `original_owner_id`, `current_owner_id`, `last_transfer_date` em `cards`
- [ ] Adicionar tabelas de Gamificação (4 tabelas)
- [ ] Adicionar tabelas de Automações (2 tabelas)
- [ ] Adicionar tabelas de Policial de Vendas (5 tabelas) - OPCIONAL

### Arquivo: 07 - REGRAS DE NEGÓCIO E VALIDAÇÕES.md
- [ ] Adicionar RN: Transferência de Cartões
- [ ] Adicionar RN: Sistema de Pontos
- [ ] Adicionar RN: Cálculo de Rankings
- [ ] Adicionar RN: Critérios de Badges
- [ ] Adicionar RN: Execução de Automações
- [ ] Adicionar RN: Comissão em Cadeia
- [ ] Adicionar RN: Análise de Ligações - OPCIONAL

### Arquivo: 08 - ARQUITETURA TÉCNICA.md
- [ ] Adicionar integração com IA (Whisper, GPT-4) - para Policial de Vendas
- [ ] Adicionar integração com telefonia (Twilio) - para Policial de Vendas
- [ ] Documentar arquitetura de automações

### Arquivo: 10 - ESPECIFICAÇÃO DE API.md
- [ ] Adicionar endpoints de transferência
- [ ] Adicionar endpoints de gamificação
- [ ] Adicionar endpoints de automações
- [ ] Adicionar endpoints de Policial de Vendas - OPCIONAL

### Arquivo: 09 - PLANO DE IMPLEMENTAÇÃO E CRONOGRAMA.md
- [ ] Atualizar cronograma com novos módulos
- [ ] Estimar tempo para cada feature nova
- [ ] Decidir o que fica para MVP e o que fica para Fase 2

---

## 🎯 RECOMENDAÇÕES

### Prioridade ALTA (MVP - Fazer Agora):
1. ✅ Renomeação TurbohS → HSGrowth (JÁ FEITO!)
2. 🔄 Gamificação (impacto grande, complexidade média)
3. 🔄 Transferência de Cartões (impacto grande, complexidade baixa)
4. 🔄 Automações (impacto grande, complexidade média)

### Prioridade MÉDIA (Fase 2):
1. Duplicar Quadros e Listas (complexidade baixa)
2. Melhorias em integrações (Pipedrive bidirecional, WhatsApp histórico)

### Prioridade BAIXA (Projeto Futuro):
1. **Policial de Vendas** - É um PROJETO COMPLETO por si só
   - Requer integração com IA (caro!)
   - Requer telefonia (complexo!)
   - Estimativa: 2-3 meses de dev
   - Sugestão: Fazer em projeto separado após MVP do CRM

---

## 📝 PRÓXIMOS PASSOS SUGERIDOS

1. **Revisar este documento** - Ler tudo e decidir prioridades
2. **Atualizar 02_Requisitos_Funcionais.md** - Adicionar os 3 módulos prioritários
3. **Atualizar 06_Modelo_Banco_de_Dados.md** - Adicionar as novas tabelas
4. **Atualizar 07 - REGRAS DE NEGÓCIO E VALIDAÇÕES.md** - Adicionar regras dos novos módulos
5. **Atualizar 10 - ESPECIFICAÇÃO DE API.md** - Adicionar endpoints
6. **Decidir sobre Policial de Vendas** - MVP agora ou Fase 2?

---

**Conclusão**: Temos 4 features grandes pra adicionar. 3 são viáveis no prazo atual (Gamificação, Transferências, Automações). 1 é um projeto gigante que recomendo deixar pra depois (Policial de Vendas).

**Estimativa total de atualização da documentação**: 4-6 horas de trabalho focado.

---

**Gerado em**: 10/12/2025
**Por**: Claude Code
**Status**: Pronto para revisão
