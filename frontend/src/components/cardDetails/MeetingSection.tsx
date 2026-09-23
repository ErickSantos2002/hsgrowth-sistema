import React, { useState, useEffect } from "react";
import {
  Users,
  Plus,
  Loader2,
  MonitorPlay,
  Video,
  ExternalLink,
  BrainCircuit,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  ChevronDown,
  RefreshCw,
  ChevronRight,
  Check,
  X,
  Trash2,
  Calendar,
  Copy,
  Pencil,
  CalendarX,
  ClipboardCheck,
} from "lucide-react";
import cardTaskService, {
  AvaliacaoDaReuniao,
  CardTask,
  ConvidadoSugerido,
  SugestaoDaIA,
  TipoDeReuniao,
} from "../../services/cardTaskService";
import AssistSuggestion from "../meeting/AssistSuggestion";
import MeetingEvaluation from "./MeetingEvaluation";
import ConvidadosDaReuniao from "./ConvidadosDaReuniao";
import userService from "../../services/userService";
import { showSuccess, showError } from "../../utils/toast";
import { useConfirm } from "../../contexts/ConfirmContext";
import { useAuth } from "../../context/AuthContext";
import {
  formatBrazilDate,
  convertBrazilToUTC,
  extractBrazilDateForInput,
  extractBrazilTimeForInput,
} from "../../utils/timezone";
import BaseModal from "../common/BaseModal";

interface MeetingSectionProps {
  cardId: number;
  assignedToId?: number | null;
  onCountChange?: (count: number) => void;
  readOnly?: boolean;
  /** Chamado após ações que movem o card (ex: NoShow) para atualizar o pipeline */
  onCardUpdate?: () => void;
}

interface Compromisso {
  quem: string;
  o_que: string;
  quando?: string;
}

interface TranscriptAnalysis {
  resumo: string;
  sentimento: "positivo" | "neutro" | "negativo";
  interesse_cliente: "alto" | "médio" | "baixo";
  objecoes: string[];
  proximos_passos: string[];
  pontos_de_atencao: string[];
  // Campos acrescentados na Fase 3 — valem para Teams e para a reunião no CRM
  compromissos?: Compromisso[];
  produtos_citados?: string[];
  concorrentes?: string[];
  orcamento?: string;
  nota?: number | null;
  decisor?: string;
  temperatura?: "quente" | "morno" | "frio";
  oportunidades_perdidas?: string[];
}

interface NewMeetingForm {
  title: string;
  date: string;
  time: string;
  duration: string;
  contact_name: string;
  description: string;
}

const EMPTY_FORM: NewMeetingForm = {
  title: "",
  date: "",
  time: "",
  duration: "30",
  contact_name: "",
  description: "",
};

/**
 * Histórico dos pedidos de ajuda à IA durante a reunião.
 *
 * Fechado por padrão e buscado só quando alguém abre: a maioria das reuniões
 * não terá pedido nenhum, e não vale pesar a lista por causa disso.
 */
