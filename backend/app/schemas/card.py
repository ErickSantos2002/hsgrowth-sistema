"""
Schemas Pydantic para Cards (Cartões).
Define os modelos de entrada/saída para operações com cards.
"""
from typing import Optional, Dict, Any
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field, field_validator, EmailStr
import re


class ContactInfo(BaseModel):
    """
    Schema estruturado para informações de contato do card.
    Define campos específicos para emails, telefones e redes sociais.
    """
    # Informações básicas
    name: Optional[str] = Field(None, max_length=255, description="Nome do contato")
    position: Optional[str] = Field(None, max_length=255, description="Cargo do contato")
    client_id: Optional[int] = Field(None, description="ID da organização vinculada")
    probability: Optional[int] = Field(None, ge=0, le=100, description="Probabilidade de fechamento (%)")

    # Emails (campo legado + campos específicos)
    email: Optional[EmailStr] = Field(None, description="Email principal (legado)")
    email_commercial: Optional[EmailStr] = Field(None, description="Email comercial")
    email_personal: Optional[EmailStr] = Field(None, description="Email pessoal")
    email_alternative: Optional[EmailStr] = Field(None, description="Email alternativo")

    # Telefones (campo legado + campos específicos)
    phone: Optional[str] = Field(None, max_length=50, description="Telefone principal (legado)")
    phone_commercial: Optional[str] = Field(None, max_length=50, description="Telefone comercial")
    phone_whatsapp: Optional[str] = Field(None, max_length=50, description="Celular/WhatsApp")
    phone_alternative: Optional[str] = Field(None, max_length=50, description="Telefone alternativo")

    # Redes sociais
    linkedin: Optional[str] = Field(None, max_length=500, description="URL do perfil LinkedIn")
    instagram: Optional[str] = Field(None, max_length=500, description="URL do perfil Instagram")
    facebook: Optional[str] = Field(None, max_length=500, description="URL do perfil Facebook")

    @field_validator('email', 'email_commercial', 'email_personal', 'email_alternative', mode='before')
    @classmethod
    def validate_email(cls, v):
        """
        Limpa e valida emails antes da validação do EmailStr.
        Retorna None para qualquer email inválido ao invés de quebrar a validação.
        """
        if not v or v == '':
            return None

        try:
            # Converte para string se necessário
            v = str(v).strip()

            # Remove caracteres inválidos comuns no início/fim
            invalid_chars = '.><,;"\' '
            v = v.strip(invalid_chars)

            # Se ficou vazio após limpeza
            if not v:
                return None

            # Remove caracteres HTML/especiais
            v = v.replace('<', '').replace('>', '').replace('"', '').replace("'", '')

            # Se tiver múltiplos emails, pega apenas o primeiro
            if ',' in v or ';' in v or '  ' in v:
                for separator in [',', ';', '  ']:
                    if separator in v:
                        emails = [e.strip(invalid_chars) for e in v.split(separator)]
                        for email in emails:
                            if '@' in email and ' ' not in email and '.' in email.split('@')[1] and len(email) > 5:
                                return email
                        return None

            # Validação básica
            if '@' not in v or ' ' in v:
                return None

            # Verifica se tem ponto depois do @
            if '.' not in v.split('@')[1]:
                return None

            # Se tiver mais de um @, é inválido
            if v.count('@') > 1:
                return None

            # Validação final simples de formato
            parts = v.split('@')
            if len(parts) != 2 or len(parts[0]) < 1 or len(parts[1]) < 3:
                return None

            return v

        except Exception:
            # Se qualquer erro ocorrer, retorna None ao invés de quebrar
            return None

    @field_validator('phone', 'phone_commercial', 'phone_whatsapp', 'phone_alternative', mode='before')
    @classmethod
    def validate_phone(cls, v):
        """
        Valida formato de telefone brasileiro.
        Aceita formatos: (11) 99999-9999, 11999999999, +55 11 99999-9999, etc.
        Também aceita múltiplos telefones separados por vírgula.
        """
        if v is None or v == "":
            return v

        # Remove espaços extras
        v = v.strip()

        # Regex para validar telefones brasileiros (permite vários formatos)
        # Aceita: (11) 99999-9999, 11999999999, +55 11 99999-9999, etc.
        # Também aceita vírgula para múltiplos telefones: (11) 99999-9999, (11) 88888-8888
        phone_pattern = r'^[\+\(\)\s\-\,\d]+$'

        if not re.match(phone_pattern, v):
            raise ValueError('Formato de telefone inválido. Use apenas números, espaços, parênteses, hífen, vírgula e sinal de mais.')

        # Verifica se tem pelo menos 8 dígitos (telefone fixo mínimo)
        digits_only = re.sub(r'\D', '', v)
        if len(digits_only) < 8:
            raise ValueError('Telefone deve ter pelo menos 8 dígitos')

        return v

    @field_validator('linkedin', 'instagram', 'facebook', mode='before')
    @classmethod
    def validate_social_url(cls, v):
        """Valida URLs de redes sociais"""
        if v is None or v == "":
            return v

        v = v.strip()

        # Aceita tanto URL completa quanto apenas o username
        # URLs começam com http:// ou https://
        # Usernames começam com @ ou são apenas texto
        if v.startswith('http://') or v.startswith('https://') or v.startswith('@') or '/' not in v:
            return v

        raise ValueError('URL de rede social inválida. Use URL completa (https://...) ou username (@usuario)')

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "name": "João Silva",
                    "position": "Gerente de Compras",
                    "email_commercial": "joao.silva@empresaxyz.com",
                    "email_personal": "joao@gmail.com",
                    "phone_commercial": "(11) 3000-0000",
                    "phone_whatsapp": "(11) 99999-9999",
                    "linkedin": "https://linkedin.com/in/joaosilva",
                    "instagram": "@joaosilva"
                }
            ]
        }
    }


