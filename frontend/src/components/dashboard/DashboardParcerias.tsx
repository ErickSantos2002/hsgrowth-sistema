import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  AlertTriangle, Calendar, CheckCircle2, Clock, Handshake, Hourglass, LayoutDashboard, ShieldAlert,
  ShoppingCart, Sparkles, Target, TrendingUp, UserX, Users, Wallet, type LucideIcon,
} from "lucide-react";
import { BaseModal, Pagination, SelectMenu } from "../common";
import { PageHeader } from "../layout/PageHeader";
import { usePagination } from "../../hooks";
import KpiCard from "./KpiCard";
import { useTheme } from "../../context/ThemeContext";
import { getChartColors } from "../../constants/colors";
import { ETAPAS_AQUISICAO, COMISSAO_TIPO_LABEL, formatarMoeda } from "../../constants/parcerias";
import { dia } from "../../utils/formatters";
import parceriasService, {
  mensagemDeErro,
  type DashboardParcerias as Painel,
  type DashCarteiraItem,
  type DashComissoes,
  type DashConversao,
  type DashEtapa,
  type DashMes,
  type DashFiltroItem,
  type DashRisco,
  type DashRiscos,
  type DashRiscosHS,
} from "../../services/parceriasService";

const dinheiro = (v: string | number) => formatarMoeda(Number(v));

// ─── Período ─────────────────────────────────────────────────────────────────
const FUSO = "America/Sao_Paulo";
const iso = (d: Date) => d.toISOString().slice(0, 10);
/** Hoje no fuso de São Paulo, como UTC-meia-noite (só para fazer conta de calendário). */
const hojeSP = () => new Date(`${new Date().toLocaleDateString("en-CA", { timeZone: FUSO })}T00:00:00Z`);

const periodoEsteMes = () => {
  const h = hojeSP();
  return { de: iso(new Date(Date.UTC(h.getUTCFullYear(), h.getUTCMonth(), 1))), ate: iso(h) };
};
const periodoMesPassado = () => {
  const h = hojeSP();
  return {
    de: iso(new Date(Date.UTC(h.getUTCFullYear(), h.getUTCMonth() - 1, 1))),
    ate: iso(new Date(Date.UTC(h.getUTCFullYear(), h.getUTCMonth(), 0))),
  };
};
const periodoUltimos12 = () => {
  const h = hojeSP();
  return { de: iso(new Date(Date.UTC(h.getUTCFullYear(), h.getUTCMonth() - 11, 1))), ate: iso(h) };
};

const ATALHOS: Record<string, () => { de: string; ate: string }> = {
  este_mes: periodoEsteMes,
  mes_passado: periodoMesPassado,
  ultimos_12: periodoUltimos12,
};
const OPCOES_PERIODO = [
  { value: "este_mes", label: "Este Mês" },
  { value: "mes_passado", label: "Mês Passado" },
  { value: "ultimos_12", label: "Últimos 12 Meses" },
  { value: "custom", label: "Personalizado" },
];
/** Data no mesmo formato compacto do Dashboard geral (38px, igual ao SelectMenu "sm"). */
const CAMPO_DATA =
  "flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:flex-none";

const rotuloMes = (mes: string) => `${mes.slice(5, 7)}/${mes.slice(0, 4)}`;
const rotuloSituacao = (codigo: string) => ETAPAS_AQUISICAO.find((e) => e.codigo === codigo)?.nome ?? codigo;
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

// ─── Peças ───────────────────────────────────────────────────────────────────
function Bloco({ titulo, icone, acao, children }: {
  titulo: string; icone?: React.ReactNode; acao?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700/50 dark:bg-slate-800/50">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
          {icone}
          {titulo}
        </h3>
        {acao}
      </div>
      {children}
    </section>
  );
}

function Vazio({ texto }: { texto: string }) {
  return <p className="py-6 text-center text-sm text-slate-400">{texto}</p>;
}

