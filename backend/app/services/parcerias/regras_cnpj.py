"""
Regras da Consulta de CNPJ num ponto só: semáforo, limite diário de consultas e trava
de Vendas entre vendedores. 0 dias desliga a regra. Sem linha no banco (testes), valem
os padrões.
"""
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.cnpj_rules_config import CnpjRulesConfig
from app.models.user import User


@dataclass(frozen=True)
class Regras:
    protecao: int = 10
    compra: int = 30
    perda: int = 90
    limite_consultas: int = 20
    travar_vendedores: bool = True


PADRAO = Regras()


def _linha(db: Session):
    return db.query(CnpjRulesConfig).order_by(CnpjRulesConfig.id).first()


def regras(db: Session) -> Regras:
    c = _linha(db)
    if c is None:
        return PADRAO
    return Regras(c.protection_days, c.recent_purchase_days, c.recent_loss_days,
                  c.daily_query_limit, bool(c.block_between_sellers))


def linha_ou_padrao(db: Session) -> CnpjRulesConfig:
    """A linha para a tela (sem gravar nada quando falta)."""
    return _linha(db) or CnpjRulesConfig(
        protection_days=PADRAO.protecao, recent_purchase_days=PADRAO.compra,
        recent_loss_days=PADRAO.perda, daily_query_limit=PADRAO.limite_consultas,
        block_between_sellers=PADRAO.travar_vendedores,
    )


def salvar(db: Session, user: User, campos: dict) -> CnpjRulesConfig:
    c = _linha(db)
    if c is None:
        c = linha_ou_padrao(db)
        db.add(c)
    for k, v in campos.items():
        if v is not None:
            setattr(c, k, v)
    c.updated_by_id = user.id
    c.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(c)
    return c
