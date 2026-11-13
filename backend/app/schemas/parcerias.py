"""Schemas Pydantic do Programa de Parceiros (boards Aquisição e Pipeline)."""
from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Any, Dict, List, Literal, Optional, Union

import re

from email_validator import EmailNotValidError, validate_email
from pydantic import AfterValidator, BaseModel, Field, field_validator, model_validator

from app.schemas.acessos import ModoDeAcesso
from app.services.parcerias.cnpj import cnpj_valido, normalizar_cnpj, so_digitos

# Maior valor que cabe nas colunas Numeric(12, 2); acima disso o Postgres recusa.
VALOR_MAXIMO = Decimal("9999999999.99")
QUANTIDADE_MAXIMA = 100_000


def _valor_no_limite(valor: Optional[Decimal]) -> Optional[Decimal]:
    if valor is not None and valor > VALOR_MAXIMO:
        raise ValueError("Valor acima do limite de R$ 9.999.999.999,99.")
    return valor


def _quantidade_no_limite(valor: Optional[int]) -> Optional[int]:
    if valor is not None and valor > QUANTIDADE_MAXIMA:
        raise ValueError("Quantidade acima do limite de 100.000.")
    return valor


# Com a mensagem em português (o "le" do Field responde em inglês).
Valor = Annotated[Optional[Decimal], AfterValidator(_valor_no_limite)]
Quantidade = Annotated[Optional[int], AfterValidator(_quantidade_no_limite)]

Qualificacao = Literal["aderente", "parcialmente_aderente", "nao_aderente"]


def _cnpj_opcional(valor: Optional[str]) -> Optional[str]:
    if valor in (None, ""):
        return None
    if not cnpj_valido(valor):
        raise ValueError("CNPJ inválido")
    return normalizar_cnpj(valor)


def cpf_valido(valor: str) -> bool:
    """CPF com 11 dígitos, dígitos verificadores corretos e não todos iguais."""
    d = re.sub(r"\D", "", valor or "")
    if len(d) != 11 or len(set(d)) == 1:
        return False
    for i in (9, 10):
        soma = sum(int(d[j]) * (i + 1 - j) for j in range(i))
        if (soma * 10 % 11) % 10 != int(d[i]):
            return False
    return True


_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def email_aceito(valor: str) -> bool:
    """
    A mesma regra do cadastro de Pessoas (EmailStr): além do formato, recusa
    domínios reservados (.test, .local...). E-mail que passa aqui e falha lá
    trava a leitura da Pessoa ligada à oportunidade.
    """
    if not _EMAIL.match(valor):
        return False
    try:
        validate_email(valor, check_deliverability=False)
    except EmailNotValidError:
        return False
    return True


def _email_opcional(valor: Optional[str]) -> Optional[str]:
    valor = (valor or "").strip().lower()
    if not valor:
        return None
    if not email_aceito(valor):
        raise ValueError("E-mail inválido")
    return valor


def _telefone_opcional(valor: Optional[str]) -> Optional[str]:
    """Guarda só os números; pede DDD (10 ou 11 dígitos) e recusa letras."""
    valor = (valor or "").strip()
    if not valor:
        return None
    if re.search(r"[^\d\s()+\-.]", valor):
        raise ValueError("Telefone só aceita números")
    digitos = so_digitos(valor)
    if len(digitos) not in (10, 11):
        raise ValueError("Telefone com DDD: 10 ou 11 números")
    return digitos


def _obrigatorio(valor, mensagem: str):
    """Campo que vai para o cadastro geral (Clientes e Pessoas): não pode ficar vazio."""
    if valor is None:
        raise ValueError(mensagem)
    return valor


def _uf_opcional(valor: Optional[str]) -> Optional[str]:
    valor = (valor or "").strip().upper()
    if not valor:
        return None
    if not re.fullmatch(r"[A-Z]{2}", valor):
        raise ValueError("UF com 2 letras")
    return valor


# ─── Etapas ──────────────────────────────────────────────────────────────────

class EtapaOut(BaseModel):
    codigo: str
    nome: str


class EtapasResponse(BaseModel):
    aquisicao: List[EtapaOut]
    oportunidades: List[EtapaOut]


