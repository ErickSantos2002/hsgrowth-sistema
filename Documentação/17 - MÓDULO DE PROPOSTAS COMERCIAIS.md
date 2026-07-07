# 17 — Módulo de Propostas Comerciais

> **Escopo:** exclusivo do módulo de **Serviço** (acesso: admin, gerente e role `service`).
> **Última atualização:** 03/07/2026.
> Complementa o doc [16 - Fluxo e Regras do Board de Serviços](16%20-%20FLUXO%20E%20REGRAS%20DO%20BOARD%20DE%20SERVI%C3%87OS.md) (§3.1.1).

---

## 1. O que é

Uma **Proposta Comercial** é o documento de proposta de serviço (calibração/manutenção etc.) gerado dentro do HSGrowth. Substitui o antigo anexo "Proposta Comercial" que ficava na seção Documentos do Resumo.

Fica acessível em dois lugares:
- **Página na sidebar** ("Propostas"): lista todas as propostas do sistema (visualizar, editar, criar, ver histórico, excluir).
- **Seção "Propostas" no card de Serviço** (abaixo de Produtos): criar, listar, vincular, desvincular e ver histórico das propostas daquele card.

---

## 2. O que a proposta preenche automaticamente

### 2.1. Criando a partir de um card (aba Propostas → "Nova proposta")
O sistema **pré-preenche** a partir do card:

| Campo | Origem |
|---|---|
| **Cliente** | `client_id` do card |
| **Pessoa / Aos cuidados de** | `person_id` do card |
| **Itens de produto/serviço** | produtos do card (`service_card_products`): descrição, SKU, quantidade, preço unitário; unidade = `Unid` |
| **Outros itens ou serviços** | template padrão de calibração, com **Modelo** e **Aparelhos** preenchidos dinamicamente a partir dos aparelhos do card |

### 2.2. Sempre (criando de qualquer forma)

| Campo | Valor automático | Editável? |
|---|---|---|
| **Nº Proposta** | sequência própria auto-incremento (próximo número livre) | ❌ não |
| **Vendedor** | nome do **usuário logado** (o criador) | ❌ não — **imutável** (ver §3.3) |
| **Data da Proposta** | data de hoje | ✅ sim |
| **Status interno** | "Rascunho" | ✅ sim |
| **Assinatura** | `Atenciosamente,` + nome do usuário logado | ✅ sim |
| **Observações** | texto padrão | ✅ sim |
| **Aos cuidados de** (no PDF) | **e-mail** da pessoa vinculada | — |

---

## 3. Regras de negócio

### 3.1. Numeração
Sequência própria, auto-incremento, independente de qualquer outra numeração do sistema. Em caso de concorrência há retry automático (evita número duplicado).

### 3.2. Marcador (aprovada / não aprovada / em aberto)
Derivado do **conjunto** de cards vinculados, com prioridade **Perdido > Ativo > Ganho**:

1. Algum card vinculado em **Perdido** → 🔴 **não aprovada**
2. Senão, algum card ainda **ativo** → 🟡 **em aberto**
3. Senão (todos os cards em **Ganho**) → 🟢 **aprovada**
4. Sem card vinculado → 🟡 **em aberto**

> Um card é "Ganho" se está numa lista `is_done_stage`, "Perdido" se `is_lost_stage`, senão "ativo".

Exemplos: 1 ativo→em aberto · 1 ganho→aprovada · 1 perdido→não aprovada · ganho+ativo→em aberto · 2 ganho→aprovada · ganho+perdido→não aprovada.

### 3.3. Vendedor = criador (imutável)
- Na criação, `seller_name` recebe o nome do usuário logado (definido no **backend**, de forma autoritativa — o que o front enviar é ignorado).
- Em qualquer **edição posterior**, `seller_name` **nunca** é alterado, mesmo que outro usuário edite a proposta. O campo aparece read-only no formulário.

### 3.4. Proposta compartilhada em vários cards (N:N)
- A mesma proposta pode estar vinculada a **vários cards ao mesmo tempo** (ex.: criada no board de Cobrança e reaproveitada no de Serviço).
- Editar/regerar reflete em **todos** os cards vinculados.
- Na página `/propostas`, a coluna **Card Vinculado** mostra **chips de todos** os cards (clicáveis → abrem o card no board).
- Implementação: tabela de vínculo `proposal_service_cards`.

