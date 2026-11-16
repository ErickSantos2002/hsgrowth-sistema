"""
Alertas do Programa de Parceiros (Entrega 4), uma vez por dia às 8h.

1. Oportunidade perto de perder a proteção do CNPJ (3 dias antes) e no dia em
   que perdeu. Registrar atividade muda a data de queda e abre um ciclo novo.
2. Empresa ou hunter convidado que não aceitou os termos: do dia 23 e no dia 30.

Sino + e-mail. O e-mail só sai quando o aviso do sino foi criado (preferência
ligada, login ativo, ainda não avisado com a mesma referência): reiniciar a API
não repete nada. Os avisos de "perdeu" e "30 dias" só saem numa janela de 2
dias, para não disparar sobre casos antigos quando a função entrar no ar.
"""
import logging
from datetime import datetime, timedelta
from typing import List, Optional

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.partner import Partner
from app.models.partner_activity import PartnerActivity
from app.models.partner_opportunity import PartnerOpportunity
from app.models.role import Role
from app.models.user import User
from app.services import emails_de_acesso, envio_email
from app.services.notificacoes.enviar import notificar
from app.services.notificacoes.horario import BRASILIA
from app.services.parcerias import regras_cnpj
from app.services.parcerias.semaforo import data_de_queda

logger = logging.getLogger(__name__)

AVISO_ANTES_DIAS = 3
JANELA = timedelta(days=2)
LOGINS_DO_PARCEIRO = ("partner", "hunter")


def _dia_local(quando: datetime):
    return (quando + BRASILIA).date()


def _ativos(q):
    return q.filter(User.is_active.is_(True), User.is_deleted.is_(False))


def _logins_do_parceiro(db: Session, partner_id: Optional[int]) -> List[User]:
    if not partner_id:
        return []
    return _ativos(
        db.query(User).join(Role, Role.id == User.role_id)
        .filter(User.partner_id == partner_id, Role.name.in_(LOGINS_DO_PARCEIRO))
    ).order_by(User.id).all()


def _usuario(db: Session, user_id: Optional[int]) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first() if user_id else None


def _sem_repetir(pessoas) -> List[User]:
    vistos, saida = set(), []
    for u in pessoas:
        if u is not None and u.id not in vistos:
            vistos.add(u.id)
            saida.append(u)
    return saida


def _avisar(db: Session, user: User, tipo: str, titulo: str, mensagem: str,
            link: str, referencia: str) -> int:
    """Sino e, se ele foi criado, e-mail. Returns: 1 se avisou, 0 se não."""
    if notificar(db, user.id, tipo, titulo, mensagem, link=link, referencia=referencia) is None:
        return 0
    if user.email:
        url = f"{settings.FRONTEND_URL.rstrip('/')}{link}"
        assunto, html, texto = emails_de_acesso.aviso(user.name, titulo, mensagem, url)
        try:
            envio_email.enviar_email(user.email, assunto, html, texto)
        except Exception as e:  # o aviso do sino já valeu
            logger.error(f"[ALERTAS PARCERIAS] e-mail para {user.email} falhou: {e}")
    return 1


# ─── 1. Proteção do CNPJ ─────────────────────────────────────────────────────

def _destinatarios_da_oportunidade(db: Session, op: PartnerOpportunity) -> List[User]:
    vendedor = _usuario(db, op.seller.user_id) if op.seller else None
    responsavel = _usuario(db, op.partner.hs_owner_id) if op.partner else None
    return _sem_repetir([vendedor, *_logins_do_parceiro(db, op.partner_id), responsavel])


def _texto_protecao(op: PartnerOpportunity, cai: datetime, agora: datetime, dias: int):
    """(sufixo da referência, título, mensagem) ou None se não é dia de avisar."""
    nome = f'"{op.title}" ({op.company_name})'
    if cai >= agora:
        faltam = (_dia_local(cai) - _dia_local(agora)).days
        if faltam > AVISO_ANTES_DIAS:
            return None
        quando = "hoje" if faltam == 0 else ("em 1 dia" if faltam == 1 else f"em {faltam} dias")
        return ("antes", f"Oportunidade perde a proteção {quando}",
                f"{nome} perde a proteção do CNPJ em {(cai + BRASILIA):%d/%m}. "
                "Registre uma atividade para manter.")
    if agora - cai < JANELA:
        return ("perdeu", "Oportunidade perdeu a proteção do CNPJ",
                f"{nome} ficou {dias} dias sem atividade. O CNPJ ficou livre para outros "
                "parceiros e para Vendas.")
    return None


