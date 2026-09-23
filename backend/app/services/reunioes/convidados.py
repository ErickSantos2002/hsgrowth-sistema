"""
Quem o sistema sugere para receber o convite da reunião.

Os endereços vêm de três cadastros — o vendedor, a pessoa de contato e a
empresa —, e o vendedor decide quais usar. Antes a lista era montada em
silêncio e ninguém via quem ia receber.

Vêm marcados o vendedor e o e-mail principal do contato: é o convite que
sempre precisou sair. Os outros ficam à mão, desmarcados, porque mandar
convite para três caixas da mesma pessoa não é o padrão de ninguém.
"""
from typing import List

from sqlalchemy.orm import Session

from app.models.card import Card


def sugerir_convidados(db: Session, card: Card) -> List[dict]:
    """
    Returns:
        Lista de `{email, rotulo, marcado}`, sem endereços repetidos, na ordem
        em que a tela deve mostrar.
    """
    from app.models.person import Person

    candidatos = []

    if card.assigned_to and card.assigned_to.email:
        candidatos.append((card.assigned_to.email, "Vendedor", True))

    if card.person_id:
        pessoa = db.query(Person).filter(Person.id == card.person_id).first()
        if pessoa:
            candidatos.extend([
                (pessoa.email, "Contato (principal)", True),
                (pessoa.email_commercial, "Contato (comercial)", False),
                (pessoa.email_personal, "Contato (pessoal)", False),
            ])

    if card.client and card.client.email:
        candidatos.append((card.client.email, "Empresa", False))

    convidados: List[dict] = []
    vistos = set()
    for email, rotulo, marcado in candidatos:
        endereco = (email or "").strip()
        if not endereco or endereco.lower() in vistos:
            continue
        vistos.add(endereco.lower())
        convidados.append({"email": endereco, "rotulo": rotulo, "marcado": marcado})

    return convidados
