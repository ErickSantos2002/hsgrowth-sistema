"""GET /agente/capacidades e a tabela de papéis do allowlist do agente
(PAPEIS_AGENTE em app/core/agente.py). Spec no repo HS.OS:
docs/superpowers/specs/2026-11-13-capacidade-do-guardi-design.md.

O teste que prende a tabela ao código percorre o allowlist com um usuário de cada
papel: a rota declarada para o papel não recebe recusa de papel (nem a do agente,
nem a dos require_* da própria rota); a não declarada recebe."""
import re

import pytest

from app.api.deps import MSG_AGENTE_PAPEL_403
from app.core.agente import PAPEIS_AGENTE, QUALQUER_PAPEL, ROTAS_AGENTE, rotas_do_papel
from app.core.security import create_access_token, hash_password
from app.models.role import Role
from app.models.user import User

ROTA = "/api/v1/agente/capacidades"

# Recusas por PAPEL (as de dado — card de outro, cadastro sem card — não entram).
RECUSAS_DE_PAPEL = (
    MSG_AGENTE_PAPEL_403,
    "Acesso negado. Visualizadores não podem modificar dados.",
    "Acesso restrito ao módulo de Serviços (admin, gerente ou serviço).",
    "Acesso restrito ao Programa de Parceiros.",
    "Aceite os termos do Programa de Parceiros para continuar.",
)

NOMES = {
    "admin": "Administrador", "manager": "Gerente", "salesperson": "Vendedor", "sdr": "SDR",
    "service": "Serviço", "viewer": "Visualizador", "finance": "Financeiro",
    "partner": "Parceiro", "partner_member": "Vendedor do parceiro", "hunter": "Hunter de parceiros",
}


def _h(tok):
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture
def usuarios(db, test_roles):
    """Um usuário ativo por papel: <papel>@cap.test."""
    roles = dict(test_roles)
    for nome, exibir in NOMES.items():
        if nome not in roles:
            roles[nome] = Role(name=nome, display_name=exibir, permissions=[], is_system_role=True)
            db.add(roles[nome])
    db.commit()
    for nome, role in roles.items():
        db.add(User(name=f"Cap {nome}", email=f"{nome}@cap.test", password_hash=hash_password("x12345678"),
                    role_id=role.id, is_active=True, is_deleted=False))
    db.commit()
    return {nome: f"{nome}@cap.test" for nome in NOMES}


def _recusa_de_papel(resp) -> bool:
    if resp.status_code != 403:
        return False
    try:
        detalhe = resp.json().get("detail")
    except Exception:
        return False
    return isinstance(detalhe, str) and (detalhe in RECUSAS_DE_PAPEL or detalhe.startswith("Acesso negado. Role"))


# --- a tabela -----------------------------------------------------------------

def test_toda_rota_do_allowlist_tem_papeis_conhecidos():
    assert set(PAPEIS_AGENTE) == set(ROTAS_AGENTE)
    for rota, papeis in PAPEIS_AGENTE.items():
        assert papeis and papeis <= QUALQUER_PAPEL, rota
    assert ("GET", "/agente/capacidades") in ROTAS_AGENTE


def test_vendas_e_servicos_separados():
    vendedor = {tuple(r) for r in rotas_do_papel("salesperson")}
    servico = {tuple(r) for r in rotas_do_papel("service")}
    assert ("POST", "/cards/{card_id}/win") in vendedor
    assert not any(t.startswith("/service") or t == "/services" for _, t in vendedor)
    assert ("PUT", "/service-boards/{board_id}/cards/{card_id}/move") in servico
    assert not any(t.startswith(("/cards", "/card-", "/boards")) for _, t in servico)
    # comuns: cadastro e busca para ler
    for r in (("GET", "/clients"), ("GET", "/persons"), ("GET", "/search/global"), ("GET", "/users/me")):
        assert r in vendedor and r in servico
    assert ("POST", "/clients") not in servico
    # visualizador só lê; perfis do Programa de Parceiros só /users/me e a própria rota
    assert all(m == "GET" for m, _ in rotas_do_papel("viewer"))
    assert rotas_do_papel("partner") == [["GET", "/agente/capacidades"], ["GET", "/users/me"]]
    assert rotas_do_papel(None) == []
    assert rotas_do_papel("papel-novo") == []


