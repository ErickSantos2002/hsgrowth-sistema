"""
Schemas Pydantic para o módulo de Relatórios Customizados.
Cobre o catálogo de campos, requests de query e CRUD de relatórios.
"""
from typing import List, Optional, Literal
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict

from app.schemas.report import PeriodEnum


# ========================
# SCHEMAS DE CAMPO E EIXOS
# ========================

class AxisFieldSchema(BaseModel):
    """Representa um campo selecionado para o eixo X ou Y do gráfico."""
    key: str
    label: str
    source: Literal['cards', 'clients', 'persons', 'activities', 'tasks']
    field_type: Literal['date', 'currency', 'category', 'user', 'number']
    groupable: bool
    aggregatable: bool


class YFieldConfigSchema(BaseModel):
    """Configuração de um campo no eixo Y: o campo e sua função de agregação."""
    field: AxisFieldSchema
    aggregation: Literal['count', 'sum', 'avg', 'distinct_count']


# ========================
# SCHEMAS DE REQUEST
# ========================

class QueryRequest(BaseModel):
    """
    Requisição de execução de query para um gráfico.
    O backend processa os campos X/Y e retorna os dados agregados.

    Quando split_by está definido, o resultado retorna múltiplas séries —
    uma por valor único do campo split_by (ex: uma série por vendedor).
    Nesse modo apenas o primeiro y_field é usado.
    """
    x_field: AxisFieldSchema
    x_group_by: Optional[Literal['day', 'week', 'month', 'year']] = None
    y_fields: List[YFieldConfigSchema]
    period: PeriodEnum
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    split_by: Optional[AxisFieldSchema] = None


class CustomReportCreate(BaseModel):
    """Payload para criar ou atualizar um relatório customizado."""
    name: str
    config: dict  # CustomReportConfig serializado do frontend


# ========================
# SCHEMAS DE RESPONSE
# ========================

class SeriesDataSchema(BaseModel):
    """Dados de uma série individual (multi-série bar/line)."""
    name: str
    values: List[float]


class QueryResponse(BaseModel):
    """
    Resposta de uma query de dados do gráfico.
    Single-série: labels + values + total.
    Multi-série: labels + series.
    """
    labels: List[str]
    values: Optional[List[float]] = None
    series: Optional[List[SeriesDataSchema]] = None
    total: Optional[float] = None


class CustomReportResponse(BaseModel):
    """Relatório customizado retornado na listagem e no GET por ID."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    created_by_name: str
    updated_at: datetime
    charts_count: int
    config: dict


class FieldDefinitionSchema(BaseModel):
    """Definição de um campo disponível no catálogo."""
    key: str
    label: str
    field_type: str
    groupable: bool
    aggregatable: bool


class FieldCatalogResponse(BaseModel):
    """Catálogo de campos disponíveis por fonte de dados."""
    cards: List[FieldDefinitionSchema]
    clients: List[FieldDefinitionSchema]
    persons: List[FieldDefinitionSchema]
    activities: List[FieldDefinitionSchema]
    tasks: List[FieldDefinitionSchema]


# ========================
# DRILL-DOWN (detalhamento de barra)
# ========================

class DrillDownRequest(BaseModel):
    """
    Requisição para obter os cards que compõem uma barra/fatia do gráfico.
    Recebe a config do eixo X + o label clicado para montar o filtro equivalente.
    Quando split_by está ativo, split_label identifica a série clicada.

    y_source + y_key identificam a métrica principal do gráfico para que o
    drill-down aplique o mesmo filtro implícito que a agregação usa.
    Exemplo: won_count → filtra apenas cards com is_won=1.
    """
    x_field: AxisFieldSchema
    x_group_by: Optional[Literal['day', 'week', 'month', 'year']] = None
    period: PeriodEnum
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    x_label: str
    split_by: Optional[AxisFieldSchema] = None
    split_label: Optional[str] = None
    # Métrica Y principal — usada para replicar o filtro implícito do gráfico
    y_source: Optional[str] = None
    y_key: Optional[str] = None


class DrillDownCard(BaseModel):
    """Resumo de um card retornado pelo drill-down."""
    id: int
    title: str
    list_name: str
    board_name: str
    assigned_to_name: Optional[str] = None
    value: Optional[float] = None
    created_at: datetime
    status: str  # "Aberto", "Ganho" ou "Perdido"


class DrillDownResponse(BaseModel):
    """Resposta do drill-down com a lista de cards e o total."""
    cards: List[DrillDownCard]
    total: int
