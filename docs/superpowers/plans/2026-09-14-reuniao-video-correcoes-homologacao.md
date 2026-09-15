# Correções da homologação da reunião por vídeo — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer a gravação, a transcrição e a análise chegarem ao card depois de uma reunião real, com a transcrição em português, o convidado sem controle da gravação e todos vendo que a reunião está sendo gravada.

**Architecture:** O webhook do Daily não traz link de arquivo — traz identificadores. O backend passa a pedir o link à API do Daily (`/recordings/{id}/access-link` e `/transcript/{id}/access-link`). Cada trecho gravado vira uma linha em `meeting_recordings`, para que gravar em partes não perca nada. A transcrição deixa de começar sozinha em inglês: a própria sala do CRM a inicia em `pt-BR`. A sala passa a negar controle de gravação a quem não é dono, e uma faixa nossa, acima do vídeo, mostra o estado da gravação para todos.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, pytest (SQLite em memória), React + TypeScript, `@daily-co/daily-js` 0.92, Cloudflare R2 (boto3), OpenAI GPT-4o.

---

## Contexto — o que a homologação de 14/09/2026 revelou

Reunião real (task 36307, sala `hsg-36307`, 2 participantes, ~6 minutos):

| Constatação | Causa |
|---|---|
| Gravação não chegou ao CRM | O evento `recording.ready-to-download` **não traz `download_url`**; o código só agia se esse campo existisse, e ignorava o evento em silêncio |
| Transcrição não chegou | Mesma causa no `transcript.ready-to-download` |
| Transcrição saiu em inglês ("Have on the ip key") | `auto_start_transcription` inicia com o modelo padrão; ninguém informou `pt-BR` |
| Nomes de quem falou sumiram | O arquivo real vem `<v>Nome:</v>texto`; o leitor só reconhece `<v Nome:</v>texto` |
| Convidado iniciou e parou a gravação | A sala não define `permissions`; o padrão do Daily libera |
| 3 arquivos de gravação numa reunião | Consequência do item acima — e o modelo só guarda um |
| Ninguém viu que estava gravando, nem que parou | A barra do Daily aparece só para quem clicou |

Verificado na prática antes deste plano: `/recordings/{id}/access-link` e `/transcript/{id}/access-link` devolvem o link; `/transcript?mtgSessionId=<id>` encontra a transcrição da sessão; o Daily aceita `permissions: {canAdmin: false}` na criação da sala; a Deepgram suporta `pt-BR` com `nova-3`.

**Decisão do cliente (14/09):** gravação em pedaços → **guardar todos os pedaços**.

**Dado importante:** a produção ainda **não tem nenhuma gravação** (`meeting_recordings` nasce vazia e `card_tasks.recording_key` está nulo em 100% das linhas). Não há dado legado a preservar — os endpoints podem ser substituídos sem compatibilidade retroativa.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `backend/app/models/meeting_recording.py` (**novo**) | Um trecho gravado: identificador no Daily, chave no R2, duração, tamanho, status |
| `backend/alembic/versions/…_gravacao_em_partes.py` (**novo**) | Cria `meeting_recordings`; acrescenta `meeting_recording_id` em `recording_shares` |
| `backend/app/services/daily_service.py` | Ganha `link_download_transcricao` e `transcricao_da_sessao`; sala com `permissions`; token sem `auto_start_transcription` |
| `backend/app/services/recording_service.py` | Processa **um trecho por vez**; resolve o link pelo identificador; retenção por trecho |
| `backend/app/api/v1/endpoints/daily_webhook.py` | Passa identificadores ao processamento, não links |
| `backend/app/api/v1/endpoints/card_tasks.py` | Endpoints por trecho: listar, link, compartilhar, sincronizar |
| `backend/app/schemas/card_task.py` | `GravacaoResumo` e o campo `gravacoes` na resposta |
| `backend/app/services/card_task_service.py` | Inclui `gravacoes` no dicionário da resposta |
| `frontend/src/components/meeting/RecordingBanner.tsx` (**novo**) | Faixa "● Gravando 02:13" visível a todos, nas duas páginas |
| `frontend/src/pages/MeetingRoom.tsx` | Inicia a transcrição em pt-BR; mostra a faixa |
| `frontend/src/pages/MeetingGate.tsx` | Mostra a faixa para o convidado |
| `frontend/src/components/cardDetails/MeetingSection.tsx` | Lista os trechos gravados |
| `frontend/src/services/cardTaskService.ts` | Métodos dos endpoints por trecho |

---

## Bloco A — fazer o fluxo funcionar (Tasks 1 a 6)

## Task 1: Webhook entrega o identificador da gravação, não o link

**Files:**
- Modify: `backend/app/api/v1/endpoints/daily_webhook.py:161-172`
- Modify: `backend/app/services/recording_service.py` (assinatura de `processar_gravacao`)
- Test: `backend/tests/unit/test_daily_webhook.py`

- [ ] **Step 1: Escrever o teste que falha**

Em `tests/unit/test_daily_webhook.py`, dentro da classe que já testa os eventos:

```python
    def test_recording_pronta_sem_download_url_ainda_processa(
        self, client: TestClient, task, db, monkeypatch
    ):
        """O Daily manda só o identificador — o processamento precisa acontecer mesmo assim."""
        chamadas = []

        def fake_processar(**kwargs):
            chamadas.append(kwargs)

        monkeypatch.setattr(
            "app.api.v1.endpoints.daily_webhook.processar_gravacao_em_background",
            fake_processar,
        )

        corpo = {
            "type": "recording.ready-to-download",
            "payload": {
                "recording_id": "rec-123",
                "room_name": f"hsg-{task.id}",
                "duration": 173,
                "s3_key": "healthsafety/hsg-1/1789386947497",
            },
        }
        headers, bruto = assinar(corpo)
        resposta = client.post("/api/v1/daily/webhook", data=bruto, headers=headers)

        assert resposta.status_code == 200
        assert chamadas == [{"task_id": task.id, "recording_id": "rec-123", "duration": 173}]

        db.refresh(task)
        assert task.recording_status == "processing"
```

- [ ] **Step 2: Rodar e ver falhar**

```
docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest tests/unit/test_daily_webhook.py::TestEventos::test_recording_pronta_sem_download_url_ainda_processa -v
```

Esperado: FAIL — hoje o handler exige `download_url` e não chama nada.

- [ ] **Step 3: Trocar o handler**

Em `daily_webhook.py`, substituir o bloco `elif tipo == "recording.ready-to-download":` por:

```python
    elif tipo == "recording.ready-to-download":
        # O Daily não manda link de arquivo: manda o identificador. Quem baixa
        # pede o link temporário à API na hora de usar (homologação de 14/09).
        recording_id = dados.get("recording_id") or dados.get("id")
        if recording_id:
            task.recording_status = "processing"
            db.commit()
            background_tasks.add_task(
                processar_gravacao_em_background,
                task_id=task.id,
                recording_id=recording_id,
                duration=dados.get("duration"),
            )
        else:
            print("[DAILY-WEBHOOK] Gravacao pronta sem identificador — ignorado.")
```

E a função auxiliar do mesmo arquivo:

```python
def processar_gravacao_em_background(
    task_id: int,
    recording_id: str,
    duration: Optional[int] = None,
) -> None:
    """Baixa a gravação, guarda no bucket e apaga a cópia do Daily."""
    from app.services.recording_service import processar_gravacao

    processar_gravacao(task_id=task_id, recording_id=recording_id, duration=duration)
```

