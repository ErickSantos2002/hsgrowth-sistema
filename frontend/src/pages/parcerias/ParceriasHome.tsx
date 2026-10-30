import { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Eye, Grid3x3, Handshake, RefreshCw, Search } from "lucide-react";
import EmptyState from "../../components/common/EmptyState";
import { useAuth } from "../../hooks/useAuth";
import { showError } from "../../utils/toast";
import { BOARDS_PARCERIAS, BoardParceria } from "../../constants/parcerias";
import parceriasService, { mensagemDeErro } from "../../services/parceriasService";

interface Contagem {
  etapas: number;
  cards: number;
}

/** Card do board, igual ao da página Boards (Serviços). */
function CardBoard({ board, contagem, onAbrir }: { board: BoardParceria; contagem?: Contagem; onAbrir: () => void }) {
  const Icone = board.icone;
  return (
    <div
      className="group relative rounded-xl border-2 p-6 backdrop-blur-sm transition-all duration-300 hover:shadow-xl"
      style={{ borderColor: board.cor, backgroundColor: `${board.cor}20`, boxShadow: `0 0 20px ${board.cor}10` }}
    >
      <div className="absolute right-4 top-4">
        <span className="rounded-full bg-green-500/20 px-2 py-1 text-xs font-semibold text-slate-900 dark:text-green-400">Ativo</span>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3 pr-20">
          <div className="rounded-lg p-2" style={{ backgroundColor: `${board.cor}20` }}>
            <Icone size={24} style={{ color: board.cor }} />
          </div>
          <h3
            className="flex-1 cursor-pointer text-xl font-bold text-slate-900 transition-colors group-hover:text-violet-400 dark:text-white"
            onClick={onAbrir}
          >
            {board.nome}
          </h3>
        </div>

        <p className="line-clamp-2 min-h-[40px] text-sm text-slate-500 dark:text-gray-400">{board.descricao}</p>

        <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-gray-500">
          <span>{contagem?.etapas ?? "–"} listas</span>
          <span>{contagem?.cards ?? "–"} cards</span>
        </div>

        <div className="border-t border-gray-700/50" />

        <div className="flex items-center justify-between">
          <button
            onClick={onAbrir}
            className="flex items-center gap-2 rounded-lg bg-violet-500/10 px-4 py-2 text-violet-500 transition-colors hover:bg-violet-500/20 dark:text-violet-400"
          >
            <Eye size={16} />
            Visualizar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ParceriasHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [contagens, setContagens] = useState<Record<string, Contagem>>({});
  const ehParceiro = user?.role === "partner";

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [etapas, parceiros, oportunidades] = await Promise.all([
        parceriasService.etapas(),
        parceriasService.listarParceiros(),
        parceriasService.listarOportunidades(),
      ]);
      setContagens({
        aquisicao: { etapas: etapas.aquisicao.length, cards: parceiros.length },
        oportunidades: { etapas: etapas.oportunidades.length, cards: oportunidades.length },
      });
    } catch (err) {
      showError(mensagemDeErro(err, "Erro ao carregar os boards de Parcerias."));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (!ehParceiro) carregar();
  }, [carregar, ehParceiro]);

  // O parceiro trabalha no Pipeline; o card dele no board 1 abre pelo menu do board.
  if (ehParceiro) return <Navigate to="/parcerias/oportunidades" replace />;

  const termo = busca.trim().toLowerCase();
  const boards = BOARDS_PARCERIAS.filter(
    (b) => !termo || b.nome.toLowerCase().includes(termo) || b.descricao.toLowerCase().includes(termo)
  );

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-bold text-slate-900 dark:text-white">
          <Handshake className="text-slate-900 dark:text-white" size={32} />
          Boards (Parcerias)
        </h1>
        <p className="mt-1 text-slate-500 dark:text-gray-400">
          Programa de Parceiros da Health &amp; Safety: aquisição dos parceiros e as oportunidades que eles indicam
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar boards..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-400"
          />
        </div>
        <button
          onClick={carregar}
          disabled={carregando}
          className="flex h-11 items-center justify-center rounded-lg bg-gray-100 px-4 py-2 text-gray-600 transition-colors hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-700"
          title="Atualizar"
        >
          <RefreshCw size={20} className={carregando ? "animate-spin" : ""} />
        </button>
      </div>

      {boards.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {boards.map((b) => (
            <CardBoard key={b.chave} board={b} contagem={contagens[b.chave]} onAbrir={() => navigate(b.caminho)} />
          ))}
        </div>
      ) : (
        <EmptyState icon={Grid3x3} title="Nenhum board encontrado" description="Tente ajustar a busca" />
      )}
    </div>
  );
}
