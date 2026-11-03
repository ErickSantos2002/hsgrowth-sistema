"""Produtos da oportunidade de parceiro: só produto liberado, desconto por linha, desconto geral e frete."""
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate
from app.services.product_service import ProductService

from tests.unit.apoio_parcerias import headers, oportunidade, parceiro, usuario

URL = "/api/v1/parcerias/oportunidades"


def _produto(db, nome="Phoebus", preco=1000, liberado=True):
    p = Product(name=nome, unit_price=preco, partner_enabled=liberado)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


def _cenario(db):
    p = parceiro(db)
    op = oportunidade(db, p)
    h = headers(usuario(db, "partner", "a@dmap.com", p))
    return op, h


def test_produto_liberado_para_parceiros_no_cadastro(db):
    # Pelo serviço, não pela rota: /products usa outro get_db, que os testes não trocam pelo SQLite.
    admin = usuario(db, "admin", "adm@hs.com")
    servico = ProductService(db)
    criado = servico.create_product(ProductCreate(name="Phoebus", unit_price=24625, partner_enabled=True), admin)
    assert criado.partner_enabled is True

    editado = servico.update_product(criado.id, ProductUpdate(partner_enabled=False), admin)
    assert editado.partner_enabled is False


def test_catalogo_so_traz_produto_liberado(client, db):
    _, h = _cenario(db)
    _produto(db, "Phoebus")
    _produto(db, "Phoebus link", liberado=False)

    catalogo = client.get("/api/v1/parcerias/produtos", params={"busca": "phoebus"}, headers=h).json()

    assert [c["name"] for c in catalogo] == ["Phoebus"]


def test_produto_nao_liberado_ou_repetido_da_422(client, db):
    op, h = _cenario(db)
    liberado = _produto(db)
    outro = _produto(db, "Etilômetro", liberado=False)

    assert client.post(f"{URL}/{op.id}/produtos", json={"product_id": outro.id}, headers=h).status_code == 422
    assert client.post(f"{URL}/{op.id}/produtos", json={"product_id": liberado.id}, headers=h).status_code == 201
    repetido = client.post(f"{URL}/{op.id}/produtos", json={"product_id": liberado.id}, headers=h)
    assert repetido.status_code == 422


def test_desconto_da_linha_nao_passa_do_valor_da_linha(client, db):
    op, h = _cenario(db)
    item = client.post(f"{URL}/{op.id}/produtos", json={"product_id": _produto(db).id, "quantity": 2},
                       headers=h).json()

    assert client.put(f"{URL}/{op.id}/produtos/{item['id']}", json={"discount": 2500}, headers=h).status_code == 422
    certo = client.put(f"{URL}/{op.id}/produtos/{item['id']}",
                       json={"discount": 300, "unit_price": 1000, "quantity": 2}, headers=h).json()
    assert (certo["subtotal"], certo["discount"], certo["total"]) == (2000, 300, 1700)
    # Baixar a quantidade com o desconto acima do novo valor também é recusado.
    assert client.put(f"{URL}/{op.id}/produtos/{item['id']}", json={"unit_price": 100}, headers=h).status_code == 422


def test_valor_com_desconto_geral_e_frete(client, db):
    op, h = _cenario(db)
    item = client.post(f"{URL}/{op.id}/produtos", json={"product_id": _produto(db).id, "quantity": 2},
                       headers=h).json()
    client.put(f"{URL}/{op.id}/produtos/{item['id']}", json={"discount": 300}, headers=h)

    pct = client.put(f"{URL}/{op.id}", json={"global_discount": 10, "global_discount_type": "percent",
                                             "shipping": 50}, headers=h).json()
    assert (pct["global_discount"], pct["global_discount_type"], pct["shipping"]) == (10, "percent", 50)
    assert pct["total_value"] == 1700 - 170 + 50

    tudo = client.put(f"{URL}/{op.id}", json={"global_discount": 5000, "global_discount_type": "value"},
                      headers=h).json()
    assert tudo["total_value"] == 0  # nunca negativo
    [no_board] = client.get(URL, headers=h).json()
    assert no_board["total_value"] == 0


def test_desconto_geral_invalido(client, db):
    op, h = _cenario(db)
    assert client.put(f"{URL}/{op.id}", json={"global_discount": 150, "global_discount_type": "percent"},
                      headers=h).status_code == 422
    assert client.put(f"{URL}/{op.id}", json={"shipping": -1}, headers=h).status_code == 422


def test_financeiro_nao_mexe_nos_valores(client, db):
    op, _ = _cenario(db)
    financeiro = headers(usuario(db, "finance", "fin@hs.com"))
    assert client.put(f"{URL}/{op.id}", json={"shipping": 10}, headers=financeiro).status_code == 403
    assert client.post(f"{URL}/{op.id}/produtos", json={"product_id": _produto(db).id},
                       headers=financeiro).status_code == 403