class MoverRequest(BaseModel):
    stage: str
    position: Optional[float] = None
    loss_reason: Optional[str] = Field(None, max_length=255)
    loss_detail: Optional[str] = Field(None, max_length=1000)
    # Campos que a tela pede no modal da trava do board 2.
    expected_close_date: Optional[date] = None
    modality: Optional[Literal["venda", "locacao"]] = None


# ─── Board 1: parceiro ───────────────────────────────────────────────────────

class ParceiroCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    cnpj: Optional[str] = None
    main_contact_name: Optional[str] = Field(None, max_length=255)
    main_contact_phone: Optional[str] = Field(None, max_length=30)
    main_contact_email: Optional[str] = Field(None, max_length=255)
    partner_type: Optional[str] = Field(None, max_length=100)
    origin: Optional[str] = Field(None, max_length=100)
    segment: Optional[str] = Field(None, max_length=255)
    region: Optional[str] = Field(None, max_length=255)
    hs_owner_id: Optional[int] = None
    qualification_status: Optional[Qualificacao] = None
    onboarding_date: Optional[date] = None
    contract_date: Optional[date] = None
    indicated_by_partner_id: Optional[int] = None
    pix_key: Optional[str] = Field(None, max_length=140)

    @field_validator("cnpj")
    @classmethod
    def _validar_cnpj(cls, valor):
        return _cnpj_opcional(valor)

    @field_validator("main_contact_phone")
    @classmethod
    def _validar_telefone(cls, valor):
        return _telefone_opcional(valor)

    @field_validator("main_contact_email")
    @classmethod
    def _validar_email(cls, valor):
        return _email_opcional(valor)

    @field_validator("pix_key")
    @classmethod
    def _pix_em_branco(cls, valor):
        return (valor or "").strip() or None


class ParceiroUpdate(ParceiroCreate):
    name: Optional[str] = Field(None, min_length=1, max_length=255)


class ParceiroResponse(BaseModel):
    id: int
    name: str
    cnpj: Optional[str] = None
    main_contact_name: Optional[str] = None
    main_contact_phone: Optional[str] = None
    main_contact_email: Optional[str] = None
    partner_type: Optional[str] = None
    origin: Optional[str] = None
    segment: Optional[str] = None
    region: Optional[str] = None
    hs_owner_id: Optional[int] = None
    hs_owner_name: Optional[str] = None
    qualification_status: Optional[str] = None
    onboarding_date: Optional[date] = None
    activation_evidence: Optional[str] = None
    activated_at: Optional[datetime] = None
    activation_opportunity_id: Optional[int] = None
    contract_date: Optional[date] = None
    contract_activity_id: Optional[int] = None
    contract_file_name: Optional[str] = None
    kind: str = "empresa"
    cpf: Optional[str] = None
    pix_key: Optional[str] = None
    indicated_by_partner_id: Optional[int] = None
    indicated_by_name: Optional[str] = None
    terms_accepted_at: Optional[datetime] = None
    stage: str
    position: float = 0
    loss_reason: Optional[str] = None
    loss_detail: Optional[str] = None
    lost_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    oportunidades_por_etapa: Dict[str, int] = {}
    # Só na lista do board: atividades pendentes (overdue | today | future | none).
    pending_status: Optional[str] = None
    pending_count: int = 0

    model_config = {"from_attributes": True}


class IndicacaoCreate(BaseModel):
    """Empresa que um hunter (ou outra empresa) indica: nasce Convidado, com o convite saindo na hora."""
    name: str = Field(..., min_length=1, max_length=255)
    cnpj: str
    main_contact_name: str = Field(..., min_length=1, max_length=255)
    main_contact_email: str = Field(..., max_length=255)
    main_contact_phone: str = Field(..., max_length=30)
    pix_key: Optional[str] = Field(None, max_length=140)

    @field_validator("cnpj")
    @classmethod
    def _validar_cnpj(cls, valor):
        cnpj = _cnpj_opcional(valor)
        if not cnpj:
            raise ValueError("Informe o CNPJ")
        return cnpj

    @field_validator("main_contact_name")
    @classmethod
    def _validar_contato(cls, valor):
        return _obrigatorio((valor or "").strip() or None, "Informe o nome do contato")

    @field_validator("main_contact_phone")
    @classmethod
    def _validar_telefone(cls, valor):
        return _obrigatorio(_telefone_opcional(valor), "Informe o telefone do contato")

    @field_validator("main_contact_email")
    @classmethod
    def _validar_email(cls, valor):
        email = _email_opcional(valor)
        if not email:
            raise ValueError("Informe o e-mail")
        return email


