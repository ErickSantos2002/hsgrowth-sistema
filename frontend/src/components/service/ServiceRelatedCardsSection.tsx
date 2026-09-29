import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, ChevronDown, ChevronRight, ExternalLink, ArrowDownToLine } from "lucide-react";
import ExpandableSection from "../cardDetails/ExpandableSection";
import serviceBoardService, { RelatedDevicesCard, PullDevicesItem } from "../../services/serviceBoardService";
import { showError, showSuccess } from "../../utils/toast";
import { useAuth } from "../../hooks/useAuth";
import { useConfirm } from "../../contexts/ConfirmContext";

interface Props {
  boardId: number;
  cardId: number;
  /** Card atual tem cliente (CNPJ)? Sem cliente a seção não aparece. */
  hasClient: boolean;
  /** Chamado após mover (recarregar Produtos + histórico do card atual). */
  onMoved?: () => void;
}

/**
 * "Outros cards do mesmo CNPJ": lista os cards EM ABERTO do mesmo cliente e board e
 * permite puxar aparelhos (individuais ou a linha inteira) para o card atual.
 * Só move aparelhos — serviços/valor não mudam. Se a origem ficar sem aparelhos,
 * o backend a fecha como Perdido — "Unificado em outro card" (avisamos antes).
 */
const ServiceRelatedCardsSection: React.FC<Props> = ({ boardId, cardId, hasClient, onMoved }) => {
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const canEdit = user?.role !== "viewer";
  const [cards, setCards] = useState<RelatedDevicesCard[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  // Seleção: chave `${productId}:${index}`
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [moving, setMoving] = useState(false);

  const load = async () => {
    if (!hasClient) { setCards([]); return; }
    try {
      setCards(await serviceBoardService.getRelatedDevices(boardId, cardId));
    } catch {
      showError("Erro ao carregar outros cards do CNPJ");
    }
  };

  useEffect(() => { load(); setOpen(null); setSel(new Set()); }, [boardId, cardId, hasClient]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!hasClient) return null;

  const toggle = (key: string) =>
    setSel((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  // A seleção esvazia o card de origem? (toda linha dele sai zerada)
  const esvazia = (c: RelatedDevicesCard, items: PullDevicesItem[]) =>
    c.products.length > 0 && c.products.every((p) => {
      const it = items.find((i) => i.product_id === p.product_id);
      if (!it) return false;
      if (it.all) return true;
      const n = it.indices?.length || 0;
      return n >= (p.aparelhos?.length || 0) && n >= (p.quantity || 0);
    });

  const pull = async (c: RelatedDevicesCard, items: PullDevicesItem[]) => {
    if (items.length === 0) return;
    if (esvazia(c, items)) {
      const ok = await confirm({
        title: "Card vai ficar sem aparelhos",
        message: `O card "${c.title}" vai ficar sem aparelhos e será fechado como Perdido (motivo: Unificado em outro card). Continuar?`,
        confirmText: "Mover e fechar",
        isDanger: true,
      });
      if (!ok) return;
    }
    try {
      setMoving(true);
      const r = await serviceBoardService.pullDevices(boardId, cardId, c.id, items);
      showSuccess(r.origin_closed
        ? "Aparelhos movidos — o card de origem foi fechado (Unificado em outro card)."
        : "Aparelhos movidos para este card!");
      setSel(new Set());
      await load();
      onMoved?.();
    } catch (e: any) {
      const d = e?.response?.data?.detail;
      showError(typeof d === "string" ? d : "Erro ao mover aparelhos");
    } finally {
      setMoving(false);
    }
  };

  const pullSelected = (c: RelatedDevicesCard) => {
    const byProduct = new Map<number, number[]>();
    sel.forEach((k) => {
      const [pid, idx] = k.split(":").map(Number);
      if (!c.products.some((p) => p.product_id === pid)) return;
      byProduct.set(pid, [...(byProduct.get(pid) || []), idx]);
    });
    pull(c, Array.from(byProduct.entries()).map(([product_id, indices]) => ({ product_id, indices })));
  };

  const totalAparelhos = (c: RelatedDevicesCard) => c.products.reduce((s, p) => s + (p.quantity || 0), 0);

  return (
    <ExpandableSection title="Outros cards do mesmo CNPJ" defaultExpanded={false}
      icon={<Building2 size={18} />} badge={cards.length > 0 ? cards.length : undefined}>
      {cards.length === 0 ? (
        <p className="py-2 text-sm text-slate-500 dark:text-slate-400">Nenhum outro card em aberto deste CNPJ neste board.</p>
      ) : (
        <div className="space-y-2">
          {cards.map((c) => {
            const isOpen = open === c.id;
            const selCount = Array.from(sel).filter((k) => c.products.some((p) => p.product_id === Number(k.split(":")[0]))).length;
            return (
              <div key={c.id} className="rounded-lg border border-gray-200 dark:border-slate-700">
                <div className="flex items-center gap-2 p-2">
                  <button onClick={() => { setOpen(isOpen ? null : c.id); setSel(new Set()); }}
                    className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span className="truncate text-sm font-medium text-slate-900 dark:text-white">{c.title}</span>
                  </button>
                  <span className="whitespace-nowrap text-[11px] text-slate-400">{c.list_name} · {totalAparelhos(c)} ap.</span>
                  <Link to={`/servicos/${boardId}/cards/${c.id}`} title="Abrir card" className="text-slate-400 hover:text-blue-400">
                    <ExternalLink size={14} />
                  </Link>
                </div>

                {isOpen && (
                  <div className="space-y-3 border-t border-gray-200 p-2 dark:border-slate-700">
                    {c.products.length === 0 && <p className="text-xs text-slate-400">Sem produtos neste card.</p>}
                    {c.products.map((p) => (
                      <div key={p.id}>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                            {p.product_name || `Produto ${p.product_id}`} · {p.quantity} ap.
                          </span>
                          {canEdit && (
                            <button disabled={moving} onClick={() => pull(c, [{ product_id: p.product_id, all: true }])}
                              className="text-[11px] text-blue-400 hover:text-blue-300 disabled:opacity-50">
                              Mover todos
                            </button>
                          )}
                        </div>
                        {(p.aparelhos || []).map((a, i) => {
                          const key = `${p.product_id}:${i}`;
                          return (
                            <label key={key} className="flex items-center gap-2 py-0.5 text-xs text-slate-600 dark:text-slate-300">
                              {canEdit && <input type="checkbox" checked={sel.has(key)} onChange={() => toggle(key)} />}
                              <span>{a.serial_number || "Sem série"}</span>
                              {a.model && <span className="text-slate-400">· {a.model}</span>}
                              {a.next_recalibration_date && (
                                <span className="text-slate-400">· próx. {new Date(a.next_recalibration_date + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    ))}
                    {canEdit && (
                      <button disabled={moving || selCount === 0} onClick={() => pullSelected(c)}
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-500/20 py-1.5 text-xs font-medium text-emerald-500 hover:bg-emerald-500/30 disabled:opacity-50">
                        <ArrowDownToLine size={14} /> Mover selecionados para este card{selCount > 0 ? ` (${selCount})` : ""}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </ExpandableSection>
  );
};

export default ServiceRelatedCardsSection;
