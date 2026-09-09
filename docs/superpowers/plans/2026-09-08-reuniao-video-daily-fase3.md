# Reunião por vídeo (Daily) — Fase 3 — Gravação, transcrição e análise IA

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development ou superpowers:executing-plans. Passos com checkbox (`- [ ]`).

**Goal:** O vendedor grava a reunião com um clique; ao encerrar, a gravação vai para o nosso bucket, a transcrição é salva e analisada pela IA, e tudo aparece na aba Reuniões do card. O cliente pode receber um link temporário da gravação.

**Architecture:** O Daily grava e transcreve; ele avisa por **webhook** quando os arquivos estão prontos. O backend baixa e guarda a gravação no **Cloudflare R2**, salva o VTT no banco e roda o **pipeline de análise que já existe** (`transcript_analysis_service`), ampliado com os campos novos. Nada é gravado por padrão: a decisão é do vendedor, na sala.

**Tech Stack:** FastAPI + SQLAlchemy + Alembic, boto3 (R2 é compatível com S3), OpenAI GPT-4o, React + TypeScript.

**Spec:** `docs/superpowers/specs/2026-09-01-reuniao-video-daily-design.md` — decisões valendo na **seção 15**.

**Depende de:** Fase 1 (pronta, não publicada). As duas sobem juntas.

---

## ⚠️ Contexto — leia antes de começar

Vale tudo que valeu na Fase 1:

1. **Não existe homologação. O container local aponta para o banco de PRODUÇÃO** (`62.72.11.28:3388`).
2. A funcionalidade segue atrás de `DAILY_ENABLED_USER_IDS=18` — só o homologador vê.
3. `DAILY_DEV_MODE=true` continua bloqueando convite para e-mail externo.
4. Testes **nunca** chamam a API real do Daily, da OpenAI ou do R2 — sempre mock.
5. **Gravação custa dinheiro** (US$ 0,01349/min). Testes de verdade devem ser curtos, e a gravação apagada em seguida.

**Convenções:** `docker exec -w /app hsgrowth-api-local python -m pytest ...`; `docker cp backend/tests/. hsgrowth-api-local:/app/tests/` antes; `export MSYS_NO_PATHCONV=1`; **`docker restart` após editar backend**; `.env.local` mudou → `docker compose -f docker-compose.local.yml up -d`. **Perguntar antes de commitar.**

---

## O que o dn.nexus ensinou (e evita retrabalho)

| Lição | Onde entra |
|---|---|
| Eventos necessários: `recording.ready-to-download`, `transcript.ready-to-download`, `participant.joined`, `meeting.ended` | Task 4 |
| O webhook é registrado via `POST /webhooks` da API do Daily, e é preciso conferir se já existe um com os mesmos eventos antes de criar outro | Task 5 |
| **Conferir o tamanho do arquivo com HEAD antes de baixar** — arquivo grande estoura a memória. Eles usam teto de 100 MB e, acima disso, guardam só o link | Task 7 |
| **O VTT do Daily é diferente do Teams:** traz identificadores de cue (`transcript:357`) e o falante como `<v Nome:</v>texto`. Nosso parser atual não trata isso e entregaria à IA um texto com números e marcação no meio das frases | Task 8 |
| Webhook não é garantido: sempre ter um caminho de recuperação manual | Task 6 |

---

## Task 1: Configuração do R2 e do modo de gravação

**Files:**
- Modify: `backend/app/core/config.py`
- Modify: `backend/requirements.txt`

- [ ] **Step 1: Adicionar as configurações**

Em `backend/app/core/config.py`, junto do bloco do Daily:

```python
    # Cloudflare R2 — armazenamento das gravações (compatível com S3)
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET: str = "hsgrowth-gravacoes"
    # Validade do link que o cliente recebe (seção 15.5 do design)
    R2_LINK_EXPIRACAO_DIAS: int = 30
    # Retenção das gravações antes do descarte automático
    GRAVACAO_RETENCAO_MESES: int = 12
    # Teto para baixar a gravação em memória; acima disso guardamos só a
    # referência (lição do dn.nexus — arquivo grande estoura a memória)
    GRAVACAO_TAMANHO_MAXIMO_MB: int = 200
```

- [ ] **Step 2: Adicionar o boto3**

