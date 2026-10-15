/**
 * Como cada tipo de aviso aparece no sino e na página de notificações.
 *
 * Os ids espelham o catálogo do backend (app/services/notificacoes/tipos.py).
 * Os antigos ficam até a limpeza de 30 dias apagar o histórico.
 */
import {
  AlarmClock, AlertTriangle, Bell, CheckSquare, Inbox, Package, Sun, Target,
  UserCheck, Video, Zap, type LucideIcon,
} from "lucide-react";

interface InfoDoAviso {
  rotulo: string;
  Icone: LucideIcon;
  cor: string;
}

const AVISOS: Record<string, InfoDoAviso> = {
  lead_site: { rotulo: "Novo lead do site", Icone: Target, cor: "text-emerald-500" },
  card_atribuido: { rotulo: "Card atribuído", Icone: UserCheck, cor: "text-blue-400" },
  tarefa_para_mim: { rotulo: "Tarefa para mim", Icone: CheckSquare, cor: "text-blue-400" },
  produto_no_card: { rotulo: "Produto no card", Icone: Package, cor: "text-purple-400" },
  reuniao_pronta: { rotulo: "Reunião pronta", Icone: Video, cor: "text-purple-400" },
  resumo_manha: { rotulo: "Resumo do dia", Icone: Sun, cor: "text-amber-500" },
  reuniao_15min: { rotulo: "Reunião em 15 minutos", Icone: AlarmClock, cor: "text-orange-400" },
  card_novo_servico: { rotulo: "Card novo no board", Icone: Inbox, cor: "text-cyan-500" },
  reuniao_falha: { rotulo: "Falha na reunião", Icone: AlertTriangle, cor: "text-red-400" },
  automacao: { rotulo: "Automação", Icone: Zap, cor: "text-slate-400" },
  // Antigos — continuam no histórico até a limpeza apagar
  card_assigned: { rotulo: "Card atribuído", Icone: UserCheck, cor: "text-blue-400" },
  task_assigned: { rotulo: "Tarefa para mim", Icone: CheckSquare, cor: "text-blue-400" },
  product_added: { rotulo: "Produto no card", Icone: Package, cor: "text-purple-400" },
  product_removed: { rotulo: "Produto no card", Icone: Package, cor: "text-purple-400" },
  meeting_recording: { rotulo: "Reunião pronta", Icone: Video, cor: "text-purple-400" },
};

const PADRAO: InfoDoAviso = { rotulo: "Aviso", Icone: Bell, cor: "text-slate-400" };

export function infoDoAviso(tipo: string): InfoDoAviso {
  return AVISOS[tipo] ?? PADRAO;
}

export function IconeDoAviso({ tipo, size = 18 }: { tipo: string; size?: number }) {
  const { Icone } = infoDoAviso(tipo);
  return <Icone size={size} />;
}

/** O lead do site precisa saltar aos olhos: era lido 0–22% das vezes. */
export function avisoEmDestaque(tipo: string): boolean {
  return tipo === "lead_site";
}
