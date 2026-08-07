# API4COM — Guia de Implementação da Integração VOIP (Ligações)

> Documento técnico para **reimplementar** a integração de ligações com o VOIP **API4COM** em outro sistema.
> Escrito a partir da implementação real do HSGrowth CRM (FastAPI + SQLAlchemy no backend, React + TS no frontend).
> Todos os trechos de código são reais do projeto — adapte nomes/paths ao seu stack.

---

## 1. Visão geral

A integração permite que um usuário (vendedor) **clique em "Ligar"** dentro de um card/atividade e o sistema dispare uma chamada telefônica pelo VOIP da API4COM, usando o **ramal** daquele usuário. Quando a ligação termina, a API4COM **avisa o sistema por webhook** com duração, status e link da gravação.

**Como a API4COM disca (importante entender o modelo):** a chamada é do tipo *click-to-call / callback*. O sistema chama o endpoint `/dialer` informando `extension` (ramal do vendedor) + `phone` (número do cliente). A API4COM primeiro **toca no webphone/ramal do vendedor**; quando ele atende, ela disca para o cliente e conecta os dois. Por isso, no frontend, a mensagem é *"Chamada iniciada! O webphone abrirá automaticamente"* — quem "abre" é o softphone da API4COM registrado naquele ramal.

### Fluxo de ponta a ponta

```
[Vendedor clica "Ligar" no card]
        │
        ▼
Frontend  POST /api/v1/api4com/call  { phone, card_id }
        │
        ▼
Backend (API4ComService.make_call):
  1. valida config ativa + token válido
  2. valida que o usuário tem RAMAL (user_extensions)
  3. cria CallLog (status "pending")
  4. POST https://api.api4com.com/api/v1/dialer
        { extension, phone, metadata:{ gateway, card_id, user_id, call_log_id } }
  5. guarda o call_id retornado no CallLog (status "ringing")
        │
        ▼
API4COM toca o webphone do vendedor → ele atende → disca o cliente
        │
        ▼ (quando a ligação termina)
API4COM  POST /api/v1/api4com/webhook  { id, duration, status, recording_url, metadata }
        │
        ▼
Backend (API4ComService.process_webhook):
  acha o CallLog pelo api4com_call_id e atualiza duração/status/gravação
```

### Componentes (o que você vai recriar)

| Camada | Arquivo no HSGrowth | Responsabilidade |
|---|---|---|
| Cliente HTTP | `services/api4com_client.py` | Fala com a API externa da API4COM (login, dialer, me) |
| Repository | `repositories/api4com_repository.py` | CRUD no banco + **criptografia da senha** (Fernet) |
| Service | `services/api4com_service.py` | Regra de negócio: token, ramais, chamada, webhook |
| Endpoints | `api/v1/endpoints/api4com.py` | Rotas REST (config, ramais, call, webhook) |
| Schemas | `schemas/api4com.py` | Pydantic (validação/serialização) |
| Models | `models/api4com.py` | 3 tabelas (config, ramais, histórico de chamadas) |
| Frontend service | `services/api4comService.ts` | Chama o backend |
| Frontend UI (config) | `pages/Settings.tsx` (aba `api4com`) | Admin configura credenciais + ramais |
| Frontend UI (ligar) | `components/cardDetails/FocusSection.tsx` | Botão "Ligar" na atividade |

---

## 2. A API externa da API4COM (o que precisamos dela)

Base: `https://api.api4com.com/api/v1` — docs oficiais: https://developers.api4com.com/

| Ação | Método/rota | Uso |
|---|---|---|
| **Login** (pegar token) | `POST /users/login` `{email, password}` → `{ id, ttl, created, userId }` | O `id` é o **token**; `ttl` é a validade em segundos (padrão ~14 dias) |
| **Validar token** | `GET /users/me` (header `Authorization: <token>`) | Teste de conexão |
| **Discar** | `POST /dialer` `{extension, phone, metadata}` | Inicia a chamada |
| **Webhook** (eles chamam você) | Configurado no painel da API4COM | Avisa quando a chamada termina |

⚠️ **Autenticação:** o header é `Authorization: <token>` **sem** o prefixo `Bearer`. É o valor cru do campo `id` do login.

---

## 3. Modelo de dados (3 tabelas)

