import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { Package, Plus, Trash2, Search, Check, X } from "lucide-react";
import ExpandableSection from "../cardDetails/ExpandableSection";
import serviceProductService from "../../services/serviceProductService";
import serviceBoardService, { ServiceCardProduct, ServiceAparelho } from "../../services/serviceBoardService";
import { showError, showWarning } from "../../utils/toast";
import { useConfirm } from "../../contexts/ConfirmContext";

interface ServiceProductSectionProps {
  boardId: number;
  cardId: number;
  /** Avisa o pai quando produtos mudam (para atualizar o histórico de atividades). */
  onChange?: () => void;
  /** Informa quantos itens o card tem, para o pai decidir o fallback de aparelhos. */
  onCountChange?: (n: number) => void;
}

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
      // Quantidade do produto = nº de aparelhos (não é editável pelo usuário).
      await serviceBoardService.updateCardProduct(boardId, cardId, product.id, { aparelhos: list, quantity: list.length });
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
 * Seção "Produto" do card de serviços.
 * Os produtos aqui trabalham apenas com QUANTIDADE (nº de produtos = nº de linhas;
 * nº de aparelhos = tamanho da sub-lista de cada produto, ajustada automaticamente).
 * O valor do negócio vem das propostas — não há preço/desconto nesta seção.
 */
const ServiceProductSection: React.FC<ServiceProductSectionProps> = ({
  boardId,
  cardId,
  onChange,
  onCountChange,
}) => {
  const { confirm } = useConfirm();

  const [products, setProducts] = useState<ServiceCardProduct[]>([]);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Carrega os produtos do card
  const loadProducts = async () => {
    try {
      const summary = await serviceBoardService.getCardProducts(boardId, cardId);
      setProducts(summary.items);
      onCountChange?.(summary.items.length);
    } catch {
      showError("Erro ao carregar produtos do card");
    }
  };

  useEffect(() => {
    loadProducts();
  }, [boardId, cardId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (showProductSearch) loadAvailableProducts();
  }, [showProductSearch]);

  const loadAvailableProducts = async () => {
    try {
      setLoading(true);
      // Catálogo de Serviços (equipamentos), não o de Vendas.
      const equipamentos = await serviceProductService.list({ is_active: true, limit: 1000 });
      setAvailableProducts(equipamentos);
    } catch {
      showError("Erro ao carregar lista de equipamentos");
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (productId: number) => {
    const product = availableProducts.find((p) => p.id === productId);
    if (!product) return;
    try {
      setLoading(true);
      // A API ainda exige unit_price/discount — enviamos 0 (o valor vem das propostas).
      await serviceBoardService.addCardProduct(boardId, cardId, {
        product_id: product.id,
        quantity: 1,
        unit_price: 0,
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

  const filteredProducts = availableProducts.filter((p) =>
    !products.some((prod) => prod.product_id === p.id) &&
    (p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalAparelhos = products.reduce((s, p) => s + (p.quantity || 0), 0);

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
            {products.map((product) => (
              <div key={product.id} className="space-y-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 dark:text-white">{product.product_name || "Produto sem nome"}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">SKU: {product.product_sku || "N/A"}</p>
                  </div>
                  <button onClick={() => handleRemoveProduct(product.id)} className="rounded p-1 text-red-400 transition-colors hover:bg-red-500/20 hover:text-red-300" title="Remover produto"><Trash2 size={16} /></button>
                </div>

                <div className="text-sm">
                  <label className="text-xs text-slate-400">Quantidade</label>
                  <p className="rounded border border-gray-200/50 dark:border-slate-700/50 bg-gray-100/30 dark:bg-slate-800/30 px-2 py-1.5 text-slate-900 dark:text-white">{product.quantity}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">automático = nº de aparelhos</p>
                </div>

                {/* Sub-lista de aparelhos (dados do laboratório por unidade) */}
                <AparelhosEditor
                  product={product}
                  boardId={boardId}
                  cardId={cardId}
                  onSaved={() => { loadProducts(); onChange?.(); }}
                />
              </div>
            ))}

            {/* Resumo de quantidades */}
            <div className="flex justify-between border-t border-gray-200/50 dark:border-slate-700/50 pt-3 text-sm">
              <span className="text-slate-400">Resumo:</span>
              <span className="font-medium text-slate-900 dark:text-white">
                {products.length} produto{products.length !== 1 ? "s" : ""} · {totalAparelhos} aparelho{totalAparelhos !== 1 ? "s" : ""}
              </span>
            </div>
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
      </div>
    </ExpandableSection>
  );
};

export default ServiceProductSection;
