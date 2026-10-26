import { useEffect, useRef, useState } from "react";
import { DailyCall, DailyEventObjectNetworkConnectionEvent } from "@daily-co/daily-js";
import { Loader2, RefreshCw, WifiOff } from "lucide-react";

/**
 * Faixa de conexão, acima do vídeo, que reconecta sozinha.
 *
 * Em 22/10/2026 a conexão de recebimento do Erick caiu no meio da
 * apresentação da Sandra: ele seguia "na sala" para os outros, mas para ele
 * tudo travou. O Daily tentou reconectar uma vez e desistiu; só voltou quando
 * ele apertou F5. O cliente não sabe que F5 resolve.
 *
 * Aqui: quando a conexão cai e não volta em ESPERA_MS, sai e entra de novo na
 * sala — o mesmo que o F5, sem a pessoa precisar fazer nada.
 */
const ESPERA_MS = 15_000;
// Rede que cai toda hora não pode virar um entra-e-sai sem fim: passadas as
// tentativas, fica o botão de recarregar.
const MAX_TENTATIVAS = 2;

type Estado = "ok" | "caiu" | "reconectando" | "voltou" | "falhou";

interface Props {
  call: DailyCall | null;
  /** Sai e entra de novo na sala. Quem chama cuida de ignorar o "saiu". */
  reconectar: () => Promise<void>;
  /** Texto extra enquanto reconecta (ex.: o convidado volta à sala de espera). */
  avisoAoReconectar?: string;
}

const ReconexaoAutomatica: React.FC<Props> = ({ call, reconectar, avisoAoReconectar }) => {
  const [estado, setEstado] = useState<Estado>("ok");
  const reconectarRef = useRef(reconectar);
  reconectarRef.current = reconectar;
  const reconectarAgoraRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!call) return;

    // Cada canal (sinalização, envio/recebimento de mídia) avisa separado:
    // só está tudo bem quando nenhum está caído.
    const caidos = new Set<string>();
    let espera: number | null = null;
    let aviso: number | null = null;
    let tentativas = 0;
    let reconectando = false;

    const limparEspera = () => {
      if (espera) window.clearTimeout(espera);
      espera = null;
    };

    const reconectarAgora = async () => {
      if (reconectando) return;
      limparEspera();
      if (tentativas >= MAX_TENTATIVAS) {
        setEstado("falhou");
        return;
      }
      tentativas += 1;
      reconectando = true;
      setEstado("reconectando");
      try {
        await reconectarRef.current();
        caidos.clear();
        setEstado("voltou");
        if (aviso) window.clearTimeout(aviso);
        aviso = window.setTimeout(() => setEstado((e) => (e === "voltou" ? "ok" : e)), 4000);
      } catch (e) {
        console.warn("[reuniao] reconexao falhou", e);
        setEstado("falhou");
      } finally {
        reconectando = false;
      }
    };
    reconectarAgoraRef.current = reconectarAgora;

    const aoMudarConexao = (ev?: DailyEventObjectNetworkConnectionEvent) => {
      // Fora da sala (entrando, saindo ou no meio da reconexão) não há o que
      // reconectar.
      if (!ev || reconectando || call.meetingState() !== "joined-meeting") return;

      if (ev.event === "interrupted") {
        caidos.add(ev.type);
        setEstado((e) => (e === "falhou" ? e : "caiu"));
        if (!espera) espera = window.setTimeout(reconectarAgora, ESPERA_MS);
      } else if (ev.event === "connected") {
        caidos.delete(ev.type);
        if (caidos.size === 0) {
          limparEspera();
          setEstado((e) => (e === "caiu" ? "ok" : e));
        }
      }
    };

    call.on("network-connection", aoMudarConexao);
    return () => {
      call.off("network-connection", aoMudarConexao);
      limparEspera();
      if (aviso) window.clearTimeout(aviso);
    };
  }, [call]);

  if (estado === "ok") return null;

  const base = "flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium";

  if (estado === "voltou") {
    return (
      <div role="status" className={`${base} bg-emerald-500/15 text-emerald-300`}>
        Conexão restabelecida.
      </div>
    );
  }

  if (estado === "falhou") {
    return (
      <div role="alert" className={`${base} bg-red-500/15 text-red-300`}>
        <WifiOff size={14} />
        Não foi possível reconectar. Verifique sua internet e recarregue a página.
        <button
          onClick={() => window.location.reload()}
          className="ml-1 flex items-center gap-1 rounded-md bg-red-500/20 px-2 py-0.5 text-red-200 transition-colors hover:bg-red-500/30"
        >
          <RefreshCw size={12} />
          Recarregar
        </button>
      </div>
    );
  }

  return (
    <div role="status" className={`${base} bg-amber-500/15 text-amber-300`}>
      {estado === "reconectando" ? (
        <>
          <Loader2 size={14} className="animate-spin" />
          Reconectando…{avisoAoReconectar ? ` ${avisoAoReconectar}` : ""}
        </>
      ) : (
        <>
          <WifiOff size={14} />
          Sua conexão caiu. Tentando reconectar…
          <button
            onClick={() => reconectarAgoraRef.current()}
            className="ml-1 rounded-md bg-amber-500/20 px-2 py-0.5 text-amber-200 transition-colors hover:bg-amber-500/30"
          >
            Reconectar agora
          </button>
        </>
      )}
    </div>
  );
};

export default ReconexaoAutomatica;
