import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { Cog, Plus, Trash2, Search, Edit2, Check, X } from "lucide-react";
import ExpandableSection from "../cardDetails/ExpandableSection";
import serviceCatalogService from "../../services/serviceCatalogService";
import serviceBoardService, { ServiceCardService, ServiceCard } from "../../services/serviceBoardService";
import { showError, showWarning } from "../../utils/toast";
import { useConfirm } from "../../contexts/ConfirmContext";

interface ServiceServicesSectionProps {
  boardId: number;
  cardId: number;
  /** Card atual — fonte do desconto global e frete (colunas do card). */
  card: ServiceCard;
  /** Avisa o pai quando serviços mudam (para atualizar o histórico de atividades). */
  onChange?: () => void;
  /** Avisa o pai quando desconto global/frete mudam (para recarregar o card/valor). */
  onCardChange?: () => void;
}

type DiscountType = "value" | "percent";

/**
 * Seção "Serviços" do card de serviços — espelha a seção de Produtos.
 * Os serviços são buscados via API própria (service_card_services). Cada linha
 * tem serviço do catálogo, quantidade, preço (pré-preenchido do catálogo,
 * editável) e desconto. O valor do card é a soma dos serviços.
 */
const ServiceServicesSection: React.FC<ServiceServicesSectionProps> = ({
  boardId,
  cardId,
  card,
  onChange,
  onCardChange,
}) => {
  const { confirm } = useConfirm();

  const [services, setServices] = useState<ServiceCardService[]>([]);
  const [showServiceSearch, setShowServiceSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Edição por serviço
  const [editingService, setEditingService] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<{
    quantity: string;
    unitPrice: string;
    discountType: DiscountType;
    discountInput: string;
  }>({ quantity: "1", unitPrice: "", discountType: "value", discountInput: "" });

  // Desconto global + frete do card (colunas do card, não por serviço)
  const [globalDiscountType, setGlobalDiscountType] = useState<DiscountType>(
    card.global_discount_type === "percent" ? "percent" : "value"
  );
  const [globalDiscountInput, setGlobalDiscountInput] = useState("");
  const [shippingInput, setShippingInput] = useState("");
  const [savingMoney, setSavingMoney] = useState(false);

  // Sincroniza os inputs de desconto global/frete quando o card muda
  useEffect(() => {
    const gd = card.global_discount ?? 0;
    const ship = card.shipping ?? 0;
    setGlobalDiscountType(card.global_discount_type === "percent" ? "percent" : "value");
    setGlobalDiscountInput(gd > 0 ? String(gd).replace(".", ",") : "");
    setShippingInput(
      ship > 0 ? ship.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""
    );
  }, [card.global_discount, card.global_discount_type, card.shipping]);

  // Carrega os serviços do card
  const loadServices = async () => {
    try {
      const summary = await serviceBoardService.getCardServices(boardId, cardId);
      setServices(summary.items);
    } catch {
      showError("Erro ao carregar serviços do card");
    }
  };

  useEffect(() => {
    loadServices();
  }, [boardId, cardId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (showServiceSearch) loadAvailableServices();
  }, [showServiceSearch]);

  const loadAvailableServices = async () => {
    try {
      setLoading(true);
      const response = await serviceCatalogService.list({ page_size: 10000, is_active: true });
      setAvailableServices(response.services);
    } catch {
      showError("Erro ao carregar lista de serviços");
    } finally {
      setLoading(false);
    }
  };

  const parseDecimalInput = (value: string): number => parseFloat(value.replace(",", ".")) || 0;
  const sanitizeDecimalInput = (value: string): string => value.replace(/[^0-9,.]/g, "");
  const formatCurrency = (value: number) =>
    `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Totais
  const calcSubtotal = () => services.reduce((s, p) => s + p.subtotal, 0);
  const calcServiceDiscount = () => services.reduce((s, p) => s + p.discount, 0);
  const calcTotal = () => services.reduce((s, p) => s + p.total, 0);

  const calcServiceDiscountAmount = (unitPrice: number, quantity: number) => {
    const subtotal = quantity * unitPrice;
    const inputVal = parseDecimalInput(editValues.discountInput);
    return editValues.discountType === "percent"
      ? Math.round((subtotal * inputVal / 100) * 100) / 100
      : inputVal;
  };

  // ── Desconto global + frete (sobre o total dos serviços) ──────────────────────
  const servicesTotal = calcTotal();
  const globalDiscountNum = parseDecimalInput(globalDiscountInput);
  const globalDiscountAmount =
    globalDiscountType === "percent"
      ? Math.round((servicesTotal * globalDiscountNum / 100) * 100) / 100
      : globalDiscountNum;
  const shippingNum = parseDecimalInput(shippingInput);
  const dealValue = Math.max(0, servicesTotal - globalDiscountAmount + shippingNum);

  const saveMoney = async (patch: {
    global_discount?: number;
    global_discount_type?: DiscountType;
    shipping?: number;
  }) => {
    setSavingMoney(true);
    try {
      await serviceBoardService.updateCard(boardId, cardId, patch);
      onCardChange?.();
    } catch {
      showError("Erro ao salvar desconto global / frete");
    } finally {
      setSavingMoney(false);
    }
  };

  const handleChangeGlobalDiscountType = (t: DiscountType) => {
    setGlobalDiscountType(t);
    const num = parseDecimalInput(globalDiscountInput);
    if (t === "percent" && num > 100) { showWarning("Percentual não pode ultrapassar 100%"); return; }
    saveMoney({ global_discount: num, global_discount_type: t });
  };

  const handleSaveGlobalDiscount = () => {
    const num = parseDecimalInput(globalDiscountInput);
    if (num < 0) { showWarning("Desconto não pode ser negativo"); return; }
    if (globalDiscountType === "percent" && num > 100) { showWarning("Percentual não pode ultrapassar 100%"); return; }
    const amount = globalDiscountType === "percent" ? servicesTotal * num / 100 : num;
    if (amount > servicesTotal) { showWarning("Desconto global não pode ser maior que o total dos serviços"); return; }
    if ((card.global_discount ?? 0) === num && (card.global_discount_type ?? "value") === globalDiscountType) return;
    saveMoney({ global_discount: num, global_discount_type: globalDiscountType });
  };

  const handleSaveShipping = () => {
    const num = parseDecimalInput(shippingInput);
    if (num < 0) { showWarning("Frete não pode ser negativo"); return; }
    if ((card.shipping ?? 0) === num) return;
    saveMoney({ shipping: num });
  };

  const handleAddService = async (serviceId: number) => {
    const service = availableServices.find((s) => s.id === serviceId);
    if (!service) return;
    try {
      setLoading(true);
      await serviceBoardService.addCardService(boardId, cardId, {
        service_id: service.id,
        quantity: 1,
        unit_price: parseFloat(service.unit_price ?? 0) || 0,
        discount: 0,
      });
      setShowServiceSearch(false);
      setSearchTerm("");
      await loadServices();
      onChange?.();
    } catch {
      showError("Erro ao adicionar serviço");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveService = async (itemId: number) => {
    const confirmed = await confirm({
      title: "Remover serviço",
      message: "Tem certeza que deseja remover este serviço do card?",
      confirmText: "Remover",
      isDanger: true,
    });
    if (!confirmed) return;
    try {
      setLoading(true);
      await serviceBoardService.removeCardService(boardId, cardId, itemId);
      await loadServices();
      onChange?.();
    } catch {
      showError("Erro ao remover serviço");
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (service: ServiceCardService) => {
    setEditingService(service.id);
    setEditValues({
      quantity: String(service.quantity).replace(".", ","),
      unitPrice: service.unit_price > 0
        ? service.unit_price.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : "",
      discountType: "value",
      discountInput: service.discount > 0
        ? service.discount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : "",
    });
  };

  const handleCancelEdit = () => {
    setEditingService(null);
    setEditValues({ quantity: "1", unitPrice: "", discountType: "value", discountInput: "" });
  };

  const handleSaveEdit = async (service: ServiceCardService) => {
    const qty = parseDecimalInput(editValues.quantity);
    if (qty <= 0) { showWarning("Quantidade deve ser maior que 0"); return; }

    const unitPrice = parseDecimalInput(editValues.unitPrice);
    if (unitPrice < 0) { showWarning("Preço não pode ser negativo"); return; }

    const subtotal = qty * unitPrice;
    const discount = calcServiceDiscountAmount(unitPrice, qty);

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
      await serviceBoardService.updateCardService(boardId, cardId, service.id, {
        quantity: Math.round(qty),
        unit_price: unitPrice,
        discount,
      });
      setEditingService(null);
      await loadServices();
      onChange?.();
    } catch {
      showError("Erro ao atualizar serviço");
    } finally {
      setLoading(false);
    }
  };

  const filteredServices = availableServices.filter((s) =>
    !services.some((svc) => svc.service_id === s.id) &&
    (s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.sku?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getServicePrice = (service: any): number => parseFloat(service?.unit_price ?? 0) || 0;

  const DiscountTypeToggle = ({ value, onChange }: { value: DiscountType; onChange: (t: DiscountType) => void }) => (
    <div className="flex overflow-hidden rounded border border-gray-300 dark:border-slate-600 text-xs">
      <button type="button" onClick={() => onChange("value")}
        className={`px-2 py-1 transition-colors ${value === "value" ? "bg-blue-500 text-white" : "bg-transparent text-slate-400 hover:text-slate-200"}`}>R$</button>
      <button type="button" onClick={() => onChange("percent")}
        className={`px-2 py-1 transition-colors ${value === "percent" ? "bg-blue-500 text-white" : "bg-transparent text-slate-400 hover:text-slate-200"}`}>%</button>
    </div>
  );

  const inputCls =
    "min-w-0 flex-1 rounded border border-blue-500 bg-gray-100 dark:bg-slate-800 px-2 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <ExpandableSection
      title="Serviços"
      defaultExpanded={false}
      icon={<Cog size={18} />}
      badge={services.length > 0 ? services.length : undefined}
    >
      <div className="space-y-4">
        {services.length > 0 ? (
          <div className="space-y-3">
            {services.map((service) => {
              const isEditing = editingService === service.id;
              const editQty = isEditing ? parseDecimalInput(editValues.quantity) : service.quantity;
              const editPrice = isEditing ? parseDecimalInput(editValues.unitPrice) : service.unit_price;
              const lineSubtotal = editQty * editPrice;
              const lineDiscount = isEditing ? calcServiceDiscountAmount(editPrice, editQty) : service.discount;
              const lineTotal = lineSubtotal - lineDiscount;

              return (
                <div key={service.id} className="space-y-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 dark:text-white">{service.service_name || "Serviço sem nome"}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">SKU: {service.service_sku || "N/A"}</p>
                    </div>
                    {!isEditing && (
                      <div className="flex gap-1">
                        <button onClick={() => handleStartEdit(service)} className="rounded p-1 text-blue-400 transition-colors hover:bg-blue-500/20 hover:text-blue-300" title="Editar serviço"><Edit2 size={16} /></button>
                        <button onClick={() => handleRemoveService(service.id)} className="rounded p-1 text-red-400 transition-colors hover:bg-red-500/20 hover:text-red-300" title="Remover serviço"><Trash2 size={16} /></button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <label className="text-xs text-slate-400">Quantidade</label>
                      {isEditing ? (
                        <input type="text" inputMode="decimal" value={editValues.quantity}
                          onChange={(e) => setEditValues({ ...editValues, quantity: sanitizeDecimalInput(e.target.value) })}
                          placeholder="1" className={inputCls} />
                      ) : (
                        <p className="rounded border border-gray-200/50 dark:border-slate-700/50 bg-gray-100/30 dark:bg-slate-800/30 px-2 py-1.5 text-slate-900 dark:text-white">{service.quantity}</p>
                      )}
                    </div>

                    <div>
                      <label className="text-xs text-slate-400">Preço</label>
                      {isEditing ? (
                        <input type="text" inputMode="decimal" value={editValues.unitPrice}
                          onChange={(e) => setEditValues({ ...editValues, unitPrice: sanitizeDecimalInput(e.target.value) })}
                          placeholder="0,00" className={inputCls} />
                      ) : (
                        <p className="rounded border border-gray-200/50 dark:border-slate-700/50 bg-gray-100/30 dark:bg-slate-800/30 px-2 py-1.5 text-slate-900 dark:text-white">{formatCurrency(service.unit_price)}</p>
                      )}
                    </div>

                    <div>
                      <label className="text-xs text-slate-400">Desconto</label>
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input type="text" inputMode="decimal" value={editValues.discountInput}
                            onChange={(e) => setEditValues({ ...editValues, discountInput: sanitizeDecimalInput(e.target.value) })}
                            placeholder="0" className={inputCls} />
                          <DiscountTypeToggle value={editValues.discountType} onChange={(t) => setEditValues({ ...editValues, discountType: t })} />
                        </div>
                      ) : (
                        <p className={`rounded border px-2 py-1.5 ${service.discount > 0 ? "border-red-500/30 bg-red-500/10 text-red-400" : "border-gray-200/50 dark:border-slate-700/50 bg-gray-100/30 dark:bg-slate-800/30 text-slate-400"}`}>
                          {service.discount > 0 ? `- ${formatCurrency(service.discount)}` : "—"}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-xs text-slate-400">Total da linha</label>
                      <p className="rounded border border-blue-500/30 bg-blue-500/10 px-2 py-1.5 font-medium text-blue-400">{formatCurrency(isEditing ? lineTotal : service.total)}</p>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="flex gap-2 border-t border-gray-200/50 dark:border-slate-700/50 pt-2">
                      <button onClick={() => handleSaveEdit(service)} disabled={loading} className="flex flex-1 items-center justify-center gap-2 rounded border border-emerald-500/50 bg-emerald-500/20 px-3 py-1.5 font-medium text-emerald-400 transition-colors hover:bg-emerald-500/30 disabled:opacity-50"><Check size={16} />Salvar</button>
                      <button onClick={handleCancelEdit} disabled={loading} className="flex flex-1 items-center justify-center gap-2 rounded border border-gray-300 dark:border-slate-600 bg-gray-200/50 dark:bg-slate-700/50 px-3 py-1.5 font-medium text-slate-600 dark:text-slate-300 transition-colors hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-50"><X size={16} />Cancelar</button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Totalizadores */}
            <div className="space-y-2 border-t border-gray-200/50 dark:border-slate-700/50 pt-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Subtotal:</span>
                <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(calcSubtotal())}</span>
              </div>

              {calcServiceDiscount() > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Desc. serviços:</span>
                  <span className="font-medium text-orange-400">- {formatCurrency(calcServiceDiscount())}</span>
                </div>
              )}

              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Total dos serviços:</span>
                <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(servicesTotal)}</span>
              </div>

              {/* Desconto global (sobre o total dos serviços) */}
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-slate-400">Desconto global:</span>
                <div className="flex items-center gap-1">
                  <input type="text" inputMode="decimal" value={globalDiscountInput} disabled={savingMoney}
                    onChange={(e) => setGlobalDiscountInput(sanitizeDecimalInput(e.target.value))}
                    onBlur={handleSaveGlobalDiscount}
                    placeholder="0"
                    className="w-24 rounded border border-gray-300 dark:border-slate-600 bg-gray-100 dark:bg-slate-800 px-2 py-1 text-right text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" />
                  <DiscountTypeToggle value={globalDiscountType} onChange={handleChangeGlobalDiscountType} />
                </div>
              </div>
              {globalDiscountAmount > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-500">Desconto aplicado:</span>
                  <span className="font-medium text-orange-400">- {formatCurrency(globalDiscountAmount)}</span>
                </div>
              )}

              {/* Frete (somado ao total) */}
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-slate-400">Frete:</span>
                <input type="text" inputMode="decimal" value={shippingInput} disabled={savingMoney}
                  onChange={(e) => setShippingInput(sanitizeDecimalInput(e.target.value))}
                  onBlur={handleSaveShipping}
                  placeholder="0,00"
                  className="w-28 rounded border border-gray-300 dark:border-slate-600 bg-gray-100 dark:bg-slate-800 px-2 py-1 text-right text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" />
              </div>

              <div className="flex justify-between items-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5 mt-1">
                <span className="font-semibold text-slate-900 dark:text-white">Valor do negócio:</span>
                <span className="text-xl font-bold text-emerald-400">{formatCurrency(dealValue)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center">
            <Cog size={32} className="mx-auto mb-2 text-slate-600" />
            <p className="mb-4 text-sm text-slate-400">Nenhum serviço adicionado</p>
          </div>
        )}

        <button onClick={() => setShowServiceSearch(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-500/50 bg-blue-500/20 px-4 py-2 font-medium text-slate-900 dark:text-blue-400 transition-colors hover:bg-blue-500/30">
          <Plus size={18} />Adicionar serviço
        </button>

        {/* Modal busca de serviços */}
        {showServiceSearch && ReactDOM.createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => { setShowServiceSearch(false); setSearchTerm(""); }}>
            <div className="flex max-h-[600px] w-full max-w-lg flex-col rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 p-4">
                <h3 className="font-semibold text-slate-900 dark:text-white">Adicionar Serviço</h3>
                <button onClick={() => { setShowServiceSearch(false); setSearchTerm(""); }} className="text-slate-400 transition-colors hover:text-slate-900 dark:hover:text-white"><X size={20} /></button>
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
                  <div className="p-8 text-center text-sm text-slate-400">Carregando serviços...</div>
                ) : filteredServices.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-400">
                    {searchTerm ? "Nenhum serviço encontrado com esse critério" : availableServices.length === 0 ? "Nenhum serviço cadastrado" : "Todos os serviços já foram adicionados"}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredServices.map((service) => (
                      <button key={service.id} onClick={() => handleAddService(service.id)}
                        className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 p-3 text-left transition-colors hover:bg-gray-200/50 dark:hover:bg-slate-700/50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">{service.name}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">SKU: {service.sku}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-400">Preço</p>
                            <p className={`text-sm font-medium ${getServicePrice(service) > 0 ? "text-emerald-400" : "text-slate-400 dark:text-slate-500"}`}>
                              {formatCurrency(getServicePrice(service))}
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
      </div>
    </ExpandableSection>
  );
};

export default ServiceServicesSection;
