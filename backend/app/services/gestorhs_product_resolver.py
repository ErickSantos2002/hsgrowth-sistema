"""
Resolve os aparelhos que o GestorHS envia em produtos do catálogo de Serviços.

Motivação: o GestorHS manda os aparelhos do cliente em `devices[]` (série, modelo,
módulo de álcool, próxima recalibração). O lugar certo para eles é
`ServiceCardProduct.aparelhos` — mas aquela tabela exige `product_id`, e o catálogo
de produtos do hsgrowth não tem os modelos de aparelho: é majoritariamente acessório
(bocais, tampas, bobinas). Casar por semelhança de nome colocaria "TAMPA DE PILHA -
MARK X" como produto em centenas de cards.

A saída é find-or-create em `service_products` — o catálogo de EQUIPAMENTOS do módulo
de Serviços, tabela separada de `products` (catálogo de Vendas). A separação é física,
não só lógica: `GET /products` não filtra por origem, então manter os dois juntos faria
o catálogo de Vendas exibir equipamento de cliente. Ver `app/models/service_product.py`.

O registro criado nasce marcado com `(external_source, external_ref)`, par único, então
o mesmo modelo reencontra o mesmo registro em vez de duplicar a cada card.

`service_products` **não tem preço** de propósito: em Serviços o valor do negócio vem dos
SERVIÇOS do card (qtd × preço − desconto), com desconto global e frete (ver
`deal_value_by_card`), e o equipamento é só o registro de qual aparelho está em jogo,
contado por quantidade.

Usado por dois caminhos, que precisam se comportar igual:
  - `IntegrationCardService`, na criação de cards novos;
  - `scripts/retroagir_aparelhos_gestorhs.py`, nos cards já carregados.
"""
import re
import unicodedata
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.service_product import ServiceProduct
from app.models.service_card import ServiceCard
from app.models.service_card_product import ServiceCardProduct

EXTERNAL_SOURCE = "gestorhs"
CATEGORIA = "Equipamento GestorHS"


def normalizar_modelo(model: Optional[str]) -> str:
    """Chave estável do modelo: sem acento, sem caixa, sem espaço redundante.

    Deliberadamente NÃO remove palavras como "com impressora" ou "plus": são
    aparelhos distintos no catálogo do cliente e precisam de produtos distintos.
    """
    if not model:
        return ""
    s = unicodedata.normalize("NFKD", model).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", s).strip().lower()


def resolver_produto(db: Session, model: str) -> ServiceProduct:
    """Produto do catálogo de Serviços para este modelo. Cria se não existir.

    Não faz `commit` — quem chama controla a transação.
    """
    ref = normalizar_modelo(model)

    existente = (
        db.query(ServiceProduct)
        .filter(
            ServiceProduct.external_source == EXTERNAL_SOURCE,
            ServiceProduct.external_ref == ref,
            ServiceProduct.is_deleted.is_(False),
        )
        .first()
    )
    if existente:
        return existente

    produto = ServiceProduct(
        name=model.strip(),          # preserva o nome como o GestorHS escreve
        external_source=EXTERNAL_SOURCE,
        external_ref=ref,
        category=CATEGORIA,          # permite filtrar/precificar depois
        is_active=True,
    )
    db.add(produto)
    db.flush()
    return produto


def aplicar_aparelhos_ao_card(
    db: Session,
    card: ServiceCard,
    devices: Optional[List[Dict[str, Any]]],
) -> List[ServiceCardProduct]:
    """Agrupa os aparelhos por modelo e cria um `ServiceCardProduct` por modelo.

    - Aparelho sem modelo é ignorado (não há como agrupá-lo).
    - Idempotente: se o card já tem vínculo com aquele produto, não mexe nele —
      o vendedor pode ter editado à mão, e o trabalho dele manda.
    - Não faz `commit` — quem chama controla a transação.

    Devolve apenas os vínculos criados agora.
    """
    if not devices:
        return []

    por_modelo: Dict[str, Dict[str, Any]] = {}
    for d in devices:
        modelo = (d.get("model") or "").strip()
        if not modelo:
            continue
        chave = normalizar_modelo(modelo)
        por_modelo.setdefault(chave, {"nome": modelo, "aparelhos": []})
        por_modelo[chave]["aparelhos"].append({
            "serial_number": d.get("serial_number"),
            "model": modelo,
            "alcohol_module": d.get("alcohol_module"),
            "next_recalibration_date": d.get("next_recalibration_date"),
        })

    criados: List[ServiceCardProduct] = []
    for grupo in por_modelo.values():
        produto = resolver_produto(db, grupo["nome"])

        ja_existe = (
            db.query(ServiceCardProduct)
            .filter(
                ServiceCardProduct.service_card_id == card.id,
                ServiceCardProduct.product_id == produto.id,
            )
            .first()
        )
        if ja_existe:
            continue

        item = ServiceCardProduct(
            service_card_id=card.id,
            product_id=produto.id,
            quantity=len(grupo["aparelhos"]),
            unit_price=0,
            discount=0,
            aparelhos=grupo["aparelhos"],
        )
        db.add(item)
        db.flush()
        criados.append(item)

    return criados