class PaymentInfo(BaseModel):
    """
    Schema estruturado para informações de pagamento do card.
    Define condições comerciais acordadas com o cliente.
    """
    payment_method: Optional[str] = Field(None, max_length=50, description="Forma de pagamento (Boleto, Cartão, PIX, etc)")
    installments: Optional[int] = Field(None, ge=1, le=120, description="Número de parcelas")
    notes: Optional[str] = Field(None, description="Observações sobre o pagamento")
    global_discount: Optional[float] = Field(None, ge=0, description="Desconto global aplicado sobre o total dos produtos (valor ou percentual)")
    global_discount_type: Optional[str] = Field(None, description="Tipo do desconto global: 'value' (R$) ou 'percent' (%)")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "payment_method": "Boleto",
                    "installments": 6,
                    "notes": "Primeira parcela em 30 dias, sem juros"
                }
            ]
        }
    }


class CardBase(BaseModel):
    """
    Schema base de card (campos comuns).
    """
    title: str = Field(..., min_length=1, max_length=500, description="Título do card")
    description: Optional[str] = Field(None, description="Descrição detalhada")


class CardCreate(CardBase):
    """
    Schema para criação de card.
    """
    list_id: int = Field(..., description="ID da lista onde o card será criado")
    client_id: Optional[int] = Field(None, description="ID do cliente/organização")
    person_id: Optional[int] = Field(None, description="ID da pessoa de contato vinculada")
    assigned_to_id: Optional[int] = Field(None, description="ID do usuário responsável (Vendedor)")
    sdr_id: Optional[int] = Field(None, description="ID do usuário SDR responsável")
    value: Optional[float] = Field(None, ge=0, description="Valor monetário do card")
    due_date: Optional[datetime] = Field(None, description="Data de vencimento")

    # Campos do blueprint da consultora - Tracking de entrada nos boards
    prospection_entry_date: Optional[datetime] = Field(None, description="Data de entrada no board de Prospecção")
    acquisition_entry_date: Optional[datetime] = Field(None, description="Data de entrada no board de Aquisição")
    expansion_entry_date: Optional[datetime] = Field(None, description="Data de entrada no board de Expansão")

    # Campos do blueprint da consultora - Informações de negócio
    deal_type: Optional[str] = Field(None, max_length=100, description="Tipo de negócio (Nova Venda, Cross Sell, Up Sell)")
    acquisition_channel: Optional[str] = Field(None, max_length=100, description="Canal de aquisição (Inbound, Outbound, Indicação, etc)")
    acquisition_channel_detail: Optional[str] = Field(None, max_length=200, description="Detalhamento do canal de aquisição")
    utm_params: Optional[str] = Field(None, max_length=500, description="Parâmetros UTM (tracking de marketing, campo legado)")
    loss_reason: Optional[str] = Field(None, max_length=200, description="Motivo da perda (quando card é perdido)")
    has_implementation: Optional[bool] = Field(None, description="Se tem implementação")
    has_personnel: Optional[bool] = Field(None, description="Se tem pessoas para manusear")
    automacao01: Optional[bool] = Field(None, description="Automação de nutrição por e-mail ativa")

    # Campos de rastreamento de origem
    origin: Optional[str] = Field(None, max_length=500, description="Origem do lead (ex: Site, Indicação, LinkedIn)")
    utm_campaign: Optional[str] = Field(None, max_length=500, description="Parâmetro UTM: campanha (preenchido via API externa)")
    utm_source: Optional[str] = Field(None, max_length=500, description="Parâmetro UTM: fonte (preenchido via API externa)")
    utm_term: Optional[str] = Field(None, max_length=500, description="Parâmetro UTM: termo (preenchido via API externa)")

    model_config = {
        "json_schema_extra": {
            # Exemplo completo de criação de card com dados realistas de CRM brasileiro
            "examples": [
                {
                    "title": "Lead - Indústria Paulista Ltda",
                    "description": "Contato via Inbound Marketing. Empresa interessada em consultoria de growth para o setor industrial.",
                    "list_id": 1,
                    "client_id": 42,
                    "assigned_to_id": 2,
                    "sdr_id": 7,
                    "value": 18500.00,
                    "due_date": "2026-02-28T14:00:00",
                    "prospection_entry_date": "2026-01-10T09:30:00",
                    "acquisition_entry_date": None,
                    "expansion_entry_date": None,
                    "deal_type": "Nova Venda",
                    "acquisition_channel": "Inbound",
                    "acquisition_channel_detail": "Webinar sobre Growth para Indústrias",
                    "utm_params": "utm_source=linkedin&utm_medium=ads&utm_campaign=webinar_jan2026",
                    "loss_reason": None,
                    "has_implementation": True,
                    "has_personnel": False
                }
            ]
        }
    }


