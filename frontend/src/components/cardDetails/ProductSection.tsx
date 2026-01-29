import React, { useState, useEffect } from "react";
import { Package, Plus, Trash2, Search, CreditCard, Info, Edit2, Check, X } from "lucide-react";
import ExpandableSection from "./ExpandableSection";
import { Card } from "../../types";
import productService from "../../services/productService";
import cardService from "../../services/cardService";

interface ProductSectionProps {
  card: Card;
  onUpdate: () => void;
}

/**
 * Interface de Produto retornado pelo backend
 */
interface ProductItem {
  id: number;
  card_id: number;
  product_id: number;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit_price: number;
  discount: number; // Valor absoluto em reais
  subtotal: number;
  total: number;
}

/**
 * Seção "Produto" - Gerenciamento de produtos vinculados ao card
 * Quarta seção da coluna esquerda, expandida por padrão quando há produtos
 */
const ProductSection: React.FC<ProductSectionProps> = ({ card, onUpdate }) => {
  // Produtos vindos do backend (card.products)
  const products = (card as any).products || [];
  const productsTotal = (card as any).products_total || 0;

  const [showProductSearch, setShowProductSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Estado de edição: { [productId]: { quantity, discountPercent } }
  const [editingProduct, setEditingProduct] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<{ quantity: number; discountPercent: number }>({
    quantity: 1,
    discountPercent: 0,
  });

  // Estado do modal de pagamento
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    payment_method: "",
    installments: 1,
    notes: "",
  });

  // Dados de pagamento do card
  const paymentInfo = (card as any).payment_info;

  // Carrega produtos disponíveis quando abrir o modal
  useEffect(() => {
    if (showProductSearch) {
      loadAvailableProducts();
    }
  }, [showProductSearch]);

  /**
   * Carrega lista de produtos disponíveis
   */
  const loadAvailableProducts = async () => {
    try {
      setLoading(true);
      const response = await productService.list({ page_size: 100, is_active: true });
      setAvailableProducts(response.products);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
      alert("Erro ao carregar lista de produtos");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Calcula subtotal de todos os produtos
   */
  const calculateSubtotal = () => {
    return products.reduce((sum: number, p: ProductItem) => sum + p.subtotal, 0);
  };

  /**
   * Calcula desconto total
   */
  const calculateTotalDiscount = () => {
    return products.reduce((sum: number, p: ProductItem) => sum + p.discount, 0);
  };

  /**
   * Calcula valor total do card
   */
  const calculateTotal = () => {
    return products.reduce((sum: number, p: ProductItem) => sum + p.total, 0);
  };

  /**
   * Adiciona produto
   */
  const handleAddProduct = async (productId: number) => {
    const product = availableProducts.find(p => p.id === productId);
    if (!product) return;

    try {
      setLoading(true);
      await productService.addToCard(card.id, {
        product_id: product.id,
        quantity: 1,
        unit_price: parseFloat(product.unit_price),
        discount: 0,
      });

      setShowProductSearch(false);
      setSearchTerm("");
      onUpdate();
    } catch (error) {
      console.error("Erro ao adicionar produto:", error);
      alert("Erro ao adicionar produto");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Remove produto
   */
  const handleRemoveProduct = async (cardProductId: number) => {
    if (!confirm("Remover este produto?")) return;

    try {
      setLoading(true);
      await productService.removeFromCard(cardProductId);
      onUpdate();
    } catch (error) {
      console.error("Erro ao remover produto:", error);
      alert("Erro ao remover produto");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Inicia edição de um produto
   */
  const handleStartEdit = (product: ProductItem) => {
    setEditingProduct(product.id);

    // Calcula percentual de desconto baseado no valor atual
    const discountPercent = product.subtotal > 0
      ? (product.discount / product.subtotal) * 100
      : 0;

    setEditValues({
      quantity: product.quantity,
      discountPercent: Math.round(discountPercent * 100) / 100, // arredonda para 2 casas
    });
  };

  /**
   * Cancela edição
   */
  const handleCancelEdit = () => {
    setEditingProduct(null);
    setEditValues({ quantity: 1, discountPercent: 0 });
  };

  /**
   * Salva alterações do produto
   */
  const handleSaveEdit = async (product: ProductItem) => {
    if (editValues.quantity < 1) {
      alert("Quantidade deve ser maior que 0");
      return;
    }

    if (editValues.discountPercent < 0 || editValues.discountPercent > 100) {
      alert("Desconto deve estar entre 0% e 100%");
      return;
    }

    try {
      setLoading(true);

      // Calcula desconto em valor absoluto baseado no percentual
      const subtotal = editValues.quantity * product.unit_price;
      const discountValue = (subtotal * editValues.discountPercent) / 100;

      await productService.updateCardProduct(product.id, {
        quantity: editValues.quantity,
        discount: discountValue,
      });

      setEditingProduct(null);
      onUpdate();
    } catch (error) {
      console.error("Erro ao atualizar produto:", error);
      alert("Erro ao atualizar produto");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Formata moeda
   */
  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  /**
   * Abre modal de pagamento
   */
  const handleOpenPaymentModal = () => {
    if (paymentInfo) {
      // Se já tem informações de pagamento, carrega no form para editar
      setPaymentForm({
        payment_method: paymentInfo.payment_method || "",
        installments: paymentInfo.installments || 1,
        notes: paymentInfo.notes || "",
      });
    } else {
      // Senão, limpa o form
      setPaymentForm({
        payment_method: "",
        installments: 1,
        notes: "",
      });
    }
    setShowPaymentModal(true);
  };

  /**
   * Salva condições de pagamento
   */
  const handleSavePayment = async () => {
    if (!paymentForm.payment_method) {
      alert("Selecione a forma de pagamento");
      return;
    }

    try {
      setLoading(true);
      await cardService.update(card.id, {
        payment_info: {
          payment_method: paymentForm.payment_method,
          installments: paymentForm.installments,
          notes: paymentForm.notes,
        },
      });
      setShowPaymentModal(false);
      onUpdate();
    } catch (error) {
      console.error("Erro ao salvar condições de pagamento:", error);
      alert("Erro ao salvar condições de pagamento");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Remove condições de pagamento
   */
  const handleRemovePayment = async () => {
    if (!confirm("Remover condições de pagamento?")) return;

    try {
      setLoading(true);
      await cardService.update(card.id, {
        payment_info: null,
      });
      onUpdate();
    } catch (error) {
      console.error("Erro ao remover condições de pagamento:", error);
      alert("Erro ao remover condições de pagamento");
    } finally {
      setLoading(false);
    }
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
      defaultExpanded={false}
      icon={<Package size={18} />}
      badge={products.length > 0 ? products.length : undefined}
    >
      <div className="space-y-4">
        {/* Lista de produtos */}
        {products.length > 0 ? (
          <div className="space-y-3">
            {products.map((product: ProductItem) => {
              const isEditing = editingProduct === product.id;

              // Calcula percentual de desconto atual
              const currentDiscountPercent = product.subtotal > 0
                ? (product.discount / product.subtotal) * 100
                : 0;

              // Calcula valores para o modo de edição
              const editSubtotal = isEditing
                ? editValues.quantity * product.unit_price
                : product.subtotal;
              const editDiscount = isEditing
                ? (editSubtotal * editValues.discountPercent) / 100
                : product.discount;
              const editTotal = editSubtotal - editDiscount;

              return (
                <div
                  key={product.id}
                  className="p-3 bg-slate-900/50 border border-slate-700 rounded-lg space-y-3"
                >
                  {/* Header do produto */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-white">{product.product_name || "Produto sem nome"}</p>
                      <p className="text-xs text-slate-500">
                        SKU: {product.product_sku || "N/A"}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {!isEditing && (
                        <>
                          <button
                            onClick={() => handleStartEdit(product)}
                            className="p-1 hover:bg-blue-500/20 rounded text-blue-400 hover:text-blue-300 transition-colors"
                            title="Editar produto"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleRemoveProduct(product.id)}
                            className="p-1 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300 transition-colors"
                            title="Remover produto"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Campos de quantidade e valores */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <label className="text-xs text-slate-400">Quantidade</label>
                      {isEditing ? (
                        <input
                          type="number"
                          min="1"
                          value={editValues.quantity}
                          onChange={(e) => setEditValues({ ...editValues, quantity: parseInt(e.target.value) || 1 })}
                          className="w-full px-2 py-1.5 bg-slate-800 border border-blue-500 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="px-2 py-1.5 bg-slate-800/30 border border-slate-700/50 rounded text-white">
                          {product.quantity}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-xs text-slate-400">Valor unitário</label>
                      <p className="px-2 py-1.5 bg-slate-800/30 border border-slate-700/50 rounded text-white">
                        {formatCurrency(product.unit_price)}
                      </p>
                    </div>

                    <div>
                      <label className="text-xs text-slate-400">Desconto (%)</label>
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={editValues.discountPercent}
                          onChange={(e) => setEditValues({ ...editValues, discountPercent: parseFloat(e.target.value) || 0 })}
                          className="w-full px-2 py-1.5 bg-slate-800 border border-blue-500 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="px-2 py-1.5 bg-slate-800/30 border border-slate-700/50 rounded text-white">
                          {currentDiscountPercent.toFixed(2)}%
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-xs text-slate-400">Total da linha</label>
                      <p className="px-2 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded text-blue-400 font-medium">
                        {formatCurrency(isEditing ? editTotal : product.total)}
                      </p>
                    </div>
                  </div>

                  {/* Botões de edição */}
                  {isEditing && (
                    <div className="flex gap-2 pt-2 border-t border-slate-700/50">
                      <button
                        onClick={() => handleSaveEdit(product)}
                        disabled={loading}
                        className="flex-1 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/50 rounded font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Check size={16} />
                        Salvar
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={loading}
                        className="flex-1 px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 text-slate-300 border border-slate-600 rounded font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <X size={16} />
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

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

            {/* Condições de pagamento (se existirem) */}
            {paymentInfo && (
              <div className="pt-3 border-t border-slate-700/50 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-300">Condições de Pagamento</h4>
                  <div className="flex gap-1">
                    <button
                      onClick={handleOpenPaymentModal}
                      className="p-1 hover:bg-blue-500/20 rounded text-blue-400 hover:text-blue-300 transition-colors"
                      title="Editar condições"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={handleRemovePayment}
                      className="p-1 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300 transition-colors"
                      title="Remover condições"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CreditCard size={16} className="text-emerald-400 flex-shrink-0" />
                    <span className="text-slate-300">
                      <span className="font-medium text-emerald-400">{paymentInfo.payment_method}</span>
                      {paymentInfo.installments > 1 && (
                        <span className="text-slate-400"> - {paymentInfo.installments}x</span>
                      )}
                    </span>
                  </div>

                  {paymentInfo.notes && (
                    <p className="text-xs text-slate-400 pl-6">{paymentInfo.notes}</p>
                  )}
                </div>
              </div>
            )}

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

        {/* Botão adicionar/editar parcelamento */}
        <button
          onClick={handleOpenPaymentModal}
          disabled={products.length === 0}
          className={`w-full px-4 py-2 border rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
            products.length > 0
              ? "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border-emerald-500/50"
              : "bg-slate-800/30 text-slate-600 border-slate-700/50 cursor-not-allowed"
          }`}
        >
          <CreditCard size={18} />
          {paymentInfo ? "Editar condições de pagamento" : "Adicionar condições de pagamento"}
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
            </div>
          </div>
        )}

        {/* Modal de condições de pagamento */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-semibold text-white mb-4">Condições de Pagamento</h3>

              <div className="space-y-4">
                {/* Forma de pagamento */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Forma de pagamento *
                  </label>
                  <select
                    value={paymentForm.payment_method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Selecione...</option>
                    <option value="Boleto">Boleto</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="PIX">PIX</option>
                    <option value="Transferência">Transferência</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                {/* Número de parcelas */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Número de parcelas
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={paymentForm.installments}
                    onChange={(e) => setPaymentForm({ ...paymentForm, installments: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Observações */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Observações
                  </label>
                  <textarea
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    placeholder="Ex: Primeira parcela em 30 dias, sem juros..."
                    rows={3}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-2 mt-6">
                <button
                  onClick={handleSavePayment}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/50 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Salvar
                </button>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ExpandableSection>
  );
};

export default ProductSection;