const AjudaDaIA: React.FC<{ taskId: number }> = ({ taskId }) => {
  const [aberto, setAberto] = useState(false);
  const [pedidos, setPedidos] = useState<SugestaoDaIA[] | null>(null);

  useEffect(() => {
    if (!aberto || pedidos) return;
    cardTaskService
      .listarAjudaAoVivo(taskId)
      .then(setPedidos)
      .catch(() => setPedidos([]));
  }, [aberto, pedidos, taskId]);

  return (
    <div>
      <button
        onClick={() => setAberto((a) => !a)}
        className="flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-slate-300"
      >
        {aberto ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        Ajuda da IA durante a reunião
      </button>

      {aberto && (
        <div className="mt-2 space-y-2">
          {pedidos === null && <p className="text-xs text-slate-500">Carregando...</p>}

          {pedidos?.length === 0 && (
            <p className="text-xs italic text-slate-500">
              Ninguém pediu ajuda nesta reunião.
            </p>
          )}

          {pedidos?.map((pedido) => (
            <div key={pedido.id} className="rounded border border-slate-700/40 p-2">
              <p className="mb-1 text-[11px] text-slate-500">
                {new Date(pedido.criado_em).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {pedido.quem_pediu ? " · " + pedido.quem_pediu : ""}
              </p>

              {pedido.trecho && (
                <p className="mb-1.5 whitespace-pre-line border-l-2 border-slate-700 pl-2 text-[11px] text-slate-400">
                  {pedido.trecho}
                </p>
              )}

              <AssistSuggestion sugestao={pedido} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const MeetingSection: React.FC<MeetingSectionProps> = ({ cardId, assignedToId, onCountChange, readOnly, onCardUpdate }) => {
  const { confirm } = useConfirm();
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === "admin" || user?.role?.toLowerCase() === "manager";
  const [meetings, setMeetings] = useState<CardTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [showHistory, setShowHistory] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const [showTranscriptIds, setShowTranscriptIds] = useState<Set<number>>(new Set());

  // Modal nova reunião
  const [showModal, setShowModal] = useState(false);

  // Tipos e convidados vêm do servidor: a prévia do título tem de ser
  // exatamente o que vai ser gravado, e os e-mails saem de três cadastros.
  const [tiposDeReuniao, setTiposDeReuniao] = useState<TipoDeReuniao[]>([]);
  const [convidadosSugeridos, setConvidadosSugeridos] = useState<ConvidadoSugerido[]>([]);
  const [tipoEscolhido, setTipoEscolhido] = useState("apresentacao_phoebus");
  const [tipoEditado, setTipoEditado] = useState<string>("");
  const [convidados, setConvidados] = useState<string[]>([]);
  const [mensagemDoConvite, setMensagemDoConvite] = useState("");
  const [form, setForm] = useState<NewMeetingForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Onde a reunião vai acontecer: dentro do CRM (Daily) ou no Teams.
  // O formulário é o mesmo nos dois casos — só muda o provedor. Ver seção
  // 14.2 do design da reunião por vídeo.
  const [meetingProvider, setMeetingProvider] = useState<"daily" | "teams">("teams");
  // Trava por usuário: enquanto não homologado, só quem homologa vê a opção
  const [dailyEnabled, setDailyEnabled] = useState(false);

  useEffect(() => {
    userService
      .getFeatures()
      .then((f) => setDailyEnabled(f.daily_meeting))
      .catch(() => setDailyEnabled(false));
  }, []);

  // Modal editar reunião
  const [editingMeeting, setEditingMeeting] = useState<CardTask | null>(null);
  const [editForm, setEditForm] = useState<NewMeetingForm>(EMPTY_FORM);
  const [savingEdit, setSavingEdit] = useState(false);

  // Loading states
  const [teamsLoadingId, setTeamsLoadingId] = useState<number | null>(null);
  const [transcriptLoadingId, setTranscriptLoadingId] = useState<number | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [avaliacaoLoadingId, setAvaliacaoLoadingId] = useState<number | null>(null);
  // Avaliações já feitas, por reunião — carregadas junto com a lista
  const [avaliacoes, setAvaliacoes] = useState<Record<number, AvaliacaoDaReuniao>>({});

  /**
   * Traz as avaliações que já existem.
   *
   * Uma chamada por reunião com transcrição — são poucas por card, e assim o
   * bloco já aparece aberto quando o vendedor volta ao negócio, sem precisar
   * avaliar de novo (o que custaria uma chamada à IA).
   */
  const carregarAvaliacoes = async (reunioes: CardTask[]) => {
    const comTranscricao = reunioes.filter((m) => m.transcript_raw);
    if (comTranscricao.length === 0) return;

    const resultados = await Promise.all(
      comTranscricao.map(async (m) => {
        try {
          return [m.id, await cardTaskService.obterAvaliacao(m.id)] as const;
        } catch {
          return [m.id, null] as const;
        }
      })
    );

    setAvaliacoes(
      Object.fromEntries(
        resultados.filter(([, avaliacao]) => avaliacao)
      ) as Record<number, AvaliacaoDaReuniao>
    );
  };

  const handleAvaliar = async (meetingId: number) => {
    try {
      setAvaliacaoLoadingId(meetingId);
      const avaliacao = await cardTaskService.avaliarReuniao(meetingId);
      setAvaliacoes((antes) => ({ ...antes, [meetingId]: avaliacao }));
      showSuccess("Reunião avaliada pelo roteiro.");
    } catch (error: any) {
      showError(error.response?.data?.detail || "Não foi possível avaliar a reunião");
    } finally {
      setAvaliacaoLoadingId(null);
    }
  };

  const loadMeetings = async (showSpinner = false) => {
    try {
      if (showSpinner) setLoading(true);
      const result = await cardTaskService.list({
        card_id: cardId,
        task_type: "meeting",
        page_size: 100,
      });
      setMeetings(result.tasks);
      const pendingCount = result.tasks.filter((m) => !m.is_completed).length;
      onCountChange?.(pendingCount);
      carregarAvaliacoes(result.tasks);
    } catch {
      // silencioso
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    loadMeetings(true);
  }, [cardId]);

  // Sugestões do servidor, a cada abertura do modal: o cliente do negócio pode
  // ter mudado desde a última vez.
  useEffect(() => {
    if (!showModal) return;

    cardTaskService
      .sugestoesDeReuniao(cardId)
      .then((sugestoes) => {
        setTiposDeReuniao(sugestoes.tipos);
        setConvidadosSugeridos(sugestoes.convidados);
        setConvidados(sugestoes.convidados.filter((c) => c.marcado).map((c) => c.email));
        setMensagemDoConvite(sugestoes.mensagem_padrao || "");
      })
      .catch(() => {
        // Sem sugestões o vendedor ainda cria a reunião escolhendo "Outra" e
        // digitando os destinatários.
        setTiposDeReuniao([]);
        setConvidadosSugeridos([]);
      });
  }, [showModal, cardId]);

  // Enquanto algo estiver sendo preparado, a lista se atualiza sozinha.
  // O processamento roda no servidor e nada avisa a tela quando termina — sem
  // isto, o vendedor precisa recarregar a página na mão para ver a gravação
  // chegar (foi o que aconteceu na homologação de 15/09).
  useEffect(() => {
    const agora = Date.now();

    const preparando = meetings.some((m) => {
      if (m.recording_status === "processing" || m.transcript_status === "processing") return true;
      if (m.gravacoes?.some((g) => g.status === "processing")) return true;

      // Reunião do CRM recém-encerrada: a gravação leva alguns minutos para
      // chegar e, até chegar, nada está marcado como "em preparo". Sem esta
      // janela a tela ficava parada e só mostrava depois de um F5 — foi o que
      // aconteceu nas duas homologações.
      if (m.meeting_provider === "daily" && m.meeting_ended_at) {
        const iso = m.meeting_ended_at.endsWith("Z")
          ? m.meeting_ended_at
          : m.meeting_ended_at + "Z";
        const minutos = (agora - Date.parse(iso)) / 60000;
        // A ordem de chegada é gravação → transcrição → análise → avaliação.
        // Parar na transcrição deixava as duas últimas invisíveis até um F5,
        // e a avaliação sozinha leva de 20 a 60 segundos a mais.
        const faltaAlgo =
          !m.gravacoes?.length ||
          m.transcript_status !== "ready" ||
          !m.transcript_analysis ||
          !avaliacoes[m.id];
        if (minutos >= 0 && minutos < 30 && faltaAlgo) return true;
      }

      return false;
    });
    if (!preparando) return;

    const timer = window.setInterval(() => loadMeetings(), 15000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetings, avaliacoes]);


  const pending = meetings.filter((m) => !m.is_completed && !m.is_cancelled);
  const completed = meetings.filter((m) => m.is_completed && !m.is_cancelled);
  const cancelled = meetings.filter((m) => m.is_cancelled);

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /**
   * A trava de ambiente corta convidados externos e, até 22/09, registrava
   * isso só no log do servidor — o vendedor achava que tinha convidado o
   * cliente. Agora ele descobre na hora.
   */
  const avisarConvidadosRemovidos = (quantos?: number) => {
    if (!quantos) return;
    showError(
      `O convite não foi enviado para ${quantos} endereço(s) externo(s) ` +
        "(modo de desenvolvimento ligado)."
    );
  };

  const handleCreate = async () => {
    const precisaDeTitulo = tipoEscolhido === "outra" || tiposDeReuniao.length === 0;

    if (!form.date || !form.time) {
      showError("Data e hora são obrigatórias");
      return;
    }
    if (precisaDeTitulo && !form.title.trim()) {
      showError("Escreva o título da reunião");
      return;
    }
    if (convidados.length === 0) {
      showError("Marque pelo menos um destinatário do convite");
      return;
    }
    try {
      setSaving(true);
      const dueDateUTC = convertBrazilToUTC(form.date, form.time);
      const created = await cardTaskService.create({
        card_id: cardId,
        // Nos tipos fixos o servidor monta o título; aqui vai o que o vendedor
        // digitou, que só é usado em "Outra".
        title: form.title.trim() || "Reunião",
        task_type: "meeting",
        due_date: dueDateUTC,
        duration_minutes: parseInt(form.duration) || 30,
        contact_name: form.contact_name.trim() || undefined,
        description: form.description.trim() || undefined,
        meeting_kind: tiposDeReuniao.length > 0 ? tipoEscolhido : undefined,
        invited_emails: convidados,
        invite_message: mensagemDoConvite.trim() || undefined,
      });
      setShowModal(false);
      setForm(EMPTY_FORM);

      // Agenda no provedor escolhido. Nos dois casos o convite sai pelo
      // Outlook e o horário bloqueia a agenda do vendedor.
      if (dailyEnabled && meetingProvider === "daily") {
        try {
          const { public_link, convidados_removidos } =
            await cardTaskService.createDailyRoom(created.id);
          await navigator.clipboard.writeText(public_link).catch(() => {});
          showSuccess("Reunião criada! O convite foi enviado e o link do cliente está copiado.");
          avisarConvidadosRemovidos(convidados_removidos);
        } catch (error: any) {
          // 400 = sem conta Microsoft conectada (bloqueia, por decisão)
          // 503 = Daily indisponível (a mensagem já sugere usar o Teams)
          showError(
            error.response?.data?.detail ||
              "Reunião criada, mas não foi possível gerar a sala de vídeo."
          );
        }
      } else {
        try {
          const { convidados_removidos } = await cardTaskService.createTeamsMeeting(created.id);
          showSuccess("Reunião criada e agendada no calendário!");
          avisarConvidadosRemovidos(convidados_removidos);
        } catch {
          // Se falhar (ex: usuário sem MS token), avisa mas não bloqueia
          showSuccess("Reunião criada! Ative o link Teams manualmente se necessário.");
        }
      }

      await loadMeetings();
    } catch (error: any) {
      showError(error.response?.data?.detail || "Erro ao criar reunião");
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (id: number) => {
    const ok = await confirm({
      title: "Concluir reunião?",
      message: "Confirma que a reunião foi realizada com sucesso?",
      confirmText: "Sim, concluir",
    });
    if (!ok) return;
    try {
      setActionLoadingId(id);
      await cardTaskService.toggleComplete(id, true);
      showSuccess("Reunião marcada como concluída!");
      await loadMeetings();
    } catch {
      showError("Erro ao concluir reunião");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleNoShow = async (id: number) => {
    const ok = await confirm({
      title: "Marcar como No-Show?",
      message: "O contato não compareceu à reunião?",
      confirmText: "Sim, No-Show",
    });
    if (!ok) return;
    try {
      setActionLoadingId(id);
      await cardTaskService.markNoShow(id);
      showSuccess("Reunião marcada como No-Show.");
      await loadMeetings();
      // Notifica o KanbanBoard para mover o card visualmente (sem F5)
      window.dispatchEvent(new CustomEvent('crm:card-moved'));
      // Atualiza o card completo (list_id) para o PipelineStages refletir a nova etapa
      onCardUpdate?.();
    } catch {
      showError("Erro ao marcar No-Show");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await confirm({
      title: "Excluir reunião?",
      message: "Esta ação apaga o registro permanentemente. Não pode ser desfeita.",
      confirmText: "Excluir",
      isDanger: true,
    });
    if (!ok) return;
    try {
      setActionLoadingId(id);
      await cardTaskService.delete(id);
      showSuccess("Reunião excluída.");
      await loadMeetings();
    } catch {
      showError("Erro ao excluir reunião");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelarReuniao = async (meeting: CardTask) => {
    const ok = await confirm({
      title: "Cancelar reunião?",
      message: meeting.meeting_provider === "daily"
        ? "A sala será apagada e o link do cliente deixa de funcionar. Esta ação não pode ser desfeita."
        : meeting.teams_join_url
        ? "O evento será removido da agenda do Teams/Outlook. Esta ação não pode ser desfeita."
        : "A reunião não possui evento no Teams. Deseja apenas remover os dados de reunião?",
      confirmText: "Sim, cancelar",
      isDanger: true,
    });
    if (!ok) return;
    try {
      setActionLoadingId(meeting.id);
      await cardTaskService.cancelTeamsMeeting(meeting.id);
      showSuccess("Reunião cancelada.");
      await loadMeetings();
    } catch (error: any) {
      showError(error.response?.data?.detail || "Erro ao cancelar a reunião");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenEdit = (meeting: CardTask) => {
    if (meeting.due_date) {
      const date = extractBrazilDateForInput(meeting.due_date);
      const time = extractBrazilTimeForInput(meeting.due_date);
      setEditForm({
        title: meeting.title || "",
        date,
        time,
        duration: String(meeting.duration_minutes || 30),
        contact_name: meeting.contact_name || "",
        description: meeting.description || "",
      });
    } else {
      setEditForm({ ...EMPTY_FORM, title: meeting.title || "" });
    }
    // Reunião antiga não tem tipo: fica em "Outra", com o título como está —
    // nunca inventamos um tipo que ninguém escolheu.
    setTipoEditado(meeting.meeting_kind || "outra");
    if (tiposDeReuniao.length === 0) {
      cardTaskService
        .sugestoesDeReuniao(cardId)
        .then((sugestoes) => setTiposDeReuniao(sugestoes.tipos))
        .catch(() => setTiposDeReuniao([]));
    }
    setEditingMeeting(meeting);
  };

  const handleSaveEdit = async () => {
    if (!editingMeeting) return;
    if (!editForm.title.trim() || !editForm.date || !editForm.time) {
      showError("Título, data e hora são obrigatórios");
      return;
    }
    try {
      setSavingEdit(true);
      const dueDateUTC = convertBrazilToUTC(editForm.date, editForm.time);
      const atualizada = await cardTaskService.update(editingMeeting.id, {
        title: editForm.title.trim(),
        due_date: dueDateUTC,
        duration_minutes: parseInt(editForm.duration) || 30,
        contact_name: editForm.contact_name.trim() || undefined,
        description: editForm.description.trim() || undefined,
        // Trocar o tipo remonta o título no servidor; em "Outra" vale o
        // texto digitado aqui.
        meeting_kind: tipoEditado || undefined,
      });
      showSuccess("Reunião atualizada!");
      if (atualizada?.calendario_desatualizado) {
        // O evento pertence a quem criou a reunião: o Microsoft recusa a
        // alteração de outra pessoa, e o cliente fica com os dados antigos.
        showError(
          "A reunião foi atualizada no CRM, mas o convite do cliente não mudou — " +
            "quem criou a reunião precisa fazer essa alteração."
        );
      }
      setEditingMeeting(null);
      await loadMeetings();
    } catch (error: any) {
      showError(error.response?.data?.detail || "Erro ao atualizar reunião");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCreateTeamsMeeting = async (id: number) => {
    try {
      setTeamsLoadingId(id);
      await cardTaskService.createTeamsMeeting(id);
      showSuccess("Reunião criada no Teams! Link salvo.");
      await loadMeetings();
    } catch (error: any) {
      showError(error.response?.data?.detail || "Erro ao criar reunião no Teams");
    } finally {
      setTeamsLoadingId(null);
    }
  };

  const handleFetchTranscript = async (id: number) => {
    try {
      setTranscriptLoadingId(id);
      await cardTaskService.fetchTranscript(id);
      showSuccess("Transcrição salva e analisada com sucesso!");
      await loadMeetings();
    } catch (error: any) {
      showError(error.response?.data?.detail || "Erro ao buscar transcrição");
    } finally {
      setTranscriptLoadingId(null);
    }
  };

  /**
   * Converte o arquivo de transcrição em falas para a tela.
   *
   * Três formatos convivem:
   *   Teams:         <v João Silva>Olá
   *   CRM (Daily):   <v>João Silva:</v>Olá
   *   Texto corrido: Olá          (a Microsoft entrega assim quando o
   *                                locatário não permite dizer quem falou)
   *
   * O terceiro caso deixava a tela dizendo "nenhuma fala identificada" com a
   * conversa inteira salva no banco — 45 mil caracteres invisíveis. E o
   * segundo, que é o das reuniões no CRM, nunca tinha sido tratado aqui.
   */
  const parseVtt = (vtt: string): { speaker: string; text: string }[] => {
    const result: { speaker: string; text: string }[] = [];
    let novoTrecho = true;

    const limpo = (t: string) => t.replace(/<[^>]+>/g, "").trim();

    for (const line of vtt.split("\n")) {
      const trimmed = line.trim();

      if (!trimmed || trimmed === "WEBVTT" || trimmed.startsWith("NOTE")) continue;
      if (trimmed.includes("-->")) {
        novoTrecho = true;
        continue;
      }
      if (/^[0-9]+$/.test(trimmed)) continue;
      // identificador de trecho do Daily: "transcript:357"
      if (/^[A-Za-z_][A-Za-z0-9_-]*:[0-9]+$/.test(trimmed)) continue;

      const daily = trimmed.match(/^<v\s*>?\s*([^<>]*?)\s*:?\s*<\/v>\s*(.*)$/);
      if (daily) {
        result.push({ speaker: daily[1].trim(), text: limpo(daily[2]) });
        novoTrecho = false;
        continue;
      }

      const teams = trimmed.match(/^<v\s+([^>]+)>(.*)$/);
      if (teams) {
        result.push({ speaker: teams[1].trim().replace(/:$/, ""), text: limpo(teams[2]) });
        novoTrecho = false;
        continue;
      }

      const texto = limpo(trimmed);
      if (!texto) continue;

      const ultimo = result[result.length - 1];
      if (ultimo && !novoTrecho) {
        // continuação da mesma fala, que se estende por várias linhas
        ultimo.text += " " + texto;
      } else {
        result.push({ speaker: "", text: texto });
      }
      novoTrecho = false;
    }

    return result.filter((l) => l.text);
  };

  const renderAnalysis = (analysisJson: string) => {
    try {
      const a: TranscriptAnalysis = JSON.parse(analysisJson);
      const sentimentColor =
        a.sentimento === "positivo"
          ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/5"
          : a.sentimento === "negativo"
          ? "text-red-400 border-red-500/30 bg-red-500/5"
          : "text-slate-400 border-slate-500/30 bg-slate-500/5";
      const sentimentIcon =
        a.sentimento === "positivo" ? (
          <TrendingUp size={13} />
        ) : a.sentimento === "negativo" ? (
          <TrendingDown size={13} />
        ) : (
          <Minus size={13} />
        );
      const interestColor =
        a.interesse_cliente === "alto"
          ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
          : a.interesse_cliente === "baixo"
          ? "text-red-400 bg-red-500/10 border-red-500/30"
          : "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";

      return (
        <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-400">
              <BrainCircuit size={13} />
              Análise da Reunião
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-medium ${sentimentColor}`}>
                {sentimentIcon}
                {a.sentimento}
              </span>
              <span className={`rounded border px-1.5 py-0.5 text-xs font-medium ${interestColor}`}>
                Interesse {a.interesse_cliente}
              </span>
            </div>
          </div>
          {a.resumo && (
            <p className="text-xs text-slate-300 leading-relaxed">{a.resumo}</p>
          )}
          {a.objecoes?.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-orange-400">Objeções levantadas</p>
              <ul className="space-y-0.5">
                {a.objecoes.map((o, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-slate-400">
                    <span className="mt-0.5 text-orange-400">•</span>
                    {o}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {a.proximos_passos?.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-emerald-400">Próximos passos</p>
              <ul className="space-y-0.5">
                {a.proximos_passos.map((p, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-slate-400">
                    <span className="mt-0.5 text-emerald-400">•</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {a.pontos_de_atencao?.length > 0 && (
            <div>
              <p className="mb-1 flex items-center gap-1 text-xs font-medium text-yellow-400">
                <AlertTriangle size={11} />
                Pontos de atenção
              </p>
              <ul className="space-y-0.5">
                {a.pontos_de_atencao.map((p, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-slate-400">
                    <span className="mt-0.5 text-yellow-400">•</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Campos acrescentados na Fase 3 ─────────────────────────────
              Valem para os dois fluxos: reunião no CRM e Teams. Cada bloco só
              aparece quando a IA encontrou algo — análise de conversa curta
              não deve virar uma parede de seções vazias. */}

          {(a.nota != null || a.temperatura) && (
            <div className="flex flex-wrap gap-2">
              {a.nota != null && (
                <span className="rounded border border-purple-500/30 bg-purple-500/5 px-2 py-1 text-xs text-purple-300">
                  Nota da reunião: <strong>{a.nota}/10</strong>
                </span>
              )}
              {a.temperatura && (
                <span
                  className={`rounded border px-2 py-1 text-xs ${
                    a.temperatura === "quente"
                      ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
                      : a.temperatura === "frio"
                      ? "border-sky-500/30 bg-sky-500/5 text-sky-300"
                      : "border-slate-500/30 bg-slate-500/5 text-slate-300"
                  }`}
                >
                  Temperatura: <strong>{a.temperatura}</strong>
                </span>
              )}
            </div>
          )}

          {a.compromissos && a.compromissos.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-emerald-400">O que ficou combinado</p>
              <ul className="space-y-0.5">
                {a.compromissos.map((c, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-slate-400">
                    <span className="mt-0.5 text-emerald-400">•</span>
                    <span>
                      <strong className="text-slate-300">{c.quem}</strong>: {c.o_que}
                      {c.quando ? ` — ${c.quando}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {a.decisor && (
            <div>
              <p className="mb-1 text-xs font-medium text-slate-300">Quem decide</p>
              <p className="text-xs text-slate-400">{a.decisor}</p>
            </div>
          )}

          {a.orcamento && (
            <div>
              <p className="mb-1 text-xs font-medium text-slate-300">Orçamento</p>
              <p className="text-xs text-slate-400">{a.orcamento}</p>
            </div>
          )}

          {a.produtos_citados && a.produtos_citados.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-slate-300">Produtos citados</p>
              <div className="flex flex-wrap gap-1">
                {a.produtos_citados.map((p, i) => (
                  <span key={i} className="rounded bg-slate-700/50 px-1.5 py-0.5 text-xs text-slate-300">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {a.concorrentes && a.concorrentes.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-orange-400">Concorrentes mencionados</p>
              <ul className="space-y-0.5">
                {a.concorrentes.map((c, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-slate-400">
                    <span className="mt-0.5 text-orange-400">•</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {a.oportunidades_perdidas && a.oportunidades_perdidas.length > 0 && (
            <div className="rounded border border-slate-600/40 bg-slate-700/20 p-2">
              <p className="mb-1 text-xs font-medium text-slate-300">
                Para a próxima
              </p>
              <ul className="space-y-0.5">
                {a.oportunidades_perdidas.map((o, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-slate-400">
                    <span className="mt-0.5 text-slate-500">•</span>
                    {o}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    } catch {
      return null;
    }
  };

  /** Abre um trecho gravado numa aba nova, usando link temporário do bucket. */
  const handleAssistirGravacao = async (id: number, gravacaoId: number) => {
    try {
      setActionLoadingId(id);
      const { url } = await cardTaskService.linkGravacao(id, gravacaoId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error: any) {
      showError(error.response?.data?.detail || "Não foi possível abrir a gravação.");
    } finally {
      setActionLoadingId(null);
    }
  };

  /** Gera o link de um trecho para enviar ao cliente e copia. */
  const handleCompartilharGravacao = async (id: number, gravacaoId: number) => {
    try {
      setActionLoadingId(id);
      const { url, expira_em_dias } = await cardTaskService.compartilharGravacao(
        id,
        gravacaoId
      );
      await navigator.clipboard.writeText(url).catch(() => {});
      showSuccess(`Link copiado! Válido por ${expira_em_dias} dias.`);
    } catch (error: any) {
      showError(error.response?.data?.detail || "Não foi possível gerar o link.");
    } finally {
      setActionLoadingId(null);
    }
  };

  /**
   * Procura no Daily gravações que não chegaram pelo aviso automático.
   *
   * Existe porque um aviso perdido deixaria a gravação inacessível para
   * sempre — foi o que aconteceu na homologação de 14/09.
   */
  const handleSincronizarGravacoes = async (id: number) => {
    try {
      setActionLoadingId(id);
      const { encontradas } = await cardTaskService.sincronizarGravacoes(id);
      showSuccess(
        encontradas > 0
          ? `${encontradas} gravação(ões) encontrada(s). O processamento leva alguns minutos.`
          : "Nenhuma gravação encontrada para esta reunião."
      );
      await loadMeetings();
    } catch (error: any) {
      showError(error.response?.data?.detail || "Não foi possível procurar a gravação.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const renderMeetingCard = (meeting: CardTask, isHistory = false) => {
    const isExpanded = expandedIds.has(meeting.id);
    const isActioning = actionLoadingId === meeting.id;

    return (
      <div
        key={meeting.id}
        className={`rounded-lg border transition-all ${
          isHistory
            ? "border-slate-700/40 bg-slate-800/30"
            : "border-purple-500/20 bg-purple-500/5"
        }`}
      >
        {/* Header */}
        <button
          onClick={() => toggleExpand(meeting.id)}
          className="flex w-full items-start gap-3 p-3 text-left"
        >
          <div className="mt-0.5 flex-shrink-0 text-purple-400">
            <Users size={15} />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-medium leading-snug ${isHistory ? "text-slate-400" : "text-slate-100"}`}>
              {meeting.title}
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              {meeting.due_date && (
                <span className="flex items-center gap-1">
                  <Calendar size={11} />
                  {formatBrazilDate(meeting.due_date)}
                </span>
              )}
              {meeting.duration_minutes && (
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  {meeting.duration_minutes} min
                </span>
              )}
              {meeting.contact_name && <span>• {meeting.contact_name}</span>}
              {/* Onde a reunião acontece. Uma atividade pode ter os dois links
                  (sala do CRM e evento no Teams); manda o provedor escolhido. */}
              {meeting.meeting_provider === "daily" ? (
                <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-emerald-400">
                  No CRM
                </span>
              ) : meeting.teams_join_url ? (
                <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-purple-400">Teams</span>
              ) : null}
              {meeting.transcript_analysis && (
                <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-violet-400">Analisada</span>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 text-slate-500">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
        </button>

        {/* Expandido */}
        {isExpanded && (
          <div className="space-y-3 border-t border-slate-700/40 px-3 pb-3 pt-3">
            {meeting.description && (
              <p className="text-xs text-slate-400 leading-relaxed">{meeting.description}</p>
            )}

            {/* Trechos gravados — a reunião pode ter mais de um, porque o
                vendedor para a gravação e recomeça */}
            {meeting.gravacoes && meeting.gravacoes.length > 0 && (
              <div className="space-y-1.5">
                {meeting.gravacoes.map((gravacao) => (
                  <div
                    key={gravacao.id}
                    className="flex flex-wrap items-center gap-2 rounded border border-slate-700/40 px-2.5 py-1.5"
                  >
                    <span className="text-xs text-slate-400">
                      {meeting.gravacoes!.length > 1
                        ? `Parte ${gravacao.ordem} de ${meeting.gravacoes!.length}`
                        : "Gravação"}
                      {gravacao.duracao_segundos
                        ? ` · ${Math.max(1, Math.round(gravacao.duracao_segundos / 60))} min`
                        : ""}
                    </span>

                    {gravacao.status === "processing" && (
                      <span className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Loader2 size={11} className="animate-spin" />
                        Preparando...
                      </span>
                    )}

                    {gravacao.status === "ready" && (
                      <>
                        <button
                          onClick={() => handleAssistirGravacao(meeting.id, gravacao.id)}
                          disabled={isActioning}
                          className="flex items-center gap-1.5 rounded border border-purple-500/50 bg-purple-500/10 px-2.5 py-1 text-xs font-medium text-purple-300 transition-colors hover:bg-purple-500/20 disabled:opacity-50"
                        >
                          <MonitorPlay size={12} />
                          Assistir
                        </button>
                        <button
                          onClick={() => handleCompartilharGravacao(meeting.id, gravacao.id)}
                          disabled={isActioning}
                          title="Gerar link para enviar ao cliente"
                          className="flex items-center gap-1.5 rounded border border-slate-600/50 px-2.5 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-700/50 disabled:opacity-50"
                        >
                          <Copy size={12} />
                          Link para o cliente
                        </button>
                      </>
                    )}

                    {gravacao.status === "expired" && (
                      <span className="text-xs text-slate-500">
                        Expirada (mais de 12 meses)
                      </span>
                    )}

                    {gravacao.status === "failed" && (
                      <span
                        title={gravacao.erro || ""}
                        className="flex items-center gap-1.5 text-xs text-red-400"
                      >
                        <AlertTriangle size={11} />
                        Falha ao processar
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Reunião encerrada e nenhuma gravação registrada: o aviso do
                Daily pode ter se perdido — dá para buscar sem depender de nós */}
            {meeting.meeting_provider === "daily" &&
              meeting.meeting_ended_at &&
              (!meeting.gravacoes || meeting.gravacoes.length === 0) && (
                <button
                  onClick={() => handleSincronizarGravacoes(meeting.id)}
                  disabled={isActioning}
                  className="flex items-center gap-1.5 text-xs text-slate-400 underline-offset-2 transition-colors hover:text-slate-200 hover:underline disabled:opacity-50"
                >
                  <RefreshCw size={11} className={isActioning ? "animate-spin" : ""} />
                  Procurar gravação desta reunião
                </button>
              )}


            {/* Reunião por vídeo no CRM — entrar na sala e copiar o link do cliente.
                Cancelada não entra: a sala já foi apagada no Daily. */}
            {meeting.meeting_provider === "daily" &&
              !meeting.is_completed &&
              !meeting.is_cancelled && (
              <div className="flex gap-2">
                {/* Abre em outra aba: o vendedor continua com o card à mão
                    para consultar o cliente durante a conversa. */}
                <a
                  href={`/reuniao/${meeting.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
                >
                  <Video size={14} />
                  Entrar na Reunião
                  <ExternalLink size={12} />
                </a>
                {meeting.public_access_token && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/entrar/${meeting.public_access_token}`
                      );
                      showSuccess("Link do cliente copiado!");
                    }}
                    title="Copiar o link para enviar ao cliente"
                    className="flex items-center justify-center rounded border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-emerald-400 transition-colors hover:bg-emerald-500/20"
                  >
                    <Copy size={14} />
                  </button>
                )}
              </div>
            )}

            {/* Link de entrada — só para reuniões não concluídas */}
            {meeting.teams_join_url && !meeting.is_completed && (
              <div className="flex gap-2">
                <a
                  href={meeting.teams_join_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded border border-purple-500/50 bg-purple-500/10 px-3 py-2 text-sm font-medium text-purple-400 transition-colors hover:bg-purple-500/20"
                >
                  <MonitorPlay size={14} />
                  Entrar na Reunião Teams
                  <ExternalLink size={12} />
                </a>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(meeting.teams_join_url!);
                    showSuccess("Link copiado!");
                  }}
                  title="Copiar link da reunião"
                  className="flex items-center justify-center rounded border border-purple-500/50 bg-purple-500/10 px-3 py-2 text-purple-400 transition-colors hover:bg-purple-500/20"
                >
                  <Copy size={14} />
                </button>
              </div>
            )}

            {/* Aviso de transcrição */}
            {meeting.teams_join_url && !meeting.transcript_analysis && !meeting.is_completed && (
              <div className="flex items-start gap-2 rounded border border-yellow-500/30 bg-yellow-500/5 px-3 py-2">
                <AlertTriangle size={13} className="mt-0.5 flex-shrink-0 text-yellow-400" />
                <p className="text-xs text-yellow-300/80">
                  <span className="font-medium">Lembrete:</span> ao entrar na reunião, clique em{" "}
                  <span className="font-medium">··· → Iniciar transcrição</span> para habilitar a análise por IA após o término.
                </p>
              </div>
            )}

            {/* Botões Teams */}
            <div className="flex flex-wrap gap-2">
              {!meeting.teams_join_url && !meeting.is_completed && !readOnly && (
                <button
                  onClick={() => handleCreateTeamsMeeting(meeting.id)}
                  disabled={teamsLoadingId === meeting.id || !meeting.due_date}
                  title={!meeting.due_date ? "Defina uma data/hora para criar a reunião" : "Criar reunião no Microsoft Teams"}
                  className="flex items-center gap-1.5 rounded border border-purple-500/50 bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-400 transition-colors hover:bg-purple-500/20 disabled:opacity-50"
                >
                  {teamsLoadingId === meeting.id ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <MonitorPlay size={13} />
                  )}
                  {teamsLoadingId === meeting.id ? "Criando..." : "Criar link Teams"}
                </button>
              )}

              {/* Vale para os dois fluxos: no CRM a análise roda sozinha quando
                  houve gravação, mas se falhar é por aqui que se tenta de novo. */}
              {(meeting.teams_join_url || meeting.meeting_provider === "daily") &&
                !meeting.transcript_analysis && (
                <button
                  onClick={() => handleFetchTranscript(meeting.id)}
                  disabled={transcriptLoadingId === meeting.id}
                  title="Buscar transcrição e analisar com IA"
                  className="flex items-center gap-1.5 rounded border border-violet-500/50 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-400 transition-colors hover:bg-violet-500/20 disabled:opacity-50"
                >
                  {transcriptLoadingId === meeting.id ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <BrainCircuit size={13} />
                  )}
                  {transcriptLoadingId === meeting.id ? "Analisando..." : "Analisar Reunião"}
                </button>
              )}

              {meeting.transcript_analysis && (
                <button
                  onClick={() => handleFetchTranscript(meeting.id)}
                  disabled={transcriptLoadingId === meeting.id}
                  title="Re-analisar reunião"
                  className="flex items-center gap-1.5 rounded border border-slate-500/50 bg-slate-500/10 px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-500/20 disabled:opacity-50"
                >
                  {transcriptLoadingId === meeting.id ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <BrainCircuit size={13} />
                  )}
                  {transcriptLoadingId === meeting.id ? "Analisando..." : "Re-analisar"}
                </button>
              )}

              {/* Avaliação pela régua da consultoria — vale para qualquer
                  reunião com transcrição, inclusive as do Teams. */}
              {meeting.transcript_raw && (
                <button
                  onClick={() => handleAvaliar(meeting.id)}
                  disabled={avaliacaoLoadingId === meeting.id}
                  title="Avaliar os 26 critérios da matriz, com evidência de cada nota"
                  className="flex items-center gap-1.5 rounded border border-purple-500/50 bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-300 transition-colors hover:bg-purple-500/20 disabled:opacity-50"
                >
                  {avaliacaoLoadingId === meeting.id ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <ClipboardCheck size={13} />
                  )}
                  {avaliacaoLoadingId === meeting.id
                    ? "Avaliando..."
                    : avaliacoes[meeting.id]
                    ? "Reavaliar"
                    : "Avaliar pelo roteiro"}
                </button>
              )}
            </div>

            {/* Análise IA */}
            {meeting.transcript_analysis && renderAnalysis(meeting.transcript_analysis)}

            {/* Avaliação pela régua da consultoria */}
            {avaliacoes[meeting.id] && <MeetingEvaluation avaliacao={avaliacoes[meeting.id]} />}

            {/* Ajuda da IA durante a reunião — só nas reuniões do CRM */}
            {meeting.meeting_provider === "daily" && <AjudaDaIA taskId={meeting.id} />}

            {/* Transcrição completa */}
            {meeting.transcript_raw && (
              <div>
                <button
                  onClick={() => setShowTranscriptIds((prev) => {
                    const next = new Set(prev);
                    next.has(meeting.id) ? next.delete(meeting.id) : next.add(meeting.id);
                    return next;
                  })}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showTranscriptIds.has(meeting.id) ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  Ver transcrição completa
                </button>
                {showTranscriptIds.has(meeting.id) && (
                  <div className="mt-2 max-h-64 overflow-y-auto rounded border border-slate-700/50 bg-slate-900/60 p-3 space-y-2">
                    {parseVtt(meeting.transcript_raw).map((line, i) => (
                      <div key={i} className="flex gap-2 text-xs">
                        {/* Quando o locatário não permite dizer quem falou, a
                            transcrição vem sem nomes: o texto ocupa a linha
                            inteira em vez de deixar uma coluna vazia. */}
                        {line.speaker && (
                          <span className="w-24 flex-shrink-0 font-medium text-purple-400/80 truncate">
                            {line.speaker}
                          </span>
                        )}
                        <span className="text-slate-400 leading-relaxed">{line.text}</span>
                      </div>
                    ))}
                    {parseVtt(meeting.transcript_raw).length === 0 && (
                      <p className="text-xs text-slate-500 italic">Nenhuma fala identificada na transcrição.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Ações */}
            {!readOnly && (
              <div className="flex items-center gap-2 border-t border-slate-700/30 pt-2">
                {!meeting.is_completed && (
                  <>
                    <button
                      onClick={() => handleComplete(meeting.id)}
                      disabled={isActioning}
                      className="flex items-center gap-1.5 rounded border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
                    >
                      {isActioning ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      Concluir
                    </button>
                    <button
                      onClick={() => handleNoShow(meeting.id)}
                      disabled={isActioning}
                      className="flex items-center gap-1.5 rounded border border-orange-500/40 bg-orange-500/10 px-2.5 py-1 text-xs font-medium text-orange-400 transition-colors hover:bg-orange-500/20 disabled:opacity-50"
                    >
                      {isActioning ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                      No-Show
                    </button>
                    <button
                      onClick={() => handleOpenEdit(meeting)}
                      disabled={isActioning}
                      className="flex items-center gap-1.5 rounded border border-slate-600/60 bg-slate-700/30 px-2.5 py-1 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700/60 disabled:opacity-50"
                    >
                      <Pencil size={12} />
                      Editar
                    </button>
                    <button
                      onClick={() => handleCancelarReuniao(meeting)}
                      disabled={isActioning}
                      className="flex items-center gap-1.5 rounded border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                    >
                      {isActioning ? <Loader2 size={12} className="animate-spin" /> : <CalendarX size={12} />}
                      Cancelar Reunião
                    </button>
                  </>
                )}
                {isAdmin && !meeting.is_completed && !meeting.is_cancelled && (
                  <button
                    onClick={() => handleDelete(meeting.id)}
                    disabled={isActioning}
                    className="ml-auto flex items-center gap-1.5 rounded border border-red-500/30 bg-red-500/5 px-2.5 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/15 disabled:opacity-50"
                  >
                    <Trash2 size={12} />
                    Excluir
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-purple-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Reuniões</h3>
          {pending.length > 0 && (
            <span className="rounded-full border border-purple-500/30 bg-purple-500/20 px-2 py-0.5 text-xs font-medium text-purple-400">
              {pending.length}
            </span>
          )}
        </div>
        {!readOnly && (
          <div className="relative group">
            <button
              onClick={() => { if (assignedToId) { setForm(EMPTY_FORM); setShowModal(true); } }}
              disabled={!assignedToId}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                assignedToId
                  ? "border-purple-500/40 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20"
                  : "border-slate-700 bg-slate-800/50 text-slate-500 cursor-not-allowed"
              }`}
            >
              <Plus size={13} />
              Nova Reunião
            </button>
            {!assignedToId && (
              <div className="absolute right-0 top-full mt-1.5 z-10 hidden group-hover:block w-56 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-400 shadow-lg">
                Vincule um vendedor ao card antes de agendar uma reunião.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={20} className="animate-spin text-slate-400" />
        </div>
      )}

      {/* Reuniões pendentes */}
      {!loading && pending.length === 0 && completed.length === 0 && cancelled.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-700/50 py-8 text-center">
          <Users size={24} className="mx-auto mb-2 text-slate-600" />
          <p className="text-sm text-slate-500">Nenhuma reunião registrada</p>
        </div>
      )}

      {!loading && pending.length > 0 && (
        <div className="space-y-2">
          {pending.map((m) => renderMeetingCard(m))}
        </div>
      )}

      {/* Histórico de reuniões concluídas */}
      {!loading && completed.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            {showHistory ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            {completed.length} reunião{completed.length !== 1 ? "s" : ""} concluída{completed.length !== 1 ? "s" : ""}
          </button>
          {showHistory && (
            <div className="mt-2 space-y-2">
              {completed.map((m) => renderMeetingCard(m, true))}
            </div>
          )}
        </div>
      )}

      {/* Reuniões canceladas */}
      {!loading && cancelled.length > 0 && (
        <div>
          <button
            onClick={() => setShowCancelled((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            {showCancelled ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            <CalendarX size={12} className="text-red-400/60" />
            {cancelled.length} reunião{cancelled.length !== 1 ? "s" : ""} cancelada{cancelled.length !== 1 ? "s" : ""}
          </button>
          {showCancelled && (
            <div className="mt-2 space-y-2">
              {cancelled.map((m) => renderMeetingCard(m, true))}
            </div>
          )}
        </div>
      )}

      {/* Modal editar reunião */}
      <BaseModal
        isOpen={!!editingMeeting}
        onClose={() => setEditingMeeting(null)}
        title="Editar Reunião"
        size="md"
      >
        <div className="space-y-4">
          {tiposDeReuniao.length > 0 && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Tipo de reunião
              </label>
              <select
                value={tipoEditado}
                onChange={(e) => setTipoEditado(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
              >
                {tiposDeReuniao.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.rotulo}
                    {tipo.avaliado ? " · avaliada pelo roteiro" : ""}
                  </option>
                ))}
              </select>
              {/* Trocar o tipo remonta o título no servidor — o vendedor vê
                  antes de salvar o que o título vai virar. */}
              {tipoEditado !== "outra" && (
                <p className="mt-1 text-[11px] text-slate-500">
                  O título passa a ser{" "}
                  {tiposDeReuniao.find((t) => t.id === tipoEditado)?.titulo || "—"}.
                </p>
              )}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              Título <span className="text-red-400">*</span>
            </label>
            <input
              autoFocus
              type="text"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              placeholder="Ex: Apresentação de proposta"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Data <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={editForm.date}
                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Hora <span className="text-red-400">*</span>
              </label>
              <input
                type="time"
                value={editForm.time}
                onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Duração (min)</label>
              <select
                value={editForm.duration}
                onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
              >
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">1 hora</option>
                <option value="90">1h30</option>
                <option value="120">2 horas</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Contato</label>
              <input
                type="text"
                value={editForm.contact_name}
                onChange={(e) => setEditForm({ ...editForm, contact_name: e.target.value })}
                placeholder="Nome do participante"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Descrição / Pauta</label>
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              placeholder="Tópicos da reunião, agenda, observações..."
              rows={3}
              className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setEditingMeeting(null)}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={savingEdit}
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
            >
              {savingEdit ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={14} />}
              {savingEdit ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </div>
      </BaseModal>

      {/* Modal nova reunião — usa BaseModal (portal) para não ficar preso no stacking context */}
      <BaseModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Nova Reunião"
        size="md"
      >
        <div className="space-y-4">
          {/* Onde a reunião acontece — só aparece para quem tem a funcionalidade
              liberada. O restante do formulário é igual nos dois casos. */}
          {dailyEnabled && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Onde vai acontecer?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMeetingProvider("daily")}
                  className={`flex flex-col items-center gap-0.5 rounded-lg border px-3 py-2.5 text-sm transition-all ${
                    meetingProvider === "daily"
                      ? "border-purple-500 bg-purple-500/10 text-purple-300"
                      : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  <span className="font-medium">No CRM</span>
                  <span className="text-[11px] opacity-70">reunião por vídeo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMeetingProvider("teams")}
                  className={`flex flex-col items-center gap-0.5 rounded-lg border px-3 py-2.5 text-sm transition-all ${
                    meetingProvider === "teams"
                      ? "border-purple-500 bg-purple-500/10 text-purple-300"
                      : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  <span className="font-medium">Teams</span>
                  <span className="text-[11px] opacity-70">Outlook</span>
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500">
                {meetingProvider === "daily"
                  ? "O cliente entra por um link, sem instalar nada. O convite é enviado normalmente."
                  : "Reunião pelo Teams, como sempre."}
              </p>
            </div>
          )}

          {/* Tipo da reunião — é ele que decide o título e o que é avaliado */}
          {tiposDeReuniao.length > 0 && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Tipo de reunião <span className="text-red-400">*</span>
              </label>
              <select
                value={tipoEscolhido}
                onChange={(e) => setTipoEscolhido(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
              >
                {tiposDeReuniao.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.rotulo}
                    {tipo.avaliado ? " · avaliada pelo roteiro" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Título: digitado em "Outra", montado nos demais */}
          {tipoEscolhido === "outra" || tiposDeReuniao.length === 0 ? (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Título <span className="text-red-400">*</span>
              </label>
              <input
                autoFocus
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Alinhamento com a equipe técnica"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
              />
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Título da reunião
              </label>
              {/* O vendedor vê o que o cliente vai receber, sem poder digitar
                  errado — o padrão é o que a consultora pediu. */}
              <p className="rounded-lg border border-slate-700/60 bg-slate-800/40 px-3 py-2 text-sm text-slate-400">
                {tiposDeReuniao.find((t) => t.id === tipoEscolhido)?.titulo || "—"}
              </p>
            </div>
          )}

          {/* Data e Hora */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Data <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Hora <span className="text-red-400">*</span>
              </label>
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          <ConvidadosDaReuniao
            sugeridos={convidadosSugeridos}
            marcados={convidados}
            onChange={setConvidados}
          />

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              Mensagem do convite
            </label>
            <textarea
              value={mensagemDoConvite}
              onChange={(e) => setMensagemDoConvite(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Data, duração e o link da sala entram automaticamente.
            </p>

            {/* A assinatura vai no rodapé do convite, como no e-mail — mostrar
                aqui evita a dúvida de como o cliente vai receber. */}
            {user?.email_signature && (
              <div className="mt-2 overflow-hidden rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2">
                <p className="mb-2 text-[11px] text-slate-400">
                  Assinatura (adicionada automaticamente)
                </p>
                <div
                  className="max-w-full text-sm text-slate-300 [&_img]:max-w-full [&_table]:max-w-full [&_td]:max-w-full"
                  style={{ overflowX: "hidden" }}
                  dangerouslySetInnerHTML={{ __html: user.email_signature }}
                />
              </div>
            )}
          </div>

          {/* Duração e Contato */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Duração (min)
              </label>
              <select
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
              >
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">1 hora</option>
                <option value="90">1h30</option>
                <option value="120">2 horas</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Contato
              </label>
              <input
                type="text"
                value={form.contact_name}
                onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                placeholder="Nome do participante"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              Descrição / Pauta
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Tópicos da reunião, agenda, observações..."
              rows={3}
              className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
            />
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowModal(false)}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {saving ? "Criando..." : "Criar Reunião"}
            </button>
          </div>
        </div>
      </BaseModal>
    </div>
  );
};

export default MeetingSection;