class HunterCreate(ModoDeAcesso):
    """Hunter cadastrado pela H&S: pessoa (CPF) ou empresa (CNPJ), por convite ou com senha inicial."""
    name: str = Field(..., min_length=1, max_length=255)
    cpf: Optional[str] = None
    cnpj: Optional[str] = None
    email: str = Field(..., max_length=255)
    phone: Optional[str] = Field(None, max_length=30)
    pix_key: Optional[str] = Field(None, max_length=140)

    @field_validator("cpf")
    @classmethod
    def _validar_cpf(cls, valor):
        if valor in (None, ""):
            return None
        if not cpf_valido(valor):
            raise ValueError("CPF inválido")
        return re.sub(r"\D", "", valor)

    @field_validator("cnpj")
    @classmethod
    def _validar_cnpj(cls, valor):
        return _cnpj_opcional(valor)

    @field_validator("phone")
    @classmethod
    def _validar_telefone(cls, valor):
        return _telefone_opcional(valor)

    @field_validator("email")
    @classmethod
    def _validar_email(cls, valor):
        email = _email_opcional(valor)
        if not email:
            raise ValueError("Informe o e-mail")
        return email

    @model_validator(mode="after")
    def _um_documento(self):
        if bool(self.cpf) == bool(self.cnpj):
            raise ValueError("Informe o CPF ou o CNPJ do hunter (só um dos dois).")
        return self


class HunterResponse(BaseModel):
    id: int
    name: str
    cpf: Optional[str] = None
    cnpj: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    pix_key: Optional[str] = None
    stage: str
    terms_accepted_at: Optional[datetime] = None
    created_at: datetime
    empresas_indicadas: int = 0
    status_acesso: Optional[str] = None
    convite_expira_em: Optional[datetime] = None


class IndicacaoResponse(BaseModel):
    parceiro: ParceiroResponse
    email_enviado: bool


class MembroCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=30)

    @field_validator("phone")
    @classmethod
    def _validar_telefone(cls, valor):
        return _telefone_opcional(valor)

    @field_validator("email")
    @classmethod
    def _validar_email(cls, valor):
        return _email_opcional(valor)


class MembroUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=30)
    is_active: Optional[bool] = None

    @field_validator("phone")
    @classmethod
    def _validar_telefone(cls, valor):
        return _telefone_opcional(valor)

    @field_validator("email")
    @classmethod
    def _validar_email(cls, valor):
        return _email_opcional(valor)


class MembroResponse(BaseModel):
    id: int
    partner_id: int
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool
    user_id: Optional[int] = None
    status_acesso: Optional[str] = None  # None = sem login
    convite_expira_em: Optional[datetime] = None

    model_config = {"from_attributes": True}


class AcessoMembroCreate(ModoDeAcesso):
    """Login do vendedor da equipe: usa o nome e o e-mail cadastrados no membro."""


class AcessoCreate(ModoDeAcesso):
    name: str = Field(..., min_length=1, max_length=255)
    email: str = Field(..., min_length=3, max_length=255)

    @field_validator("email")
    @classmethod
    def _validar_email(cls, valor: str) -> str:
        valor = (valor or "").strip().lower()
        if not email_aceito(valor):
            raise ValueError("E-mail inválido")
        return valor


class AcessoUpdate(BaseModel):
    is_active: bool


class AcessoResponse(BaseModel):
    id: int
    name: str
    email: str
    is_active: bool
    last_login_at: Optional[datetime] = None
    status_acesso: str = "ativo"
    convite_expira_em: Optional[datetime] = None

    model_config = {"from_attributes": True}


class AcessoCriadoResponse(AcessoResponse):
    email_enviado: bool = False


# ─── Board 2: oportunidade ───────────────────────────────────────────────────

