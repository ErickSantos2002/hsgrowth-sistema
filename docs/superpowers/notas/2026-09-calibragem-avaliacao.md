# Calibragem da avaliação de reuniões — 17/09/2026

Comparação entre a nota da nossa régua e a das reuniões que a consultoria já
avaliou. É o que decide se a ferramenta pode ser liberada: uma IA que dá 80
onde a consultoria deu 50 treina o vendedor na direção errada.

## O material

As 7 calls avaliadas estão no CRM como reuniões do Teams da Sandra. Quatro
transcrições foram recuperadas; três não:

| Call | Cliente | Tarefa | Transcrição |
|---|---|---|---|
| C01 | Concrenorte | 33810 | 70.791 caracteres |
| C02 | Unimodal | 33585 | 35.149 |
| C03 | PIRECAL | 33238 | 67.690 |
| C04 | Ludvig | 31362 | 10.336 |
| C05 | Arauco Brasil | 31472 | sem acesso — outro organizador |
| C06 | Leblon Transporte | 24382 | apagada pela retenção do Teams |
| C07 | Rota Transportes | 20011 | apagada pela retenção do Teams |

## Primeira rodada — reprovada

| Call | Consultoria | Nossa régua | Diferença |
|---|---|---|---|
| C01 | 50,5 | 23,2 | −27,3 |
| C02 | 49,0 | 28,3 | −20,7 |
| C03 | 48,0 | 61,1 | +13,1 |

Diferença média de **20,4 pontos**, contra tolerância de 10.

E, pior que o desvio: a **mesma reunião recebeu 23,2 e, minutos depois, 51,0**.
Uma nota que muda 28 pontos entre execuções não serve para treinar ninguém —
o vendedor clicaria em "Reavaliar" e veria outro número.

### A causa

A distribuição de notas de C01 mostra dois avaliadores diferentes:

| | nota 0 | nota 1 | nota 2 |
|---|---|---|---|
| Consultoria | 2 | **21** | 3 |
| Nossa IA | 7 | 9 | 9 |

O avaliador humano classifica quase tudo como 1: reunião real raramente cumpre
um critério por inteiro, e quase nunca deixa de tocar no assunto. A IA lia a
rubrica como tudo-ou-nada, e cada critério oscilava entre 0 e 2 a cada rodada —
daí os 28 pontos de variação.

## O ajuste

Em `servico.py`:

1. **Temperatura 0 e `seed` fixo**, no lugar de 0,2 — consistência importa mais
   que variedade numa classificação.
2. **A escala explicada no prompt:** 2 é exceção (cumpriu por inteiro), 1 é o
   caso comum (fez em parte), 0 é ausência; na dúvida entre duas notas, a do
   meio. Mais a observação de que muitos 0 e muitos 2 são sinal de leitura
   tudo-ou-nada.
3. Critério que se aplicava e não foi cumprido é 0, nunca N/A.

## Segunda e terceira rodadas — aprovada, com ressalvas

| Call | Consultoria | Rodada A | Rodada B | Variação entre rodadas |
|---|---|---|---|---|
| C01 | 50,5 | 39,9 | 36,4 | 3,5 |
| C02 | 49,0 | 34,8 | 34,8 | 0 |
| C03 | 48,0 | 47,5 | 50,0 | 2,5 |
| C04 | parcial | 33,8 | 29,8 | 4,0 |

Diferença média: **8,4** e **10,1** pontos. Variação entre execuções: no máximo
4 pontos, contra 28 antes.

**O que bate bem:** a média por bloco. A IA aponta Fechamento como o ponto mais
fraco (31 a 44), exatamente o que a consultoria concluiu nas 7 calls (43 a 46).
O diagnóstico de onde treinar coincide.

**O que não bate:** a nota absoluta. A IA é sistematicamente mais dura em C01 e
C02 (−10 a −14) e acerta em C03. A concordância critério a critério fica entre
11 e 18 dos 26.

## Recomendação

Liberar como **ferramenta de treinamento**, não como nota de desempenho:

- O valor está nos critérios com evidência literal e na média por bloco, que
  mostram o que treinar. Isso está aderente.
- A nota absoluta não deve ser comparada com a da consultoria nem usada em
  avaliação de pessoas: nossa régua roda mais dura, com cerca de 10 pontos de
  viés para baixo.
- Três reuniões são pouco para ajustar mais. Insistir no prompt com essa
  amostra seria moldar a régua a três conversas e descobrir depois que ela não
  vale para as outras. O caminho é acumular avaliações de uso real e revisar a
  calibragem com mais material.

## Como refazer

```bash
docker cp "Documentação/Avaliacao_Calls_HealthSafety_alinhada_a_matriz.xlsm" \
  hsgrowth-api-local:/tmp/avaliacao.xlsm
docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local \
  python scripts/calibrar_avaliacao.py /tmp/avaliacao.xlsm

# onde a IA discorda, critério a critério, numa call
docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local \
  python scripts/diagnostico_calibragem.py C01
```

Custo: cerca de US$ 0,05 por reunião avaliada.