Em `backend/requirements.txt`, acrescentar:

```
boto3==1.35.0
```

Instalar no container:

```bash
docker exec hsgrowth-api-local pip install boto3==1.35.0
```

> O `pip install` avulso vale só para a sessão local. O `requirements.txt` é o que garante a instalação no deploy.

- [ ] **Step 3: Conferir que o boto3 carrega**

```bash
docker exec hsgrowth-api-local python -c "import boto3; print('boto3', boto3.__version__)"
```

- [ ] **Step 4: Commit** (perguntar antes)

---

## Task 2: Migration — campos de gravação e tabela de compartilhamentos

**Files:**
- Create: `backend/alembic/versions/2026_09_XX_XXXX-<hash>_gravacao_reuniao.py`
- Modify: `backend/app/models/card_task.py`
- Create: `backend/app/models/recording_share.py`
- Modify: `backend/app/schemas/card_task.py`

- [ ] **Step 1: Criar a migration**

Campos novos em `card_tasks` (todos nullable):

| Campo | Tipo | Para quê |
|---|---|---|
| `recording_status` | String(30) | `none` \| `recording` \| `processing` \| `ready` \| `failed` \| `external_link` |
| `recording_key` | String(500) | caminho do arquivo no bucket |
| `recording_external_url` | String(1000) | usado quando o arquivo é grande demais para baixar |
| `recording_duration_seconds` | Integer | duração gravada |
| `recording_size_bytes` | BigInteger | tamanho |
| `recording_started_at` | DateTime | quando começou a gravar |
| `recording_ready_at` | DateTime | quando ficou disponível |
| `recording_error` | Text | motivo da falha, quando houver |
| `transcript_status` | String(30) | `none` \| `processing` \| `ready` \| `failed` |

E a tabela `recording_shares` — o registro de quem gerou link, decidido na seção 15.5:

```python
op.create_table(
    'recording_shares',
    sa.Column('id', sa.Integer, primary_key=True),
    sa.Column('card_task_id', sa.Integer,
              sa.ForeignKey('card_tasks.id', ondelete='CASCADE'), nullable=False, index=True),
    sa.Column('created_by_id', sa.Integer,
              sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
    sa.Column('created_at', sa.DateTime, nullable=False),
    sa.Column('expires_at', sa.DateTime, nullable=False),
    sa.Column('revoked_at', sa.DateTime, nullable=True),
    comment='Registro de quem gerou link de compartilhamento da gravacao',
)
```

- [ ] **Step 2: Espelhar no modelo e no schema**

Mesmos campos em `CardTask`, e expor no `CardTaskResponse`.

> ⚠️ **Lembrar do `_build_response`** em `card_task_service.py`: ele monta a resposta campo a campo. Campo que não for adicionado lá **não chega ao frontend** — foi exatamente o que aconteceu na Fase 1.

- [ ] **Step 3: Aplicar (confirmar antes — é produção)**

```bash
docker exec -w /app hsgrowth-api-local alembic upgrade head
```

- [ ] **Step 4: Conferir que nada foi alterado**

Contagem de `card_tasks` antes e depois; nenhuma linha existente tocada.

- [ ] **Step 5: Commit** (perguntar antes)

---

## Task 3: Serviço de armazenamento (R2)

**Files:**
- Create: `backend/app/services/storage_service.py`
- Test: `backend/tests/unit/test_storage_service.py`

- [ ] **Step 1: Escrever os testes (com o boto3 mockado)**

Cobrir:
- `upload(conteudo, chave, content_type)` envia para o bucket certo;
- `gerar_link_temporario(chave, dias)` devolve URL assinada com a validade pedida;
- `apagar(chave)` remove;
- sem credenciais configuradas, erro claro (não silencioso);
- **a chave do arquivo carrega o título da reunião** (seção 15.11): `2026-09-10-apresentacao-de-proposta-36197.mp4`, com acentos e espaços normalizados.

- [ ] **Step 2: Escrever o serviço**

```python
"""
Armazenamento das gravações no Cloudflare R2 (compatível com S3).

O bucket é privado: o acesso do cliente é sempre por link temporário
assinado, com validade — se o link vazar, ele expira sozinho.
"""
```

