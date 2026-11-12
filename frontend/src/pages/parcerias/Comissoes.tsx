import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, ChevronDown, ChevronRight, Clock, Copy, Download, ListChecks, Settings, Users, Wallet } from "lucide-react";
import { Button, EmptyState, Input, Pagination, SelectMenu } from "../../components/common";
import KpiCard from "../../components/dashboard/KpiCard";
import { PageHeader } from "../../components/layout/PageHeader";
import { useAuth } from "../../hooks/useAuth";
import { usePagination } from "../../hooks";
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

/** Período "[data] até [data]"; o campo de data do navegador é mais alto que o SelectMenu (50px), então fixa a altura. */
function Periodo({ de, ate, onDe, onAte }: { de: string; ate: string; onDe: (v: string) => void; onAte: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 sm:col-span-2">
      <Input type="date" title="Desde" className="h-[50px] min-w-0 flex-1 !py-0" value={de} onChange={(e) => onDe(e.target.value)} />
      <span className="text-sm text-slate-500 dark:text-slate-400">até</span>
      <Input type="date" title="Até" className="h-[50px] min-w-0 flex-1 !py-0" value={ate} onChange={(e) => onAte(e.target.value)} />
    </div>
  );
}

const TH = "px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300";
const TD = "px-6 py-4 text-sm";

/** "Carregando..." no mesmo formato das outras listas. */
const Carregando = () => <div className="py-12 text-center text-slate-500 dark:text-slate-400">Carregando...</div>;

