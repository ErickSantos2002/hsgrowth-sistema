"""Termos do Programa: publicação versionada, trava de acesso, aceite e ativação automática."""
from datetime import datetime

from app.models.notification import Notification
from app.models.partner import Partner, PartnerTeamMember
from app.models.partner_terms import PartnerTerms, PartnerTermsAcceptance
from tests.unit.apoio_parcerias import headers, hunter, parceiro, usuario

URL = "/api/v1/parcerias"
TEXTO = "Termos do Programa de Parceiros, versão de teste."


def _termos(db, audience="empresa", version=1):
    t = PartnerTerms(audience=audience, version=version, text=TEXTO, published_at=datetime.utcnow())
    db.add(t)
    db.commit()
    return t


def _dono(db, **campos):
    campos.setdefault("terms_accepted_at", None)
    campos.setdefault("stage", "convidado")
    p = parceiro(db, "Dmap", **campos)
    return p, usuario(db, "partner", "dono@dmap.com", partner=p)


def test_sem_termos_publicados_nao_barra(client, db):
    _, dono = _dono(db)
    assert client.get(f"{URL}/oportunidades", headers=headers(dono)).status_code == 200
    me = client.get("/api/v1/users/me", headers=headers(dono)).json()
    assert me["termos_pendentes"] is False


def test_dono_com_termos_pendentes_e_barrado(client, db):
    _termos(db)
    _, dono = _dono(db)
    h = headers(dono)
    r = client.get(f"{URL}/oportunidades", headers=h)
    assert r.status_code == 403
    assert r.json()["detail"] == "Aceite os termos do Programa de Parceiros para continuar."
    me = client.get("/api/v1/users/me", headers=h)
    assert me.status_code == 200 and me.json()["termos_pendentes"] is True
    pend = client.get(f"{URL}/termos/pendente", headers=h)
    assert pend.status_code == 200
    assert pend.json() == {"pendente": True, "version": 1, "text": TEXTO}


def test_aceite_ativa_e_notifica(client, db, manager_headers):
    _termos(db)
    ind = parceiro(db, "Indicadora")
    p, dono = _dono(db, indicated_by_partner_id=ind.id)
    h = headers(dono)
    r = client.post(f"{URL}/termos/aceitar", headers={**h, "X-Forwarded-For": "1.2.3.4, 203.0.113.9"})
    assert r.status_code == 200, r.text
    db.expire_all()
    p = db.query(Partner).get(p.id)
    assert p.stage == "ativado" and p.activated_at and p.terms_accepted_at
    ac = db.query(PartnerTermsAcceptance).one()
    assert (ac.partner_id, ac.user_id, ac.ip_address) == (p.id, dono.id, "203.0.113.9")
    notas = db.query(Notification).filter(Notification.notification_type == "parceria_ativada").all()
    assert notas and all("Dmap aceitou os termos e está ativo." in n.message for n in notas)
    assert all("Indicado por Indicadora." in n.message for n in notas)
    assert client.get(f"{URL}/oportunidades", headers=h).status_code == 200
    assert client.get(f"{URL}/termos/pendente", headers=h).json() == {"pendente": False}


def test_aceitar_sem_pendencia_422(client, db):
    _, dono = _dono(db)
    r = client.post(f"{URL}/termos/aceitar", headers=headers(dono))
    assert r.status_code == 422 and r.json()["detail"] == "Não há termos pendentes."


def test_versao_nova_exige_novo_aceite(client, db, manager_headers):
    _termos(db)
    p, dono = _dono(db)
    h = headers(dono)
    assert client.post(f"{URL}/termos/aceitar", headers=h).status_code == 200
    _termos(db, version=2)
    assert client.get(f"{URL}/oportunidades", headers=h).status_code == 403
    assert client.post(f"{URL}/termos/aceitar", headers=h).status_code == 200
    db.expire_all()
    assert db.query(Partner).get(p.id).stage == "ativado"
    assert db.query(PartnerTermsAcceptance).count() == 2


def test_hunter_usa_termos_de_hunter(client, db):
    _termos(db, "empresa")
    p, h_user = hunter(db)
    p.terms_accepted_at = None
    db.commit()
    h = headers(h_user)
    # só há termos de empresa: hunter não é barrado
    assert client.get(f"{URL}/termos/pendente", headers=h).json() == {"pendente": False}
    _termos(db, "hunter")
    assert client.get(f"{URL}/termos/pendente", headers=h).json()["pendente"] is True
    assert client.get(f"{URL}/indicacoes", headers=h).status_code == 403


def test_vendedor_do_parceiro_nunca_e_barrado(client, db):
    _termos(db)
    p, _ = _dono(db)
    vendedor = usuario(db, "partner_member", "vend@dmap.com", partner=p)
    db.add(PartnerTeamMember(partner_id=p.id, name="Vendedor", email="vend@dmap.com", user_id=vendedor.id))
    db.commit()
    h = headers(vendedor)
    r = client.get(f"{URL}/oportunidades", headers=h)
    assert r.status_code == 200, r.text
    assert client.get("/api/v1/users/me", headers=h).json()["termos_pendentes"] is False


