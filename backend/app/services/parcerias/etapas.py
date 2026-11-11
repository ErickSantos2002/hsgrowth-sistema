"""
Etapas fixas dos dois boards de Parcerias e as travas das oportunidades.

As etapas ficam no código, não em listas editáveis: as travas dependem delas,
e renomear ou reordenar uma lista pela tela quebraria a regra.

A Aquisição tem só 4 situações (potencial, convidado, ativado, bloqueado) e o
card não anda na mão: elas mudam com o convite, o aceite dos termos e o Bloquear.

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
    Etapa("potencial", "Potencial"),
    Etapa("convidado", "Convidado"),
    Etapa("ativado", "Ativado"),
    Etapa("bloqueado", "Bloqueado"),
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


def _exigencias_da_oportunidade(o) -> Dict[str, Optional[str]]:
    # A elegibilidade não trava: a H&S valida quando quiser, até depois do Ganho.
    return {
        "proposta": None if o.expected_close_date else (
            "Preencha a data esperada de fechamento antes de ir para Negociação."
        ),
        "aguardando_pedido": None if o.modality in ("venda", "locacao") else (
            "Informe se é venda ou locação antes de marcar como Ganho."
        ),
    }


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
