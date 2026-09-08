/**
 * Sala de reunião por vídeo — visão do anfitrião (vendedor ou SDR).
 *
 * A interface de vídeo, áudio, chat e compartilhamento de tela vem pronta do
 * Daily (Prebuilt). Aqui cuidamos de obter o token, montar o iframe e limpar
 * tudo ao sair.
 *
 * Detalhes que vieram de implementação já rodando em produção (dn.nexus):
 * - o iframe é criado à mão e passado para DailyIframe.wrap(), porque o
 *   atributo `allow` precisa existir ANTES do Prebuilt carregar; definido
 *   depois, o navegador não libera picture-in-picture;
 * - `display-capture` no allow é o que permite compartilhar tela;
 * - o token vai na URL como `?t=`, junto de `lang=pt-BR`;
 * - no cleanup, a referência é zerada antes do destroy (evita re-entrada) e o
 *   container é esvaziado — senão a câmera continua ativa depois de sair.
 */
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DailyIframe, { DailyCall } from "@daily-co/daily-js";
import { ArrowLeft, Loader2, VideoOff } from "lucide-react";

import cardTaskService from "../services/cardTaskService";

const IFRAME_ALLOW =
  "camera; microphone; fullscreen; display-capture; autoplay; picture-in-picture";

const MeetingRoom: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();

  const containerRef = useRef<HTMLDivElement>(null);
  const callRef = useRef<DailyCall | null>(null);

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!taskId) return;
    let cancelado = false;

    const entrar = async () => {
      try {
        const { token, room_url } = await cardTaskService.getDailyHostToken(Number(taskId));
        if (cancelado || !containerRef.current) return;
        if (callRef.current) return;

        const joinUrl = new URL(room_url);
        joinUrl.searchParams.set("t", token);
        joinUrl.searchParams.set("lang", "pt-BR");

        const iframeEl = document.createElement("iframe");
        iframeEl.allow = IFRAME_ALLOW;
        iframeEl.title = "Reunião por vídeo";
        iframeEl.style.position = "absolute";
        iframeEl.style.inset = "0";
        iframeEl.style.width = "100%";
        iframeEl.style.height = "100%";
        iframeEl.style.border = "0";
        containerRef.current.replaceChildren(iframeEl);

        const call = DailyIframe.wrap(iframeEl, {
          url: joinUrl.toString(),
          showLeaveButton: true,
          showFullscreenButton: true,
        });
        callRef.current = call;

        call.on("left-meeting", () => navigate(-1));

        setLoading(false);
      } catch (e: any) {
        if (cancelado) return;
        setErro(
          e.response?.data?.detail ||
            "Não foi possível entrar na reunião. Tente novamente ou avise o suporte."
        );
        setLoading(false);
      }
    };

    entrar();

    return () => {
      cancelado = true;
      const call = callRef.current;
      callRef.current = null;
      if (call) {
        try {
          call.destroy();
        } catch {
          // já pode ter sido destruído pelo próprio Prebuilt
        }
      }
      containerRef.current?.replaceChildren();
    };
  }, [taskId, navigate]);

  return (
    <div className="flex h-screen flex-col bg-slate-900">
      <div className="flex items-center gap-3 border-b border-slate-700/50 px-4 py-3">
        <button
          onClick={() => navigate(-1)}
          className="rounded-lg p-2 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          aria-label="Voltar"
        >
          <ArrowLeft size={20} />
        </button>
        <span className="text-sm font-medium text-white">Reunião por vídeo</span>
      </div>

      <div className="relative flex-1">
        {loading && !erro && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-purple-400" size={32} />
            <p className="text-sm text-slate-400">Entrando na reunião...</p>
          </div>
        )}

        {erro && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 p-6">
            <VideoOff className="text-slate-500" size={36} />
            <p className="max-w-md text-center text-sm text-slate-300">{erro}</p>
            <button
              onClick={() => navigate(-1)}
              className="mt-2 rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800"
            >
              Voltar
            </button>
          </div>
        )}

        <div ref={containerRef} className="absolute inset-0" />
      </div>
    </div>
  );
};

export default MeetingRoom;