class CardUpdate(BaseModel):
    """
    Schema para atualização de card (todos os campos opcionais).
    """
    title: Optional[str] = Field(None, min_length=1, max_length=500, description="Título do card")
    description: Optional[str] = Field(None, description="Descrição detalhada")
    client_id: Optional[int] = Field(None, description="ID do cliente/organização")
    assigned_to_id: Optional[int] = Field(None, description="ID do usuário responsável (Vendedor)")
    sdr_id: Optional[int] = Field(None, description="ID do usuário SDR responsável")
    value: Optional[float] = Field(None, ge=0, description="Valor monetário do card")
    shipping_cost: Optional[float] = Field(None, ge=0, description="Custo de frete/envio do negócio")
    due_date: Optional[datetime] = Field(None, description="Data de vencimento")
    payment_info: Optional[PaymentInfo] = Field(None, description="Informações de pagamento/condições comerciais")
    is_won: Optional[bool] = Field(None, description="Card ganho (venda fechada)")
    is_lost: Optional[bool] = Field(None, description="Card perdido")

    # Campos do blueprint da consultora - Tracking de entrada nos boards
    prospection_entry_date: Optional[datetime] = Field(None, description="Data de entrada no board de Prospecção")
    acquisition_entry_date: Optional[datetime] = Field(None, description="Data de entrada no board de Aquisição")
    expansion_entry_date: Optional[datetime] = Field(None, description="Data de entrada no board de Expansão")

    # Campos do blueprint da consultora - Informações de negócio
    deal_type: Optional[str] = Field(None, max_length=100, description="Tipo de negócio (Nova Venda, Cross Sell, Up Sell)")
    acquisition_channel: Optional[str] = Field(None, max_length=100, description="Canal de aquisição (Inbound, Outbound, Indicação, etc)")
    acquisition_channel_detail: Optional[str] = Field(None, max_length=200, description="Detalhamento do canal de aquisição")
    utm_params: Optional[str] = Field(None, max_length=500, description="Parâmetros UTM (tracking de marketing, campo legado)")
    loss_reason: Optional[str] = Field(None, max_length=200, description="Motivo da perda (quando card é perdido)")
    has_implementation: Optional[bool] = Field(None, description="Se tem implementação")
    has_personnel: Optional[bool] = Field(None, description="Se tem pessoas para manusear")
    automacao01: Optional[bool] = Field(None, description="Automação de nutrição por e-mail ativa")

    # Campos de rastreamento de origem
    origin: Optional[str] = Field(None, max_length=500, description="Origem do lead (ex: Site, Indicação, LinkedIn)")
    utm_campaign: Optional[str] = Field(None, max_length=500, description="Parâmetro UTM: campanha (preenchido via API externa)")
    utm_source: Optional[str] = Field(None, max_length=500, description="Parâmetro UTM: fonte (preenchido via API externa)")
    utm_term: Optional[str] = Field(None, max_length=500, description="Parâmetro UTM: termo (preenchido via API externa)")

    model_config = {
        "json_schema_extra": {
            # Exemplo realista: atualização de card marcando como ganho com informações de pagamento
            "examples": [
                {
                    "title": "Fechamento - Rede Farma Sul S.A.",
                    "description": "Proposta aceita pelo diretor comercial. Contrato assinado em 05/02/2026.",
                    "client_id": 85,
                    "assigned_to_id": 3,
                    "sdr_id": 7,
                    "value": 42000.00,
                    "due_date": "2026-03-01T10:00:00",
                    "payment_info": {
                        "payment_method": "Boleto",
                        "installments": 6,
                        "notes": "Parcelas fixas de R$ 7.000,00 com vencimento todo dia 15, início em março/2026"
                    },
                    "is_won": True,
                    "is_lost": False,
                    "prospection_entry_date": "2025-11-20T08:00:00",
                    "acquisition_entry_date": "2025-12-10T14:30:00",
                    "expansion_entry_date": None,
                    "deal_type": "Nova Venda",
                    "acquisition_channel": "Indicação",
                    "acquisition_channel_detail": "Indicação do cliente Distribuidora Horizonte",
                    "utm_params": None,
                    "loss_reason": None,
                    "has_implementation": True,
                    "has_personnel": True
                }
            ]
        }
    }


