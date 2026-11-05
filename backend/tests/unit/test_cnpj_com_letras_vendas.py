"""CNPJ com letras (Receita, desde jul/2026) fora de Parcerias: Clientes, Receita, busca e PDF (v1.11.14)."""
from types import SimpleNamespace

from app.models.board import Board
from app.models.card import Card
from app.models.client import Client
from app.models.list import List as BoardList
from app.services.card_import_service import _clean_cnpj
from app.services.global_search_service import GlobalSearchService
from app.services.proposal_pdf_service import _fmt_document
from app.utils.cnpj import cnpj_valido

# Exemplo oficial da Receita com dígitos verificadores válidos.
CNPJ_LETRAS = "12ABC34501DE35"


def test_exemplo_da_receita_e_valido():
    assert cnpj_valido("12.ABC.345/01DE-35")


def test_busca_na_receita_aceita_letras(client, admin_headers, monkeypatch):
    pedidos = []

    async def falso(cnpj, fontes=None):
        pedidos.append(cnpj)
        return {"cnpj": cnpj, "razao_social": "Empresa Nova", "fonte": "teste"}

    monkeypatch.setattr("app.services.cnpj_lookup_service.consultar_cnpj", falso)

    ok = client.get("/api/v1/clients/cnpj/12.abc.345-01de-35", headers=admin_headers)
    curto = client.get("/api/v1/clients/cnpj/12ABC345", headers=admin_headers)

    assert ok.status_code == 200 and pedidos == [CNPJ_LETRAS]
    assert curto.status_code == 400 and "14 caracteres" in curto.json()["detail"]


def test_busca_na_tela_de_clientes_acha_cnpj_com_letras(client, db, admin_headers):
    db.add_all([Client(name="Nova", document=CNPJ_LETRAS), Client(name="Antiga", document="11222333000181")])
    db.commit()

    achados = client.get("/api/v1/clients", params={"search": "12.abc.345"}, headers=admin_headers).json()

    assert [c["name"] for c in achados["clients"]] == ["Nova"]


def test_busca_global_acha_cnpj_com_letras_e_nome_nao_casa_com_documento(db):
    cli = Client(name="Construtora", document="12.ABC.345/01DE-35")
    b = Board(name="Aquisição")
    db.add_all([cli, b]); db.commit()
    lst = BoardList(board_id=b.id, name="Proposta", position=0)
    db.add(lst); db.commit()
    card = Card(list_id=lst.id, title="Proposta bafômetros", client_id=cli.id)
    db.add(card); db.commit()
    admin = SimpleNamespace(role=SimpleNamespace(name="admin"))

    por_cnpj = GlobalSearchService(db).search("12abc34501", admin)
    por_letras = GlobalSearchService(db).search("ABCD", admin)

    assert [r.id for r in por_cnpj.vendas] == [card.id]
    assert por_cnpj.vendas[0].matched_on == "CNPJ/CPF"
    assert por_letras.vendas == []


def test_importacao_mantem_as_letras_e_os_zeros():
    assert _clean_cnpj("12.abc.345/01de-35") == CNPJ_LETRAS
    assert _clean_cnpj("8.857.492/0001-48") == "08857492000148"


def test_pdf_da_proposta_mascara_cnpj_com_letras():
    assert _fmt_document(CNPJ_LETRAS) == "12.ABC.345/01DE-35"
    assert _fmt_document("12345678909") == "123.456.789-09"
