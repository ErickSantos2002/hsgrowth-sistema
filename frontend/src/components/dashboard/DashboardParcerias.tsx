import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Calendar, Handshake, Hourglass, ShoppingCart, TrendingUp, Users, Wallet } from "lucide-react";
import { Input, SelectMenu } from "../common";
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
  type DashMes,
  type Hunter,
  type Parceiro,
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

function ComissoesResumo({ comissoes, link }: { comissoes: DashComissoes; link?: boolean }) {
  const tipos = Object.entries(comissoes.por_tipo);
  return (
    <Bloco
      titulo="Comissões"
      icone={<Wallet size={16} className="text-emerald-500" />}
      acao={link ? <Link to="/parcerias/comissoes" className="text-xs font-medium text-blue-500 hover:underline">Ver comissões</Link> : undefined}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg bg-amber-500/10 p-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">Pendente (a pagar)</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white">{dinheiro(comissoes.pendente)}</p>
        </div>
        <div className="rounded-lg bg-emerald-500/10 p-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">Pago</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white">{dinheiro(comissoes.pago)}</p>
        </div>
      </div>
      {tipos.length > 0 && (
        <div className="mt-4">
          <Tabela colunas={[{ rotulo: "Tipo" }, { rotulo: "Pendente", direita: true }, { rotulo: "Pago", direita: true }]}>
            {tipos.map(([tipo, v]) => (
              <tr key={tipo}>
                <td className={celula}>{COMISSAO_TIPO_LABEL[tipo] ?? tipo}</td>
                <td className={celulaNum}>{dinheiro(v.pendente)}</td>
                <td className={celulaNum}>{dinheiro(v.pago)}</td>
              </tr>
            ))}
          </Tabela>
        </div>
      )}
    </Bloco>
  );
}

