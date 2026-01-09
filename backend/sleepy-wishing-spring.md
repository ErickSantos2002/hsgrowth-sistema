# Plano: Remover Multi-Tenancy do Backend HSGrowth

## Objetivo

Transformar o backend HSGrowth de arquitetura **multi-tenant** (SaaS-like) para **single-tenant** (sistema interno único da empresa HSGrowth), mantendo controle de acesso apenas por **Roles** (Admin, Gestor, Vendedor).

## Contexto

**Sistema Atual:**
- Tabela `accounts` que representa diferentes empresas
- 7 models com `account_id`: User, Board, Client, Automation, GamificationBadge, GamificationRanking, AuditLog
- Endpoints com padrão `/api/v1/accounts/{account_id}/boards`
- Isolamento de dados por `account_id`

**Sistema Desejado:**
- Remover completamente tabela `accounts` e coluna `account_id`
- Controle de acesso apenas via Roles (admin, manager, salesperson)
- Endpoints simplificados: `/api/v1/boards`
- Sistema único sem isolamento de dados

**Decisões do Usuário:**
- ✅ Limpar banco e rodar seed novo simplificado
- ✅ Remover tabela accounts completamente
- ✅ Manter apenas Users + Roles para controle de acesso
- ⏸️ API de inbound/integração fica para fase futura

## Escopo de Mudanças

### Impacto Total: 47+ arquivos

**Database:**
- 1 migration para dropar tabela accounts + 7 colunas account_id
- 1 constraint unique para recriar sem account_id

**Models (8 arquivos):**
- Deletar: `app/models/account.py`
- Modificar: User, Board, Client, Automation, GamificationBadge, GamificationRanking, AuditLog
- Atualizar: `app/models/__init__.py`

**Repositories (5 arquivos):**
- `board_repository.py`, `user_repository.py`, `automation_repository.py`, `gamification_repository.py`, `transfer_repository.py`

**Services (8 arquivos):**
- `board_service.py`, `user_service.py`, `list_service.py`, `card_service.py`, `automation_service.py`, `gamification_service.py`, `transfer_service.py`, `report_service.py`

**API Endpoints (9 arquivos):**
- `boards.py`, `users.py`, `cards.py`, `gamification.py`, `automations.py`, `transfers.py`, `reports.py`, `notifications.py`, `admin.py`

**Schemas (5 arquivos):**
- `board.py`, `user.py`, `automation.py`, `gamification.py`, `auth.py`

**Dependencies (1 arquivo):**
- `app/api/deps.py` - remover `require_account_access()`

**Seeds (2 arquivos):**
- `scripts/seed_database.py`, `seed_remote.py`

**Tests (4+ arquivos):**
- `test_auth.py`, `test_users.py`, `test_cards.py`, `test_gamification.py`

## Ordem de Execução (CRÍTICO)

### ETAPA 1: Preparação
```bash
# Criar branch
git checkout -b feature/remove-multi-tenant
git push -u origin feature/remove-multi-tenant

# Backup do banco
docker exec hsgrowth-api-local bash -c "PGPASSWORD=administrador pg_dump -h 62.72.11.28 -p 3388 -U administrador -d hsgrowth" > backup_pre_migration_$(date +%Y%m%d_%H%M%S).sql
```

### ETAPA 2: Modificar Models

**2.1 Deletar Account Model**
```bash
rm C:\Users\TI\Documents\GitHub\hsgrowth-sistema\backend\app\models\account.py
```

**2.2 Modificar 7 Models para remover account_id:**

1. **`app/models/user.py` (linha 21 e 51)**
   ```python
   # REMOVER:
   account_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True)
   account = relationship("Account", back_populates="users")
   ```

2. **`app/models/board.py`**
   - Remover `account_id` e relationship

3. **`app/models/client.py`**
   - Remover `account_id` e relationship

4. **`app/models/automation.py`**
   - Remover `account_id` e relationship

5. **`app/models/gamification_badge.py`**
   - Remover `account_id` e relationship

6. **`app/models/gamification_ranking.py`**
   - Remover `account_id`
   - Modificar `__table_args__` para remover account_id do UniqueConstraint:
   ```python
   __table_args__ = (
       UniqueConstraint('user_id', 'period_type', 'period_start', name='unique_user_ranking_period'),
   )
   ```