- [ ] **Step 4: Ajustar `processar_gravacao` para resolver o link**

Em `recording_service.py`, trocar a assinatura e o início da função:

```python
def processar_gravacao(
    task_id: int,
    recording_id: str,
    duration: Optional[int] = None,
) -> None:
    """
    Baixa um trecho gravado do Daily e guarda no bucket.

    O webhook entrega apenas o identificador: o link é pedido aqui, porque ele
    expira em poucos minutos e só vale no momento do download.
    """
    db = SessionLocal()
    try:
        task = db.query(CardTask).filter(CardTask.id == task_id).first()
        if not task:
            print(f"[RECORDING] Tarefa {task_id} nao encontrada — ignorado.")
            return

        from app.services.daily_service import DailyService

        try:
            download_url = DailyService(db).link_download_gravacao(recording_id)
        except Exception as e:
            _marcar_falha(db, task, f"Nao foi possivel obter o link da gravacao: {e}")
            return

        if not download_url:
            _marcar_falha(db, task, "Daily nao devolveu link para a gravacao.")
            return
```

O restante do corpo continua igual, e o trecho que apagava do Daily passa a usar sempre `recording_id` (que agora é obrigatório).

- [ ] **Step 5: Rodar os testes do webhook e da gravação**

```
docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest tests/unit/test_daily_webhook.py tests/unit/test_recording_service.py -q
```

Esperado: os testes antigos que passavam `download_url` precisam ser atualizados para passar `recording_id` e simular `link_download_gravacao`. Ajustar cada um.

- [ ] **Step 6: Commit** (perguntar antes)

```bash
git add backend/app/api/v1/endpoints/daily_webhook.py backend/app/services/recording_service.py backend/tests/unit/test_daily_webhook.py backend/tests/unit/test_recording_service.py
git commit -m "fix(gravacao): webhook do Daily nao traz link — pedir pela API"
```

---

## Task 2: Mesma correção para a transcrição

**Files:**
- Modify: `backend/app/services/daily_service.py` (dois métodos novos, depois de `link_download_gravacao`)
- Modify: `backend/app/api/v1/endpoints/daily_webhook.py` (bloco `transcript.ready-to-download`)
- Modify: `backend/app/services/recording_service.py` (`processar_transcricao`)
- Test: `backend/tests/unit/test_daily_service.py`, `backend/tests/unit/test_daily_webhook.py`

- [ ] **Step 1: Teste dos métodos novos**

```python
    def test_link_da_transcricao(self, db, monkeypatch):
        service = DailyService(db)
        monkeypatch.setattr(
            service, "_get",
            lambda caminho: {"transcriptId": "t-1", "link": "https://c.daily.co/x.vtt"},
        )
        assert service.link_download_transcricao("t-1") == "https://c.daily.co/x.vtt"

    def test_acha_transcricao_pela_sessao(self, db, monkeypatch):
        service = DailyService(db)
        monkeypatch.setattr(
            service, "_get",
            lambda caminho: {"total_count": 1, "data": [{"transcriptId": "t-9"}]},
        )
        assert service.transcricao_da_sessao("sessao-abc") == "t-9"

    def test_sessao_sem_transcricao_devolve_none(self, db, monkeypatch):
        service = DailyService(db)
        monkeypatch.setattr(service, "_get", lambda caminho: {"total_count": 0, "data": []})
        assert service.transcricao_da_sessao("sessao-abc") is None
```

- [ ] **Step 2: Rodar e ver falhar**

```
docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest tests/unit/test_daily_service.py -k transcricao -v
```

Esperado: FAIL — métodos não existem.

- [ ] **Step 3: Implementar no `daily_service.py`**

```python
    def link_download_transcricao(self, transcript_id: str) -> str:
        """Link temporário do arquivo .vtt. Expira em minutos — pedir na hora de usar."""
        dados = self._get(f"/transcript/{transcript_id}/access-link")
        return dados.get("link", "")

    def transcricao_da_sessao(self, mtg_session_id: str) -> Optional[str]:
        """
        Acha a transcrição pela sessão da reunião.

        O evento do Daily nem sempre traz o identificador da transcrição, mas
        sempre traz o da sessão — este é o caminho de recuperação.
        """
        dados = self._get(f"/transcript?mtgSessionId={mtg_session_id}")
        itens = dados.get("data") or []
        return itens[0].get("transcriptId") if itens else None
```

- [ ] **Step 4: Trocar o handler do webhook**

```python
    elif tipo == "transcript.ready-to-download":
        # Igual à gravação: vem identificador, não link.
        transcript_id = (
            dados.get("transcript_id") or dados.get("transcriptId") or dados.get("id")
        )
        sessao = dados.get("mtg_session_id") or dados.get("mtgSessionId")
        if transcript_id or sessao:
            task.transcript_status = "processing"
            db.commit()
            background_tasks.add_task(
                processar_transcricao_em_background,
                task_id=task.id,
                transcript_id=transcript_id,
                mtg_session_id=sessao,
            )
        else:
            print("[DAILY-WEBHOOK] Transcricao pronta sem identificador — ignorado.")
```

E a auxiliar:

```python
def processar_transcricao_em_background(
    task_id: int,
    transcript_id: Optional[str] = None,
    mtg_session_id: Optional[str] = None,
) -> None:
    """Baixa a transcrição, salva e manda para a análise."""
    from app.services.recording_service import processar_transcricao

    processar_transcricao(
        task_id=task_id, transcript_id=transcript_id, mtg_session_id=mtg_session_id
    )
```

- [ ] **Step 5: Ajustar `processar_transcricao`**

Troca a assinatura e o começo do corpo:

```python
def processar_transcricao(
    task_id: int,
    transcript_id: Optional[str] = None,
    mtg_session_id: Optional[str] = None,
) -> None:
    db = SessionLocal()
    try:
        task = db.query(CardTask).filter(CardTask.id == task_id).first()
        if not task:
            print(f"[RECORDING] Tarefa {task_id} nao encontrada — transcricao ignorada.")
            return

        if task.transcript_status == "ready" and task.transcript_raw:
            print(f"[RECORDING] Transcricao da tarefa {task_id} ja processada — ignorado.")
            return

        from app.services.daily_service import DailyService

        service = DailyService(db)
        if not transcript_id and mtg_session_id:
            transcript_id = service.transcricao_da_sessao(mtg_session_id)

        if not transcript_id:
            task.transcript_status = "failed"
            db.commit()
            print(f"[RECORDING] Sem identificador de transcricao para a tarefa {task_id}.")
            return

        try:
            download_url = service.link_download_transcricao(transcript_id)
        except Exception as e:
            task.transcript_status = "failed"
            db.commit()
            print(f"[RECORDING] Falha ao obter o link da transcricao da tarefa {task_id}: {e}")
            return
```

O restante (baixar o VTT, salvar, analisar) permanece igual.

- [ ] **Step 6: Rodar os testes**

```
docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest tests/unit/test_daily_service.py tests/unit/test_daily_webhook.py tests/unit/test_recording_service.py -q
```

Esperado: PASS (ajustar os testes antigos de transcrição para o novo formato).

- [ ] **Step 7: Commit** (perguntar antes)

```bash
git commit -am "fix(transcricao): pedir o link do VTT pela API do Daily"
```

---

## Task 3: Leitor entende o formato real do Daily

