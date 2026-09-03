# Reunião por vídeo no CRM — material para decisão com o gestor

**Data:** 02/09/2026 (custos revisados em 03/09/2026 com o volume real)
**Para:** conversa de aprovação (vale a pena fazer?)
**Detalhe técnico completo:** `2026-09-01-reuniao-video-daily-design.md`
**Câmbio usado:** US$ 1 = R$ 5,20

---

## 1. O que é a proposta, em uma frase

Ter a **reunião por vídeo rodando dentro do próprio CRM** — o cliente entra por um link, sem instalar nada — com **gravação, transcrição e análise por IA** anexadas automaticamente ao negócio.

---

## 2. A pergunta que o gestor vai fazer primeiro

> "A gente já faz reunião pelo Teams e já tem transcrição com IA. Pra que trocar?"

Resposta honesta — **não é trocar, é o que o Teams não faz:**

| | Teams (hoje) | Daily (proposta) |
|---|---|---|
| Cliente entra sem instalar/criar conta | ⚠️ com atrito | ✅ um link, abre no navegador |
| Reunião acontece dentro do CRM | ❌ sai do sistema | ✅ com o negócio do lado |
| Gravação sob nosso controle | ❌ fica na Microsoft | ✅ no nosso bucket |
| Transcrição + análise IA | ✅ já temos | ✅ mesmo pipeline |
| **Cliente se auto-agenda por um link** | ❌ não existe | ✅ Fase 2 |
| **IA sugerindo resposta durante a call** | ❌ não existe | ✅ Fase 5 |

**O Teams continua funcionando.** A proposta é somar uma opção, não substituir.

### E o fluxo do time não muda (importante)

Ao criar a reunião, o vendedor escolhe no próprio formulário: **"No CRM"** ou **"Teams/Outlook"**. Só isso muda na tela.

Nos **dois** casos o comportamento continua idêntico ao de hoje:

- o evento entra na agenda do Outlook do vendedor;
- o cliente recebe o convite por e-mail, do mesmo jeito, com **um** link;
- o horário bloqueia a agenda, então o SDR continua conferindo a disponibilidade do vendedor exatamente onde já confere.

**Consequência prática: zero treinamento.** Para o time, é como se o Teams tivesse ficado mais fácil para o cliente.

---

## 3. Custos — volume real de vocês

**Volume:** 7 pessoas x 20 reuniões/mês = **140 reuniões hoje**, chegando a **180** quando entrarem mais 2 pessoas.
**Duração:** 1 hora cada. **Participantes:** 2 (vendedor + cliente).

### Quadro geral

| Cenário | 140 reuniões/mês | 180 reuniões/mês |
|---|---|---|
| **Fase 1** — só a reunião por vídeo | **R$ 171** | **R$ 279** |
| **Fase 3** — grava tudo em vídeo + transcrição + IA | **R$ 955** | **R$ 1.288** |
| **Fase 3** — grava tudo, **só áudio** | **R$ 577** | **R$ 801** |
| **Fase 3** — grava **só 40%** (proposta/negociação) | **R$ 484** | **R$ 682** |
| **Fase 5** — tudo + IA sugerindo resposta ao vivo | **R$ 1.647** | **R$ 2.177** |

### Onde o dinheiro vai (140 reuniões, gravando tudo em vídeo)

| Item | US$/mês | R$/mês | % |
|---|---|---|---|
| Gravação | 113 | 589 | **62%** |
| Transcrição (pós-call) | 36 | 188 | 20% |
| Vídeo (minutos acima do grátis) | 27 | 142 | 15% |
| Análise por IA (OpenAI) | 6 | 29 | 3% |
| Armazenamento (R2) | 1 | 7 | 1% |
| **Total** | **184** | **955** | |

**A gravação é 62% da conta.** É nela que estão as decisões de economia.

### Três formas de reduzir

1. **Gravar só áudio** — economiza **R$ 378/mês** (custa 1/3 do vídeo). Para transcrever e analisar, áudio basta; vídeo só importa se alguém for reassistir a reunião.
2. **Gravar só as reuniões que importam** — se gravar apenas proposta/negociação (~40%), economiza **R$ 471/mês**.
3. **As duas juntas** — cai para cerca de R$ 300/mês.

### Correções importantes ao que se pensava antes

> ⚠️ **A Fase 1 não é de graça neste volume.** O Daily dá 10.000 minutos grátis/mês, mas 140 reuniões de 1 hora com 2 participantes consomem **16.800 minutos** (o Daily cobra por *participante*-minuto). Sobra uma conta de ~R$ 171/mês já na Fase 1. Com 180 reuniões, ~R$ 279/mês.

