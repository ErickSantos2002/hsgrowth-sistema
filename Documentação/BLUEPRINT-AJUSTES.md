# Ajustes do Sistema - Blueprint da Consultora

**Data de inicio:** 05/02/2026
**Responsavel:** Erick
**Objetivo:** Ajustar o sistema HSGrowth CRM conforme blueprint criado pela consultora de vendas

---

## Status Geral

- [x] Analise de campos de Pessoa (Contato) ✅
- [x] Analise de campos de Empresa (Organizacao/Cliente) ✅
- [x] Analise de campos de Cards (Negocios) ✅
- [x] Criacao de migration unica com todas as alteracoes ✅
- [x] Atualizacao dos schemas (Pydantic) ✅
- [ ] Atualizacao do frontend

---

## 1. Tabela `persons` (Pessoas/Contatos)

### Campos que a consultora definiu:
1. Nome ✅ (existe: `first_name` e `name`)
2. Sobrenome ✅ (existe: `last_name`)
3. 3 opcoes de E-mail ✅ (existe: `email_commercial`, `email_personal`, `email_alternative`)
4. 3 opcoes de Telefone ✅ (existe: `phone_commercial`, `phone_whatsapp`, `phone_alternative`)
5. URL do LinkedIn ✅ (existe: `linkedin`)
6. Proprietario (vendedor) ⚠️ (existe no backend: `owner_id`, mas NAO existe no frontend)
7. Cargo ✅ (existe: `position`)
8. Area ❌ **FALTA IMPLEMENTAR**

### Mudancas necessarias:

#### Backend:
- [ ] Adicionar coluna `area` ou `department` (String, 200 caracteres, nullable)
- [ ] Atualizar schema `PersonBase`, `PersonCreate`, `PersonUpdate`, `PersonResponse`
- [ ] Atualizar repository se necessario

#### Frontend:
- [ ] Adicionar campo "Area" no `PersonModal.tsx`
- [ ] Adicionar campo "Proprietario" (dropdown de usuarios/vendedores) no `PersonModal.tsx`
- [ ] Atualizar interface `PersonFormData` com os novos campos
- [ ] Atualizar tipo `Person` em `services/personService.ts`

### Opcoes para o campo "Area" (segundo blueprint):
- CEO
- Coordenador(a)
- CSM
- Diretor(a)/C-Level
- Especialista / Analista
- Estagiario / Assistente
- Founder / Socio
- Gerente/Head
- Outro
- Tecnico
- Operacoes
- Seguranca do Trabalho / HSE / SST
- Manutencao
- Recursos Humanos (RH)
- Financeiro
- Compras / Suprimentos
- Diretoria / Socios
- Tecnologia da Informacao (TI)

---

## 2. Tabela `clients` (Empresas/Organizacoes)

### Campos que a consultora definiu:
1. Nome Fantasia ⚠️ (existe: `name` ou `company_name`? - precisa esclarecer qual usar)
2. URL do site ✅ (existe: `website`)
3. CNPJ ✅ (existe: `document` - guarda CPF ou CNPJ)
4. CNAE ❌ **FALTA IMPLEMENTAR**
5. Paginas da empresa no LinkedIn ❌ **FALTA IMPLEMENTAR**
6. Razao Social ✅ (existe: `company_name`)
7. Endereco ✅ (existe: `address`, `city`, `state`, `country`)
8. Tipo e Relacionamento ❌ **FALTA IMPLEMENTAR**
9. Status do Cliente ✅ (existe: `is_active` - boolean Ativo/Inativo)
10. Atividade Comercial ❌ **FALTA IMPLEMENTAR**
11. Setor ❌ **FALTA IMPLEMENTAR**
12. Numero de Colaboradores ❌ **FALTA IMPLEMENTAR**
13. Faturamento/Receita Anual ❌ **FALTA IMPLEMENTAR**

### Mudancas necessarias:

#### Backend:
- [ ] Adicionar coluna `cnae` (String, 20 caracteres, nullable) - Codigo CNAE
- [ ] Adicionar coluna `linkedin_url` (String, 500 caracteres, nullable) - URL do LinkedIn da empresa
- [ ] Adicionar coluna `relationship_type` (String, 50 caracteres, nullable) - Tipo de relacionamento
- [ ] Adicionar coluna `commercial_activity` (String, 50 caracteres, nullable) - Atividade comercial
- [ ] Adicionar coluna `sector` ou `industry` (String, 100 caracteres, nullable) - Setor/Industria
- [ ] Adicionar coluna `employee_count` (String, 50 caracteres, nullable) - Numero de colaboradores (faixa)
- [ ] Adicionar coluna `annual_revenue` (String, 50 caracteres, nullable) - Faturamento anual (faixa)
- [ ] Atualizar schema `ClientBase`, `ClientCreate`, `ClientUpdate`, `ClientResponse`
- [ ] Atualizar repository se necessario

