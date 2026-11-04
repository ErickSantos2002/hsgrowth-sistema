"""
Lado de Vendas da Consulta de CNPJ (Entrega 2): a faixa no card e o bloqueio
de quem cria ou vincula pela tela um card com CNPJ que um parceiro está
trabalhando (regra 3: vale o primeiro registro). Lead automático (usuário de
integração) e importação de planilha não bloqueiam. Admin e gerente passam,
e o card registra a liberação.
"""
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.client import Client
from app.models.user import User
from app.schemas.parcerias import AvisoParceriasItem
from app.services.parcerias import acesso, semaforo
from app.services.parcerias.cnpj import normalizar_cnpj


def _cnpj_do_cliente(db: Session, client_id: Optional[int]) -> Optional[str]:
    if not client_id:
        return None
    c = db.query(Client).filter(Client.id == client_id).first()
    cnpj = normalizar_cnpj(c.document) if c else ""
    return cnpj if len(cnpj) == 14 else None


def avisos(db: Session, client_id: Optional[int]) -> List[AvisoParceriasItem]:
    cnpj = _cnpj_do_cliente(db, client_id)
    if not cnpj:
        return []
    return [AvisoParceriasItem(parceiro=r.parceiro or "", desde=r.desde)
            for r in sorted(semaforo.protecao_de_parceiro(db, cnpj), key=lambda r: r.desde)]


def conferir(db: Session, user: User, client_id: Optional[int]) -> Optional[str]:
    """
    None quando o CNPJ está livre (ou quem cria é integração). Para admin e
    gerente devolve o texto a registrar no card; para os demais responde 409.
    """
    if getattr(user, "is_integracao", False):
        return None
    lista = avisos(db, client_id)
    if not lista:
        return None
    primeiro = lista[0]
    onde = f"parceiro {primeiro.parceiro} (Programa de Parceiros) desde {primeiro.desde:%d/%m/%Y}"
    if acesso.eh_gestao(user):
        return f"Card com CNPJ do {onde}, liberado por {user.name}"
    raise HTTPException(status.HTTP_409_CONFLICT, f"Este CNPJ está com o {onde}. Fale com o gerente.")


def registrar(db: Session, card_id: int, user: User, texto: Optional[str]) -> None:
    if not texto:
        return
    from app.repositories.activity_repository import ActivityRepository
    ActivityRepository(db).create(
        card_id=card_id, user_id=user.id, activity_type="parcerias_cnpj",
        description=texto, activity_metadata={},
    )
