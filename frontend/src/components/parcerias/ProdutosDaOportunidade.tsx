import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { Check, Edit2, Package, Plus, Search, Trash2, X } from "lucide-react";
import ExpandableSection from "../cardDetails/ExpandableSection";
import parceriasService, { ItemProduto, Oportunidade, ProdutoCatalogo, mensagemDeErro } from "../../services/parceriasService";
import { showError, showWarning } from "../../utils/toast";
import { useConfirm } from "../../contexts/ConfirmContext";

interface Props {
  op: Oportunidade;
  podeEditar: boolean;
  /** Recebe a oportunidade com o valor do negócio já recalculado. */
  onOportunidade: (op: Oportunidade) => void;
}

type TipoDesconto = "value" | "percent";

// Formato pt-BR: "." separa milhar e "," é decimal ("2.226,00" -> 2226).
const lerNumero = (v: string): number => parseFloat(v.replace(/\./g, "").replace(",", ".")) || 0;
const limpar = (v: string): string => v.replace(/[^0-9,.]/g, "");
const moeda = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const paraCampo = (v: number) => (v > 0 ? v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "");

function SeletorDesconto({ valor, onChange, disabled }: { valor: TipoDesconto; onChange: (t: TipoDesconto) => void; disabled?: boolean }) {
  return (
    <div className="flex overflow-hidden rounded border border-gray-300 text-xs dark:border-slate-600">
      {(["value", "percent"] as TipoDesconto[]).map((t) => (
        <button
          key={t}
          type="button"
          disabled={disabled}
          onClick={() => onChange(t)}
          className={`px-2 py-1 transition-colors ${valor === t ? "bg-blue-500 text-white" : "bg-transparent text-slate-400 hover:text-slate-200"}`}
        >
          {t === "value" ? "R$" : "%"}
        </button>
      ))}
    </div>
  );
}

/**
 * Seção "Produtos" da oportunidade de parceiro — mesmo desenho da seção Serviços do card de Serviço.
 * Só entram produtos liberados para parceiros (hoje, o Phoebus). O servidor recalcula o valor do negócio.
 */