class CardMoveRequest(BaseModel):
    """
    Schema para mover card entre listas.
    """
    target_list_id: int = Field(..., description="ID da lista de destino")
    position: Optional[float] = Field(None, description="Posição na lista de destino (índice 0-based)")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "target_list_id": 3,
                    "position": 0
                }
            ]
        }
    }


class CardAssignRequest(BaseModel):
    """
    Schema para atribuir card a um usuário.
    """
    assigned_to_id: Optional[int] = Field(None, description="ID do usuário responsável (None para desatribuir)")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "assigned_to_id": 5
                }
            ]
        }
    }


class CardResponse(CardBase):
    """
    Schema de resposta de card.
    """
    id: int = Field(..., description="ID do card")
    list_id: int = Field(..., description="ID da lista")
    client_id: Optional[int] = Field(None, description="ID do cliente/organização")
    assigned_to_id: Optional[int] = Field(None, description="ID do usuário responsável (Vendedor)")
    sdr_id: Optional[int] = Field(None, description="ID do usuário SDR responsável")
    value: Optional[float] = Field(None, description="Valor monetário")
    shipping_cost: Optional[float] = Field(None, description="Custo de frete/envio do negócio")
    due_date: Optional[datetime] = Field(None, description="Data de vencimento")
    payment_info: Optional[PaymentInfo] = Field(None, description="Informações de pagamento/condições comerciais")
    is_won: bool = Field(..., description="Card ganho")
    is_lost: bool = Field(..., description="Card perdido")
    won_at: Optional[datetime] = Field(None, description="Data de vitória")
    lost_at: Optional[datetime] = Field(None, description="Data de perda")
    position: float = Field(..., description="Posição na lista (decimal)")
    created_at: datetime = Field(..., description="Data de criação")
    updated_at: datetime = Field(..., description="Data de atualização")

    # Campos do blueprint da consultora - Tracking de entrada nos boards
    prospection_entry_date: Optional[datetime] = Field(None, description="Data de entrada no board de Prospecção")
    acquisition_entry_date: Optional[datetime] = Field(None, description="Data de entrada no board de Aquisição")
    expansion_entry_date: Optional[datetime] = Field(None, description="Data de entrada no board de Expansão")

    # Campos do blueprint da consultora - Informações de negócio
    deal_type: Optional[str] = Field(None, description="Tipo de negócio (Nova Venda, Cross Sell, Up Sell)")
    acquisition_channel: Optional[str] = Field(None, description="Canal de aquisição (Inbound, Outbound, Indicação, etc)")
    acquisition_channel_detail: Optional[str] = Field(None, description="Detalhamento do canal de aquisição")
    utm_params: Optional[str] = Field(None, description="Parâmetros UTM (tracking de marketing, campo legado)")
    loss_reason: Optional[str] = Field(None, description="Motivo da perda (quando card é perdido)")
    has_implementation: Optional[bool] = Field(None, description="Se tem implementação")
    has_personnel: Optional[bool] = Field(None, description="Se tem pessoas para manusear")
    automacao01: Optional[bool] = Field(None, description="Automação de nutrição por e-mail ativa")

    # Campos de rastreamento de origem
    origin: Optional[str] = Field(None, description="Origem do lead (ex: Site, Indicação, LinkedIn)")
    utm_campaign: Optional[str] = Field(None, description="Parâmetro UTM: campanha")
    utm_source: Optional[str] = Field(None, description="Parâmetro UTM: fonte")
    utm_term: Optional[str] = Field(None, description="Parâmetro UTM: termo")

    # Campos relacionados (opcional)
    assigned_to_name: Optional[str] = Field(None, description="Nome do responsável")
    assigned_to_email: Optional[str] = Field(None, description="Email do responsável (Vendedor)")
    assigned_to_avatar_url: Optional[str] = Field(None, description="URL do avatar do responsável")
    sdr_name: Optional[str] = Field(None, description="Nome do SDR responsável")
    sdr_avatar_url: Optional[str] = Field(None, description="URL do avatar do SDR")
    pending_tasks_count: Optional[int] = Field(None, description="Quantidade de atividades pendentes")
    pending_tasks_status: Optional[str] = Field(None, description="Status das atividades: overdue, today, future, none")
    list_name: Optional[str] = Field(None, description="Nome da lista")
    board_id: Optional[int] = Field(None, description="ID do board")
    board_has_done_stage: Optional[bool] = Field(None, description="Indica se o board possui uma lista de 'Negócio Ganho' (is_done_stage=True)")
    reopened_from_card_id: Optional[int] = Field(None, description="ID do card original que gerou esta reabertura (None = criado do zero)")
    client_name: Optional[str] = Field(None, description="Nome do cliente/organização")
    client_document: Optional[str] = Field(None, description="CNPJ ou CPF da empresa vinculada")
    person_id: Optional[int] = Field(None, description="ID da pessoa vinculada")
    person_name: Optional[str] = Field(None, description="Nome da pessoa vinculada")
    person_email: Optional[str] = Field(None, description="Email principal da pessoa vinculada")
    person_phone: Optional[str] = Field(None, description="Telefone principal da pessoa vinculada")
    person_phone_whatsapp: Optional[str] = Field(None, description="WhatsApp da pessoa vinculada")
    person_phone_commercial: Optional[str] = Field(None, description="Telefone comercial da pessoa vinculada")
    product_names: Optional[str] = Field(None, description="Nomes dos produtos vinculados (separados por vírgula)")
    custom_fields: Optional[list] = Field(None, description="Campos customizados do card")

    @field_validator('value', 'shipping_cost', 'position', mode='before')
    @classmethod
    def convert_decimal_to_float(cls, v):
        """Converte Decimal para float"""
        if isinstance(v, Decimal):
            return float(v)
        return v

    @field_validator('is_won', 'is_lost', mode='before')
    @classmethod
    def convert_int_to_bool(cls, v):
        """Converte Integer para Boolean (0/1 -> False/True)"""
        if isinstance(v, int):
            return v == 1
        return v

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            # Exemplo completo de resposta com todos os campos do card
            "examples": [
                {
                    "id": 152,
                    "title": "Consultoria Growth - TechBrasil Sistemas Ltda",
                    "description": "Projeto de consultoria de growth para SaaS B2B. Reunião de kickoff agendada para março.",
                    "list_id": 4,
                    "client_id": 85,
                    "assigned_to_id": 3,
                    "sdr_id": 7,
                    "value": 42000.00,
                    "due_date": "2026-03-01T10:00:00",
                    "payment_info": {
                        "payment_method": "Boleto",
                        "installments": 6,
                        "notes": "Parcelas fixas de R$ 7.000,00 com vencimento todo dia 15"
                    },
                    "is_won": True,
                    "is_lost": False,
                    "won_at": "2026-02-05T16:45:00",
                    "lost_at": None,
                    "position": 2.0,
                    "created_at": "2025-11-20T08:00:00",
                    "updated_at": "2026-02-05T16:45:00",
                    "prospection_entry_date": "2025-11-20T08:00:00",
                    "acquisition_entry_date": "2025-12-10T14:30:00",
                    "expansion_entry_date": None,
                    "deal_type": "Nova Venda",
                    "acquisition_channel": "Inbound",
                    "acquisition_channel_detail": "Formulário de contato no site institucional",
                    "utm_params": "utm_source=google&utm_medium=cpc&utm_campaign=growth_saas",
                    "loss_reason": None,
                    "has_implementation": True,
                    "has_personnel": True,
                    "assigned_to_name": "Maria Santos",
                    "list_name": "Ganhos",
                    "board_id": 2,
                    "client_name": "TechBrasil Sistemas Ltda",
                    "person_id": 210,
                    "person_name": "Carlos Eduardo Mendes",
                    "custom_fields": [
                        {"field_name": "Segmento", "value": "Tecnologia"},
                        {"field_name": "Porte", "value": "Médio"}
                    ]
                }
            ]
        }
    }