function Tabela({ colunas, children }: { colunas: { rotulo: string; direita?: boolean }[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs text-slate-500 dark:border-slate-700/50 dark:text-slate-400">
            {colunas.map((c) => (
              <th key={c.rotulo} className={`whitespace-nowrap px-2 py-2 font-medium ${c.direita ? "text-right" : ""}`}>{c.rotulo}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-slate-700 dark:divide-slate-700/30 dark:text-slate-200">{children}</tbody>
      </table>
    </div>
  );
}

/** Tabela do painel paginada de 10 em 10 (a paginação só aparece quando há mais de uma página). */
function TabelaPaginada<T>({ colunas, itens, rotulo, linha }: {
  colunas: { rotulo: string; direita?: boolean }[];
  itens: T[];
  rotulo: string;
  linha: (item: T, posicao: number) => React.ReactNode;
}) {
  const pagination = usePagination(itens, 10);
  return (
    <>
      <Tabela colunas={colunas}>
        {pagination.paginatedItems.map((item, i) => linha(item, pagination.startIndex + i + 1))}
      </Tabela>
      <div className="-mx-5 -mb-5">
        <Pagination {...pagination} itemLabel={rotulo} />
      </div>
    </>
  );
}

const celula = "px-2 py-2";
const celulaNum = "whitespace-nowrap px-2 py-2 text-right tabular-nums";

function Parada({ item }: { item: DashCarteiraItem }) {
  if (item.dias_parada == null) {
    return <span className="text-slate-400">Sem atividade</span>;
  }
  if (!item.parada) {
    return <span className="text-slate-500 dark:text-slate-400">{plural(item.dias_parada, "dia", "dias")}</span>;
  }
  return (
    <span className="whitespace-nowrap rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
      Parada há {plural(item.dias_parada, "dia", "dias")}
    </span>
  );
}

function ComissoesPorTipo({ comissoes, link }: { comissoes: DashComissoes; link?: boolean }) {
  const tipos = Object.entries(comissoes.por_tipo);
  return (
      <Bloco
        titulo="Comissões por tipo"
        icone={<Wallet size={16} className="text-emerald-500" />}
        acao={link ? <Link to="/parcerias/comissoes" className="text-xs font-medium text-blue-500 hover:underline">Ver comissões</Link> : undefined}
      >
        {tipos.length === 0 ? (
          <Vazio texto="Nenhuma comissão no período." />
        ) : (
          <Tabela colunas={[{ rotulo: "Tipo" }, { rotulo: "Pendente", direita: true }, { rotulo: "Pago", direita: true }]}>
            {tipos.map(([tipo, v]) => (
              <tr key={tipo}>
                <td className={celula}>{COMISSAO_TIPO_LABEL[tipo] ?? tipo}</td>
                <td className={celulaNum}>{dinheiro(v.pendente)}</td>
                <td className={celulaNum}>{dinheiro(v.pago)}</td>
              </tr>
            ))}
          </Tabela>
        )}
      </Bloco>
  );
}

const TITULO_SECAO = "mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500";
const CARTAO = "rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700/50 dark:bg-slate-800/50";
const umaCasa = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
/** "2026-11-01" → "01/11/2026" sem passar por Date (evita voltar um dia no fuso de São Paulo). */
const dataBR = (d: string) => d.split("-").reverse().join("/");

function Secao({ titulo, risco, children }: { titulo: string; risco?: boolean; children: React.ReactNode }) {
  return (
    <section>
      <h2 className={risco ? "mb-3 text-xs font-semibold uppercase tracking-wider text-red-400" : TITULO_SECAO}>
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function CabecalhoGrafico({ titulo, icone, fundo, extra }: {
  titulo: string; icone: React.ReactNode; fundo: string; extra?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <div className={`rounded-lg p-2 ${fundo}`}>{icone}</div>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{titulo}</h3>
      {extra}
    </div>
  );
}

/** Mesmas cores de eixo e de tooltip dos gráficos dos outros dashboards. */
function useEstiloGrafico() {
  const { darkMode } = useTheme();
  const cores = getChartColors(darkMode);
  const texto = darkMode ? "#ffffff" : "#0f172a";
  return {
    cores,
    eixo: { fill: cores.content.secondary, fontSize: 11 },
    tooltip: {
      contentStyle: { backgroundColor: cores.surface.elevated, border: `1px solid ${cores.border.default}`, borderRadius: 8, fontSize: 12, color: texto },
      labelStyle: { color: texto },
      itemStyle: { color: texto },
    },
  };
}

function GraficoEvolucao({ evolucao, titulo }: { evolucao: DashMes[]; titulo: string }) {
  const { cores, eixo, tooltip } = useEstiloGrafico();
  const dados = evolucao.map((m) => ({ nome: rotuloMes(m.mes), valor: Number(m.valor), quantidade: m.quantidade }));
  const vazio = evolucao.every((m) => m.quantidade === 0);
  return (
    <div className={CARTAO}>
      <CabecalhoGrafico titulo={titulo} fundo="bg-emerald-500/20" icone={<TrendingUp size={16} className="text-emerald-400" />} />
      {vazio ? (
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">Nenhuma venda confirmada nos últimos 6 meses</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={dados} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={cores.border.default} vertical={false} />
            <XAxis dataKey="nome" tick={eixo} tickLine={false} />
            <YAxis
              tick={eixo} tickLine={false} axisLine={false} width={70}
              tickFormatter={(v: number) => v.toLocaleString("pt-BR", { notation: "compact" })}
            />
            <Tooltip
              {...tooltip}
              formatter={(v, _n, item) => [`${dinheiro(Number(v))} (${plural(item.payload.quantidade, "venda", "vendas")})`, "Valor vendido"]}
            />
            <Line type="monotone" dataKey="valor" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: "#10b981" }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function GraficoPipeline({ pipeline }: { pipeline: DashEtapa[] }) {
  const { cores, eixo, tooltip } = useEstiloGrafico();
  const total = pipeline.reduce((soma, e) => soma + e.quantidade, 0);
  const dados = pipeline.map((e) => ({ nome: e.nome, quantidade: e.quantidade, valor: Number(e.valor) }));
  return (
    <div className={CARTAO}>
      <CabecalhoGrafico
        titulo="Pipeline por Etapa" fundo="bg-blue-500/20" icone={<Target size={16} className="text-blue-400" />}
        extra={total > 0 ? (
          <span className="ml-auto rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs font-semibold text-blue-400">
            {plural(total, "oportunidade", "oportunidades")}
          </span>
        ) : undefined}
      />
      {total === 0 ? (
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">Nenhuma oportunidade em negociação</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={dados} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={cores.border.default} vertical={false} />
            <XAxis dataKey="nome" tick={eixo} tickLine={false} interval={0} />
            <YAxis tick={eixo} tickLine={false} axisLine={false} allowDecimals={false} width={40} />
            <Tooltip
              {...tooltip}
              formatter={(v, _n, item) => [`${v} (${dinheiro(item.payload.valor)})`, "Oportunidades"]}
            />
            <Bar dataKey="quantidade" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function Conversao({ conversao: c }: { conversao: DashConversao }) {
  const itens = [
    {
      rotulo: "Taxa de fechamento",
      valor: c.taxa_fechamento == null ? null : `${umaCasa(c.taxa_fechamento)}%`,
      detalhe: `${plural(c.ganhos, "ganho", "ganhos")} · ${plural(c.perdidos, "perdido", "perdidos")}`,
    },
    {
      rotulo: "Taxa de elegibilidade",
      valor: c.taxa_elegibilidade == null ? null : `${umaCasa(c.taxa_elegibilidade)}%`,
      detalhe: `${plural(c.validadas, "validada", "validadas")} · ${plural(c.rejeitadas, "rejeitada", "rejeitadas")}`,
    },
    {
      rotulo: "Tempo médio até o ganho",
      valor: c.tempo_medio_ganho_dias == null ? null : `${umaCasa(c.tempo_medio_ganho_dias)} dias`,
      detalhe: "Do cadastro à confirmação do ganho",
    },
  ];
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {itens.map((i) => (
        <div key={i.rotulo} className="rounded-xl border border-gray-200 bg-white p-4 text-center dark:border-slate-700/50 dark:bg-slate-800/50">
          <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{i.rotulo}</p>
          {i.valor !== null ? (
            <p className="text-2xl font-bold text-emerald-500">{i.valor}</p>
          ) : (
            <p className="text-2xl font-bold text-slate-400 dark:text-slate-500">—</p>
          )}
          <p className="mt-1 text-xs text-slate-400">{i.detalhe}</p>
        </div>
      ))}
    </div>
  );
}

type ChaveRisco = keyof DashRiscosHS;
const COR_RISCO = {
  red: { caixa: "border-red-500/20 bg-red-500/5 hover:bg-red-500/10", texto: "text-red-400" },
  orange: { caixa: "border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10", texto: "text-orange-400" },
  yellow: { caixa: "border-yellow-500/20 bg-yellow-500/5 hover:bg-yellow-500/10", texto: "text-yellow-500" },
} as const;
const RISCOS: { chave: ChaveRisco; titulo: string; descricao: string; cor: keyof typeof COR_RISCO; Icone: LucideIcon }[] = [
  { chave: "protecao", titulo: "Perdendo a proteção", descricao: "CNPJ fica livre em até 3 dias", cor: "red", Icone: ShieldAlert },
  { chave: "atividades_vencidas", titulo: "Atividades vencidas", descricao: "Oportunidades com atividade atrasada", cor: "orange", Icone: AlertTriangle },
  { chave: "ganho_a_confirmar", titulo: "Ganho a confirmar", descricao: "Ganho marcado pelo parceiro", cor: "yellow", Icone: CheckCircle2 },
  { chave: "elegibilidade_em_analise", titulo: "Elegibilidade em análise", descricao: "Aguardando a validação", cor: "yellow", Icone: Hourglass },
  { chave: "convites", titulo: "Convites sem ativação", descricao: "23 dias ou mais sem aceitar os termos", cor: "orange", Icone: UserX },
];

function ModalRisco({ titulo, risco, onClose }: { titulo: string; risco: DashRisco | null; onClose: () => void }) {
  const navigate = useNavigate();
  return (
    <BaseModal
      isOpen={risco !== null}
      onClose={onClose}
      closeOnOverlayClick
      size="xl"
      title={titulo}
      subtitle={risco && risco.total > risco.itens.length ? `Mostrando ${risco.itens.length} de ${risco.total}` : undefined}
    >
      {!risco || risco.itens.length === 0 ? (
        <Vazio texto="Nada por aqui. Tudo em dia." />
      ) : (
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-white text-xs text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="py-2 pr-3 font-medium">Nome</th>
                <th className="py-2 pr-3 font-medium">Empresa</th>
                <th className="py-2 pr-3 font-medium">Situação</th>
                <th className="py-2 text-right font-medium">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {risco.itens.map((i) => (
                <tr
                  key={i.link}
                  onClick={() => { onClose(); navigate(i.link); }}
                  title="Abrir"
                  className="cursor-pointer text-slate-700 hover:bg-gray-50 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <td className="py-2 pr-3 font-medium">{i.titulo}</td>
                  <td className="py-2 pr-3">{i.empresa || "—"}</td>
                  <td className="py-2 pr-3 text-xs text-slate-500 dark:text-slate-400">{i.detalhe}</td>
                  <td className="whitespace-nowrap py-2 text-right tabular-nums">{i.quando ? dia(i.quando) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </BaseModal>
  );
}

function Riscos({ riscos }: { riscos: DashRiscos | DashRiscosHS }) {
  const [aberto, setAberto] = useState<ChaveRisco | null>(null);
  const lista = (chave: ChaveRisco): DashRisco | undefined => (riscos as Partial<DashRiscosHS>)[chave];
  const visiveis = RISCOS.filter((r) => lista(r.chave) !== undefined);
  const atual = RISCOS.find((r) => r.chave === aberto);
  return (
    <>
      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${visiveis.length > 2 ? "lg:grid-cols-5" : ""}`}>
        {visiveis.map(({ chave, titulo, descricao, cor, Icone }) => {
          const c = COR_RISCO[cor];
          return (
            <button
              key={chave}
              type="button"
              onClick={() => setAberto(chave)}
              title="Ver a lista"
              className={`rounded-xl border p-5 text-left transition-colors ${c.caixa}`}
            >
              <div className="mb-3 flex items-center gap-2">
                <Icone size={16} className={c.texto} />
                <h3 className={`text-sm font-semibold ${c.texto}`}>{titulo}</h3>
              </div>
              <p className={`text-3xl font-bold ${c.texto}`}>{lista(chave)?.total ?? 0}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{descricao} · clique para ver</p>
            </button>
          );
        })}
      </div>
      <ModalRisco titulo={atual?.titulo ?? ""} risco={aberto ? lista(aberto) ?? null : null} onClose={() => setAberto(null)} />
    </>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────
interface Props {
  /** Se a página já tem título, o componente não repete. */
  semTitulo?: boolean;
  /** Lugar no cabeçalho do Dashboard geral onde os filtros são desenhados (junto dos das outras visões). */
  filtrosEm?: HTMLElement | null;
}

const DashboardParcerias: React.FC<Props> = ({ semTitulo, filtrosEm }) => {
  const [atalhoPeriodo, setAtalhoPeriodo] = useState("este_mes");
  const [periodo, setPeriodo] = useState(periodoEsteMes);
  const [hunterId, setHunterId] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [painel, setPainel] = useState<Painel | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [hunters, setHunters] = useState<DashFiltroItem[]>([]);
  const [empresas, setEmpresas] = useState<DashFiltroItem[]>([]);
  const pedido = useRef(0);

  // Os filtros de hunter/empresa só existem na visão da H&S; a lista falha em silêncio para os outros perfis.
  const ehHS = painel?.visao === "hs";
  useEffect(() => {
    if (!ehHS) return;
    parceriasService.filtrosDashboard()
      .then((f) => { setHunters(f.hunters); setEmpresas(f.empresas); })
      .catch(() => { setHunters([]); setEmpresas([]); });
  }, [ehHS]);

  useEffect(() => {
    const n = ++pedido.current;
    setCarregando(true);
    setErro(null);
    parceriasService
      .painelParcerias({
        de: periodo.de || undefined,
        ate: periodo.ate || undefined,
        hunter_id: hunterId ? Number(hunterId) : undefined,
        partner_id: partnerId ? Number(partnerId) : undefined,
      })
      .then((d) => { if (n === pedido.current) setPainel(d); })
      .catch((e) => { if (n === pedido.current) setErro(mensagemDeErro(e, "Não foi possível carregar o dashboard.")); })
      .finally(() => { if (n === pedido.current) setCarregando(false); });
  }, [periodo, hunterId, partnerId]);

  const opcoesHunter = useMemo(
    () => [{ value: "", label: "Todos os hunters" }, ...hunters.map((h) => ({ value: String(h.id), label: h.nome }))],
    [hunters],
  );
  const opcoesEmpresa = useMemo(
    () => [{ value: "", label: "Todas as empresas" }, ...empresas.map((p) => ({ value: String(p.id), label: p.nome }))],
    [empresas],
  );

  const mudarAtalho = (v: string) => {
    setAtalhoPeriodo(v);
    // "Personalizado" mantém as datas atuais para o usuário ajustar.
    if (ATALHOS[v]) setPeriodo(ATALHOS[v]());
  };

  // Mesmo formato dos controles do Dashboard geral: seletores compactos e "[data] até [data]" no Personalizado.
  const filtros = (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      {ehHS && (
        <>
          <SelectMenu size="sm" value={hunterId} options={opcoesHunter} onChange={setHunterId} icon={<Users size={14} className="text-slate-400" />} className="w-full sm:w-auto" />
          <SelectMenu size="sm" value={partnerId} options={opcoesEmpresa} onChange={setPartnerId} icon={<Handshake size={14} className="text-slate-400" />} className="w-full sm:w-auto" />
        </>
      )}
      <SelectMenu size="sm" value={atalhoPeriodo} options={OPCOES_PERIODO} onChange={mudarAtalho} icon={<Calendar size={14} className="text-slate-400" />} className="w-full sm:w-auto" />
      {atalhoPeriodo === "custom" && (
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <input type="date" className={CAMPO_DATA} value={periodo.de} max={periodo.ate || undefined} onChange={(e) => setPeriodo({ ...periodo, de: e.target.value })} />
          <span className="text-xs text-slate-400">até</span>
          <input type="date" className={CAMPO_DATA} value={periodo.ate} min={periodo.de || undefined} onChange={(e) => setPeriodo({ ...periodo, ate: e.target.value })} />
        </div>
      )}
    </div>
  );

  const tituloEvolucao = painel?.visao === "hunter" ? "Evolução das Vendas (minhas + carteira)" : "Evolução das Vendas · 6 meses";
  const ticket = painel && painel.vendas.quantidade > 0 ? Number(painel.vendas.valor) / painel.vendas.quantidade : null;
  const rotuloPeriodo = atalhoPeriodo === "custom"
    ? `${periodo.de ? dataBR(periodo.de) : "início"} a ${periodo.ate ? dataBR(periodo.ate) : "hoje"}`
    : OPCOES_PERIODO.find((o) => o.value === atalhoPeriodo)?.label ?? "";

  return (
    <>
    {!semTitulo && (
      <PageHeader
        title="Dashboard"
        description="Vendas e comissões do Programa de Parceiros."
        icon={LayoutDashboard}
        actions={filtros}
      />
    )}
    <div className="space-y-6">
      {semTitulo && (filtrosEm ? createPortal(filtros, filtrosEm) : filtros)}

      {erro && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500">
          {erro}{painel ? " (mostrando os dados do filtro anterior)" : ""}
        </div>
      )}

      {!painel && carregando && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-gray-200 bg-white dark:border-slate-700/50 dark:bg-slate-800/50" />
          ))}
        </div>
      )}

      {painel && (
        <div className={`space-y-6 transition-opacity ${carregando || erro ? "opacity-60" : ""}`}>
          {/* ── 1. VISÃO GERAL ─────────────────────────────────────────── */}
          <Secao titulo={`Visão Geral · ${rotuloPeriodo}`}>
            <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${painel.visao === "vendedor" ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
              <KpiCard
                icon={<Sparkles size={18} className="text-cyan-500" />} iconBg="bg-cyan-500/20"
                label="Oportunidades novas" value={painel.resumo.novas} format="number"
                info="Oportunidades cadastradas no período."
              />
              <KpiCard
                icon={<Target size={18} className="text-blue-500" />} iconBg="bg-blue-500/20"
                label="Em negociação" value={painel.resumo.em_negociacao.quantidade} format="number"
                sub={dinheiro(painel.resumo.em_negociacao.valor)}
                info="Oportunidades abertas agora (sem as rejeitadas na elegibilidade), com o valor somado."
              />
              <KpiCard
                icon={<ShoppingCart size={18} className="text-emerald-500" />} iconBg="bg-emerald-500/20"
                label={painel.visao === "hunter" ? "Minhas vendas" : "Vendas no período"} value={painel.vendas.quantidade} format="number"
                info="Oportunidades com ganho confirmado no período (locação não conta)."
              />
              {painel.visao === "hunter" && (
                <KpiCard
                  icon={<Handshake size={18} className="text-amber-500" />} iconBg="bg-amber-500/20"
                  label="Vendas da carteira" value={painel.carteira_vendas.quantidade} format="number"
                  info={`Vendas das empresas que você indicou no período: ${dinheiro(painel.carteira_vendas.valor)}.`}
                />
              )}
              <KpiCard
                icon={<TrendingUp size={18} className="text-blue-500" />} iconBg="bg-blue-500/20"
                label={painel.visao === "hunter" ? "Meu valor vendido" : "Valor vendido"} value={Number(painel.vendas.valor)} format="currency"
                info="Produtos menos o desconto geral, sem frete (a mesma base da comissão)."
              />
              <KpiCard
                icon={<Wallet size={18} className="text-purple-500" />} iconBg="bg-purple-500/20"
                label="Ticket médio" value={ticket} format="currency"
              />
              {painel.visao !== "vendedor" && (
                <>
                  <KpiCard
                    icon={<Clock size={18} />} iconBg="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                    label="Comissões pendentes" value={Number(painel.comissoes.pendente)} format="currency" highlight="yellow"
                    info="Lançamentos de comissão ainda não pagos no período."
                  />
                  <KpiCard
                    icon={<CheckCircle2 size={18} />} iconBg="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                    label="Comissões pagas" value={Number(painel.comissoes.pago)} format="currency" highlight="green"
                    info="Lançamentos de comissão já pagos no período."
                  />
                </>
              )}
            </div>
          </Secao>

          {/* ── 2. EVOLUÇÃO E PIPELINE ─────────────────────────────────── */}
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <GraficoEvolucao evolucao={painel.evolucao} titulo={tituloEvolucao} />
            <GraficoPipeline pipeline={painel.pipeline} />
          </section>

          {/* ── 3. CONVERSÃO ───────────────────────────────────────────── */}
          <Secao titulo={`Conversão · ${rotuloPeriodo}`}>
            <Conversao conversao={painel.conversao} />
          </Secao>

          {/* ── 4. RISCOS ──────────────────────────────────────────────── */}
          <Secao titulo="Atenção · Riscos" risco>
            <Riscos riscos={painel.riscos} />
          </Secao>

          {painel.visao === "hunter" && (
            <>
              <Bloco titulo="Minha carteira" icone={<Handshake size={16} className="text-blue-500" />}>
                {painel.carteira.length === 0 ? (
                  <Vazio texto="Você ainda não indicou nenhuma empresa." />
                ) : (
                  <TabelaPaginada itens={painel.carteira} rotulo="empresas" colunas={[
                    { rotulo: "Empresa" }, { rotulo: "Situação" }, { rotulo: "Vendas", direita: true }, { rotulo: "Valor", direita: true },
                    { rotulo: "Última venda" }, { rotulo: "Atividade" }, { rotulo: "Prazo da indicação" },
                  ]} linha={(c) => (
                      <tr key={c.partner_id}>
                        <td className={`${celula} font-medium`}>{c.nome}</td>
                        <td className={celula}>{rotuloSituacao(c.situacao)}</td>
                        <td className={celulaNum}>{c.quantidade}</td>
                        <td className={celulaNum}>{dinheiro(c.valor)}</td>
                        <td className={`${celula} whitespace-nowrap`}>{c.ultima_venda_em ? dia(c.ultima_venda_em) : "—"}</td>
                        <td className={celula}><Parada item={c} /></td>
                        <td className={`${celula} whitespace-nowrap`}>{c.prazo_indicacao_ate ? dia(c.prazo_indicacao_ate) : "—"}</td>
                      </tr>
                  )} />
                )}
              </Bloco>
              <ComissoesPorTipo comissoes={painel.comissoes} link />
            </>
          )}

          {painel.visao === "empresa" && (
            <>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Bloco titulo="Vendas por vendedor" icone={<Users size={16} className="text-blue-500" />}>
                  {painel.por_vendedor.length === 0 ? (
                    <Vazio texto="Nenhuma venda no período." />
                  ) : (
                    <TabelaPaginada itens={painel.por_vendedor} rotulo="vendedores" colunas={[{ rotulo: "Vendedor" }, { rotulo: "Vendas", direita: true }, { rotulo: "Valor", direita: true }]} linha={(v, n) => (
                        <tr key={v.membro_id ?? `sem-${n}`}>
                          <td className={`${celula} font-medium`}>{v.nome}</td>
                          <td className={celulaNum}>{v.quantidade}</td>
                          <td className={celulaNum}>{dinheiro(v.valor)}</td>
                        </tr>
                    )} />
                  )}
                </Bloco>
                <Bloco titulo="Unidades indicadas" icone={<Handshake size={16} className="text-purple-500" />}>
                  {painel.unidades.length === 0 ? (
                    <Vazio texto="Você ainda não indicou nenhuma unidade." />
                  ) : (
                    <TabelaPaginada itens={painel.unidades} rotulo="unidades" colunas={[{ rotulo: "Unidade" }, { rotulo: "Situação" }, { rotulo: "Vendas", direita: true }, { rotulo: "Valor", direita: true }, { rotulo: "Atividade" }]} linha={(u) => (
                        <tr key={u.partner_id}>
                          <td className={`${celula} font-medium`}>{u.nome}</td>
                          <td className={celula}>{rotuloSituacao(u.situacao)}</td>
                          <td className={celulaNum}>{u.quantidade}</td>
                          <td className={celulaNum}>{dinheiro(u.valor)}</td>
                          <td className={celula}><Parada item={u} /></td>
                        </tr>
                    )} />
                  )}
                </Bloco>
              </div>
              <ComissoesPorTipo comissoes={painel.comissoes} link />
            </>
          )}

          {painel.visao === "hs" && (
            <>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Bloco titulo="Ranking de empresas" icone={<Handshake size={16} className="text-blue-500" />}>
                  {painel.ranking_empresas.length === 0 ? (
                    <Vazio texto="Nenhuma venda de empresa no período." />
                  ) : (
                    <TabelaPaginada itens={painel.ranking_empresas} rotulo="empresas" colunas={[{ rotulo: "#" }, { rotulo: "Empresa" }, { rotulo: "Vendas", direita: true }, { rotulo: "Valor", direita: true }]} linha={(r, n) => (
                        <tr key={r.partner_id}>
                          <td className={`${celula} text-slate-400`}>{n}</td>
                          <td className={`${celula} font-medium`}>{r.nome}</td>
                          <td className={celulaNum}>{r.quantidade}</td>
                          <td className={celulaNum}>{dinheiro(r.valor)}</td>
                        </tr>
                    )} />
                  )}
                </Bloco>
                <Bloco titulo="Ranking de hunters" icone={<Users size={16} className="text-purple-500" />}>
                  {painel.ranking_hunters.length === 0 ? (
                    <Vazio texto="Nenhuma venda de hunter no período." />
                  ) : (
                    <TabelaPaginada itens={painel.ranking_hunters} rotulo="hunters" colunas={[{ rotulo: "#" }, { rotulo: "Hunter" }, { rotulo: "Empresas", direita: true }, { rotulo: "Vendas", direita: true }, { rotulo: "Valor", direita: true }]} linha={(r, n) => (
                        <tr key={r.partner_id}>
                          <td className={`${celula} text-slate-400`}>{n}</td>
                          <td className={`${celula} font-medium`}>{r.nome}</td>
                          <td className={celulaNum}>{r.empresas}</td>
                          <td className={celulaNum}>{r.quantidade}</td>
                          <td className={celulaNum}>{dinheiro(r.valor)}</td>
                        </tr>
                    )} />
                  )}
                </Bloco>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Bloco titulo="Empresas paradas" icone={<Hourglass size={16} className="text-amber-500" />}>
                {painel.paradas.length === 0 ? (
                  <Vazio texto="Nenhuma empresa parada. Todas as empresas ativadas têm movimento recente." />
                ) : (
                  <TabelaPaginada itens={painel.paradas} rotulo="empresas" colunas={[{ rotulo: "Empresa" }, { rotulo: "Última venda" }, { rotulo: "Última atividade" }, { rotulo: "Situação" }]} linha={(p) => (
                      <tr key={p.partner_id}>
                        <td className={`${celula} font-medium`}>{p.nome}</td>
                        <td className={`${celula} whitespace-nowrap`}>{p.ultima_venda_em ? dia(p.ultima_venda_em) : "—"}</td>
                        <td className={`${celula} whitespace-nowrap`}>{p.ultima_atividade_em ? dia(p.ultima_atividade_em) : "—"}</td>
                        <td className={celula}><Parada item={p} /></td>
                      </tr>
                  )} />
                )}
              </Bloco>
              <ComissoesPorTipo comissoes={painel.comissoes} link />
              </div>
            </>
          )}
        </div>
      )}
    </div>
    </>
  );
};

export default DashboardParcerias;
