import { useEffect, useState } from "react";
import { DailyCall } from "@daily-co/daily-js";
import { ChevronRight, Loader2, Sparkles } from "lucide-react";

import cardTaskService, { SugestaoDaIA } from "../../services/cardTaskService";
import { useLiveTranscript } from "../../hooks/useLiveTranscript";
import AssistSuggestion from "./AssistSuggestion";

/**
 * Painel da IA ao vivo — só o time vê.
 *
 * A sugestão sai quando o vendedor pede, nunca sozinha: menos ruído no meio da
 * conversa e custo sob controle (decisão de 04/09). O cliente entra por outra
 * página, que nem carrega este componente.
 */
const LiveAssistPanel: React.FC<{ call: DailyCall | null; taskId?: string }> = ({
  call,
  taskId,
}) => {
  const { falasRef, ouvindo, temConversaSuficiente } = useLiveTranscript(call, taskId);

  const [sugestoes, setSugestoes] = useState<SugestaoDaIA[]>([]);
  const [pensando, setPensando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Recarregar a aba no meio da reunião não pode perder o que já foi sugerido
  useEffect(() => {
    if (!taskId) return;
    cardTaskService
      .listarAjudaAoVivo(Number(taskId))
      .then(setSugestoes)
      .catch(() => {
        // sem histórico não impede pedir ajuda agora
      });
  }, [taskId]);

  const pedir = async () => {
    if (!taskId || pensando) return;

    setPensando(true);
    setErro(null);
    try {
      const sugestao = await cardTaskService.pedirAjudaAoVivo(
        Number(taskId),
        falasRef.current.map((f) => ({
          papel: f.papel,
          nome: f.nome,
          texto: f.texto,
          em: f.em,
        }))
      );
      setSugestoes((antes) => [sugestao, ...antes]);
    } catch (e: any) {
      setErro(e.response?.data?.detail || "A IA não respondeu agora. Tente de novo.");
    } finally {
      setPensando(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto bg-slate-900/80 p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
        <span
          className={`h-2 w-2 rounded-full ${
            ouvindo ? "animate-pulse bg-emerald-500" : "bg-slate-600"
          }`}
        />
        {ouvindo ? "Ouvindo a conversa" : "Transcrição não iniciada"}
      </div>

      <button
        onClick={pedir}
        disabled={pensando || !temConversaSuficiente}
        title={
          temConversaSuficiente
            ? "Pedir uma sugestão com base na conversa até agora"
            : "Ainda não há conversa suficiente"
        }
        className="flex items-center justify-center gap-2 rounded border border-purple-500/50 bg-purple-500/10 px-3 py-2 text-sm font-medium text-purple-300 transition-colors hover:bg-purple-500/20 disabled:opacity-40"
      >
        {pensando ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
        {pensando ? "Pensando..." : "Me ajuda aqui"}
      </button>

      {!temConversaSuficiente && !pensando && (
        <p className="text-[11px] text-slate-500">
          Ainda não há conversa suficiente para uma sugestão.
        </p>
      )}

      {erro && <p className="text-[11px] text-red-400">{erro}</p>}

      <div className="space-y-2">
        {sugestoes.map((sugestao, i) =>
          i === 0 ? (
            <AssistSuggestion key={sugestao.id} sugestao={sugestao} />
          ) : (
            <details key={sugestao.id} className="rounded border border-slate-700/40">
              <summary className="flex cursor-pointer items-center gap-1 px-2 py-1.5 text-[11px] text-slate-400">
                <ChevronRight size={11} />
                {new Date(sugestao.criado_em).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {" · "}
                {sugestao.leitura.slice(0, 40)}
                {sugestao.leitura.length > 40 ? "..." : ""}
              </summary>
              <div className="p-1.5">
                <AssistSuggestion sugestao={sugestao} compacto />
              </div>
            </details>
          )
        )}
      </div>
    </div>
  );
};

export default LiveAssistPanel;
