import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Video } from "lucide-react";

import reunioesService, {
  FiltrosDeReunioes,
  RespostaDeReunioes,
} from "../services/reunioesService";
import ReunioesKpis from "../components/reunioes/ReunioesKpis";
import QuadroPorVendedor from "../components/reunioes/QuadroPorVendedor";

const PERIODOS: { rotulo: string; dias: number | null }[] = [
  { rotulo: "7 dias", dias: 7 },
  { rotulo: "30 dias", dias: 30 },
  { rotulo: "90 dias", dias: 90 },
  { rotulo: "Tudo", dias: null },
];

const ESTADOS: { rotulo: string; valor: FiltrosDeReunioes["estado"] }[] = [
  { rotulo: "Todas", valor: undefined },
  { rotulo: "Avaliadas", valor: "avaliadas" },
  { rotulo: "Não avaliadas", valor: "nao_avaliadas" },
  { rotulo: "Sem gravação", valor: "sem_gravacao" },
];

const corDoSelo = (selo: string) => {
  if (selo === "avaliada") return "border-purple-500/40 text-purple-300";
  if (selo === "gravada") return "border-sky-500/40 text-sky-300";
  if (selo === "no-show") return "border-orange-500/40 text-orange-300";
  return "border-slate-600/50 text-slate-400";
};

const desde = (dias: number | null) => {
  if (dias === null) return undefined;
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
};

/**
 * Todas as reuniões do time, com a avaliação de cada uma.
 *
 * Mostra também as que ninguém gravou ou avaliou: é o que o gestor precisa
 * ver para saber onde o processo está furando, e não só a média de quem já
 * usa a ferramenta.
 */
const ReunioesPage: React.FC = () => {
  const [dados, setDados] = useState<RespostaDeReunioes | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<number | null>(30);
  const [estado, setEstado] = useState<FiltrosDeReunioes["estado"]>(undefined);
  const [vendedorId, setVendedorId] = useState<number | undefined>(undefined);
  const [pagina, setPagina] = useState(1);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setDados(
        await reunioesService.listar({
          page: pagina,
          date_from: desde(periodo),
          estado,
          vendedor_id: vendedorId,
        })
      );
    } catch {
      setErro("Não foi possível carregar as reuniões.");
    } finally {
      setCarregando(false);
    }
  }, [pagina, periodo, estado, vendedorId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Video className="text-purple-400" size={20} />
        <h1 className="text-lg font-semibold text-slate-100">Reuniões</h1>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {PERIODOS.map((p) => (
          <button
            key={p.rotulo}
            onClick={() => {
              setPagina(1);
              setPeriodo(p.dias);
            }}
            className={`rounded border px-2.5 py-1 text-xs transition-colors ${
              periodo === p.dias
                ? "border-purple-500/50 bg-purple-500/10 text-purple-300"
                : "border-slate-700/50 text-slate-400 hover:text-slate-200"
            }`}
          >
            {p.rotulo}
          </button>
        ))}

        <span className="mx-1 h-4 w-px bg-slate-700/60" />

        {ESTADOS.map((e) => (
          <button
            key={e.rotulo}
            onClick={() => {
              setPagina(1);
              setEstado(e.valor);
            }}
            className={`rounded border px-2.5 py-1 text-xs transition-colors ${
              estado === e.valor
                ? "border-purple-500/50 bg-purple-500/10 text-purple-300"
                : "border-slate-700/50 text-slate-400 hover:text-slate-200"
            }`}
          >
            {e.rotulo}
          </button>
        ))}

        {/* Só o gestor recebe a lista; para o vendedor ela vem vazia */}
        {dados && dados.vendedores.length > 0 && (
          <select
            value={vendedorId ?? ""}
            onChange={(e) => {
              setPagina(1);
              setVendedorId(e.target.value ? Number(e.target.value) : undefined);
            }}
            className="rounded border border-slate-700/50 bg-slate-800/40 px-2 py-1 text-xs text-slate-300"
          >
            <option value="">Todos os vendedores</option>
            {dados.vendedores.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nome}
              </option>
            ))}
          </select>
        )}
      </div>

      {carregando && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="animate-spin" size={16} />
          Carregando...
        </div>
      )}

      {erro && <p className="text-sm text-red-400">{erro}</p>}

      {dados && !carregando && (
        <>
          <ReunioesKpis dados={dados} />

          {dados.por_vendedor.length > 0 && <QuadroPorVendedor linhas={dados.por_vendedor} />}

          <div className="overflow-x-auto rounded border border-slate-700/50">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400">
                <tr>
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Cliente</th>
                  <th className="px-3 py-2">Vendedor</th>
                  <th className="px-3 py-2">Duração</th>
                  <th className="px-3 py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {dados.items.map((r) => (
                  <tr
                    key={r.task_id}
                    className="border-t border-slate-700/40 hover:bg-slate-800/30"
                  >
                    <td className="px-3 py-2 text-slate-300">
                      {r.quando ? new Date(r.quando).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <Link to={`/cards/${r.card_id}`} className="text-sky-400 hover:underline">
                        {r.cliente || "—"}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-slate-300">{r.vendedor || "—"}</td>
                    <td className="px-3 py-2 text-slate-400">
                      {r.duracao_minutos ? `${r.duracao_minutos} min` : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`rounded border px-1.5 py-0.5 ${corDoSelo(r.selo)}`}>
                        {r.selo === "avaliada" && r.score !== null
                          ? `avaliada ${r.score} · ${r.veredito}`
                          : r.selo}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {dados.items.length === 0 && (
            <p className="text-sm text-slate-500">Nenhuma reunião no período.</p>
          )}

          {dados.total_pages > 1 && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <button
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina === 1}
                className="rounded border border-slate-700/50 px-2 py-1 disabled:opacity-40"
              >
                Anterior
              </button>
              <span>
                {pagina} de {dados.total_pages}
              </span>
              <button
                onClick={() => setPagina((p) => Math.min(dados.total_pages, p + 1))}
                disabled={pagina === dados.total_pages}
                className="rounded border border-slate-700/50 px-2 py-1 disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReunioesPage;