### 3.1. `api4com_config` — credenciais + token (1 linha só)

Guarda a conta da API4COM da empresa. **Só existe uma linha** (config global).

| Coluna | Tipo | Observação |
|---|---|---|
| `email` | String | Login da conta API4COM |
| `password_encrypted` | Text | Senha **criptografada** (Fernet, reversível) |
| `api_token` | Text | Token atual (texto plano no banco) |
| `token_expires_at` | DateTime(tz) | Quando o token expira |
| `is_active` | Boolean | Só fica `true` depois de obter token |
| `last_sync_at` / `last_test_at` / `last_test_success` / `last_test_error` | — | Diagnóstico |
| `created_by_id` / `updated_by_id` | FK users | Auditoria |

### 3.2. `user_extensions` — ramal de cada vendedor

| Coluna | Tipo | Observação |
|---|---|---|
| `user_id` | FK users, **unique** | 1 usuário = 1 ramal |
| `extension` | String, **unique** | Ex.: `"1000"` |
| `is_active` | Boolean | — |

### 3.3. `call_logs` — histórico de chamadas

| Coluna | Tipo | Observação |
|---|---|---|
| `user_id` | FK users | Quem ligou |
| `card_id` | FK cards (nullable) | Card de vendas de origem |
| `service_card_id` | FK service_cards (nullable) | Card de serviços de origem |
| `phone` / `extension` | String | Número discado / ramal usado |
| `status` | String | `pending → ringing → completed / failed / no_answer` |
| `duration` | Integer | Segundos (vem no webhook) |
| `recording_url` | Text | Link da gravação (vem no webhook) |
| `api4com_call_id` | String, unique | **Chave** para casar o webhook |
| `call_metadata` | Text (JSON) | Metadata do webhook |

> ⚠️ **Pegadinha SQLAlchemy:** a coluna de metadata foi nomeada `call_metadata` (não `metadata`) porque `metadata` é atributo reservado do SQLAlchemy Declarative.

**Model (SQLAlchemy) — trecho real:**

```python
# models/api4com.py
class API4ComConfig(Base):
    __tablename__ = "api4com_config"
    id = Column(Integer, primary_key=True)
    email = Column(String(255), nullable=False)
    password_encrypted = Column(Text, nullable=False)
    api_token = Column(Text, nullable=True)
    token_expires_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=False, nullable=False)
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    last_test_at = Column(DateTime(timezone=True), nullable=True)
    last_test_success = Column(Boolean, nullable=True)
    last_test_error = Column(Text, nullable=True)
    # + created_at/updated_at/created_by_id/updated_by_id

class UserExtension(Base):
    __tablename__ = "user_extensions"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"),
                     nullable=False, unique=True, index=True)
    extension = Column(String(50), nullable=False, unique=True, index=True)
    is_active = Column(Boolean, default=True, nullable=False)

class CallLog(Base):
    __tablename__ = "call_logs"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    card_id = Column(Integer, ForeignKey("cards.id", ondelete="CASCADE"), nullable=True, index=True)
    service_card_id = Column(Integer, ForeignKey("service_cards.id", ondelete="CASCADE"), nullable=True, index=True)
    phone = Column(String(50), nullable=False)
    extension = Column(String(50), nullable=False)
    status = Column(String(50), nullable=False, default="pending")
    duration = Column(Integer, nullable=True)
    recording_url = Column(Text, nullable=True)
    api4com_call_id = Column(String(255), nullable=True, unique=True, index=True)
    error_message = Column(Text, nullable=True)
    call_metadata = Column(Text, nullable=True)  # NÃO usar o nome "metadata"
```

---

## 4. Backend

### 4.1. Cliente HTTP (`api4com_client.py`)

Responsável só por falar com a API externa. Usa `httpx` (async).

