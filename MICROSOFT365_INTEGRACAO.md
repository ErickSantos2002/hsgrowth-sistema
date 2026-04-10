# Plano de Integração Microsoft 365 — HSGrowth CRM

Documento de referência para a implementação completa da integração com Microsoft 365 / Entra ID.

---

## Status Geral

| Fase | Feature | Status |
|---|---|---|
| 1 | SSO — Login com Microsoft | ✅ Concluído |
| 2 | E-mail pelo Card (Graph API) | ⏳ Pendente |
| 3 | Sincronização com Outlook Calendar | ⏳ Pendente |
| 4 | Notificações no Microsoft Teams | ⏳ Pendente |

---

## Azure App Registration — Configurações

**App:** HSGrowth CRM  
**Tenant:** healthsafetytech.com (My organization only)

| Campo | Valor |
|---|---|
| Application (client) ID | ver `.env` → `MS_CLIENT_ID` |
| Directory (tenant) ID | ver `.env` → `MS_TENANT_ID` |
| Client Secret | ver `.env` → `MS_CLIENT_SECRET` |
| Permissões concedidas | `User.Read` (Delegated) — admin consent ✅ |
| Redirect URI (dev) | `http://localhost:8000/api/v1/auth/microsoft/callback` |
| Redirect URI (prod) | adicionar em: Entra ID → HSGrowth CRM → Authentication |

> ⚠️ Nunca commitar os valores reais de `MS_CLIENT_SECRET` no repositório.

---

## Fase 1 — SSO (Login com Microsoft)

### O que faz
Usuários entram no HSGrowth com a conta @healthsafetytech.com. Após autenticação no Microsoft, o sistema localiza o usuário pelo e-mail e gera o JWT interno normalmente. O login por email/senha continua funcionando em paralelo.

### Fluxo
```
Usuário clica "Entrar com Microsoft"
→ frontend redireciona para GET /api/v1/auth/microsoft
→ backend monta URL de autorização e redireciona para login.microsoftonline.com
→ usuário autentica no Microsoft
→ Microsoft redireciona para GET /api/v1/auth/microsoft/callback?code=...
→ backend troca code por token, lê email do usuário via Graph
→ busca User no banco pelo email (se não existir: erro 403)
→ gera access_token + refresh_token internos
→ redireciona para frontend com tokens na URL (ou cookie)
→ usuário logado normalmente
```

### Env vars a adicionar

```env
MS_CLIENT_ID=
MS_CLIENT_SECRET=
MS_TENANT_ID=
MS_REDIRECT_URI=http://localhost:8000/api/v1/auth/microsoft/callback
```

### Arquivos a criar/modificar

| Arquivo | Ação |
|---|---|
| `backend/requirements.txt` | Adicionar `msal` |
| `backend/app/core/config.py` | Adicionar `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `MS_TENANT_ID`, `MS_REDIRECT_URI` |
| `backend/.env` + `.env.example` | Adicionar as 4 vars acima |
| `backend/app/services/microsoft_auth_service.py` | **Criar** — monta URL OAuth, troca code por token, busca perfil via Graph |
| `backend/app/api/v1/endpoints/auth.py` | Adicionar endpoints `GET /microsoft` e `GET /microsoft/callback` |
| `frontend/src/pages/Login.tsx` | Adicionar botão "Entrar com Microsoft" |

### Detalhes do backend

**`microsoft_auth_service.py`:**
```python
import msal

class MicrosoftAuthService:
    SCOPES = ["User.Read", "openid", "profile", "email"]

    def get_authorization_url(self) -> str:
        """Retorna URL para redirecionar o usuário ao login Microsoft."""

    def exchange_code_for_token(self, code: str) -> dict:
        """Troca o code OAuth por access_token + id_token."""

    def get_user_profile(self, access_token: str) -> dict:
        """Chama GET /me na Graph API e retorna id, displayName, mail."""
```

**Endpoints em `auth.py`:**
```python
GET /api/v1/auth/microsoft
    → redireciona para Microsoft (302)

GET /api/v1/auth/microsoft/callback?code=...&state=...
    → troca code, busca usuário por email, retorna JWT
    → se usuário não encontrado: redireciona para /login?error=user_not_found
    → sucesso: redireciona para /auth/callback?access_token=...&refresh_token=...
