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

    async function connect() {
      if (stopped) return;
      try {
        const ticket = await getStreamTicket(scope, boardId!);
        if (stopped) return;
        es = new EventSource(streamUrl(scope, boardId!, ticket));
        es.onopen = () => { backoff = 1000; onOpen(); };
        es.onmessage = (m) => { try { onEvent(JSON.parse(m.data)); } catch { /* ignora */ } };
        es.onerror = () => {
          es?.close();
          es = null;
          if (!stopped) {
            timer = setTimeout(connect, backoff);
            backoff = Math.min(backoff * 2, 10000);
          }
        };
      } catch {
        if (!stopped) {
          timer = setTimeout(connect, backoff);
          backoff = Math.min(backoff * 2, 10000);
        }
      }
    }
    connect();
    return () => {
      stopped = true;
      es?.close();
      if (timer) clearTimeout(timer);
    };
  }, [scope, boardId]); // eslint-disable-line react-hooks/exhaustive-deps
}
