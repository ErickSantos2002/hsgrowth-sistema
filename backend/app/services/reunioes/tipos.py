"""
Os tipos de reunião e o título que cada um monta.

A consultora avalia a reunião de apresentação; uma conversa de dúvidas
receberia nota baixa por não ter feito o que ninguém esperava que ela fizesse.
O tipo é o que separa as duas — e fica aqui, no código, ao lado da régua:
mudar quais reuniões são avaliadas é mudança de versão, não configuração de
tela.

O título é montado a partir do tipo para o padrão não depender de cada
vendedor lembrar de escrever igual.
"""
from dataclasses import dataclass
from typing import Optional

TAMANHO_MAXIMO_TITULO = 255  # `card_tasks.title` é VARCHAR(255)


@dataclass(frozen=True)
class TipoDeReuniao:
    id: str
    rotulo: str
    avaliado: bool


TIPOS = (
    TipoDeReuniao("apresentacao_phoebus", "Apresentação Phoebus", True),
    TipoDeReuniao("duvidas_phoebus", "Dúvidas Phoebus", False),
    TipoDeReuniao("apresentacao", "Apresentação", False),
    TipoDeReuniao("duvidas", "Dúvidas", False),
    TipoDeReuniao("outra", "Outra", False),
)

# Em "Outra" vale o título que o vendedor escreveu
TIPO_LIVRE = "outra"


def tipo_por_id(tipo_id: Optional[str]) -> Optional[TipoDeReuniao]:
    return next((t for t in TIPOS if t.id == tipo_id), None)


def e_avaliado(tipo_id: Optional[str]) -> bool:
    """
    Diz se este tipo entra na avaliação automática.

    Reunião sem tipo — todas as que já existem — fica de fora: ninguém
    escolheu tipo quando elas foram criadas, e assumir um seria inventar dado.
    """
    tipo = tipo_por_id(tipo_id)
    return bool(tipo and tipo.avaliado)


def nome_da_empresa(card) -> str:
    """
    A razão social do cliente; faltando, o nome do negócio.

    O card costuma se chamar como a empresa ("RS TRANSPORTES E LOGISTICA
    LTDA"), então a reunião sempre nasce com nome — sem travar quem só quer
    agendar.
    """
    if card is None:
        return ""

    cliente = getattr(card, "client", None)
    razao_social = (getattr(cliente, "company_name", "") or "").strip()
    if razao_social:
        return razao_social

    return (getattr(card, "title", "") or "").strip()


def montar_titulo(tipo_id: Optional[str], card) -> Optional[str]:
    """
    Returns:
        O título padronizado, ou None quando o tipo é livre ou desconhecido —
        aí vale o que o vendedor digitou.
    """
    tipo = tipo_por_id(tipo_id)
    if not tipo or tipo.id == TIPO_LIVRE:
        return None

    empresa = nome_da_empresa(card)
    titulo = f"{tipo.rotulo} - {empresa}" if empresa else tipo.rotulo
    return titulo[:TAMANHO_MAXIMO_TITULO].strip()