class OportunidadeCreate(BaseModel):
    # Admin/gerente escolhem; para o parceiro é sempre o próprio canal.
    partner_id: Optional[int] = None
    seller_member_id: Optional[int] = None
    title: str = Field(..., min_length=1, max_length=500)
    deal_type: str = Field(..., min_length=1, max_length=100)
    sector: str = Field(..., min_length=1, max_length=100)
    relationship_type: str = Field(..., min_length=1, max_length=100)
    context: str = Field(..., min_length=1, max_length=2000)
    cnpj: str
    company_name: str = Field(..., min_length=1, max_length=255)
    company_segment: Optional[str] = Field(None, max_length=255)
    # Empresa e contato vão para o cadastro geral (Clientes e Pessoas): vêm completos.
    company_city: str = Field(..., max_length=255)
    company_state: str = Field(..., max_length=2)
    contact_name: str = Field(..., max_length=255)
    contact_role: Optional[str] = Field(None, max_length=255)
    contact_phone: str = Field(..., max_length=30)
    contact_email: str = Field(..., max_length=255)
    modality: Optional[Literal["venda", "locacao"]] = None
    # Só admin/gerente: cadastrar (ou trocar o CNPJ) mesmo com o semáforo vermelho.
    cnpj_justificativa: Optional[str] = Field(None, max_length=500)

    @field_validator("cnpj")
    @classmethod
    def _validar_cnpj(cls, valor):
        if not cnpj_valido(valor):
            raise ValueError("CNPJ inválido")
        return normalizar_cnpj(valor)

    @field_validator("company_city")
    @classmethod
    def _validar_cidade(cls, valor):
        return _obrigatorio((valor or "").strip() or None, "Informe a cidade")

    @field_validator("contact_name")
    @classmethod
    def _validar_contato(cls, valor):
        return _obrigatorio((valor or "").strip() or None, "Informe o nome do contato")

    @field_validator("contact_phone")
    @classmethod
    def _validar_telefone(cls, valor):
        return _obrigatorio(_telefone_opcional(valor), "Informe o telefone do contato")

    @field_validator("contact_email")
    @classmethod
    def _validar_email(cls, valor):
        return _obrigatorio(_email_opcional(valor), "Informe o e-mail do contato")

    @field_validator("company_state")
    @classmethod
    def _validar_uf(cls, valor):
        return _obrigatorio(_uf_opcional(valor), "Informe a UF")


class OportunidadeUpdate(BaseModel):
    seller_member_id: Optional[int] = None
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    deal_type: Optional[str] = Field(None, min_length=1, max_length=100)
    sector: Optional[str] = Field(None, min_length=1, max_length=100)
    relationship_type: Optional[str] = Field(None, min_length=1, max_length=100)
    context: Optional[str] = Field(None, min_length=1, max_length=2000)
    cnpj: Optional[str] = None
    company_name: Optional[str] = Field(None, min_length=1, max_length=255)
    company_segment: Optional[str] = Field(None, max_length=255)
    company_city: Optional[str] = Field(None, max_length=255)
    company_state: Optional[str] = Field(None, max_length=2)
    contact_name: Optional[str] = Field(None, max_length=255)
    contact_role: Optional[str] = Field(None, max_length=255)
    contact_phone: Optional[str] = Field(None, max_length=30)
    contact_email: Optional[str] = Field(None, max_length=255)
    expected_close_date: Optional[date] = None
    modality: Optional[Literal["venda", "locacao"]] = None
    # Só admin/gerente: cadastrar (ou trocar o CNPJ) mesmo com o semáforo vermelho.
    cnpj_justificativa: Optional[str] = Field(None, max_length=500)
    # Valor do negócio (seção Produtos).
    global_discount: Valor = Field(None, ge=0)
    global_discount_type: Optional[Literal["value", "percent"]] = None
    shipping: Valor = Field(None, ge=0)

    @field_validator("cnpj")
    @classmethod
    def _validar_cnpj(cls, valor):
        return _cnpj_opcional(valor)

    @field_validator("contact_phone")
    @classmethod
    def _validar_telefone(cls, valor):
        return _telefone_opcional(valor)

    @field_validator("contact_email")
    @classmethod
    def _validar_email(cls, valor):
        return _email_opcional(valor)

    @field_validator("company_state")
    @classmethod
    def _validar_uf(cls, valor):
        return _uf_opcional(valor)

    @field_validator("company_city", "company_state", "contact_name", "contact_phone", "contact_email", mode="after")
    @classmethod
    def _nao_apaga(cls, valor, info):
        """Empresa e contato vão para Clientes e Pessoas: na edição, quem manda o campo não o deixa vazio."""
        if valor is None or (isinstance(valor, str) and not valor.strip()):
            raise ValueError(f"{ROTULO_OBRIGATORIO[info.field_name]} é obrigatório")
        return valor