```

**Frontend — rota de callback:**
- Criar página `frontend/src/pages/AuthCallback.tsx`
- Lê tokens da URL query string
- Salva no localStorage (igual ao login normal)
- Redireciona para `/`

### Como testar
1. Rodar backend local: `uvicorn app.main:app --reload`
2. Acessar: `http://localhost:8000/api/v1/auth/microsoft`
3. Deve redirecionar para login Microsoft → autenticar com @healthsafetytech.com
4. Deve voltar logado no CRM

---

## Fase 2 — E-mail pelo Card

### Dependência
Requer que o usuário tenha autenticado via SSO (token Microsoft armazenado).

### O que faz
SDR/Vendedor abre um card, clica em "E-mail", preenche assunto e corpo, envia. O e-mail sai da caixa do próprio usuário no Outlook e fica registrado como atividade concluída no card.

### Permissões adicionais no Azure
Adicionar permissão delegada: `Mail.Send`  
(Entra ID → HSGrowth CRM → API permissions → Add → Microsoft Graph → Delegated → Mail.Send)

### Fluxo
```
Usuário clica "E-mail" no card
→ modal com campos: Para (pré-preenchido com emails do contato), Assunto, Corpo
→ POST /api/v1/cards/{id}/send-email
→ backend chama Microsoft Graph: POST /me/sendMail
→ e-mail enviado (aparece no Sent do Outlook do usuário)
→ CardTask criada: tipo EMAIL, concluída, título = assunto, descrição = preview do corpo
→ modal fecha, atividade aparece no card
```

### Armazenamento do token Microsoft por usuário

Para chamar a Graph API em nome do usuário, o backend precisa do access_token Microsoft dele. Como o token expira em ~1h:
- Salvar `ms_access_token` + `ms_refresh_token` + `ms_token_expires_at` no model `User`
- Migration: adicionar 3 colunas na tabela `users`
- Ao chamar Graph API: verificar expiração, renovar se necessário via `msal`

### Arquivos a criar/modificar

| Arquivo | Ação |
|---|---|
| `backend/alembic/versions/...add_ms_tokens_to_users.py` | **Criar** — migration: 3 colunas na tabela users |
| `backend/app/models/user.py` | Adicionar `ms_access_token`, `ms_refresh_token`, `ms_token_expires_at` |
| `backend/app/services/microsoft_graph_service.py` | **Criar** — `send_email(user, to, subject, body)` |
| `backend/app/api/v1/endpoints/cards.py` | Adicionar `POST /{id}/send-email` |
| `frontend/src/components/cardDetails/` | Adicionar botão "E-mail" + modal de composição |
| `frontend/src/services/cardService.ts` | Adicionar `sendEmail(cardId, to, subject, body)` |

### Como testar
1. Logar via SSO (Fase 1 concluída)
2. Abrir um card com contato que tenha e-mail
3. Clicar "E-mail", preencher, enviar
4. Verificar: e-mail chegou no destinatário, atividade aparece no card, e-mail está no Sent do Outlook

---

## Fase 3 — Sincronização com Outlook Calendar

### Dependência
Requer SSO (Fase 1) + tokens Microsoft por usuário (Fase 2).

### O que faz
Quando uma atividade (ligação, reunião, tarefa) é criada no CRM, cria automaticamente um evento no Outlook Calendar do responsável. Quando concluída ou deletada no CRM, o evento é atualizado/removido.

### Permissões adicionais no Azure
Adicionar permissão delegada: `Calendars.ReadWrite`

### Fluxo
```
CardTask criada → Graph: POST /me/events → salva calendar_event_id na task
CardTask atualizada (data/título) → Graph: PATCH /me/events/{calendar_event_id}
CardTask concluída → Graph: PATCH → evento marcado como concluído
CardTask deletada → Graph: DELETE /me/events/{calendar_event_id}
```

### Arquivos a criar/modificar

| Arquivo | Ação |
|---|---|
| `backend/alembic/versions/...add_calendar_event_id.py` | **Criar** — migration: coluna `calendar_event_id` em `card_tasks` |
| `backend/app/models/card_task.py` | Adicionar `calendar_event_id` |
| `backend/app/services/microsoft_graph_service.py` | Adicionar métodos `create_event`, `update_event`, `delete_event` |
| `backend/app/services/card_task_service.py` | Hooks pós-create/update/delete para sincronizar Calendar |
| `backend/app/models/user_notification_setting.py` | Adicionar campo `sync_outlook_calendar` (opt-in) |
| `frontend/src/pages/UserSettings.tsx` | Toggle "Sincronizar atividades com Outlook Calendar" |