**Files:**
- Modify: `backend/app/services/transcript_analysis_service.py:136-152`
- Test: `backend/tests/unit/test_parse_vtt.py`

- [ ] **Step 1: Teste com o arquivo real**

```python
    def test_formato_real_do_daily_com_v_fechado(self):
        """Arquivo real de 14/09: <v>Nome:</v>texto — sem espaço depois de <v."""
        vtt = (
            "WEBVTT\n\n"
            "transcript:0\n"
            "00:00:45.588 --> 00:00:47.888\n"
            "<v>Welton Kellyson:</v>Bom dia, tudo certo?\n\n"
            "transcript:1\n"
            "00:01:28.330 --> 00:01:31.720\n"
            "<v>Erick:</v>Tudo, e com voce?\n"
        )
        resultado = transcript_analysis_service._parse_vtt(vtt)
        assert resultado == (
            "Welton Kellyson: Bom dia, tudo certo?\n"
            "Erick: Tudo, e com voce?"
        )
```

- [ ] **Step 2: Rodar e ver falhar**

```
docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest tests/unit/test_parse_vtt.py -k formato_real -v
```

Esperado: FAIL — hoje sai tudo numa linha só, sem separar quem falou.

- [ ] **Step 3: Corrigir o reconhecimento**

Em `_parse_vtt`, apagar o bloco morto que hoje calcula `voz` e nunca usa, e trocar a linha do padrão do Daily por:

```python
            # Daily: "<v>Maria:</v>Bom dia" (real) e "<v Maria:</v>Bom dia" (variante)
            daily = re.match(r"^<v\s*>?\s*([^<>]*?)\s*:?\s*</v>\s*(.*)$", trimmed)
```

- [ ] **Step 4: Rodar os testes do leitor**

```
docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest tests/unit/test_parse_vtt.py -q
```

Esperado: PASS, inclusive os testes antigos do formato do Teams.

- [ ] **Step 5: Commit** (perguntar antes)

```bash
git commit -am "fix(transcricao): leitor reconhece <v>Nome:</v> do Daily"
```

---

## Task 4: Transcrição em português

**Files:**
- Modify: `backend/app/services/daily_service.py:152-181` (tirar `auto_start_transcription`)
- Modify: `frontend/src/pages/MeetingRoom.tsx`
- Test: `backend/tests/unit/test_daily_service.py`

- [ ] **Step 1: Teste do token sem início automático**

```python
    def test_token_do_anfitriao_nao_inicia_transcricao_sozinho(self, db, task, test_user, monkeypatch):
        """
        Quem inicia é a sala do CRM, em pt-BR. O início automático do Daily
        usa o modelo padrao (ingles) e produziu transcricao inutil em 14/09.
        """
        enviados = {}

        def fake_post(caminho, payload):
            enviados["payload"] = payload
            return {"token": "tok"}

        service = DailyService(db)
        monkeypatch.setattr(service, "_post", fake_post)
        service.create_host_token(task, test_user)

        assert "auto_start_transcription" not in enviados["payload"]["properties"]
        assert enviados["payload"]["properties"]["is_owner"] is True
```

- [ ] **Step 2: Rodar e ver falhar**

```
docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest tests/unit/test_daily_service.py -k transcricao_sozinho -v
```

- [ ] **Step 3: Tirar do serviço**

Em `_create_token`, remover o parâmetro `iniciar_transcricao` e o bloco que adiciona `auto_start_transcription`. `create_host_token` passa a ser:

```python
    def create_host_token(self, task: CardTask, user: User) -> str:
        """
        Token do vendedor/SDR — dono da sala, libera quem está esperando.

        A transcrição não começa por aqui: a página da sala a inicia em pt-BR
        logo após entrar. O início automático do Daily usa o modelo padrão, em
        inglês, e transcreveu uma conversa em português como ruído (14/09).
        """
        return self._create_token(task, user.name or "Anfitrião", is_owner=True)
```

- [ ] **Step 4: Iniciar a transcrição na sala, em pt-BR**

Em `MeetingRoom.tsx`, logo depois de `call.join()...`, acrescentar:

```tsx
        // A transcrição alimenta a análise depois da reunião e a IA ao vivo.
        // Precisa ser pedida em pt-BR: o padrão do Daily é inglês, e uma
        // conversa em português vira ruído (homologação de 14/09).
        call.on("joined-meeting", () => {
          call
            .startTranscription({ language: "pt-BR", model: "nova-3" })
            .catch((e: unknown) => {
              // "already started" acontece quando o anfitrião reabre a aba
              console.warn("[reuniao] transcricao nao iniciou", e);
            });
        });
```

- [ ] **Step 5: Rodar testes e typecheck**

```
docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest tests/unit/test_daily_service.py -q
cd frontend && npx tsc --noEmit
```

- [ ] **Step 6: Commit** (perguntar antes)

```bash
git commit -am "fix(transcricao): iniciar em pt-BR pela sala do CRM"
```

---

## Task 5: Convidado não controla a gravação

**Files:**
- Modify: `backend/app/services/daily_service.py:100-118`
- Test: `backend/tests/unit/test_daily_service.py`

- [ ] **Step 1: Teste**

```python
    def test_sala_nega_gravacao_a_quem_nao_e_dono(self, db, task, monkeypatch):
        """
        Na homologação de 14/09 o convidado iniciou e parou a gravação. Sem
        `permissions`, o padrão do Daily libera isso para qualquer um.
        """
        enviados = {}

        def fake_post(caminho, payload):
            enviados["payload"] = payload
            return {"name": payload["name"], "url": "https://x.daily.co/y"}

        service = DailyService(db)
        monkeypatch.setattr(service, "_post", fake_post)
        service.create_room(task)

        permissoes = enviados["payload"]["properties"]["permissions"]
        assert permissoes["canAdmin"] is False
        assert permissoes["hasPresence"] is True
        assert permissoes["canSend"] is True
```

- [ ] **Step 2: Rodar e ver falhar**

```
docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest tests/unit/test_daily_service.py -k nega_gravacao -v
```

- [ ] **Step 3: Implementar**

Em `create_room`, dentro de `properties`, acrescentar:

```python
                # Sem isto, o padrão do Daily deixa o convidado iniciar e parar
                # a gravação (homologação de 14/09). O anfitrião continua
                # podendo: ele entra com token de dono.
                "permissions": {
                    "hasPresence": True,
                    "canSend": True,
                    "canAdmin": False,
                },
```

- [ ] **Step 4: Rodar os testes**

```
docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest tests/unit/test_daily_service.py -q
```

- [ ] **Step 5: Commit** (perguntar antes)

```bash
git commit -am "fix(daily): so o dono da sala controla a gravacao"
```

---

## Task 6: Faixa de gravação visível para todos