Pontos obrigatórios:
- `endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com"`, `region_name="auto"`;
- nome do arquivo derivado do título (sem acento, minúsculo, hífens), com data e id da tarefa;
- link assinado com `generate_presigned_url`, expiração em segundos;
- erro de credencial vira `ValueError` com mensagem utilizável.

- [ ] **Step 3: Rodar os testes**

- [ ] **Step 4: Commit** (perguntar antes)

---

## Task 4: Webhook do Daily

**Files:**
- Create: `backend/app/api/v1/endpoints/daily_webhook.py`
- Modify: `backend/app/api/v1/__init__.py`
- Test: `backend/tests/unit/test_daily_webhook.py`

Endpoint **público** (o Daily chama de fora), então os mesmos cuidados da Task 5 da Fase 1.

- [ ] **Step 1: Escrever os testes**

Cobrir os quatro eventos:

| Evento | O que faz |
|---|---|
| `participant.joined` | marca `meeting_started_at` (host) ou `contact_joined_at` (convidado) |
| `meeting.ended` | marca `meeting_ended_at` |
| `recording.ready-to-download` | dispara o processamento da gravação |
| `transcript.ready-to-download` | dispara o processamento da transcrição |

Mais: evento de sala desconhecida é ignorado sem erro (200, para o Daily não ficar reenviando); evento repetido não duplica efeito (idempotência); corpo inválido não derruba o endpoint.

- [ ] **Step 2: Escrever o endpoint**

- Recebe em `POST /api/v1/daily/webhook`;
- identifica a reunião por `room_name` (`hsg-{task_id}`);
- **processa em BackgroundTasks** — o Daily espera resposta rápida;
- responde 200 mesmo para evento desconhecido.

- [ ] **Step 3: Validar a origem**

Conferir na documentação do Daily o mecanismo de assinatura (HMAC no header) e validar. Se não houver, exigir um segredo compartilhado na URL (`?token=`), guardado em `DAILY_WEBHOOK_SECRET`.

> Sem validação, qualquer um pode forjar "gravação pronta" e fazer o backend baixar um arquivo de fora.

- [ ] **Step 4: Rodar os testes**

- [ ] **Step 5: Commit** (perguntar antes)

---

## Task 5: Registrar o webhook no Daily

**Files:**
- Modify: `backend/app/services/daily_service.py`
- Test: acrescentar em `backend/tests/unit/test_daily_service.py`

- [ ] **Step 1: Teste**

- `garantir_webhook()` cria o webhook quando não existe;
- **não cria outro** se já houver um com a mesma URL e os mesmos eventos (lição do dn.nexus);
- recria quando os eventos divergem.

- [ ] **Step 2: Implementar**

Consulta `GET /webhooks`, compara URL e lista de eventos, cria ou substitui. Chamado na criação da primeira sala e por um comando administrativo.

- [ ] **Step 3: Commit** (perguntar antes)

---

## Task 6: Ligar gravação e transcrição na sala

**Files:**
- Modify: `backend/app/services/daily_service.py` (`create_room`)
- Modify: `backend/app/api/v1/endpoints/card_tasks.py`
- Test: atualizar `test_daily_service.py`

- [ ] **Step 1: Habilitar na criação da sala**

```python
"enable_recording": "cloud",
```

A gravação **não começa sozinha** (decisão da seção 15.4): o Daily Prebuilt mostra o botão de gravar para quem é dono da sala, e o vendedor decide.

- [ ] **Step 2: Transcrição em tempo real**

Como a Fase 5 foi aprovada, a transcrição é ao vivo. Verificar na documentação se o Prebuilt oferece botão nativo ou se é preciso chamar `POST /rooms/{name}/transcription/start`. Se for por API, criar `iniciar_transcricao(task)` e acionar junto com o início da gravação.

- [ ] **Step 3: Endpoint de recuperação manual**

`POST /card-tasks/{id}/reprocessar-gravacao` — para quando o webhook não chegar. Consulta as gravações da sala no Daily e reprocessa. Mesma permissão da Fase 1 (`_verificar_acesso_reuniao`).

- [ ] **Step 4: Testes e commit** (perguntar antes)

---

## Task 7: Processar a gravação

**Files:**
- Create: `backend/app/services/recording_service.py`
- Test: `backend/tests/unit/test_recording_service.py`

- [ ] **Step 1: Testes**

