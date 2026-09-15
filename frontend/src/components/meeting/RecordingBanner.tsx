import { useEffect, useRef, useState } from "react";
import { DailyCall } from "@daily-co/daily-js";

/**
 * Faixa de estado da gravação, acima do vídeo.
 *
 * A barra do próprio Daily só aparece para quem clicou em gravar: na
 * homologação de 14/09 nem o anfitrião percebeu que a gravação tinha parado,
 * e o convidado não sabia que estava sendo gravado.
 *
 * Esta faixa é nossa e aparece para todos, inclusive o cliente — quem está
 * sendo gravado precisa saber disso.
 */
const RecordingBanner: React.FC<{ call: DailyCall | null }> = ({ call }) => {
  const [gravando, setGravando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [encerrouAgora, setEncerrouAgora] = useState(false);
  const avisoRef = useRef<number | null>(null);

  useEffect(() => {
    if (!call) return;

    const iniciou = () => {
      setGravando(true);
      setEncerrouAgora(false);
      setSegundos(0);
    };

    const parou = () => {
      setGravando(false);
      setEncerrouAgora(true);
      if (avisoRef.current) window.clearTimeout(avisoRef.current);
      // O aviso some sozinho: passado o susto, a faixa não deve roubar espaço
      // do vídeo pelo resto da reunião.
      avisoRef.current = window.setTimeout(() => setEncerrouAgora(false), 8000);
    };

    call.on("recording-started", iniciou);
    call.on("recording-stopped", parou);

    return () => {
      call.off("recording-started", iniciou);
      call.off("recording-stopped", parou);
      if (avisoRef.current) window.clearTimeout(avisoRef.current);
    };
  }, [call]);

  useEffect(() => {
    if (!gravando) return;

    const timer = window.setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [gravando]);

  if (!gravando && !encerrouAgora) return null;

  const relogio = `${String(Math.floor(segundos / 60)).padStart(2, "0")}:${String(
    segundos % 60
  ).padStart(2, "0")}`;

  return (
    <div
      role="status"
      className={`flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium ${
        gravando ? "bg-red-500/15 text-red-300" : "bg-slate-700/40 text-slate-300"
      }`}
    >
      {gravando ? (
        <>
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          Gravando {relogio}
        </>
      ) : (
        <>Gravação encerrada — em processamento</>
      )}
    </div>
  );
};

export default RecordingBanner;
