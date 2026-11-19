# Pedido de liberação de CNPJ em Vendas — plano de implementação

> Spec: `docs/superpowers/specs/2026-11-19-liberacao-cnpj-vendas-design.md`.
> Versão 1.11.32. Migration aditiva (tabela nova): pode rodar antes do código.

**Objetivo:** o vendedor/SDR barrado pela trava de CNPJ pede liberação; admin/gerente liberam ou
recusam na aba Liberações da Consulta de CNPJ; ao liberar, o card é criado (ou a empresa
vinculada) em nome do vendedor.

**Arquitetura:** tabela `cnpj_release_requests` + service `parcerias/liberacoes.py` que guarda o
pedido e, ao liberar, chama `CardService.create_card`/`update_card` como o vendedor, passando
`liberacao_cnpj` para `vendas.conferir` dispensar a trava. Front: o hook `useLiberacaoCnpj` ganha
o modo "Pedir liberação"; a Consulta de CNPJ ganha abas.

**Stack:** FastAPI + SQLAlchemy + Alembic; React 19 + TypeScript + Tailwind.

**Rodar testes:**
`cd backend && MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest <alvo> -q -p no:cacheprovider --color=no`
(SQLite em memória; não toca o banco do container.)

---

## Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `backend/app/models/cnpj_release_request.py` (novo) | Model `CnpjReleaseRequest` |
| `backend/app/models/__init__.py` | Registrar o model |
| `backend/alembic/versions/2026_11_19_1000-3b4c5d6e7f8a_liberacoes_cnpj.py` (novo) | Criar a tabela |
| `backend/app/services/parcerias/vendas.py` | `com_quem_bloqueia()` e `conferir(..., liberacao=)` |
| `backend/app/services/card_service.py` | `create_card`/`update_card` com `liberacao_cnpj` |
| `backend/app/services/parcerias/liberacoes.py` (novo) | pedir, listar, contar, liberar, recusar, cancelar |
| `backend/app/schemas/liberacoes_cnpj.py` (novo) | Schemas de entrada e saída |
| `backend/app/api/v1/endpoints/liberacoes_cnpj.py` (novo) | Rotas |
| `backend/app/api/v1/__init__.py` | Incluir o router |
| `backend/app/services/notificacoes/tipos.py` | 2 tipos de aviso |
| `backend/tests/unit/test_liberacoes_cnpj.py` (novo) | Testes |
| `frontend/src/services/liberacoesCnpjService.ts` (novo) | Chamadas da API |
| `frontend/src/hooks/useLiberacaoCnpj.tsx` | Modo "Pedir liberação" |
| `frontend/src/pages/KanbanBoard.tsx`, `frontend/src/components/cardDetails/ClientSection.tsx` | Passar o pedido |
| `frontend/src/components/parcerias/LiberacoesCnpj.tsx` (novo) | Aba Liberações |
| `frontend/src/pages/parcerias/ConsultaCnpj.tsx` | Abas Consulta / Liberações |
| `frontend/src/layouts/MainLayout.tsx` | Contador de pendentes |
| CHANGELOG, ChangelogModal, MainLayout (rodapé), `docs/programa-de-parceiros.md` | Versão e guia |

---

### Tarefa 1: Model e migration

- [ ] Criar `CnpjReleaseRequest` com as colunas da spec §5 (`payload` como `JSON`, que vira
  JSON no Postgres e TEXT no SQLite dos testes).
- [ ] Importar em `app/models/__init__.py`, ao lado de `CnpjConsulta`.
- [ ] Migration `3b4c5d6e7f8a`, `down_revision = '2a3b4c5d6e7f'`: `op.create_table` com índices em
  `status`, `cnpj`, `requested_by_id`, `created_at`; `downgrade` derruba a tabela.
- [ ] **Não** rodar `alembic upgrade` no container local (aponta para produção).

### Tarefa 2: Trava aceita liberação aprovada

Em `vendas.py`:

```python
def com_quem_bloqueia(db, user, client_id, ignorar_card_id=None) -> Optional[str]:
    """Texto de com quem o CNPJ está, ou None se está livre (ou quem cria é integração)."""

def conferir(db, user, client_id, justificativa=None, ignorar_card_id=None, liberacao=None):
    if liberacao:
        return liberacao          # pedido já liberado pela gestão: grava este texto no card
    ...
```

Em `card_service.py`: `create_card(..., liberacao_cnpj: Optional[str] = None)` e
`update_card(..., liberacao_cnpj: Optional[str] = None)` repassam para `conferir(liberacao=...)`.

Teste: `conferir` com `liberacao` devolve o texto mesmo com o CNPJ bloqueado.

### Tarefa 3: Service de liberações (TDD)

`app/services/parcerias/liberacoes.py`:

```python
TIPOS = ("criar_card", "vincular_empresa")

def pedir(db, user, kind, client_id, reason, payload=None, card_id=None) -> CnpjReleaseRequest
def listar(db, user, status=None) -> List[CnpjReleaseRequest]
def contar_pendentes(db, user) -> int
def liberar(db, gestor, pedido_id, nota=None) -> CnpjReleaseRequest
def recusar(db, gestor, pedido_id, nota) -> CnpjReleaseRequest
def cancelar(db, user, pedido_id) -> CnpjReleaseRequest
```