> ⚠️ **Um terceiro participante encarece.** Se o SDR também entrar na reunião (vendedor + SDR + cliente), o custo total sobe de R$ 955 para **R$ 1.130/mês** no cenário de 140. Vale definir se o SDR participa ou não.

> ⚠️ **O armazenamento acumula.** Os valores são do primeiro mês. Gravando tudo em vídeo sem apagar nada, em 12 meses o armazenamento vai de R$ 7 para ~R$ 98/mês. Definir prazo de descarte resolve — e com áudio o problema praticamente desaparece.

---

## 4. Esforço de desenvolvimento

| Fase | Entrega | Esforço |
|---|---|---|
| **1** | Reunião no CRM + link público para o cliente | 6-7 dias |
| **3** | Gravação + transcrição + análise IA | 4-5 dias |
| **2** | Cliente se auto-agenda por um link | 6-8 dias |
| **5** | IA sugerindo resposta durante a call | 3-4 dias |
| **4** | Mover o card sozinho quando o cliente entra | 1 dia |

**Fase 1 + 3 ≈ 11 dias úteis** de uma pessoa focada — entrega reunião gravada, transcrita e analisada.

Boa parte do caminho já está andada: existe um projeto interno (`dn.nexus`) com tudo isso **funcionando**, que serve de referência. E o CRM **já tem** o pipeline de transcrição e análise por IA rodando (usado hoje com o Teams) — o Daily só entra como uma fonte nova.

---

## 5. Perguntas para levar ao gestor

### Sobre valor

1. O atrito de o cliente entrar por Teams (instalar/criar conta) **é um problema real** hoje? Perdemos reunião por causa disso?
2. Entre as entregas, qual resolve mais dor: **reunião dentro do CRM**, **cliente se auto-agendando** ou **IA sugerindo resposta na hora**?
3. Se só desse para fazer **uma** fase este trimestre, qual seria?

### Sobre custo — as decisões que mais pesam

4. **Gravar todas** as reuniões ou só as de proposta/negociação? (diferença de ~R$ 470/mês)
5. Precisamos de **vídeo** na gravação, ou **áudio basta**? (áudio custa 1/3 → economia de ~R$ 380/mês)
6. Por quanto tempo guardar as gravações — 6 meses, 1 ano, sempre?
7. O **SDR participa** da reunião junto? (um 3º participante custa ~R$ 175/mês a mais)
8. A **IA ao vivo** justifica dobrar a conta (de ~R$ 955 para ~R$ 1.647)?
9. Existe orçamento aprovado para ~**R$ 500 a R$ 1.000/mês** em ferramenta, ou precisa passar por aprovação de custo recorrente?

### Sobre execução

10. Quem desenvolve e quando? São ~11 dias para as Fases 1 e 3.
11. Faz sentido rodar a **Fase 1 como piloto** (~R$ 171/mês), medir o uso real e só então decidir sobre gravação?

---

## 6. O que já está resolvido (não é bloqueio)

| Item | Situação |
|---|---|
| LGPD / consentimento | ✅ tratado internamente |
| Conta Cloudflare R2 | ✅ criada, cartão cadastrado (falta conectar ao projeto — trabalho técnico, ~algumas horas) |
| OpenAI | ✅ já em uso no CRM |
| Domínio público para os links | ✅ já temos |
| Infra de vídeo, banda, servidor | ✅ não é nossa responsabilidade — fica com o Daily |

---

## 7. Recomendação

**Rodar a Fase 1 como piloto (~R$ 171/mês) antes de decidir sobre gravação.**

São 6-7 dias de trabalho e um custo baixo para descobrir o que nenhuma planilha responde: o cliente entra mais fácil? O time adota? Quantas reuniões de fato acontecem por lá? Com esse dado, a decisão sobre gravação — que é 62% da conta — deixa de ser aposta.

**Se a gravação for aprovada, começar por áudio.** Entrega transcrição e análise por IA, que é o valor real, por 1/3 do preço. Migrar para vídeo depois é trivial; o contrário é dinheiro gasto.

**Sobre a Fase 5 (IA ao vivo):** dobra a conta mensal. Vale discutir depois que o time estiver usando as fases 1 e 3 — aí dá para estimar o ganho com base em reuniões reais, não em expectativa.

---

## 8. Fontes dos preços

- Daily.co — Video SDK pricing: https://www.daily.co/pricing/video-sdk/
- Cloudflare R2 — pricing: https://developers.cloudflare.com/r2/pricing/
- Câmbio USD/BRL em 02/09/2026: R$ 5,16 (arredondado para R$ 5,20 nas contas)
