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
    O nome do cliente; faltando, o nome do negócio.

    Vale a razão social e, quando ela está vazia, o nome do cadastro — é a
    mesma regra do `Client.display_name`, e é onde o nome da empresa costuma
    estar de verdade: em 23/09 um cliente com "Teste" no nome e razão social
    vazia fez a reunião nascer com o nome do negócio no título.

    Sem cliente nenhum, sobra o nome do negócio, que costuma ser o nome da
    empresa ("RS TRANSPORTES E LOGISTICA LTDA") — assim a reunião sempre nasce
    com nome, sem travar quem só quer agendar.
    """
    if card is None:
        return ""

    cliente = getattr(card, "client", None)
    if cliente is not None:
        for campo in ("company_name", "name"):
            valor = (getattr(cliente, campo, "") or "").strip()
            if valor:
                return valor

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