**Files:**
- Create: `frontend/src/components/meeting/RecordingBanner.tsx`
- Modify: `frontend/src/pages/MeetingRoom.tsx`
- Modify: `frontend/src/pages/MeetingGate.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
import { useEffect, useRef, useState } from "react";
import { DailyCall } from "@daily-co/daily-js";

/**
 * Faixa de estado da gravação, acima do vídeo.
 *
 * A barra do Daily aparece só para quem clicou em gravar — na homologação de
 * 14/09 nem o anfitrião viu que a gravação tinha parado. Esta faixa é nossa e
 * aparece para todos, inclusive o cliente: quem está sendo gravado precisa
 * saber disso.
 */
const RecordingBanner: React.FC<{ call: DailyCall | null }> = ({ call }) => {
  const [gravando, setGravando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [encerrouAgora, setEncerrouAgora] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!call) return;

    const iniciou = () => {
      setGravando(true);
      setEncerrouAgora(false);
      setSegundos(0);
    };

    const parou = () => {
      setGravando(false);
      setEncerrouAgora(true);
      window.setTimeout(() => setEncerrouAgora(false), 8000);
    };

    call.on("recording-started", iniciou);
    call.on("recording-stopped", parou);

    return () => {
      call.off("recording-started", iniciou);
      call.off("recording-stopped", parou);
    };
  }, [call]);

  useEffect(() => {
    if (!gravando) {
      if (timerRef.current) window.clearInterval(timerRef.current);
      return;
    }
    timerRef.current = window.setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [gravando]);

  if (!gravando && !encerrouAgora) return null;

  const relogio = `${String(Math.floor(segundos / 60)).padStart(2, "0")}:${String(
    segundos % 60
  ).padStart(2, "0")}`;

  return (
    <div
      className={`flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium ${
        gravando ? "bg-red-500/15 text-red-300" : "bg-slate-700/40 text-slate-300"
      }`}
      role="status"
    >
      {gravando ? (
        <>
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          Gravando {relogio}
        </>
      ) : (
        <>Gravação encerrada — em processamento</>
      )}
    </div>
  );
};

export default RecordingBanner;
```

- [ ] **Step 2: Usar nas duas páginas**

Em `MeetingRoom.tsx`, guardar o `call` em estado (`const [call, setCall] = useState<DailyCall | null>(null)`, alimentado junto com `callRef.current = call`) e, no JSX, colocar `<RecordingBanner call={call} />` logo abaixo da barra de título, antes do `<div className="relative flex-1">`.

Em `MeetingGate.tsx`, mesma coisa: guardar o `call` em estado e, na tela da sala (`naSala`), colocar a faixa acima do contêiner do iframe:

```tsx
      <div className="flex h-screen w-screen flex-col bg-slate-900">
        <RecordingBanner call={call} />
        <div className="relative flex-1">
          <div ref={containerRef} className="absolute inset-0" />
        </div>
      </div>
```

- [ ] **Step 3: Typecheck**

```
cd frontend && npx tsc --noEmit
```

- [ ] **Step 4: Commit** (perguntar antes)

```bash
git commit -am "feat(reuniao): faixa de gravacao visivel para todos"
```

---

## Bloco B — guardar todos os trechos gravados (Tasks 7 a 11)

## Task 7: Migration e modelo `meeting_recordings`

**Files:**
- Create: `backend/alembic/versions/2026_09_14_1000-e3f4a5b6c7d8_gravacao_em_partes.py`
- Create: `backend/app/models/meeting_recording.py`
- Modify: `backend/app/models/__init__.py`
- Modify: `backend/app/models/recording_share.py`

- [ ] **Step 1: Criar a migration**

```python
"""gravacao em partes: tabela meeting_recordings

Revision ID: e3f4a5b6c7d8
Revises: d2e3f4a5b6c7
Create Date: 2026-09-14 10:00:00

Uma reuniao pode ter varios trechos gravados (o vendedor para e recomeca).
Guardar so um perderia metade da conversa — decisao do cliente em 14/09.
"""
from alembic import op
import sqlalchemy as sa

revision = 'e3f4a5b6c7d8'
down_revision = 'd2e3f4a5b6c7'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'meeting_recordings',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('card_task_id', sa.Integer(),
                  sa.ForeignKey('card_tasks.id', ondelete='CASCADE'),
                  nullable=False, index=True),
        sa.Column('daily_recording_id', sa.String(100), nullable=False, unique=True),
        sa.Column('ordem', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('status', sa.String(30), nullable=False, server_default='processing'),
        sa.Column('r2_key', sa.String(500), nullable=True),
        sa.Column('duration_seconds', sa.Integer(), nullable=True),
        sa.Column('size_bytes', sa.BigInteger(), nullable=True),
        sa.Column('error', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False,
                  server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('ready_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_meeting_recordings_card_task_id', 'meeting_recordings', ['card_task_id'])
    op.add_column(
        'recording_shares',
        sa.Column('meeting_recording_id', sa.Integer(),
                  sa.ForeignKey('meeting_recordings.id', ondelete='CASCADE'), nullable=True),
    )


def downgrade():
    op.drop_column('recording_shares', 'meeting_recording_id')
    op.drop_index('ix_meeting_recordings_card_task_id', table_name='meeting_recordings')
    op.drop_table('meeting_recordings')
```

- [ ] **Step 2: Criar o modelo**

`backend/app/models/meeting_recording.py`:

```python
"""
Modelo de MeetingRecording — um trecho gravado de uma reunião.

Uma reunião pode ter vários: o vendedor para e recomeça a gravação. Guardar
apenas um perderia parte da conversa, então cada trecho vira uma linha e a
aba Reuniões os mostra como "Parte 1 de 3".
"""
from datetime import datetime

from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.base import Base


class MeetingRecording(Base):
    """Um arquivo de gravação guardado no bucket."""

    __tablename__ = "meeting_recordings"

    id = Column(Integer, primary_key=True, index=True)
    card_task_id = Column(
        Integer, ForeignKey("card_tasks.id", ondelete="CASCADE"), nullable=False, index=True
    )
    daily_recording_id = Column(String(100), nullable=False, unique=True,
                                comment="Identificador do arquivo no Daily")
    ordem = Column(Integer, nullable=False, default=1, comment="1 = primeiro trecho da reunião")
    status = Column(String(30), nullable=False, default="processing",
                    comment="processing | ready | failed | expired")
    r2_key = Column(String(500), nullable=True, comment="Caminho do arquivo no bucket")
    duration_seconds = Column(Integer, nullable=True)
    size_bytes = Column(BigInteger, nullable=True)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    ready_at = Column(DateTime, nullable=True)

    task = relationship("CardTask", back_populates="recordings")

    def __repr__(self):
        return f"<MeetingRecording(id={self.id}, task={self.card_task_id}, ordem={self.ordem})>"
```

Em `card_task.py`, acrescentar o relacionamento:

```python
    recordings = relationship(
        "MeetingRecording", back_populates="task",
        cascade="all, delete-orphan", order_by="MeetingRecording.ordem",
    )
```

Em `app/models/__init__.py`, importar `MeetingRecording` — sem isso a tabela não é criada no banco de teste (foi o que aconteceu com `RecordingShare`).

Em `recording_share.py`, acrescentar:

```python
    meeting_recording_id = Column(
        Integer, ForeignKey("meeting_recordings.id", ondelete="CASCADE"), nullable=True,
        comment="Trecho compartilhado; nulo em registros anteriores à gravação em partes",
    )
```

- [ ] **Step 3: Conferir que a suíte enxerga a tabela**

```
docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest tests/unit/test_recording_service.py -q
```

Esperado: PASS (ainda sem usar a tabela nova).

- [ ] **Step 4: Aplicar em produção — confirmar antes**

O banco local aponta para produção. Mostrar o SQL primeiro:

```
docker exec -w /app hsgrowth-api-local alembic upgrade d2e3f4a5b6c7:head --sql
```

Só depois da confirmação do cliente:

```
docker exec -w /app hsgrowth-api-local alembic upgrade head
```

- [ ] **Step 5: Commit** (perguntar antes)

```bash
git commit -am "feat(db): tabela de gravacoes em partes"
```

