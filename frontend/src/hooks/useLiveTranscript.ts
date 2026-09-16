import { useEffect, useRef, useState } from "react";
import { DailyCall, DailyEventObjectTranscriptionMessage } from "@daily-co/daily-js";

export interface FalaAoVivo {
  papel: "time" | "cliente";
  nome: string;
  texto: string;
  em: string;
}

const MAXIMO_DE_FALAS_GUARDADAS = 2000;
const MINIMO_PARA_PEDIR_AJUDA = 5;

/**
 * Acumula a transcrição ao vivo da reunião.
 *
 * O Daily entrega cada frase pelo evento `transcription-message`. Quem é do
 * time e quem é o cliente sai da própria sala: participante dono é do time
 * (vendedor ou SDR entram com token de dono), os demais são o cliente.
 *
 * As falas também vão para o `sessionStorage`: recarregar a aba no meio de uma
 * reunião não pode zerar o contexto que a IA vai receber.
 */
export function useLiveTranscript(call: DailyCall | null, taskId: string | undefined) {
  const chave = `conversa_reuniao_${taskId ?? ""}`;

  const [falas, setFalas] = useState<FalaAoVivo[]>(() => {
    try {
      const salvo = window.sessionStorage.getItem(chave);
      return salvo ? (JSON.parse(salvo) as FalaAoVivo[]) : [];
    } catch {
      return [];
    }
  });
  const [ouvindo, setOuvindo] = useState(false);

  // O botão precisa das falas mais recentes no momento do clique, sem depender
  // do ciclo de renderização.
  const falasRef = useRef<FalaAoVivo[]>(falas);

  useEffect(() => {
    falasRef.current = falas;
    try {
      window.sessionStorage.setItem(
        chave,
        JSON.stringify(falas.slice(-MAXIMO_DE_FALAS_GUARDADAS))
      );
    } catch {
      // aba anônima ou armazenamento cheio: segue sem persistir
    }
  }, [falas, chave]);

  useEffect(() => {
    if (!call) return;

    const aoTranscrever = (ev?: DailyEventObjectTranscriptionMessage) => {
      if (!ev?.text) return;

      // Resultado ainda sendo corrigido pelo Daily: esperar a versão final,
      // senão a mesma frase entra várias vezes, pela metade.
      const bruto = ev.rawResponse as { is_final?: boolean } | undefined;
      if (bruto && bruto.is_final === false) return;

      const participantes = call.participants?.() as
        | Record<string, { owner?: boolean; user_name?: string }>
        | undefined;
      const participante = participantes?.[ev.participantId];
      const doTime = Boolean(participante?.owner);

      setFalas((antes) => [
        ...antes,
        {
          papel: doTime ? "time" : "cliente",
          nome: participante?.user_name || (doTime ? "Time" : "Cliente"),
          texto: ev.text,
          em: new Date().toISOString(),
        },
      ]);
    };

    const ligou = () => setOuvindo(true);
    const desligou = () => setOuvindo(false);

    call.on("transcription-message", aoTranscrever);
    call.on("transcription-started", ligou);
    call.on("transcription-stopped", desligou);
    call.on("transcription-error", desligou);

    return () => {
      call.off("transcription-message", aoTranscrever);
      call.off("transcription-started", ligou);
      call.off("transcription-stopped", desligou);
      call.off("transcription-error", desligou);
    };
  }, [call]);

  // Sem o cliente falar não há o que interpretar — e o servidor recusa também.
  const temConversaSuficiente =
    falas.length >= MINIMO_PARA_PEDIR_AJUDA && falas.some((f) => f.papel === "cliente");

  return { falas, falasRef, ouvindo, temConversaSuficiente };
}
