# Criar a conta do Daily.co — roteiro

**Para:** quem administra as contas (HS Growth)
**Quando:** antes de começar a Fase 1 — a chave é necessária na Task 10
**Tempo:** ~10 minutos

---

## 1. Criar a conta

1. Acesse **https://dashboard.daily.co/signup**
2. Cadastre com o e-mail corporativo (de preferência um e-mail de equipe, não pessoal — se a pessoa sair, a conta continua acessível)
3. Confirme o e-mail

**Plano:** comece no **gratuito** — inclui 10.000 minutos de participante por mês, suficiente para todo o desenvolvimento e a homologação.

> ⚠️ **O Daily exige cartão de crédito para liberar o acesso à API**, mesmo no plano gratuito ("É necessário um cartão de crédito para testar as funcionalidades da API do Daily"). Como toda a integração passa pela API — criar sala, gerar token, gravar —, o cartão é obrigatório desde o início. Eles concedem **US$ 15 de crédito** para desenvolvimento.
>
> Isso **não muda o custo previsto**: os 10.000 minutos gratuitos continuam valendo e o desenvolvimento consome poucas dezenas de minutos. A cobrança real só começa com o time usando em produção.
>
> Ao cadastrar: usar **cartão corporativo** e, se o menu **Cobrança** oferecer, configurar um **alerta de gasto** (ex.: US$ 50) para avisar caso algo fuja do previsto.

---

## 2. Pegar a chave de API

1. No painel, menu lateral → **Developers**
2. Copie a **API key** (é uma sequência longa de letras e números)

> ⚠️ **Essa chave é uma senha.** Quem tiver ela pode criar reuniões e gerar custo na conta. Não cole em chat público, commit, issue ou documento compartilhado. Envie por canal seguro (gerenciador de senhas ou mensagem privada).

---

## 3. Nome do domínio

No mesmo painel, anote o **domínio** da conta — algo como `suaempresa.daily.co`. É o endereço onde as salas vão ficar. Se der para escolher, use algo reconhecível, porque **o cliente vê essa URL** ao entrar na reunião.

---

## 4. Onde a chave vai

No **EasyPanel**, serviço do **backend**, adicione as variáveis de ambiente:

```
DAILY_API_KEY=<a chave copiada no passo 2>
DAILY_ENABLED_USER_IDS=18
DAILY_DEV_MODE=true
FRONTEND_URL=https://hsgrowth.healthsafetytech.com
```

**O que cada uma faz:**

| Variável | Para quê |
|---|---|
| `DAILY_API_KEY` | a chave da conta |
| `DAILY_ENABLED_USER_IDS=18` | só o usuário 18 enxerga a funcionalidade, até a homologação |
| `DAILY_DEV_MODE=true` | impede que convite de teste chegue a e-mail de cliente |
| `FRONTEND_URL` | **crítico** — é a base do link que o cliente recebe. Sem isso, o link sai apontando para `localhost` e não funciona |

As duas primeiras mudam depois da homologação (ver Task 11 do plano da Fase 1).

---

## 5. Conferir se funcionou

Depois do deploy, com a chave configurada, este comando deve responder com a lista de salas (provavelmente vazia no começo) em vez de erro de autenticação:

```bash
curl -s -H "Authorization: Bearer SUA_CHAVE_AQUI" https://api.daily.co/v1/rooms
```

Resposta esperada: algo como `{"total_count":0,"data":[]}`.
Se vier `{"error":"authentication-error"}`, a chave está errada ou incompleta.

---

## Ainda não é hora do Cloudflare R2

O bucket de gravações só entra na **Fase 3**. Quando chegarmos lá, faremos juntos — é criar uma "pasta" no armazenamento da Cloudflare e gerar duas credenciais de acesso. Roteiro próprio na época.
