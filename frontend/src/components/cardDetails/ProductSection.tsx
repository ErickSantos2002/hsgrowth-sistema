import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { Package, Plus, Trash2, Search, CreditCard, Info, Edit2, Check, X } from "lucide-react";
import ExpandableSection from "./ExpandableSection";
import { Card } from "../../types";
import productService from "../../services/productService";
import cardService from "../../services/cardService";
import { showError, showWarning } from "../../utils/toast";

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
      const response = await productService.list({ page_size: 10000, is_active: true });
      setAvailableProducts(response.products);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
      showError("Erro ao carregar lista de produtos");
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
      showError("Erro ao adicionar produto");
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
      showError("Erro ao remover produto");
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
      showWarning("Quantidade deve ser maior que 0");
      return;
    }

    if (editValues.discountPercent < 0 || editValues.discountPercent > 100) {
      showWarning("Desconto deve estar entre 0% e 100%");
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
      showError("Erro ao atualizar produto");
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
      showWarning("Selecione a forma de pagamento");
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
      showError("Erro ao salvar condições de pagamento");
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
      showError("Erro ao remover condições de pagamento");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Filtra produtos disponíveis
   */
  const filteredProducts = availableProducts.filter(p =>
    !products.some((prod: ProductItem) => prod.product_id === p.id) &&
    (p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     p.sku?.toLowerCase().includes(searchTerm.toLowerCase()))
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
                  className="space-y-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 p-3"
                >
                  {/* Header do produto */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 dark:text-white">{product.product_name || "Produto sem nome"}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        SKU: {product.product_sku || "N/A"}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {!isEditing && (
                        <>
                          <button
                            onClick={() => handleStartEdit(product)}
                            className="rounded p-1 text-blue-400 transition-colors hover:bg-blue-500/20 hover:text-blue-300"
                            title="Editar produto"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleRemoveProduct(product.id)}
                            className="rounded p-1 text-red-400 transition-colors hover:bg-red-500/20 hover:text-red-300"
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
                      <label className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">Quantidade</label>
                      {isEditing ? (
                        <input
                          type="number"
                          min="1"
                          value={editValues.quantity}
                          onChange={(e) => setEditValues({ ...editValues, quantity: parseInt(e.target.value) || 1 })}
                          className="w-full rounded border border-blue-500 bg-gray-100 dark:bg-slate-800 px-2 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="rounded border border-gray-200/50 dark:border-slate-700/50 bg-gray-100/30 dark:bg-slate-800/30 px-2 py-1.5 text-slate-900 dark:text-white">
                          {product.quantity}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">Valor unitário</label>
                      <p className="rounded border border-gray-200/50 dark:border-slate-700/50 bg-gray-100/30 dark:bg-slate-800/30 px-2 py-1.5 text-slate-900 dark:text-white">
                        {formatCurrency(product.unit_price)}
                      </p>
                    </div>

                    <div>
                      <label className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">Desconto (%)</label>
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={editValues.discountPercent}
                          onChange={(e) => setEditValues({ ...editValues, discountPercent: parseFloat(e.target.value) || 0 })}
                          className="w-full rounded border border-blue-500 bg-gray-100 dark:bg-slate-800 px-2 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="rounded border border-gray-200/50 dark:border-slate-700/50 bg-gray-100/30 dark:bg-slate-800/30 px-2 py-1.5 text-slate-900 dark:text-white">
                          {currentDiscountPercent.toFixed(2)}%
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">Total da linha</label>
                      <p className="rounded border border-blue-500/30 bg-blue-500/10 px-2 py-1.5 font-medium text-blue-400">
                        {formatCurrency(isEditing ? editTotal : product.total)}
                      </p>
                    </div>
                  </div>

                  {/* Botões de edição */}
                  {isEditing && (
                    <div className="flex gap-2 border-t border-gray-200/50 dark:border-slate-700/50 pt-2">
                      <button
                        onClick={() => handleSaveEdit(product)}
                        disabled={loading}
                        className="flex flex-1 items-center justify-center gap-2 rounded border border-emerald-500/50 bg-emerald-500/20 px-3 py-1.5 font-medium text-emerald-400 transition-colors hover:bg-emerald-500/30 disabled:opacity-50"
                      >
                        <Check size={16} />
                        Salvar
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={loading}
                        className="flex flex-1 items-center justify-center gap-2 rounded border border-gray-300 dark:border-slate-600 bg-gray-200/50 dark:bg-slate-700/50 px-3 py-1.5 font-medium text-slate-600 dark:text-slate-300 transition-colors hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-50"
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
            <div className="space-y-2 border-t border-gray-200/50 dark:border-slate-700/50 pt-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400 dark:text-slate-500 dark:text-slate-400">Subtotal:</span>
                <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(calculateSubtotal())}</span>
              </div>

              {calculateTotalDiscount() > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400 dark:text-slate-500 dark:text-slate-400">Desconto total:</span>
                  <span className="font-medium text-red-400">- {formatCurrency(calculateTotalDiscount())}</span>
                </div>
              )}

              <div className="flex justify-between border-t border-gray-200/50 dark:border-slate-700/50 pt-2 text-base">
                <span className="font-semibold text-slate-900 dark:text-white">Valor total:</span>
                <span className="text-lg font-semibold text-emerald-400">
                  {formatCurrency(calculateTotal())}
                </span>
              </div>
            </div>

            {/* Condições de pagamento (se existirem) */}
            {paymentInfo && (
              <div className="space-y-2 border-t border-gray-200/50 dark:border-slate-700/50 pt-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Condições de Pagamento</h4>
                  <div className="flex gap-1">
                    <button
                      onClick={handleOpenPaymentModal}
                      className="rounded p-1 text-blue-400 transition-colors hover:bg-blue-500/20 hover:text-blue-300"
                      title="Editar condições"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={handleRemovePayment}
                      className="rounded p-1 text-red-400 transition-colors hover:bg-red-500/20 hover:text-red-300"
                      title="Remover condições"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <CreditCard size={16} className="flex-shrink-0 text-emerald-400" />
                    <span className="text-slate-600 dark:text-slate-300">
                      <span className="font-medium text-emerald-400">{paymentInfo.payment_method}</span>
                      {paymentInfo.installments > 1 && (
                        <span className="text-slate-400 dark:text-slate-500 dark:text-slate-400"> - {paymentInfo.installments}x</span>
                      )}
                    </span>
                  </div>

                  {paymentInfo.notes && (
                    <p className="pl-6 text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">{paymentInfo.notes}</p>
                  )}
                </div>
              </div>
            )}

            {/* Info sobre sincronização com Resumo */}
            <div className="flex items-start gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
              <Info size={16} className="mt-0.5 flex-shrink-0 text-blue-400" />
              <p className="text-xs text-blue-300">
                O valor total é sincronizado automaticamente com a seção "Resumo". Para editar
                manualmente, remova todos os produtos.
              </p>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center">
            <Package size={32} className="mx-auto mb-2 text-slate-600" />
            <p className="mb-4 text-sm text-slate-400 dark:text-slate-500 dark:text-slate-400">Nenhum produto adicionado</p>
          </div>
        )}

        {/* Botão adicionar produto */}
        <button
          onClick={() => setShowProductSearch(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-500/50 bg-blue-500/20 px-4 py-2 font-medium text-blue-400 transition-colors hover:bg-blue-500/30"
        >
          <Plus size={18} />
          Adicionar produto
        </button>

        {/* Botão adicionar/editar parcelamento */}
        <button
          onClick={handleOpenPaymentModal}
          disabled={products.length === 0}
          className={`flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2 font-medium transition-colors ${
            products.length > 0
              ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
              : "cursor-not-allowed border-gray-200/50 dark:border-slate-700/50 bg-gray-100/30 dark:bg-slate-800/30 text-slate-600"
          }`}
        >
          <CreditCard size={18} />
          {paymentInfo ? "Editar condições de pagamento" : "Adicionar condições de pagamento"}
        </button>

        {/* Modal de busca de produtos (renderizado no body via Portal) */}
        {showProductSearch && ReactDOM.createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => {
              setShowProductSearch(false);
              setSearchTerm("");
            }}
          >
            <div
              className="flex max-h-[600px] w-full max-w-lg flex-col rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 p-4">
                <h3 className="font-semibold text-slate-900 dark:text-white">Adicionar Produto</h3>
                <button
                  onClick={() => {
                    setShowProductSearch(false);
                    setSearchTerm("");
                  }}
                  className="text-slate-400 dark:text-slate-500 dark:text-slate-400 transition-colors hover:text-slate-900 dark:hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Campo de busca dentro do modal */}
              <div className="border-b border-gray-200 dark:border-slate-700 p-4">
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 dark:text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por nome ou SKU..."
                    className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 py-3 pl-10 pr-10 text-slate-900 dark:text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    autoFocus
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              </div>

              {/* Resultados */}
              <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                  <div className="p-8 text-center text-sm text-slate-400 dark:text-slate-500 dark:text-slate-400">
                    Carregando produtos...
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-400 dark:text-slate-500 dark:text-slate-400">
                    {searchTerm
                      ? "Nenhum produto encontrado com esse critério"
                      : availableProducts.length === 0
                      ? "Nenhum produto cadastrado"
                      : "Todos os produtos já foram adicionados"}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredProducts.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => handleAddProduct(product.id)}
                        className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 p-3 text-left transition-colors hover:bg-gray-200/50 dark:hover:bg-slate-700/50"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">{product.name}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">SKU: {product.sku}</p>
                          </div>
                          <p className="text-sm font-medium text-emerald-400">
                            {formatCurrency(parseFloat(product.unit_price))}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Modal de condições de pagamento (renderizado no body via Portal) */}
        {showPaymentModal && ReactDOM.createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowPaymentModal(false)}
          >
            <div
              className="w-full max-w-md rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 p-4">
                <h3 className="font-semibold text-slate-900 dark:text-white">Condições de Pagamento</h3>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="text-slate-400 dark:text-slate-500 dark:text-slate-400 transition-colors hover:text-slate-900 dark:hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  {/* Forma de pagamento */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
                      Forma de pagamento *
                    </label>
                    <select
                      value={paymentForm.payment_method}
                      onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
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
                    <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
                      Número de parcelas
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={paymentForm.installments}
                      onChange={(e) => setPaymentForm({ ...paymentForm, installments: parseInt(e.target.value) || 1 })}
                      className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Observações */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
                      Observações
                    </label>
                    <textarea
                      value={paymentForm.notes}
                      onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                      placeholder="Ex: Primeira parcela em 30 dias, sem juros..."
                      rows={3}
                      className="w-full resize-none rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-2 text-slate-900 dark:text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Botões */}
                <div className="mt-6 flex gap-2">
                  <button
                    onClick={handleSavePayment}
                    disabled={loading}
                    className="flex-1 rounded-lg border border-emerald-500/50 bg-emerald-500/20 px-4 py-2 font-medium text-emerald-400 transition-colors hover:bg-emerald-500/30 disabled:opacity-50"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    disabled={loading}
                    className="flex-1 rounded-lg bg-gray-200 dark:bg-slate-700 px-4 py-2 font-medium text-slate-900 dark:text-white transition-colors hover:bg-slate-600 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </ExpandableSection>
  );
};

export default ProductSection;
