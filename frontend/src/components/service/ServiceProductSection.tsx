import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { Package, Plus, Trash2, Search, CreditCard, Info, Edit2, Check, X } from "lucide-react";
import ExpandableSection from "../cardDetails/ExpandableSection";
import { SelectMenu } from "../common";
import productService from "../../services/productService";
import serviceBoardService, { ServiceCardProduct, ServiceAparelho } from "../../services/serviceBoardService";
import { showError, showWarning } from "../../utils/toast";
import { useConfirm } from "../../contexts/ConfirmContext";

interface ServiceProductSectionProps {
  boardId: number;
  cardId: number;
  paymentInfo?: Record<string, any>;
  /** Persiste o payment_info (desconto global + condições de pagamento) no card. */
  onSavePaymentInfo: (paymentInfo: Record<string, any> | null) => Promise<void>;
  /** Avisa o pai quando produtos mudam (para atualizar o histórico de atividades). */
  onChange?: () => void;
}

type DiscountType = "value" | "percent";

/**
 * Editor da sub-lista de aparelhos de um produto.
 * Cada aparelho guarda os dados preenchidos pelo laboratório (Nº Série, Modelo,
 * Módulo de álcool, Data de próxima recalibragem). Salvo como JSON na linha do produto.
 */
const AparelhosEditor: React.FC<{
  product: ServiceCardProduct;
  boardId: number;
  cardId: number;
  onSaved: () => void;
}> = ({ product, boardId, cardId, onSaved }) => {
  const [list, setList] = useState<ServiceAparelho[]>(product.aparelhos || []);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setList(product.aparelhos || []);
    setDirty(false);
  }, [product.aparelhos]);

  const setField = (i: number, field: keyof ServiceAparelho, value: string) => {
    setList((prev) => prev.map((a, idx) => (idx === i ? { ...a, [field]: value } : a)));
    setDirty(true);
  };
  // Novo aparelho já vem com o Modelo preenchido (o produto escolhido = o modelo)
  const add = () => { setList((prev) => [...prev, { model: product.product_name || "" }]); setDirty(true); };
  const remove = (i: number) => { setList((prev) => prev.filter((_, idx) => idx !== i)); setDirty(true); };
  const save = async () => {
    // Validação: precisa de pelo menos 1 aparelho...
    if (list.length === 0) {
      showWarning("Adicione pelo menos 1 aparelho antes de salvar.");
      return;
    }
    // ...e cada aparelho precisa de Nº de Série + Data de próxima recalibragem.
    const invalid = list.findIndex(
      (a) => !(a.serial_number || "").trim() || !(a.next_recalibration_date || "").trim()
    );
    if (invalid !== -1) {
      showWarning(`Preencha o Nº de Série e a Data de próxima recalibragem do Aparelho ${invalid + 1}.`);
      return;
    }
    setSaving(true);
    try {
      await serviceBoardService.updateCardProduct(boardId, cardId, product.id, { aparelhos: list });
      setDirty(false);
      onSaved();
    } catch {
      showError("Erro ao salvar aparelhos");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none";

  return (
    <div className="space-y-2 border-t border-gray-200/50 dark:border-slate-700/50 pt-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400">Aparelhos ({list.length})</span>
        <button onClick={add} className="flex items-center gap-1 rounded border border-blue-500/40 bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-400 transition-colors hover:bg-blue-500/20">
          <Plus size={13} /> Adicionar aparelho
        </button>
      </div>
      {list.length > 0 && (
        <p className="text-[11px] text-slate-400"><span className="text-red-400">*</span> obrigatório</p>
      )}

      {list.length === 0 ? (
        <p className="rounded border border-dashed border-gray-300 dark:border-slate-700 px-2 py-2 text-center text-xs italic text-slate-400">
          Nenhum aparelho. Adicione os dados do laboratório por unidade.
        </p>
      ) : (
        list.map((ap, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/40 p-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Aparelho {i + 1}</span>
              <button onClick={() => remove(i)} className="rounded p-1 text-red-400 transition-colors hover:bg-red-500/20" title="Remover aparelho"><Trash2 size={14} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-400">Nº de Série <span className="text-red-400">*</span></label>
                <input value={ap.serial_number || ""} onChange={(e) => setField(i, "serial_number", e.target.value)} placeholder="Ex: AB123" className={inputCls} />
              </div>
              <div>
                <label className="text-[11px] text-slate-400">Modelo</label>
                <input value={ap.model || ""} onChange={(e) => setField(i, "model", e.target.value)} placeholder="Ex: X100" className={inputCls} />
              </div>
              <div>
                <label className="text-[11px] text-slate-400">Módulo de álcool</label>
                <input value={ap.alcohol_module || ""} onChange={(e) => setField(i, "alcohol_module", e.target.value)} placeholder="Opcional" className={inputCls} />
              </div>
              <div>
                <label className="text-[11px] text-slate-400">Próxima recalibragem <span className="text-red-400">*</span></label>
                <input type="date" value={ap.next_recalibration_date || ""} onChange={(e) => setField(i, "next_recalibration_date", e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>
        ))
      )}

      {dirty && (
        <button onClick={save} disabled={saving} className="flex w-full items-center justify-center gap-2 rounded border border-emerald-500/50 bg-emerald-500/20 px-3 py-1.5 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/30 disabled:opacity-50">
          <Check size={15} /> {saving ? "Salvando..." : "Salvar aparelhos"}
        </button>
      )}
    </div>
  );
};

/**
 * Seção "Produto" do card de serviços — espelha o padrão do board de vendas.
 * Os produtos são buscados via API própria (service_card_products); o desconto
 * global e as condições de pagamento ficam no payment_info do card.
 */
const ServiceProductSection: React.FC<ServiceProductSectionProps> = ({
  boardId,
  cardId,
  paymentInfo,
  onSavePaymentInfo,
  onChange,
}) => {
  const { confirm } = useConfirm();

  const [products, setProducts] = useState<ServiceCardProduct[]>([]);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Edição por produto
  const [editingProduct, setEditingProduct] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<{
    quantity: string;
    discountType: DiscountType;
    discountInput: string;
  }>({ quantity: "1", discountType: "value", discountInput: "" });

  // Desconto global
  const [globalDiscountInput, setGlobalDiscountInput] = useState<string>("");
  const [globalDiscountType, setGlobalDiscountType] = useState<DiscountType>("value");
  const [savingDiscount, setSavingDiscount] = useState(false);
  const [editingGlobalDiscount, setEditingGlobalDiscount] = useState(false);

  // Modal de pagamento
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    payment_method: "",
    installments: 1,
    notes: "",
  });

  // Carrega os produtos do card
  const loadProducts = async () => {
    try {
      const summary = await serviceBoardService.getCardProducts(boardId, cardId);
      setProducts(summary.items);
    } catch {
      showError("Erro ao carregar produtos do card");
    }
  };

  useEffect(() => {
    loadProducts();
  }, [boardId, cardId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sincroniza desconto global quando o payment_info muda
  useEffect(() => {
    const gd: number = paymentInfo?.global_discount ?? 0;
    const gdt: DiscountType = paymentInfo?.global_discount_type === "percent" ? "percent" : "value";
    setGlobalDiscountType(gdt);
    if (gd > 0) {
      setGlobalDiscountInput(
        gdt === "percent"
          ? String(gd).replace(".", ",")
          : gd.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      );
    } else {
      setGlobalDiscountInput("");
    }
  }, [paymentInfo]);

  useEffect(() => {
    if (showProductSearch) loadAvailableProducts();
  }, [showProductSearch]);

  const loadAvailableProducts = async () => {
    try {
      setLoading(true);
      const response = await productService.list({ page_size: 10000, is_active: true });
      setAvailableProducts(response.products);
    } catch {
      showError("Erro ao carregar lista de produtos");
    } finally {
      setLoading(false);
    }
  };

  const parseDecimalInput = (value: string): number => parseFloat(value.replace(",", ".")) || 0;
  const sanitizeDecimalInput = (value: string): string => value.replace(/[^0-9,.]/g, "");
  const formatCurrency = (value: number) =>
    `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Totais
  const calcSubtotal = () => products.reduce((s, p) => s + p.subtotal, 0);
  const calcProductDiscount = () => products.reduce((s, p) => s + p.discount, 0);
  const calcAfterProductDiscount = () => products.reduce((s, p) => s + p.total, 0);

  const calcGlobalDiscountAmount = () => {
    const base = calcAfterProductDiscount();
    const inputVal = parseDecimalInput(globalDiscountInput);
    return globalDiscountType === "percent"
      ? Math.round((base * inputVal / 100) * 100) / 100
      : inputVal;
  };

  const calcTotal = () => calcAfterProductDiscount() - calcGlobalDiscountAmount();

  const calcProductDiscountAmount = (unitPrice: number, quantity: number) => {
    const subtotal = quantity * unitPrice;
    const inputVal = parseDecimalInput(editValues.discountInput);
    return editValues.discountType === "percent"
      ? Math.round((subtotal * inputVal / 100) * 100) / 100
      : inputVal;
  };

  // Valor usado nos serviços: o valor da calibração do produto
  const getCalibrationPrice = (product: any): number =>
    parseFloat(product?.calibration_price ?? 0) || 0;

  const handleAddProduct = async (productId: number) => {
    const product = availableProducts.find((p) => p.id === productId);
    if (!product) return;
    try {
      setLoading(true);
      await serviceBoardService.addCardProduct(boardId, cardId, {
        product_id: product.id,
        quantity: 1,
        unit_price: getCalibrationPrice(product),
        discount: 0,
      });
      setShowProductSearch(false);
      setSearchTerm("");
      await loadProducts();
      onChange?.();
    } catch {
      showError("Erro ao adicionar produto");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveProduct = async (itemId: number) => {
    const confirmed = await confirm({
      title: "Remover produto",
      message: "Tem certeza que deseja remover este produto do card?",
      confirmText: "Remover",
      isDanger: true,
    });
    if (!confirmed) return;
    try {
      setLoading(true);
      await serviceBoardService.removeCardProduct(boardId, cardId, itemId);
      await loadProducts();
      onChange?.();
    } catch {
      showError("Erro ao remover produto");
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (product: ServiceCardProduct) => {
    setEditingProduct(product.id);
    setEditValues({
      quantity: String(product.quantity).replace(".", ","),
      discountType: "value",
      discountInput: product.discount > 0
        ? product.discount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : "",
    });
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setEditValues({ quantity: "1", discountType: "value", discountInput: "" });
  };

  const handleSaveEdit = async (product: ServiceCardProduct) => {
    const qty = parseDecimalInput(editValues.quantity);
    if (qty <= 0) { showWarning("Quantidade deve ser maior que 0"); return; }

    const subtotal = qty * product.unit_price;
    const discount = calcProductDiscountAmount(product.unit_price, qty);

    if (discount < 0) { showWarning("Desconto não pode ser negativo"); return; }
    if (discount > subtotal) {
      showWarning(`Desconto não pode ser maior que o subtotal da linha (${formatCurrency(subtotal)})`);
      return;
    }
    if (editValues.discountType === "percent") {
      const pct = parseDecimalInput(editValues.discountInput);
      if (pct > 100) { showWarning("Percentual de desconto não pode ultrapassar 100%"); return; }
    }

    try {
      setLoading(true);
      await serviceBoardService.updateCardProduct(boardId, cardId, product.id, {
        quantity: Math.round(qty),
        discount,
      });
      setEditingProduct(null);
      await loadProducts();
    } catch {
      showError("Erro ao atualizar produto");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGlobalDiscount = async () => {
    const inputVal = parseDecimalInput(globalDiscountInput);
    if (inputVal < 0) { showWarning("Desconto não pode ser negativo"); return; }
    if (globalDiscountType === "percent" && inputVal > 100) {
      showWarning("Percentual de desconto não pode ultrapassar 100%");
      return;
    }

    const base = calcAfterProductDiscount();
    const discountAmount = globalDiscountType === "percent" ? base * inputVal / 100 : inputVal;
    if (discountAmount > base) {
      showWarning(`Desconto global não pode ser maior que ${formatCurrency(base)}`);
      return;
    }

    try {
      setSavingDiscount(true);
      await onSavePaymentInfo({
        ...(paymentInfo || {}),
        global_discount: inputVal || 0,
        global_discount_type: globalDiscountType,
      });
      setEditingGlobalDiscount(false);
    } catch {
      showError("Erro ao salvar desconto global");
    } finally {
      setSavingDiscount(false);
    }
  };

  const handleOpenPaymentModal = () => {
    setPaymentForm({
      payment_method: paymentInfo?.payment_method || "",
      installments: paymentInfo?.installments || 1,
      notes: paymentInfo?.notes || "",
    });
    setShowPaymentModal(true);
  };

  const handleSavePayment = async () => {
    if (!paymentForm.payment_method) { showWarning("Selecione a forma de pagamento"); return; }
    try {
      setLoading(true);
      await onSavePaymentInfo({
        ...(paymentInfo || {}),
        payment_method: paymentForm.payment_method,
        installments: paymentForm.installments,
        notes: paymentForm.notes,
      });
      setShowPaymentModal(false);
    } catch {
      showError("Erro ao salvar condições de pagamento");
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePayment = async () => {
    const confirmed = await confirm({
      title: "Remover condições de pagamento",
      message: "Tem certeza que deseja remover as condições de pagamento deste card?",
      confirmText: "Remover",
      isDanger: true,
    });
    if (!confirmed) return;
    try {
      setLoading(true);
      const { payment_method, installments, notes, ...rest } = paymentInfo || {};
      await onSavePaymentInfo(Object.keys(rest).length ? rest : null);
    } catch {
      showError("Erro ao remover condições de pagamento");
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = availableProducts.filter((p) =>
    !products.some((prod) => prod.product_id === p.id) &&
    (p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const hasPayment = !!paymentInfo?.payment_method;

  const DiscountTypeToggle = ({ value, onChange }: { value: DiscountType; onChange: (t: DiscountType) => void }) => (
    <div className="flex overflow-hidden rounded border border-gray-300 dark:border-slate-600 text-xs">
      <button type="button" onClick={() => onChange("value")}
        className={`px-2 py-1 transition-colors ${value === "value" ? "bg-blue-500 text-white" : "bg-transparent text-slate-400 hover:text-slate-200"}`}>R$</button>
      <button type="button" onClick={() => onChange("percent")}
        className={`px-2 py-1 transition-colors ${value === "percent" ? "bg-blue-500 text-white" : "bg-transparent text-slate-400 hover:text-slate-200"}`}>%</button>
    </div>
  );

  return (
    <ExpandableSection
      title="Produto"
      defaultExpanded={false}
      icon={<Package size={18} />}
      badge={products.length > 0 ? products.length : undefined}
    >
      <div className="space-y-4">
        {products.length > 0 ? (
          <div className="space-y-3">
            {products.map((product) => {
              const isEditing = editingProduct === product.id;
              const editQty = isEditing ? parseDecimalInput(editValues.quantity) : product.quantity;
              const lineSubtotal = editQty * product.unit_price;
              const lineDiscount = isEditing ? calcProductDiscountAmount(product.unit_price, editQty) : product.discount;
              const lineTotal = lineSubtotal - lineDiscount;

              return (
                <div key={product.id} className="space-y-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 dark:text-white">{product.product_name || "Produto sem nome"}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">SKU: {product.product_sku || "N/A"}</p>
                    </div>
                    {!isEditing && (
                      <div className="flex gap-1">
                        <button onClick={() => handleStartEdit(product)} className="rounded p-1 text-blue-400 transition-colors hover:bg-blue-500/20 hover:text-blue-300" title="Editar produto"><Edit2 size={16} /></button>
                        <button onClick={() => handleRemoveProduct(product.id)} className="rounded p-1 text-red-400 transition-colors hover:bg-red-500/20 hover:text-red-300" title="Remover produto"><Trash2 size={16} /></button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <label className="text-xs text-slate-400">Quantidade</label>
                      {isEditing ? (
                        <input type="text" inputMode="decimal" value={editValues.quantity}
                          onChange={(e) => setEditValues({ ...editValues, quantity: sanitizeDecimalInput(e.target.value) })}
                          className="w-full rounded border border-blue-500 bg-gray-100 dark:bg-slate-800 px-2 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      ) : (
                        <p className="rounded border border-gray-200/50 dark:border-slate-700/50 bg-gray-100/30 dark:bg-slate-800/30 px-2 py-1.5 text-slate-900 dark:text-white">{product.quantity}</p>
                      )}
                    </div>

                    <div>
                      <label className="text-xs text-slate-400">Valor da calibração</label>
                      <p className="rounded border border-gray-200/50 dark:border-slate-700/50 bg-gray-100/30 dark:bg-slate-800/30 px-2 py-1.5 text-slate-900 dark:text-white">{formatCurrency(product.unit_price)}</p>
                    </div>

                    <div>
                      <label className="text-xs text-slate-400">Desconto</label>
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input type="text" inputMode="decimal" value={editValues.discountInput}
                            onChange={(e) => setEditValues({ ...editValues, discountInput: sanitizeDecimalInput(e.target.value) })}
                            placeholder="0"
                            className="min-w-0 flex-1 rounded border border-blue-500 bg-gray-100 dark:bg-slate-800 px-2 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          <DiscountTypeToggle value={editValues.discountType} onChange={(t) => setEditValues({ ...editValues, discountType: t })} />
                        </div>
                      ) : (
                        <p className={`rounded border px-2 py-1.5 ${product.discount > 0 ? "border-red-500/30 bg-red-500/10 text-red-400" : "border-gray-200/50 dark:border-slate-700/50 bg-gray-100/30 dark:bg-slate-800/30 text-slate-400"}`}>
                          {product.discount > 0 ? `- ${formatCurrency(product.discount)}` : "—"}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-xs text-slate-400">Total da linha</label>
                      <p className="rounded border border-blue-500/30 bg-blue-500/10 px-2 py-1.5 font-medium text-blue-400">{formatCurrency(isEditing ? lineTotal : product.total)}</p>
                    </div>
                  </div>

                  {/* Sub-lista de aparelhos (dados do laboratório por unidade) */}
                  <AparelhosEditor
                    product={product}
                    boardId={boardId}
                    cardId={cardId}
                    onSaved={() => { loadProducts(); onChange?.(); }}
                  />

                  {isEditing && (
                    <div className="flex gap-2 border-t border-gray-200/50 dark:border-slate-700/50 pt-2">
                      <button onClick={() => handleSaveEdit(product)} disabled={loading} className="flex flex-1 items-center justify-center gap-2 rounded border border-emerald-500/50 bg-emerald-500/20 px-3 py-1.5 font-medium text-emerald-400 transition-colors hover:bg-emerald-500/30 disabled:opacity-50"><Check size={16} />Salvar</button>
                      <button onClick={handleCancelEdit} disabled={loading} className="flex flex-1 items-center justify-center gap-2 rounded border border-gray-300 dark:border-slate-600 bg-gray-200/50 dark:bg-slate-700/50 px-3 py-1.5 font-medium text-slate-600 dark:text-slate-300 transition-colors hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-50"><X size={16} />Cancelar</button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Totalizadores */}
            <div className="space-y-1.5 border-t border-gray-200/50 dark:border-slate-700/50 pt-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Subtotal:</span>
                <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(calcSubtotal())}</span>
              </div>

              {calcProductDiscount() > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Desc. produtos:</span>
                  <span className="font-medium text-orange-400">- {formatCurrency(calcProductDiscount())}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Desc. global:</span>
                <div className="flex items-center gap-1.5">
                  <span className={`text-sm font-medium ${calcGlobalDiscountAmount() > 0 ? "text-orange-400" : "text-slate-500"}`}>
                    {calcGlobalDiscountAmount() > 0 ? `- ${formatCurrency(calcGlobalDiscountAmount())}` : "—"}
                  </span>
                  <button onClick={() => setEditingGlobalDiscount(!editingGlobalDiscount)}
                    className={`rounded p-0.5 transition-colors ${editingGlobalDiscount ? "text-blue-400 bg-blue-500/20" : "text-slate-400 hover:text-blue-400 hover:bg-blue-500/10"}`}
                    title="Editar desconto global"><Edit2 size={13} /></button>
                </div>
              </div>

              {editingGlobalDiscount && (
                <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 space-y-2">
                  <p className="text-xs font-medium text-blue-300">Desconto global sobre o total</p>
                  <div className="flex items-center gap-2">
                    <input type="text" inputMode="decimal" value={globalDiscountInput}
                      onChange={(e) => setGlobalDiscountInput(sanitizeDecimalInput(e.target.value))}
                      placeholder={globalDiscountType === "percent" ? "Ex: 10" : "Ex: 500,00"}
                      className="flex-1 rounded border border-gray-300 dark:border-slate-600 bg-gray-100 dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                      autoFocus />
                    <DiscountTypeToggle value={globalDiscountType} onChange={setGlobalDiscountType} />
                  </div>
                  {calcGlobalDiscountAmount() > 0 && (
                    <p className="text-xs text-slate-400">= <span className="text-orange-400 font-medium">- {formatCurrency(calcGlobalDiscountAmount())}</span></p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button onClick={handleSaveGlobalDiscount} disabled={savingDiscount}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded border border-emerald-500/50 bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/30 disabled:opacity-50">
                      <Check size={13} />{savingDiscount ? "Salvando..." : "Aplicar"}</button>
                    <button onClick={() => setEditingGlobalDiscount(false)} disabled={savingDiscount}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded border border-gray-300 dark:border-slate-600 bg-gray-200/50 dark:bg-slate-700/50 px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-300 transition-colors hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-50">
                      <X size={13} />Cancelar</button>
                  </div>
                </div>
              )}

              {(calcProductDiscount() > 0 || calcGlobalDiscountAmount() > 0) && (
                <div className="flex justify-between items-center rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 mt-1">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Desconto total:</span>
                  <span className="font-semibold text-red-400">- {formatCurrency(calcProductDiscount() + calcGlobalDiscountAmount())}</span>
                </div>
              )}

              <div className="flex justify-between items-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5 mt-1">
                <span className="font-semibold text-slate-900 dark:text-white">Valor total:</span>
                <span className="text-xl font-bold text-emerald-400">{formatCurrency(calcTotal())}</span>
              </div>
            </div>

            {hasPayment && (
              <div className="space-y-2 border-t border-gray-200/50 dark:border-slate-700/50 pt-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Condições de Pagamento</h4>
                  <div className="flex gap-1">
                    <button onClick={handleOpenPaymentModal} className="rounded p-1 text-blue-400 transition-colors hover:bg-blue-500/20 hover:text-blue-300" title="Editar condições"><Edit2 size={14} /></button>
                    <button onClick={handleRemovePayment} className="rounded p-1 text-red-400 transition-colors hover:bg-red-500/20 hover:text-red-300" title="Remover condições"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <CreditCard size={16} className="flex-shrink-0 text-emerald-400" />
                    <span className="text-slate-600 dark:text-slate-300">
                      <span className="font-medium text-emerald-400">{paymentInfo?.payment_method}</span>
                      {paymentInfo?.installments > 1 && <span className="text-slate-400"> - {paymentInfo.installments}x</span>}
                    </span>
                  </div>
                  {paymentInfo?.notes && <p className="pl-6 text-xs text-slate-400">{paymentInfo.notes}</p>}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-6 text-center">
            <Package size={32} className="mx-auto mb-2 text-slate-600" />
            <p className="mb-4 text-sm text-slate-400">Nenhum produto adicionado</p>
          </div>
        )}

        <button onClick={() => setShowProductSearch(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-500/50 bg-blue-500/20 px-4 py-2 font-medium text-slate-900 dark:text-blue-400 transition-colors hover:bg-blue-500/30">
          <Plus size={18} />Adicionar produto
        </button>

        <button onClick={handleOpenPaymentModal} disabled={products.length === 0}
          className={`flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2 font-medium transition-colors ${products.length > 0 ? "border-emerald-500/50 bg-emerald-500/20 text-slate-900 dark:text-emerald-400 hover:bg-emerald-500/30" : "cursor-not-allowed border-gray-200/50 dark:border-slate-700/50 bg-gray-100/30 dark:bg-slate-800/30 text-slate-600"}`}>
          <CreditCard size={18} />{hasPayment ? "Editar condições de pagamento" : "Adicionar condições de pagamento"}
        </button>

        {/* Modal busca de produtos */}
        {showProductSearch && ReactDOM.createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => { setShowProductSearch(false); setSearchTerm(""); }}>
            <div className="flex max-h-[600px] w-full max-w-lg flex-col rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 p-4">
                <h3 className="font-semibold text-slate-900 dark:text-white">Adicionar Produto</h3>
                <button onClick={() => { setShowProductSearch(false); setSearchTerm(""); }} className="text-slate-400 transition-colors hover:text-slate-900 dark:hover:text-white"><X size={20} /></button>
              </div>
              <div className="border-b border-gray-200 dark:border-slate-700 p-4">
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por nome ou SKU..." autoFocus
                    className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 py-3 pl-10 pr-10 text-slate-900 dark:text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none" />
                  {searchTerm && <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:hover:text-white"><X size={18} /></button>}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                  <div className="p-8 text-center text-sm text-slate-400">Carregando produtos...</div>
                ) : filteredProducts.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-400">
                    {searchTerm ? "Nenhum produto encontrado com esse critério" : availableProducts.length === 0 ? "Nenhum produto cadastrado" : "Todos os produtos já foram adicionados"}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredProducts.map((product) => (
                      <button key={product.id} onClick={() => handleAddProduct(product.id)}
                        className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 p-3 text-left transition-colors hover:bg-gray-200/50 dark:hover:bg-slate-700/50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">{product.name}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">SKU: {product.sku}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-400">Calibração</p>
                            <p className={`text-sm font-medium ${getCalibrationPrice(product) > 0 ? "text-emerald-400" : "text-slate-400 dark:text-slate-500"}`}>
                              {formatCurrency(getCalibrationPrice(product))}
                            </p>
                          </div>
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

        {/* Modal condições de pagamento */}
        {showPaymentModal && ReactDOM.createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowPaymentModal(false)}>
            <div className="w-full max-w-md rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 p-4">
                <h3 className="font-semibold text-slate-900 dark:text-white">Condições de Pagamento</h3>
                <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 transition-colors hover:text-slate-900 dark:hover:text-white"><X size={20} /></button>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">Forma de pagamento *</label>
                    <SelectMenu value={paymentForm.payment_method} placeholder="Selecione..."
                      options={[
                        { value: "", label: "Selecione..." },
                        { value: "Boleto", label: "Boleto" },
                        { value: "Cartão de Crédito", label: "Cartão de Crédito" },
                        { value: "PIX", label: "PIX" },
                        { value: "Transferência", label: "Transferência" },
                        { value: "Dinheiro", label: "Dinheiro" },
                        { value: "Outro", label: "Outro" },
                      ]}
                      onChange={(v) => setPaymentForm({ ...paymentForm, payment_method: v })} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">Número de parcelas</label>
                    <input type="number" min="1" max="120" value={paymentForm.installments}
                      onChange={(e) => setPaymentForm({ ...paymentForm, installments: parseInt(e.target.value) || 1 })}
                      className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">Observações</label>
                    <textarea value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                      placeholder="Ex: Primeira parcela em 30 dias, sem juros..." rows={3}
                      className="w-full resize-none rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-2 text-slate-900 dark:text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none" />
                  </div>
                </div>
                <div className="mt-6 flex gap-2">
                  <button onClick={handleSavePayment} disabled={loading} className="flex-1 rounded-lg border border-emerald-500/50 bg-emerald-500/20 px-4 py-2 font-medium text-emerald-400 transition-colors hover:bg-emerald-500/30 disabled:opacity-50">Salvar</button>
                  <button onClick={() => setShowPaymentModal(false)} disabled={loading} className="flex-1 rounded-lg bg-gray-200 dark:bg-slate-700 px-4 py-2 font-medium text-slate-900 dark:text-white transition-colors hover:bg-slate-600 disabled:opacity-50">Cancelar</button>
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

export default ServiceProductSection;