### 3.5. Histórico de versões
- A cada **edição salva**, o **estado anterior** é arquivado (dados em JSON + PDF daquele momento) e registra **quem** fez a alteração (`changed_by` = usuário logado).
- Ícone de **histórico** (🕘) na `/propostas` e na seção do card abre um modal listando as versões: data da alteração, autor, nº/cliente/total, e botões **Ver** e **Baixar** o PDF de cada versão anterior.
- A criação **não** gera versão (é a v1 corrente); só edições subsequentes arquivam.

### 3.6. Excluir × Desvincular
- **Lixeira (🗑) na seção Propostas do card** → apenas **desvincula** a proposta daquele card. A proposta continua existindo e vinculada aos demais cards. Remove o PDF auto-anexado daquele card.
- **Excluir permanente** → botão na página `/propostas`; faz soft-delete da proposta e a remove de **todos** os cards (com os PDFs).

### 3.7. Regra de avanço do board
As etapas de **Proposta** (board de Serviço, transições 4 e 5) e **Proposta → Operações** (board de Cobrança) exigem **≥1 proposta vinculada** ao card — não mais um documento anexado no Resumo.

---

## 4. Endereço de entrega (ViaCEP)

Por padrão o endereço usado na proposta/PDF é o **do cliente cadastrado** (+ Fone e e-mail da pessoa).

Se você marcar **"O endereço de entrega do cliente é diferente do endereço de cobrança"**, abre um formulário estruturado. Ao digitar o **CEP** e clicar em buscar, o sistema consulta o **ViaCEP** (`https://viacep.com.br/ws/{cep}/json/`) e preenche automaticamente:

| Campo preenchido | Origem no ViaCEP |
|---|---|
| **Cidade** | `localidade` |
| **UF** | `uf` |
| **Endereço (logradouro)** | `logradouro` |
| **Bairro** | `bairro` |

Os demais campos são manuais: **Número, Complemento, Insc. estadual, Destinatário, Tipo de pessoa (física/jurídica), CPF/CNPJ, Fone**.

No **PDF**, quando o endereço de entrega está marcado, aparece uma **caixa única dividida ao meio**: *Endereço do Cliente* (esquerda) | *Endereço de Entrega* (direita).

---

## 5. PDF

- Gerado com **WeasyPrint** (HTML → PDF), com a marca H&S.
- **Anexado automaticamente** a cada card vinculado (aba Arquivos do card) ao criar, editar ou vincular. Substitui o PDF anterior daquela proposta no card; pode ser deletado manualmente.
- Botões **Ver** (inline) e **Baixar** disponíveis na seção Propostas do card, na página `/propostas` e no histórico (por versão).

---

## 6. Modelo de dados (resumo técnico)

| Tabela | Papel |
|---|---|
| `proposals` | proposta (cabeçalho, financeiro, transporte, condições, endereço de entrega, assinatura) |
| `proposal_items` | itens de produto/serviço da proposta |
| `proposal_service_cards` | vínculo **N:N** proposta ↔ card de serviço (`UNIQUE(proposal_id, service_card_id)`) |
| `proposal_versions` | histórico: snapshot (JSON) + `pdf_path` + `changed_by` + `version_number` por proposta |

> Nota de migração: a antiga coluna `proposals.service_card_id` foi substituída pela tabela de vínculo (padrão expand/contract). A coluna permanece órfã no banco até uma migration de limpeza posterior.

### 6.1. Principais endpoints (`/api/v1/proposals`)
- `GET ""` · `POST ""` · `GET /{id}` · `PUT /{id}` · `DELETE /{id}` (excluir permanente)
- `GET /prefill/{card_id}` · `GET /by-card/{card_id}`
- `GET /{id}/pdf?download=`
- `POST /{id}/cards` (vincular) · `DELETE /{id}/cards/{card_id}` (desvincular)
- `GET /{id}/versions` · `GET /{id}/versions/{version_id}/pdf?download=`

---

## 7. Arquivos-chave

**Backend:** `models/proposal.py`, `models/proposal_service_card.py`, `models/proposal_version.py`, `schemas/proposal.py`, `repositories/proposal_repository.py`, `services/proposal_service.py`, `services/proposal_pdf_service.py`, `api/v1/endpoints/proposals.py`.

**Frontend:** `services/proposalService.ts`, `pages/Proposals.tsx`, `components/proposals/ProposalModal.tsx`, `components/proposals/ProposalHistoryModal.tsx`, `components/service/ServiceProposalsSection.tsx`, `utils/proposalDefaults.ts`, `utils/proposalPdf.ts`, `utils/proposalMarker.ts`.
