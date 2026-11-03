"""
Consulta de CNPJ (Entrega 2): limite diário do parceiro, histórico e a
resposta filtrada por perfil. O semáforo em si fica em semaforo.py.
"""
from datetime import date, datetime, time, timezone
from typing import Optional
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.cnpj_consulta import CnpjConsulta
from app.models.user import User
from app.schemas.parcerias import (
    ConsultaCnpjResponse,
    ConsultaHistoricoItem,
    ConsultaHistoricoResponse,
    RegistroSemaforo,
)
from app.services.parcerias import acesso, semaforo

LIMITE_CONSULTAS_PARCEIRO = 20
FUSO = ZoneInfo("America/Sao_Paulo")
POR_PAGINA = 50


def _inicio_do_dia_utc(agora: Optional[datetime] = None) -> datetime:
    """Meia-noite de hoje em São Paulo, em UTC sem fuso (como o banco grava)."""
    agora = (agora or datetime.utcnow()).replace(tzinfo=timezone.utc).astimezone(FUSO)
    meia_noite = datetime.combine(agora.date(), time.min, tzinfo=FUSO)
    return meia_noite.astimezone(timezone.utc).replace(tzinfo=None)


def limite_de(user: User) -> Optional[int]:
    return LIMITE_CONSULTAS_PARCEIRO if acesso.eh_parceiro(user) else None


def feitas_hoje(db: Session, user: User) -> int:
    return db.query(CnpjConsulta).filter(
        CnpjConsulta.user_id == user.id,
        CnpjConsulta.created_at >= _inicio_do_dia_utc(),
    ).count()


def consultar(db: Session, user: User, cnpj: str) -> ConsultaCnpjResponse:
    limite = limite_de(user)
    if limite is not None and feitas_hoje(db, user) >= limite:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            f"Limite diário de {limite} consultas atingido. Volta a liberar amanhã.",
        )
    s = semaforo.situacao(db, cnpj)
    db.add(CnpjConsulta(
        user_id=user.id, partner_id=user.partner_id if acesso.eh_parceiro(user) else None,
        cnpj=cnpj, resultado=s.resultado, motivo=s.motivo,
    ))
    db.commit()
    return resposta(cnpj, s, user)


def resposta(cnpj: str, s: semaforo.Situacao, user: User) -> ConsultaCnpjResponse:
    registros = [] if acesso.eh_parceiro(user) else [
        RegistroSemaforo(
            tipo=r.tipo, id=r.id, titulo=r.titulo, onde=r.onde, responsavel=r.responsavel,
            cnpj=r.cnpj, motivo=r.motivo, libera_em=r.libera_em, parceiro=r.parceiro, desde=r.desde,
        )
        for r in s.registros
    ]
    return ConsultaCnpjResponse(
        cnpj=cnpj, resultado=s.resultado, motivo=s.motivo, frase=s.frase,
        libera_em=s.libera_em, registros=registros,
    )


def historico(db: Session, user: User, user_id: Optional[int] = None, partner_id: Optional[int] = None,
              desde: Optional[date] = None, ate: Optional[date] = None,
              pagina: int = 1) -> ConsultaHistoricoResponse:
    acesso.exigir_gestao(user)
    q = db.query(CnpjConsulta)
    if user_id:
        q = q.filter(CnpjConsulta.user_id == user_id)
    if partner_id:
        q = q.filter(CnpjConsulta.partner_id == partner_id)
    if desde:
        q = q.filter(CnpjConsulta.created_at >= datetime.combine(desde, time.min))
    if ate:
        q = q.filter(CnpjConsulta.created_at <= datetime.combine(ate, time.max))
    total = q.count()
    linhas = (
        q.order_by(CnpjConsulta.created_at.desc(), CnpjConsulta.id.desc())
        .offset((pagina - 1) * POR_PAGINA).limit(POR_PAGINA).all()
    )
    return ConsultaHistoricoResponse(total=total, itens=[
        ConsultaHistoricoItem(
            id=c.id, created_at=c.created_at, cnpj=c.cnpj, resultado=c.resultado, motivo=c.motivo,
            user_name=c.user.name if c.user else None,
            perfil=acesso.perfil(c.user) if c.user else None,
            partner_name=c.partner.name if c.partner else None,
        )
        for c in linhas
    ])