class CardMinimalResponse(BaseModel):
    """
    Schema minimalista de card para Kanban (otimizado para performance).
    Retorna apenas campos essenciais para visualização em lista.
    """
    id: int = Field(..., description="ID do card")
    title: str = Field(..., description="Título do card")
    list_id: int = Field(..., description="ID da lista")
    position: float = Field(..., description="Posição na lista")
    assigned_to_id: Optional[int] = Field(None, description="ID do usuário responsável")
    assigned_to_name: Optional[str] = Field(None, description="Nome do responsável")
    assigned_to_avatar_url: Optional[str] = Field(None, description="URL do avatar do responsável")
    sdr_id: Optional[int] = Field(None, description="ID do SDR responsável")
    sdr_name: Optional[str] = Field(None, description="Nome do SDR responsável")
    sdr_avatar_url: Optional[str] = Field(None, description="URL do avatar do SDR")
    pending_tasks_count: Optional[int] = Field(None, description="Quantidade de atividades pendentes")
    pending_tasks_status: Optional[str] = Field(None, description="Status das atividades: overdue, today, future, none")
    value: Optional[float] = Field(None, description="Valor monetário")
    due_date: Optional[datetime] = Field(None, description="Data de vencimento")
    created_at: Optional[datetime] = Field(None, description="Data de criação")
    updated_at: Optional[datetime] = Field(None, description="Data da última atualização")
    is_stuck_3d: bool = Field(False, description="True se o card está na mesma etapa há mais de 3 dias")
    is_won: bool = Field(..., description="Card ganho")
    is_lost: bool = Field(..., description="Card perdido")
    closed_at: Optional[datetime] = Field(None, description="Data de fechamento (ganho ou perdido)")
    acquisition_channel: Optional[str] = Field(None, description="Canal de aquisição")
    acquisition_channel_detail: Optional[str] = Field(None, description="Detalhamento do canal de aquisição")
    reopened_from_card_id: Optional[int] = Field(None, description="ID do card original que gerou esta reabertura (None = criado do zero)")
    automacao01: Optional[bool] = Field(None, description="Automação de nutrição por e-mail ativa")
    contact_info: Optional[dict] = Field(None, description="Dados de contato (inclui probabilidade de fechamento)")

    @field_validator('value', 'position', mode='before')
    @classmethod
    def convert_decimal_to_float(cls, v):
        """Converte Decimal para float"""
        if isinstance(v, Decimal):
            return float(v)
        return v

    @field_validator('is_won', 'is_lost', mode='before')
    @classmethod
    def convert_int_to_bool(cls, v):
        """Converte Integer para Boolean (0/1 -> False/True)"""
        if isinstance(v, int):
            return v == 1
        return v

    model_config = {"from_attributes": True}


