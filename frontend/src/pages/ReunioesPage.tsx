import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Filter, Video } from "lucide-react";

import reunioesService, {
  FiltrosDeReunioes,
  RespostaDeReunioes,
} from "../services/reunioesService";
import { EmptyState, LoadingSpinner, Pagination, SelectMenu } from "../components/common";
import ReunioesKpis from "../components/reunioes/ReunioesKpis";
import QuadroPorPessoa, { VisaoDoQuadro } from "../components/reunioes/QuadroPorPessoa";
import { OPCOES_DE_PERIODO, Periodo, datasDoPeriodo } from "../utils/periodo";
import { useAuth } from "../hooks/useAuth";

const TAMANHO_DA_PAGINA = 20;

const ESTADOS = [
  { value: "", label: "Todas as reuniões" },
  { value: "avaliadas", label: "Avaliadas" },
  { value: "nao_avaliadas", label: "Não avaliadas" },
  { value: "sem_gravacao", label: "Sem gravação" },
];

const PERIODO_PADRAO: Periodo = "month";

const estiloDoSelo = (selo: string) => {
  if (selo === "avaliada")
    return "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400";
  if (selo === "gravada")
    return "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400";
  if (selo === "no-show")
    return "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400";
  return "border-gray-300 bg-gray-100 text-slate-500 dark:border-slate-600 dark:bg-slate-700/40 dark:text-slate-400";
};

const cabecalho =
  "px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300";

const campo =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white";

const rotulo = "mb-2 block text-xs font-medium text-slate-500 dark:text-slate-400";

/**
 * Todas as reuniões do time, com a avaliação de cada uma.
 *
 * Mostra também as que ninguém gravou ou avaliou: é o que o gestor precisa
 * ver para saber onde o processo está furando, e não só a média de quem já
 * usa a ferramenta.
 */
const ReunioesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dados, setDados] = useState<RespostaDeReunioes | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [periodo, setPeriodo] = useState<Periodo>(PERIODO_PADRAO);
  const [inicioPersonalizado, setInicioPersonalizado] = useState("");
  const [fimPersonalizado, setFimPersonalizado] = useState("");
  const [estado, setEstado] = useState("");
  const [vendedor, setVendedor] = useState("");
  const [sdr, setSdr] = useState("");
  const [tipoReuniao, setTipoReuniao] = useState("");
  const [canal, setCanal] = useState("");
  const [visaoDoQuadro, setVisaoDoQuadro] = useState<VisaoDoQuadro>("vendedor");
  const [pagina, setPagina] = useState(1);

  const carregar = useCallback(async () => {
    // Personalizado sem as duas datas ainda não é um filtro: esperar
    if (periodo === "custom" && (!inicioPersonalizado || !fimPersonalizado)) return;

    setCarregando(true);
    setErro(null);
    try {
      setDados(
        await reunioesService.listar({
          page: pagina,
          page_size: TAMANHO_DA_PAGINA,
          ...datasDoPeriodo(periodo, inicioPersonalizado, fimPersonalizado),
          estado: (estado || undefined) as FiltrosDeReunioes["estado"],
          vendedor: vendedor || undefined,
          sdr: sdr || undefined,
          tipo_reuniao: tipoReuniao || undefined,
          canal: canal || undefined,
        })
      );
    } catch {
      setErro("Não foi possível carregar as reuniões.");
    } finally {
      setCarregando(false);
    }
  }, [
    pagina, periodo, inicioPersonalizado, fimPersonalizado, estado, vendedor, sdr, tipoReuniao,
    canal,
  ]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Trocar um filtro volta para a primeira página: manter a página 3 ao mudar
  // o período mostraria uma lista vazia sem explicar por quê.
  const aoFiltrar = (aplicar: () => void) => {
    setPagina(1);
    aplicar();
  };

  const filtrosAtivos = [
    vendedor,
    sdr,
    tipoReuniao,
    canal,
    estado,
    periodo !== PERIODO_PADRAO ? periodo : "",
  ].filter(Boolean).length;

  const totalPaginas = dados?.total_pages ?? 1;
  const total = dados?.total ?? 0;

  const paginacao = {
    currentPage: pagina,
    totalPages: totalPaginas,
    totalItems: total,
    startIndex: (pagina - 1) * TAMANHO_DA_PAGINA,
    endIndex: Math.min(pagina * TAMANHO_DA_PAGINA, total),
    hasNextPage: pagina < totalPaginas,
    hasPrevPage: pagina > 1,
    goToPage: setPagina,
    goToNextPage: () => setPagina((p) => Math.min(totalPaginas, p + 1)),
    goToPrevPage: () => setPagina((p) => Math.max(1, p - 1)),
  };

  // Quem é gestor vem do papel, não do conteúdo da resposta: desde 24/09 as
  // listas de vendedores, SDRs e canais vão para todo mundo, e inferir o papel
  // a partir delas passaria a dar "gestor" para o time inteiro.
  const ehGestor = user?.role === "admin" || user?.role === "manager";

  return (
    <div className="p-6">
      {/* Cabeçalho */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400">
            <Video size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reuniões</h1>
            {!carregando && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {total} {total === 1 ? "reunião no período" : "reuniões no período"}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={() => setMostrarFiltros((v) => !v)}
          className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors ${
            mostrarFiltros || filtrosAtivos > 0
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-gray-300 bg-white text-slate-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          }`}
        >
          <Filter size={15} />
          Filtros
          {filtrosAtivos > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-emerald-600">
              {filtrosAtivos}
            </span>
          )}
        </button>
      </div>

      {/* Painel de filtros */}
      {mostrarFiltros && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
          <div className="flex flex-wrap gap-4">
            {/* Vendedor, SDR e canal saem das reuniões que a pessoa já vê, e
                por isso valem para o time também: o SDR filtra por vendedor, o
                vendedor filtra por SDR. Some quando só há um nome na lista —
                aí o seletor não recortaria nada. */}
            {(ehGestor || (dados?.vendedores?.length ?? 0) > 1) && (
              <div className="min-w-[170px] flex-1">
                <label className={rotulo}>Vendedor</label>
                <SelectMenu
                  size="sm"
                  value={vendedor}
                  options={[
                    { value: "", label: "Todos os vendedores" },
                    { value: "sem", label: "Sem vendedor" },
                    ...(dados?.vendedores ?? []).map((v) => ({
                      value: String(v.id),
                      label: v.nome,
                    })),
                  ]}
                  onChange={(valor) => aoFiltrar(() => setVendedor(valor))}
                />
              </div>
            )}

            {(ehGestor || (dados?.sdrs?.length ?? 0) > 1) && (
              <div className="min-w-[170px] flex-1">
                <label className={rotulo}>SDR</label>
                <SelectMenu
                  size="sm"
                  value={sdr}
                  options={[
                    { value: "", label: "Todos os SDRs" },
                    { value: "sem", label: "Sem SDR" },
                    ...(dados?.sdrs ?? []).map((s) => ({
                      value: String(s.id),
                      label: s.nome,
                    })),
                  ]}
                  onChange={(valor) => aoFiltrar(() => setSdr(valor))}
                />
              </div>
            )}

            {/* De onde veio o negócio: liga a reunião ao marketing — quais
                canais trazem conversa que anda. */}
            {(ehGestor || (dados?.canais?.length ?? 0) > 1) && (
              <div className="min-w-[170px] flex-1">
                <label className={rotulo}>Canal de aquisição</label>
                <SelectMenu
                  size="sm"
                  value={canal}
                  options={[
                    { value: "", label: "Todos os canais" },
                    { value: "sem", label: "Sem canal" },
                    ...(dados?.canais ?? []).map((c) => ({ value: c, label: c })),
                  ]}
                  onChange={(valor) => aoFiltrar(() => setCanal(valor))}
                />
              </div>
            )}

            <div className="min-w-[170px] flex-1">
              <label className={rotulo}>Tipo de reunião</label>
              <SelectMenu
                size="sm"
                value={tipoReuniao}
                options={[
                  { value: "", label: "Todos os tipos" },
                  { value: "sem", label: "Sem tipo" },
                  ...(dados?.tipos_de_reuniao ?? []).map((t) => ({
                    value: t.id,
                    label: t.rotulo,
                  })),
                ]}
                onChange={(valor) => aoFiltrar(() => setTipoReuniao(valor))}
              />
            </div>

            <div className="min-w-[170px] flex-1">
              <label className={rotulo}>Estado</label>
              <SelectMenu
                size="sm"
                value={estado}
                options={ESTADOS}
                onChange={(valor) => aoFiltrar(() => setEstado(valor))}
              />
            </div>

            <div className="min-w-[170px] flex-1">
              <label className={rotulo}>Período</label>
              <SelectMenu
                size="sm"
                value={periodo}
                options={OPCOES_DE_PERIODO}
                onChange={(valor) => aoFiltrar(() => setPeriodo(valor as Periodo))}
              />
            </div>

            {periodo === "custom" && (
              <div className="flex min-w-[260px] flex-1 items-end gap-2">
                <div className="flex-1">
                  <label className={rotulo}>De</label>
                  <input
                    type="date"
                    value={inicioPersonalizado}
                    max={fimPersonalizado || undefined}
                    onChange={(e) => aoFiltrar(() => setInicioPersonalizado(e.target.value))}
                    className={campo}
                  />
                </div>
                <div className="flex-1">
                  <label className={rotulo}>Até</label>
                  <input
                    type="date"
                    value={fimPersonalizado}
                    min={inicioPersonalizado || undefined}
                    onChange={(e) => aoFiltrar(() => setFimPersonalizado(e.target.value))}
                    className={campo}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {erro && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
          {erro}
        </div>
      )}

      {dados && !carregando && (
        <div className="mb-6">
          <ReunioesKpis dados={dados} />
        </div>
      )}

      {dados && !carregando && dados.por_vendedor.length > 0 && (
        <div className="mb-6">
          <QuadroPorPessoa
            porVendedor={dados.por_vendedor}
            porSdr={dados.por_sdr}
            visao={visaoDoQuadro}
            onMudarVisao={setVisaoDoQuadro}
          />
        </div>
      )}

      {/* Lista */}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-slate-700/50 dark:bg-slate-800/30">
        {carregando ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" label="Carregando reuniões..." />
          </div>
        ) : !dados || dados.items.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={Video}
              title="Nenhuma reunião no período"
              description="Ajuste os filtros ou agende uma reunião pelo card do negócio."
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800/50">
                    <th className={cabecalho}>Data</th>
                    <th className={cabecalho}>Cliente</th>
                    <th className={cabecalho}>Vendedor</th>
                    <th className={cabecalho}>SDR</th>
                    <th className={cabecalho}>Onde</th>
                    <th className={cabecalho}>Tipo</th>
                    <th className={cabecalho}>Canal</th>
                    <th className={cabecalho}>Duração</th>
                    <th className={cabecalho}>Avaliada</th>
                    <th className={cabecalho}>Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700/50">
                  {dados.items.map((r) => (
                    <tr
                      key={r.task_id}
                      onClick={() => navigate(`/cards/${r.card_id}`)}
                      className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-300">
                        {r.quando ? new Date(r.quando).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td className="px-6 py-3 text-sm font-medium text-slate-900 dark:text-white">
                        {r.cliente || "—"}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-300">
                        {r.vendedor || "—"}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-500 dark:text-slate-400">
                        {r.sdr || "—"}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-500 dark:text-slate-400">
                        {r.tipo}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-500 dark:text-slate-400">
                        {r.tipo_reuniao_rotulo || "—"}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-500 dark:text-slate-400">
                        {r.canal || "—"}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-500 dark:text-slate-400">
                        {r.duracao_minutos ? `${r.duracao_minutos} min` : "—"}
                      </td>
                      <td className="px-6 py-3 text-sm">
                        <span
                          className={
                            r.avaliada
                              ? "font-medium text-emerald-600 dark:text-emerald-400"
                              : "text-slate-400 dark:text-slate-500"
                          }
                        >
                          {r.avaliada ? "Sim" : "Não"}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-block rounded-lg border px-2 py-0.5 text-xs font-medium ${estiloDoSelo(
                            r.selo
                          )}`}
                        >
                          {r.selo === "avaliada" && r.score !== null
                            ? `${r.score} · ${r.veredito}`
                            : r.selo}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination {...paginacao} itemLabel="reuniões" />
          </>
        )}
      </div>
    </div>
  );
};

export default ReunioesPage;