### Observação
A sincronização é opt-in por usuário. Se `sync_outlook_calendar = False`, nenhum evento é criado no Outlook.

---

## Fase 4 — Notificações no Microsoft Teams

### Dependência
Nenhuma — independente das outras fases. Pode ser implementada a qualquer momento.

### O que faz
Eventos importantes do CRM (card ganho, meta batida, nova lead de alto valor) aparecem num canal do Teams via Incoming Webhook.

### Configuração no Teams (você faz)
1. Abrir o Teams → canal desejado (ex: `#crm-alerts`)
2. `...` → Connectors → Incoming Webhook → configurar → copiar URL
3. Adicionar no `.env`: `TEAMS_WEBHOOK_URL=https://...`

### Eventos sugeridos para notificar
- Card marcado como ganho (com valor)
- Card de valor acima de R$ X criado
- Meta mensal atingida (se integrarmos com o módulo de metas)

### Arquivos a criar/modificar

| Arquivo | Ação |
|---|---|
| `backend/app/core/config.py` | Adicionar `TEAMS_WEBHOOK_URL: str = ""` |
| `backend/.env` + `.env.example` | Adicionar `TEAMS_WEBHOOK_URL=` |
| `backend/app/services/teams_notification_service.py` | **Criar** — `send_message(title, text, facts)` |
| `backend/app/services/card_service.py` | Chamar Teams service nos eventos de card ganho |

### Payload de exemplo (Adaptive Card)
```json
{
  "type": "message",
  "attachments": [{
    "contentType": "application/vnd.microsoft.card.adaptive",
    "content": {
      "type": "AdaptiveCard",
      "body": [
        { "type": "TextBlock", "text": "🏆 Card Ganho!", "weight": "bolder" },
        { "type": "FactSet", "facts": [
          { "title": "Cliente", "value": "Empresa XYZ" },
          { "title": "Valor", "value": "R$ 50.000" },
          { "title": "Vendedor", "value": "João Silva" }
        ]}
      ]
    }
  }]
}
```

---

## Ordem de Implementação Recomendada

```
Fase 1 (SSO)
  └─ Fase 2 (E-mail)
       └─ Fase 3 (Calendar)

Fase 4 (Teams) — qualquer momento, independente
```

---

## Checklist de Progresso

### Fase 1 — SSO
- [x] App Registration criado no Azure Entra ID
- [x] Client Secret gerado
- [x] Permissão `User.Read` concedida (admin consent)
- [x] `msal` adicionado ao `requirements.txt` e imagem Docker reconstruída
- [x] Env vars adicionadas ao `.env`, `.env.example` e `docker-compose.yml`
- [x] `microsoft_auth_service.py` criado (com `prompt="select_account"`)
- [x] Endpoints `/auth/microsoft` e `/auth/microsoft/callback` implementados
- [x] Página `AuthCallback.tsx` criada no frontend
- [x] Botão "Entrar com Microsoft" na tela de Login
- [x] Testado end-to-end com conta @healthsafetytech.com
- [ ] Redirect URI de produção adicionado no Azure (fazer quando deploy em prod)

### Fase 2 — E-mail pelo Card
- [ ] Permissão `Mail.Send` adicionada no Azure
- [ ] Migration: colunas ms_token no model User
- [ ] `microsoft_graph_service.py` criado
- [ ] Endpoint `POST /cards/{id}/send-email` implementado
- [ ] Modal de composição de e-mail no frontend
- [ ] Testado end-to-end

### Fase 3 — Calendar Sync
- [ ] Permissão `Calendars.ReadWrite` adicionada no Azure
- [ ] Migration: `calendar_event_id` em card_tasks
- [ ] Métodos de Calendar no `microsoft_graph_service.py`
- [ ] Hooks em `card_task_service.py`
- [ ] Toggle de opt-in no settings do usuário
- [ ] Testado end-to-end

### Fase 4 — Teams
- [ ] Incoming Webhook configurado no Teams
- [ ] `TEAMS_WEBHOOK_URL` no `.env`
- [ ] `teams_notification_service.py` criado
- [ ] Integrado ao card_service (evento card ganho)
- [ ] Testado end-to-end