function Tabela({ itens, mostrarBeneficiario, acao }: {
  itens: Comissao[];
  mostrarBeneficiario?: boolean;
  acao?: (c: Comissao) => React.ReactNode;
}) {
  const pagination = usePagination(itens, 10);
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-800/30">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800/50">
              <th className={TH}>Data</th>
              {mostrarBeneficiario && <th className={TH}>Beneficiário</th>}
              <th className={TH}>Oportunidade</th>
              <th className={TH}>Empresa que vendeu</th>
              <th className={TH}>Tipo</th>
              <th className={`${TH} !text-right`}>Base</th>
              <th className={`${TH} !text-right`}>% / bônus</th>
              <th className={`${TH} !text-right`}>Valor</th>
              <th className={TH}>Situação</th>
              {acao && <th className={`${TH} !text-right`}>Ações</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-slate-700 dark:divide-slate-700/50 dark:text-slate-300">
            {pagination.paginatedItems.map((c) => (
              <tr key={c.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/30">
                <td className={`${TD} whitespace-nowrap`}>{dia(c.created_at)}</td>
                {mostrarBeneficiario && <td className={`${TD} font-medium text-slate-900 dark:text-white`}>{c.beneficiary_name}</td>}
                <td className={TD}>
                  <Link to={`/parcerias/oportunidades/${c.opportunity_id}`} className="font-medium text-slate-900 hover:text-emerald-500 hover:underline dark:text-white">
                    {c.opportunity_title || `#${c.opportunity_id}`}
                  </Link>
                </td>
                <td className={TD}>{c.source_name}</td>
                <td className={TD}>{COMISSAO_TIPO_LABEL[c.kind] ?? c.kind}</td>
                <td className={`${TD} whitespace-nowrap text-right`}>{dinheiro(c.base_value)}</td>
                <td className={`${TD} whitespace-nowrap text-right`}>{taxaOuBonus(c)}</td>
                <td className={`${TD} whitespace-nowrap text-right font-medium text-slate-900 dark:text-white`}>{dinheiro(c.amount)}</td>
                <td className={TD}>
                  <Situacao status={c.status} />
                  {c.status === "cancelada" && c.cancel_reason && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{c.cancel_reason}</p>
                  )}
                </td>
                {acao && (
                  <td className={TD}>
                    <div className="flex items-center justify-end gap-2">{acao(c)}</div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination {...pagination} itemLabel="lançamentos" alwaysShow />
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
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard
          icon={<Clock size={20} />}
          iconBg="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
          label="Pendente"
          value={resumo ? Number(resumo.pendente) : null}
          format="currency"
          sub="a receber no período"
          highlight="yellow"
        />
        <KpiCard
          icon={<CheckCircle2 size={20} />}
          iconBg="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
          label="Pago"
          value={resumo ? Number(resumo.pago) : null}
          format="currency"
          sub="já recebido no período"
          highlight="green"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SelectMenu value={status} options={OPCOES_STATUS} onChange={setStatus} />
        <Periodo de={de} ate={ate} onDe={setDe} onAte={setAte} />
      </div>

      {carregando && itens.length === 0 ? (
        <Carregando />
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
    <div className="rounded-xl border border-gray-200 bg-white dark:border-slate-700/50 dark:bg-slate-800/30">
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
          <Button size="sm" icon={<CheckCircle2 size={16} />} onClick={() => onPagar(b.lancamentos.map((l) => l.id), Number(b.total), b.nome)}>
            Marcar tudo pago
          </Button>
        </div>
      </div>
      {aberto && (
        <div className="border-t border-gray-200 p-4 dark:border-slate-700/50">
          <Tabela itens={b.lancamentos} acao={(c) => (
            <button
              type="button"
              onClick={() => onPagar([c.id], Number(c.amount), b.nome)}
              className="rounded-lg bg-emerald-600/20 p-2 text-slate-900 transition-colors hover:bg-emerald-600/30 dark:text-emerald-400"
              title="Marcar pago"
            >
              <CheckCircle2 size={16} />
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
  const pagination = usePagination(grupos, 10);
  const semDados = carregando && grupos.length === 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard
          icon={<Wallet size={20} />}
          iconBg="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
          label="Total a pagar"
          value={semDados ? null : totalGeral}
          format="currency"
          sub="comissões pendentes no período"
          highlight="yellow"
        />
        <KpiCard
          icon={<Users size={20} />}
          iconBg="bg-blue-500/20 text-blue-600 dark:text-blue-400"
          label="Beneficiários"
          value={semDados ? null : grupos.length}
          sub="parceiros e hunters com valor a receber"
          highlight="blue"
        />
      </div>

      <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-3">
        <Periodo de={de} ate={ate} onDe={setDe} onAte={setAte} />
        <div className="flex justify-end">
          <Button variant="secondary" icon={<Download size={16} />} onClick={exportar} loading={baixando} disabled={grupos.length === 0}>
            Exportar CSV
          </Button>
        </div>
      </div>

      {semDados ? (
        <Carregando />
      ) : grupos.length === 0 ? (
        <EmptyState icon={Wallet} title="Nada a pagar" description="Não há comissões pendentes neste período." />
      ) : (
        <div className="space-y-3">
          {pagination.paginatedItems.map((g) => <BlocoBeneficiario key={g.beneficiary_partner_id} b={g} onPagar={pagar} />)}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-700/50 dark:bg-slate-800/30">
            <Pagination {...pagination} itemLabel="beneficiários" alwaysShow />
          </div>
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
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SelectMenu value={status} options={OPCOES_STATUS} onChange={setStatus} />
        <SelectMenu value={beneficiario} options={nomes} onChange={setBeneficiario} />
        <Periodo de={de} ate={ate} onDe={setDe} onAte={setAte} />
      </div>
      {carregando && itens.length === 0 ? (
        <Carregando />
      ) : itens.length === 0 ? (
        <EmptyState icon={Wallet} title="Nenhum lançamento" description="Nada encontrado com esses filtros." />
      ) : (
        <Tabela itens={itens} mostrarBeneficiario />
      )}
    </div>
  );
}

const ABAS = [
  { id: "a-pagar" as const, label: "A pagar", icon: Wallet },
  { id: "todos" as const, label: "Todos os lançamentos", icon: ListChecks },
];

export default function Comissoes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const veTudo = PERFIS_COMISSOES_TUDO.includes(user?.role ?? "");
  const [aba, setAba] = useState<"a-pagar" | "todos">("a-pagar");

  return (
    <div className="p-6">
      <PageHeader
        title={veTudo ? "Comissões" : "Minhas comissões"}
        description={veTudo ? "O que pagar aos parceiros e hunters e o histórico de lançamentos." : "O que você tem a receber e já recebeu."}
        icon={Wallet}
        actions={veTudo && (
          <Button variant="secondary" size="sm" icon={<Settings size={16} />} onClick={() => navigate("/settings?aba=comissoes")}>
            Config. comissões
          </Button>
        )}
      />

      {veTudo ? (
        // Abas no mesmo formato das de Configurações
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white backdrop-blur dark:border-slate-700 dark:bg-slate-800/50">
          <div className="grid grid-cols-2 border-b border-gray-200 dark:border-slate-700">
            {ABAS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAba(a.id)}
                className={`flex min-w-0 items-center justify-center gap-2 px-3 py-3 font-medium transition-colors ${
                  aba === a.id
                    ? "bg-emerald-600 text-white"
                    : "text-slate-500 hover:bg-gray-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-white"
                }`}
              >
                <a.icon size={20} className="shrink-0" />
                <span className="truncate">{a.label}</span>
              </button>
            ))}
          </div>
          <div className="p-6">{aba === "a-pagar" ? <APagar /> : <Todos />}</div>
        </div>
      ) : (
        <MinhasComissoes />
      )}
    </div>
  );
}