7. **`app/models/audit_log.py`**
   - Remover `account_id` e relationship

8. **`app/models/__init__.py`**
   - Remover `from app.models.account import Account`

### ETAPA 3: Modificar Repositories

**3.1 BoardRepository (`app/repositories/board_repository.py`)**
```python
# REMOVER métodos:
def list_by_account(...)
def count_by_account(...)

# ADICIONAR métodos:
def list_all(self, skip: int = 0, limit: int = 100, is_archived: Optional[bool] = None) -> List[Board]:
    query = self.db.query(Board)
    if is_archived is not None:
        query = query.filter(Board.is_archived == is_archived)
    return query.offset(skip).limit(limit).all()

def count_all(self, is_archived: Optional[bool] = None) -> int:
    query = self.db.query(Board)
    if is_archived is not None:
        query = query.filter(Board.is_archived == is_archived)
    return query.count()

# MODIFICAR create():
def create(self, board_data: BoardCreate) -> Board:
    board = Board(
        name=board_data.name,
        description=board_data.description,
        # REMOVER: account_id=board_data.account_id,
    )
    # ...
```

**3.2 UserRepository** - Mudanças similares (list_all, count_all)

**3.3 AutomationRepository** - Remover filtros por account_id

**3.4 GamificationRepository** - Remover filtros por account_id

**3.5 TransferRepository** - Remover filtros por account_id se existirem

### ETAPA 4: Modificar Services

**4.1 BoardService (`app/services/board_service.py`)**
```python
# MODIFICAR métodos:
def get_board_by_id(self, board_id: int) -> Board:  # Remover param account_id
    board = self.board_repository.find_by_id(board_id)
    if not board:
        raise HTTPException(status_code=404)
    # REMOVER validação de account
    return board

def list_boards(self, page: int = 1, page_size: int = 50, is_archived: Optional[bool] = None):
    # Remover param account_id
    skip = (page - 1) * page_size
    boards = self.board_repository.list_all(skip=skip, limit=page_size, is_archived=is_archived)
    total = self.board_repository.count_all(is_archived=is_archived)
    # ...

def create_board(self, board_data: BoardCreate) -> Board:
    # Remover validação de account
    return self.board_repository.create(board_data)
```

**4.2 UserService** - Mudanças similares em todos os métodos

**4.3 CardService** - Remover validações de account em `_verify_card_access()`

**4.4 ListService** - Remover parâmetro account_id

**4.5 AutomationService, GamificationService, TransferService, ReportService** - Remover validações e filtros de account_id

### ETAPA 5: Modificar Schemas

**5.1 BoardCreate (`app/schemas/board.py` linha 24)**
```python
class BoardCreate(BoardBase):
    # REMOVER:
    # account_id: int = Field(..., description="ID da conta (multi-tenant)")

    # Atualizar examples para remover account_id
```

**5.2 UserCreate (`app/schemas/user.py`)**
- Remover campo `account_id`

**5.3 AutomationCreate, GamificationSchemas, AuthSchemas**
- Remover `account_id` onde existir

### ETAPA 6: Modificar Dependencies

**6.1 deps.py (`app/api/deps.py`)**
```python
# DELETAR função completa (linhas ~206-239):
def require_account_access(account_id: int):
    """..."""
    async def account_checker(...):
        if current_user.account_id != account_id:
            raise HTTPException(...)
    return account_checker
```

### ETAPA 7: Modificar Endpoints

**Padrão de mudança para TODOS os endpoints:**
```python
# ANTES:
@router.get("/accounts/{account_id}/boards")
async def list_boards(
    account_id: int = Path(...),
    current_user: User = Depends(require_account_access(account_id)),
    ...
):
    return service.list_boards(account_id=account_id, ...)

# DEPOIS:
@router.get("/boards")
async def list_boards(
    current_user: User = Depends(get_current_active_user),
    ...
):
    return service.list_boards(...)
```

**Aplicar para:**
- `app/api/v1/endpoints/boards.py`
- `app/api/v1/endpoints/users.py`
- `app/api/v1/endpoints/cards.py`
- `app/api/v1/endpoints/gamification.py`
- `app/api/v1/endpoints/automations.py`
- `app/api/v1/endpoints/transfers.py`
- `app/api/v1/endpoints/reports.py`
- `app/api/v1/endpoints/notifications.py`
- `app/api/v1/endpoints/admin.py`