```python
import httpx
from typing import Optional, Dict, Any

class API4ComClient:
    BASE_URL = "https://api.api4com.com/api/v1"
    TIMEOUT = 30.0

    def __init__(self, token: Optional[str] = None):
        self.token = token

    async def login(self, email: str, password: str) -> Dict[str, Any]:
        """POST /users/login → { id (token), ttl (segundos), created, userId }"""
        async with httpx.AsyncClient(timeout=self.TIMEOUT) as client:
            r = await client.post(f"{self.BASE_URL}/users/login",
                                  json={"email": email, "password": password})
            r.raise_for_status()
            return r.json()

    async def test_connection(self) -> bool:
        """GET /users/me — retorna True/False sem lançar exceção."""
        if not self.token:
            return False
        try:
            async with httpx.AsyncClient(timeout=self.TIMEOUT) as client:
                r = await client.get(f"{self.BASE_URL}/users/me",
                                     headers={"Authorization": self.token})
                return r.status_code == 200
        except Exception:
            return False

    async def make_call(self, extension: str, phone: str,
                        metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """POST /dialer → inicia a chamada. Retorna { id (call_id), ... }"""
        if not self.token:
            raise ValueError("Token não configurado")
        payload = {"extension": extension, "phone": phone}
        if metadata:
            payload["metadata"] = metadata
        async with httpx.AsyncClient(timeout=self.TIMEOUT) as client:
            r = await client.post(f"{self.BASE_URL}/dialer",
                                  headers={"Authorization": self.token}, json=payload)
            r.raise_for_status()
            return r.json()
```

### 4.2. Criptografia da senha (`api4com_repository.py`)

A senha da conta API4COM fica **criptografada** no banco (Fernet — criptografia simétrica reversível, porque precisamos da senha em texto plano para refazer login e renovar o token).

```python
from cryptography.fernet import Fernet
import os

# A chave DEVE vir de variável de ambiente em produção (ver §5).
ENCRYPTION_KEY = os.getenv("API4COM_ENCRYPTION_KEY", Fernet.generate_key())
cipher_suite = Fernet(ENCRYPTION_KEY)

# criptografar (ao salvar):
password_encrypted = cipher_suite.encrypt(config_data.password.encode()).decode()

# descriptografar (ao renovar token):
decrypted = cipher_suite.decrypt(config.password_encrypted.encode()).decode()
```

> 🔴 **GOTCHA CRÍTICO:** se `API4COM_ENCRYPTION_KEY` **não** estiver definida no ambiente, o código gera uma chave **aleatória a cada boot** (`Fernet.generate_key()`). Aí, depois de reiniciar o servidor, **a senha salva não descriptografa mais** (chave diferente). Em produção, **sempre** defina `API4COM_ENCRYPTION_KEY` fixa. Gere uma vez com:
> ```python
> from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())
> ```
> e coloque no `.env`. (O `api_token` em si fica em texto plano no banco; a criptografia protege só a senha.)

### 4.3. Service — token, chamada e webhook (`api4com_service.py`)

**Salvar config + obter token** (login e cálculo de expiração pelo `ttl`):

```python
async def save_config(self, config_data, current_user):
    # ... cria/atualiza a linha de config (senha criptografada) ...
    client = API4ComClient()
    login_response = await client.login(config_data.email, config_data.password)
    token = login_response.get("id")
    ttl_seconds = int(login_response.get("ttl", 1209600))         # ~14 dias
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=ttl_seconds)
    self.repository.update_token(config, token, expires_at)        # marca is_active=True
    self.repository.update_test_result(config, success=True)
    return await self.get_config()
```

**Fazer a chamada** (o coração da integração):

```python
async def make_call(self, call_request, current_user):
    # 1. config ativa?
    config = self.repository.get_config()
    if not config or not config.is_active:
        raise HTTPException(400, "API4COM não está configurada ou ativa")
    # 2. token válido e não expirado?
    if not config.api_token or config.token_expires_at <= datetime.now(timezone.utc):
        raise HTTPException(400, "Token inválido/expirado. Configure novamente")
    # 3. o usuário tem ramal?
    extension = self.repository.get_extension_by_user(current_user.id)
    if not extension or not extension.is_active:
        raise HTTPException(400, "Você não tem ramal configurado")
    # 4. registra a chamada (status "pending")
    call_log = self.repository.create_call_log(
        user_id=current_user.id, card_id=call_request.card_id,
        phone=call_request.phone, extension=extension.extension,
        service_card_id=call_request.service_card_id)
    # 5. dispara na API4COM com metadata de rastreamento
    try:
        client = API4ComClient(token=config.api_token)
        metadata = {
            "gateway": "GrowthHS",
            "card_id": call_request.card_id,
            "service_card_id": call_request.service_card_id,
            "user_id": current_user.id,
            "call_log_id": call_log.id,        # útil pra casar no webhook
        }
        resp = await client.make_call(extension.extension, call_request.phone, metadata)
        call_id = resp.get("id") or resp.get("call_id")
        if call_id:
            self.repository.update_call_log(call_log, status="ringing",
                                            api4com_call_id=str(call_id))
        return CallResponse(success=True, message="Chamada iniciada", call_log_id=call_log.id)
    except Exception as e:
        self.repository.update_call_log(call_log, status="failed", error_message=str(e))
        return CallResponse(success=False, message="Erro ao iniciar chamada",
                            call_log_id=call_log.id, error=str(e))
```

