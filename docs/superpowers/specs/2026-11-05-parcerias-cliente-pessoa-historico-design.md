# Parcerias — oportunidade ligada a Cliente e Pessoa, com histórico de alterações

**Data:** 05/11/2026 · **Versão:** 1.11.13 (só homo) · **Migration:** sim (2 colunas)

## Problema

A seção "Empresa e contato" da oportunidade de parceiro guarda texto solto. A empresa
indicada não existe em Clientes nem o contato em Pessoas, e alguém pode cadastrar a
mesma empresa de novo em Vendas. O único elo hoje é o CNPJ, usado pelo semáforo.

## Decisões do usuário

- Ligar **desde o cadastro** da oportunidade (opção B), não só no ganho.
- Cliente que já existe: o que a equipe do parceiro digitar **atualiza** o cadastro.
- Clientes e Pessoas ganham **histórico de alterações**, visível a todos que já
  abrem essas telas.
- A lista "Negócios deste cliente" na ficha do Cliente fica para depois.

## Como fica

### Banco
`partner_opportunities` ganha `client_id` (FK `clients`, SET NULL) e `person_id`
(FK `persons`, SET NULL). As oportunidades que já existem se ligam na próxima vez
que forem salvas (no homo só há dados de teste).

### Ligação (backend, `services/parcerias/clientes.py`)
Roda ao criar a oportunidade e ao editar CNPJ, empresa ou contato.

**Cliente**, pelo CNPJ (sem máscara, maiúsculo), ignorando excluídos:
- não existe → cria com `name` (o campo "Empresa" da tela) = razão social, `document` = CNPJ,
  `city`, `state`, `sector`, `relationship_type` = "Lead" (regra da consultoria:
  toda empresa nasce Lead), `source` = "parceria";
- existe → atualiza só os campos que o parceiro **preencheu** (vazio não apaga):
  razão social ("Empresa"), cidade, UF, setor. O "Nome Fantasia" (`company_name`) o parceiro não informa. O CNPJ nunca muda por aqui. O tipo de
  relacionamento não é tocado (Cliente não volta para Lead/Prospect).

**Pessoa**, dentro do Cliente (`organization_id`), só se houver nome do contato:
- procura pelo e-mail (`email`, `email_commercial` ou `email_personal`); sem e-mail,
  pelo nome (sem diferença de maiúsculas);
- não existe → cria com nome, cargo (`position`), `email_commercial`, `phone_commercial`;
- existe → atualiza o que foi preenchido.

O que o parceiro digitou continua gravado na oportunidade (dados da indicação).

**Na edição, só vai para o cadastro o que o parceiro mudou naquela hora.** A tela
reenvia o formulário inteiro; sem essa regra, uma correção que a H&S fez depois em
Clientes/Pessoas seria desfeita pelo dado antigo da oportunidade. Quando a ligação
muda (CNPJ novo, outra Pessoa) ou a oportunidade ainda não tinha Cliente, vai tudo
o que estiver preenchido. Telefone vai para Pessoas com a máscara da tela
("(11) 98888-7777").

### Histórico de alterações
- Toda criação/edição de Cliente e Pessoa grava no `audit_logs` a **foto completa**
  dos campos do cadastro (antes e depois), não só os 7 de hoje.
- Vale para as telas de Clientes e Pessoas e para a ligação da Parceria. A da Parceria
  vai marcada como **"via Parceria"** e com o nome do usuário (ex.: vendedor do parceiro).
- Novas rotas `GET /clients/{id}/historico` e `GET /persons/{id}/historico`:
  lista de {quando, quem, origem, mudanças: [{campo, antes, depois}]}, só com os
  campos que mudaram, mais recente primeiro. Parceiro e Financeiro não acessam
  (tranca geral já bloqueia `/clients` e `/persons`).
- Na tela: seção "Histórico de alterações" no modal de editar Cliente e Pessoa.

### Tela da oportunidade
- Parceiro: igual a hoje.
- H&S: na seção "Empresa e contato", "Cliente no CRM" e "Pessoa no CRM" com o nome;
  clicar abre o modal de Cliente/Pessoa (com o histórico).

## Fora do escopo
- Lista de negócios na ficha do Cliente.
- Histórico de alterações feitas por outros caminhos (integrações, importação,
  criação de cliente dentro do card de Vendas) — continuam como estão.

## Testes
- cria Cliente e Pessoa novos; liga a existentes pelo CNPJ (com e sem máscara);
- atualiza só o preenchido; não rebaixa tipo de relacionamento; ignora excluído;
- trocar o CNPJ religa; Pessoa achada por e-mail e por nome;
- histórico: grava antes/depois, marca "via Parceria", só campos mudados;
  parceiro/Financeiro recebem 403 nas rotas de histórico.
