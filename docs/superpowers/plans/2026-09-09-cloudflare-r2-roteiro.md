# Criar o bucket no Cloudflare R2 — roteiro

**Para:** quem administra a conta Cloudflare (HS Growth)
**Quando:** antes de testar a gravação de verdade
**Tempo:** ~10 minutos

---

## O que é um bucket

É uma "pasta" no armazenamento em nuvem. As gravações das reuniões ficam
guardadas ali, organizadas por ano e mês:

```
2026/09/2026-09-10-apresentacao-de-proposta-36197.mp4
2026/09/2026-09-11-follow-up-transportes-36240.mp4
```

O bucket é **privado**: ninguém abre um arquivo digitando o endereço. Todo
acesso passa por um link temporário que o CRM gera na hora e que expira
sozinho.

---

## 1. Criar o bucket

1. Acesse **https://dash.cloudflare.com/** e entre na conta
2. No menu lateral: **R2 Object Storage** → **Overview**
3. Clique em **Create bucket**
4. Nome: **`hsgrowth-gravacoes`**
5. Localização: **Automatic** (deixe o padrão)
6. Clique em **Create bucket**

> ⚠️ **Não marque nenhuma opção de acesso público.** O bucket precisa
> continuar privado — é o que impede uma gravação de conversa com cliente de
> ficar acessível na internet.

---

## 2. Anotar o Account ID

Ainda na tela do R2, no canto direito, procure **Account ID** — uma sequência
de letras e números. Copie.

---

## 3. Gerar as credenciais de acesso

1. Na tela do R2, clique em **Manage R2 API Tokens** (ou **API** → **Manage API tokens**)
2. Clique em **Create API token**
3. Nome do token: `HSGrowth CRM`
4. Permissão: **Object Read & Write**
5. Em **Specify bucket(s)**, escolha **Apply to specific buckets only** e
   selecione `hsgrowth-gravacoes`
6. TTL: **Forever** (ou o prazo que preferir — depois precisa renovar)
7. Clique em **Create API Token**

A tela seguinte mostra:

- **Access Key ID**
- **Secret Access Key**

> ⚠️ **A Secret Access Key aparece uma única vez.** Copie antes de fechar. Se
> perder, é preciso gerar outro token.
>
> As duas são senhas: quem as tiver acessa e apaga as gravações. Não cole em
> chat público, commit ou documento compartilhado.

**Por que limitar ao bucket:** se essas credenciais vazarem, o estrago fica
restrito às gravações — não alcança nada mais da conta Cloudflare.

---

## 4. Onde as credenciais vão

### Na sua máquina (para testar o desenvolvimento)

No fim de `backend/.env.local`:

```
R2_ACCOUNT_ID=<o Account ID do passo 2>
R2_ACCESS_KEY_ID=<o Access Key ID do passo 3>
R2_SECRET_ACCESS_KEY=<a Secret Access Key do passo 3>
R2_BUCKET=hsgrowth-gravacoes
```

Depois, para o container ler as variáveis novas:

```
cd C:\Users\HS\Documents\GitHub\hsgrowth-sistema\backend
docker compose -f docker-compose.local.yml up -d
```

(o `docker restart` não relê o arquivo — precisa recriar)

### Em produção (EasyPanel, serviço do backend)

As mesmas quatro variáveis.

---

## 5. Conferir se funcionou

Depois de configurar, peça para eu rodar a verificação. Vou subir um arquivo
de teste, gerar um link, baixar de volta e apagar — confirmando que as
credenciais funcionam de ponta a ponta.

---

## Custo

| | |
|---|---|
| Primeiros 10 GB | grátis |
| Acima disso | US$ 0,015 por GB/mês |
| Download (egress) | **grátis** — é a vantagem do R2 |

Com ~50 GB/mês de gravação e descarte automático em 12 meses, o custo
estabiliza em torno de **US$ 9/mês**.

---

## Ainda falta uma coisa (depois do deploy)

O **segredo do webhook do Daily** (`DAILY_WEBHOOK_SECRET`) só pode ser gerado
quando o webhook for registrado, e isso exige o CRM acessível pela internet.
Fica para a Task 12, junto com o deploy.