function GraficoMensal({ serie }: { serie: DashMes[] }) {
  const { darkMode } = useTheme();
  const cores = getChartColors(darkMode);
  const dados = serie.map((m) => ({ nome: rotuloMes(m.mes), valor: Number(m.valor), quantidade: m.quantidade }));
  const texto = darkMode ? "#ffffff" : "#0f172a";
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={dados} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={cores.border.default} vertical={false} />
        <XAxis dataKey="nome" tick={{ fill: cores.content.secondary, fontSize: 11 }} tickLine={false} />
        <YAxis
          tick={{ fill: cores.content.secondary, fontSize: 11 }} tickLine={false} axisLine={false} width={70}
          tickFormatter={(v: number) => v.toLocaleString("pt-BR", { notation: "compact" })}
        />
        <Tooltip
          contentStyle={{ backgroundColor: cores.surface.elevated, border: `1px solid ${cores.border.default}`, borderRadius: 8, fontSize: 12, color: texto }}
          labelStyle={{ color: texto }}
          itemStyle={{ color: texto }}
          formatter={(v, _n, item) => [`${dinheiro(Number(v))} (${plural(item.payload.quantidade, "venda", "vendas")})`, "Valor vendido"]}
        />
        <Bar dataKey="valor" fill="#10b981" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────
interface Props {
  /** Se a página já tem título, o componente não repete. */
  semTitulo?: boolean;
}

const DashboardParcerias: React.FC<Props> = ({ semTitulo }) => {
  const [periodo, setPeriodo] = useState(periodoEsteMes);
  const [hunterId, setHunterId] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [painel, setPainel] = useState<Painel | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [hunters, setHunters] = useState<Hunter[]>([]);
  const [empresas, setEmpresas] = useState<Parceiro[]>([]);
  const pedido = useRef(0);

  // Os filtros de hunter/empresa só existem na visão da H&S; a lista falha em silêncio para os outros perfis.
  const ehHS = painel?.visao === "hs";
  useEffect(() => {
    if (!ehHS) return;
    parceriasService.listarHunters().then(setHunters).catch(() => setHunters([]));
    parceriasService.listarParceiros()
      .then((l) => setEmpresas(l.filter((p) => p.kind !== "hunter")))
      .catch(() => setEmpresas([]));
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
    () => [{ value: "", label: "Todos os hunters" }, ...hunters.map((h) => ({ value: String(h.id), label: h.name }))],
    [hunters],
  );
  const opcoesEmpresa = useMemo(
    () => [{ value: "", label: "Todas as empresas" }, ...empresas.map((p) => ({ value: String(p.id), label: p.name }))],
    [empresas],
  );

  const atalho = (rotulo: string, p: { de: string; ate: string }) => (
    <button
      key={rotulo}
      type="button"
      onClick={() => setPeriodo(p)}
      className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
        periodo.de === p.de && periodo.ate === p.ate
          ? "border-emerald-500/40 bg-emerald-500/10 font-medium text-emerald-600 dark:text-emerald-400"
          : "border-gray-200 bg-white text-slate-600 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
      }`}
    >
      {rotulo}
    </button>
  );

  const filtros = (
    <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
      <div className="flex flex-wrap gap-2">
        {atalho("Este mês", periodoEsteMes())}
        {atalho("Mês passado", periodoMesPassado())}
        {atalho("Últimos 12 meses", periodoUltimos12())}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Calendar size={14} className="text-slate-400" />
        <label className="flex items-center gap-2 text-sm text-slate-500 dark:text-gray-400">
          De <Input type="date" fullWidth={false} value={periodo.de} max={periodo.ate || undefined} onChange={(e) => setPeriodo({ ...periodo, de: e.target.value })} />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-500 dark:text-gray-400">
          até <Input type="date" fullWidth={false} value={periodo.ate} min={periodo.de || undefined} onChange={(e) => setPeriodo({ ...periodo, ate: e.target.value })} />
        </label>
      </div>
      {ehHS && (
        <>
          <SelectMenu value={hunterId} options={opcoesHunter} onChange={setHunterId} icon={<Users size={14} className="text-slate-400" />} className="w-full sm:w-auto" />
          <SelectMenu value={partnerId} options={opcoesEmpresa} onChange={setPartnerId} icon={<Handshake size={14} className="text-slate-400" />} className="w-full sm:w-auto" />
        </>
      )}
    </div>
  );

  const semVendas = painel != null && painel.vendas.quantidade === 0;
  const ticket = painel && painel.vendas.quantidade > 0 ? Number(painel.vendas.valor) / painel.vendas.quantidade : null;

  return (
    <div className="space-y-6">
      {!semTitulo && (
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
          <Handshake size={20} /> Dashboard de Parcerias
        </h2>
      )}
      {filtros}

      {erro && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500">{erro}</div>
      )}

      {!painel && carregando && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-gray-200 bg-white dark:border-slate-700/50 dark:bg-slate-800/50" />
          ))}
        </div>
      )}

      {painel && (
        <div className={`space-y-6 transition-opacity ${carregando ? "opacity-60" : ""}`}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiCard
              icon={<ShoppingCart size={18} className="text-emerald-500" />} iconBg="bg-emerald-500/20"
              label="Vendas no período" value={painel.vendas.quantidade} format="number"
              info="Oportunidades com ganho confirmado no período (locação não conta)."
            />
            <KpiCard
              icon={<TrendingUp size={18} className="text-blue-500" />} iconBg="bg-blue-500/20"
              label="Valor vendido" value={Number(painel.vendas.valor)} format="currency"
              info="Produtos menos o desconto geral, sem frete (a mesma base da comissão)."
            />
            <KpiCard
              icon={<Wallet size={18} className="text-purple-500" />} iconBg="bg-purple-500/20"
              label="Ticket médio" value={ticket} format="currency"
            />
          </div>

          {semVendas ? (
            <Bloco titulo="Valor vendido por mês" icone={<TrendingUp size={16} className="text-emerald-500" />}>
              <Vazio texto="Nenhuma venda confirmada neste período. Ajuste as datas para ver mais resultados." />
            </Bloco>
          ) : (
            <Bloco titulo="Valor vendido por mês" icone={<TrendingUp size={16} className="text-emerald-500" />}>
              <GraficoMensal serie={painel.serie} />
            </Bloco>
          )}

          {painel.visao === "hunter" && (
            <>
              <Bloco titulo="Minha carteira" icone={<Handshake size={16} className="text-blue-500" />}>
                {painel.carteira.length === 0 ? (
                  <Vazio texto="Você ainda não indicou nenhuma empresa." />
                ) : (
                  <Tabela colunas={[
                    { rotulo: "Empresa" }, { rotulo: "Situação" }, { rotulo: "Vendas", direita: true }, { rotulo: "Valor", direita: true },
                    { rotulo: "Última venda" }, { rotulo: "Atividade" }, { rotulo: "Prazo da indicação" },
                  ]}>
                    {painel.carteira.map((c) => (
                      <tr key={c.partner_id}>
                        <td className={`${celula} font-medium`}>{c.nome}</td>
                        <td className={celula}>{rotuloSituacao(c.situacao)}</td>
                        <td className={celulaNum}>{c.quantidade}</td>
                        <td className={celulaNum}>{dinheiro(c.valor)}</td>
                        <td className={`${celula} whitespace-nowrap`}>{c.ultima_venda_em ? dia(c.ultima_venda_em) : "—"}</td>
                        <td className={celula}><Parada item={c} /></td>
                        <td className={`${celula} whitespace-nowrap`}>{c.prazo_indicacao_ate ? dia(c.prazo_indicacao_ate) : "—"}</td>
                      </tr>
                    ))}
                  </Tabela>
                )}
              </Bloco>
              <ComissoesResumo comissoes={painel.comissoes} link />
            </>
          )}

          {painel.visao === "empresa" && (
            <>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Bloco titulo="Vendas por vendedor" icone={<Users size={16} className="text-blue-500" />}>
                  {painel.por_vendedor.length === 0 ? (
                    <Vazio texto="Nenhuma venda no período." />
                  ) : (
                    <Tabela colunas={[{ rotulo: "Vendedor" }, { rotulo: "Vendas", direita: true }, { rotulo: "Valor", direita: true }]}>
                      {painel.por_vendedor.map((v, i) => (
                        <tr key={v.membro_id ?? `sem-${i}`}>
                          <td className={`${celula} font-medium`}>{v.nome}</td>
                          <td className={celulaNum}>{v.quantidade}</td>
                          <td className={celulaNum}>{dinheiro(v.valor)}</td>
                        </tr>
                      ))}
                    </Tabela>
                  )}
                </Bloco>
                <Bloco titulo="Unidades indicadas" icone={<Handshake size={16} className="text-purple-500" />}>
                  {painel.unidades.length === 0 ? (
                    <Vazio texto="Você ainda não indicou nenhuma unidade." />
                  ) : (
                    <Tabela colunas={[{ rotulo: "Unidade" }, { rotulo: "Situação" }, { rotulo: "Vendas", direita: true }, { rotulo: "Valor", direita: true }, { rotulo: "Atividade" }]}>
                      {painel.unidades.map((u) => (
                        <tr key={u.partner_id}>
                          <td className={`${celula} font-medium`}>{u.nome}</td>
                          <td className={celula}>{rotuloSituacao(u.situacao)}</td>
                          <td className={celulaNum}>{u.quantidade}</td>
                          <td className={celulaNum}>{dinheiro(u.valor)}</td>
                          <td className={celula}><Parada item={u} /></td>
                        </tr>
                      ))}
                    </Tabela>
                  )}
                </Bloco>
              </div>
              <ComissoesResumo comissoes={painel.comissoes} link />
            </>
          )}

          {painel.visao === "hs" && (
            <>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Bloco titulo="Ranking de empresas" icone={<Handshake size={16} className="text-blue-500" />}>
                  {painel.ranking_empresas.length === 0 ? (
                    <Vazio texto="Nenhuma venda de empresa no período." />
                  ) : (
                    <Tabela colunas={[{ rotulo: "#" }, { rotulo: "Empresa" }, { rotulo: "Vendas", direita: true }, { rotulo: "Valor", direita: true }]}>
                      {painel.ranking_empresas.map((r, i) => (
                        <tr key={r.partner_id}>
                          <td className={`${celula} text-slate-400`}>{i + 1}</td>
                          <td className={`${celula} font-medium`}>{r.nome}</td>
                          <td className={celulaNum}>{r.quantidade}</td>
                          <td className={celulaNum}>{dinheiro(r.valor)}</td>
                        </tr>
                      ))}
                    </Tabela>
                  )}
                </Bloco>
                <Bloco titulo="Ranking de hunters" icone={<Users size={16} className="text-purple-500" />}>
                  {painel.ranking_hunters.length === 0 ? (
                    <Vazio texto="Nenhuma venda de hunter no período." />
                  ) : (
                    <Tabela colunas={[{ rotulo: "#" }, { rotulo: "Hunter" }, { rotulo: "Empresas", direita: true }, { rotulo: "Vendas", direita: true }, { rotulo: "Valor", direita: true }]}>
                      {painel.ranking_hunters.map((r, i) => (
                        <tr key={r.partner_id}>
                          <td className={`${celula} text-slate-400`}>{i + 1}</td>
                          <td className={`${celula} font-medium`}>{r.nome}</td>
                          <td className={celulaNum}>{r.empresas}</td>
                          <td className={celulaNum}>{r.quantidade}</td>
                          <td className={celulaNum}>{dinheiro(r.valor)}</td>
                        </tr>
                      ))}
                    </Tabela>
                  )}
                </Bloco>
              </div>

              <Bloco titulo="Empresas paradas" icone={<Hourglass size={16} className="text-amber-500" />}>
                {painel.paradas.length === 0 ? (
                  <Vazio texto="Nenhuma empresa parada. Todas as empresas ativadas têm movimento recente." />
                ) : (
                  <Tabela colunas={[{ rotulo: "Empresa" }, { rotulo: "Última venda" }, { rotulo: "Última atividade" }, { rotulo: "Situação" }]}>
                    {painel.paradas.map((p) => (
                      <tr key={p.partner_id}>
                        <td className={`${celula} font-medium`}>{p.nome}</td>
                        <td className={`${celula} whitespace-nowrap`}>{p.ultima_venda_em ? dia(p.ultima_venda_em) : "—"}</td>
                        <td className={`${celula} whitespace-nowrap`}>{p.ultima_atividade_em ? dia(p.ultima_atividade_em) : "—"}</td>
                        <td className={celula}><Parada item={p} /></td>
                      </tr>
                    ))}
                  </Tabela>
                )}
              </Bloco>

              <ComissoesResumo comissoes={painel.comissoes} link />
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default DashboardParcerias;