#### Frontend:
- [ ] Adicionar campo "CNAE" no formulario de cliente
- [ ] Adicionar campo "LinkedIn da Empresa" no formulario
- [ ] Adicionar campo "Tipo e Relacionamento" (dropdown) no formulario
- [ ] Adicionar campo "Atividade Comercial" (dropdown) no formulario
- [ ] Adicionar campo "Setor" (dropdown) no formulario
- [ ] Adicionar campo "Numero de Colaboradores" (dropdown) no formulario
- [ ] Adicionar campo "Faturamento/Receita Anual" (dropdown) no formulario
- [ ] Atualizar interface e tipos no `clientService.ts`

### Opcoes para os campos (segundo blueprint):

#### Tipo e Relacionamento:
- Cliente
- Fornecedor
- Lead
- Parceiro
- Prospect
- Revendedor

#### Atividade Comercial:
- Ativo
- Dormente
- Inativo

#### Setor (Industry):
- Industria (manufatura em geral)
- Industrias de Transformacao
- Alimentos e Bebidas
- Frigorificos
- Agroindustria / Agronegocio
- Processadoras de Graos
- Usinas de Acucar / Etanol
- Componentes Automotivos
- Logistica e Transporte
- Construcao Civil
- Mineracao
- Oleo e Gas / Energia
- Quimica / Petroquimica
- Papel e Celulose
- Metalurgia / Siderurgia
- Portos e Terminais
- Saneamento / Utilidades Publicas
- Servicos Industriais / Facilities
- Cooperativas / Associacoes Produtivas
- Outros

#### Numero de Colaboradores:
- Ate 50 colaboradores
- 51-100 colaboradores
- 101-300 colaboradores
- 301-600 colaboradores
- 601-1.000 colaboradores
- Acima de 1.000 colaboradores

#### Faturamento/Receita Anual:
- Ate R$ 10 milhoes
- R$ 10-30 milhoes
- R$ 30-100 milhoes
- R$ 100-300 milhoes
- R$ 300 milhoes-R$ 1 bilhao
- Acima de R$ 1 bilhao

---

## 3. Tabela `cards` (Cards/Negocios)

**IMPORTANTE:** Sistema mantem estrutura atual onde os campos pertencem ao CARD, nao ao board.
Os mesmos campos estarao disponiveis em todos os boards (Prospeccao, Aquisicao, Expansao).

### Campos que a consultora definiu:
1. Nome do card/negocio ✅ (existe: `title`)
2. SDR (usuario com funcao SDR) ❌ **FALTA IMPLEMENTAR**
3. Vendedor ✅ (existe: `assigned_to_id`)
4. Empresa ✅ (existe: `client_id`)
5. Pessoa de contato ✅ (existe: `person_id` e `contact_info`)
6. Entrada em cada etapa ❌ **FALTA IMPLEMENTAR** (3 datas: entrada em Prospeccao, Aquisicao, Expansao)
7. Tipo de Negocio ❌ **FALTA IMPLEMENTAR**
8. Canal de Aquisicao ❌ **FALTA IMPLEMENTAR**
9. Canal de Aquisicao - Detalhamento ❌ **FALTA IMPLEMENTAR**
10. UTM - automatica ❌ **FALTA IMPLEMENTAR** (campo texto livre, nao prioritario)
11. Motivo da Perda ❌ **FALTA IMPLEMENTAR**
12. Implentacao ❌ **FALTA IMPLEMENTAR**
13. Se tem pessoas para manusear ❌ **FALTA IMPLEMENTAR**

### Mudancas necessarias:

#### Backend:
- [ ] Adicionar coluna `sdr_id` (Integer, Foreign Key para users, nullable) - Usuario SDR responsavel
- [ ] Adicionar coluna `prospection_entry_date` (DateTime, nullable) - Data de entrada no board de Prospeccao
- [ ] Adicionar coluna `acquisition_entry_date` (DateTime, nullable) - Data de entrada no board de Aquisicao
- [ ] Adicionar coluna `expansion_entry_date` (DateTime, nullable) - Data de entrada no board de Expansao
- [ ] Adicionar coluna `deal_type` (String, 100 caracteres, nullable) - Tipo de Negocio
- [ ] Adicionar coluna `acquisition_channel` (String, 100 caracteres, nullable) - Canal de Aquisicao
- [ ] Adicionar coluna `acquisition_channel_detail` (String, 200 caracteres, nullable) - Detalhamento do canal
- [ ] Adicionar coluna `utm_params` (String, 500 caracteres, nullable) - Parametros UTM
- [ ] Adicionar coluna `loss_reason` (String, 200 caracteres, nullable) - Motivo da Perda
- [ ] Adicionar coluna `has_implementation` (Boolean, nullable) - Se tem implementacao
- [ ] Adicionar coluna `has_personnel` (Boolean, nullable) - Se tem pessoas para manusear
- [ ] Adicionar relacionamento para `sdr_id` no modelo Card
- [ ] Atualizar schema `CardBase`, `CardCreate`, `CardUpdate`, `CardResponse`
- [ ] Atualizar repository e service se necessario

