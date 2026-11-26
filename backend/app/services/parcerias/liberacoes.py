"""
Pedidos de liberação de CNPJ em Vendas (1.11.32).

O vendedor ou SDR barrado pela trava de CNPJ (`vendas.conferir`) pede a liberação.
O card só nasce quando admin ou gerente libera: até lá existe só o pedido, com os
dados que o vendedor preencheu. Ao liberar, a ação é refeita em nome do vendedor,
com a trava dispensada só para esse pedido, e o histórico do card registra quem
liberou e por quê.

Tipos:
- `criar_card`: `payload` guarda o CardCreate; ao liberar, cria o card.
- `vincular_empresa`: `card_id` é o card do vendedor; ao liberar, vincula a empresa.
- `reabrir_card` (1.11.35): `card_id` é o card perdido; `payload` guarda o título e o
  detalhamento do canal; ao liberar, resgata o card.
- `clonar_card` (1.11.35): `card_id` é o card de origem; ao liberar, clona.
Nos dois, ao liberar `card_id` passa a ser o card novo e `payload.original_card_id`
guarda o de origem.
"""
from datetime import datetime
from typing import List, Optional, Tuple

from fastapi import HTTPException, status
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.models.client import Client
from app.models.cnpj_release_request import CnpjReleaseRequest
from app.models.role import Role
from app.models.user import User
from app.schemas.card import CardCreate, CardReopenRequest, CardUpdate
from app.services.notificacoes.enviar import notificar
from app.services.parcerias import acesso, vendas
from app.services.parcerias.cnpj import normalizar_cnpj

TIPOS = ("criar_card", "vincular_empresa", "reabrir_card", "clonar_card")
# Texto do aviso para a gestão: "{vendedor} pediu ... para {ação}".
ACOES = {
    "criar_card": "criar um card",
    "vincular_empresa": "vincular ao card dele",
    "reabrir_card": "resgatar um card perdido",
    "clonar_card": "clonar um card",
}
SITUACOES = ("pendente", "liberado", "recusado", "cancelado")
QUEM_PEDE = ("salesperson", "sdr")
LINK_DA_LISTA = "/parcerias/consulta-cnpj?aba=liberacoes"
LIMITE_TEXTO = 500


def _erro(codigo: int, mensagem: str) -> HTTPException:
    return HTTPException(codigo, mensagem)


