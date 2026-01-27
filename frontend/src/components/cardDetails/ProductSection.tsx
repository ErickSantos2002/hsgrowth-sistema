import React, { useState } from "react";
import { Package, Plus, Trash2, Search, CreditCard, Info } from "lucide-react";
import ExpandableSection from "./ExpandableSection";
import { Card } from "../../types";

interface ProductSectionProps {
  card: Card;
  onUpdate: () => void;
}

/**
 * Interface mockada de Produto (temporária até implementar backend)
 */
interface ProductItem {
  id: number;
  product_id: number;
  name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  discount: number; // Valor em reais
  discount_percentage: number; // Percentual
}

/**
 * Seção "Produto" - Gerenciamento de produtos vinculados ao card
 * Quarta seção da coluna esquerda, expandida por padrão quando há produtos
 */
const ProductSection: React.FC<ProductSectionProps> = ({ card, onUpdate }) => {
  // Mock: Lista de produtos (futuramente virá do backend)
  const [products, setProducts] = useState<ProductItem[]>([
    // Exemplo mockado - remover quando integrar com backend
    // {
    //   id: 1,
    //   product_id: 101,
    //   name: "Produto Exemplo",
    //   sku: "PROD-001",
    //   quantity: 2,
    //   unit_price: 500.00,
    //   discount: 50.00,
    //   discount_percentage: 5,
    // }
  ]);

  const [showProductSearch, setShowProductSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Mock: Lista de produtos disponíveis para adicionar
  const availableProducts = [
    { id: 101, name: "Software de Gestão - Licença Anual", sku: "SOFT-001", unit_price: 2400.00 },
    { id: 102, name: "Consultoria em TI - Pacote Básico", sku: "CONS-001", unit_price: 5000.00 },
    { id: 103, name: "Treinamento Online - 20 horas", sku: "TRAIN-001", unit_price: 1200.00 },
    { id: 104, name: "Suporte Técnico - Mensal", sku: "SUP-001", unit_price: 800.00 },
  ];

  /**
   * Calcula valor total de um produto
   */
  const calculateLineTotal = (product: ProductItem) => {
    const subtotal = product.quantity * product.unit_price;
    return subtotal - product.discount;
  };

  /**
   * Calcula subtotal de todos os produtos
   */
  const calculateSubtotal = () => {
    return products.reduce((sum, p) => sum + (p.quantity * p.unit_price), 0);
  };

  /**
   * Calcula desconto total
   */
  const calculateTotalDiscount = () => {
    return products.reduce((sum, p) => sum + p.discount, 0);
  };

  /**
   * Calcula valor total do card
   */
  const calculateTotal = () => {
    return calculateSubtotal() - calculateTotalDiscount();
  };

  /**
   * Adiciona produto
   */
  const handleAddProduct = (productId: number) => {
    const product = availableProducts.find(p => p.id === productId);
    if (!product) return;

    const newProduct: ProductItem = {
      id: Date.now(),
      product_id: product.id,
      name: product.name,
      sku: product.sku,
      quantity: 1,
      unit_price: product.unit_price,
      discount: 0,
      discount_percentage: 0,
    };

    setProducts([...products, newProduct]);
    setShowProductSearch(false);
    setSearchTerm("");

    // TODO: Sincronizar com backend
    // await cardService.update(card.id, { products: [...products, newProduct] });
    // onUpdate();
  };

  /**
   * Remove produto
   */
  const handleRemoveProduct = (productId: number) => {
    if (!confirm("Remover este produto?")) return;

    setProducts(products.filter(p => p.id !== productId));

    // TODO: Sincronizar com backend
    // await cardService.update(card.id, { products: products.filter(...) });
    // onUpdate();
  };

  /**
   * Atualiza quantidade
   */
  const handleUpdateQuantity = (productId: number, quantity: number) => {
    if (quantity < 1) return;

    setProducts(products.map(p =>
      p.id === productId ? { ...p, quantity } : p
    ));

    // TODO: Sincronizar com backend
  };

  /**
   * Atualiza desconto
   */
  const handleUpdateDiscount = (productId: number, discount: number) => {
    if (discount < 0) return;

    setProducts(products.map(p =>
      p.id === productId ? { ...p, discount } : p
    ));

    // TODO: Sincronizar com backend
  };

  /**
   * Formata moeda
   */
  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  /**
   * Filtra produtos disponíveis
   */
  const filteredProducts = availableProducts.filter(p =>
    !products.some(prod => prod.product_id === p.id) &&
    (p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <ExpandableSection
      title="Produto"
      defaultExpanded={products.length > 0}
      icon={<Package size={18} />}
      badge={products.length > 0 ? products.length : undefined}
    >
      <div className="space-y-4">
        {/* Lista de produtos */}
        {products.length > 0 ? (
          <div className="space-y-3">
            {products.map((product) => (
              <div
                key={product.id}
                className="p-3 bg-slate-900/50 border border-slate-700 rounded-lg space-y-2"
              >
                {/* Header do produto */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-white">{product.name}</p>
                    <p className="text-xs text-slate-500">SKU: {product.sku}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveProduct(product.id)}
                    className="p-1 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300 transition-colors"
                    title="Remover produto"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Campos de quantidade e valores */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <label className="text-xs text-slate-400">Quantidade</label>
                    <input
                      type="number"
                      min="1"
                      value={product.quantity}
                      onChange={(e) => handleUpdateQuantity(product.id, parseInt(e.target.value) || 1)}
                      className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400">Valor unitário</label>
                    <p className="px-2 py-1 bg-slate-800/30 border border-slate-700/50 rounded text-white">
                      {formatCurrency(product.unit_price)}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400">Desconto (R$)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={product.discount}
                      onChange={(e) => handleUpdateDiscount(product.id, parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400">Total da linha</label>
                    <p className="px-2 py-1 bg-blue-500/10 border border-blue-500/30 rounded text-blue-400 font-medium">
                      {formatCurrency(calculateLineTotal(product))}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Totalizadores */}
            <div className="pt-3 border-t border-slate-700/50 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Subtotal:</span>
                <span className="text-white font-medium">{formatCurrency(calculateSubtotal())}</span>
              </div>

              {calculateTotalDiscount() > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Desconto total:</span>
                  <span className="text-red-400 font-medium">- {formatCurrency(calculateTotalDiscount())}</span>
                </div>
              )}

              <div className="flex justify-between text-base pt-2 border-t border-slate-700/50">
                <span className="text-white font-semibold">Valor total:</span>
                <span className="text-emerald-400 font-semibold text-lg">
                  {formatCurrency(calculateTotal())}
                </span>
              </div>
            </div>

            {/* Info sobre sincronização com Resumo */}
            <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <Info size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-300">
                O valor total é sincronizado automaticamente com a seção "Resumo". Para editar
                manualmente, remova todos os produtos.
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <Package size={32} className="mx-auto text-slate-600 mb-2" />
            <p className="text-sm text-slate-400 mb-4">Nenhum produto adicionado</p>
          </div>
        )}

        {/* Botão adicionar produto */}
        <button
          onClick={() => setShowProductSearch(true)}
          className="w-full px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/50 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          Adicionar produto
        </button>

        {/* Botão adicionar parcelamento */}
        <button
          disabled={products.length === 0}
          className={`w-full px-4 py-2 border rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
            products.length > 0
              ? "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border-emerald-500/50"
              : "bg-slate-800/30 text-slate-600 border-slate-700/50 cursor-not-allowed"
          }`}
        >
          <CreditCard size={18} />
          Adicionar parcelamento
        </button>

        {/* Modal de busca de produtos */}
        {showProductSearch && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 w-full max-w-2xl">
              <h3 className="text-xl font-semibold text-white mb-4">Adicionar Produto</h3>

              {/* Campo de busca */}
              <div className="relative mb-4">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nome ou SKU..."
                  className="w-full pl-10 pr-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500"
                  autoFocus
                />
              </div>

              {/* Lista de produtos */}
              <div className="max-h-96 overflow-y-auto space-y-2">
                {filteredProducts.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">
                    {searchTerm ? "Nenhum produto encontrado" : "Todos os produtos já foram adicionados"}
                  </p>
                ) : (
                  filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleAddProduct(product.id)}
                      className="w-full p-3 bg-slate-900/50 hover:bg-slate-700/50 border border-slate-700 rounded-lg text-left transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white">{product.name}</p>
                          <p className="text-xs text-slate-500">SKU: {product.sku}</p>
                        </div>
                        <p className="text-sm font-medium text-emerald-400">
                          {formatCurrency(product.unit_price)}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Botão fechar */}
              <button
                onClick={() => {
                  setShowProductSearch(false);
                  setSearchTerm("");
                }}
                className="mt-4 w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
              >
                Fechar
              </button>

              {/* Aviso sobre dados mock */}
              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-xs text-yellow-300">
                  <strong>Nota:</strong> Esta é uma versão mockada. Os produtos mostrados são exemplos.
                  A integração com o backend será implementada posteriormente.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </ExpandableSection>
  );
};

export default ProductSection;
