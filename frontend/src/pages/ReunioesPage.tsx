import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Filter, UserCheck, Users, Video } from "lucide-react";

import reunioesService, {
  FiltrosDeReunioes,
  RespostaDeReunioes,
} from "../services/reunioesService";
import { EmptyState, LoadingSpinner, Pagination, SelectMenu } from "../components/common";
import ReunioesKpis from "../components/reunioes/ReunioesKpis";
import QuadroPorVendedor from "../components/reunioes/QuadroPorVendedor";
import { OPCOES_DE_PERIODO, Periodo, datasDoPeriodo } from "../utils/periodo";

const TAMANHO_DA_PAGINA = 20;

const ESTADOS: { value: string; label: string }[] = [
  { value: "", label: "Todas as reuniões" },
  { value: "avaliadas", label: "Avaliadas" },
  { value: "nao_avaliadas", label: "Não avaliadas" },
  { value: "sem_gravacao", label: "Sem gravação" },
];

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

/**
 * Todas as reuniões do time, com a avaliação de cada uma.
 *
 * Mostra também as que ninguém gravou ou avaliou: é o que o gestor precisa
 * ver para saber onde o processo está furando, e não só a média de quem já
 * usa a ferramenta.
 */
const ReunioesPage: React.FC = () => {
  const navigate = useNavigate();

  const [dados, setDados] = useState<RespostaDeReunioes | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [periodo, setPeriodo] = useState<Periodo>("month");
  const [inicioPersonalizado, setInicioPersonalizado] = useState("");
  const [fimPersonalizado, setFimPersonalizado] = useState("");
  const [estado, setEstado] = useState("");
  const [vendedorId, setVendedorId] = useState("");
  const [sdrId, setSdrId] = useState("");
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
          vendedor_id: vendedorId ? Number(vendedorId) : undefined,
          sdr_id: sdrId ? Number(sdrId) : undefined,
        })
      );
    } catch {
      setErro("Não foi possível carregar as reuniões.");
    } finally {
      setCarregando(false);
    }
  }, [pagina, periodo, inicioPersonalizado, fimPersonalizado, estado, vendedorId, sdrId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Trocar um filtro volta para a primeira página: manter a página 3 ao mudar
  // o período mostraria uma lista vazia sem explicar por quê.
  const aoFiltrar = (aplicar: () => void) => {
    setPagina(1);
    aplicar();
  };

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

  return (
    <div className="p-6">
      {/* Cabeçalho */}
      <div className="mb-6 flex items-center gap-3">
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

      {/* Filtros */}
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <SelectMenu
          value={periodo}
          options={OPCOES_DE_PERIODO}
          onChange={(v) => aoFiltrar(() => setPeriodo(v as Periodo))}
          icon={<Calendar size={14} className="text-slate-400" />}
          size="sm"
          className="w-full sm:w-auto"
        />

        {periodo === "custom" && (
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <input
              type="date"
              value={inicioPersonalizado}
              max={fimPersonalizado || undefined}
              onChange={(e) => aoFiltrar(() => setInicioPersonalizado(e.target.value))}
              className="h-[38px] rounded-lg border border-gray-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <span className="text-slate-400">–</span>
            <input
              type="date"
              value={fimPersonalizado}
              min={inicioPersonalizado || undefined}
              onChange={(e) => aoFiltrar(() => setFimPersonalizado(e.target.value))}
              className="h-[38px] rounded-lg border border-gray-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        )}

        <SelectMenu
          value={estado}
          options={ESTADOS}
          onChange={(v) => aoFiltrar(() => setEstado(v))}
          icon={<Filter size={14} className="text-slate-400" />}
          size="sm"
          className="w-full sm:w-auto"
        />

        {/* Só o gestor recebe as listas; para o vendedor elas vêm vazias */}
        {dados && dados.vendedores.length > 0 && (
          <SelectMenu
            value={vendedorId}
            options={[
              { value: "", label: "Todos os Vendedores" },
              ...dados.vendedores.map((v) => ({ value: String(v.id), label: v.nome })),
            ]}
            onChange={(v) => aoFiltrar(() => setVendedorId(v))}
            icon={<Users size={14} className="text-slate-400" />}
            size="sm"
            className="w-full sm:w-auto"
          />
        )}

        {dados && dados.sdrs.length > 0 && (
          <SelectMenu
            value={sdrId}
            options={[
              { value: "", label: "Todos os SDRs" },
              ...dados.sdrs.map((s) => ({ value: String(s.id), label: s.nome })),
            ]}
            onChange={(v) => aoFiltrar(() => setSdrId(v))}
            icon={<UserCheck size={14} className="text-slate-400" />}
            size="sm"
            className="w-full sm:w-auto"
          />
        )}
      </div>

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
          <QuadroPorVendedor linhas={dados.por_vendedor} />
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
                    <th className={cabecalho}>Duração</th>
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
                        {r.duracao_minutos ? `${r.duracao_minutos} min` : "—"}
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
