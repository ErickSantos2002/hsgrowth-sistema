import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Paperclip, StickyNote } from "lucide-react";
import { ServiceActivityTab, ServiceFilesTab } from "../service/ServiceActivityTab";
import ServiceNotesSection from "../service/ServiceNotesSection";
import parceriasService, { AlvoAtividades, Atividade, apiDeAtividades } from "../../services/parceriasService";

export interface AbaExtra {
  chave: string;
  rotulo: string;
  icone: ReactNode;
  badge?: number;
  conteudo: ReactNode;
}

interface Props {
  alvo: AlvoAtividades;
  /** Muda quando o card muda (etapa, elegibilidade...) para o histórico recarregar. */
  versao?: string;
  extras?: AbaExtra[];
}

/**
 * Coluna da direita do detalhe, igual à do card de Serviço: abas Atividade
 * (Adicionar, Foco e Histórico), Anotações e Arquivos, com os mesmos componentes.
 */
export default function AbasDoCard({ alvo, versao, extras = [] }: Props) {
  const [aba, setAba] = useState("atividade");
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const api = useMemo(() => apiDeAtividades(alvo), [alvo.tipo, alvo.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const recarregar = useCallback(async () => {
    try {
      setAtividades(await parceriasService.listarAtividades(alvo));
    } catch { /* silencioso, como no card de Serviço */ }
  }, [alvo.tipo, alvo.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    recarregar();
  }, [recarregar, versao]);

  const abas = [
    { chave: "atividade", rotulo: "Atividade", icone: <Activity size={16} />,
      badge: atividades.filter((a) => a.category === "atividade" && !a.is_completed).length },
    { chave: "anotacoes", rotulo: "Anotações", icone: <StickyNote size={16} />,
      badge: atividades.filter((a) => a.category === "anotacao").length },
    { chave: "arquivos", rotulo: "Arquivos", icone: <Paperclip size={16} />,
      badge: atividades.filter((a) => a.category === "arquivo").length },
    ...extras,
  ];

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
      <div className="flex flex-shrink-0 items-center gap-1 overflow-x-auto border-b border-gray-200 bg-white px-4 dark:border-slate-700/50 dark:bg-slate-900/30">
        {abas.map((a) => (
          <button
            key={a.chave}
            onClick={() => setAba(a.chave)}
            className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              aba === a.chave
                ? "border-blue-500 text-blue-500 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            {a.icone}
            {a.rotulo}
            {!!a.badge && <span className="rounded-full bg-blue-500/20 px-1.5 text-xs text-blue-400">{a.badge}</span>}
          </button>
        ))}
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-6">
        {aba === "atividade" && <ServiceActivityTab api={api} activities={atividades} reload={recarregar} />}
        {aba === "anotacoes" && <ServiceNotesSection api={api} activities={atividades} reload={recarregar} />}
        {aba === "arquivos" && <ServiceFilesTab api={api} activities={atividades} reload={recarregar} />}
        {extras.find((e) => e.chave === aba)?.conteudo}
      </div>
    </div>
  );
}