def _texto(valor: Optional[str], campo: str, obrigatorio: bool) -> Optional[str]:
    t = (valor or "").strip()
    if obrigatorio and not t:
        raise _erro(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Escreva {campo}.")
    if len(t) > LIMITE_TEXTO:
        raise _erro(status.HTTP_422_UNPROCESSABLE_ENTITY, f"{campo.capitalize()} com no máximo {LIMITE_TEXTO} caracteres.")
    return t or None


def _do_pedido(db: Session, pedido_id: int) -> CnpjReleaseRequest:
    p = db.query(CnpjReleaseRequest).filter(CnpjReleaseRequest.id == pedido_id).first()
    if not p:
        raise _erro(status.HTTP_404_NOT_FOUND, "Pedido não encontrado.")
    return p


def _pendente(p: CnpjReleaseRequest) -> None:
    if p.status != "pendente":
        raise _erro(status.HTTP_409_CONFLICT, "Este pedido já foi decidido.")


def _exigir_gestao(user: User) -> None:
    if not acesso.eh_gestao(user):
        raise _erro(status.HTTP_403_FORBIDDEN, "Só admin ou gerente decidem pedidos de liberação.")


def _gestores(db: Session) -> List[User]:
    return (
        db.query(User).join(Role, Role.id == User.role_id)
        .filter(Role.name.in_(("admin", "manager")), User.is_active.is_(True), User.is_deleted.is_(False))
        .order_by(User.id).all()
    )


def nome_da_empresa(p: CnpjReleaseRequest) -> str:
    return p.client.name if p.client else f"CNPJ {p.cnpj}"


def titulo_do_card(p: CnpjReleaseRequest) -> Optional[str]:
    """Título do card: o criado/alvo, ou o que o vendedor preencheu no pedido."""
    if p.card:
        return p.card.title
    return (p.payload or {}).get("title")


# ─── Pedir ───────────────────────────────────────────────────────────────────

def pedir(db: Session, user: User, kind: str, client_id: int, reason: Optional[str],
          payload: Optional[dict] = None, card_id: Optional[int] = None) -> CnpjReleaseRequest:
    """Grava o pedido (ou devolve o pendente igual) e avisa admins e gerentes."""
    if acesso.perfil(user) not in QUEM_PEDE:
        raise _erro(status.HTTP_403_FORBIDDEN,
                    "Só vendedor ou SDR pedem liberação. Admin e gerente liberam direto, com justificativa.")
    if kind not in TIPOS:
        raise _erro(status.HTTP_422_UNPROCESSABLE_ENTITY, "Tipo de pedido inválido.")
    motivo = _texto(reason, "o motivo do pedido", obrigatorio=True)

    dados: dict = {}
    ignorar_card_id = None
    if kind == "criar_card":
        try:
            criar = CardCreate(**{**(payload or {}), "client_id": client_id})
        except ValidationError as e:
            raise _erro(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Dados do card inválidos: {e.errors()[0].get('msg')}")
        # Só os campos que o vendedor mandou: na liberação, o card nasce igual ao que ele tentou criar.
        dados = criar.model_dump(mode="json", exclude_unset=True, exclude={"cnpj_justificativa"})
        card_id = None
    elif kind in ("reabrir_card", "clonar_card"):
        if not card_id:
            raise _erro(status.HTTP_422_UNPROCESSABLE_ENTITY, "Informe o card.")
        from app.services.card_service import CardService
        origem = CardService(db).get_card_by_id(card_id, user)
        # A empresa é a do card de origem (é ela que o resgate/clone leva junto).
        client_id = origem.client_id
        if not client_id:
            raise _erro(status.HTTP_422_UNPROCESSABLE_ENTITY, "Este card não tem empresa vinculada.")
        if kind == "reabrir_card":
            if not origem.is_lost:
                raise _erro(status.HTTP_400_BAD_REQUEST, "Apenas negócios perdidos podem ser reabertos")
            try:
                resgate = CardReopenRequest(**(payload or {}))
            except ValidationError as e:
                raise _erro(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Dados do resgate inválidos: {e.errors()[0].get('msg')}")
            dados = resgate.model_dump(mode="json", exclude={"cnpj_justificativa"})
        dados["original_card_id"] = origem.id
        ignorar_card_id = origem.id
    else:
        if not card_id:
            raise _erro(status.HTTP_422_UNPROCESSABLE_ENTITY, "Informe o card.")
        from app.services.card_service import CardService
        card = CardService(db).get_card_by_id(card_id, user)
        CardService(db)._check_write_permission(card, user)
        ignorar_card_id = card.id

    com_quem = vendas.com_quem_bloqueia(db, user, client_id, ignorar_card_id)
    if not com_quem:
        raise _erro(status.HTTP_422_UNPROCESSABLE_ENTITY, "Este CNPJ está livre. Crie o card normalmente.")

    mesmo_card = CnpjReleaseRequest.card_id.is_(None) if card_id is None else CnpjReleaseRequest.card_id == card_id
    repetido = db.query(CnpjReleaseRequest).filter(
        CnpjReleaseRequest.requested_by_id == user.id,
        CnpjReleaseRequest.status == "pendente",
        CnpjReleaseRequest.kind == kind,
        CnpjReleaseRequest.client_id == client_id,
        mesmo_card,
    ).first()
    if repetido:
        return repetido

    cliente = db.query(Client).filter(Client.id == client_id).first()
    p = CnpjReleaseRequest(
        kind=kind, status="pendente", client_id=client_id,
        cnpj=normalizar_cnpj(cliente.document if cliente else "")[:14],
        card_id=card_id, payload=dados, reason=motivo, blocked_with=com_quem[:LIMITE_TEXTO],
        requested_by_id=user.id,
    )
    db.add(p)
    db.commit()
    db.refresh(p)

    acao = ACOES[kind]
    for gestor in _gestores(db):
        notificar(db, gestor.id, "cnpj_liberacao_pedido",
                  f"{user.name} pediu liberação de CNPJ",
                  f"{nome_da_empresa(p)} — para {acao}. Motivo: {motivo}",
                  link=LINK_DA_LISTA, autor_id=user.id, referencia=f"liberacao:{p.id}")
    return p


# ─── Consultar ───────────────────────────────────────────────────────────────

POR_PAGINA = 10


def listar(db: Session, user: User, situacao: Optional[str] = None, pagina: int = 1,
           por_pagina: int = POR_PAGINA) -> Tuple[int, List[CnpjReleaseRequest]]:
    """Gestão vê todos; vendedor e SDR veem só os próprios. Mais novos primeiro.

    Devolve (total, itens da página).
    """
    q = db.query(CnpjReleaseRequest)
    if not acesso.eh_gestao(user):
        q = q.filter(CnpjReleaseRequest.requested_by_id == user.id)
    if situacao:
        if situacao not in SITUACOES:
            raise _erro(status.HTTP_422_UNPROCESSABLE_ENTITY, "Situação inválida.")
        q = q.filter(CnpjReleaseRequest.status == situacao)
    total = q.count()
    pagina = max(pagina, 1)
    itens = (q.order_by(CnpjReleaseRequest.created_at.desc(), CnpjReleaseRequest.id.desc())
             .offset((pagina - 1) * por_pagina).limit(por_pagina).all())
    return total, itens


def contar_pendentes(db: Session, user: User) -> int:
    if not acesso.eh_gestao(user):
        return 0
    return db.query(CnpjReleaseRequest).filter(CnpjReleaseRequest.status == "pendente").count()


# ─── Decidir ─────────────────────────────────────────────────────────────────

def _avisar_decisao(db: Session, p: CnpjReleaseRequest, gestor: User, titulo: str, mensagem: str, link: str) -> None:
    notificar(db, p.requested_by_id, "cnpj_liberacao_decisao", titulo, mensagem,
              link=link, autor_id=gestor.id, referencia=f"liberacao:{p.id}:{p.status}")


def liberar(db: Session, gestor: User, pedido_id: int, nota: Optional[str] = None) -> CnpjReleaseRequest:
    """
    Refaz a ação em nome de quem pediu, com a trava dispensada. Se a ação falhar
    (lista apagada, contato sem e-mail/telefone, card excluído), nada é gravado e o
    pedido continua pendente.
    """
    _exigir_gestao(gestor)
    p = _do_pedido(db, pedido_id)
    _pendente(p)
    observacao = _texto(nota, "a observação", obrigatorio=False)
    vendedor = p.requested_by
    if not vendedor or not vendedor.is_active or vendedor.is_deleted:
        raise _erro(status.HTTP_422_UNPROCESSABLE_ENTITY, "Quem pediu não está mais ativo. Recuse o pedido.")

    texto = f"CNPJ liberado por {gestor.name} a pedido de {vendedor.name}: {p.reason}."
    if observacao:
        texto += f" Observação: {observacao}."
    texto += f" (estava {p.blocked_with})"

    from app.services.card_service import CardService
    servico = CardService(db)
    try:
        if p.kind == "criar_card":
            dados = CardCreate(**{**(p.payload or {}), "client_id": p.client_id})
            card = servico.create_card(dados, vendedor, at_top=True, liberacao_cnpj=texto)
        elif p.kind in ("reabrir_card", "clonar_card"):
            if not p.card_id:
                raise _erro(status.HTTP_422_UNPROCESSABLE_ENTITY, "O card de origem não existe mais. Recuse o pedido.")
            if p.kind == "reabrir_card":
                resgate = CardReopenRequest(**{k: v for k, v in (p.payload or {}).items() if k != "original_card_id"})
                card = servico.reopen_card(p.card_id, resgate, vendedor, liberacao_cnpj=texto)
            else:
                card = servico.clone_card(p.card_id, vendedor, liberacao_cnpj=texto)
        else:
            if not p.card_id:
                raise _erro(status.HTTP_422_UNPROCESSABLE_ENTITY, "O card do pedido não existe mais. Recuse o pedido.")
            card = servico.update_card(p.card_id, CardUpdate(client_id=p.client_id), vendedor, liberacao_cnpj=texto)
    except HTTPException:
        db.rollback()
        raise

    p = _do_pedido(db, pedido_id)  # o commit do card pode ter expirado o objeto
    p.status = "liberado"
    p.card_id = card.id
    p.decided_by_id = gestor.id
    p.decided_at = datetime.utcnow()
    p.decision_note = observacao
    db.commit()
    db.refresh(p)

    # Resgate e clone mantêm o vendedor do card de origem, que pode não ser quem pediu.
    final = ("já está com você." if p.kind in ("criar_card", "vincular_empresa")
             else "foi criado em Lead Novo.")
    _avisar_decisao(db, p, gestor, "Seu pedido de CNPJ foi liberado",
                    f"{nome_da_empresa(p)}: {gestor.name} liberou. O card \"{card.title}\" {final}",
                    f"/cards/{card.id}")
    return p


def recusar(db: Session, gestor: User, pedido_id: int, nota: Optional[str]) -> CnpjReleaseRequest:
    _exigir_gestao(gestor)
    p = _do_pedido(db, pedido_id)
    _pendente(p)
    motivo = _texto(nota, "o motivo da recusa", obrigatorio=True)
    p.status = "recusado"
    p.decided_by_id = gestor.id
    p.decided_at = datetime.utcnow()
    p.decision_note = motivo
    db.commit()
    db.refresh(p)
    _avisar_decisao(db, p, gestor, "Seu pedido de CNPJ foi recusado",
                    f"{nome_da_empresa(p)}: {gestor.name} recusou. Motivo: {motivo}", LINK_DA_LISTA)
    return p


def cancelar(db: Session, user: User, pedido_id: int) -> CnpjReleaseRequest:
    p = _do_pedido(db, pedido_id)
    if p.requested_by_id != user.id:
        raise _erro(status.HTTP_403_FORBIDDEN, "Só quem pediu pode cancelar.")
    _pendente(p)
    p.status = "cancelado"
    p.decided_at = datetime.utcnow()
    db.commit()
    db.refresh(p)
    return p
