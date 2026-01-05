# BRIEFING CONSOLIDADO - PROJETO CRM CUSTOMIZADO

## 1. VISÃO GERAL DO PROJETO

Desenvolvimento de um **Sistema CRM (Customer Relationship Management) proprietário** para gerenciamento de vendas e relacionamento com clientes, com interface intuitiva baseada em padrão Kanban e capacidade de importação de dados do Pipedrive.

---

## 2. OBJETIVOS PRINCIPAIS

- Criar uma plataforma CRM customizada que substitua ou complemente o Pipedrive
- Permitir importação de dados estruturados do Pipedrive (cartões, organizações, pessoas, produtos, anotações, arquivos e atividades)
- Oferecer visualizações múltiplas (Kanban, listas, cartões) com personalização total
- Gerar relatórios e KPIs para análise de desempenho de vendas
- Facilitar gestão de dados através de interface administrativa

---

## 3. ESTRUTURA TÉCNICA

### 3.1 Stack Tecnológico
- **Frontend**: React + TypeScript + TailwindCSS + Vite
- **Backend**: API separada (repositório independente)
- **Banco de Dados**: PostgreSQL
- **Autenticação**: JWT (Login/Senha para vendedores internos, Client ID + Client Secret para integrações externas)
- **Containerização**: Docker
- **Hospedagem**: VPS Hostinger com Easypanel
- **Arquitetura**: Microserviços com separação clara entre API e Sistema

### 3.2 Organização de Repositórios
- Repositório 1: `hsgrowth-api` (Backend/API)
- Repositório 2: `hsgrowth-sistema` (Frontend/Sistema)

---

## 4. FUNCIONALIDADES PRINCIPAIS

### 4.1 Gestão de Contas e Permissões
- Sistema de **roles (papéis) diferenciados** por conta
- Controle de acesso baseado em permissões granulares
- Suporte a múltiplos usuários por conta
- **Isolamento de Dados**: Cada vendedor visualiza apenas seus cartões
- **Acesso Administrativo**: Administrador visualiza e gerencia todos os cartões
- **Controle de Permissões**: Sistema robusto para definir quem pode fazer o quê

### 4.2 Visualizações de Dados
- **Página Principal**: Dashboard com quadros disponíveis
- **Quadros (Boards)**: Visualização Kanban com listas (colunas)
- **Listas**: Colunas dentro dos quadros
- **Cartões (Cards)**: Itens individuais dentro das listas
- **Visualizações Alternativas**: 
  - Visualização em Lista (tabela)
  - Visualização em Calendário
  - Outras visualizações conforme necessário

### 4.3 Personalização de Campos nos Cartões
Cada quadro pode ter campos customizados com os seguintes tipos:
- **Texto** (texto livre)
- **E-mail** (validação de email)
- **Documento** (CPF, CNPJ, etc.)
- **Data e Hora** (timestamp completo)
- **Apenas Data** (sem hora)
- **Tempo** (duração)
- **Data de Vencimento** (com alertas)
- **Moeda** (valores monetários)
- **Número** (inteiros e decimais)
- **Seleção** (dropdown/select)
- **Checkbox** (booleano)
- **Vendedor/Responsável** (relacionamento com usuários)
- **Anexo** (upload de arquivos)
- **Etiqueta** (tags/labels)
- Outros tipos conforme necessário

### 4.4 Fluxo de Criação de Cartões
1. Criar/configurar **campos customizados** para o quadro
2. Criar **cartões** com base nos campos definidos
3. Mover cartões entre listas (Kanban)
4. Editar informações dos cartões
5. **Criação via API**: Permitir inserção de cartões através de endpoints da API com autenticação por token
6. **Distribuição Automática**: Cartões criados via API sem vendedor atribuído podem ser distribuídos automaticamente em rodízio entre vendedores (se ativado)

### 4.5 Busca e Filtros
- **Busca textual** em cartões
- **Filtros avançados** por campo (data, responsável, etiqueta, etc.)
- **Combinação de filtros** para refinamento de resultados

### 4.6 Relatórios e KPIs
- **Dashboard de KPIs** com métricas principais:
  - Quantidade de novos cartões por dia/período
  - Cartões concluídos dentro do prazo
  - Cartões atrasados
  - Tempo médio de conclusão
  - Tempo médio por fase/lista
  - Taxa de conversão por vendedor
  - Outros KPIs customizáveis

### 4.7 Importação de Dados
- **Importação de planilhas** (CSV/Excel) do Pipedrive
- **Importação via API** de sistemas integrados (site próprio, RDStation, agências de marketing, WhatsApp, ligações, etc.)
- Estrutura de dados esperada:
  - **Cartões** (deals/oportunidades)
  - **Organizações** (empresas/contas)
  - **Pessoas** (contatos)
  - **Produtos** (itens de venda)
  - **Anotações** (notas/comentários)
  - **Arquivos** (anexos)
  - **Atividades** (histórico de ações)
- Interface amigável para mapeamento de campos
- Validação e tratamento de erros durante importação
- Suporte a integrações contínuas com terceiros

### 4.8 Visualização e Gestão de Banco de Dados
- **Página Administrativa** para visualizar dados brutos do banco
- Permitir consultas sem necessidade de acessar diretamente o banco
- **Exportação de dados** em formatos padrão (CSV, Excel, JSON)
- **Importação de dados** através da interface

---

## 5. ESTRUTURA DE DADOS

