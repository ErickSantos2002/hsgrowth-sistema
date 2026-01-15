import { useState, useEffect } from "react";
import { X, Plus, Trash2, AlertCircle, CheckCircle2, HelpCircle, TrendingUp, TrendingDown, Calendar } from "lucide-react";
import { useMovimentacoesConta } from "../hooks/usePlanoContasDetalhes";
import type { Historico, PlanoContas, Lancamento } from "../types";

interface Partida {
    conta_id: number | null;
    tipo: "DEBITO" | "CREDITO";
    valor: number;
}

interface LancamentoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (dados: any) => Promise<void>;
    historicos: Historico[];
    contas: PlanoContas[];
    lancamentoInicial?: Lancamento | null;
}

// Componente para preview das últimas movimentações de uma conta
function MovimentacoesPreview({ contaId }: { contaId: number | null }) {
    const { data: movimentacoes, isLoading } = useMovimentacoesConta(contaId, 5);

    if (!contaId) return null;

    const formatarMoeda = (valor: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(valor);
    };

    const formatarData = (dataISO: string) => {
        return new Date(dataISO).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
        });
    };

    if (isLoading) {
        return (
            <div className="mt-2 p-3 bg-slate-950/50 rounded-lg border border-slate-700/30">
                <div className="flex items-center gap-2 mb-2">
                    <div className="h-3 w-3 bg-indigo-500/50 rounded-full animate-pulse"></div>
                    <span className="text-xs text-slate-400">Carregando movimentações...</span>
                </div>
            </div>
        );
    }

    if (!movimentacoes || movimentacoes.movimentacoes.length === 0) {
        return (
            <div className="mt-2 p-3 bg-slate-950/50 rounded-lg border border-slate-700/30">
                <p className="text-xs text-slate-500 text-center">Sem movimentações anteriores</p>
            </div>
        );
    }

    return (
        <div className="mt-2 p-3 bg-slate-950/50 rounded-lg border border-indigo-500/20">
            <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 bg-indigo-500 rounded-full"></div>
                <span className="text-xs font-medium text-indigo-300">
                    Últimas {movimentacoes.movimentacoes.length} movimentações
                </span>
            </div>
            <div className="space-y-1.5">
                {movimentacoes.movimentacoes.map((mov) => (
                    <div
                        key={mov.id}
                        className="flex items-center justify-between p-2 bg-slate-900/50 rounded hover:bg-slate-900/70 transition-colors"
                    >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div
                                className={`p-1 rounded ${
                                    mov.tipo === "DEBITO"
                                        ? "bg-emerald-500/20 text-emerald-400"
                                        : "bg-rose-500/20 text-rose-400"
                                }`}
                            >
                                {mov.tipo === "DEBITO" ? (
                                    <TrendingUp size={12} />
                                ) : (
                                    <TrendingDown size={12} />
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-400 min-w-0">
                                <Calendar size={10} />
                                <span>{formatarData(mov.data)}</span>
                                {mov.complemento && (
                                    <span className="truncate text-slate-500">- {mov.complemento}</span>
                                )}
                            </div>
                        </div>
                        <span
                            className={`text-xs font-semibold whitespace-nowrap ml-2 ${
                                mov.tipo === "DEBITO" ? "text-emerald-400" : "text-rose-400"
                            }`}
                        >
                            {mov.tipo === "DEBITO" ? "+" : "-"}
                            {formatarMoeda(mov.valor)}
                        </span>
                    </div>
                ))}
            </div>
            {movimentacoes.total_movimentacoes > 5 && (
                <p className="text-xs text-slate-500 text-center mt-2">
                    + {movimentacoes.total_movimentacoes - 5} movimentações anteriores
                </p>
            )}
        </div>
    );
}

export default function LancamentoModal({
    isOpen,
    onClose,
    onSave,
    historicos,
    contas,
    lancamentoInicial,
}: LancamentoModalProps) {
    const hoje = new Date().toISOString().split("T")[0];

    const [dataLancamento, setDataLancamento] = useState(hoje);
    const [historicoId, setHistoricoId] = useState<number | null>(null);
    const [complemento, setComplemento] = useState("");
    const [partidas, setPartidas] = useState<Partida[]>([
        { conta_id: null, tipo: "DEBITO", valor: 0 },
        { conta_id: null, tipo: "CREDITO", valor: 0 },
    ]);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (isOpen) {
            if (lancamentoInicial) {
                // Modo edição - preencher com dados existentes
                setDataLancamento(lancamentoInicial.data_lancamento);
                setHistoricoId(lancamentoInicial.historico_id);
                setComplemento(lancamentoInicial.complemento || "");
                setPartidas(
                    lancamentoInicial.partidas.map((p) => ({
                        conta_id: p.conta_id,
                        tipo: p.tipo,
                        valor: parseFloat(String(p.valor)) || 0,
                    }))
                );
            } else {
                // Modo criação - resetar form
                setDataLancamento(hoje);
                setHistoricoId(null);
                setComplemento("");
                setPartidas([
                    { conta_id: null, tipo: "DEBITO", valor: 0 },
                    { conta_id: null, tipo: "CREDITO", valor: 0 },
                ]);
            }
            setErrors({});
        }
    }, [isOpen, lancamentoInicial]);

    const calcularTotais = () => {
        const totalDebito = partidas
            .filter((p) => p.tipo === "DEBITO")
            .reduce((sum, p) => {
                const valor = typeof p.valor === "number" && !isNaN(p.valor) ? p.valor : 0;
                return sum + valor;
            }, 0);

        const totalCredito = partidas
            .filter((p) => p.tipo === "CREDITO")
            .reduce((sum, p) => {
                const valor = typeof p.valor === "number" && !isNaN(p.valor) ? p.valor : 0;
                return sum + valor;
            }, 0);

        return { totalDebito, totalCredito };
    };

    const { totalDebito, totalCredito } = calcularTotais();
    const isBalanceado = totalDebito > 0 && totalDebito === totalCredito;

    const adicionarPartida = (tipo: "DEBITO" | "CREDITO") => {
        setPartidas([...partidas, { conta_id: null, tipo, valor: 0 }]);
    };

    const removerPartida = (index: number) => {
        if (partidas.length > 2) {
            setPartidas(partidas.filter((_, i) => i !== index));
        }
    };

    const atualizarPartida = (index: number, field: keyof Partida, value: any) => {
        const novasPartidas = [...partidas];

        // Se o campo for valor, garantir que seja um número válido
        if (field === "valor") {
            const numValue = typeof value === "number" ? value : parseFloat(value);
            novasPartidas[index] = {
                ...novasPartidas[index],
                [field]: isNaN(numValue) ? 0 : numValue
            };
        } else {
            novasPartidas[index] = { ...novasPartidas[index], [field]: value };
        }

        setPartidas(novasPartidas);
    };

    const validarFormulario = () => {
        const newErrors: Record<string, string> = {};

        if (!dataLancamento) {
            newErrors.data = "Data é obrigatória";
        }

        if (!historicoId) {
            newErrors.historico = "Histórico é obrigatório";
        }

        if (!isBalanceado) {
            newErrors.partidas = "Total de débitos deve ser igual ao total de créditos";
        }

        // Validar cada partida
        partidas.forEach((partida, index) => {
            if (!partida.conta_id) {
                newErrors[`partida_${index}_conta`] = "Conta é obrigatória";
            }
            if (partida.valor <= 0) {
                newErrors[`partida_${index}_valor`] = "Valor deve ser maior que zero";
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validarFormulario()) {
            return;
        }

        setIsSaving(true);
        try {
            await onSave({
                data_lancamento: dataLancamento,
                historico_id: historicoId,
                complemento: complemento || undefined,
                partidas: partidas.map((p) => ({
                    conta_id: p.conta_id!,
                    tipo: p.tipo,
                    valor: p.valor,
                })),
            });
            onClose();
        } catch (error) {
            console.error("Erro ao salvar lançamento:", error);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    const formatarMoeda = (valor: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(valor);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700 sticky top-0 bg-slate-900 z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-white">
                            {lancamentoInicial ? "Editar Lançamento" : "Novo Lançamento"}
                        </h2>
                        <p className="text-sm text-slate-400">Partidas dobradas</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Dica inicial */}
                    <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4">
                        <p className="text-sm text-indigo-200 flex items-start gap-2">
                            <HelpCircle size={16} className="mt-0.5 flex-shrink-0" />
                            <span>
                                <strong>Lançamento Contábil:</strong> Utilize o método das partidas
                                dobradas. O total de débitos deve ser igual ao total de créditos.
                            </span>
                        </p>
                    </div>

                    {/* Data e Histórico */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Data */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Data do Lançamento <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="date"
                                value={dataLancamento}
                                onChange={(e) => setDataLancamento(e.target.value)}
                                className={`w-full px-4 py-3 bg-slate-800 border ${
                                    errors.data ? "border-red-500" : "border-slate-600"
                                } rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                            />
                            {errors.data && (
                                <p className="mt-1 text-sm text-red-400">{errors.data}</p>
                            )}
                        </div>

                        {/* Histórico */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Histórico <span className="text-red-400">*</span>
                            </label>
                            <select
                                value={historicoId || ""}
                                onChange={(e) =>
                                    setHistoricoId(e.target.value ? parseInt(e.target.value) : null)
                                }
                                className={`w-full px-4 py-3 bg-slate-800 border ${
                                    errors.historico ? "border-red-500" : "border-slate-600"
                                } rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                            >
                                <option value="">Selecione um histórico...</option>
                                {historicos.map((h) => (
                                    <option key={h.id} value={h.id}>
                                        {h.descricao}
                                    </option>
                                ))}
                            </select>
                            {errors.historico && (
                                <p className="mt-1 text-sm text-red-400">{errors.historico}</p>
                            )}
                        </div>
                    </div>

                    {/* Complemento */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Complemento (Opcional)
                        </label>
                        <textarea
                            value={complemento}
                            onChange={(e) => setComplemento(e.target.value)}
                            placeholder="Informações adicionais sobre este lançamento..."
                            rows={2}
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                        />
                    </div>

                    {/* Partidas */}
                    <div className="border-t border-slate-700 pt-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Partidas</h3>

                        {errors.partidas && (
                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
                                <AlertCircle size={18} className="text-red-400" />
                                <span className="text-red-400 text-sm">{errors.partidas}</span>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Débitos */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-sm font-medium text-rose-300">Débitos</h4>
                                    <button
                                        type="button"
                                        onClick={() => adicionarPartida("DEBITO")}
                                        className="text-xs px-3 py-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 rounded-lg transition-colors flex items-center gap-1"
                                    >
                                        <Plus size={14} />
                                        Adicionar
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {partidas
                                        .map((partida, index) => ({ partida, index }))
                                        .filter(({ partida }) => partida.tipo === "DEBITO")
                                        .map(({ partida, index }) => (
                                            <div
                                                key={index}
                                                className="bg-slate-800/50 border border-rose-500/20 rounded-lg p-3"
                                            >
                                                <div className="flex items-start gap-2">
                                                    <div className="flex-1 space-y-2">
                                                        <select
                                                            value={partida.conta_id || ""}
                                                            onChange={(e) =>
                                                                atualizarPartida(
                                                                    index,
                                                                    "conta_id",
                                                                    e.target.value
                                                                        ? parseInt(e.target.value)
                                                                        : null
                                                                )
                                                            }
                                                            className={`w-full px-3 py-2 bg-slate-900 border ${
                                                                errors[`partida_${index}_conta`]
                                                                    ? "border-red-500"
                                                                    : "border-slate-600"
                                                            } rounded text-white text-sm focus:ring-2 focus:ring-rose-500`}
                                                        >
                                                            <option value="">Selecione a conta...</option>
                                                            {contas.map((c) => (
                                                                <option key={c.id} value={c.id}>
                                                                    {c.codigo} - {c.descricao}
                                                                </option>
                                                            ))}
                                                        </select>

                                                        {/* Preview das últimas movimentações */}
                                                        <MovimentacoesPreview contaId={partida.conta_id} />

                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            value={isNaN(partida.valor) ? "" : partida.valor || ""}
                                                            onChange={(e) =>
                                                                atualizarPartida(
                                                                    index,
                                                                    "valor",
                                                                    e.target.value
                                                                )
                                                            }
                                                            placeholder="R$ 0,00"
                                                            className={`w-full px-3 py-2 bg-slate-900 border ${
                                                                errors[`partida_${index}_valor`]
                                                                    ? "border-red-500"
                                                                    : "border-slate-600"
                                                            } rounded text-white text-sm focus:ring-2 focus:ring-rose-500`}
                                                        />
                                                    </div>
                                                    {partidas.filter((p) => p.tipo === "DEBITO").length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removerPartida(index)}
                                                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                                                            title="Remover"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                </div>

                                {/* Total Débitos */}
                                <div className="mt-3 pt-3 border-t border-slate-700/50">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-400">Total Débitos:</span>
                                        <span className="text-rose-400 font-semibold">
                                            {formatarMoeda(totalDebito)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Créditos */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-sm font-medium text-emerald-300">Créditos</h4>
                                    <button
                                        type="button"
                                        onClick={() => adicionarPartida("CREDITO")}
                                        className="text-xs px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-lg transition-colors flex items-center gap-1"
                                    >
                                        <Plus size={14} />
                                        Adicionar
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {partidas
                                        .map((partida, index) => ({ partida, index }))
                                        .filter(({ partida }) => partida.tipo === "CREDITO")
                                        .map(({ partida, index }) => (
                                            <div
                                                key={index}
                                                className="bg-slate-800/50 border border-emerald-500/20 rounded-lg p-3"
                                            >
                                                <div className="flex items-start gap-2">
                                                    <div className="flex-1 space-y-2">
                                                        <select
                                                            value={partida.conta_id || ""}
                                                            onChange={(e) =>
                                                                atualizarPartida(
                                                                    index,
                                                                    "conta_id",
                                                                    e.target.value
                                                                        ? parseInt(e.target.value)
                                                                        : null
                                                                )
                                                            }
                                                            className={`w-full px-3 py-2 bg-slate-900 border ${
                                                                errors[`partida_${index}_conta`]
                                                                    ? "border-red-500"
                                                                    : "border-slate-600"
                                                            } rounded text-white text-sm focus:ring-2 focus:ring-emerald-500`}
                                                        >
                                                            <option value="">Selecione a conta...</option>
                                                            {contas.map((c) => (
                                                                <option key={c.id} value={c.id}>
                                                                    {c.codigo} - {c.descricao}
                                                                </option>
                                                            ))}
                                                        </select>

                                                        {/* Preview das últimas movimentações */}
                                                        <MovimentacoesPreview contaId={partida.conta_id} />

                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            value={isNaN(partida.valor) ? "" : partida.valor || ""}
                                                            onChange={(e) =>
                                                                atualizarPartida(
                                                                    index,
                                                                    "valor",
                                                                    e.target.value
                                                                )
                                                            }
                                                            placeholder="R$ 0,00"
                                                            className={`w-full px-3 py-2 bg-slate-900 border ${
                                                                errors[`partida_${index}_valor`]
                                                                    ? "border-red-500"
                                                                    : "border-slate-600"
                                                            } rounded text-white text-sm focus:ring-2 focus:ring-emerald-500`}
                                                        />
                                                    </div>
                                                    {partidas.filter((p) => p.tipo === "CREDITO").length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removerPartida(index)}
                                                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                                                            title="Remover"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                </div>

                                {/* Total Créditos */}
                                <div className="mt-3 pt-3 border-t border-slate-700/50">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-400">Total Créditos:</span>
                                        <span className="text-emerald-400 font-semibold">
                                            {formatarMoeda(totalCredito)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Indicador de Balanceamento */}
                        <div className="mt-4">
                            {isBalanceado ? (
                                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-2">
                                    <CheckCircle2 size={18} className="text-emerald-400" />
                                    <span className="text-emerald-400 text-sm font-medium">
                                        ✓ Partidas balanceadas - Débito = Crédito
                                    </span>
                                </div>
                            ) : totalDebito > 0 || totalCredito > 0 ? (
                                <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg flex items-center gap-2">
                                    <AlertCircle size={18} className="text-orange-400" />
                                    <span className="text-orange-400 text-sm">
                                        Diferença: {formatarMoeda(Math.abs(totalDebito - totalCredito))}
                                    </span>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving || !isBalanceado}
                            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSaving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Salvando...
                                </>
                            ) : lancamentoInicial ? (
                                "Atualizar Lançamento"
                            ) : (
                                "Salvar Lançamento"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