- fluxo feliz: baixa do Daily, sobe no R2, grava `recording_key`, status `ready`;
- **arquivo acima do teto**: não baixa, guarda `recording_external_url` e status `external_link`;
- **tamanho desconhecido**: mesmo tratamento (não arriscar a memória);
- falha no download: status `failed`, `recording_error` preenchido, **notifica os donos e os admins**;
- reprocessar reunião já pronta não duplica arquivo.

- [ ] **Step 2: Implementar**

Ordem obrigatória (do dn.nexus):
1. `HEAD` na URL para saber o tamanho **antes** de baixar;
2. acima de `GRAVACAO_TAMANHO_MAXIMO_MB` ou tamanho desconhecido → guarda só a referência;
3. baixa, sobe no R2 com o nome derivado do título, grava metadados;
4. **notifica no sino** (ver "Quem é dono da reunião" abaixo).

### Quem é dono da reunião

Todos os vinculados ao negócio, sem repetir a mesma pessoa:

- o **vendedor** do card (`card.assigned_to_id`);
- o **SDR** do card (`card.sdr_id`);
- o **responsável pela tarefa** (`task.assigned_to_id`), quando for outra pessoa.

Assim, quando o SDR agenda e vincula o vendedor, **os dois** ficam sabendo que a
gravação está pronta — nenhum depende do outro avisar. Mesma lógica da RN-037:
quem tem vínculo com o negócio, tem a reunião.

| Situação | Quem é notificado |
|---|---|
| Gravação pronta | os donos |
| Gravação falhou | os donos **+ admins** |

Vale um helper reutilizável (`_donos_da_reuniao(db, task) -> list[int]`), já que
o mesmo conjunto serve para notificação e é próximo da regra de acesso.

- [ ] **Step 3: Testes e commit** (perguntar antes)

---

## Task 8: Parser do VTT do Daily

O parser atual foi feito para o Teams e **quebra** com o formato do Daily.

**Files:**
- Modify: `backend/app/services/transcript_analysis_service.py` (`_parse_vtt`)
- Test: `backend/tests/unit/test_parse_vtt_daily.py`

- [ ] **Step 1: Testes com os dois formatos**

Formato Teams (precisa continuar funcionando):
```
WEBVTT

00:00:01.000 --> 00:00:04.000
<v João Silva>Olá, como vai?
```

Formato Daily (precisa passar a funcionar):
```
WEBVTT

transcript:357
00:00:01.000 --> 00:00:04.000
<v Maria:</v>Bom dia, tudo bem?
```

Verificar que a saída não contém `transcript:357`, nem `<v`, nem `</v>`, e que o falante sai limpo (`Maria: Bom dia, tudo bem?`). Incluir teste de falas seguidas do mesmo interlocutor sendo agrupadas.

- [ ] **Step 2: Adaptar o parser**

Descartar identificadores de cue (`^[A-Za-z_][A-Za-z0-9_-]*:\d+$`), tratar `<v Nome:</v>texto` além de `<v Nome>texto`, e agrupar falas seguidas do mesmo falante.

- [ ] **Step 3: Testes e commit** (perguntar antes)

---

## Task 9: Análise da IA com os campos novos

**Files:**
- Modify: `backend/app/services/transcript_analysis_service.py` (prompt e estrutura)
- Test: `backend/tests/unit/test_analise_campos_novos.py`

- [ ] **Step 1: Testes (OpenAI mockada)**

Os 6 campos atuais continuam, e chegam os 8 novos da seção 15.6: `compromissos`, `produtos_citados`, `concorrentes`, `orcamento`, `nota`, `decisor`, `temperatura`, `oportunidades_perdidas`.

Incluir: resposta incompleta da IA não quebra (campo ausente vira valor padrão); JSON inválido vira erro claro.

- [ ] **Step 2: Reescrever o prompt**

Contexto de vendas B2B de equipamentos de segurança. Instruções explícitas para **não inventar** o que não está na transcrição — especialmente em `compromissos`, `orcamento` e `concorrentes`, onde alucinação vira decisão errada.

`oportunidades_perdidas` é visível para o vendedor (decisão da seção 15.6): o texto deve ser objetivo e orientado a melhoria, não julgamento.

- [ ] **Step 3: Testes e commit** (perguntar antes)

