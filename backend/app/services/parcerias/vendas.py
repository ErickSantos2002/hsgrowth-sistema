"""
Lado de Vendas da Consulta de CNPJ (Entrega 2): a faixa no card e o bloqueio
de quem cria ou vincula pela tela um card com CNPJ que um parceiro está
trabalhando (regra 3: vale o primeiro registro). Lead automático (usuário de
integração) e importação de planilha não bloqueiam. Desde a 1.11.25 também
bloqueia o CNPJ que OUTRO vendedor está trabalhando (mesmas regras do semáforo,
com os prazos da configuração). Admin e gerente liberam com justificativa, e o
card registra a liberação.
"""
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.client import Client
from app.models.user import User
from app.schemas.parcerias import AvisoParceriasItem
from app.services.parcerias import acesso, regras_cnpj, semaforo
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


def _com_quem(db: Session, user: User, cnpj: str, ignorar_card_id: Optional[int]) -> Optional[str]:
    """Com quem o CNPJ está (texto), ou None se está livre para este usuário. Parceiro primeiro."""
    regras = regras_cnpj.regras(db)
    parceiros = sorted(semaforo.protecao_de_parceiro(db, cnpj, regras=regras), key=lambda r: r.desde)
    if parceiros:
        p = parceiros[0]
        return f"com o parceiro {p.parceiro} (Programa de Parceiros) desde {p.desde:%d/%m/%Y}"
    if not regras.travar_vendedores:
        return None
    cards = semaforo.protecao_de_vendas(db, cnpj, user.id, ignorar_card_id, regras=regras)
    if not cards:
        return None
    c = cards[0]
    texto = f'com {c.responsavel or "outro vendedor"} no card "{c.titulo}" ({c.onde}): {semaforo.MOTIVOS[c.motivo].lower()}'
    if c.libera_em:
        texto += f", libera em {c.libera_em:%d/%m/%Y}"
    return texto


def conferir(db: Session, user: User, client_id: Optional[int], justificativa: Optional[str] = None,
             ignorar_card_id: Optional[int] = None) -> Optional[str]:
    """
    None quando o CNPJ está livre (ou quem cria é integração). Admin e gerente com
    justificativa passam e recebem o texto a registrar no card; os demais (e a gestão
    sem justificativa) recebem 409 com {code, message, pode_liberar}.
    `ignorar_card_id`: o card de origem (vincular, reabrir, clonar) não bloqueia.
    """
    if getattr(user, "is_integracao", False):
        return None
    cnpj = _cnpj_do_cliente(db, client_id)
    if not cnpj:
        return None
    com_quem = _com_quem(db, user, cnpj, ignorar_card_id)
    if not com_quem:
        return None
    gestao = acesso.eh_gestao(user)
    motivo = (justificativa or "").strip()
    if gestao and motivo:
        return f"CNPJ liberado por {user.name}: {motivo} (estava {com_quem})"
    raise HTTPException(status.HTTP_409_CONFLICT, {
        "code": "cnpj_bloqueado",
        "message": (f"Este CNPJ está {com_quem}. Para seguir mesmo assim, escreva a justificativa."
                    if gestao else f"Este CNPJ está {com_quem}. Fale com o gerente."),
        "pode_liberar": gestao,
    })


def registrar(db: Session, card_id: int, user: User, texto: Optional[str]) -> None:
    if not texto:
        return
    from app.repositories.activity_repository import ActivityRepository
    ActivityRepository(db).create(
        card_id=card_id, user_id=user.id, activity_type="parcerias_cnpj",
        description=texto, activity_metadata={},
    )