### ETAPA 8: Criar Migration

**8.1 Criar arquivo de migration:**
```bash
cd backend
alembic revision -m "remove_multi_tenant"
```

**8.2 Editar arquivo gerado (`alembic/versions/XXXX_remove_multi_tenant.py`):**
```python
def upgrade():
    # 1. Dropar foreign keys
    op.drop_constraint('users_account_id_fkey', 'users', type_='foreignkey')
    op.drop_constraint('boards_account_id_fkey', 'boards', type_='foreignkey')
    op.drop_constraint('clients_account_id_fkey', 'clients', type_='foreignkey')
    op.drop_constraint('automations_account_id_fkey', 'automations', type_='foreignkey')
    op.drop_constraint('gamification_badges_account_id_fkey', 'gamification_badges', type_='foreignkey')
    op.drop_constraint('gamification_rankings_account_id_fkey', 'gamification_rankings', type_='foreignkey')
    op.drop_constraint('audit_logs_account_id_fkey', 'audit_logs', type_='foreignkey')

    # 2. Dropar índices
    op.drop_index('ix_users_account_id', table_name='users')
    op.drop_index('ix_boards_account_id', table_name='boards')
    op.drop_index('ix_clients_account_id', table_name='clients')
    op.drop_index('ix_automations_account_id', table_name='automations')
    op.drop_index('ix_gamification_badges_account_id', table_name='gamification_badges')
    op.drop_index('ix_gamification_rankings_account_id', table_name='gamification_rankings')
    op.drop_index('ix_audit_logs_account_id', table_name='audit_logs')

    # 3. Dropar colunas
    op.drop_column('users', 'account_id')
    op.drop_column('boards', 'account_id')
    op.drop_column('clients', 'account_id')
    op.drop_column('automations', 'account_id')
    op.drop_column('gamification_badges', 'account_id')
    op.drop_column('gamification_rankings', 'account_id')
    op.drop_column('audit_logs', 'account_id')

    # 4. Recriar unique constraint sem account_id
    op.drop_constraint('unique_user_ranking_period', 'gamification_rankings', type_='unique')
    op.create_unique_constraint(
        'unique_user_ranking_period',
        'gamification_rankings',
        ['user_id', 'period_type', 'period_start']
    )

    # 5. Dropar tabela accounts
    op.drop_table('accounts')

def downgrade():
    # Implementar rollback se necessário
    pass
```

**IMPORTANTE: NÃO RODAR MIGRATION AINDA!**

### ETAPA 9: Modificar Seeds

**9.1 seed_database.py (`scripts/seed_database.py`)**
```python
# DELETAR função:
def create_accounts(db: Session, count=3) -> list[Account]:
    # Deletar tudo

# MODIFICAR create_users():
def create_users(db: Session, roles: dict) -> dict:  # Remover param accounts
    users_data = [
        {
            "email": "admin@hsgrowth.com",
            "name": "Administrador HSGrowth",
            "password": "admin123",
            "role_id": roles["admin"].id,
            # REMOVER: "account_id": accounts[0].id,
        },
        # ... outros usuários sem account_id
    ]
    # ...

# MODIFICAR create_boards():
def create_boards(db: Session) -> list[Board]:
    boards_data = [
        {
            "name": "Funil de Vendas",
            # REMOVER: "account_id": 1,
        },
    ]
    # ...

# MODIFICAR create_clients():
def create_clients(db: Session) -> list[Client]:
    for i in range(20):
        client = Client(
            name=fake.name(),
            # REMOVER: account_id=1,
        )
    # ...

# MODIFICAR main():
def main():
    roles = create_roles(db)
    # REMOVER: accounts = create_accounts(db)
    users = create_users(db, roles)  # Sem accounts
    boards = create_boards(db)  # Sem account_id
    # ...
```

**9.2 seed_remote.py** - Mudanças idênticas

### ETAPA 10: Modificar Testes

**10.1 test_auth.py, test_users.py, test_cards.py, test_gamification.py**
- Remover criação de account nos fixtures
- Atualizar payloads para não incluir account_id
- Atualizar paths de endpoints

### ETAPA 11: Validação Pré-Deploy