**Processar o webhook** (casa pelo `api4com_call_id`):

```python
async def process_webhook(self, webhook_data):
    if not webhook_data.id:
        return
    call_log = self.repository.get_call_log_by_api4com_id(webhook_data.id)
    if not call_log:
        return  # chamada não iniciada pelo nosso sistema → ignora
    import json
    self.repository.update_call_log(
        call_log,
        status=webhook_data.status or "completed",
        duration=webhook_data.duration,
        recording_url=webhook_data.recording_url,
        call_metadata=json.dumps(webhook_data.metadata) if webhook_data.metadata else None)
```

**Renovação do token** (existe, mas **veja §6** sobre o agendamento):

```python
async def refresh_token(self) -> None:
    """Renova se faltar < 24h para expirar. Deve ser chamado por um scheduler."""
    config = self.repository.get_config()
    if not config or not config.token_expires_at:
        return
    if (config.token_expires_at - datetime.now(timezone.utc)).total_seconds() < 86400:
        try:
            pwd = self.repository.get_decrypted_password(config)   # precisa da ENCRYPTION_KEY!
            client = API4ComClient()
            login = await client.login(config.email, pwd)
            expires_at = datetime.now(timezone.utc) + timedelta(seconds=int(login.get("ttl", 1209600)))
            self.repository.update_token(config, login.get("id"), expires_at)
        except Exception:
            pass  # falha silenciosa; será detectada no próximo teste
```

### 4.4. Endpoints (`api/v1/endpoints/api4com.py`)

| Rota | Método | Permissão | Descrição |
|---|---|---|---|
| `/api4com/config` | GET | admin/gerente | Ver config (status do token) |
| `/api4com/config` | POST | **admin** | Salvar credenciais + fazer login/obter token |
| `/api4com/test` | POST | admin/gerente | Testar conexão (`/users/me`) |
| `/api4com/extensions` | GET | admin/gerente | Listar ramais |
| `/api4com/extensions` | POST | admin/gerente | Criar/atualizar ramal de um usuário |
| `/api4com/extensions/{user_id}` | DELETE | admin/gerente | Remover ramal |
| `/api4com/call` | POST | **qualquer autenticado com ramal** | Iniciar chamada |
| `/api4com/webhook` | POST | **público (sem auth)** | Recebe fim de chamada da API4COM |

```python
# rota de chamada — fina, delega ao service
@router.post("/call", response_model=CallResponse)
async def make_call(call_request: CallRequest,
                    current_user: User = Depends(get_current_active_user),
                    db: Session = Depends(get_db)):
    return await API4ComService(db).make_call(call_request, current_user)

# webhook — SEM autenticação (a API4COM chama de fora)
@router.post("/webhook")
async def receive_webhook(webhook_data: WebhookCallData, db: Session = Depends(get_db)):
    await API4ComService(db).process_webhook(webhook_data)
    return {"message": "Webhook processado com sucesso", "call_id": webhook_data.id}
```

Registro do router (no `api/v1/__init__.py`):

```python
api_router.include_router(api4com.router, prefix="/api4com", tags=["API4COM"])
```

> As ações de config/ramais também gravam **audit log** (quem alterou credenciais/ramais). Opcional, mas recomendado.

### 4.5. Schemas (Pydantic) — os principais

