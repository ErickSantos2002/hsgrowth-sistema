import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, ChevronDown, ChevronRight, ExternalLink, ArrowDownToLine, Search, X } from "lucide-react";
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
  // Filtro dos aparelhos do card expandido (nº de série, modelo ou módulo)
  const [filtro, setFiltro] = useState("");

  const load = async () => {
    if (!hasClient) { setCards([]); return; }
    try {
      setCards(await serviceBoardService.getRelatedDevices(boardId, cardId));
    } catch {
      showError("Erro ao carregar outros cards do CNPJ");
    }
  };

  useEffect(() => { load(); setOpen(null); setSel(new Set()); setFiltro(""); }, [boardId, cardId, hasClient]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Aparelhos visíveis de uma linha, mantendo o ÍNDICE ORIGINAL (é ele que vai pro backend).
  const termo = filtro.trim().toLowerCase();
  const visiveis = (aparelhos: RelatedDevicesCard["products"][number]["aparelhos"]) =>
    (aparelhos || [])
      .map((a, i) => ({ a, i }))
      .filter(({ a }) =>
        !termo ||
        [a.serial_number, a.model, a.alcohol_module].some((v) => (v || "").toLowerCase().includes(termo))
      );

  // Marca todos os aparelhos que batem com o filtro, no card expandido
  const marcarFiltrados = (c: RelatedDevicesCard) =>
    setSel((prev) => {
      const n = new Set(prev);
      c.products.forEach((p) => visiveis(p.aparelhos).forEach(({ i }) => n.add(`${p.product_id}:${i}`)));
      return n;
    });

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
                  <button onClick={() => { setOpen(isOpen ? null : c.id); setSel(new Set()); setFiltro(""); }}
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

                    {/* Busca dos aparelhos deste card */}
                    {c.products.length > 0 && (() => {
                      const achados = c.products.reduce((s, p) => s + visiveis(p.aparelhos).length, 0);
                      return (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900/50">
                            <Search size={13} className="flex-shrink-0 text-slate-400" />
                            <input
                              value={filtro}
                              onChange={(e) => setFiltro(e.target.value)}
                              placeholder="Buscar nº de série, modelo ou módulo..."
                              className="min-w-0 flex-1 bg-transparent text-xs text-slate-900 placeholder-slate-400 outline-none dark:text-white"
                            />
                            {filtro && (
                              <button onClick={() => setFiltro("")} title="Limpar busca" className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
                                <X size={13} />
                              </button>
                            )}
                          </div>
                          {termo && (
                            <div className="flex items-center justify-between text-[11px] text-slate-400">
                              <span>{achados} aparelho(s) encontrado(s)</span>
                              {canEdit && achados > 0 && (
                                <button onClick={() => marcarFiltrados(c)} className="text-blue-400 hover:text-blue-300">
                                  Marcar encontrados
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {c.products.map((p) => {
                      const lista = visiveis(p.aparelhos);
                      // Com busca ativa, esconde a linha de produto sem nenhum aparelho encontrado
                      if (termo && lista.length === 0) return null;
                      return (
                        <div key={p.id}>
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <span className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                              {p.product_name || `Produto ${p.product_id}`} · {p.quantity} ap.
                            </span>
                            {/* "Mover todos" move a linha inteira — escondido durante a busca para não confundir */}
                            {canEdit && !termo && (
                              <button disabled={moving} onClick={() => pull(c, [{ product_id: p.product_id, all: true }])}
                                className="flex-shrink-0 text-[11px] text-blue-400 hover:text-blue-300 disabled:opacity-50">
                                Mover todos
                              </button>
                            )}
                          </div>
                          {lista.map(({ a, i }) => {
                            const key = `${p.product_id}:${i}`;
                            return (
                              <label key={key} title={[a.serial_number || "Sem série", a.model].filter(Boolean).join(" · ")}
                                className="flex items-center gap-2 py-0.5 text-xs text-slate-600 dark:text-slate-300">
                                {canEdit && <input type="checkbox" checked={sel.has(key)} onChange={() => toggle(key)} className="flex-shrink-0" />}
                                <span className={`flex-shrink-0 whitespace-nowrap ${a.serial_number ? "" : "italic text-slate-400"}`}>
                                  {a.serial_number || "Sem série"}
                                </span>
                                {a.model && <span className="min-w-0 flex-1 truncate text-slate-400">· {a.model}</span>}
                                {a.next_recalibration_date && (
                                  <span className="flex-shrink-0 whitespace-nowrap text-slate-400">
                                    · próx. {new Date(a.next_recalibration_date + "T00:00:00").toLocaleDateString("pt-BR")}
                                  </span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      );
                    })}
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
