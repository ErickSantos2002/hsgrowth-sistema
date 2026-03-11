/**
 * Indicador de carregamento animado para o Agent Growth.
 * Exibe três pontos pulsantes enquanto o agente processa a resposta.
 */
export default function AgentLoadingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      <span className="text-xs text-slate-500 dark:text-slate-400 mr-1">
        Digitando
      </span>
      {/* Três pontos com animação de bounce defasada */}
      <span
        className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce"
        style={{ animationDelay: "0ms" }}
      />
      <span
        className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce"
        style={{ animationDelay: "150ms" }}
      />
      <span
        className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce"
        style={{ animationDelay: "300ms" }}
      />
    </div>
  );
}