ROTULO_OBRIGATORIO = {
    "company_city": "Cidade", "company_state": "UF", "contact_name": "Nome do contato",
    "contact_phone": "Telefone do contato", "contact_email": "E-mail do contato",
}


class ElegibilidadeRequest(BaseModel):
    status: Literal["em_analise", "validada", "rejeitada"]
    note: Optional[str] = Field(None, max_length=1000)


class GanhoRequest(BaseModel):
    """Admin, gerente ou Financeiro confirmam ou negam o Ganho marcado pelo parceiro."""
    acao: Literal["confirmar", "negar"]
    motivo: Optional[str] = Field(None, max_length=1000)


class OportunidadeResponse(BaseModel):
    id: int
    # Semáforo de CNPJ gravado no cadastro (a justificativa não vai para o parceiro).
    cnpj_resultado: Optional[str] = None
    cnpj_motivo: Optional[str] = None
    cnpj_justificativa: Optional[str] = None
    cnpj_liberado_por_name: Optional[str] = None
    partner_id: int
    partner_name: Optional[str] = None
    acquisition_channel: str = "Parceiros"
    seller_member_id: Optional[int] = None
    seller_name: Optional[str] = None
    title: str
    deal_type: str
    sector: str
    relationship_type: str
    context: str
    cnpj: str
    company_name: str
    company_segment: Optional[str] = None
    company_city: Optional[str] = None
    company_state: Optional[str] = None
    contact_name: Optional[str] = None
    contact_role: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    eligibility_status: str
    eligibility_note: Optional[str] = None
    eligibility_by_name: Optional[str] = None
    eligibility_at: Optional[datetime] = None
    expected_close_date: Optional[date] = None
    modality: Optional[str] = None
    loss_reason: Optional[str] = None
    loss_detail: Optional[str] = None
    stage: str
    position: float = 0
    last_activity_at: Optional[datetime] = None
    won_at: Optional[datetime] = None
    won_confirmed_at: Optional[datetime] = None
    won_confirmed_by_name: Optional[str] = None
    client_id: Optional[int] = None
    client_name: Optional[str] = None
    person_id: Optional[int] = None
    person_name: Optional[str] = None
    lost_at: Optional[datetime] = None
    total_value: float = 0
    global_discount: float = 0
    global_discount_type: str = "value"
    shipping: float = 0
    # Só na lista do board: atividades pendentes (overdue | today | future | none).
    pending_status: Optional[str] = None
    pending_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProdutoItemCreate(BaseModel):
    product_id: int
    quantity: Annotated[int, AfterValidator(_quantidade_no_limite)] = Field(1, ge=1)
    unit_price: Valor = Field(None, ge=0)


class ProdutoItemUpdate(BaseModel):
    quantity: Quantidade = Field(None, ge=1)
    unit_price: Valor = Field(None, ge=0)
    discount: Valor = Field(None, ge=0)


class ProdutoItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: str
    product_sku: Optional[str] = None
    quantity: int
    unit_price: float
    discount: float = 0
    subtotal: float
    total: float


class ProdutoCatalogo(BaseModel):
    id: int
    name: str
    sku: Optional[str] = None
    unit_price: float


# ─── Atividades ──────────────────────────────────────────────────────────────

Prioridade = Literal["normal", "high", "urgent"]


class AtividadeCreate(BaseModel):
    """Mesmos campos da atividade do card de Serviço (Foco ou anotação)."""
    category: Literal["atividade", "anotacao"]
    activity_type: Optional[str] = Field(None, max_length=50)
    title: Optional[str] = Field(None, max_length=500)
    # Anotação guarda HTML com imagem colada (base64), por isso não tem limite curto.
    description: Optional[str] = None
    priority: Optional[Prioridade] = None
    due_date: Optional[datetime] = None
    activity_metadata: Optional[Dict[str, Any]] = None