---

## Task 8: Processar cada trecho como uma linha

**Files:**
- Modify: `backend/app/services/recording_service.py`
- Test: `backend/tests/unit/test_recording_service.py`

- [ ] **Step 1: Teste**

O arquivo de teste já tem a classe `RespostaFalsa` (linha 24) e a fixture
`sessao_do_teste` (linha 61). Falta um auxiliar que simule o Daily e o bucket —
escrever no topo do arquivo, depois de `RespostaFalsa`:

```python
def _simular_daily_e_bucket(monkeypatch, tamanho=2048):
    """
    Simula o caminho externo do processamento: o link do Daily, o download e o
    envio ao bucket. Nenhum teste toca a rede nem o R2 de verdade.
    """
    monkeypatch.setattr(
        "app.services.daily_service.DailyService.link_download_gravacao",
        lambda self, rec_id: f"https://c.daily.co/{rec_id}.mp4",
    )
    monkeypatch.setattr(
        "app.services.daily_service.DailyService.apagar_gravacao",
        lambda self, rec_id: None,
    )
    monkeypatch.setattr(
        "app.services.recording_service.httpx.stream",
        lambda *a, **k: RespostaFalsa(tamanho=tamanho),
    )
    monkeypatch.setattr(
        "app.services.storage_service.storage_service.upload_em_partes",
        lambda blocos, chave, content_type="video/mp4": sum(len(b) for b in blocos),
    )
```

E os testes:

```python
    def test_dois_trechos_viram_duas_gravacoes(self, db, task, monkeypatch):
        """Gravar em duas partes guarda as duas — nada se perde."""
        _simular_daily_e_bucket(monkeypatch)

        processar_gravacao(task_id=task.id, recording_id="rec-1", duration=49)
        processar_gravacao(task_id=task.id, recording_id="rec-2", duration=173)

        db.refresh(task)
        gravacoes = sorted(task.recordings, key=lambda g: g.ordem)
        assert [g.ordem for g in gravacoes] == [1, 2]
        assert [g.daily_recording_id for g in gravacoes] == ["rec-1", "rec-2"]
        assert all(g.status == "ready" and g.r2_key for g in gravacoes)
        assert task.recording_status == "ready"

    def test_mesmo_trecho_nao_duplica(self, db, task, monkeypatch):
        """Reenvio do webhook é normal — não pode virar arquivo repetido."""
        _simular_daily_e_bucket(monkeypatch)

        processar_gravacao(task_id=task.id, recording_id="rec-1", duration=49)
        processar_gravacao(task_id=task.id, recording_id="rec-1", duration=49)

        db.refresh(task)
        assert len(task.recordings) == 1
```

- [ ] **Step 2: Rodar e ver falhar**

```
docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest tests/unit/test_recording_service.py -k trechos -v
```

- [ ] **Step 3: Implementar**

Em `processar_gravacao`, depois de resolver o link:

```python
        from app.models.meeting_recording import MeetingRecording

        # Reenvio do webhook é normal; o mesmo trecho não pode virar dois arquivos
        ja_existe = (
            db.query(MeetingRecording)
            .filter(MeetingRecording.daily_recording_id == recording_id)
            .first()
        )
        if ja_existe and ja_existe.status == "ready":
            print(f"[RECORDING] Trecho {recording_id} ja processado — ignorado.")
            return

        ordem = (
            db.query(MeetingRecording)
            .filter(MeetingRecording.card_task_id == task.id)
            .count()
        ) + 1

        gravacao = ja_existe or MeetingRecording(
            card_task_id=task.id, daily_recording_id=recording_id, ordem=ordem
        )
        db.add(gravacao)
        db.commit()
```

A chave no bucket ganha o número do trecho, para dois arquivos da mesma reunião não se sobrescreverem:

```python
        chave = montar_chave_gravacao(
            titulo=task.title,
            task_id=task.id,
            quando=task.due_date or datetime.utcnow(),
            parte=gravacao.ordem,
        )
```

Em `storage_service.montar_chave_gravacao`, acrescentar o parâmetro:

```python
def montar_chave_gravacao(
    titulo: str, task_id: int, quando: Optional[datetime] = None, parte: int = 1
) -> str:
    ...
    partes = [quando.strftime("%Y-%m-%d")]
    if limpo:
        partes.append(limpo)
    partes.append(str(task_id))
    if parte > 1:
        partes.append(f"parte{parte}")

    return f"{quando.strftime('%Y/%m')}/{'-'.join(partes)}.mp4"
```

No fim do processamento, gravar no trecho e atualizar o resumo na tarefa:

```python
        gravacao.status = "ready"
        gravacao.r2_key = chave
        gravacao.size_bytes = tamanho
        gravacao.duration_seconds = duration
        gravacao.ready_at = datetime.utcnow()
        gravacao.error = None

        # A tarefa guarda o resumo: status e soma dos trechos. É o que a lista
        # de reuniões mostra sem precisar abrir cada gravação.
        task.recording_status = "ready"
        task.recording_ready_at = datetime.utcnow()
        task.recording_duration_seconds = sum(
            g.duration_seconds or 0 for g in task.recordings if g.status == "ready"
        )
        task.recording_size_bytes = sum(
            g.size_bytes or 0 for g in task.recordings if g.status == "ready"
        )
        task.recording_error = None
        db.commit()
```

`_marcar_falha` passa a marcar também o trecho:

```python
def _marcar_falha(db, task: CardTask, motivo: str, gravacao=None) -> None:
    """Registra a falha na tarefa (e no trecho, quando houver) e avisa os donos e os admins."""
    if gravacao is not None:
        gravacao.status = "failed"
        gravacao.error = motivo[:1000]

    task.recording_status = "failed"
    task.recording_error = motivo[:1000]
    db.commit()
```

O resto da função (destinatários e notificação) continua igual. As chamadas
dentro de `processar_gravacao` passam `gravacao=gravacao` quando o trecho já
foi criado.

- [ ] **Step 4: Retenção por trecho**

Em `limpar_gravacoes_antigas`, trocar a consulta para percorrer `MeetingRecording` com `ready_at` acima do limite, apagar do bucket, marcar `status = "expired"` e limpar `r2_key`. Quando todos os trechos de uma tarefa expirarem, `task.recording_status = "expired"`.

- [ ] **Step 5: Rodar tudo**

```
docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest tests/unit/test_recording_service.py tests/unit/test_limpeza_gravacoes.py tests/unit/test_storage_service.py -q
```

- [ ] **Step 6: Commit** (perguntar antes)

```bash
git commit -am "feat(gravacao): cada trecho vira um arquivo guardado"
```

---

## Task 9: Endpoints por trecho

**Files:**
- Modify: `backend/app/api/v1/endpoints/card_tasks.py` (substitui `/gravacao` e `/gravacao/compartilhar`)
- Test: `backend/tests/unit/test_endpoints_gravacao.py`

- [ ] **Step 1: Fixtures e testes**

Substituir a fixture `task_com_gravacao` (que gravava a chave na própria
tarefa) por estas duas:

