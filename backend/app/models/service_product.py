"""
Modelo de ServiceProduct — catálogo de EQUIPAMENTOS do módulo de Serviços.

Tabela separada de `products` de propósito. São coisas conceitualmente
diferentes:

  - `products`  = o que a empresa **vende** (bocais, bobinas, tampas, kits).
                  Tem preço, entra em proposta de venda.
  - `service_products` = o **aparelho do cliente** que está em serviço
                  (bafômetro, módulo de calibração). Não tem preço: em Serviços o
                  valor do negócio vem da soma das propostas vinculadas — ver
                  `deal_value_by_card` — e o produto é só o registro de qual
                  aparelho está em jogo, contado por quantidade.

Manter os dois na mesma tabela faria o catálogo de Vendas exibir equipamento de
cliente (o endpoint `GET /products` não filtra por origem), que é exatamente o
que a separação evita.

Entradas criadas pela integração ficam marcadas com
`(external_source, external_ref)` — o par é único, então o mesmo modelo vindo do
GestorHS reencontra o mesmo registro em vez de duplicar a cada card. Entradas
criadas à mão ficam com os dois campos nulos.
"""
from sqlalchemy import Boolean, Column, Integer, String, Text, UniqueConstraint

from app.db.base import Base
from app.models.mixins import SoftDeleteMixin, TimestampMixin


class ServiceProduct(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "service_products"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    # Código do equipamento. Sem unique: o GestorHS não manda código, então os
    # criados pela integração nascem nulos e vários nulos precisam conviver.
    sku = Column(String(100), nullable=True, index=True)
    category = Column(String(100), nullable=True, index=True)

    # Origem, quando veio de um sistema externo.
    # Ex.: ("gestorhs", "hs pass - iblow") — o ref é o modelo normalizado.
    external_source = Column(String(50), nullable=True, index=True)
    external_ref = Column(String(255), nullable=True, index=True)

    is_active = Column(Boolean, default=True, nullable=False, index=True)

    __table_args__ = (
        UniqueConstraint(
            "external_source", "external_ref", name="unique_service_product_external_ref"
        ),
    )

    def __repr__(self):
        return f"<ServiceProduct(id={self.id}, name='{self.name}')>"