class CardListResponse(BaseModel):
    """
    Schema para listagem paginada de cards.
    """
    cards: list[CardResponse] = Field(..., description="Lista de cards")
    total: int = Field(..., description="Total de cards")
    page: int = Field(..., description="Página atual")
    page_size: int = Field(..., description="Tamanho da página")
    total_pages: int = Field(..., description="Total de páginas")


class CardMinimalListResponse(BaseModel):
    """
    Schema para listagem de cards minimalista (otimizado para Kanban).
    """
    cards: list[CardMinimalResponse] = Field(..., description="Lista de cards (campos essenciais)")
    total: int = Field(..., description="Total de cards")
    page: int = Field(..., description="Página atual")
    page_size: int = Field(..., description="Tamanho da página")
    total_pages: int = Field(..., description="Total de páginas")


class CardMarkLostRequest(BaseModel):
    """
    Schema para marcar um card como perdido via endpoint dedicado.
    O backend localiza automaticamente a lista de 'Negócio Perdido' do board atual.
    """
    loss_reason: str = Field(..., min_length=1, max_length=200, description="Motivo da perda")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {"loss_reason": "Preço acima do orçamento"}
            ]
        }
    }


class CardReopenRequest(BaseModel):
    """
    Schema para reabertura de negócio perdido.
    Cria uma cópia do card com canal de aquisição Base e move para a lista de destino.
    """
    title: str = Field(..., min_length=1, max_length=500, description="Título do novo negócio")
    acquisition_channel_detail: str = Field(
        ...,
        description="Detalhamento do canal Base: 'Base - Resgate' ou 'Base - Levantada de mão'"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "title": "Retomada - Empresa XYZ",
                    "acquisition_channel_detail": "Base - Resgate"
                }
            ]
        }
    }