```python
class CallRequest(BaseModel):
    phone: str                              # com DDI, ex: +5548999887766
    card_id: Optional[int] = None
    service_card_id: Optional[int] = None

class WebhookCallData(BaseModel):           # o que a API4COM manda no fim da chamada
    id: Optional[str] = None                # = api4com_call_id
    caller: Optional[str] = None            # ramal
    called: Optional[str] = None            # destino
    duration: Optional[int] = None          # segundos
    recording_url: Optional[str] = None
    status: Optional[str] = None            # completed/failed/no_answer/busy
    metadata: Optional[dict] = None         # o metadata que enviamos no /dialer
    started_at: Optional[str] = None
    ended_at: Optional[str] = None
```

---

## 5. Configuração (o que precisa existir no ambiente)

### 5.1. Dependências (backend)

```
httpx==0.26.0            # cliente HTTP async
cryptography==42.0.2     # Fernet (criptografia da senha)
apscheduler==3.10.4      # (opcional) para renovar token automaticamente
```

### 5.2. Variável de ambiente obrigatória

```env
# Gere uma vez: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
API4COM_ENCRYPTION_KEY=coloque-a-chave-fernet-fixa-aqui
```

### 5.3. Credenciais da API4COM (feito pela UI, não por env)

O **admin** entra em Configurações → aba API4COM e informa **email + senha** da conta API4COM. Ao salvar, o backend faz login e guarda o token. Não vai em `.env` — fica no banco (`api4com_config`).

### 5.4. Webhook no painel da API4COM

No painel da API4COM, cadastre a URL pública do webhook apontando para:

```
POST https://SEU_DOMINIO/api/v1/api4com/webhook
```

Sem isso, `duration`/`recording_url`/`status` final não chegam (a chamada funciona, mas o histórico fica sem o desfecho).

---

## 6. Renovação do token (o ponto do "atualizar de tempos em tempos")

**Realidade atual da implementação:** o token da API4COM dura ~**14 dias** (`ttl` do login). O método `refresh_token()` existe no service, mas **não está agendado em nenhum job do scheduler**. Ou seja, **hoje a renovação é manual**: quando o token expira, o admin volta em Configurações → API4COM e **salva de novo** as credenciais (isso refaz o login e gera um token novo). É por isso que, na prática, você atualiza a configuração de tempos em tempos.

**Duas formas de resolver no sistema novo:**

**(A) Manter manual** — simples: o admin re-salva as credenciais a cada ~14 dias. O status do token aparece na UI (`has_valid_token`, `token_expires_at`).

**(B) Automatizar (recomendado)** — agende `refresh_token()` para rodar de hora em hora (ele só renova se faltar < 24h). Exemplo com APScheduler:

```python
# no setup do scheduler
from app.services.api4com_service import API4ComService
from app.db.session import SessionLocal

async def _api4com_refresh_job():
    db = SessionLocal()
    try:
        await API4ComService(db).refresh_token()
    finally:
        db.close()

sched.add_job(_api4com_refresh_job, trigger=IntervalTrigger(hours=1),
              id="api4com_refresh", replace_existing=True)
```

> Para a opção (B) funcionar, a `API4COM_ENCRYPTION_KEY` **precisa** estar fixa no ambiente (senão a senha salva não descriptografa e o relogin falha). Ver §4.2.

---

## 7. Ramais dos usuários

Cada usuário que vai ligar precisa de um **ramal** cadastrado (`user_extensions`), correspondente ao ramal dele na API4COM. Sem ramal, o `/call` responde 400 ("Você não tem ramal configurado").

- Cadastro pela UI (admin/gerente): Configurações → API4COM → seção de ramais → escolhe o usuário + informa o número do ramal (ex.: `1000`).
- Regra: **1 usuário ↔ 1 ramal** (ambos `unique`).

---

## 8. Frontend

### 8.1. Serviço (`api4comService.ts`)

```typescript
const api4comService = {
  getConfig: () => api.get('/api/v1/api4com/config').then(r => r.data),
  saveConfig: (data) => api.post('/api/v1/api4com/config', data).then(r => r.data),
  testConnection: () => api.post('/api/v1/api4com/test').then(r => r.data),
  listExtensions: () => api.get('/api/v1/api4com/extensions').then(r => r.data),
  saveExtension: (data) => api.post('/api/v1/api4com/extensions', data).then(r => r.data),
  deleteExtension: (userId) => api.delete(`/api/v1/api4com/extensions/${userId}`),
  makeCall: (data: { phone: string; card_id?: number; service_card_id?: number }) =>
    api.post('/api/v1/api4com/call', data).then(r => r.data),
};
```