class AtividadeUpdate(BaseModel):
    activity_type: Optional[str] = Field(None, max_length=50)
    title: Optional[str] = Field(None, max_length=500)
    description: Optional[str] = None
    priority: Optional[Prioridade] = None
    due_date: Optional[datetime] = None
    activity_metadata: Optional[Dict[str, Any]] = None


class ConcluirRequest(BaseModel):
    is_completed: bool
    # Resultado do Foco: ligação válida, e-mail enviado, WhatsApp respondido, reunião realizada.
    is_valid: Optional[bool] = None


class AtividadeResponse(BaseModel):
    id: int
    partner_id: Optional[int] = None
    opportunity_id: Optional[int] = None
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    category: str
    activity_type: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    activity_metadata: Optional[Dict[str, Any]] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    is_completed: bool = False
    completed_at: Optional[datetime] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─── Consulta de CNPJ (Entrega 2) ────────────────────────────────────────────

class ConsultaCnpjRequest(BaseModel):
    cnpj: str

    @field_validator("cnpj")
    @classmethod
    def _validar_cnpj(cls, valor):
        if not cnpj_valido(valor):
            raise ValueError("CNPJ inválido")
        return normalizar_cnpj(valor)


class RegistroSemaforo(BaseModel):
    tipo: str
    id: int
    titulo: str
    onde: str
    responsavel: Optional[str] = None
    cnpj: str
    motivo: str
    libera_em: Optional[date] = None
    parceiro: Optional[str] = None
    desde: datetime


class ConsultaCnpjResponse(BaseModel):
    cnpj: str
    resultado: Literal["verde", "amarelo", "vermelho"]
    motivo: str
    frase: str
    libera_em: Optional[date] = None
    # Vazio para o parceiro: ele vê só a cor e a frase.
    registros: List[RegistroSemaforo] = []


class RegrasCnpjResponse(BaseModel):
    """Regras da Consulta de CNPJ (configuração do admin). 0 dias = regra desligada."""
    protection_days: int
    recent_purchase_days: int
    recent_loss_days: int
    daily_query_limit: int
    block_between_sellers: bool
    updated_at: Optional[datetime] = None
    updated_by_name: Optional[str] = None


class RegrasCnpjUpdate(BaseModel):
    protection_days: Optional[int] = Field(None, ge=0, le=365)
    recent_purchase_days: Optional[int] = Field(None, ge=0, le=365)
    recent_loss_days: Optional[int] = Field(None, ge=0, le=365)
    daily_query_limit: Optional[int] = Field(None, ge=1, le=1000)
    block_between_sellers: Optional[bool] = None


class ConsultasHojeResponse(BaseModel):
    feitas: int
    limite: Optional[int] = None


class ConsultasResumoResponse(BaseModel):
    """KPIs da página: a gestão vê todo mundo; os demais, só as próprias consultas."""
    hoje: int
    limite: Optional[int] = None
    ultimos_30_dias: int
    verdes: int
    amarelos: int
    vermelhos: int


class ConsultaHistoricoItem(BaseModel):
    id: int
    created_at: datetime
    user_name: Optional[str] = None
    perfil: Optional[str] = None
    partner_name: Optional[str] = None
    cnpj: str
    resultado: str
    motivo: str


class ConsultaHistoricoResponse(BaseModel):
    total: int
    itens: List[ConsultaHistoricoItem]


class AvisoParceriasItem(BaseModel):
    parceiro: str
    desde: datetime


# ─── Termos do Programa ──────────────────────────────────────────────────────

class TermosCreate(BaseModel):
    audience: Literal["empresa", "hunter"]
    text: str = Field(..., min_length=20)


class TermosResponse(BaseModel):
    id: int
    audience: str
    version: int
    text: str
    published_at: datetime
    published_by_id: Optional[int] = None

    model_config = {"from_attributes": True}


class TermosPendenteResponse(BaseModel):
    pendente: bool
    version: Optional[int] = None
    text: Optional[str] = None


