# TODO - Integração API4COM (VOIP)

**Data de Criação:** 02/02/2026
**Status:** 📋 Planejamento
**Prioridade:** Alta

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Fase 1 - Configuração (Admin/Gerente)](#fase-1---configuração-admingerente)
3. [Fase 2 - Funcionalidade de Ligação (Vendedor)](#fase-2---funcionalidade-de-ligação-vendedor)
4. [Ordem de Implementação](#ordem-de-implementação)

---

## 🎯 Visão Geral

### Objetivo
Integrar o CRM com API4COM para permitir que vendedores façam ligações diretamente do sistema.

### Fluxo Completo
1. **Admin/Gerente:** Configura credenciais da API4COM
2. **Admin/Gerente:** Vincula cada vendedor ao seu ramal
3. **Vendedor:** Cria atividade de ligação no card
4. **Vendedor:** Clica em botão "Ligar" e a chamada é iniciada automaticamente

### Requisitos Técnicos
- API4COM endpoint: `https://api.api4com.com/api/v1`
- Autenticação: Login + Senha → Token (header Authorization)
- Chamada: POST `/dialer` com `extension` e `phone`

---

## 🔧 FASE 1 - Configuração (Admin/Gerente)

### Backend

#### 1. Banco de Dados

##### 1.1. Tabela: `api4com_config`
```sql
CREATE TABLE api4com_config (
    id SERIAL PRIMARY KEY,

    -- Credenciais
    email VARCHAR(255) NOT NULL,
    password_encrypted TEXT NOT NULL, -- Senha criptografada

    -- Token
    api_token TEXT,
    token_expires_at TIMESTAMP,

    -- Status
    is_active BOOLEAN DEFAULT false,
    last_sync_at TIMESTAMP,
    last_test_at TIMESTAMP,
    last_test_success BOOLEAN,
    last_test_error TEXT,

    -- Auditoria
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by_id INTEGER REFERENCES users(id),
    updated_by_id INTEGER REFERENCES users(id)
);
```

**Tarefa:** ✅ [ ] Criar migration para tabela `api4com_config`

##### 1.2. Tabela: `user_extensions`
```sql
CREATE TABLE user_extensions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    extension VARCHAR(50) NOT NULL, -- Ramal do vendedor (ex: "1000")

    -- Configurações adicionais
    is_active BOOLEAN DEFAULT true,

    -- Auditoria
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(user_id),
    UNIQUE(extension)
);
```

**Tarefa:** ✅ [ ] Criar migration para tabela `user_extensions`

**Tarefa:** ✅ [ ] Executar migrations no banco

---

#### 2. Schemas (Pydantic)

**Arquivo:** `backend/app/schemas/api4com.py`

```python
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

# ========== Config Schemas ==========
class API4ComConfigCreate(BaseModel):
    """Schema para criar configuração da API4COM."""
    email: EmailStr
    password: str = Field(..., min_length=6)

class API4ComConfigUpdate(BaseModel):
    """Schema para atualizar configuração."""
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=6)
    is_active: Optional[bool] = None

class API4ComConfigResponse(BaseModel):
    """Schema de resposta da configuração."""
    id: int
    email: str
    is_active: bool
    has_valid_token: bool
    token_expires_at: Optional[datetime]
    last_test_at: Optional[datetime]
    last_test_success: Optional[bool]
    last_test_error: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ========== Extension Schemas ==========
class UserExtensionCreate(BaseModel):
    """Schema para criar ramal de usuário."""
    user_id: int
    extension: str = Field(..., min_length=1, max_length=50)

class UserExtensionUpdate(BaseModel):
    """Schema para atualizar ramal."""
    extension: Optional[str] = Field(None, min_length=1, max_length=50)
    is_active: Optional[bool] = None

class UserExtensionResponse(BaseModel):
    """Schema de resposta de ramal."""
    id: int
    user_id: int
    extension: str
    is_active: bool
    created_at: datetime

    # Dados do usuário
    user_name: Optional[str] = None
    user_email: Optional[str] = None

    class Config:
        from_attributes = True

# ========== Test Connection ==========
class API4ComTestResponse(BaseModel):
    """Schema de resposta de teste de conexão."""
    success: bool
    message: str
    token_valid: bool
    error: Optional[str] = None
```

**Tarefa:** ✅ [ ] Criar arquivo `schemas/api4com.py` com todos os schemas

---

#### 3. Models (SQLAlchemy)

**Arquivo:** `backend/app/models/api4com.py`

```python
from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base

class API4ComConfig(Base):
    """Model para configuração da API4COM."""
    __tablename__ = "api4com_config"

    id = Column(Integer, primary_key=True, index=True)

    # Credenciais
    email = Column(String(255), nullable=False)
    password_encrypted = Column(Text, nullable=False)

    # Token
    api_token = Column(Text, nullable=True)
    token_expires_at = Column(DateTime, nullable=True)

    # Status
    is_active = Column(Boolean, default=False)
    last_sync_at = Column(DateTime, nullable=True)
    last_test_at = Column(DateTime, nullable=True)
    last_test_success = Column(Boolean, nullable=True)
    last_test_error = Column(Text, nullable=True)

    # Auditoria
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)


class UserExtension(Base):
    """Model para ramais de usuários."""
    __tablename__ = "user_extensions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    extension = Column(String(50), nullable=False, unique=True)

    # Configurações
    is_active = Column(Boolean, default=True)

    # Auditoria
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", backref="extension")
```

**Tarefa:** ✅ [ ] Criar arquivo `models/api4com.py` com os models

---

#### 4. Repository

**Arquivo:** `backend/app/repositories/api4com_repository.py`

```python
from sqlalchemy.orm import Session
from typing import Optional, List
from app.models.api4com import API4ComConfig, UserExtension
from app.schemas.api4com import (
    API4ComConfigCreate, API4ComConfigUpdate,
    UserExtensionCreate, UserExtensionUpdate
)

class API4ComRepository:
    """Repository para API4COM."""

    def __init__(self, db: Session):
        self.db = db

    # ========== Config Methods ==========
    def get_config(self) -> Optional[API4ComConfig]:
        """Retorna a configuração ativa (deve ter apenas uma)."""
        return self.db.query(API4ComConfig).first()

    def create_config(self, config_data: API4ComConfigCreate, user_id: int) -> API4ComConfig:
        """Cria configuração."""
        # TODO: Criptografar senha antes de salvar
        pass

    def update_config(self, config: API4ComConfig, config_data: API4ComConfigUpdate) -> API4ComConfig:
        """Atualiza configuração."""
        # TODO: Implementar update
        pass

    def update_token(self, config: API4ComConfig, token: str, expires_at: datetime) -> API4ComConfig:
        """Atualiza token da configuração."""
        # TODO: Implementar
        pass

    # ========== Extension Methods ==========
    def list_extensions(self) -> List[UserExtension]:
        """Lista todos os ramais."""
        return self.db.query(UserExtension).all()

    def get_extension_by_user(self, user_id: int) -> Optional[UserExtension]:
        """Busca ramal por user_id."""
        return self.db.query(UserExtension).filter(UserExtension.user_id == user_id).first()

    def create_extension(self, extension_data: UserExtensionCreate) -> UserExtension:
        """Cria ramal para usuário."""
        # TODO: Implementar
        pass

    def update_extension(self, extension: UserExtension, extension_data: UserExtensionUpdate) -> UserExtension:
        """Atualiza ramal."""
        # TODO: Implementar
        pass

    def delete_extension(self, extension: UserExtension) -> None:
        """Remove ramal."""
        self.db.delete(extension)
        self.db.commit()
```

**Tarefa:** ✅ [ ] Criar arquivo `repositories/api4com_repository.py`
**Tarefa:** ✅ [ ] Implementar todos os métodos do repository

---

#### 5. Service - Integração Externa

**Arquivo:** `backend/app/services/api4com_client.py`

```python
import httpx
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

class API4ComClient:
    """Cliente para comunicação com a API externa da API4COM."""

    BASE_URL = "https://api.api4com.com/api/v1"

    def __init__(self, token: Optional[str] = None):
        self.token = token

    async def login(self, email: str, password: str) -> Dict[str, Any]:
        """
        Faz login e retorna o token.

        Returns:
            {
                "id": "token_aqui",
                "ttl": "1209600",
                "created": "2025-01-01T00:00:00.000Z"
            }
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.BASE_URL}/users/login",
                json={"email": email, "password": password}
            )
            response.raise_for_status()
            return response.json()

    async def test_connection(self) -> bool:
        """Testa se o token está válido."""
        if not self.token:
            return False

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/users/me",
                    headers={"Authorization": self.token}
                )
                return response.status_code == 200
        except:
            return False

    async def make_call(self, extension: str, phone: str, metadata: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Realiza uma chamada telefônica.

        Args:
            extension: Ramal do usuário
            phone: Número do destinatário
            metadata: Dados extras (opcional)

        Returns:
            {
                "id": "call_id",
                "message": "successfull"
            }
        """
        if not self.token:
            raise ValueError("Token não configurado")

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.BASE_URL}/dialer",
                headers={"Authorization": self.token},
                json={
                    "extension": extension,
                    "phone": phone,
                    "metadata": metadata or {}
                }
            )
            response.raise_for_status()
            return response.json()
```

**Tarefa:** ✅ [ ] Criar arquivo `services/api4com_client.py`

---

#### 6. Service - Lógica de Negócio

**Arquivo:** `backend/app/services/api4com_service.py`

```python
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List
from datetime import datetime, timedelta

from app.repositories.api4com_repository import API4ComRepository
from app.services.api4com_client import API4ComClient
from app.schemas.api4com import *
from app.models.user import User

class API4ComService:
    """Service para lógica de negócio da API4COM."""

    def __init__(self, db: Session):
        self.db = db
        self.repository = API4ComRepository(db)

    # ========== Config ==========
    async def get_config(self) -> API4ComConfigResponse:
        """Retorna configuração atual."""
        # TODO: Implementar
        pass

    async def save_config(self, config_data: API4ComConfigCreate, current_user: User) -> API4ComConfigResponse:
        """Salva/atualiza configuração e gera token."""
        # TODO: Implementar
        # 1. Criar/atualizar config no banco
        # 2. Fazer login na API4COM para obter token
        # 3. Salvar token no banco
        pass

    async def test_connection(self) -> API4ComTestResponse:
        """Testa conexão com API4COM."""
        # TODO: Implementar
        pass

    async def refresh_token(self) -> None:
        """Renova o token se estiver próximo de expirar."""
        # TODO: Implementar
        pass

    # ========== Extensions ==========
    def list_extensions(self) -> List[UserExtensionResponse]:
        """Lista todos os ramais."""
        # TODO: Implementar
        pass

    def save_extension(self, extension_data: UserExtensionCreate, current_user: User) -> UserExtensionResponse:
        """Cria/atualiza ramal de um vendedor."""
        # TODO: Implementar
        pass

    def delete_extension(self, user_id: int, current_user: User) -> None:
        """Remove ramal de um vendedor."""
        # TODO: Implementar
        pass

    # ========== Call (Fase 2) ==========
    async def make_call(self, user_id: int, phone: str, card_id: Optional[int] = None) -> Dict:
        """Realiza uma chamada (será implementado na Fase 2)."""
        # TODO: Implementar na Fase 2
        pass
```

**Tarefa:** ✅ [ ] Criar arquivo `services/api4com_service.py`
**Tarefa:** ✅ [ ] Implementar métodos da Fase 1

---

#### 7. Endpoints (API)

**Arquivo:** `backend/app/api/v1/endpoints/api4com.py`

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.api.deps import get_db, get_current_active_user
from app.models.user import User
from app.services.api4com_service import API4ComService
from app.schemas.api4com import *

router = APIRouter()

# ========== Config Endpoints ==========
@router.get("/config", response_model=API4ComConfigResponse)
async def get_api4com_config(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Retorna configuração da API4COM (apenas admin/gerente)."""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Sem permissão")

    service = API4ComService(db)
    return await service.get_config()

@router.post("/config", response_model=API4ComConfigResponse)
async def save_api4com_config(
    config_data: API4ComConfigCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Salva/atualiza configuração da API4COM (apenas admin)."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Apenas admin pode configurar")

    service = API4ComService(db)
    return await service.save_config(config_data, current_user)

@router.post("/test", response_model=API4ComTestResponse)
async def test_api4com_connection(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Testa conexão com API4COM."""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Sem permissão")

    service = API4ComService(db)
    return await service.test_connection()

# ========== Extension Endpoints ==========
@router.get("/extensions", response_model=List[UserExtensionResponse])
def list_extensions(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Lista todos os ramais (admin/gerente)."""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Sem permissão")

    service = API4ComService(db)
    return service.list_extensions()

@router.post("/extensions", response_model=UserExtensionResponse)
def save_extension(
    extension_data: UserExtensionCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Cria/atualiza ramal de vendedor (admin/gerente)."""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Sem permissão")

    service = API4ComService(db)
    return service.save_extension(extension_data, current_user)

@router.delete("/extensions/{user_id}")
def delete_extension(
    user_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Remove ramal de vendedor (admin/gerente)."""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Sem permissão")

    service = API4ComService(db)
    service.delete_extension(user_id, current_user)
    return {"message": "Ramal removido com sucesso"}
```

**Tarefa:** ✅ [ ] Criar arquivo `api/v1/endpoints/api4com.py`
**Tarefa:** ✅ [ ] Registrar router no `api/v1/api.py`

---

### Frontend

#### 8. Service API

**Arquivo:** `frontend/src/services/api4comService.ts`

```typescript
import api from './api';

export interface API4ComConfig {
  id: number;
  email: string;
  is_active: boolean;
  has_valid_token: boolean;
  token_expires_at: string | null;
  last_test_at: string | null;
  last_test_success: boolean | null;
  last_test_error: string | null;
}

export interface API4ComConfigCreate {
  email: string;
  password: string;
}

export interface UserExtension {
  id: number;
  user_id: number;
  extension: string;
  is_active: boolean;
  user_name?: string;
  user_email?: string;
}

export interface UserExtensionCreate {
  user_id: number;
  extension: string;
}

const api4comService = {
  // Config
  async getConfig(): Promise<API4ComConfig> {
    const response = await api.get('/api/v1/api4com/config');
    return response.data;
  },

  async saveConfig(data: API4ComConfigCreate): Promise<API4ComConfig> {
    const response = await api.post('/api/v1/api4com/config', data);
    return response.data;
  },

  async testConnection(): Promise<{ success: boolean; message: string; error?: string }> {
    const response = await api.post('/api/v1/api4com/test');
    return response.data;
  },

  // Extensions
  async listExtensions(): Promise<UserExtension[]> {
    const response = await api.get('/api/v1/api4com/extensions');
    return response.data;
  },

  async saveExtension(data: UserExtensionCreate): Promise<UserExtension> {
    const response = await api.post('/api/v1/api4com/extensions', data);
    return response.data;
  },

  async deleteExtension(userId: number): Promise<void> {
    await api.delete(`/api/v1/api4com/extensions/${userId}`);
  },
};

export default api4comService;
```

**Tarefa:** ✅ [ ] Criar arquivo `services/api4comService.ts`

---

#### 9. Página de Configuração

**Arquivo:** `frontend/src/pages/API4ComSettings.tsx`

Criar página completa com:
- Formulário de credenciais (email, senha)
- Botão "Testar Conexão"
- Status da conexão (token válido, última sincronização, etc.)
- Tabela de vendedores com seus ramais
- Formulário para adicionar/editar ramal de cada vendedor
- Botão para remover ramal

**Tarefa:** ✅ [ ] Criar página `pages/API4ComSettings.tsx`
**Tarefa:** ✅ [ ] Adicionar rota `/settings/api4com` no router
**Tarefa:** ✅ [ ] Adicionar link no menu de configurações (apenas admin/gerente)

---

## 📞 FASE 2 - Funcionalidade de Ligação (Vendedor)

### Backend

#### 10. Endpoint de Chamada

Adicionar ao arquivo `api/v1/endpoints/api4com.py`:

```python
@router.post("/call", response_model=dict)
async def make_call(
    phone: str,
    card_id: Optional[int] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Realiza uma chamada telefônica."""
    service = API4ComService(db)
    return await service.make_call(current_user.id, phone, card_id)
```

**Tarefa:** ✅ [ ] Implementar endpoint `/call`
**Tarefa:** ✅ [ ] Implementar método `make_call()` no service

---

### Frontend

#### 11. Botão de Ligar no Card Details

**Arquivo:** `frontend/src/pages/CardDetails.tsx`

Adicionar:
- Botão "Ligar" ao lado das atividades de ligação
- Pega telefone da pessoa vinculada
- Chama API `/api4com/call`
- Mostra feedback (chamando, sucesso, erro)
- Registra tentativa no histórico

**Tarefa:** ✅ [ ] Adicionar botão "Ligar" no CardDetails
**Tarefa:** ✅ [ ] Implementar lógica de chamada
**Tarefa:** ✅ [ ] Adicionar feedback visual (loading, success, error)
**Tarefa:** ✅ [ ] Registrar tentativa de ligação no histórico

---

## 📝 Ordem de Implementação Recomendada

### Sprint 1 - Backend Básico (Fase 1)
1. ✅ [ ] Criar migrations (tabelas)
2. ✅ [ ] Executar migrations no banco
3. ✅ [ ] Criar models SQLAlchemy
4. ✅ [ ] Criar schemas Pydantic
5. ✅ [ ] Criar repository
6. ✅ [ ] Criar API4COM client
7. ✅ [ ] Criar service (métodos de config e extension)
8. ✅ [ ] Criar endpoints
9. ✅ [ ] Registrar router
10. ✅ [ ] Testar endpoints no Postman/Insomnia

### Sprint 2 - Frontend (Fase 1)
11. ✅ [ ] Criar service API
12. ✅ [ ] Criar página de configuração
13. ✅ [ ] Adicionar rota
14. ✅ [ ] Adicionar link no menu
15. ✅ [ ] Testar fluxo completo (salvar config, adicionar ramais)

### Sprint 3 - Funcionalidade de Ligação (Fase 2)
16. ✅ [ ] Implementar endpoint `/call` (backend)
17. ✅ [ ] Implementar método `make_call()` no service
18. ✅ [ ] Adicionar botão no CardDetails (frontend)
19. ✅ [ ] Testar chamada real
20. ✅ [ ] Ajustes finais e documentação

---

## 🎯 Critérios de Aceite

### Fase 1 (Config)
- [x] Admin pode configurar credenciais da API4COM
- [x] Admin pode testar conexão (botão funcional)
- [x] Admin/Gerente pode vincular vendedores aos ramais
- [x] Admin/Gerente pode editar/remover ramais
- [x] Token é renovado automaticamente quando expira

### Fase 2 (Ligação)
- [x] Vendedor vê botão "Ligar" ao lado de atividades de ligação
- [x] Ao clicar, chamada é iniciada automaticamente
- [x] Sistema busca telefone da pessoa vinculada ao card
- [x] Sistema busca ramal do vendedor
- [x] Feedback visual durante o processo
- [x] Erros são tratados e exibidos claramente

---

## 📋 Observações Técnicas

### Segurança
- Senha da API4COM deve ser criptografada no banco (usar `passlib`)
- Token deve ser armazenado de forma segura
- Apenas admin pode salvar credenciais
- Admin e gerente podem gerenciar ramais
- Vendedores só podem ligar (não veem configurações)

### Performance
- Token deve ser renovado automaticamente antes de expirar
- Cache do token em memória (evitar buscar no banco toda vez)
- Chamadas assíncronas para não travar a aplicação

### UX
- Feedback claro em todas as ações
- Loading states visíveis
- Mensagens de erro amigáveis
- Confirmação antes de remover ramal

---

**Criado por:** Erick
**Última atualização:** 02/02/2026