def test_so_gestao_publica(client, db, manager_headers):
    _, dono = _dono(db)
    r = client.post(f"{URL}/termos", headers=headers(dono), json={"audience": "empresa", "text": TEXTO})
    assert r.status_code == 403
    r = client.post(f"{URL}/termos", headers=manager_headers, json={"audience": "empresa", "text": TEXTO})
    assert r.status_code == 201 and r.json()["version"] == 1
    r = client.post(f"{URL}/termos", headers=manager_headers, json={"audience": "empresa", "text": TEXTO + " v2"})
    assert r.json()["version"] == 2
    assert client.post(f"{URL}/termos", headers=manager_headers,
                       json={"audience": "outro", "text": TEXTO}).status_code == 422
    assert client.post(f"{URL}/termos", headers=manager_headers,
                       json={"audience": "hunter", "text": "curto"}).status_code == 422
    lista = client.get(f"{URL}/termos?audience=empresa", headers=manager_headers).json()
    assert [t["version"] for t in lista] == [2, 1]


def test_hunter_aceita_e_deixa_de_ser_barrado(client, db, manager_headers):
    _termos(db, "hunter")
    p, h_user = hunter(db)
    p.terms_accepted_at, p.stage = None, "convidado"
    db.commit()
    h = headers(h_user)
    r = client.post(f"{URL}/termos/aceitar", headers=h)
    assert r.status_code == 200, r.text
    assert r.json()["ok"] is True and r.json()["stage"] == "ativado"
    assert client.get(f"{URL}/termos/pendente", headers=h).json() == {"pendente": False}


def test_put_me_informa_termos_pendentes(client, db):
    _termos(db)
    _, dono = _dono(db)
    r = client.put("/api/v1/users/me", headers=headers(dono), json={"phone": "11999999999"})
    assert r.status_code == 200, r.text
    assert r.json()["termos_pendentes"] is True


def test_caminhos_liberados_sao_por_segmento():
    from app.api.deps import _caminho_liberado_com_termos_pendentes as ok
    assert ok("/api/v1/users/me") and ok("/api/v1/users/me/algo") and ok("/api/v1/parcerias/termos/pendente")
    assert ok("/api/v1/parcerias/termos") and ok("/api/v1/auth/login")
    assert not ok("/api/v1/users/media") and not ok("/api/v1/parcerias/termosx")
    assert not ok("/api/v1/users/me2")


def test_falha_na_notificacao_nao_quebra_o_aceite(client, db, manager_headers, monkeypatch):
    from app.services import notification_service

    def quebra(self, data):
        raise RuntimeError("falhou")
    monkeypatch.setattr(notification_service.NotificationService, "create_notification", quebra)
    _termos(db)
    p, dono = _dono(db)
    r = client.post(f"{URL}/termos/aceitar", headers=headers(dono))
    assert r.status_code == 200, r.text
    db.expire_all()
    assert db.query(Partner).get(p.id).stage == "ativado"
    assert db.query(PartnerTermsAcceptance).count() == 1


def test_ativado_aceitando_versao_nova_nao_notifica_de_novo(client, db, manager_headers):
    _termos(db)
    _, dono = _dono(db)
    h = headers(dono)
    client.post(f"{URL}/termos/aceitar", headers=h)
    antes = db.query(Notification).filter(Notification.notification_type == "parceria_ativada").count()
    assert antes >= 1
    _termos(db, version=2)
    assert client.post(f"{URL}/termos/aceitar", headers=h).status_code == 200
    depois = db.query(Notification).filter(Notification.notification_type == "parceria_ativada").count()
    assert depois == antes


def _req(headers, host="10.0.0.1"):
    from types import SimpleNamespace
    from starlette.datastructures import Headers
    return SimpleNamespace(headers=Headers(headers=headers), client=SimpleNamespace(host=host))


def test_ip_do_cliente_confia_so_no_ultimo_xff():
    from app.api.deps import ip_do_cliente
    assert ip_do_cliente(_req({"X-Forwarded-For": "1.2.3.4, 9.9.9.9"})) == "9.9.9.9"
    assert ip_do_cliente(_req({"X-Forwarded-For": "lixo, , 9.9.9.9 "})) == "9.9.9.9"
    # X-Real-IP não conta e entrada anterior do XFF (forjável) não serve de reserva.
    assert ip_do_cliente(_req({"X-Forwarded-For": "lixo", "X-Real-IP": "8.8.8.8"})) == "10.0.0.1"
    assert ip_do_cliente(_req({"X-Forwarded-For": "9.9.9.9, lixo"})) == "10.0.0.1"
    assert ip_do_cliente(_req({"X-Real-IP": "8.8.8.8"})) == "10.0.0.1"
    assert ip_do_cliente(_req({"X-Forwarded-For": "lixo"}, host="nao-ip")) == "unknown"
    assert ip_do_cliente(_req({"X-Forwarded-For": "2001:db8::1"})) == "2001:db8::1"


def test_parceiro_excluido_nao_barra_nem_aceita(client, db):
    _termos(db)
    p, dono = _dono(db)
    p.is_deleted = True
    db.commit()
    h = headers(dono)
    assert client.get("/api/v1/users/me", headers=h).json()["termos_pendentes"] is False
    r = client.post(f"{URL}/termos/aceitar", headers=h)
    assert r.status_code == 422 and r.json()["detail"] == "Não há termos pendentes."