### 8.2. Botão "Ligar" (fluxo de UX)

No card, o botão "Ligar" (só em atividades de ligação) chama `handleMakeCall`, que:
1. Busca a pessoa vinculada (dados frescos da API).
2. Monta a lista de números disponíveis (principal, WhatsApp, comercial, alternativo, extras).
3. **1 número** → pede confirmação e liga. **2+ números** → abre modal de seleção.
4. Ao ligar, chama `api4comService.makeCall({ phone, card_id })`.

```typescript
const executeCall = async (activityId: number, phoneNumber: string) => {
  setCallingTaskId(activityId);
  try {
    const result = await api4comService.makeCall({ phone: phoneNumber, card_id: card.id });
    if (result.success) showSuccess("Chamada iniciada! O webphone abrirá automaticamente.");
    else showError(`Erro ao iniciar chamada: ${result.error || result.message}`);
  } catch (e: any) {
    showError(`Erro ao iniciar chamada: ${e.response?.data?.detail || e.message}`);
  } finally {
    setCallingTaskId(null);
  }
};
```

### 8.3. Tela de configuração (admin)

Na página de Configurações há uma aba **API4COM** (visível só para admin) com:
- **Credenciais:** form de email/senha → `saveConfig` (faz login e mostra `has_valid_token` / `token_expires_at`).
- **Testar conexão:** botão → `testConnection`.
- **Ramais:** lista de usuários + ramal, com criar/editar/remover.

---

## 9. Checklist de portabilidade para o outro sistema

1. **Banco:** criar as 3 tabelas (`api4com_config`, `user_extensions`, `call_logs`) — via migration.
2. **Env:** definir `API4COM_ENCRYPTION_KEY` (Fernet, fixa).
3. **Deps:** `httpx`, `cryptography` (e `apscheduler` se for automatizar o token).
4. **Backend:** portar client → repository (com Fernet) → service → schemas → endpoints; registrar o router.
5. **Auth/roles:** proteger config/ramais (admin/gerente); `/call` para autenticados com ramal; **`/webhook` público**.
6. **Frontend:** serviço + tela de config (credenciais/ramais) + botão "Ligar" no card.
7. **Painel API4COM:** cadastrar a URL do webhook (`/api/v1/api4com/webhook`).
8. **Cadastrar credenciais** pela UI (admin) e **os ramais** de cada usuário.
9. **(Opcional) Agendar** `refresh_token()` de hora em hora.
10. **Testar:** salvar config → testar conexão → cadastrar ramal → ligar de um card → conferir o `call_log` sendo atualizado pelo webhook.

---

## 10. Pontos de atenção (resumo dos "pega-ratão")

- 🔴 `API4COM_ENCRYPTION_KEY` **fixa** no ambiente — senão a senha vira ilegível após restart.
- 🔴 Coluna de metadata do call_log deve se chamar **`call_metadata`**, não `metadata` (reservado no SQLAlchemy).
- 🟠 Header de auth é `Authorization: <token>` **sem `Bearer`**.
- 🟠 O `/webhook` **não** tem autenticação — valide pela existência do `api4com_call_id` no seu banco (só atualiza chamadas que você mesmo iniciou).
- 🟠 Token dura ~14 dias e **hoje a renovação é manual** — automatize com o `refresh_token()` + scheduler se não quiser re-salvar credenciais periodicamente.
- 🟢 Sempre mande `metadata` no `/dialer` (com `call_log_id`, `card_id`, `user_id`) — facilita rastrear e casar o webhook.
- 🟢 O número deve ir com DDI (ex.: `+5548999887766`).

---

*Documento gerado a partir da implementação real do HSGrowth CRM. Arquivos de referência: `backend/app/{models,services,repositories,schemas,api/v1/endpoints}/api4com*.py`, `backend/app/services/api4com_client.py`, `frontend/src/services/api4comService.ts`, `frontend/src/pages/Settings.tsx`, `frontend/src/components/cardDetails/FocusSection.tsx`.*
