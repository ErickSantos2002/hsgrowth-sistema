"""
Provisiona a integração do GestorHS: usuário dedicado + integration client com chave.

Uso:
    cd backend && python -m scripts.provisionar_integracao_gestorhs           # provisiona
    cd backend && python -m scripts.provisionar_integracao_gestorhs --rotate  # rotaciona a chave

Provisionamento é idempotente: rodar de novo não duplica nem reemite a chave.
Rotação é o único jeito de trocar a chave sem trocar o client_id — ver `rotacionar`.
"""
import argparse
import secrets
from typing import Optional, Tuple

from sqlalchemy.orm import Session

from app.core.security import generate_api_key, hash_api_key, hash_password
from app.models.integration_client import IntegrationClient
from app.models.role import Role
from app.models.user import User

EMAIL = "gestorhs@integracao.local"
NOME_USUARIO = "GestorHS (Integração)"
CLIENT_ID = "hsg_gestorhs"
ESCOPOS = ["service_cards:create"]


def _get_or_create_user(db: Session) -> User:
    user = db.query(User).filter(User.email == EMAIL).first()
    if user:
        return user

    role = db.query(Role).filter(Role.name == "service").first()
    if not role:
        raise RuntimeError(
            "Role 'service' não existe. Rode as migrations antes de provisionar."
        )

    user = User(
        role_id=role.id,
        email=EMAIL,
        name=NOME_USUARIO,
        # Senha aleatória descartada: esta conta nunca faz login por formulário.
        password_hash=hash_password(secrets.token_urlsafe(32)),
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def provisionar(db: Session) -> Tuple[IntegrationClient, Optional[str]]:
    """Retorna (client, chave_em_claro). A chave só vem na primeira execução."""
    user = _get_or_create_user(db)

    existente = db.query(IntegrationClient).filter(
        IntegrationClient.client_id == CLIENT_ID
    ).first()
    if existente:
        return existente, None

    chave = generate_api_key()
    client = IntegrationClient(
        name="GestorHS",
        description="Criação de cards de serviço a partir do GestorHS (OS e cobrança de calibração).",
        client_id=CLIENT_ID,
        client_secret_hash=hash_password(secrets.token_urlsafe(32)),  # não usado neste fluxo
        api_key_hash=hash_api_key(chave),
        scopes=ESCOPOS,
        impersonate_user_id=user.id,
        is_active=True,
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    return client, chave


def rotacionar(db: Session) -> Tuple[IntegrationClient, str]:
    """Gera uma chave nova para o client já provisionado, substituindo o hash antigo.

    A chave antiga para de autenticar **imediatamente** (o hash dela é sobrescrito no
    mesmo commit) — não há período de graça nem coexistência das duas chaves. Também
    reativa o client (`is_active = True`), então rotacionar um client desativado tem o
    efeito colateral de reabrir a integração.

    Levanta RuntimeError se o client ainda não existir — rotação pressupõe
    provisionamento prévio, não substitui.
    """
    client = db.query(IntegrationClient).filter(
        IntegrationClient.client_id == CLIENT_ID
    ).first()
    if not client:
        raise RuntimeError(
            f"Nenhum IntegrationClient com client_id={CLIENT_ID!r} encontrado. "
            "Rode o provisionamento primeiro: "
            "`python -m scripts.provisionar_integracao_gestorhs`."
        )

    chave = generate_api_key()
    client.api_key_hash = hash_api_key(chave)
    client.is_active = True
    db.add(client)
    db.commit()
    db.refresh(client)
    return client, chave


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Provisiona ou rotaciona a integração do GestorHS."
    )
    parser.add_argument(
        "--rotate",
        action="store_true",
        help="Rotaciona a chave do client já provisionado, em vez de provisionar.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    from app.db.session import SessionLocal

    args = _parse_args()
    db = SessionLocal()
    try:
        if args.rotate:
            client, chave = rotacionar(db)
            print("Chave do GestorHS rotacionada.")
            print(f"  client_id: {client.client_id}")
            print(f"  escopos:   {client.scopes}")
            print()
            print("  CHAVE NOVA (copie agora — não será exibida de novo):")
            print(f"  {chave}")
            print()
            print(
                "  A chave ANTIGA deixou de funcionar agora — qualquer requisição do "
                "GestorHS com ela passa a receber 401. Atualize a env "
                "HSGROWTH_API_KEY do GestorHS com a chave nova antes de considerar a "
                "rotação concluída."
            )
        else:
            client, chave = provisionar(db)
            if chave:
                print("Integração do GestorHS provisionada.")
                print(f"  client_id: {client.client_id}")
                print(f"  escopos:   {client.scopes}")
                print()
                print("  CHAVE (copie agora — não será exibida de novo):")
                print(f"  {chave}")
            else:
                print(f"Já provisionado (client_id={client.client_id}). Chave não reemitida.")
                print("Para trocar a chave, use: python -m scripts.provisionar_integracao_gestorhs --rotate")
    finally:
        db.close()