#### Frontend:
- [ ] Adicionar campo "SDR" (dropdown de usuarios com role SDR) no formulario de card
- [ ] Exibir as 3 datas de entrada (somente leitura, preenchidas automaticamente)
- [ ] Adicionar campo "Tipo de Negocio" (dropdown) no formulario
- [ ] Adicionar campo "Canal de Aquisicao" (dropdown) no formulario
- [ ] Adicionar campo "Canal de Aquisicao - Detalhamento" (dropdown dependente) no formulario
- [ ] Adicionar campo "UTM" (texto livre) no formulario
- [ ] Adicionar campo "Motivo da Perda" (dropdown, exibir apenas quando perder) no formulario
- [ ] Adicionar campo "Implentacao" (dropdown Sim/Nao) no formulario
- [ ] Adicionar campo "Se tem pessoas para manusear" (dropdown Sim/Nao) no formulario
- [ ] Atualizar interface e tipos no `cardService.ts`

#### Logica de negocio:
- [ ] Ao mover card para board de Prospeccao: preencher `prospection_entry_date` automaticamente
- [ ] Ao mover card para board de Aquisicao: preencher `acquisition_entry_date` automaticamente
- [ ] Ao mover card para board de Expansao: preencher `expansion_entry_date` automaticamente
- [ ] Exibir campo "Motivo da Perda" apenas quando `is_won = -1` (card perdido)

### Opcoes para os campos (segundo blueprint):

#### Tipo de Negocio:
- Nova Venda
- Cross Sell
- Up Sell

#### Canal de Aquisicao:
- Inbound
- Outbound
- Indicacao
- Parcerias
- Eventos
- Base

#### Canal de Aquisicao - Detalhamento:

**Para Inbound:**
- Inbound - Conteudo
- Inbound - Trafego pago
- Inbound - SEO
- Inbound - Email marketing
- Inbound - Levantada de mao (site / WhatsApp / formulario)

**Para Outbound:**
- Outbound - Lista fria
- Outbound - LinkedIn
- Outbound - Cold email
- Outbound - Cold call

**Para Indicacao:**
- Indicacao - Cliente
- Indicacao - Ex-cliente
- Indicacao - Networking pessoal

**Para Parcerias:**
- Parcerias - Consultorias
- Parcerias - Integradores
- Parcerias - Representantes
- Parcerias - Outras empresas

**Para Eventos:**
- Eventos - Feira
- Eventos - Workshop proprio
- Eventos - Palestra
- Eventos - Meetup

**Para Base:**
- Base - Resgate
- Base - Levantada de mao
- Base - e-mail marketing
- Base - Disparo whats

#### Motivo da Perda:
- Lead fora do ICP
- Sem contato / dados invalidos
- Lead invalido / duplicado / teste
- Sem interesse ou sem timing
- Nao chegamos no responsavel pelo tema
- Revenda
- Ja cliente / em atendimento interno
- Cenario externo
- Demanda Calibracao
- Demanda Suporte
- Preco / orcamento
- Sem budget aprovado
- Prioridade mudou
- Solucao nao percebida como critica
- Produto nao atende / restricao tecnica
- Proposta fora de timing
- Aprovacao interna travada
- Perda para concorrencia

#### Implentacao:
- Sim
- Nao

#### Se tem pessoas para manusear:
- Sim
- Nao

---

## Notas Tecnicas

### Migration Unica ✅ CONCLUÍDA
- ✅ Migration criada: `2026_02_05_1230-blueprint_consultora_ajustes.py`
- ✅ Revision ID: `blueprint_consultora_2026`
- ✅ Aplicada com sucesso em: 05/02/2026 12:35
- ✅ 19 campos adicionados (1 em persons, 7 em clients, 11 em cards)
- ✅ Todas as colunas verificadas e funcionando

### Schemas Pydantic ✅ CONCLUÍDOS
- ✅ `app/schemas/person.py` - Adicionado campo `area`
- ✅ `app/schemas/client.py` - Adicionados 7 campos (cnae, linkedin_url, relationship_type, commercial_activity, sector, employee_count, annual_revenue)
- ✅ `app/schemas/card.py` - Adicionados 11 campos (sdr_id, datas de entrada, deal_type, canais, utm, loss_reason, has_implementation, has_personnel)
- ✅ Todos os schemas atualizados em: PersonBase, PersonCreate, PersonUpdate
- ✅ Todos os schemas atualizados em: ClientBase, ClientCreate, ClientUpdate
- ✅ Todos os schemas atualizados em: CardCreate, CardUpdate, CardResponse
- ✅ API reiniciada e healthy

### Cuidados:
- Sistema em PRODUCAO - testar migration localmente antes
- Fazer backup do banco antes de aplicar em producao
- Atualizar CHANGELOG.md apos implementacao
- Documentar todas as mudancas no HISTORICO-DESENVOLVIMENTO.md

---

**Ultima atualizacao:** 05/02/2026 12:50