class TermosAceiteResponse(BaseModel):
    ok: bool = True
    stage: str
    terms_accepted_at: Optional[datetime] = None


# ─── Comissões ───────────────────────────────────────────────────────────────

class ComissaoConfigUpdate(BaseModel):
    # No máximo 2 casas: é o que as colunas Numeric(5, 2) / (12, 2) guardam.
    own_sale_pct: Decimal = Field(..., ge=0, le=100, decimal_places=2)
    indication_pct: Decimal = Field(..., ge=0, le=100, decimal_places=2)
    first_sale_bonus: Decimal = Field(..., ge=0, decimal_places=2)
    indication_months: int = Field(..., ge=1, le=120)
    calibration_pct: Decimal = Field(..., ge=0, le=100, decimal_places=2)
    # Opcionais: sem eles (tela antiga), os valores gravados ficam como estão.
    hunter_own_sale_pct: Optional[Annotated[Decimal, Field(ge=0, le=100, decimal_places=2)]] = None
    annual_fee_reference: Optional[Annotated[Decimal, Field(ge=0, decimal_places=2)]] = None

    @field_validator("first_sale_bonus", "annual_fee_reference")
    @classmethod
    def _bonus_no_limite(cls, v):
        return v if v is None else _valor_no_limite(v)


class ComissaoConfigResponse(BaseModel):
    own_sale_pct: Decimal
    indication_pct: Decimal
    first_sale_bonus: Decimal
    indication_months: int
    calibration_pct: Decimal
    hunter_own_sale_pct: Decimal = Decimal("0")
    annual_fee_reference: Decimal = Decimal("0")
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ComissaoResponse(BaseModel):
    """`de`/`ate` dos filtros são datas de calendário inclusivas, aplicadas em `created_at`."""
    id: int
    beneficiary_partner_id: int
    beneficiary_name: Optional[str] = None
    source_partner_id: int
    source_name: Optional[str] = None
    opportunity_id: int
    opportunity_title: Optional[str] = None
    calibration_id: Optional[int] = None
    kind: str
    base_value: Decimal
    rate: Optional[Decimal] = None
    fixed_value: Optional[Decimal] = None
    amount: Decimal
    status: str
    created_at: datetime
    paid_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    cancel_reason: Optional[str] = None


class ComissaoResumo(BaseModel):
    pendente: Decimal
    pago: Decimal
    cancelado: Decimal


class APagarBeneficiario(BaseModel):
    beneficiary_partner_id: int
    nome: str
    kind: str
    documento: Optional[str] = None
    pix_key: Optional[str] = None
    total: Decimal
    quantidade: int
    lancamentos: List[ComissaoResponse]


class PagarRequest(BaseModel):
    """Exatamente um entre `ids` e `beneficiary_partner_id` (este com `ate` opcional, inclusivo)."""
    ids: Optional[List[int]] = Field(None, max_length=500)
    beneficiary_partner_id: Optional[int] = None
    de: Optional[date] = None
    ate: Optional[date] = None

    @model_validator(mode="after")
    def _um_so(self):
        if (self.ids is None) == (self.beneficiary_partner_id is None):
            raise ValueError("Informe ids ou beneficiary_partner_id (só um dos dois).")
        if self.ids is not None and (not self.ids or self.ate is not None or self.de is not None):
            raise ValueError("Com ids, informe ao menos um id e não use de/ate.")
        return self


class PagarResponse(BaseModel):
    quantidade: int
    total: Decimal
    ignorados: int = 0


class CalibracaoCreate(BaseModel):
    serial_number: str = Field(..., min_length=1, max_length=60)
    calibration_date: date
    value: Decimal = Field(..., gt=0)

    @field_validator("serial_number")
    @classmethod
    def _serie(cls, v):
        v = "".join(v.split()).upper()  # sem espaços e em maiúsculas: SN 1 = sn1
        if not v:
            raise ValueError("Informe o número de série.")
        return v

    @field_validator("value")
    @classmethod
    def _valor(cls, v):
        return _valor_no_limite(v)


