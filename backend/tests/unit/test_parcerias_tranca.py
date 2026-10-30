"""
Tranca geral: parceiro e Financeiro só alcançam Parcerias, login, o próprio
perfil e as próprias notificações. Qualquer outra rota — inclusive as que
ainda vão ser criadas — responde 403 sem ninguém precisar lembrar de proteger.
"""
import re

import pytest
from fastapi.routing import APIRoute

from app.api.deps import caminho_liberado_para_trancado, get_current_active_user
from app.main import app

from tests.unit.apoio_parcerias import headers, parceiro, usuario


def _usa_usuario_ativo(dependant) -> bool:
    for dep in dependant.dependencies:
        if dep.call is get_current_active_user or _usa_usuario_ativo(dep):
            return True
    return False


def _rotas_trancadas():
    for rota in app.routes:
        if (
            isinstance(rota, APIRoute)
            and rota.path.startswith("/api/v1")
            and not caminho_liberado_para_trancado(rota.path)
            and _usa_usuario_ativo(rota.dependant)
        ):
            yield rota


@pytest.mark.parametrize("perfil", ["partner", "finance"])
def test_perfil_trancado_recebe_403_fora_da_lista(client, db, perfil):
    p = parceiro(db) if perfil == "partner" else None
    h = headers(usuario(db, perfil, f"{perfil}@teste.com", p))

    falhas = []
    for rota in _rotas_trancadas():
        metodo = sorted(rota.methods)[0]
        url = re.sub(r"\{[^}]+\}", "1", rota.path)
        resposta = client.request(metodo, url, headers=h)
        if resposta.status_code != 403:
            falhas.append(f"{metodo} {rota.path} -> {resposta.status_code}")

    assert not falhas, "\n".join(falhas)


def test_perfil_trancado_ve_o_proprio_perfil(client, db):
    h = headers(usuario(db, "partner", "contato@dmap.com", parceiro(db)))

    resposta = client.get("/api/v1/users/me", headers=h)

    assert resposta.status_code == 200
    assert resposta.json()["role"] == "partner"


def test_vendedor_continua_com_o_crm(client, salesperson_headers):
    assert client.get("/api/v1/boards", headers=salesperson_headers).status_code == 200


def test_lista_liberada():
    assert caminho_liberado_para_trancado("/api/v1/parcerias/oportunidades")
    assert caminho_liberado_para_trancado("/api/v1/users/me/change-password")
    assert not caminho_liberado_para_trancado("/api/v1/users/1")
    assert not caminho_liberado_para_trancado("/api/v1/cards")
