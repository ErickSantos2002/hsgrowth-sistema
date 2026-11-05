import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, History } from "lucide-react";
import api from "../../services/api";

export interface HistoricoMudanca {
  campo: string;
  antes: string | null;
  depois: string | null;
}

export interface HistoricoItem {
  id: number;
  quando: string;
  usuario: string | null;
  acao: "criado" | "alterado";
  origem: string | null;
  mudancas: HistoricoMudanca[];
}

interface Props {
  /** Rota do cadastro: Clientes ou Pessoas. */
  tipo: "clients" | "persons";
  id: number;
}

const vazio = <span className="italic text-slate-400">vazio</span>;

/**
 * Histórico de alterações do Cliente/Pessoa: o que mudou, quem mudou e quando
 * (inclusive o que a equipe do parceiro atualizou pela oportunidade).
 */
export default function HistoricoAlteracoes({ tipo, id }: Props) {
  const [itens, setItens] = useState<HistoricoItem[] | null>(null);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    let vivo = true;
    api.get<HistoricoItem[]>(`/api/v1/${tipo}/${id}/historico`)
      .then((r) => vivo && setItens(r.data))
      .catch(() => vivo && setItens([]));
    return () => {
      vivo = false;
    };
  }, [tipo, id]);

  return (
    <div className="rounded-lg border border-gray-200 dark:border-slate-700">
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-800/50"
      >
        {aberto ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <History size={14} />
        Histórico de alterações
        {itens && <span className="text-xs text-slate-400">({itens.length})</span>}
      </button>
      {aberto && (
        <div className="max-h-72 space-y-3 overflow-y-auto border-t border-gray-200 px-4 py-3 dark:border-slate-700">
          {itens === null && <p className="text-sm text-slate-500">Carregando...</p>}
          {itens?.length === 0 && <p className="text-sm text-slate-500">Nenhuma alteração registrada.</p>}
          {itens?.map((item) => (
            <div key={item.id} className="text-sm">
              <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500 dark:text-slate-400">
                <span>{new Date(item.quando + (item.quando.endsWith("Z") ? "" : "Z")).toLocaleString("pt-BR")}</span>
                <span>· {item.usuario ?? "Sistema"}</span>
                {item.acao === "criado" && <span>· cadastro criado</span>}
                {item.origem && (
                  <span className="rounded bg-violet-500/15 px-1.5 py-0.5 font-medium text-violet-600 dark:text-violet-300">
                    {item.origem}
                  </span>
                )}
              </div>
              <ul className="mt-1 space-y-0.5">
                {item.mudancas.map((m) => (
                  <li key={m.campo} className="text-slate-700 dark:text-slate-300">
                    <span className="font-medium">{m.campo}:</span>{" "}
                    {item.acao === "alterado" && (
                      <>
                        <span className="text-slate-500 line-through decoration-slate-400/60">{m.antes ?? vazio}</span>
                        {" → "}
                      </>
                    )}
                    <span>{m.depois ?? vazio}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
