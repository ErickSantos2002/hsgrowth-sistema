"""Regras da Consulta de CNPJ guardadas no banco (uma linha) e lidas pelo semáforo."""
from datetime import datetime, timedelta

from app.services.parcerias import consultas, regras_cnpj
from app.services.parcerias.regras_cnpj import Regras
from app.services.parcerias.semaforo import motivo_do_registro, protegido

from tests.unit.apoio_parcerias import headers, hunter

AGORA = datetime(2026, 11, 3, 12, 0)
URL = "/api/v1/parcerias/consulta-cnpj/regras"


def test_sem_linha_usa_o_padrao(db):
    r = regras_cnpj.regras(db)
    assert (r.protecao, r.compra, r.perda, r.limite_consultas, r.travar_vendedores) == (10, 30, 90, 20, True)


def test_salvar_cria_a_linha_e_le_de_volta(db, test_admin_user):
    regras_cnpj.salvar(db, test_admin_user, {"protection_days": 5, "block_between_sellers": False})
    r = regras_cnpj.regras(db)
    assert r.protecao == 5 and r.compra == 30 and r.travar_vendedores is False


def test_zero_dias_desliga_cada_regra():
    zero = Regras(protecao=0, compra=0, perda=0)
    assert not protegido(AGORA, prazos=[AGORA + timedelta(days=5)], movimentos=[AGORA], dias=0)
    assert motivo_do_registro(AGORA, aberto=False, ganho_em=AGORA - timedelta(days=1), regras=zero) is None
    assert motivo_do_registro(AGORA, aberto=False, perdido_em=AGORA - timedelta(days=1), regras=zero) is None


def test_prazos_configurados_valem():
    r = Regras(protecao=3, compra=5, perda=7)
    assert not protegido(AGORA, prazos=[], movimentos=[AGORA - timedelta(days=4)], dias=r.protecao)
    assert motivo_do_registro(AGORA, aberto=False, ganho_em=AGORA - timedelta(days=4), regras=r)[0] == "compra_recente"
    assert motivo_do_registro(AGORA, aberto=False, ganho_em=AGORA - timedelta(days=6), regras=r) is None


def test_limite_de_consultas_configurado(db, test_admin_user):
    _, uh = hunter(db)
    regras_cnpj.salvar(db, test_admin_user, {"daily_query_limit": 3})
    assert consultas.limite_de(db, uh) == 3


def test_get_devolve_padrao(client, admin_headers):
    r = client.get(URL, headers=admin_headers).json()
    assert r["protection_days"] == 10 and r["block_between_sellers"] is True and r["updated_by_name"] is None


def test_hunter_le_as_regras(client, db):
    _, uh = hunter(db)
    assert client.get(URL, headers=headers(uh)).status_code == 200


def test_so_admin_altera(client, admin_headers, manager_headers):
    assert client.put(URL, headers=manager_headers, json={"protection_days": 5}).status_code == 403
    r = client.put(URL, headers=admin_headers, json={"protection_days": 5, "daily_query_limit": 30})
    assert r.status_code == 200
    assert r.json()["protection_days"] == 5 and r.json()["daily_query_limit"] == 30 and r.json()["updated_by_name"]


def test_limites_dos_valores(client, admin_headers):
    assert client.put(URL, headers=admin_headers, json={"recent_loss_days": 366}).status_code == 422
    assert client.put(URL, headers=admin_headers, json={"protection_days": -1}).status_code == 422
    assert client.put(URL, headers=admin_headers, json={"daily_query_limit": 0}).status_code == 422