### 5.1 Entidades Principais
- **Contas** (Accounts)
- **Usuários** (Users)
- **Roles/Permissões** (Roles & Permissions)
- **Quadros** (Boards)
- **Listas** (Lists/Columns)
- **Cartões** (Cards)
- **Campos Customizados** (Custom Fields)
- **Valores de Campos** (Field Values)
- **Organizações** (Organizations)
- **Pessoas** (Contacts/People)
- **Produtos** (Products)
- **Anotações** (Notes)
- **Arquivos** (Files/Attachments)
- **Atividades** (Activities/History)
- **Etiquetas** (Tags)
- **Usuários/Responsáveis** (Assignments)
- **Histórico/Logs** (Audit Logs)
- **Tokens de API** (API Tokens)

### 5.1.1 Identificadores
- **Sem UUID**: Utilizar IDs sequenciais (BIGINT auto-increment) para melhor performance e legibilidade

### 5.2 Relacionamentos Principais
- Uma Conta contém múltiplos Usuários
- Uma Conta contém múltiplos Quadros
- Um Quadro contém múltiplas Listas
- Uma Lista contém múltiplos Cartões
- Um Cartão pode ter múltiplos Valores de Campos
- Um Cartão pode estar relacionado a Organizações, Pessoas, Produtos, Anotações, Arquivos e Atividades

---

## 6. REQUISITOS NÃO FUNCIONAIS

- **Performance**: Carregamento rápido de quadros com até 3.200 cartões
- **Escalabilidade**: Suportar crescimento de 10 para múltiplos usuários simultâneos
- **Segurança**: Autenticação OAuth robusta, autorização por role granular, criptografia de dados sensíveis
- **Auditoria**: Sistema completo de histórico e logs para rastreamento de alterações e controle
- **Disponibilidade**: Uptime mínimo de 99%
- **Responsividade**: Interface funcional em desktop e mobile
- **Acessibilidade**: Conformidade com WCAG 2.1
- **Manutenibilidade**: Código limpo, bem documentado e testável
- **Compatibilidade**: Suporte a navegadores modernos (Chrome, Firefox, Safari, Edge)
- **Containerização**: Deployment via Docker em VPS Hostinger com Easypanel

---

## 7. FLUXOS PRINCIPAIS

### 7.1 Fluxo de Usuário - Gestão de Quadros
1. Usuário acessa página principal
2. Visualiza lista de quadros disponíveis
3. Clica em um quadro
4. Acessa visualização Kanban com listas e cartões
5. Pode filtrar, buscar, criar, editar ou mover cartões

### 7.2 Fluxo de Usuário - Importação de Dados
1. Usuário acessa página de importação
2. Seleciona arquivo CSV/Excel do Pipedrive
3. Sistema mapeia campos automaticamente (com opção de ajuste manual)
4. Valida dados
5. Importa dados para o banco
6. Exibe relatório de sucesso/erros

### 7.3 Fluxo de Administrador - Gestão de Banco de Dados
1. Administrador acessa página de gestão de dados
2. Visualiza tabelas do banco
3. Pode executar consultas, exportar dados ou importar novos dados
4. Mantém histórico de operações

---

## 8. DECISÕES TÉCNICAS CONFIRMADAS

- ✅ **Banco de Dados**: PostgreSQL
- ✅ **Autenticação**: JWT com dois fluxos:
  - **Vendedores Internos**: Login/Senha com JWT tokens
  - **Integrações Externas**: Client ID + Client Secret (OAuth2 Client Credentials flow)
- ✅ **Escopo**: Uso interno (apenas para a empresa)
- ✅ **Volume de Dados Estimado**: 10 usuários, 7 quadros, ~3.200 cartões, ~3.000 pessoas, ~3.000 organizações
- ✅ **Integrações**: Pipedrive, site próprio, RDStation, agências de marketing, WhatsApp, ligações e outros
- ✅ **Cronograma**: 2 meses de desenvolvimento (documentação anterior)
- ✅ **Usuários Simultâneos**: ~10 no começo, escalável para mais
- ✅ **Auditoria**: Sistema robusto de histórico e logs obrigatório
- ✅ **Deploy**: Docker em VPS Hostinger com Easypanel
- ✅ **Repositórios**: `hsgrowth-api` e `hsgrowth-sistema`
- ✅ **Permissões**: Controle granular - vendedores veem apenas seus cartões, admin vê tudo
- ✅ **API**: Endpoints para criar cartões com token, distribuição em rodízio para leads sem atribuição
- ✅ **Visualizações**: Kanban, Lista, Calendário
- ✅ **Identificadores**: IDs sequenciais (sem UUID)

---

## 9. ESTRUTURA DE DOCUMENTAÇÃO

A documentação será criada em **documentos separados** (.md individuais) para melhor organização, manutenção e reutilização:

1. **01_Visão_Geral_e_Escopo.md** - Visão geral e escopo do projeto
2. **02_Requisitos_Funcionais.md** - Requisitos funcionais detalhados
3. **03_Requisitos_Não_Funcionais.md** - Requisitos não funcionais
4. **04_Casos_de_Uso.md** - Casos de uso e histórias de usuário
5. **05_Mapeamento_de_Processos.md** - Fluxogramas e processos
6. **06_Modelo_Banco_de_Dados.md** - ER/UML e estrutura de dados
7. **07_Regras_de_Negocio.md** - Regras de negócio e validações
8. **08_Arquitetura_Tecnica.md** - Arquitetura técnica e decisões
9. **09_Plano_de_Implementacao.md** - Cronograma e plano de execução
10. **10_API_Specification.md** - Especificação de endpoints da API

## 10. PRÓXIMOS PASSOS

1. **Validação Final do Briefing**: Você revisa e aprova este documento
2. **Criação de Documentação**: Criaremos cada documento conforme estrutura acima
3. **Revisão e Ajustes**: Você revisa cada documento antes de iniciar desenvolvimento

---

**Versão**: 1.0  
**Data**: Dezembro 2025  
**Status**: Aguardando Validação