class CalibracaoResponse(BaseModel):
    id: int
    opportunity_id: int
    serial_number: str
    calibration_date: date
    value: Decimal
    created_at: datetime
    commission_amount: Optional[Decimal] = None
    # Situação da comissão (pendente/paga) e qual recorrência do aparelho ela é (1 ou 2);
    # vazios quando a calibração não gerou comissão.
    commission_status: Optional[str] = None
    commission_paid_at: Optional[datetime] = None
    recorrencia: Optional[int] = None

    model_config = {"from_attributes": True}


class RenovacaoPrevista(BaseModel):
    """Uma das 2 renovações do aparelho: data prevista (ganho + 12/24 meses) e, se já lançada, a calibração."""
    ordem: int
    prevista_para: date
    valor_previsto: Optional[Decimal] = None
    calibracao: Optional[CalibracaoResponse] = None


class AparelhoDaOportunidade(BaseModel):
    numero: int
    serial_number: Optional[str] = None
    renovacoes: List[RenovacaoPrevista]


class CalibracoesDaOportunidadeResponse(BaseModel):
    aparelhos: List[AparelhoDaOportunidade]
    sem_comissao: List[CalibracaoResponse]


class LinhaTabelaDesconto(BaseModel):
    desconto: int
    cliente_paga: Optional[Decimal] = None
    taxa_empresa: Decimal
    valor_empresa: Optional[Decimal] = None
    taxa_hunter: Decimal
    valor_hunter: Optional[Decimal] = None


class TabelaDescontoResponse(BaseModel):
    """Quanto cada faixa de desconto paga, por aparelho, no preço de referência."""
    preco_referencia: Optional[Decimal] = None
    linhas: List[LinhaTabelaDesconto]
    renovacao_prevista: Optional[Decimal] = None


# ─── Dashboard ───────────────────────────────────────────────────────────────

class DashVendas(BaseModel):
    quantidade: int
    valor: str


class DashMes(BaseModel):
    mes: str
    quantidade: int
    valor: str


class DashPorVendedor(BaseModel):
    membro_id: Optional[int] = None
    nome: str
    quantidade: int
    valor: str


class DashCarteiraItem(BaseModel):
    partner_id: int
    nome: str
    situacao: str
    quantidade: int
    valor: str
    ultima_venda_em: Optional[datetime] = None
    ultima_atividade_em: Optional[datetime] = None
    dias_parada: Optional[int] = None
    parada: bool = False


class DashCarteiraHunterItem(DashCarteiraItem):
    # O prazo da indicação é do hunter.
    prazo_indicacao_ate: Optional[datetime] = None


class DashComissaoTipo(BaseModel):
    pendente: str
    pago: str


class DashComissoes(BaseModel):
    pendente: str
    pago: str
    por_tipo: Dict[str, DashComissaoTipo]


class DashVendedor(BaseModel):
    """Vendedor da equipe: nenhum campo de comissão."""
    visao: Literal["vendedor"]
    vendas: DashVendas
    serie: List[DashMes]


class DashEmpresa(BaseModel):
    visao: Literal["empresa"]
    vendas: DashVendas
    serie: List[DashMes]
    por_vendedor: List[DashPorVendedor]
    unidades: List[DashCarteiraItem]
    comissoes: DashComissoes


class DashHunter(BaseModel):
    visao: Literal["hunter"]
    vendas: DashVendas
    carteira_vendas: DashVendas
    serie: List[DashMes]
    carteira: List[DashCarteiraHunterItem]
    comissoes: DashComissoes


class DashRankingEmpresa(BaseModel):
    partner_id: int
    nome: str
    situacao: str
    quantidade: int
    valor: str


class DashRankingHunter(BaseModel):
    partner_id: int
    nome: str
    empresas: int
    quantidade: int
    valor: str


class DashHS(BaseModel):
    visao: Literal["hs"]
    vendas: DashVendas
    serie: List[DashMes]
    ranking_empresas: List[DashRankingEmpresa]
    ranking_hunters: List[DashRankingHunter]
    paradas: List[DashCarteiraItem]
    comissoes: DashComissoes


class DashFiltroItem(BaseModel):
    id: int
    nome: str


class DashFiltros(BaseModel):
    hunters: List[DashFiltroItem]
    empresas: List[DashFiltroItem]


DashboardResponse = Annotated[Union[DashVendedor, DashEmpresa, DashHunter, DashHS], Field(discriminator="visao")]