```bash
# 1. Verificar que código compila
python -m py_compile app/main.py

# 2. Verificar imports
python -c "from app.models import *"
python -c "from app.repositories import *"
python -c "from app.services import *"

# 3. Linter
cd backend
black app/
flake8 app/
```

## Deploy e Migration (Dia D)

### Preparação Final
```bash
# 1. Backup final
docker exec hsgrowth-api-local bash -c "PGPASSWORD=administrador pg_dump -h 62.72.11.28 -p 3388 -U administrador -d hsgrowth" > backup_final_$(date +%Y%m%d_%H%M%S).sql

# 2. Parar API
docker-compose -f docker-compose.local.yml down
```

### Limpar Banco e Rodar Migration
```bash
# 3. Conectar ao banco e dropar dados
docker exec hsgrowth-api-local bash -c "PGPASSWORD=administrador psql -h 62.72.11.28 -p 3388 -U administrador -d hsgrowth -c \"DROP SCHEMA public CASCADE; CREATE SCHEMA public;\""

# 4. Rodar migrations
docker-compose -f docker-compose.local.yml up -d
docker exec hsgrowth-api-local alembic upgrade head

# 5. Rodar seed
docker exec hsgrowth-api-local python -m app.scripts.seed

# 6. Reiniciar API
docker-compose -f docker-compose.local.yml restart api
```

### Validação Pós-Deploy
```bash
# 7. Testar endpoints
curl http://localhost:8000/api/v1/boards
curl http://localhost:8000/api/v1/users

# 8. Rodar testes
docker exec hsgrowth-api-local pytest tests/

# 9. Validar no frontend
# Abrir http://localhost:5173 e testar login + dashboard
```

## Validação Final

**Checklist de Código:**
- [ ] Nenhum import de `Account` restante
- [ ] Nenhuma referência a `account_id` no código
- [ ] Dependency `require_account_access()` removida
- [ ] Endpoints removeram `/accounts/{account_id}` dos paths

**Checklist de Database:**
- [ ] Tabela `accounts` dropada
- [ ] Coluna `account_id` removida de 7 tabelas
- [ ] Migration executada com sucesso

**Checklist de API:**
- [ ] `GET /api/v1/boards` retorna boards
- [ ] `POST /api/v1/boards` cria board sem account_id
- [ ] Login funciona
- [ ] Dashboard carrega dados
- [ ] Todos os testes passam

## Arquivos Críticos

**Top 7 arquivos mais importantes para implementação:**

1. `app/api/deps.py` - Remover `require_account_access()`
2. `app/models/user.py` - Remover account_id (FK mais referenciada)
3. `app/repositories/board_repository.py` - Template para outros repos
4. `app/services/board_service.py` - Template para outros services
5. `app/api/v1/endpoints/boards.py` - Template para outros endpoints
6. `scripts/seed_database.py` - Essencial para popular banco
7. `alembic/versions/XXXX_remove_multi_tenant.py` - **CRÍTICO** para database

## Plano de Rollback

**Se algo der errado:**
```bash
# OPÇÃO 1: Restaurar backup completo
docker exec hsgrowth-api-local bash -c "PGPASSWORD=administrador psql -h 62.72.11.28 -p 3388 -U administrador -d hsgrowth" < backup_final.sql

# Reverter código
git checkout main
docker-compose -f docker-compose.local.yml restart api
```

## Riscos e Mitigações

**RISCO ALTO:**
- **Perda de dados**: Mitigação = Backup completo antes de qualquer mudança
- **Quebra de endpoints**: Mitigação = Atualizar frontend simultaneamente

**RISCO MÉDIO:**
- **Testes quebrarem**: Mitigação = Atualizar testes junto com código
- **Foreign keys impedirem drops**: Mitigação = Migration dropa FKs primeiro

## Notas Finais

- **Isolamento**: Após mudança, NÃO haverá mais isolamento. Todos veem todos os dados.
- **Segurança**: Controle 100% baseado em Roles (validar permissões!)
- **Frontend**: Precisa ser atualizado para remover account_id das chamadas
- **API Inbound**: Fica para fase futura
- **Backwards Compatibility**: NÃO há compatibilidade retroativa

## Próximos Passos

1. ✅ Revisar este plano
2. Testar fluxo completo em ambiente local
3. Executar todas as etapas em ordem
4. Validar frontend
5. Atualizar frontend para remover account_id
6. Monitorar logs por 24-48h