```python
@pytest.fixture
def task_com_duas_gravacoes(db: Session, test_card, test_salesperson_user) -> CardTask:
    from app.models.meeting_recording import MeetingRecording

    t = CardTask(
        card_id=test_card.id,
        title="Reunião gravada",
        task_type="meeting",
        assigned_to_id=test_salesperson_user.id,
        meeting_provider="daily",
        recording_status="ready",
        recording_ready_at=datetime.utcnow(),
    )
    db.add(t)
    db.commit()
    db.refresh(t)

    for ordem, (rec_id, chave) in enumerate(
        [("rec-1", "2026/09/reuniao-1.mp4"), ("rec-2", "2026/09/reuniao-1-parte2.mp4")], start=1
    ):
        db.add(
            MeetingRecording(
                card_task_id=t.id,
                daily_recording_id=rec_id,
                ordem=ordem,
                status="ready",
                r2_key=chave,
                duration_seconds=60 * ordem,
                ready_at=datetime.utcnow(),
            )
        )
    db.commit()
    db.refresh(t)
    return t


@pytest.fixture
def outra_task_com_gravacao(db: Session, test_card, test_salesperson_user) -> CardTask:
    """Reunião diferente — serve para conferir que um trecho não abre pela URL de outra."""
    from app.models.meeting_recording import MeetingRecording

    t = CardTask(
        card_id=test_card.id,
        title="Outra reunião gravada",
        task_type="meeting",
        assigned_to_id=test_salesperson_user.id,
        meeting_provider="daily",
        recording_status="ready",
    )
    db.add(t)
    db.commit()
    db.refresh(t)

    db.add(
        MeetingRecording(
            card_task_id=t.id, daily_recording_id="rec-9", ordem=1,
            status="ready", r2_key="2026/09/outra-1.mp4", ready_at=datetime.utcnow(),
        )
    )
    db.commit()
    db.refresh(t)
    return t
```

E os testes:

```python
    def test_lista_os_trechos(self, client, salesperson_headers, task_com_duas_gravacoes):
        r = client.get(
            f"/api/v1/card-tasks/{task_com_duas_gravacoes.id}/gravacoes",
            headers=salesperson_headers,
        )
        assert r.status_code == 200
        corpo = r.json()
        assert [g["ordem"] for g in corpo] == [1, 2]
        assert "r2_key" not in corpo[0]  # caminho do arquivo nunca sai na API

    def test_link_de_um_trecho(self, client, salesperson_headers, task_com_duas_gravacoes, monkeypatch):
        monkeypatch.setattr(
            "app.services.storage_service.storage_service.gerar_link_temporario",
            lambda chave, dias=1: "https://r2.exemplo/link",
        )
        gravacao = task_com_duas_gravacoes.recordings[0]
        r = client.get(
            f"/api/v1/card-tasks/{task_com_duas_gravacoes.id}/gravacoes/{gravacao.id}/link",
            headers=salesperson_headers,
        )
        assert r.status_code == 200
        assert r.json()["url"] == "https://r2.exemplo/link"

    def test_estranho_nao_acessa_trecho(self, client, manager_headers, task_com_duas_gravacoes, db, test_roles):
        # manager_headers de usuário sem vínculo, como no teste que já existe
        gravacao = task_com_duas_gravacoes.recordings[0]
        r = client.get(
            f"/api/v1/card-tasks/{task_com_duas_gravacoes.id}/gravacoes/{gravacao.id}/link",
            headers=manager_headers,
        )
        assert r.status_code == 403

    def test_trecho_de_outra_reuniao_nao_abre(self, client, salesperson_headers, task_com_duas_gravacoes, outra_task_com_gravacao):
        alheia = outra_task_com_gravacao.recordings[0]
        r = client.get(
            f"/api/v1/card-tasks/{task_com_duas_gravacoes.id}/gravacoes/{alheia.id}/link",
            headers=salesperson_headers,
        )
        assert r.status_code == 404
```

- [ ] **Step 2: Rodar e ver falhar**

```
docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest tests/unit/test_endpoints_gravacao.py -q
```

- [ ] **Step 3: Implementar os três endpoints**

```python
@router.get(
    "/{task_id}/gravacoes",
    summary="Trechos gravados da reunião",
)
async def listar_gravacoes_da_reuniao(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    task = db.query(CardTask).filter(CardTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")

    _verificar_acesso_reuniao(db, task, current_user)

    return [
        {
            "id": g.id,
            "ordem": g.ordem,
            "status": g.status,
            "duracao_segundos": g.duration_seconds,
            "tamanho_bytes": g.size_bytes,
            "pronta_em": g.ready_at,
            "erro": g.error,
        }
        for g in sorted(task.recordings, key=lambda g: g.ordem)
    ]


def _trecho_da_reuniao(db: Session, task: CardTask, gravacao_id: int):
    """
    Busca o trecho conferindo que ele é desta reunião.

    Sem esse vínculo, quem tem acesso a uma reunião abriria a gravação de
    outra só trocando o número na URL.
    """
    from app.models.meeting_recording import MeetingRecording

    gravacao = (
        db.query(MeetingRecording)
        .filter(
            MeetingRecording.id == gravacao_id,
            MeetingRecording.card_task_id == task.id,
        )
        .first()
    )
    if not gravacao:
        raise HTTPException(status_code=404, detail="Gravação não encontrada nesta reunião.")
    if gravacao.status == "expired":
        raise HTTPException(status_code=410, detail="Esta gravação expirou.")
    if not gravacao.r2_key:
        raise HTTPException(status_code=404, detail="Esta gravação ainda não está disponível.")
    return gravacao


@router.get("/{task_id}/gravacoes/{gravacao_id}/link", summary="Link para assistir ou baixar")
async def link_da_gravacao(
    task_id: int,
    gravacao_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    from app.services.storage_service import storage_service

    task = db.query(CardTask).filter(CardTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")

    _verificar_acesso_reuniao(db, task, current_user)
    gravacao = _trecho_da_reuniao(db, task, gravacao_id)

    try:
        return {"url": storage_service.gerar_link_temporario(gravacao.r2_key, dias=1)}
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.post("/{task_id}/gravacoes/{gravacao_id}/compartilhar", summary="Link para o cliente")
async def compartilhar_trecho(
    task_id: int,
    gravacao_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    from datetime import timedelta

    from app.core.config import settings
    from app.models.recording_share import RecordingShare
    from app.services.storage_service import storage_service

    task = db.query(CardTask).filter(CardTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")

    _verificar_acesso_reuniao(db, task, current_user)
    gravacao = _trecho_da_reuniao(db, task, gravacao_id)

    dias = settings.R2_LINK_EXPIRACAO_DIAS
    try:
        url = storage_service.gerar_link_temporario(gravacao.r2_key, dias=dias)
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))

    db.add(
        RecordingShare(
            card_task_id=task.id,
            meeting_recording_id=gravacao.id,
            created_by_id=current_user.id,
            created_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(days=dias),
        )
    )
    db.commit()

    return {"url": url, "expira_em_dias": dias}
```

Apagar os endpoints antigos `/{task_id}/gravacao` e `/{task_id}/gravacao/compartilhar` — não há gravação em produção, então ninguém depende deles.

- [ ] **Step 4: Endpoint de recuperação manual**

Hoje, se um evento se perder, não há como recuperar sem mexer no banco. Acrescentar:

```python
@router.post(
    "/{task_id}/gravacoes/sincronizar",
    summary="Buscar no Daily gravações que não chegaram",
)
async def sincronizar_gravacoes(
    task_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Procura no Daily os trechos desta sala e processa os que faltam.

    Existe porque um evento perdido deixaria a gravação inacessível para
    sempre — foi o que aconteceu na homologação de 14/09.
    """
    from app.models.meeting_recording import MeetingRecording
    from app.services.daily_service import DailyService
    from app.api.v1.endpoints.daily_webhook import processar_gravacao_em_background

    task = db.query(CardTask).filter(CardTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")

    _verificar_acesso_reuniao(db, task, current_user)

    if not task.daily_room_name:
        raise HTTPException(status_code=400, detail="Esta reunião não tem sala no CRM.")

    existentes = {
        g.daily_recording_id
        for g in db.query(MeetingRecording).filter(MeetingRecording.card_task_id == task.id)
    }

    novas = 0
    for gravacao in DailyService(db).listar_gravacoes(task):
        rec_id = gravacao.get("id")
        if not rec_id or rec_id in existentes:
            continue
        background_tasks.add_task(
            processar_gravacao_em_background,
            task_id=task.id,
            recording_id=rec_id,
            duration=gravacao.get("duration"),
        )
        novas += 1

    if novas:
        task.recording_status = "processing"
        db.commit()

    return {"encontradas": novas}
```

- [ ] **Step 5: Rodar os testes**

```
docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest tests/unit/test_endpoints_gravacao.py -q
```

- [ ] **Step 6: Commit** (perguntar antes)

```bash
git commit -am "feat(api): gravacoes por trecho e sincronizacao manual"
```

---

## Task 10: A resposta da API traz os trechos

**Files:**
- Modify: `backend/app/schemas/card_task.py:120-176`
- Modify: `backend/app/services/card_task_service.py:495-512`
- Modify: `frontend/src/services/cardTaskService.ts`
- Test: `backend/tests/unit/test_campos_gravacao.py`

- [ ] **Step 1: Teste**

Copiar a fixture `task_com_duas_gravacoes` da Task 9 para o topo de
`tests/unit/test_campos_gravacao.py` (os arquivos de teste deste projeto
definem as próprias fixtures) e acrescentar:

```python
    def test_listagem_traz_os_trechos(self, client, salesperson_headers, task_com_duas_gravacoes):
        """
        A resposta é montada campo a campo: campo novo no modelo não aparece
        sozinho na API — foi o que aconteceu na Fase 1.
        """
        r = client.get(
            f"/api/v1/card-tasks?card_id={task_com_duas_gravacoes.card_id}",
            headers=salesperson_headers,
        )
        assert r.status_code == 200
        tarefa = next(
            t for t in r.json()["tasks"] if t["id"] == task_com_duas_gravacoes.id
        )
        assert [g["ordem"] for g in tarefa["gravacoes"]] == [1, 2]
        assert "r2_key" not in tarefa["gravacoes"][0]
```

- [ ] **Step 2: Rodar e ver falhar**

```
docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest tests/unit/test_campos_gravacao.py -k trechos -v
```

- [ ] **Step 3: Schema**

Em `app/schemas/card_task.py`, antes de `CardTaskResponse`:

```python
class GravacaoResumo(BaseModel):
    """Um trecho gravado, como a tela precisa dele. Sem o caminho do arquivo."""
    id: int
    ordem: int
    status: str = Field(..., description="processing | ready | failed | expired")
    duracao_segundos: Optional[int] = None
    tamanho_bytes: Optional[int] = None
    pronta_em: Optional[datetime] = None
    erro: Optional[str] = None
```

E dentro de `CardTaskResponse`:

```python
    gravacoes: list[GravacaoResumo] = Field(
        default_factory=list, description="Trechos gravados desta reunião"
    )
```

- [ ] **Step 4: Montagem da resposta**

Em `card_task_service.py`, dentro do dicionário `response_data`, logo depois de `"transcript_status"`:

```python
            # Trechos gravados. O dicionário é montado campo a campo: sem esta
            # linha, a tela nunca vê as gravações.
            "gravacoes": [
                {
                    "id": g.id,
                    "ordem": g.ordem,
                    "status": g.status,
                    "duracao_segundos": g.duration_seconds,
                    "tamanho_bytes": g.size_bytes,
                    "pronta_em": g.ready_at,
                    "erro": g.error,
                }
                for g in sorted(getattr(task, "recordings", []), key=lambda g: g.ordem)
            ],
```

- [ ] **Step 5: Tipos e métodos no frontend**

Em `cardTaskService.ts`, acrescentar a interface e trocar os métodos:

```ts
export interface GravacaoTrecho {
  id: number;
  ordem: number;
  status: "processing" | "ready" | "failed" | "expired";
  duracao_segundos?: number | null;
  tamanho_bytes?: number | null;
  pronta_em?: string | null;
  erro?: string | null;
}
```

Dentro de `CardTask`, acrescentar `gravacoes?: GravacaoTrecho[];`. E na classe:

```ts
  /** Link temporário para assistir ou baixar um trecho gravado. */
  async linkGravacao(taskId: number, gravacaoId: number): Promise<{ url: string }> {
    const response = await api.get(
      `/api/v1/card-tasks/${taskId}/gravacoes/${gravacaoId}/link`
    );
    return response.data;
  }

  /** Link de um trecho para enviar ao cliente (expira e fica registrado). */
  async compartilharGravacao(
    taskId: number,
    gravacaoId: number
  ): Promise<{ url: string; expira_em_dias: number }> {
    const response = await api.post(
      `/api/v1/card-tasks/${taskId}/gravacoes/${gravacaoId}/compartilhar`
    );
    return response.data;
  }

  /** Procura no Daily gravações que não chegaram pelo aviso automático. */
  async sincronizarGravacoes(taskId: number): Promise<{ encontradas: number }> {
    const response = await api.post(`/api/v1/card-tasks/${taskId}/gravacoes/sincronizar`);
    return response.data;
  }
```

Remover o método antigo `obterGravacao`.

- [ ] **Step 6: Rodar testes e typecheck**

```
docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest tests/unit/test_campos_gravacao.py -q
cd frontend && npx tsc --noEmit
```

- [ ] **Step 7: Commit** (perguntar antes)

```bash
git commit -am "feat(api): trechos gravados na resposta da atividade"
```

---

## Task 11: Aba Reuniões lista os trechos

**Files:**
- Modify: `frontend/src/components/cardDetails/MeetingSection.tsx:669-723`

- [ ] **Step 1: Trocar o bloco da gravação**

Substituir o bloco atual (um botão "Assistir gravação") por uma lista de trechos:

```tsx
            {/* Trechos gravados — a reunião pode ter mais de um */}
            {meeting.gravacoes && meeting.gravacoes.length > 0 && (
              <div className="space-y-1.5">
                {meeting.gravacoes.map((gravacao) => (
                  <div
                    key={gravacao.id}
                    className="flex flex-wrap items-center gap-2 rounded border border-slate-700/40 px-2.5 py-1.5"
                  >
                    <span className="text-xs text-slate-400">
                      {meeting.gravacoes!.length > 1
                        ? `Parte ${gravacao.ordem} de ${meeting.gravacoes!.length}`
                        : "Gravação"}
                      {gravacao.duracao_segundos
                        ? ` · ${Math.round(gravacao.duracao_segundos / 60)} min`
                        : ""}
                    </span>

                    {gravacao.status === "processing" && (
                      <span className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Loader2 size={11} className="animate-spin" />
                        Preparando...
                      </span>
                    )}

                    {gravacao.status === "ready" && (
                      <>
                        <button
                          onClick={() => handleAssistirGravacao(meeting.id, gravacao.id)}
                          disabled={isActioning}
                          className="flex items-center gap-1.5 rounded border border-purple-500/50 bg-purple-500/10 px-2.5 py-1 text-xs font-medium text-purple-300 transition-colors hover:bg-purple-500/20 disabled:opacity-50"
                        >
                          <MonitorPlay size={12} />
                          Assistir
                        </button>
                        <button
                          onClick={() => handleCompartilharGravacao(meeting.id, gravacao.id)}
                          disabled={isActioning}
                          title="Gerar link para enviar ao cliente"
                          className="flex items-center gap-1.5 rounded border border-slate-600/50 px-2.5 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-700/50 disabled:opacity-50"
                        >
                          <Copy size={12} />
                          Link para o cliente
                        </button>
                      </>
                    )}

                    {gravacao.status === "expired" && (
                      <span className="text-xs text-slate-500">Expirada (mais de 12 meses)</span>
                    )}

                    {gravacao.status === "failed" && (
                      <span
                        title={gravacao.erro || ""}
                        className="flex items-center gap-1.5 text-xs text-red-400"
                      >
                        <AlertTriangle size={11} />
                        Falha ao processar
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Reunião encerrada sem nenhuma gravação registrada: pode ser aviso perdido */}
            {meeting.meeting_provider === "daily" &&
              meeting.meeting_ended_at &&
              (!meeting.gravacoes || meeting.gravacoes.length === 0) && (
                <button
                  onClick={() => handleSincronizarGravacoes(meeting.id)}
                  disabled={isActioning}
                  className="flex items-center gap-1.5 text-xs text-slate-400 underline-offset-2 hover:underline disabled:opacity-50"
                >
                  <RefreshCw size={11} />
                  Procurar gravação desta reunião
                </button>
              )}
```

- [ ] **Step 2: Ajustar os handlers**

```tsx
  const handleAssistirGravacao = async (id: number, gravacaoId: number) => {
    setActionLoadingId(id);
    try {
      const { url } = await cardTaskService.linkGravacao(id, gravacaoId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      showError("Não foi possível abrir a gravação.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCompartilharGravacao = async (id: number, gravacaoId: number) => {
    setActionLoadingId(id);
    try {
      const { url, expira_em_dias } = await cardTaskService.compartilharGravacao(id, gravacaoId);
      await navigator.clipboard.writeText(url);
      showSuccess(`Link copiado — vale por ${expira_em_dias} dias.`);
    } catch {
      showError("Não foi possível gerar o link.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSincronizarGravacoes = async (id: number) => {
    setActionLoadingId(id);
    try {
      const { encontradas } = await cardTaskService.sincronizarGravacoes(id);
      showSuccess(
        encontradas > 0
          ? `${encontradas} gravação(ões) encontrada(s) — aguarde o processamento.`
          : "Nenhuma gravação encontrada para esta reunião."
      );
      await loadMeetings();
    } catch {
      showError("Não foi possível procurar a gravação.");
    } finally {
      setActionLoadingId(null);
    }
  };
```

Importar `RefreshCw` de `lucide-react`.

- [ ] **Step 3: Typecheck**

```
cd frontend && npx tsc --noEmit
```

- [ ] **Step 4: Commit** (perguntar antes)

```bash
git commit -am "feat(front): trechos gravados na aba Reunioes"
```

---

## Task 12: Recuperar a reunião de teste e homologar de novo

**Files:** nenhum — operação

- [ ] **Step 1: Subir para produção**

Deploy dos dois serviços no EasyPanel (lembrar do `CACHEBUST` no `frontend/dockerfile`) e conferir:

```
curl -s https://growthhsapi.healthsafetytech.com/health
docker exec -w /app hsgrowth-api-local alembic current   # deve bater com alembic heads
```

- [ ] **Step 2: Recuperar a reunião 36307**

Ela tem 3 trechos e uma transcrição esperando no Daily. No card 11193, clicar em **"Procurar gravação desta reunião"**. Esperado: "3 gravações encontradas".

Conferir no banco (da máquina, sem Docker — `psycopg2` já instalado):

```python
import io, psycopg2

url = [l.split("=", 1)[1].strip()
       for l in io.open("backend/.env.local", encoding="utf-8", errors="ignore")
       if l.startswith("DATABASE_URL=")][0].replace("postgresql+psycopg2://", "postgresql://")

c = psycopg2.connect(url, connect_timeout=20)
cur = c.cursor()
cur.execute("""select ordem, status, duration_seconds, size_bytes, r2_key
               from meeting_recordings where card_task_id = 36307 order by ordem""")
for linha in cur.fetchall():
    print(linha)
c.close()
```

Esperado: 3 linhas com `status = ready`, `r2_key` preenchida e tamanhos maiores que zero.

> A transcrição dessa reunião está em inglês e não vale para conferir a análise — ela é anterior à correção do idioma. Serve só para confirmar que o caminho do arquivo funciona.

- [ ] **Step 3: Nova reunião de teste**

Roteiro, no card 11193:

| # | Passo | Esperado |
|---|---|---|
| 1 | Criar reunião "No CRM" | link do convidado começa com `https://hsgrowth.healthsafetytech.com/entrar/` |
| 2 | Entrar pelos dois lados | convidado passa pela sala de espera |
| 3 | Olhar a tela do convidado | **não** existe botão de gravar |
| 4 | Anfitrião clica em gravar | faixa "● Gravando 00:05" aparece **nas duas telas** |
| 5 | Conversar 1 min, parar e gravar de novo por 1 min | faixa mostra "Gravação encerrada" e depois volta a contar |
| 6 | Falar uma objeção e um combinado | "o contrato vence em outubro", "me manda a proposta até sexta" |
| 7 | Encerrar nos dois lados | página avisa que a reunião terminou |
| 8 | Esperar alguns minutos | card mostra "Parte 1 de 2" e "Parte 2 de 2" |
| 9 | Assistir cada parte | vídeo abre e tem o conteúdo certo |
| 10 | Conferir a transcrição | **em português**, com os nomes de quem falou |
| 11 | Conferir a análise | 14 campos coerentes, com a objeção e o combinado |
| 12 | Gerar link para o cliente | abre em janela anônima |
| 13 | Conferir no Cloudflare | dois arquivos, o segundo com `parte2` no nome |

- [ ] **Step 4: Apagar o card de teste**

Depois de aprovado, apagar o card 11193 e as gravações de teste do bucket.

---

## Riscos

| Risco | Mitigação |
|---|---|
| `startTranscription` recusado pelo Prebuilt | O anfitrião entra como dono, que tem `canAdmin: transcription` por padrão; o erro é registrado no console e a reunião continua |
| `permissions` mexer no que o convidado já podia fazer | `hasPresence` e `canSend` explícitos mantêm câmera, microfone e presença |
| Evento perdido de novo | Botão "Procurar gravação desta reunião" (Task 9, Step 4) |
| Migration em produção | Só acrescenta tabela e coluna; SQL conferido antes de aplicar |
| Trecho gravado sobrescrever outro no bucket | Nome do arquivo ganha `parteN` a partir do segundo |
| Transcrição continuar ruim | A transcrição de 14/09 é a prova do problema; a nova homologação confere o idioma antes de seguir para a Fase 5 |

---

## Fora de escopo

- Juntar os trechos num arquivo único (o Daily não oferece; exigiria processar vídeo no servidor)
- Transcrição por trecho — ela é da reunião inteira, independente de quantas vezes gravaram
- Fase 5 (IA ao vivo), que só começa depois desta homologação passar
