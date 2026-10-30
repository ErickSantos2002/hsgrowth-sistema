"""
Etapas fixas dos dois boards de Parcerias e as travas para avançar.

As etapas ficam no código, não em listas editáveis: as travas dependem delas,
e renomear ou reordenar uma lista pela tela quebraria a regra.

A trava é acumulada: para estar numa etapa, o card cumpre as exigências de
todas as etapas anteriores. Assim pular etapa não fura a trava.
"""
from dataclasses import dataclass
from typing import Dict, Optional, Sequence


@dataclass(frozen=True)
class Etapa:
    codigo: str
    nome: str


ETAPAS_AQUISICAO = (
    Etapa("potencial", "Potencial Parceiro"),
    Etapa("qualificacao", "Qualificação"),
    Etapa("proposta", "Proposta"),
    Etapa("formalizacao", "Formalização"),
    Etapa("onboarding", "Onboarding"),
    Etapa("ativacao", "Ativação"),
    Etapa("ativado", "Ativado"),
    Etapa("perdido", "Perdido"),
)

ETAPAS_OPORTUNIDADE = (
    Etapa("novo_lead", "Novo Lead"),
    Etapa("oportunidade", "Oportunidade"),
    Etapa("proposta", "Proposta"),
    Etapa("negociacao", "Negociação"),
    Etapa("aguardando_pedido", "Aguardando Pedido"),
    Etapa("ganho", "Ganho"),
    Etapa("perdido", "Perdido"),
)

GESTAO = ("admin", "manager")


class TravaError(Exception):
    """Mudança de etapa barrada. A mensagem vai para a tela (422)."""


def nome_da_etapa(etapas: Sequence[Etapa], codigo: str) -> str:
    for etapa in etapas:
        if etapa.codigo == codigo:
            return etapa.nome
    return codigo


def _conferir_destino(etapas: Sequence[Etapa], destino: str) -> None:
    if destino not in [e.codigo for e in etapas]:
        raise TravaError(f"Etapa desconhecida: {destino}")


def _checar(etapas: Sequence[Etapa], exigencias: Dict[str, Optional[str]], destino: str) -> None:
    """Percorre as etapas anteriores ao destino; a primeira exigência faltando barra."""
    for etapa in etapas:
        if etapa.codigo == destino:
            return
        falta = exigencias.get(etapa.codigo)
        if falta:
            raise TravaError(falta)


def _exigencias_do_parceiro(p) -> Dict[str, Optional[str]]:
    """Etapa → o que falta para sair dela (None = nada)."""
    tem_contato = bool((p.main_contact_name or "").strip()) and bool(
        (p.main_contact_phone or "").strip() or (p.main_contact_email or "").strip()
    )
    return {
        "potencial": None if tem_contato and p.hs_owner_id else (
            "Preencha o contato principal (nome e telefone ou e-mail) e o Responsável H&S "
            "antes de ir para Qualificação."
        ),
        "qualificacao": None if p.qualification_status in ("aderente", "parcialmente_aderente") else (
            "O parceiro precisa estar Aderente ou Parcialmente aderente para seguir além da Qualificação."
        ),
        "onboarding": None if p.onboarding_date else (
            "Preencha a data de onboarding antes de ir para Ativação."
        ),
    }


def _exigencias_da_oportunidade(o) -> Dict[str, Optional[str]]:
    return {
        "novo_lead": None if o.eligibility_status == "validada" else (
            "A elegibilidade precisa estar Validada para sair de Novo Lead."
        ),
        "proposta": None if o.expected_close_date else (
            "Preencha a data esperada de fechamento antes de ir para Negociação."
        ),
        "aguardando_pedido": None if o.modality in ("venda", "locacao") else (
            "Informe se é venda ou locação antes de marcar como Ganho."
        ),
    }


def validar_mudanca_parceiro(parceiro, destino: str, perfil: str, automatico: bool = False) -> None:
    _conferir_destino(ETAPAS_AQUISICAO, destino)
    origem = parceiro.stage
    if destino == origem:
        return
    if origem in ("ativado", "perdido") and perfil not in GESTAO and not automatico:
        raise TravaError("Só admin ou gerente tiram o parceiro de Ativado ou de Perdido.")
    if destino == "perdido":
        if perfil not in GESTAO:
            raise TravaError("Só admin ou gerente marcam o parceiro como Perdido.")
        if not (parceiro.loss_reason or "").strip():
            raise TravaError("Informe o motivo da perda.")
        return
    if destino == "ativado" and not automatico:
        raise TravaError(
            "O parceiro vai para Ativado sozinho, quando uma oportunidade dele for validada, "
            "chegar em Proposta ou for ganha."
        )
    progressao = [e for e in ETAPAS_AQUISICAO if e.codigo != "perdido"]
    _checar(progressao, _exigencias_do_parceiro(parceiro), destino)


def validar_mudanca_oportunidade(oportunidade, destino: str, perfil: str) -> None:
    _conferir_destino(ETAPAS_OPORTUNIDADE, destino)
    origem = oportunidade.stage
    if destino == origem:
        return
    if origem in ("ganho", "perdido") and perfil not in GESTAO:
        raise TravaError("Só admin ou gerente reabrem uma oportunidade ganha ou perdida.")
    if destino == "perdido":
        if not (oportunidade.loss_reason or "").strip():
            raise TravaError("Informe o motivo da perda.")
        return
    progressao = [e for e in ETAPAS_OPORTUNIDADE if e.codigo != "perdido"]
    _checar(progressao, _exigencias_da_oportunidade(oportunidade), destino)