class CardReopenResponse(BaseModel):
    """
    Schema de resposta da reabertura de negócio.
    Retorna o novo card criado como clone do card perdido.
    """
    new_card_id: int = Field(..., description="ID do novo card criado")
    new_card_title: str = Field(..., description="Título do novo card")
    original_card_id: int = Field(..., description="ID do card original (perdido)")
    message: str = Field(..., description="Mensagem de confirmação")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "new_card_id": 245,
                    "new_card_title": "Retomada - Empresa XYZ",
                    "original_card_id": 152,
                    "message": "Negócio reaberto com sucesso"
                }
            ]
        }
    }


class CardCloneResponse(BaseModel):
    """Schema de resposta da clonagem de card."""
    new_card_id: int = Field(..., description="ID do novo card clonado")
    new_card_title: str = Field(..., description="Título do novo card")
    original_card_id: int = Field(..., description="ID do card original")
    message: str = Field(..., description="Mensagem de confirmação")


class CardExpandedResponse(CardResponse):
    """
    Schema expandido de card com todos os relacionamentos carregados.
    Ideal para a página CardDetails que precisa de todos os dados.
    """
    # Relacionamentos expandidos
    custom_field_values: Optional[list] = Field(None, description="Valores dos campos customizados")
    pending_tasks: Optional[list] = Field(None, description="Tarefas pendentes do card")
    pending_tasks_count: Optional[int] = Field(None, description="Quantidade de tarefas pendentes")
    products: Optional[list] = Field(None, description="Produtos associados ao card")
    products_total: Optional[float] = Field(None, description="Valor total dos produtos")
    recent_activities: Optional[list] = Field(None, description="Atividades recentes (últimas 10)")
    notes: Optional[list] = Field(None, description="Anotações do card")

    model_config = {"from_attributes": True}


# ==================== IMPORT SCHEMAS ====================

class CardImportRowResult(BaseModel):
    """Resultado da importação de uma linha da planilha."""
    row: int = Field(..., description="Número da linha na planilha (começa em 2)")
    status: str = Field(..., description="success | error | skipped")
    card_id: Optional[int] = Field(None, description="ID do card criado (se sucesso)")
    title: Optional[str] = Field(None, description="Título do card")
    message: str = Field(..., description="Mensagem de resultado ou descrição do erro")


class CardImportResponse(BaseModel):
    """Resultado geral da importação em lote."""
    total: int = Field(..., description="Total de linhas processadas")
    created: int = Field(..., description="Cards criados com sucesso")
    errors: int = Field(..., description="Linhas com erro")
    results: list[CardImportRowResult] = Field(..., description="Resultado linha a linha")