---

## Task 10: Rotina de descarte (12 meses)

**Files:**
- Create: `backend/app/tasks/limpar_gravacoes.py` (ou seguir o padrão do scheduler do projeto)
- Test: `backend/tests/unit/test_limpeza_gravacoes.py`

- [ ] **Step 1: Testes**

- gravação com mais de `GRAVACAO_RETENCAO_MESES` é apagada do R2 e o campo limpo;
- gravação recente **não** é tocada;
- transcrição e análise **permanecem** (ocupam pouco e são o valor duradouro);
- falha ao apagar um arquivo não interrompe os demais.

- [ ] **Step 2: Implementar e agendar** no scheduler existente (diário, madrugada).

- [ ] **Step 3: Testes e commit** (perguntar antes)

---

## Task 11: Frontend — gravação, transcrição e análise no card

**Files:**
- Modify: `frontend/src/components/cardDetails/MeetingSection.tsx`
- Modify: `frontend/src/services/cardTaskService.ts`
- Modify: `frontend/src/types/index.ts`

- [ ] **Step 1: Estado da gravação na reunião**

Selo por status: gravando, processando, disponível, falhou.

- [ ] **Step 2: Player e ações**

Reunião com gravação pronta mostra: **assistir** (player), **baixar** e **gerar link para o cliente** (30 dias). Só para quem tem acesso (RN-037).

- [ ] **Step 3: Transcrição e análise**

Reaproveitar a apresentação que já existe para o Teams, acrescentando os 8 campos novos de forma legível — não despejar JSON na tela.

- [ ] **Step 4: Typecheck e commit** (perguntar antes)

---

## Task 12: Configurar o R2 e subir

- [ ] **Step 1: Roteiro do bucket** (a entregar ao responsável)

Criar bucket no Cloudflare R2, gerar Access Key e Secret, anotar o Account ID.

- [ ] **Step 2: Variáveis no EasyPanel**

```
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=hsgrowth-gravacoes
DAILY_WEBHOOK_SECRET=...
```

- [ ] **Step 3: Deploy dos dois serviços** (lembrar do `CACHEBUST`)

- [ ] **Step 4: Registrar o webhook no Daily** (Task 5), apontando para o domínio de produção

---

## Task 13: Homologação das Fases 1 e 3 juntas

- [ ] **Roteiro**

| # | Passo | Esperado |
|---|---|---|
| 1 | Criar reunião "No CRM" | convite com pauta e link |
| 2 | Entrar e **gravar** | botão de gravar disponível ao anfitrião |
| 3 | Conversar ~2 min e encerrar | gravação para sozinha |
| 4 | Aguardar o processamento | selo muda para "disponível" e chega notificação no sino |
| 5 | Assistir no card | player funciona |
| 6 | Conferir a transcrição | texto limpo, com os nomes de quem falou |
| 7 | Conferir a análise | 14 campos preenchidos e coerentes |
| 8 | Gerar link para o cliente | abre em janela anônima; registro de quem gerou |
| 9 | Baixar a gravação | arquivo íntegro |
| 10 | Conferir no Cloudflare | arquivo com nome contendo o título |
| 11 | Reunião **sem** gravar | nada é gravado, nada quebra |
| 12 | Reunião pelo **Teams** | continua igual |

- [ ] **Liberar para o time** — `DAILY_ENABLED_USER_IDS=` (vazio) e `DAILY_DEV_MODE=false`

> ⚠️ A partir daqui os convites saem para clientes reais e as gravações passam a custar.

- [ ] **Changelog e versão** nos 3 lugares; avisar o time.

---

## Riscos

| Risco | Mitigação |
|---|---|
| Webhook não chegar | Endpoint de reprocessamento manual (Task 6) |
| Arquivo grande estourar a memória | HEAD antes de baixar; acima do teto, guarda só a referência |
| Transcrição suja quebrar a análise | Parser adaptado ao formato do Daily, com teste dos dois formatos |
| Webhook forjado | Validação de origem (Task 4, Step 3) |
| Link de gravação vazar | Expira em 30 dias; registro de quem gerou |
| Custo subir sem aviso | Gravação é manual; alerta de gasto no painel do Daily |
| Gravação de teste virar custo | Testes curtos e apagados em seguida |
