"""
Schemas Pydantic para módulo Admin.
Define os modelos de entrada/saída para endpoints administrativos.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


# ================== Logs de Auditoria ==================

class AuditLogResponse(BaseModel):
    """
    Resposta de log de auditoria.
    """
    id: int = Field(..., description="ID do log")
    user_id: Optional[int] = Field(None, description="ID do usuário que executou a ação")
    user_name: Optional[str] = Field(None, description="Nome do usuário")
    action: str = Field(..., description="Ação executada")
    entity_type: str = Field(..., description="Tipo de entidade (card, board, user, etc)")
    entity_id: Optional[int] = Field(None, description="ID da entidade afetada")
    details: Optional[Dict[str, Any]] = Field(None, description="Detalhes adicionais")
    ip_address: Optional[str] = Field(None, description="Endereço IP")
    user_agent: Optional[str] = Field(None, description="User Agent")
    created_at: datetime = Field(..., description="Data/hora da ação")

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "examples": [
                {
                    "id": 1,
                    "user_id": 2,
                    "user_name": "João Silva",
                    "action": "card.created",
                    "entity_type": "card",
                    "entity_id": 123,
                    "details": {"card_title": "Lead - Empresa XYZ"},
                    "ip_address": "192.168.1.100",
                    "user_agent": "Mozilla/5.0...",
                    "created_at": "2026-01-06T10:30:00"
                }
            ]
        }
    }


class AuditLogListResponse(BaseModel):
    """
    Lista de logs de auditoria com paginação.
    """
    items: List[AuditLogResponse] = Field(..., description="Lista de logs")
    total: int = Field(..., description="Total de logs")
    page: int = Field(..., description="Página atual")
    page_size: int = Field(..., description="Tamanho da página")
    total_pages: int = Field(..., description="Total de páginas")


# ================== Execução de Query SQL ==================

class SQLQueryRequest(BaseModel):
    """
    Requisição para executar query SQL.
    """
    query: str = Field(..., min_length=1, description="Query SQL (apenas SELECT)")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "query": "SELECT id, name, email FROM users WHERE is_active = true LIMIT 10"
                }
            ]
        }
    }


class SQLQueryResponse(BaseModel):
    """
    Resposta de execução de query SQL.
    """
    columns: List[str] = Field(..., description="Nomes das colunas")
    rows: List[List[Any]] = Field(..., description="Linhas de dados")
    row_count: int = Field(..., description="Quantidade de linhas retornadas")
    execution_time_ms: float = Field(..., description="Tempo de execução (ms)")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "columns": ["id", "name", "email"],
                    "rows": [
                        [1, "Admin", "admin@hsgrowth.com"],
                        [2, "João", "joao@hsgrowth.com"]
                    ],
                    "row_count": 2,
                    "execution_time_ms": 15.3
                }
            ]
        }
    }


# ================== Monitoramento de Automações ==================

class AutomationMonitorItem(BaseModel):
    """
    Item de monitoramento de automação.
    """
    automation_id: int = Field(..., description="ID da automação")
    automation_name: str = Field(..., description="Nome da automação")
    is_active: bool = Field(..., description="Se está ativa")
    total_executions: int = Field(..., description="Total de execuções")
    successful_executions: int = Field(..., description="Execuções bem-sucedidas")
    failed_executions: int = Field(..., description="Execuções falhadas")
    last_execution_at: Optional[datetime] = Field(None, description="Última execução")
    last_execution_status: Optional[str] = Field(None, description="Status da última execução")
    average_execution_time_ms: Optional[float] = Field(None, description="Tempo médio de execução (ms)")


class AutomationMonitorResponse(BaseModel):
    """
    Resposta de monitoramento de automações.
    """
    total_automations: int = Field(..., description="Total de automações")
    active_automations: int = Field(..., description="Automações ativas")
    inactive_automations: int = Field(..., description="Automações inativas")
    total_executions_today: int = Field(..., description="Total de execuções hoje")
    failed_executions_today: int = Field(..., description="Execuções falhadas hoje")
    automations: List[AutomationMonitorItem] = Field(..., description="Lista de automações")


# ================== Estatísticas do Sistema ==================

class SystemStatsResponse(BaseModel):
    """
    Estatísticas gerais do sistema.
    """
    total_accounts: int = Field(..., description="Total de contas")
    total_users: int = Field(..., description="Total de usuários")
    active_users: int = Field(..., description="Usuários ativos")
    total_boards: int = Field(..., description="Total de boards")
    total_cards: int = Field(..., description="Total de cards")
    total_automations: int = Field(..., description="Total de automações")
    total_transfers: int = Field(..., description="Total de transferências")
    total_notifications: int = Field(..., description="Total de notificações")
    database_size_mb: Optional[float] = Field(None, description="Tamanho do banco (MB)")


# ================== Reset de Senha (Admin) ==================

class AdminPasswordResetRequest(BaseModel):
    """
    Requisição para admin resetar senha de usuário.
    """
    new_password: str = Field(..., min_length=8, description="Nova senha")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "new_password": "NovaSenhaSegura123!"
                }
            ]
        }
    }


class AdminPasswordResetResponse(BaseModel):
    """
    Resposta de reset de senha.
    """
    message: str = Field(..., description="Mensagem de sucesso")
    user_id: int = Field(..., description="ID do usuário")
    temporary_password: Optional[str] = Field(None, description="Senha temporária gerada (se aplicável)")
