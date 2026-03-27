# Prompt de Resumo e Avaliação de Ligações

Você receberá uma transcrição já corrigida e alinhada entre CLIENTE e VENDEDOR.

## Formato de Saída

Retorne **exclusivamente** um objeto JSON válido, sem nenhum texto antes ou depois, sem markdown, sem blocos de código. O JSON deve seguir exatamente esta estrutura:

```json
{
  "summary": "string — resumo objetivo da conversa",
  "next_steps": "string — o que foi combinado ou esperado após a ligação",
  "general_evaluation": "string — clareza, receptividade e nível de qualificação",
  "situation": "Acompanhamento em aberto | Oportunidade fechada | Sem potencial",
  "final_score": 0.0,
  "classification": "Excelente | Boa | Regular | Fraca | Crítica",
  "matrix_evaluation": [
    {
      "block": "string — nome do bloco",
      "grade": 0,
      "justification": "string — 1 a 2 frases",
      "not_applicable": false,
      "uncovered_blocks": [
        {
          "name": "string — nome do sub-bloco",
          "suggestion": "string — o que o vendedor deveria ter dito ou perguntado"
        }
      ]
    }
  ]
}
```

- `final_score`: número decimal com uma casa (ex: 5.3), média das notas dos blocos com `not_applicable: false`
- `uncovered_blocks`: lista apenas os sub-blocos não cobertos; se todos foram cobertos, retorne array vazio `[]`
- Blocos N/A: inclua o bloco no array com `"not_applicable": true`, `"grade": null`, `"justification": "Caminho não aplicável"` e `"uncovered_blocks": []`

---

## Tarefas de Avaliação

### 1. Resumo Estruturado

Preencha os campos `summary`, `next_steps`, `general_evaluation` e `situation`.

- **summary**: objetivo da ligação, pontos principais e informações relevantes.
- **next_steps**: o que foi combinado, solicitado ou esperado após a ligação.
- **general_evaluation**: clareza da conversa, receptividade do cliente e nível de qualificação da oportunidade.
- **situation**: escolha entre `Acompanhamento em aberto`, `Oportunidade fechada` ou `Sem potencial`.

---

### 2. Avaliação por Matriz de Ligação

Para cada bloco abaixo, atribua uma nota de 0 a 10 e uma justificativa curta. Para os sub-blocos não cobertos, inclua uma sugestão do que o vendedor deveria ter dito ou perguntado.

#### ABERTURA
| Sub-bloco | Objetivo | O que avaliar |
|---|---|---|
| Apresentação + permissão | Gerar contexto e abrir conversa | O vendedor se apresentou, disse o nome da empresa e pediu permissão para falar? |
| Responsável por SST | Garantir que fala com a pessoa certa | Confirmou se o contato é responsável por Segurança do Trabalho ou SST? |
| Redirecionamento | Captar contato correto | Se não era a pessoa certa, pediu indicação de quem seria? |
| Prova Social | Gerar autoridade imediata | Citou empresas conhecidas do segmento do lead para gerar credibilidade? |
| Motivo do contato | Gerar relevância sem vender | Explicou o motivo da ligação de forma consultiva, sem parecer que está vendendo? |

#### DIAGNÓSTICO ALCOOLEMIA
| Sub-bloco | Objetivo | O que avaliar |
|---|---|---|
| Existe política? | Mapear cenário inicial | Perguntou se a empresa já tem alguma política ou rotina de testes de alcoolemia? |

> **Regra de caminho:** Se o cliente indicou SIM (já tem processo), avalie o bloco "DIAGNÓSTICO ALCOOLEMIA (se SIM)" e marque "DIAGNÓSTICO ALCOOLEMIA (se NÃO)" como `not_applicable: true`. Se indicou NÃO, faça o inverso.

#### DIAGNÓSTICO ALCOOLEMIA (se SIM)
| Sub-bloco | Objetivo | O que avaliar |
|---|---|---|
| Como funciona hoje | Entender processo atual | Perguntou como o processo funciona? Se é rotina, suspeita ou pontual? |
| Responsável pela medição | Mapear operação | Perguntou quem faz as medições? Equipe interna ou automatizada? |
| Volume de testes | Dimensionar escopo | Perguntou quantas pessoas passam por teste por mês? |
| Dor principal | Mapear gargalos | Investigou o maior desafio do processo atual? |

#### DIAGNÓSTICO ALCOOLEMIA (se NÃO)
| Sub-bloco | Objetivo | O que avaliar |
|---|---|---|
| Incidente ou risco | Gerar consciência de impacto | Perguntou se já houve algum incidente ou quase-incidente relacionado? |
| Necessidade atual | Mapear prioridade | Explorou se já existe a necessidade percebida ou se ainda não virou prioridade? |
| Gatilho de interesse | Entender motivador | Investigou o que fez o tema entrar na pauta? |

#### DIAGNÓSTICO OPERAÇÃO
| Sub-bloco | Objetivo | O que avaliar |
|---|---|---|
| Tamanho da operação | Dimensionar escopo | Perguntou quantas pessoas estão em operação direta? |
| Incidente ou risco | Mapear impacto | Perguntou se já tiveram alguma situação de risco? |
| Tamanho da operação (filiais) | Dimensionar escopo | Perguntou se há mais de uma unidade ou filial? |

#### CONEXÃO DE VALOR
| Sub-bloco | Objetivo | O que avaliar |
|---|---|---|
| Resumo do cenário | Conectar dor com solução | O vendedor resumiu o cenário do cliente e conectou com a solução de forma consultiva? |

#### FECHAMENTO
| Sub-bloco | Objetivo | O que avaliar |
|---|---|---|
| Decisores | Mapear stakeholders | Perguntou quem mais participa da decisão? |
| Proposta de diagnóstico | Avançar para próxima etapa | Propôs uma próxima etapa clara, como uma reunião de diagnóstico? |
| Data e horário | Confirmar reunião | Sugeriu datas e confirmou horário? |
| Envio de convite | Fechar próximo passo | Coletou contato (WhatsApp/e-mail) e confirmou envio de convite? |
| Fechamento da ligação | Finalizar com clareza | Encerrou de forma profissional, reforçando o próximo passo? |

---

### 3. Nota Final

- `final_score`: média das notas dos blocos com `not_applicable: false`, uma casa decimal
- `classification`: `Excelente` (9-10) | `Boa` (7-8.9) | `Regular` (5-6.9) | `Fraca` (3-4.9) | `Crítica` (0-2.9)

---

## Regras de Padronização

- Telefones/WhatsApp: formato `(XX) XXXXX-XXXX`. Se incompleto: "Telefone informado parcialmente/inaudível".
- CNPJs: formato `XX.XXX.XXX/XXXX-XX`. Se incompleto: "CNPJ informado de forma incompleta/inaudível".
- A expressão "mil ao contrário" deve ser interpretada como `0001`.

## Regras Gerais

- Retorne APENAS o JSON. Nenhum texto, nenhum comentário fora do JSON.
- Seja objetivo e claro.
- Não cite nomes do vendedor nem da empresa vendedora.
- Não invente informações que não aparecem na conversa.
- Avalie apenas com base no que foi dito. Se algo não foi mencionado, considere como não coberto.
- Nas sugestões, use tom consultivo e natural.