export default function ProdutosDaOportunidade({ op, podeEditar, onOportunidade }: Props) {
  const { confirm } = useConfirm();
  const [itens, setItens] = useState<ItemProduto[]>([]);
  const [escolhendo, setEscolhendo] = useState(false);
  const [busca, setBusca] = useState("");
  const [catalogo, setCatalogo] = useState<ProdutoCatalogo[]>([]);
  const [carregando, setCarregando] = useState(false);

  const [editando, setEditando] = useState<number | null>(null);
  const [edicao, setEdicao] = useState({ quantidade: "1", preco: "", tipo: "value" as TipoDesconto, desconto: "" });

  const [tipoGeral, setTipoGeral] = useState<TipoDesconto>("value");
  const [descontoGeral, setDescontoGeral] = useState("");
  const [frete, setFrete] = useState("");
  const [salvandoGeral, setSalvandoGeral] = useState(false);

  const carregarItens = async () => {
    try {
      setItens(await parceriasService.listarProdutos(op.id));
    } catch {
      showError("Erro ao carregar os produtos da oportunidade.");
    }
  };

  useEffect(() => {
    carregarItens();
  }, [op.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setTipoGeral(op.global_discount_type === "percent" ? "percent" : "value");
    setDescontoGeral(op.global_discount > 0 ? String(op.global_discount).replace(".", ",") : "");
    setFrete(paraCampo(op.shipping));
  }, [op.global_discount, op.global_discount_type, op.shipping]);

  useEffect(() => {
    if (!escolhendo) return;
    setCarregando(true);
    parceriasService.catalogo("")
      .then(setCatalogo)
      .catch(() => showError("Erro ao carregar os produtos liberados."))
      .finally(() => setCarregando(false));
  }, [escolhendo]);

  /** Recarrega as linhas e a oportunidade (o valor do negócio vem do servidor). */
  const depoisDeMudar = async () => {
    await carregarItens();
    onOportunidade(await parceriasService.buscarOportunidade(op.id));
  };

  const subtotal = itens.reduce((s, i) => s + i.subtotal, 0);
  const descontoLinhas = itens.reduce((s, i) => s + i.discount, 0);
  const totalProdutos = itens.reduce((s, i) => s + i.total, 0);

  const descontoGeralNum = lerNumero(descontoGeral);
  const descontoGeralValor = tipoGeral === "percent"
    ? Math.round(totalProdutos * descontoGeralNum) / 100
    : descontoGeralNum;
  const freteNum = lerNumero(frete);
  const valorNegocio = Math.max(0, totalProdutos - descontoGeralValor + freteNum);

  const tipoSalvo: TipoDesconto = op.global_discount_type === "percent" ? "percent" : "value";
  const mudouGeral = descontoGeralNum !== op.global_discount || tipoGeral !== tipoSalvo || freteNum !== op.shipping;

  const salvarGeral = async () => {
    if (tipoGeral === "percent" && descontoGeralNum > 100) return showWarning("O percentual não pode passar de 100%.");
    if (descontoGeralValor > totalProdutos) return showWarning("O desconto geral não pode ser maior que o total dos produtos.");
    setSalvandoGeral(true);
    try {
      onOportunidade(await parceriasService.atualizarOportunidade(op.id, {
        global_discount: descontoGeralNum, global_discount_type: tipoGeral, shipping: freteNum,
      }));
    } catch (err) {
      showError(mensagemDeErro(err, "Erro ao salvar o desconto geral e o frete."));
    } finally {
      setSalvandoGeral(false);
    }
  };

  const cancelarGeral = () => {
    setTipoGeral(tipoSalvo);
    setDescontoGeral(op.global_discount > 0 ? String(op.global_discount).replace(".", ",") : "");
    setFrete(paraCampo(op.shipping));
  };

  const adicionar = async (p: ProdutoCatalogo) => {
    setCarregando(true);
    try {
      await parceriasService.adicionarProduto(op.id, { product_id: p.id, quantity: 1 });
      setEscolhendo(false);
      setBusca("");
      await depoisDeMudar();
    } catch (err) {
      showError(mensagemDeErro(err, "Erro ao adicionar o produto."));
    } finally {
      setCarregando(false);
    }
  };

  const remover = async (item: ItemProduto) => {
    const ok = await confirm({
      title: "Remover produto",
      message: "Tem certeza que deseja remover este produto da oportunidade?",
      confirmText: "Remover",
      isDanger: true,
    });
    if (!ok) return;
    try {
      await parceriasService.removerProduto(op.id, item.id);
      await depoisDeMudar();
    } catch (err) {
      showError(mensagemDeErro(err, "Erro ao remover o produto."));
    }
  };

  const descontoDaEdicao = (preco: number, quantidade: number) => {
    const valor = lerNumero(edicao.desconto);
    return edicao.tipo === "percent" ? Math.round(quantidade * preco * valor) / 100 : valor;
  };

  const comecarEdicao = (item: ItemProduto) => {
    setEditando(item.id);
    setEdicao({ quantidade: String(item.quantity), preco: paraCampo(item.unit_price), tipo: "value", desconto: paraCampo(item.discount) });
  };

  const salvarEdicao = async (item: ItemProduto) => {
    const quantidade = Math.round(lerNumero(edicao.quantidade));
    const preco = lerNumero(edicao.preco);
    const desconto = descontoDaEdicao(preco, quantidade);
    if (quantidade < 1) return showWarning("A quantidade deve ser maior que 0.");
    if (edicao.tipo === "percent" && lerNumero(edicao.desconto) > 100) return showWarning("O percentual não pode passar de 100%.");
    if (desconto > quantidade * preco) return showWarning(`O desconto não pode ser maior que o valor da linha (${moeda(quantidade * preco)}).`);
    setCarregando(true);
    try {
      await parceriasService.atualizarProduto(op.id, item.id, { quantity: quantidade, unit_price: preco, discount: desconto });
      setEditando(null);
      await depoisDeMudar();
    } catch (err) {
      showError(mensagemDeErro(err, "Erro ao salvar o produto."));
    } finally {
      setCarregando(false);
    }
  };

  const disponiveis = catalogo.filter(
    (p) => !itens.some((i) => i.product_id === p.id)
      && [p.name, p.sku].some((v) => v?.toLowerCase().includes(busca.trim().toLowerCase()))
  );

  const campoCls = "min-w-0 flex-1 rounded border border-blue-500 bg-gray-100 px-2 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white";
  const leituraCls = "rounded border border-gray-200/50 bg-gray-100/30 px-2 py-1.5 text-slate-900 dark:border-slate-700/50 dark:bg-slate-800/30 dark:text-white";
  const totalCls = "w-28 rounded border border-gray-300 bg-gray-100 px-2 py-1 text-right text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white";

  return (
    <ExpandableSection title="Produtos" icon={<Package size={18} />} badge={itens.length > 0 ? itens.length : undefined}>
      <div className="space-y-4">
        {itens.length > 0 ? (
          <div className="space-y-3">
            {itens.map((item) => {
              const emEdicao = editando === item.id;
              const qtd = emEdicao ? lerNumero(edicao.quantidade) : item.quantity;
              const preco = emEdicao ? lerNumero(edicao.preco) : item.unit_price;
              const totalLinha = emEdicao ? qtd * preco - descontoDaEdicao(preco, qtd) : item.total;
              return (
                <div key={item.id} className="space-y-3 rounded-lg border border-gray-200 bg-white/50 p-3 dark:border-slate-700 dark:bg-slate-900/50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 dark:text-white">{item.product_name}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">SKU: {item.product_sku || "N/A"}</p>
                    </div>
                    {podeEditar && !emEdicao && (
                      <div className="flex gap-1">
                        <button onClick={() => comecarEdicao(item)} className="rounded p-1 text-blue-400 transition-colors hover:bg-blue-500/20 hover:text-blue-300" title="Editar produto"><Edit2 size={16} /></button>
                        <button onClick={() => remover(item)} className="rounded p-1 text-red-400 transition-colors hover:bg-red-500/20 hover:text-red-300" title="Remover produto"><Trash2 size={16} /></button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <label className="text-xs text-slate-400">Quantidade</label>
                      {emEdicao ? (
                        <input type="text" inputMode="numeric" value={edicao.quantidade} placeholder="1" className={campoCls}
                          onChange={(e) => setEdicao({ ...edicao, quantidade: e.target.value.replace(/\D/g, "") })} />
                      ) : (
                        <p className={leituraCls}>{item.quantity}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Preço</label>
                      {emEdicao ? (
                        <input type="text" inputMode="decimal" value={edicao.preco} placeholder="0,00" className={campoCls}
                          onChange={(e) => setEdicao({ ...edicao, preco: limpar(e.target.value) })} />
                      ) : (
                        <p className={leituraCls}>{moeda(item.unit_price)}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Desconto</label>
                      {emEdicao ? (
                        <div className="flex items-center gap-1">
                          <input type="text" inputMode="decimal" value={edicao.desconto} placeholder="0" className={campoCls}
                            onChange={(e) => setEdicao({ ...edicao, desconto: limpar(e.target.value) })} />
                          <SeletorDesconto valor={edicao.tipo} onChange={(tipo) => setEdicao({ ...edicao, tipo })} />
                        </div>
                      ) : (
                        <p className={`rounded border px-2 py-1.5 ${item.discount > 0 ? "border-red-500/30 bg-red-500/10 text-red-400" : "border-gray-200/50 bg-gray-100/30 text-slate-400 dark:border-slate-700/50 dark:bg-slate-800/30"}`}>
                          {item.discount > 0 ? `- ${moeda(item.discount)}` : "—"}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Total da linha</label>
                      <p className="rounded border border-blue-500/30 bg-blue-500/10 px-2 py-1.5 font-medium text-blue-400">{moeda(totalLinha)}</p>
                    </div>
                  </div>

                  {emEdicao && (
                    <div className="flex gap-2 border-t border-gray-200/50 pt-2 dark:border-slate-700/50">
                      <button onClick={() => salvarEdicao(item)} disabled={carregando} className="flex flex-1 items-center justify-center gap-2 rounded border border-emerald-500/50 bg-emerald-500/20 px-3 py-1.5 font-medium text-emerald-400 transition-colors hover:bg-emerald-500/30 disabled:opacity-50"><Check size={16} />Salvar</button>
                      <button onClick={() => setEditando(null)} disabled={carregando} className="flex flex-1 items-center justify-center gap-2 rounded border border-gray-300 bg-gray-200/50 px-3 py-1.5 font-medium text-slate-600 transition-colors hover:bg-gray-200 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-300 dark:hover:bg-slate-700"><X size={16} />Cancelar</button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Totais */}
            <div className="space-y-2 border-t border-gray-200/50 pt-3 dark:border-slate-700/50">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Subtotal:</span>
                <span className="font-medium text-slate-900 dark:text-white">{moeda(subtotal)}</span>
              </div>
              {descontoLinhas > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Desc. produtos:</span>
                  <span className="font-medium text-orange-400">- {moeda(descontoLinhas)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Total dos produtos:</span>
                <span className="font-medium text-slate-900 dark:text-white">{moeda(totalProdutos)}</span>
              </div>

              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-slate-400">Desconto geral:</span>
                <div className="flex items-center gap-1">
                  <input type="text" inputMode="decimal" value={descontoGeral} placeholder="0" disabled={!podeEditar || salvandoGeral}
                    onChange={(e) => setDescontoGeral(limpar(e.target.value))} className={totalCls.replace("w-28", "w-24")} />
                  <SeletorDesconto valor={tipoGeral} onChange={setTipoGeral} disabled={!podeEditar || salvandoGeral} />
                </div>
              </div>
              {descontoGeralValor > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Desconto aplicado:</span>
                  <span className="font-medium text-orange-400">- {moeda(descontoGeralValor)}</span>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-slate-400">Frete:</span>
                <input type="text" inputMode="decimal" value={frete} placeholder="0,00" disabled={!podeEditar || salvandoGeral}
                  onChange={(e) => setFrete(limpar(e.target.value))} className={totalCls} />
              </div>

              {podeEditar && mudouGeral && (
                <div className="flex gap-2 pt-1">
                  <button onClick={salvarGeral} disabled={salvandoGeral} className="flex flex-1 items-center justify-center gap-2 rounded border border-emerald-500/50 bg-emerald-500/20 px-3 py-1.5 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/30 disabled:opacity-50">
                    <Check size={16} />{salvandoGeral ? "Salvando..." : "Salvar"}
                  </button>
                  <button onClick={cancelarGeral} disabled={salvandoGeral} className="flex flex-1 items-center justify-center gap-2 rounded border border-gray-300 bg-gray-200/50 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-gray-200 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-300 dark:hover:bg-slate-700">
                    <X size={16} />Cancelar
                  </button>
                </div>
              )}

              <div className="mt-1 flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5">
                <span className="font-semibold text-slate-900 dark:text-white">Valor do negócio:</span>
                <span className="text-xl font-bold text-emerald-400">{moeda(valorNegocio)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center">
            <Package size={32} className="mx-auto mb-2 text-slate-600" />
            <p className="mb-4 text-sm text-slate-400">Nenhum produto adicionado</p>
          </div>
        )}

        {podeEditar && (
          <button onClick={() => setEscolhendo(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-500/50 bg-blue-500/20 px-4 py-2 font-medium text-slate-900 transition-colors hover:bg-blue-500/30 dark:text-blue-400">
            <Plus size={18} />Adicionar produto
          </button>
        )}

        {escolhendo && ReactDOM.createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => { setEscolhendo(false); setBusca(""); }}>
            <div className="flex max-h-[600px] w-full max-w-lg flex-col rounded-lg border border-gray-200 bg-gray-100 shadow-2xl dark:border-slate-700 dark:bg-slate-800" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-slate-700">
                <h3 className="font-semibold text-slate-900 dark:text-white">Adicionar Produto</h3>
                <button onClick={() => { setEscolhendo(false); setBusca(""); }} className="text-slate-400 transition-colors hover:text-slate-900 dark:hover:text-white"><X size={20} /></button>
              </div>
              <div className="border-b border-gray-200 p-4 dark:border-slate-700">
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou SKU..." autoFocus
                    className="w-full rounded-lg border border-gray-200 bg-white/50 py-3 pl-10 pr-10 text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900/50 dark:text-white" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {carregando ? (
                  <div className="p-8 text-center text-sm text-slate-400">Carregando produtos...</div>
                ) : disponiveis.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-400">
                    {busca ? "Nenhum produto encontrado com esse critério"
                      : catalogo.length === 0 ? "Nenhum produto liberado para parceiros"
                      : "Todos os produtos liberados já estão na oportunidade"}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {disponiveis.map((p) => (
                      <button key={p.id} onClick={() => adicionar(p)}
                        className="w-full rounded-lg border border-gray-200 bg-white/50 p-3 text-left transition-colors hover:bg-gray-200/50 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:bg-slate-700/50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">{p.name}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">SKU: {p.sku || "N/A"}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-400">Preço</p>
                            <p className="text-sm font-medium text-emerald-400">{moeda(p.unit_price)}</p>
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
}
