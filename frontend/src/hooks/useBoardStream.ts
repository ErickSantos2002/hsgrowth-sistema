import { useEffect } from "react";
import { getStreamTicket, streamUrl, StreamScope } from "../services/streamService";

/** Abre um EventSource para o board e chama onEvent a cada mensagem.
 *  Reconexao manual com ticket NOVO a cada tentativa (o auto-reconnect nativo
 *  reusaria o ticket vencido de 60s -> 401). onOpen dispara o resync. */
export function useBoardStream(
  scope: StreamScope,
  boardId: number | undefined,
  onEvent: (evt: any) => void,
  onOpen: () => void,
) {
  useEffect(() => {
    if (!boardId) return;
    let es: EventSource | null = null;
    let stopped = false;
    let backoff = 1000;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const clearTimer = () => { if (timer) { clearTimeout(timer); timer = undefined; } };
    const isHidden = () => typeof document !== "undefined" && document.visibilityState === "hidden";

    function disconnect() {
      clearTimer();
      es?.close();
      es = null;
    }

    function scheduleRetry() {
      if (stopped || isHidden()) return;
      clearTimer();
      timer = setTimeout(connect, backoff);
      backoff = Math.min(backoff * 2, 10000);
    }

    async function connect() {
      // Só a aba visível mantém o SSE. Evita duplicar conexão.
      if (stopped || es || isHidden()) return;
      try {
        const ticket = await getStreamTicket(scope, boardId!);
        if (stopped || isHidden()) return;
        es = new EventSource(streamUrl(scope, boardId!, ticket));
        es.onopen = () => { backoff = 1000; onOpen(); };
        es.onmessage = (m) => { try { onEvent(JSON.parse(m.data)); } catch { /* ignora */ } };
        es.onerror = () => { es?.close(); es = null; scheduleRetry(); };
      } catch {
        scheduleRetry();
      }
    }

    // Aba em segundo plano fecha o SSE (libera o limite de ~6 conexões/host do
    // navegador — senão o dashboard/outras requisições ficam na fila). Ao voltar
    // a ficar visível, reabre e re-sincroniza (onOpen).
    const onVisibility = () => {
      if (isHidden()) {
        disconnect();
      } else {
        backoff = 1000;
        connect();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    if (!isHidden()) connect();

    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", onVisibility);
      disconnect();
    };
  }, [scope, boardId]); // eslint-disable-line react-hooks/exhaustive-deps
}
