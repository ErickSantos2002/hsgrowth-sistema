"""
Ativação automática do parceiro (seção 3.1 do documento).

Onboarding concluído não é parceiro ativado: precisa de evidência prática de uso
do canal. A primeira evidência fica gravada (qual, quando e de qual
oportunidade); o card passa de Ativação para Ativado na hora, ou quando entrar
em Ativação, se a evidência veio antes.
"""
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.models.partner import Partner
from app.models.partner_opportunity import PartnerOpportunity
from app.models.user import User
from app.services.parcerias import atividades
from app.services.parcerias.etapas import TravaError, validar_mudanca_parceiro

EVIDENCIAS = {
    "oportunidade_validada": "Oportunidade validada",
    "proposta_enviada": "Proposta enviada",
    "primeira_venda": "Primeira venda",
}


def registrar_evidencia(db: Session, oportunidade: PartnerOpportunity, evidencia: str,
                        user: Optional[User]) -> None:
    """Quem chama faz o commit."""
    parceiro = oportunidade.partner
    if parceiro.activation_evidence is None:
        parceiro.activation_evidence = evidencia
        parceiro.activation_opportunity_id = oportunidade.id
        parceiro.activated_at = datetime.utcnow()
        atividades.registrar_evento(
            db, user,
            f"Critério de ativação cumprido: {EVIDENCIAS[evidencia]} ({oportunidade.title})",
            partner_id=parceiro.id,
        )
    promover_se_ativo(db, parceiro, user)


def promover_se_ativo(db: Session, parceiro: Partner, user: Optional[User]) -> bool:
    if parceiro.stage != "ativacao" or not parceiro.activation_evidence:
        return False
    try:
        validar_mudanca_parceiro(parceiro, "ativado", "sistema", automatico=True)
    except TravaError:
        return False
    parceiro.stage = "ativado"
    atividades.registrar_evento(db, user, "Parceiro ativado automaticamente", partner_id=parceiro.id, tipo="card_won")
    return True