def avisar_protecao(db: Session, agora: datetime) -> int:
    """Returns: quantos avisos foram criados."""
    dias = regras_cnpj.regras(db).protecao
    if dias <= 0:
        return 0
    ops = db.query(PartnerOpportunity).filter(
        PartnerOpportunity.is_deleted.is_(False),
        PartnerOpportunity.stage.notin_(("ganho", "perdido")),
        PartnerOpportunity.eligibility_status != "rejeitada",
    ).all()
    if not ops:
        return 0

    prazos = {}
    for a in db.query(PartnerActivity).filter(
        PartnerActivity.opportunity_id.in_([o.id for o in ops]),
        PartnerActivity.category == "atividade",
        PartnerActivity.is_completed.is_(False),
    ).all():
        prazos.setdefault(a.opportunity_id, []).append(a.due_date)

    total = 0
    for op in ops:
        if op.partner is not None and op.partner.stage == "bloqueado":
            continue
        cai = data_de_queda(prazos.get(op.id, []), [op.last_activity_at, op.created_at], dias=dias)
        texto = _texto_protecao(op, cai, agora, dias) if cai else None
        if not texto:
            continue
        sufixo, titulo, mensagem = texto
        referencia = f"parc_protecao:{op.id}:{cai:%Y%m%d%H%M}:{sufixo}"
        for u in _destinatarios_da_oportunidade(db, op):
            total += _avisar(db, u, "parcerias_protecao", titulo, mensagem,
                             f"/parcerias/oportunidades/{op.id}", referencia)
    return total


# ─── 2. Convite sem ativação ─────────────────────────────────────────────────

DIA_AVISO_CONVITE = 23
DIA_LIMITE_CONVITE = 30


def _admins(db: Session) -> List[User]:
    return _ativos(
        db.query(User).join(Role, Role.id == User.role_id).filter(Role.name == "admin")
    ).order_by(User.id).all()


def _convidado_desde(db: Session, p: Partner) -> Optional[datetime]:
    """Criação do primeiro login do parceiro (o convite). Sem login, None."""
    datas = [u.created_at for u in db.query(User).join(Role, Role.id == User.role_id).filter(
        User.partner_id == p.id, Role.name.in_(LOGINS_DO_PARCEIRO)).all() if u.created_at]
    return min(datas) if datas else None


def avisar_convites(db: Session, agora: datetime) -> int:
    """Returns: quantos avisos foram criados."""
    total = 0
    for p in db.query(Partner).filter(Partner.is_deleted.is_(False), Partner.stage == "convidado").all():
        desde = _convidado_desde(db, p)
        if desde is None:
            continue
        dias = (_dia_local(agora) - _dia_local(desde)).days
        if DIA_AVISO_CONVITE <= dias < DIA_LIMITE_CONVITE:
            marco, titulo = DIA_AVISO_CONVITE, "Convite sem ativação"
            faltam = DIA_LIMITE_CONVITE - dias
            mensagem = (f"{p.name} foi convidado(a) em {(desde + BRASILIA):%d/%m} e ainda não aceitou "
                        f"os termos. Faltam {faltam} dia{'s' if faltam > 1 else ''} para completar 30.")
        elif DIA_LIMITE_CONVITE <= dias < DIA_LIMITE_CONVITE + JANELA.days:
            marco, titulo = DIA_LIMITE_CONVITE, "Convite: 30 dias sem ativação"
            mensagem = f"{p.name} completou 30 dias sem aceitar os termos. Reenvie o convite ou bloqueie."
        else:
            continue

        referencia = f"parc_convite:{p.id}:{marco}"
        responsavel = _usuario(db, p.hs_owner_id)
        hs = [responsavel] if responsavel and responsavel.is_active and not responsavel.is_deleted else _admins(db)
        for u in _sem_repetir(hs):
            total += _avisar(db, u, "parcerias_convite", titulo, mensagem,
                             f"/parcerias/aquisicao/{p.id}", referencia)
        for u in _logins_do_parceiro(db, p.indicated_by_partner_id):
            total += _avisar(db, u, "parcerias_convite", titulo, mensagem,
                             "/parcerias/indicacoes", referencia)
    return total


def avisar_parcerias(db: Session, agora: datetime) -> int:
    """O job diário: os dois alertas."""
    return avisar_protecao(db, agora) + avisar_convites(db, agora)
