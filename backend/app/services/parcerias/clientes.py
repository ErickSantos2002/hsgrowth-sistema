"""
Liga a oportunidade de parceiro ao Cliente e à Pessoa do CRM (os mesmos de Vendas).

O parceiro não vê a base da H&S: ele preenche "Empresa e contato" e o sistema acha
o Cliente pelo CNPJ (ou cria) e a Pessoa dentro dele (ou cria). O que ele preencher
atualiza o cadastro (vazio não apaga) e entra no histórico como "via Parceria".

Na edição, só o que o parceiro mudou naquela hora vai para o cadastro: reenviar o
formulário inteiro não desfaz uma correção que a H&S fez depois em Clientes/Pessoas.
"""
from typing import Any, Dict, Optional, Set

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.client import Client
from app.models.partner_opportunity import PartnerOpportunity
from app.models.person import Person
from app.models.user import User
from app.schemas.parcerias import email_aceito
from app.services import historico_cadastro
from app.services.parcerias.semaforo import _cnpj_sql

ORIGEM = "parceria"
# Campos da oportunidade que, mudando, refazem a ligação.
CAMPOS_DA_LIGACAO = (
    "cnpj", "company_name", "company_city", "company_state", "sector",
    "contact_name", "contact_role", "contact_phone", "contact_email",
)


def _telefone(digitos: Optional[str]) -> Optional[str]:
    """Telefone com a máscara da tela de Pessoas: (11) 98888-7777 ou (11) 3333-4444."""
    d = "".join(c for c in (digitos or "") if c.isdigit())
    if len(d) not in (10, 11):
        return digitos
    return f"({d[:2]}) {d[2:-4]}-{d[-4:]}"


def _preenchidos(valores: Dict[str, Any]) -> Dict[str, Any]:
    return {k: v.strip() if isinstance(v, str) else v for k, v in valores.items()
            if v is not None and (not isinstance(v, str) or v.strip())}


def _da_oportunidade(origem: Dict[str, str], valores: Dict[str, Any], ligado_antes: bool,
                     alterados: Optional[Set[str]]) -> Dict[str, Any]:
    """
    O que vai para o cadastro. Ligação nova (ou cadastro todo): tudo o que veio
    preenchido. Mesmo cadastro de antes: só os campos que o parceiro mudou agora.
    """
    if alterados is None or not ligado_antes:
        return valores
    return {k: v for k, v in valores.items() if origem[k] in alterados}


def _gravar(db: Session, user: User, entidade: str, existente: Optional[Any], novo: Any,
            valores: Dict[str, Any]) -> Any:
    """Atualiza o cadastro existente com o que veio preenchido, ou cria o novo."""
    if existente is None:
        db.add(novo)
        db.flush()
        historico_cadastro.registrar(db, user, entidade, novo, "CREATE", origem=ORIGEM)
        return novo
    antes = historico_cadastro.foto(existente, entidade)
    for campo, valor in valores.items():
        setattr(existente, campo, valor)
    historico_cadastro.registrar(db, user, entidade, existente, "UPDATE", antes=antes, origem=ORIGEM)
    return existente


# Campo do cadastro ← campo da oportunidade.
# Na tela de Cliente, "Empresa" é o name e "Nome Fantasia" é o company_name: a razão
# social que o parceiro digita vai para "Empresa"; o nome fantasia ele não informa.
DO_CLIENTE = {"name": "company_name", "city": "company_city", "state": "company_state", "sector": "sector"}
DA_PESSOA = {"name": "contact_name", "position": "contact_role",
             "email_commercial": "contact_email", "phone_commercial": "contact_phone"}


def _cliente(db: Session, user: User, op: PartnerOpportunity, alterados: Optional[Set[str]]) -> Client:
    existente = (
        db.query(Client)
        .filter(_cnpj_sql(Client.document) == op.cnpj, Client.is_deleted.is_(False))
        .order_by(Client.id)
        .first()
    )
    valores = _preenchidos({
        "name": op.company_name,
        "city": (op.company_city or "")[:100],
        "state": op.company_state,
        "sector": op.sector,
    })
    # O tipo de relacionamento não é tocado: toda empresa nasce Lead (regra da
    # consultoria) e Cliente não volta para Lead/Prospect.
    novo = None if existente else Client(
        document=op.cnpj, relationship_type="Lead", source="parceria", **valores,
    )
    ligado = existente is not None and existente.id == op.client_id
    return _gravar(db, user, "Client", existente, novo, _da_oportunidade(DO_CLIENTE, valores, ligado, alterados))


def _pessoa(db: Session, user: User, op: PartnerOpportunity, cliente: Client,
            alterados: Optional[Set[str]]) -> Optional[Person]:
    nome = (op.contact_name or "").strip()
    if not nome:
        return None
    da_empresa = db.query(Person).filter(Person.organization_id == cliente.id)
    email = (op.contact_email or "").strip().lower()
    existente = None
    if email:
        existente = da_empresa.filter(or_(
            func.lower(Person.email) == email,
            func.lower(Person.email_commercial) == email,
            func.lower(Person.email_personal) == email,
        )).order_by(Person.id).first()
    if existente is None:
        existente = da_empresa.filter(func.lower(Person.name) == nome.lower()).order_by(Person.id).first()
    valores = _preenchidos({
        "name": nome[:200],
        "position": op.contact_role,
        # E-mail gravado antes da regra nova pode não servir para Pessoas: fica só na oportunidade.
        "email_commercial": op.contact_email if op.contact_email and email_aceito(op.contact_email) else None,
        "phone_commercial": _telefone(op.contact_phone),
    })
    novo = None if existente else Person(organization_id=cliente.id, **valores)
    ligado = existente is not None and existente.id == op.person_id
    return _gravar(db, user, "Person", existente, novo, _da_oportunidade(DA_PESSOA, valores, ligado, alterados))


def vincular(db: Session, user: User, op: PartnerOpportunity, alterados: Optional[Set[str]] = None) -> None:
    """
    Acha ou cria o Cliente e a Pessoa e liga à oportunidade. `alterados` são os campos
    da oportunidade que mudaram nesta edição (None = cadastro novo, vale tudo).
    Quem chama faz o commit.
    """
    cliente = _cliente(db, user, op, alterados)
    pessoa = _pessoa(db, user, op, cliente, alterados)
    op.client_id = cliente.id
    op.person_id = pessoa.id if pessoa else None