def test_tabela_presa_ao_codigo(client, db, usuarios, agente):
    """Para cada papel e cada rota do allowlist: declarada → sem recusa de papel;
    não declarada → recusa de papel."""
    erros = []
    for papel, email in usuarios.items():
        h = _h(agente(email))
        for metodo, template in sorted(ROTAS_AGENTE):
            caminho = "/api/v1" + re.sub(r"\{[^}]+\}", "1", template)
            try:
                resp = client.request(metodo, caminho, headers=h, json={} if metodo != "GET" else None)
            except Exception:
                # Exceção dentro do endpoint: já passou de toda checagem de papel.
                db.rollback()
                if papel not in PAPEIS_AGENTE[(metodo, template)]:
                    erros.append(f"{papel} {metodo} {template}: passou da checagem de papel")
                continue
            if papel in PAPEIS_AGENTE[(metodo, template)]:
                if resp.status_code == 401 or _recusa_de_papel(resp):
                    erros.append(f"{papel} {metodo} {template}: declarada mas recusada {resp.status_code} {resp.text[:100]}")
            elif not _recusa_de_papel(resp):
                erros.append(f"{papel} {metodo} {template}: não declarada mas passou {resp.status_code}")
    assert not erros, "\n".join(erros)


# --- a rota -------------------------------------------------------------------

def test_vendedor(client, usuarios, agente):
    resp = client.get(ROTA, headers=_h(agente(usuarios["salesperson"])))
    assert resp.status_code == 200, resp.text
    corpo = resp.json()
    assert corpo["papel"] == "Vendedor"
    assert corpo["rotas"] == rotas_do_papel("salesperson")
    assert ["POST", "/card-notes"] in corpo["rotas"]
    assert ["GET", "/service-boards"] not in corpo["rotas"]


def test_servico(client, usuarios, agente):
    corpo = client.get(ROTA, headers=_h(agente(usuarios["service"]))).json()
    assert corpo["papel"] == "Serviço"
    assert ["POST", "/service-boards/{board_id}/cards/{card_id}/activities"] in corpo["rotas"]
    assert ["GET", "/cards"] not in corpo["rotas"]


def test_gerente_alcanca_as_duas_frentes(client, usuarios, agente):
    corpo = client.get(ROTA, headers=_h(agente(usuarios["manager"]))).json()
    assert corpo["papel"] == "Gerente"
    assert len(corpo["rotas"]) == len(ROTAS_AGENTE)


def test_parceiro_responde_mesmo_trancado(client, usuarios, agente):
    resp = client.get(ROTA, headers=_h(agente(usuarios["partner"])))
    assert resp.status_code == 200, resp.text
    assert resp.json()["rotas"] == [["GET", "/agente/capacidades"], ["GET", "/users/me"]]


def test_login_normal_404(client, db, usuarios):
    user = db.query(User).filter(User.email == usuarios["salesperson"]).first()
    tok = create_access_token(data={"sub": str(user.id)})
    assert client.get(ROTA, headers=_h(tok)).status_code == 404


def test_sem_conta_ou_inativo_401(client, db, usuarios, agente):
    assert client.get(ROTA, headers=_h(agente("ninguem@cap.test"))).status_code == 401
    user = db.query(User).filter(User.email == usuarios["salesperson"]).first()
    user.is_active = False
    db.commit()
    assert client.get(ROTA, headers=_h(agente(usuarios["salesperson"]))).status_code == 401


def test_servico_via_agente_403_em_vendas(client, usuarios, agente):
    resp = client.get("/api/v1/cards", headers=_h(agente(usuarios["service"])))
    assert resp.status_code == 403
    assert resp.json()["detail"] == MSG_AGENTE_PAPEL_403


def test_visualizador_via_agente_nao_escreve_nota(client, usuarios, agente):
    resp = client.post("/api/v1/card-notes", headers=_h(agente(usuarios["viewer"])), json={})
    assert resp.status_code == 403
    assert resp.json()["detail"] == MSG_AGENTE_PAPEL_403