Regras:
- `pedir`: só `salesperson`/`sdr` (403); motivo obrigatório; `com_quem_bloqueia` None → 422
  "Este CNPJ está livre…"; criar valida o payload com `CardCreate(**payload)`; vincular confere
  que o vendedor pode escrever no card (`CardService._check_write_permission`); duplicado pendente →
  devolve o existente; avisa admins e gerentes ativos (`cnpj_liberacao_pedido`, `referencia=f"liberacao:{id}"`).
- `liberar`: só gestão; só `pendente` (409); solicitante inativo → 422; texto
  `CNPJ liberado por {gestor} a pedido de {vendedor}: {motivo}. {nota} (estava {blocked_with})`;
  criar → `CardService(db).create_card(CardCreate(**payload), solicitante, at_top=True, liberacao_cnpj=texto)`
  e guarda `card_id`; vincular → `update_card(card_id, CardUpdate(client_id=...), solicitante, liberacao_cnpj=texto)`.
  Falha (HTTPException) → `db.rollback()` e relança, pedido segue pendente. Marca liberado, avisa
  o vendedor (`cnpj_liberacao_decisao`, link `/cards/{card_id}`).
- `recusar`: só gestão; nota obrigatória; só pendente; avisa o vendedor.
- `cancelar`: só quem pediu; só pendente.

Testes (`test_liberacoes_cnpj.py`, fixture `db`, cenário: dono com card protegido do CNPJ A;
outro vendedor pede):
1. pedir grava pendente, `blocked_with` com o nome do dono, avisa admin e gerente;
2. pedir de novo devolve o mesmo pedido;
3. CNPJ livre → 422; admin pedindo → 403; motivo vazio → 422;
4. liberar criar → card do vendedor (`assigned_to_id`), atividade `parcerias_cnpj` com o texto,
   status liberado, `card_id` preenchido, aviso ao vendedor;
5. liberar vincular → card do vendedor com `client_id` novo e atividade registrada;
6. liberar com lista apagada → HTTPException, pedido continua pendente;
7. liberar duas vezes → 409;
8. recusar sem nota → 422; com nota → recusado + aviso;
9. cancelar por outra pessoa → 403; pelo dono → cancelado;
10. listar: vendedor vê só os dele; gestão vê todos; `contar_pendentes`.

### Tarefa 4: Avisos

Em `tipos.py`, dois `TipoDeAviso` obrigatórios e visíveis:
`cnpj_liberacao_pedido` ("Pedido de liberação de CNPJ", ícone `shield-question`, `warning`) e
`cnpj_liberacao_decisao` ("Decisão do pedido de CNPJ", ícone `shield-check`, `info`).

### Tarefa 5: Endpoints e schemas

Router em `/api/v1/parcerias/liberacoes-cnpj` com dependência `require_role("admin", "manager",
"salesperson", "sdr")`. Saída `LiberacaoCnpjResponse` com nomes prontos (solicitante, decisor,
empresa, título do card do payload). Teste de endpoint com `client`: vendedor pede (201),
vendedor tenta liberar (403), gerente libera (200).

### Tarefa 6: Front — serviço e hook

- `liberacoesCnpjService.ts`: `pedir`, `listar`, `contarPendentes`, `liberar`, `recusar`, `cancelar`.
- `useLiberacaoCnpj`: `comLiberacao(pedido, pedirLiberacao?: (motivo: string) => Promise<unknown>)`.
  Sem permissão e com `pedirLiberacao` → abre a janela no modo pedido (título "CNPJ com outro
  responsável", campo "Por que você precisa deste CNPJ?", botão "Pedir liberação"); ao enviar,
  `showSuccess("Pedido enviado. Você recebe um aviso quando o gerente decidir.")` e devolve `null`.
- KanbanBoard (só criação) e ClientSection (os dois vincular) passam `pedirLiberacao`.

### Tarefa 7: Front — aba Liberações e contador

- `LiberacoesCnpj.tsx`: filtro de situação (Pendentes padrão, Liberados, Recusados, Cancelados,
  Todos); tabela no padrão da tabela de Histórico de consultas; ações Liberar / Recusar (modal com
  observação; obrigatória na recusa) para a gestão e Cancelar para o vendedor; link para o card.
- `ConsultaCnpj.tsx`: abas Consulta / Liberações (mesmo visual das abas de Configurações), aba lida
  de `?aba=`.
- `MainLayout.tsx`: para admin/gerente, busca `contarPendentes` ao mudar de rota e mostra o número
  em "Consulta de CNPJ".

### Tarefa 8: Verificação, versão e docs

- [ ] Testes novos + `test_trava_cnpj_vendedores.py` + `test_parcerias_vendas_cnpj.py`.
- [ ] Suíte completa (`tests --ignore=tests/e2e`).
- [ ] `npx tsc --noEmit -p .` e `npm run build`.
- [ ] Versão 1.11.32 nos 3 lugares; seção no `docs/programa-de-parceiros.md`.
- [ ] Perguntar ao usuário antes de commitar (feat + chore(release) separados).
