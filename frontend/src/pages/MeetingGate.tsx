/**
 * Tela pública de entrada na reunião — visão do cliente.
 *
 * É a única página do sistema que gente de fora acessa: sem login, sem
 * instalar nada. O cliente informa nome, empresa e e-mail, entra na sala de
 * espera e o anfitrião libera.
 *
 * Nada do CRM aparece aqui — nem dados do negócio, nem do vendedor. O nome
 * também não vem preenchido de propósito: se o link vazar, não revela quem
 * era o contato.
 */
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import DailyIframe, { DailyCall } from "@daily-co/daily-js";

import RecordingBanner from "../components/meeting/RecordingBanner";
import { Loader2, Video, CalendarX, Clock } from "lucide-react";

import publicMeetingService, { PublicMeetingInfo } from "../services/publicMeetingService";

const IFRAME_ALLOW =
  "camera; microphone; fullscreen; display-capture; autoplay; picture-in-picture";

const MeetingGate: React.FC = () => {
  const { publicToken } = useParams<{ publicToken: string }>();

  const containerRef = useRef<HTMLDivElement>(null);
  const callRef = useRef<DailyCall | null>(null);
  const urlDaSalaRef = useRef<string | null>(null);
  const nomeDoConvidadoRef = useRef<string>("Convidado");

  const [info, setInfo] = useState<PublicMeetingInfo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [entrando, setEntrando] = useState(false);
  const [naSala, setNaSala] = useState(false);
  // O cliente também vê a faixa de gravação: quem está sendo gravado
  // precisa saber disso.
  const [call, setCall] = useState<DailyCall | null>(null);
  const [saiu, setSaiu] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", company: "", email: "" });

  useEffect(() => {
    if (!publicToken) return;
    publicMeetingService
      .getInfo(publicToken)
      .then(setInfo)
      .catch((e) =>
        setErro(
          e.response?.data?.detail ||
            "Reunião não encontrada. Verifique o link ou peça um novo ao seu contato."
        )
      )
      .finally(() => setCarregando(false));
  }, [publicToken]);

  // Monta o iframe assim que a tela da sala entra no DOM
  useEffect(() => {
    if (!naSala || !urlDaSalaRef.current) return;
    if (!containerRef.current || callRef.current) return;

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
      url: urlDaSalaRef.current,
      showLeaveButton: true,
    });
    callRef.current = call;
    setCall(call);

    call.on("left-meeting", () => setSaiu(true));

    // wrap() só monta o iframe; quem entra de fato na sala é o join().
    // userName vai junto para o anfitrião ver quem está pedindo para entrar.
    call.join({ userName: nomeDoConvidadoRef.current }).catch(() => {
      setNaSala(false);
      setErro(
        "Não foi possível entrar na sala. Verifique se o navegador tem permissão para câmera e microfone."
      );
    });
  }, [naSala]);

  // Ao sair da página, encerra a chamada — senão a câmera segue ativa
  useEffect(() => {
    return () => {
      const call = callRef.current;
      callRef.current = null;
      if (call) {
        try {
          call.destroy();
        } catch {
          // pode já ter sido destruída pelo próprio Prebuilt
        }
      }
      containerRef.current?.replaceChildren();
    };
  }, []);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicToken || !form.name.trim()) return;

    setEntrando(true);
    setErro(null);

    try {
      const { room_url, user_name } = await publicMeetingService.join(publicToken, {
        name: form.name.trim(),
        company: form.company.trim() || undefined,
        email: form.email.trim() || undefined,
      });

      const joinUrl = new URL(room_url);
      joinUrl.searchParams.set("lang", "pt-BR");

      // Sem token na URL: é isso que faz o convidado cair na sala de espera
      // em vez de entrar direto.
      urlDaSalaRef.current = joinUrl.toString();
      nomeDoConvidadoRef.current = user_name;
      setNaSala(true);
    } catch (err: any) {
      setErro(
        err.response?.data?.detail ||
          "Não foi possível entrar na reunião. Tente novamente em instantes."
      );
      setNaSala(false);
    } finally {
      setEntrando(false);
    }
  };

  if (naSala) {
    return (
      <div className="relative flex h-screen w-screen flex-col bg-slate-900">
        <RecordingBanner call={call} />
        <div className="relative flex-1">
          <div ref={containerRef} className="absolute inset-0" />
        </div>
        {saiu && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-slate-900 p-6 text-center">
            <CalendarX className="text-slate-500" size={36} />
            <p className="text-sm text-slate-300">Você saiu da reunião.</p>
            <p className="text-xs text-slate-500">Pode fechar esta aba.</p>
          </div>
        )}
      </div>
    );
  }

  const horario = info?.scheduled_at
    ? new Date(info.scheduled_at).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md">
        {/* Marca */}
        <div className="mb-6 text-center">
          <h2 className="text-lg font-semibold text-white">HSGrowth</h2>
          <p className="text-xs text-slate-500">Health &amp; Safety Tech</p>
        </div>

        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-8">
          {carregando ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="animate-spin text-purple-400" size={28} />
              <p className="text-sm text-slate-400">Carregando...</p>
            </div>
          ) : erro && !info ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CalendarX className="text-slate-500" size={36} />
              <p className="text-sm text-slate-300">{erro}</p>
            </div>
          ) : info?.already_ended ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CalendarX className="text-slate-500" size={36} />
              <p className="text-sm text-slate-300">Esta reunião já foi encerrada.</p>
            </div>
          ) : (
            <>
              <div className="mb-6 flex flex-col items-center gap-3 text-center">
                <div className="rounded-xl bg-purple-500/10 p-3">
                  <Video className="text-purple-400" size={26} />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-white">{info?.title}</h1>
                  {horario && (
                    <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-slate-400">
                      <Clock size={13} />
                      {horario}
                      {info?.duration_minutes ? ` · ${info.duration_minutes} min` : ""}
                    </p>
                  )}
                </div>
              </div>

              {erro && (
                <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                  {erro}
                </div>
              )}

              <form onSubmit={entrar} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Seu nome <span className="text-red-400">*</span>
                  </label>
                  <input
                    autoFocus
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    maxLength={120}
                    placeholder="Como podemos te chamar?"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Empresa
                  </label>
                  <input
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    maxLength={200}
                    placeholder="Nome da empresa"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    maxLength={255}
                    placeholder="seu@email.com"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={entrando || !form.name.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {entrando && <Loader2 className="animate-spin" size={16} />}
                  Entrar na reunião
                </button>

                <p className="text-center text-[11px] leading-relaxed text-slate-500">
                  Você entrará na sala de espera até ser admitido.
                  <br />
                  Não é necessário instalar nada.
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MeetingGate;
