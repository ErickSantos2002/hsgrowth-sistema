"""
Histórico de alterações de Clientes e Pessoas.

Cada criação/edição grava no audit_logs a foto completa do cadastro (antes e
depois). A tela mostra só o que mudou, com quem mudou e de onde veio
(ex.: "via Parceria", quando a equipe do parceiro atualiza pela oportunidade).
"""
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from fastapi import Request
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.client import Client
from app.models.user import User
from app.schemas.historico import HistoricoItem, HistoricoMudanca

CAMPOS: Dict[str, Dict[str, str]] = {
    "Client": {
        "company_name": "Razão social", "name": "Nome", "document": "CNPJ/CPF",
        "email": "E-mail", "phone": "Telefone", "address": "Endereço", "city": "Cidade",
        "state": "UF", "country": "País", "website": "Site", "notes": "Observações",
        "cnae": "CNAE", "linkedin_url": "LinkedIn", "relationship_type": "Tipo de relacionamento",
        "commercial_activity": "Atividade comercial", "sector": "Setor",
        "employee_count": "Colaboradores", "annual_revenue": "Faturamento anual", "is_active": "Ativo",
    },
    "Person": {
        "name": "Nome", "first_name": "Primeiro nome", "last_name": "Sobrenome",
        "email": "E-mail", "email_commercial": "E-mail comercial", "email_personal": "E-mail pessoal",
        "email_alternative": "E-mail alternativo", "phone": "Telefone",
        "phone_commercial": "Telefone comercial", "phone_whatsapp": "WhatsApp",
        "phone_alternative": "Telefone alternativo", "phone_extra1": "Telefone extra 1",
        "phone_extra2": "Telefone extra 2", "position": "Cargo", "area": "Área",
        "linkedin": "LinkedIn", "instagram": "Instagram", "facebook": "Facebook",
        "organization_id": "Empresa", "is_active": "Ativo",
    },
}
ORIGEM = "_origem"  # marca guardada junto da foto "depois" (ex.: "parceria")
ORIGENS = {"parceria": "via Parceria"}


def _json(valor: Any) -> Any:
    if isinstance(valor, (date, datetime)):
        return valor.isoformat()
    if isinstance(valor, Decimal):
        return float(valor)
    return valor


def foto(obj: Any, entidade: str) -> Dict[str, Any]:
    """Os campos do cadastro como estão agora (para gravar antes/depois)."""
    return {campo: _json(getattr(obj, campo, None)) for campo in CAMPOS[entidade]}


def registrar(db: Session, user: Optional[User], entidade: str, obj: Any, acao: str,
              antes: Optional[Dict[str, Any]] = None, origem: Optional[str] = None,
              request: Optional[Request] = None, descricao: Optional[str] = None) -> None:
    """Grava a alteração no audit_logs. Edição sem mudança não grava. Quem chama faz o commit."""
    depois = None if acao == "DELETE" else foto(obj, entidade)
    if acao == "UPDATE" and antes == depois:
        return
    if depois is not None and origem:
        depois = {**depois, ORIGEM: origem}
    nome = getattr(obj, "display_name", None) or getattr(obj, "name", None) or f"ID {obj.id}"
    tipo = "Cliente" if entidade == "Client" else "Pessoa"
    verbo = {"CREATE": "criado", "UPDATE": "atualizado", "DELETE": "deletado"}[acao]
    if entidade == "Person":
        verbo = verbo[:-1] + "a"
    db.add(AuditLog(
        user_id=user.id if user else None,
        action=acao,
        entity_type=entidade,
        entity_id=obj.id,
        description=descricao or f"{tipo} {verbo}: {nome}" + (f" ({ORIGENS[origem]})" if origem in ORIGENS else ""),
        data_before=antes,
        data_after=depois,
        ip_address=(request.client.host if request and request.client else None),
        user_agent=(request.headers.get("user-agent") if request else None),
    ))


def _texto(campo: str, valor: Any, empresas: Dict[int, str]) -> Optional[str]:
    if valor is None or valor == "":
        return None
    if isinstance(valor, bool):
        return "Sim" if valor else "Não"
    if campo == "organization_id":
        return empresas.get(valor, f"#{valor}")
    return str(valor)


def listar(db: Session, entidade: str, entity_id: int) -> List[HistoricoItem]:
    """Alterações do cadastro, mais recente primeiro, só com os campos que mudaram."""
    logs = (
        db.query(AuditLog)
        .filter(AuditLog.entity_type == entidade, AuditLog.entity_id == entity_id,
                AuditLog.action.in_(("CREATE", "UPDATE")))
        .order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
        .all()
    )
    rotulos = CAMPOS[entidade]
    ids_empresa = {
        v for log in logs for d in (log.data_before or {}, log.data_after or {})
        for k, v in d.items() if k == "organization_id" and v
    }
    empresas = {
        c.id: c.display_name
        for c in db.query(Client).filter(Client.id.in_(ids_empresa)).all()
    } if ids_empresa else {}

    itens = []
    for log in logs:
        antes, depois = log.data_before or {}, log.data_after or {}
        mudancas = []
        for campo, rotulo in rotulos.items():
            if campo not in depois:
                continue
            if log.action == "CREATE":
                novo = _texto(campo, depois[campo], empresas)
                if novo is not None and campo != "is_active":
                    mudancas.append(HistoricoMudanca(campo=rotulo, antes=None, depois=novo))
            elif campo in antes and antes[campo] != depois[campo]:
                mudancas.append(HistoricoMudanca(
                    campo=rotulo,
                    antes=_texto(campo, antes[campo], empresas),
                    depois=_texto(campo, depois[campo], empresas),
                ))
        if not mudancas:
            continue
        itens.append(HistoricoItem(
            id=log.id,
            quando=log.created_at,
            usuario=log.user.name if log.user else None,
            acao="criado" if log.action == "CREATE" else "alterado",
            origem=ORIGENS.get(depois.get(ORIGEM)),
            mudancas=mudancas,
        ))
    return itens
