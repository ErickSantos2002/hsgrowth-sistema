# Reunião por vídeo no CRM — material para decisão com o gestor

**Data:** 02/09/2026
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

Se a resposta do gestor for *"o atrito do cliente entrar no Teams não é problema pra gente"*, então o valor real está concentrado nas Fases 2 e 5 — e talvez a ordem das fases deva mudar.

---

## 3. Custos — cenário de vocês

**Premissas:** time de 9 pessoas, reuniões de **1 hora**, **2 participantes** por reunião (vendedor + cliente).

Como "20 reuniões/mês" pode significar duas coisas, seguem os dois cálculos:

### Cenário A — 20 reuniões/mês no time todo

| Item | Cálculo | US$/mês | R$/mês |
|---|---|---|---|
| Vídeo | 2.400 min (limite grátis: 10.000) | **0** | **0** |
| Gravação | 1.200 min x 0,01349 | 16,19 | 84 |
| Transcrição pós-call | 1.200 min x 0,0043 | 5,16 | 27 |
| Armazenamento (R2) | ~15 GB/mês | 0,08 | 0,40 |
| IA — análise pós-reunião | 20 análises | 0,80 | 4 |
| **Total sem IA ao vivo** | | **≈ 22** | **≈ R$ 115** |
| *Trocando por transcrição ao vivo* | 2.400 min x 0,0059 | +9 | +47 |
| *IA sugerindo resposta na call* | ~20 x US$ 0,50 | +10 | +52 |
| **Total com IA ao vivo** | | **≈ 41** | **≈ R$ 215** |

### Cenário B — 20 reuniões/mês por pessoa (9 pessoas = 180/mês)

| Item | Cálculo | US$/mês | R$/mês |
|---|---|---|---|
| Vídeo | 21.600 min − 10.000 grátis = 11.600 x 0,004 | 46,40 | 241 |
| Gravação | 10.800 min x 0,01349 | 145,69 | 758 |
| Transcrição pós-call | 10.800 min x 0,0043 | 46,44 | 242 |
| Armazenamento (R2) | ~135 GB/mês | 1,88 | 10 |
| IA — análise pós-reunião | 180 análises | 7,20 | 37 |
| **Total sem IA ao vivo** | | **≈ 248** | **≈ R$ 1.290** |
| *Trocando por transcrição ao vivo* | 21.600 min x 0,0059 | +81 | +421 |
| *IA sugerindo resposta na call* | ~180 x US$ 0,50 | +90 | +468 |
| **Total com IA ao vivo** | | **≈ 419** | **≈ R$ 2.180** |

### Observações que mudam a conta

- **O armazenamento acumula.** Os valores acima são do primeiro mês. Em 12 meses sem apagar nada: Cenário A ≈ US$ 2,55/mês; Cenário B ≈ US$ 24/mês. Definir prazo de descarte resolve.
- **Um 3º participante encarece o vídeo**, porque o Daily cobra por participante-minuto. No Cenário B com 3 pessoas, o vídeo sobe de US$ 46 para ~US$ 130/mês.
- **Gravar só o que importa reduz muito.** Gravação é o maior item da conta. Se gravar só reuniões de proposta/negociação, o custo cai proporcionalmente.
- **Gravação só de áudio custa 1/3** (US$ 0,005 vs 0,01349/min). Para transcrição e análise, áudio basta — vídeo só importa se alguém for reassistir.
- **A IA ao vivo pode ficar bem mais barata** usando um modelo menor. Os números acima assumem GPT-4o; com um modelo econômico cai para menos de 1/10 disso.

### Só para a Fase 1 (sem gravação): custo **zero** nos dois cenários

Nos dois casos o consumo de vídeo fica dentro dos 10.000 minutos grátis do Daily. Dá para **testar de graça** antes de decidir sobre gravação.

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

### Sobre volume e custo

4. Quantas reuniões por mês, de fato? (Cenário A ou B — muda de R$ 115 para R$ 1.290/mês)
5. **Gravar todas** as reuniões ou só as de proposta/negociação?
6. Vídeo é necessário na gravação, ou **áudio basta**? (áudio custa 1/3)
7. Por quanto tempo guardar as gravações — 6 meses, 1 ano, sempre?
8. A **IA ao vivo** justifica dobrar o custo mensal?

### Sobre execução

9. Quem desenvolve e quando? São ~11 dias para as Fases 1 e 3.
10. Topa começar pela **Fase 1 (custo zero)** como piloto, medir o uso real e só então decidir gravação?

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

**Começar pela Fase 1 como piloto.** Custo **zero**, 6-7 dias de trabalho, e ao fim vocês têm dado real — quantas reuniões acontecem, se o cliente entra mais fácil, se o time usa. Com isso na mão, a decisão sobre gravação (que é o que custa) deixa de ser aposta.

Se o gestor priorizar o **auto-agendamento** (Fase 2), vale saber: ela depende da Fase 1 e é a mais cara de construir, mas é a única entrega que o Teams não cobre de jeito nenhum.

---

## 8. Fontes dos preços

- Daily.co — Video SDK pricing: https://www.daily.co/pricing/video-sdk/
- Cloudflare R2 — pricing: https://developers.cloudflare.com/r2/pricing/
- Câmbio USD/BRL em 02/09/2026: R$ 5,16 (arredondado para R$ 5,20 nas contas)
