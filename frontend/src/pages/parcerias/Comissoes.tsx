import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, Copy, Download, Settings, Wallet } from "lucide-react";
import { Button, EmptyState, Input, SelectMenu } from "../../components/common";
import { useAuth } from "../../hooks/useAuth";
import { useConfirm } from "../../contexts/ConfirmContext";
import { showError, showSuccess, showWarning } from "../../utils/toast";
import {
  COMISSAO_STATUS_COR, COMISSAO_STATUS_LABEL, COMISSAO_TIPO_LABEL, PERFIS_COMISSOES_TUDO,
  formatarMoeda, formatarPercentual,
} from "../../constants/parcerias";
import { dia, formatarDocumento } from "../../utils/formatters";
import parceriasService, {
  mensagemDeErro, type APagarBeneficiario, type Comissao, type ComissaoResumo, type SituacaoComissao,
} from "../../services/parceriasService";

const dinheiro = (v: string | number) => formatarMoeda(Number(v));
const OPCOES_STATUS = [
  { value: "", label: "Todas as situações" },
  { value: "pendente", label: "Pendente" },
  { value: "paga", label: "Paga" },
  { value: "cancelada", label: "Cancelada" },
];

function Situacao({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COMISSAO_STATUS_COR[status] ?? ""}`}>
      {COMISSAO_STATUS_LABEL[status] ?? status}
    </span>
  );
}

/** "7,5%" ou o valor fixo do bônus. */
const taxaOuBonus = (c: Comissao) =>
  c.kind === "bonus_primeira_venda" ? dinheiro(c.fixed_value ?? c.amount) : formatarPercentual(c.rate);

function Periodo({ de, ate, onDe, onAte }: { de: string; ate: string; onDe: (v: string) => void; onAte: (v: string) => void }) {
  return (
    <>
      <label className="flex items-center gap-2 text-sm text-slate-500 dark:text-gray-400">
        De <Input type="date" fullWidth={false} value={de} onChange={(e) => onDe(e.target.value)} />
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-500 dark:text-gray-400">
        até <Input type="date" fullWidth={false} value={ate} onChange={(e) => onAte(e.target.value)} />
      </label>
    </>
  );
}

function Tabela({ itens, mostrarBeneficiario, acao }: {
  itens: Comissao[];
  mostrarBeneficiario?: boolean;
  acao?: (c: Comissao) => React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700/50">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
          <tr>
            <th className="px-4 py-3">Data</th>
            {mostrarBeneficiario && <th className="px-4 py-3">Beneficiário</th>}
            <th className="px-4 py-3">Oportunidade</th>
            <th className="px-4 py-3">Empresa que vendeu</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3 text-right">Base</th>
            <th className="px-4 py-3 text-right">% / bônus</th>
            <th className="px-4 py-3 text-right">Valor</th>
            <th className="px-4 py-3">Situação</th>
            {acao && <th className="px-4 py-3" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 text-slate-800 dark:divide-slate-700/50 dark:text-slate-200">
          {itens.map((c) => (
            <tr key={c.id}>
              <td className="whitespace-nowrap px-4 py-3">{dia(c.created_at)}</td>
              {mostrarBeneficiario && <td className="px-4 py-3">{c.beneficiary_name}</td>}
              <td className="px-4 py-3">
                <Link to={`/parcerias/oportunidades/${c.opportunity_id}`} className="text-blue-500 hover:underline">
                  {c.opportunity_title || `#${c.opportunity_id}`}
                </Link>
              </td>
              <td className="px-4 py-3">{c.source_name}</td>
              <td className="px-4 py-3">{COMISSAO_TIPO_LABEL[c.kind] ?? c.kind}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right">{dinheiro(c.base_value)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right">{taxaOuBonus(c)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-medium">{dinheiro(c.amount)}</td>
              <td className="px-4 py-3">
                <Situacao status={c.status} />
                {c.status === "cancelada" && c.cancel_reason && (
                  <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">{c.cancel_reason}</p>
                )}
              </td>
              {acao && <td className="px-4 py-3">{acao(c)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Minhas comissões (parceiro e hunter) ────────────────────────────────────
function MinhasComissoes() {
  const [status, setStatus] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [itens, setItens] = useState<Comissao[]>([]);
  const [resumo, setResumo] = useState<ComissaoResumo | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    const periodo = { de: de || undefined, ate: ate || undefined };
    Promise.all([
      parceriasService.listarComissoes({ ...periodo, status: (status || undefined) as SituacaoComissao | undefined }),
      parceriasService.resumoComissoes(periodo),
    ])
      .then(([lista, res]) => { if (vivo) { setItens(lista); setResumo(res); } })
      .catch((e) => showError(mensagemDeErro(e, "Erro ao carregar as comissões.")))
      .finally(() => { if (vivo) setCarregando(false); });
    return () => { vivo = false; };
  }, [status, de, ate]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-xs uppercase text-amber-700 dark:text-amber-400">Pendente</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{dinheiro(resumo?.pendente ?? 0)}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="text-xs uppercase text-emerald-700 dark:text-emerald-400">Pago</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{dinheiro(resumo?.pago ?? 0)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-56"><SelectMenu size="sm" value={status} options={OPCOES_STATUS} onChange={setStatus} /></div>
        <Periodo de={de} ate={ate} onDe={setDe} onAte={setAte} />
      </div>

      {carregando && itens.length === 0 ? (
        <p className="text-sm text-slate-500">Carregando...</p>
      ) : itens.length === 0 ? (
        <EmptyState icon={Wallet} title="Nenhuma comissão" description="Quando uma venda sua for confirmada, a comissão aparece aqui." />
      ) : (
        <Tabela itens={itens} />
      )}
    </div>
  );
}

// ─── A pagar (admin, gerente, Financeiro) ────────────────────────────────────
async function copiar(texto: string) {
  try {
    await navigator.clipboard.writeText(texto);
    showSuccess("Chave PIX copiada.");
  } catch {
    showWarning("Não foi possível copiar automaticamente; selecione a chave e copie.");
  }
}

function BlocoBeneficiario({ b, onPagar }: { b: APagarBeneficiario; onPagar: (ids: number[], total: number, nome: string) => void }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="rounded-xl border border-gray-200 dark:border-slate-700/50">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0 space-y-1">
          <button type="button" onClick={() => setAberto(!aberto)} className="flex items-center gap-1 text-left font-semibold text-slate-900 dark:text-white">
            {aberto ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            {b.nome}
            <span className="ml-1 text-xs font-normal text-slate-500">({b.quantidade} {b.quantidade === 1 ? "lançamento" : "lançamentos"})</span>
          </button>
          <p className="text-sm text-slate-500 dark:text-gray-400">
            {b.documento ? formatarDocumento(b.documento) : "Sem CPF/CNPJ"}
            {" · PIX: "}
            {b.pix_key ? (
              <>
                <span className="select-all font-mono text-slate-700 dark:text-slate-200">{b.pix_key}</span>
                <button type="button" title="Copiar PIX" onClick={() => copiar(b.pix_key!)} className="ml-2 inline-flex align-middle text-slate-500 hover:text-slate-700 dark:hover:text-white">
                  <Copy size={14} />
                </button>
              </>
            ) : (
              <span className="text-amber-600 dark:text-amber-400">não cadastrada</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-lg font-bold text-slate-900 dark:text-white">{dinheiro(b.total)}</span>
          <Button onClick={() => onPagar(b.lancamentos.map((l) => l.id), Number(b.total), b.nome)}>Marcar pago</Button>
        </div>
      </div>
      {aberto && (
        <div className="border-t border-gray-200 p-4 dark:border-slate-700/50">
          <Tabela itens={b.lancamentos} acao={(c) => (
            <button type="button" className="whitespace-nowrap text-xs text-emerald-600 hover:underline" onClick={() => onPagar([c.id], Number(c.amount), b.nome)}>
              Marcar pago
            </button>
          )} />
        </div>
      )}
    </div>
  );
}

function APagar() {
  const { confirm } = useConfirm();
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [grupos, setGrupos] = useState<APagarBeneficiario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [baixando, setBaixando] = useState(false);
  const periodo = useMemo(() => ({ de: de || undefined, ate: ate || undefined }), [de, ate]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      setGrupos(await parceriasService.comissoesAPagar(periodo));
    } catch (e) {
      showError(mensagemDeErro(e, "Erro ao carregar as comissões a pagar."));
    } finally {
      setCarregando(false);
    }
  }, [periodo]);

  useEffect(() => { carregar(); }, [carregar]);

  const pagar = async (ids: number[], total: number, nome: string) => {
    const ok = await confirm({
      title: "Marcar como pago",
      message: `Marcar ${formatarMoeda(total)} como pago para ${nome}?`,
      confirmText: "Marcar pago",
    });
    if (!ok) return;
    // O backend aceita até 500 ids por chamada: paga em lotes, em sequência.
    let quantidade = 0, soma = 0, ignorados = 0;
    try {
      for (let i = 0; i < ids.length; i += 500) {
        const r = await parceriasService.pagarComissoes(ids.slice(i, i + 500));
        quantidade += r.quantidade; soma += Number(r.total); ignorados += r.ignorados;
      }
      showSuccess(`${quantidade} ${quantidade === 1 ? "lançamento pago" : "lançamentos pagos"} (${dinheiro(soma)}).`);
      if (ignorados > 0) showWarning(`${ignorados} já não estavam pendentes e foram ignorados.`);
      await carregar();
    } catch (e) {
      if (quantidade > 0) showWarning(`${quantidade} lançamentos já foram pagos antes do erro.`);
      showError(mensagemDeErro(e, "Erro ao marcar como pago."));
      await carregar();
    }
  };

  const exportar = async () => {
    setBaixando(true);
    try {
      await parceriasService.baixarAPagarCsv(periodo);
    } catch (e) {
      showError(mensagemDeErro(e, "Erro ao exportar o CSV."));
    } finally {
      setBaixando(false);
    }
  };

  const totalGeral = grupos.reduce((s, g) => s + Number(g.total), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Periodo de={de} ate={ate} onDe={setDe} onAte={setAte} />
        <div className="ml-auto flex items-center gap-4">
          <span className="text-sm text-slate-500 dark:text-gray-400">Total: <strong className="text-slate-900 dark:text-white">{formatarMoeda(totalGeral)}</strong></span>
          <Button variant="secondary" icon={<Download size={16} />} onClick={exportar} loading={baixando} disabled={grupos.length === 0}>
            Exportar CSV
          </Button>
        </div>
      </div>

      {carregando && grupos.length === 0 ? (
        <p className="text-sm text-slate-500">Carregando...</p>
      ) : grupos.length === 0 ? (
        <EmptyState icon={Wallet} title="Nada a pagar" description="Não há comissões pendentes neste período." />
      ) : (
        <div className="space-y-3">
          {grupos.map((g) => <BlocoBeneficiario key={g.beneficiary_partner_id} b={g} onPagar={pagar} />)}
        </div>
      )}
    </div>
  );
}

// ─── Todos os lançamentos ────────────────────────────────────────────────────
function Todos() {
  const [status, setStatus] = useState("");
  const [beneficiario, setBeneficiario] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [itens, setItens] = useState<Comissao[]>([]);
  const [nomes, setNomes] = useState<{ value: string; label: string }[]>([{ value: "", label: "Todos os beneficiários" }]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    parceriasService.listarComissoes({
      status: (status || undefined) as SituacaoComissao | undefined,
      beneficiario: beneficiario ? Number(beneficiario) : undefined,
      de: de || undefined,
      ate: ate || undefined,
    })
      .then((lista) => {
        if (!vivo) return;
        setItens(lista);
        // As opções do filtro vêm dos beneficiários já vistos (sem trocar a escolha atual).
        setNomes((atual) => {
          const mapa = new Map(atual.filter((o) => o.value).map((o) => [o.value, o.label]));
          lista.forEach((c) => mapa.set(String(c.beneficiary_partner_id), c.beneficiary_name ?? `#${c.beneficiary_partner_id}`));
          const ordenado = [...mapa].sort((a, b) => a[1].localeCompare(b[1], "pt-BR")).map(([value, label]) => ({ value, label }));
          return [{ value: "", label: "Todos os beneficiários" }, ...ordenado];
        });
      })
      .catch((e) => showError(mensagemDeErro(e, "Erro ao carregar os lançamentos.")))
      .finally(() => { if (vivo) setCarregando(false); });
    return () => { vivo = false; };
  }, [status, beneficiario, de, ate]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-56"><SelectMenu size="sm" value={status} options={OPCOES_STATUS} onChange={setStatus} /></div>
        <div className="w-64"><SelectMenu size="sm" value={beneficiario} options={nomes} onChange={setBeneficiario} /></div>
        <Periodo de={de} ate={ate} onDe={setDe} onAte={setAte} />
      </div>
      {carregando && itens.length === 0 ? (
        <p className="text-sm text-slate-500">Carregando...</p>
      ) : itens.length === 0 ? (
        <EmptyState icon={Wallet} title="Nenhum lançamento" description="Nada encontrado com esses filtros." />
      ) : (
        <Tabela itens={itens} mostrarBeneficiario />
      )}
    </div>
  );
}

export default function Comissoes() {
  const { user } = useAuth();
  const veTudo = PERFIS_COMISSOES_TUDO.includes(user?.role ?? "");
  const [aba, setAba] = useState<"a-pagar" | "todos">("a-pagar");

  const botaoAba = (chave: "a-pagar" | "todos", rotulo: string) => (
    <button
      type="button"
      onClick={() => setAba(chave)}
      className={`rounded-lg px-4 py-1.5 text-sm font-medium ${
        aba === chave ? "bg-emerald-600 text-white" : "bg-gray-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
      }`}
    >
      {rotulo}
    </button>
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-slate-900 dark:text-white">
            <Wallet size={32} /> {veTudo ? "Comissões" : "Minhas comissões"}
          </h1>
          <p className="mt-1 text-slate-500 dark:text-gray-400">
            {veTudo ? "O que pagar aos parceiros e hunters e o histórico de lançamentos." : "O que você tem a receber e já recebeu."}
          </p>
        </div>
        {veTudo && (
          <Link to="/parcerias/comissoes/config">
            <Button variant="secondary" icon={<Settings size={16} />}>Config. comissões</Button>
          </Link>
        )}
      </div>

      {veTudo ? (
        <>
          <div className="flex gap-2">{botaoAba("a-pagar", "A pagar")}{botaoAba("todos", "Todos os lançamentos")}</div>
          {aba === "a-pagar" ? <APagar /> : <Todos />}
        </>
      ) : (
        <MinhasComissoes />
      )}
    </div>
  );
}
